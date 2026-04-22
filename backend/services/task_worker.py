"""Background task worker — polls pending gen_tasks and executes them."""
import asyncio
import logging
import os
from datetime import datetime

from sqlalchemy.orm import Session

from db.database import SessionLocal
from db.models import GenTask
from services.image_gen import image_gen_service
from services.tts import tts_service
from services.video_gen import video_gen_service

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")


async def _run_image_task(task: GenTask, db: Session) -> str:
    params = task.input_params or {}
    image_bytes = await image_gen_service.generate(
        prompt=params.get("prompt", ""),
        negative_prompt=params.get("negative_prompt", ""),
        width=int(params.get("width", 768)),
        height=int(params.get("height", 1024)),
        provider=task.provider if task.provider != "auto" else "auto",
    )
    out_dir = os.path.join(DATA_DIR, "generated", "images")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{task.id}.png")
    with open(out_path, "wb") as f:
        f.write(image_bytes)
    return out_path


async def _run_tts_task(task: GenTask, db: Session) -> str:
    params = task.input_params or {}
    audio_bytes = await tts_service.synthesize(
        text=params.get("text", ""),
        voice=params.get("voice", ""),
        provider=task.provider if task.provider != "auto" else "auto",
    )
    out_dir = os.path.join(DATA_DIR, "generated", "audio")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{task.id}.mp3")
    with open(out_path, "wb") as f:
        f.write(audio_bytes)

    # Link back to board if board_id provided
    board_id = params.get("board_id", "")
    if board_id:
        from db.models import Board
        board = db.query(Board).filter(Board.id == board_id).first()
        if board:
            board.audio_path = out_path
            db.commit()

    return out_path


async def _run_video_task(task: GenTask, db: Session) -> str:
    params = task.input_params or {}
    board_id = params.get("board_id", "")

    # Use the board's image as the reference frame if available
    image_ref = ""
    if board_id:
        from db.models import Board
        board = db.query(Board).filter(Board.id == board_id).first()
        if board and board.image_path and os.path.exists(board.image_path):
            image_ref = board.image_path

    result = await video_gen_service.generate(
        prompt=params.get("prompt", ""),
        image_url=image_ref,
        duration=int(params.get("duration", 5)),
        provider=task.provider if task.provider != "auto" else "auto",
    )
    out_dir = os.path.join(DATA_DIR, "generated", "videos")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{task.id}.mp4")
    if isinstance(result, bytes):
        with open(out_path, "wb") as f:
            f.write(result)
    else:
        import httpx
        async with httpx.AsyncClient() as client:
            r = await client.get(result, timeout=180)
            with open(out_path, "wb") as f:
                f.write(r.content)

    # Link back to board; check if all episode boards have video → "done"
    if board_id:
        from db.models import Board, Episode
        board = db.query(Board).filter(Board.id == board_id).first()
        if board:
            board.video_path = out_path
            db.commit()

            ep = db.query(Episode).filter(Episode.id == board.episode_id).first()
            if ep:
                all_boards = db.query(Board).filter(Board.episode_id == board.episode_id).all()
                if all(b.video_path and os.path.exists(b.video_path) for b in all_boards):
                    ep.status = "done"
                    db.commit()

    return out_path


async def _process_one(task_id: str) -> None:
    from api.ws_manager import ws_manager
    db: Session = SessionLocal()
    try:
        task = db.query(GenTask).filter(GenTask.id == task_id).first()
        if not task or task.status != "pending":
            return

        task.status = "running"
        db.commit()
        ws_manager.broadcast_sync({"type": "task_update", "task_id": task_id, "status": "running"})

        try:
            if task.type == "image":
                out_path = await _run_image_task(task, db)
            elif task.type == "tts":
                out_path = await _run_tts_task(task, db)
            elif task.type == "video":
                out_path = await _run_video_task(task, db)
            else:
                raise ValueError(f"Unknown task type: {task.type}")

            task.status = "done"
            task.output_path = out_path
            task.finished_at = datetime.utcnow()
            ws_manager.broadcast_sync({"type": "task_update", "task_id": task_id, "status": "done", "output_path": out_path})
        except Exception as e:
            logger.error("Task %s failed: %s", task_id, e)
            task.status = "failed"
            task.error_msg = str(e)
            task.finished_at = datetime.utcnow()
            ws_manager.broadcast_sync({"type": "task_update", "task_id": task_id, "status": "failed", "error": str(e)})
        db.commit()
    finally:
        db.close()


async def worker_loop() -> None:
    """Continuously poll for pending tasks and execute them."""
    logger.info("Task worker started")
    while True:
        try:
            db: Session = SessionLocal()
            try:
                pending = (
                    db.query(GenTask)
                    .filter(GenTask.status == "pending")
                    .order_by(GenTask.created_at)
                    .limit(3)
                    .all()
                )
                task_ids = [t.id for t in pending]
            finally:
                db.close()

            if task_ids:
                await asyncio.gather(*[_process_one(tid) for tid in task_ids])
            else:
                await asyncio.sleep(2)
        except Exception as e:
            logger.error("Worker loop error: %s", e)
            await asyncio.sleep(5)
