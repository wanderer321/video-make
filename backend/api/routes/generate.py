import asyncio
import os
import mimetypes
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from api.deps import get_session
from db.models import GenTask
from api.ws_manager import ws_manager
import uuid

router = APIRouter()


class TaskCreate(BaseModel):
    type: str  # image / video / tts / script
    provider: str
    input_params: dict


@router.get("/tasks")
def list_tasks(db: Session = Depends(get_session)):
    tasks = db.query(GenTask).order_by(GenTask.created_at.desc()).limit(100).all()
    return [
        {
            "id": t.id,
            "type": t.type,
            "status": t.status,
            "provider": t.provider,
            "input_params": t.input_params,
            "output_path": t.output_path,
            "error_msg": t.error_msg,
            "cost_estimate": t.cost_estimate,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "finished_at": t.finished_at.isoformat() if t.finished_at else None,
        }
        for t in tasks
    ]


COST_TABLE: dict[tuple[str, str], float] = {
    # (type, provider): estimated cost in CNY
    ("image", "stability"):   0.02,
    ("image", "kling_image"): 0.05,
    ("image", "fal"):         0.02,
    ("video", "kling_video"): 1.0,
    ("video", "vidu"):        0.8,
    ("video", "runway"):      0.6,
    ("video", "fal"):         0.5,
    ("video", "pika"):        0.4,
    ("video", "jimeng_video"): 0.5,
    ("tts", "elevenlabs"):    0.02,
    ("tts", "fish_audio"):    0.01,
    ("tts", "azure_tts"):     0.005,
    ("tts", "xunfei"):        0.005,
}


def _estimate_cost(task_type: str, provider: str, params: dict) -> Optional[float]:
    base = COST_TABLE.get((task_type, provider))
    if base is None:
        return None
    if task_type == "video":
        dur = float(params.get("duration", 5))
        return base * (dur / 5.0)
    if task_type == "tts":
        text_len = len(str(params.get("text", "")))
        return base * max(1, text_len / 100)
    return base


@router.post("/tasks", status_code=201)
def create_task(body: TaskCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_session)):
    cost = _estimate_cost(body.type, body.provider, body.input_params)
    task = GenTask(
        id=str(uuid.uuid4()),
        type=body.type,
        provider=body.provider,
        status="pending",
        input_params=body.input_params,
        cost_estimate=cost,
    )
    db.add(task)
    db.commit()
    task_id = task.id

    # Kick off processing in background (worker_loop will also pick this up, but this is faster)
    async def _run():
        from services.task_worker import _process_one
        await _process_one(task_id)

    background_tasks.add_task(asyncio.ensure_future, _run())

    return {"id": task_id, "status": "pending"}


@router.get("/tasks/{task_id}/output")
def get_task_output(task_id: str, db: Session = Depends(get_session)):
    """Serve the generated output file for a completed task."""
    task = db.query(GenTask).filter(GenTask.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    if not task.output_path or not os.path.exists(task.output_path):
        raise HTTPException(404, "Output file not found")
    mime, _ = mimetypes.guess_type(task.output_path)
    return FileResponse(task.output_path, media_type=mime or "application/octet-stream")


@router.delete("/tasks/batch")
def delete_tasks_batch(status: Optional[str] = None, db: Session = Depends(get_session)):
    """Delete all tasks of a given status (e.g. 'done', 'failed')."""
    q = db.query(GenTask)
    if status:
        q = q.filter(GenTask.status == status)
    count = q.count()
    q.delete()
    db.commit()
    return {"deleted": count}


@router.post("/tasks/{task_id}/retry")
def retry_task(task_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_session)):
    """Reset a failed task to pending and rerun it."""
    task = db.query(GenTask).filter(GenTask.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    if task.status not in ("failed", "done"):
        raise HTTPException(400, "Only failed or done tasks can be retried")
    task.status = "pending"
    task.error_msg = None
    task.output_path = None
    task.finished_at = None
    db.commit()

    async def _run():
        from services.task_worker import _process_one
        await _process_one(task_id)

    background_tasks.add_task(asyncio.ensure_future, _run())
    return {"id": task_id, "status": "pending"}


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: str, db: Session = Depends(get_session)):
    task = db.query(GenTask).filter(GenTask.id == task_id).first()
    if task:
        db.delete(task)
        db.commit()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time task status push via WebSocket."""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; server broadcasts updates
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
    except (WebSocketDisconnect, Exception):
        ws_manager.disconnect(websocket)
