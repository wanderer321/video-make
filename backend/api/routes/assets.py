"""Asset library: characters, scenes, props with AI generation."""
import uuid
import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Response, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.models import Asset, AssetVariant, Project
from api.deps import get_session
from services.image_gen import image_gen_service

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")


class AssetCreate(BaseModel):
    project_id: str
    type: str  # character / scene / prop
    name: str
    description: Optional[str] = None
    prompt: Optional[str] = None
    negative_prompt: Optional[str] = None
    tags: Optional[list[str]] = None
    tts_config: Optional[dict] = None


class AssetGenerateRequest(BaseModel):
    asset_id: str
    provider: str = "auto"
    width: int = 768
    height: int = 1024


@router.get("/project/{project_id}")
def list_project_assets(project_id: str, db: Session = Depends(get_session)):
    assets = db.query(Asset).filter(Asset.project_id == project_id).all()
    return [
        {
            "id": a.id,
            "type": a.type,
            "name": a.name,
            "description": a.description,
            "prompt": a.prompt,
            "tags": a.tags,
            "has_image": bool(a.reference_image_path and os.path.exists(a.reference_image_path)),
            "tts_config": a.tts_config or {},
            "variant_count": len(a.variants),
        }
        for a in assets
    ]


@router.patch("/{asset_id}/tts-config")
def update_asset_tts_config(
    asset_id: str,
    body: dict,
    db: Session = Depends(get_session),
):
    """Update TTS voice configuration for a character asset."""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    asset.tts_config = body
    db.commit()
    return {"ok": True}


@router.post("", status_code=201)
def create_asset(body: AssetCreate, db: Session = Depends(get_session)):
    asset = Asset(
        id=str(uuid.uuid4()),
        project_id=body.project_id,
        type=body.type,
        name=body.name,
        description=body.description,
        prompt=body.prompt,
        negative_prompt=body.negative_prompt,
        tags=body.tags or [],
        tts_config=body.tts_config,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return {"id": asset.id, "name": asset.name, "type": asset.type}


@router.post("/generate-image")
async def generate_asset_image(body: AssetGenerateRequest, db: Session = Depends(get_session)):
    """Generate an image for an asset and save it."""
    asset = db.query(Asset).filter(Asset.id == body.asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    if not asset.prompt:
        raise HTTPException(400, "Asset has no prompt set")

    image_bytes = await image_gen_service.generate(
        prompt=asset.prompt,
        negative_prompt=asset.negative_prompt or "",
        width=body.width,
        height=body.height,
        provider=body.provider,
    )

    # Save to disk
    asset_dir = os.path.join(DATA_DIR, "assets", body.asset_id)
    os.makedirs(asset_dir, exist_ok=True)
    variant_id = str(uuid.uuid4())
    img_path = os.path.join(asset_dir, f"{variant_id}.png")

    with open(img_path, "wb") as f:
        f.write(image_bytes)

    # Create variant record
    if not asset.reference_image_path:
        asset.reference_image_path = img_path
        db.commit()

    variant = AssetVariant(
        id=variant_id,
        asset_id=asset.id,
        label="默认",
        image_path=img_path,
        prompt=asset.prompt,
    )
    db.add(variant)
    db.commit()

    return {"variant_id": variant_id, "image_path": img_path}


@router.get("/{asset_id}/image")
def get_asset_image(asset_id: str, db: Session = Depends(get_session)):
    """Serve asset image file."""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset or not asset.reference_image_path:
        raise HTTPException(404, "No image")
    with open(asset.reference_image_path, "rb") as f:
        return Response(content=f.read(), media_type="image/png")


@router.post("/{asset_id}/upload-image")
async def upload_asset_image(asset_id: str, file: UploadFile = File(...), db: Session = Depends(get_session)):
    """Upload a reference image for an asset directly (without AI generation)."""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")

    asset_dir = os.path.join(DATA_DIR, "assets", asset_id)
    os.makedirs(asset_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "ref.png")[1] or ".png"
    img_path = os.path.join(asset_dir, f"ref_{uuid.uuid4()}{ext}")
    content = await file.read()
    with open(img_path, "wb") as f:
        f.write(content)

    asset.reference_image_path = img_path
    db.commit()
    return {"asset_id": asset_id, "image_path": img_path}


@router.patch("/{asset_id}")
def update_asset(asset_id: str, body: AssetCreate, db: Session = Depends(get_session)):
    """Update asset metadata."""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    asset.name = body.name
    asset.description = body.description
    asset.prompt = body.prompt
    asset.negative_prompt = body.negative_prompt
    asset.tags = body.tags or []
    if body.tts_config is not None:
        asset.tts_config = body.tts_config
    db.commit()
    return {"ok": True}


@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: str, db: Session = Depends(get_session)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    db.delete(asset)
    db.commit()
