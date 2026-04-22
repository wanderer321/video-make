"""Storyboard module: board cards management and image generation."""
import uuid
import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.models import Board, Episode
from api.deps import get_session
from services.image_gen import image_gen_service

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")


class BoardCreate(BaseModel):
    episode_id: str
    shot_id: Optional[str] = None
    order_index: int = 0
    prompt: Optional[str] = None
    characters: Optional[list[str]] = None
    scene_id: Optional[str] = None
    camera_angle: Optional[str] = None
    shot_size: Optional[str] = "中景"
    duration_sec: float = 4.0
    dialogue: Optional[str] = None
    notes: Optional[str] = None


class BoardUpdate(BaseModel):
    prompt: Optional[str] = None
    characters: Optional[list[str]] = None
    camera_angle: Optional[str] = None
    shot_size: Optional[str] = None
    duration_sec: Optional[float] = None
    dialogue: Optional[str] = None
    notes: Optional[str] = None


class BoardReorder(BaseModel):
    board_ids: list[str]  # ordered list of ids


class BoardGenerateRequest(BaseModel):
    board_id: str
    provider: str = "auto"
    width: int = 768
    height: int = 1024


class BatchGenerateRequest(BaseModel):
    episode_id: str
    board_ids: Optional[list[str]] = None  # None = generate all ungenerated
    provider: str = "auto"
    width: int = 768
    height: int = 1024


@router.get("/episode/{episode_id}")
def list_boards(episode_id: str, db: Session = Depends(get_session)):
    boards = (
        db.query(Board)
        .filter(Board.episode_id == episode_id)
        .order_by(Board.order_index)
        .all()
    )
    return [
        {
            "id": b.id,
            "episode_id": b.episode_id,
            "shot_id": b.shot_id,
            "order_index": b.order_index,
            "has_image": bool(b.image_path and os.path.exists(b.image_path)),
            "has_video": bool(b.video_path and os.path.exists(b.video_path)),
            "has_audio": bool(b.audio_path and os.path.exists(b.audio_path)),
            "video_path": b.video_path,
            "prompt": b.prompt,
            "characters": b.characters,
            "scene_id": b.scene_id,
            "camera_angle": b.camera_angle,
            "shot_size": b.shot_size,
            "duration_sec": b.duration_sec,
            "dialogue": b.dialogue,
            "notes": b.notes,
        }
        for b in boards
    ]


@router.post("", status_code=201)
def create_board(body: BoardCreate, db: Session = Depends(get_session)):
    ep = db.query(Episode).filter(Episode.id == body.episode_id).first()
    if not ep:
        raise HTTPException(404, "Episode not found")

    board = Board(
        id=str(uuid.uuid4()),
        episode_id=body.episode_id,
        shot_id=body.shot_id,
        order_index=body.order_index,
        prompt=body.prompt,
        characters=body.characters or [],
        scene_id=body.scene_id,
        camera_angle=body.camera_angle,
        shot_size=body.shot_size,
        duration_sec=body.duration_sec,
        dialogue=body.dialogue,
        notes=body.notes,
    )
    db.add(board)
    db.commit()
    db.refresh(board)
    return {"id": board.id, "order_index": board.order_index}


@router.post("/reorder")
def reorder_boards(body: BoardReorder, db: Session = Depends(get_session)):
    """Update order_index for a list of board IDs in bulk."""
    for i, board_id in enumerate(body.board_ids):
        board = db.query(Board).filter(Board.id == board_id).first()
        if board:
            board.order_index = i
    db.commit()
    return {"ok": True, "count": len(body.board_ids)}


@router.post("/from-shots")
def create_boards_from_shots(
    episode_id: str,
    shots: list[dict],
    db: Session = Depends(get_session),
):
    """Bulk create boards from storyboard script shots."""
    ep = db.query(Episode).filter(Episode.id == episode_id).first()
    if not ep:
        raise HTTPException(404, "Episode not found")

    # Clear existing boards
    db.query(Board).filter(Board.episode_id == episode_id).delete()

    boards = []
    for i, shot in enumerate(shots):
        # Prefer the English SD-compatible prompt, fall back to hint
        prompt = shot.get("prompt_en") or shot.get("prompt_hint") or ""
        shot_no = shot.get("shot_no")
        board = Board(
            id=str(uuid.uuid4()),
            episode_id=episode_id,
            shot_id=f"SHOT-{shot_no:03d}" if isinstance(shot_no, int) else (f"SHOT-{shot_no}" if shot_no else None),
            order_index=i,
            prompt=prompt,
            characters=shot.get("characters", []),
            camera_angle=shot.get("camera_type"),
            shot_size=shot.get("shot_size"),
            duration_sec=float(shot.get("duration_sec", 4.0)),
            dialogue=shot.get("dialogue") or "",
            notes=f"{shot.get('scene', '')} | {shot.get('action', '')} | {shot.get('mood', '')}",
        )
        db.add(board)
        boards.append({"id": board.id, "order_index": i})

    ep.status = "storyboard"
    db.commit()
    return {"created": len(boards), "boards": boards}


@router.post("/generate-image")
async def generate_board_image(body: BoardGenerateRequest, db: Session = Depends(get_session)):
    board = db.query(Board).filter(Board.id == body.board_id).first()
    if not board:
        raise HTTPException(404, "Board not found")
    if not board.prompt:
        raise HTTPException(400, "Board has no prompt")

    # Find a reference image from the assets library for any mentioned character
    from db.models import Asset
    ref_image_path = None
    if board.characters:
        ep = board.episode
        if ep:
            for char_name in board.characters:
                asset = (
                    db.query(Asset)
                    .filter(
                        Asset.project_id == ep.project_id,
                        Asset.type == "character",
                        Asset.name == char_name,
                        Asset.reference_image_path.isnot(None),
                    )
                    .first()
                )
                if asset and asset.reference_image_path and os.path.exists(asset.reference_image_path):
                    ref_image_path = asset.reference_image_path
                    break

    image_bytes = await image_gen_service.generate(
        prompt=board.prompt,
        width=body.width,
        height=body.height,
        provider=body.provider,
        reference_image_path=ref_image_path,
    )

    board_dir = os.path.join(DATA_DIR, "boards", board.episode_id)
    os.makedirs(board_dir, exist_ok=True)
    img_path = os.path.join(board_dir, f"{board.id}.png")
    with open(img_path, "wb") as f:
        f.write(image_bytes)

    board.image_path = img_path

    # Auto-advance episode status: if all boards have images → "generating"
    ep = db.query(Episode).filter(Episode.id == board.episode_id).first()
    if ep and ep.status == "storyboard":
        all_boards = db.query(Board).filter(Board.episode_id == board.episode_id).all()
        if all(b.image_path and os.path.exists(b.image_path) for b in all_boards):
            ep.status = "generating"

    db.commit()
    return {"board_id": board.id, "image_path": img_path}


@router.get("/{board_id}/image")
def get_board_image(board_id: str, db: Session = Depends(get_session)):
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board or not board.image_path or not os.path.exists(board.image_path):
        raise HTTPException(404, "No image")
    with open(board.image_path, "rb") as f:
        return Response(content=f.read(), media_type="image/png")


@router.put("/{board_id}")
def update_board(board_id: str, body: BoardUpdate, db: Session = Depends(get_session)):
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(404, "Board not found")
    if body.prompt is not None:
        board.prompt = body.prompt
    if body.characters is not None:
        board.characters = body.characters
    if body.camera_angle is not None:
        board.camera_angle = body.camera_angle
    if body.shot_size is not None:
        board.shot_size = body.shot_size
    if body.duration_sec is not None:
        board.duration_sec = body.duration_sec
    if body.dialogue is not None:
        board.dialogue = body.dialogue
    if body.notes is not None:
        board.notes = body.notes
    db.commit()
    return {"ok": True}


@router.delete("/{board_id}", status_code=204)
def delete_board(board_id: str, db: Session = Depends(get_session)):
    board = db.query(Board).filter(Board.id == board_id).first()
    if board:
        db.delete(board)
        db.commit()
