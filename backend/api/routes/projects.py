import os
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.models import Project, Episode, Board
from api.deps import get_session

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str
    type: str = "manga_2d"
    style: Optional[str] = None
    description: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    type: str
    style: Optional[str]
    description: Optional[str]
    cover_path: Optional[str]
    episode_count: int
    created_at: Optional[str]
    updated_at: Optional[str]

    model_config = {"from_attributes": True}


def _to_out(p: Project) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "type": p.type,
        "style": p.style,
        "description": p.description,
        "cover_path": p.cover_path,
        "episode_count": len(p.episodes),
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


@router.get("")
def list_projects(db: Session = Depends(get_session)):
    projects = db.query(Project).order_by(Project.updated_at.desc()).all()
    return [_to_out(p) for p in projects]


@router.post("", status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_session)):
    project = Project(
        id=str(uuid.uuid4()),
        name=body.name,
        type=body.type,
        style=body.style,
        description=body.description,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    # create episode 1 automatically
    ep = Episode(
        id=str(uuid.uuid4()),
        project_id=project.id,
        episode_no=1,
        title="第一集",
        status="draft",
    )
    db.add(ep)
    db.commit()
    db.refresh(project)
    return _to_out(project)


@router.get("/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_session)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    out = _to_out(p)
    episodes_out = []
    for ep in sorted(p.episodes, key=lambda e: e.episode_no):
        boards = db.query(Board).filter(Board.episode_id == ep.id).all()
        episodes_out.append({
            "id": ep.id,
            "episode_no": ep.episode_no,
            "title": ep.title,
            "status": ep.status,
            "board_count": len(boards),
            "image_count": sum(1 for b in boards if b.image_path and os.path.exists(b.image_path)),
            "video_count": sum(1 for b in boards if b.video_path and os.path.exists(b.video_path)),
        })
    out["episodes"] = episodes_out
    return out


@router.get("/{project_id}/episodes")
def list_episodes(project_id: str, db: Session = Depends(get_session)):
    eps = (
        db.query(Episode)
        .filter(Episode.project_id == project_id)
        .order_by(Episode.episode_no)
        .all()
    )
    result = []
    for ep in eps:
        boards = db.query(Board).filter(Board.episode_id == ep.id).all()
        result.append({
            "id": ep.id,
            "episode_no": ep.episode_no,
            "title": ep.title,
            "status": ep.status,
            "board_count": len(boards),
            "image_count": sum(1 for b in boards if b.image_path and os.path.exists(b.image_path)),
            "video_count": sum(1 for b in boards if b.video_path and os.path.exists(b.video_path)),
        })
    return result


@router.post("/{project_id}/episodes", status_code=201)
def create_episode(project_id: str, db: Session = Depends(get_session)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    last = max((ep.episode_no for ep in p.episodes), default=0)
    ep = Episode(
        id=str(uuid.uuid4()),
        project_id=project_id,
        episode_no=last + 1,
        title=f"第{last + 1}集",
        status="draft",
    )
    db.add(ep)
    db.commit()
    db.refresh(ep)
    return {"id": ep.id, "episode_no": ep.episode_no, "title": ep.title, "status": ep.status}


class EpisodeUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None


@router.patch("/{project_id}/episodes/{episode_id}")
def update_episode(project_id: str, episode_id: str, body: EpisodeUpdate, db: Session = Depends(get_session)):
    ep = db.query(Episode).filter(Episode.id == episode_id, Episode.project_id == project_id).first()
    if not ep:
        raise HTTPException(404, "Episode not found")
    if body.title is not None:
        ep.title = body.title
    if body.status is not None:
        ep.status = body.status
    db.commit()
    return {"id": ep.id, "episode_no": ep.episode_no, "title": ep.title, "status": ep.status}


@router.delete("/{project_id}/episodes/{episode_id}", status_code=204)
def delete_episode(project_id: str, episode_id: str, db: Session = Depends(get_session)):
    ep = db.query(Episode).filter(Episode.id == episode_id, Episode.project_id == project_id).first()
    if not ep:
        raise HTTPException(404, "Episode not found")
    db.delete(ep)
    db.commit()


@router.patch("/{project_id}")
def update_project(project_id: str, body: ProjectCreate, db: Session = Depends(get_session)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    p.name = body.name
    p.type = body.type
    p.style = body.style
    p.description = body.description
    db.commit()
    db.refresh(p)
    return _to_out(p)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_session)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(p)
    db.commit()
