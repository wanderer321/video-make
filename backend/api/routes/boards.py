"""Storyboard module: Board (segment) and Shot (镜头) management with image/video generation."""
import uuid
import os
import json
import asyncio
import mimetypes
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Response, BackgroundTasks, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.models import Board, Episode, Shot, Asset
from api.deps import get_session
from services.image_gen import image_gen_service
from services.llm import llm_service

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")


# ── Request/Response Models ──

class BoardCreate(BaseModel):
    episode_id: str
    order_index: int = 0
    prompt: Optional[str] = None
    characters: Optional[List[str]] = None
    scene_id: Optional[str] = None
    duration_sec: float = 4.0
    dialogue: Optional[str] = None
    notes: Optional[str] = None
    gen_mode: Optional[str] = "image"  # "image" (分镜图→视频) or "video" (直接视频)
    reference_images: Optional[dict] = None


class BoardUpdate(BaseModel):
    prompt: Optional[str] = None
    characters: Optional[List[str]] = None
    duration_sec: Optional[float] = None
    dialogue: Optional[str] = None
    notes: Optional[str] = None
    gen_mode: Optional[str] = None
    reference_images: Optional[dict] = None
    audio_path: Optional[str] = None
    image_provider: Optional[str] = None
    video_provider: Optional[str] = None


class ShotCreate(BaseModel):
    board_id: str
    order_index: int = 0
    prompt: Optional[str] = None
    shot_size: Optional[str] = "中景"
    camera_angle: Optional[str] = "固定"
    duration_sec: float = 2.0


class ShotUpdate(BaseModel):
    prompt: Optional[str] = None
    shot_size: Optional[str] = None
    camera_angle: Optional[str] = None
    duration_sec: Optional[float] = None


class BreakdownShotsRequest(BaseModel):
    board_id: str
    shots_count: int = 4  # How many shots to break into
    llm_provider: str = "auto"


class GenerateShotImageRequest(BaseModel):
    shot_id: str
    provider: str = "auto"
    width: int = 768
    height: int = 1024


class BoardReorder(BaseModel):
    board_ids: List[str]


# ── Board (Segment) Endpoints ──

@router.get("/episode/{episode_id}")
def list_boards(episode_id: str, db: Session = Depends(get_session)):
    """List all boards (segments) for an episode, including their shots."""
    boards = (
        db.query(Board)
        .filter(Board.episode_id == episode_id)
        .order_by(Board.order_index)
        .all()
    )
    result = []
    for b in boards:
        shots = db.query(Shot).filter(Shot.board_id == b.id).order_by(Shot.order_index).all()
        shots_data = [
            {
                "id": s.id,
                "order_index": s.order_index,
                "prompt": s.prompt,  # Chinese description for display
                "prompt_en": s.prompt_en,  # English prompt for image generation
                "characters": s.characters or [],  # Characters in this shot
                "shot_size": s.shot_size,
                "camera_angle": s.camera_angle,
                "duration_sec": s.duration_sec,
                "has_image": bool(s.image_path and os.path.exists(s.image_path)),
                "image_path": s.image_path,
            }
            for s in shots
        ]
        result.append({
            "id": b.id,
            "episode_id": b.episode_id,
            "order_index": b.order_index,
            "prompt": b.prompt,  # Chinese description for display
            "prompt_en": b.prompt_en,  # English prompt for generation
            "characters": b.characters,
            "scene_id": b.scene_id,
            "duration_sec": b.duration_sec,
            "dialogue": b.dialogue,
            "notes": b.notes,
            "gen_mode": b.gen_mode or "image",
            "reference_images": b.reference_images,
            "has_video": bool(b.video_path and os.path.exists(b.video_path)),
            "video_path": b.video_path,
            "audio_path": b.audio_path,
            "image_provider": b.image_provider,
            "video_provider": b.video_provider,
            "shots_count": len(shots),
            "shots_generated": sum(1 for s in shots if s.has_image),
            "shots": shots_data,
        })
    return result


@router.get("/project/{project_id}")
def list_project_boards(project_id: str, db: Session = Depends(get_session)):
    """Get all boards for a project (across all episodes)."""
    from db.models import Project
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(404, "Project not found")

    episodes = db.query(Episode).filter(Episode.project_id == project_id).all()
    episode_ids = [ep.id for ep in episodes]

    boards = (
        db.query(Board)
        .filter(Board.episode_id.in_(episode_ids))
        .order_by(Board.order_index)
        .all()
    )
    return [
        {
            "id": b.id,
            "episode_id": b.episode_id,
            "order_index": b.order_index,
            "prompt": b.prompt,
            "gen_mode": b.gen_mode or "image",
            "has_video": bool(b.video_path and os.path.exists(b.video_path)),
            "shots_count": db.query(Shot).filter(Shot.board_id == b.id).count(),
        }
        for b in boards
    ]


@router.post("", status_code=201)
def create_board(body: BoardCreate, db: Session = Depends(get_session)):
    """Create a new board (segment)."""
    ep = db.query(Episode).filter(Episode.id == body.episode_id).first()
    if not ep:
        raise HTTPException(404, "Episode not found")

    board = Board(
        id=str(uuid.uuid4()),
        episode_id=body.episode_id,
        order_index=body.order_index,
        prompt=body.prompt,
        characters=body.characters or [],
        scene_id=body.scene_id,
        duration_sec=body.duration_sec,
        dialogue=body.dialogue,
        notes=body.notes,
        reference_images=body.reference_images,
        gen_mode=body.gen_mode or "image",
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


@router.put("/{board_id}")
def update_board(board_id: str, body: BoardUpdate, db: Session = Depends(get_session)):
    """Update a board (segment)."""
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(404, "Board not found")
    if body.prompt is not None:
        board.prompt = body.prompt
    if body.characters is not None:
        board.characters = body.characters
    if body.duration_sec is not None:
        board.duration_sec = body.duration_sec
    if body.dialogue is not None:
        board.dialogue = body.dialogue
    if body.notes is not None:
        board.notes = body.notes
    if body.gen_mode is not None:
        board.gen_mode = body.gen_mode
    if body.reference_images is not None:
        board.reference_images = body.reference_images
    if body.audio_path is not None:
        board.audio_path = body.audio_path
    if body.image_provider is not None:
        board.image_provider = body.image_provider
    if body.video_provider is not None:
        board.video_provider = body.video_provider
    db.commit()
    return {"ok": True}


@router.delete("/{board_id}", status_code=204)
def delete_board(board_id: str, db: Session = Depends(get_session)):
    """Delete a board (segment) and all its shots."""
    board = db.query(Board).filter(Board.id == board_id).first()
    if board:
        db.delete(board)
        db.commit()


# ── Shot (镜头) Endpoints ──

@router.get("/{board_id}/shots")
def list_shots(board_id: str, db: Session = Depends(get_session)):
    """List all shots for a board (segment)."""
    shots = db.query(Shot).filter(Shot.board_id == board_id).order_by(Shot.order_index).all()
    return [
        {
            "id": s.id,
            "board_id": s.board_id,
            "order_index": s.order_index,
            "prompt": s.prompt,
            "shot_size": s.shot_size,
            "camera_angle": s.camera_angle,
            "duration_sec": s.duration_sec,
            "has_image": bool(s.image_path and os.path.exists(s.image_path)),
            "image_path": s.image_path,
        }
        for s in shots
    ]


@router.post("/{board_id}/shots", status_code=201)
def create_shot(board_id: str, body: ShotCreate, db: Session = Depends(get_session)):
    """Create a new shot under a board."""
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(404, "Board not found")

    shot = Shot(
        id=str(uuid.uuid4()),
        board_id=board_id,
        order_index=body.order_index,
        prompt=body.prompt,
        shot_size=body.shot_size or "中景",
        camera_angle=body.camera_angle or "固定",
        duration_sec=body.duration_sec,
    )
    db.add(shot)
    db.commit()
    db.refresh(shot)
    return {"id": shot.id, "order_index": shot.order_index}


@router.put("/shots/{shot_id}")
def update_shot(shot_id: str, body: ShotUpdate, db: Session = Depends(get_session)):
    """Update a shot."""
    shot = db.query(Shot).filter(Shot.id == shot_id).first()
    if not shot:
        raise HTTPException(404, "Shot not found")
    if body.prompt is not None:
        shot.prompt = body.prompt
    if body.shot_size is not None:
        shot.shot_size = body.shot_size
    if body.camera_angle is not None:
        shot.camera_angle = body.camera_angle
    if body.duration_sec is not None:
        shot.duration_sec = body.duration_sec
    db.commit()
    return {"ok": True}


@router.delete("/shots/{shot_id}", status_code=204)
def delete_shot(shot_id: str, db: Session = Depends(get_session)):
    """Delete a shot."""
    shot = db.query(Shot).filter(Shot.id == shot_id).first()
    if shot:
        db.delete(shot)
        db.commit()


@router.post("/shots/generate-image")
async def generate_shot_image(body: GenerateShotImageRequest, db: Session = Depends(get_session)):
    """Generate image for a single shot."""
    shot = db.query(Shot).filter(Shot.id == body.shot_id).first()
    if not shot:
        raise HTTPException(404, "Shot not found")
    # Use English prompt for image generation, fallback to prompt if not available
    gen_prompt = shot.prompt_en or shot.prompt
    if not gen_prompt:
        raise HTTPException(400, "Shot has no prompt")

    board = shot.board

    # Find reference image based on shot's characters
    shot_characters = shot.characters or []
    print(f"[generate-shot-image] Shot characters: {shot_characters}")

    ref_image_path = None
    if board.reference_images and board.reference_images.get("characters"):
        from db.models import Asset
        char_refs = board.reference_images.get("characters", [])

        # Try to find reference image for the first character in this shot
        for shot_char in shot_characters:
            for char_ref in char_refs:
                ref_name = char_ref.get("name", "")
                if ref_name and (shot_char == ref_name or shot_char in ref_name or ref_name in shot_char):
                    asset_id = char_ref.get("assetId")
                    if asset_id:
                        asset = db.query(Asset).filter(Asset.id == asset_id).first()
                        if asset and asset.reference_image_path and os.path.exists(asset.reference_image_path):
                            ref_image_path = asset.reference_image_path
                            print(f"[generate-shot-image] Using reference for '{shot_char}': {ref_image_path}")
                            break
            if ref_image_path:
                break

    try:
        image_bytes = await image_gen_service.generate(
            prompt=gen_prompt,  # Use English prompt for generation
            width=body.width,
            height=body.height,
            provider=body.provider,
            reference_image_path=ref_image_path,
        )
    except RuntimeError as e:
        raise HTTPException(500, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"图像生成失败: {e}")

    # Save image
    shot_dir = os.path.join(DATA_DIR, "shots", shot.board_id)
    os.makedirs(shot_dir, exist_ok=True)
    img_path = os.path.join(shot_dir, f"{shot.id}.png")
    with open(img_path, "wb") as f:
        f.write(image_bytes)

    shot.image_path = img_path
    shot.has_image = 1
    db.commit()
    return {"shot_id": shot.id, "image_path": img_path}


@router.get("/shots/{shot_id}/image")
def get_shot_image(shot_id: str, db: Session = Depends(get_session)):
    """Get image for a shot."""
    shot = db.query(Shot).filter(Shot.id == shot_id).first()
    if not shot or not shot.image_path or not os.path.exists(shot.image_path):
        raise HTTPException(404, "No image")
    with open(shot.image_path, "rb") as f:
        return Response(content=f.read(), media_type="image/png")


# ── AI Breakdown: Segment → Shots ──

BREAKDOWN_SHOTS_PROMPT = """你是专业的分镜导演。请将以下片段提示词拆解成{shots_count}个镜头。

【项目类型】{project_type_label}
{project_type_hint}

片段提示词：
{segment_prompt}

{characters_info}

要求：
- 每个镜头要有独立的中文描述（prompt_cn）和英文生图提示词（prompt_en）
- 明确标注镜头中出现的主要角色（characters字段）
- 镜头要有电影感，节奏张弛有度
- 每个镜头的景别、运镜要有变化（特写/近景/中景/全景/远景，推进/拉远/摇镜/固定等）
- prompt_cn 用中文描述镜头内容（用于展示，纯中文，不含英文风格词）
- prompt_en 用英文，适合 Stable Diffusion/Flux 生成图片，**必须包含项目类型风格前缀**
- 保持角色外观一致性！严格遵循【角色属性约束】中的性别、年龄段、发型发色、服装、气质等核心属性，严禁改变

以JSON数组返回（仅返回数组）：
[
  {{
    "shot_no": 1,
    "shot_size": "中景",
    "camera_angle": "固定",
    "characters": ["角色名1", "角色名2"],  // 镜头中出现的角色
    "prompt_cn": "中文镜头描述（纯中文）",
    "prompt_en": "{style_prefix}English SD/Flux prompt（带风格前缀，必须包含出镜角色的约束属性）",
    "duration_sec": 2.5
  }},
  ...
]
"""


# Project type style hints and prefixes
PROJECT_TYPE_INFO = {
    "manga_2d": {
        "label": "2D动画",
        "hint": "所有英文提示词必须以 'anime style, 2D anime illustration, Japanese anime aesthetic,' 开头",
        "prefix": "anime style, 2D anime illustration, Japanese anime aesthetic, ",
    },
    "manga_3d": {
        "label": "3D动画",
        "hint": "所有英文提示词必须以 '3D anime style, 3D rendered anime character, stylized 3D,' 开头",
        "prefix": "3D anime style, 3D rendered anime character, stylized 3D, ",
    },
    "live_action": {
        "label": "真人视频",
        "hint": "所有英文提示词必须是写实风格，不需要动画前缀，直接描述真实场景和人物",
        "prefix": "",  # No prefix for live action
    },
}


@router.post("/{board_id}/breakdown-shots")
async def breakdown_board_into_shots(
    board_id: str,
    shots_count: int = 4,
    llm_provider: str = "auto",
    db: Session = Depends(get_session),
):
    """Use AI to break a segment (board) into multiple shots."""
    from db.models import Episode, Project

    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(404, "Board not found")
    if not board.prompt:
        raise HTTPException(400, "Board has no prompt to break down")

    # Get project type for style prefix
    episode = db.query(Episode).filter(Episode.id == board.episode_id).first()
    project = db.query(Project).filter(Project.id == episode.project_id).first() if episode else None
    project_type = project.type if project else "manga_2d"

    type_info = PROJECT_TYPE_INFO.get(project_type, PROJECT_TYPE_INFO["manga_2d"])
    style_prefix = type_info["prefix"]

    # Get character info with visual constraints from asset library
    characters_info = ""
    char_names = []

    if board.reference_images and board.reference_images.get("characters"):
        char_refs = board.reference_images.get("characters", [])
        char_names = [cr.get("name", "") for cr in char_refs if cr.get("name")]
    elif board.characters:
        char_names = board.characters if isinstance(board.characters, list) else []

    if char_names:
        # Look up character assets for constraint details
        project_id = project.id if project else None
        char_constraints = []
        if project_id:
            assets = db.query(Asset).filter(
                Asset.project_id == project_id,
                Asset.type == "character",
                Asset.name.in_(char_names),
            ).all()
            asset_map = {a.name: a for a in assets}

            for name in char_names:
                asset = asset_map.get(name)
                if asset and (asset.description or asset.prompt):
                    prompt_text = asset.prompt or ""
                    desc = asset.description or ""

                    # Parse constraint attributes from prompt
                    gender = ""
                    if any(k in prompt_text.lower() for k in ["female", "woman", "girl"]):
                        gender = "女性(female)"
                    elif any(k in prompt_text.lower() for k in ["male", "man", "boy"]):
                        gender = "男性(male)"

                    age = ""
                    age_kw = {
                        "child": "幼年", "kid": "幼年", "young": "少年",
                        "teen": "少年", "teenager": "少年",
                        "middle-aged": "中年", "elderly": "老年", "old": "老年",
                    }
                    for eng, ch in age_kw.items():
                        if eng in prompt_text.lower():
                            age = ch
                            break

                    hair = ""
                    for pp in prompt_text.split(","):
                        pp = pp.strip().lower()
                        if "hair" in pp:
                            hair = pp
                            break

                    clothing = ""
                    clothing_kw = ["dress", "robe", "suit", "armor", "coat", "shirt",
                                   "clothes", "outfit", "uniform", "gown", "cloak", "skirt"]
                    for pp in prompt_text.split(","):
                        pp_s = pp.strip().lower()
                        if any(c in pp_s for c in clothing_kw):
                            clothing = pp_s
                            break

                    temperament = ""
                    temper_kw = ["elegant", "confident", "shy", "determined",
                                 "mysterious", "gentle", "cold", "warm", "brave",
                                 "sad", "happy", "fierce", "noble", "cute"]
                    for pp in prompt_text.split(","):
                        pp_s = pp.strip().lower()
                        if any(t in pp_s for t in temper_kw):
                            temperament = pp_s
                            break

                    parts = [f"【{name}】"]
                    if gender:
                        parts.append(f"性别:{gender}")
                    if age:
                        parts.append(f"年龄:{age}")
                    if hair:
                        parts.append(f"发型:{hair}")
                    if clothing:
                        parts.append(f"服装:{clothing}")
                    if temperament:
                        parts.append(f"气质:{temperament}")
                    if desc:
                        parts.append(f"中文描述:{desc}")
                    char_constraints.append(" | ".join(parts))
                else:
                    char_constraints.append(f"【{name}】（无详细属性）")

        if not char_constraints:
            char_constraints = [f"【{name}】（无详细属性）" for name in char_names]

        constraint_block = "\n".join(char_constraints)
        characters_info = f"""【角色属性约束】（必须遵守，严禁改变性别/年龄/发型/服装等核心特征）：
{constraint_block}
"""
    else:
        characters_info = "【角色】未知角色"

    # Generate shots using LLM
    prompt = BREAKDOWN_SHOTS_PROMPT.format(
        shots_count=shots_count,
        segment_prompt=board.prompt,
        characters_info=characters_info,
        project_type_label=type_info["label"],
        project_type_hint=type_info["hint"],
        style_prefix=style_prefix,
    )

    try:
        result = await llm_service.complete_with_provider(llm_provider, prompt)
    except Exception as e:
        error_msg = str(e)
        if "403" in error_msg or "Forbidden" in error_msg:
            raise HTTPException(403, "LLM API密钥无效或已过期，请在设置页面重新配置")
        elif "401" in error_msg or "Unauthorized" in error_msg:
            raise HTTPException(401, "LLM API密钥未配置或无效，请在设置页面配置")
        elif "429" in error_msg or "rate" in error_msg.lower():
            raise HTTPException(429, "LLM API请求频率限制，请稍后再试")
        elif "未配置" in error_msg or "__no_config__" in error_msg:
            raise HTTPException(400, "未配置任何 LLM 接口，请在设置页面配置")
        else:
            raise HTTPException(500, f"LLM调用失败: {error_msg}")

    # Parse JSON result
    import re
    match = re.search(r'\[.*\]', result, re.DOTALL)
    if not match:
        raise HTTPException(500, "AI returned invalid format")

    try:
        shots_data = json.loads(match.group())
    except json.JSONDecodeError:
        raise HTTPException(500, "Failed to parse AI result as JSON")

    if not isinstance(shots_data, list) or len(shots_data) == 0:
        raise HTTPException(500, "AI returned empty or invalid shots list")

    # Translate prompt_en to Chinese for prompt_cn
    try:
        en_texts = []
        for shot_info in shots_data:
            en = shot_info.get("prompt_en") or shot_info.get("prompt") or ""
            if en:
                # Strip style prefix for clean Chinese translation
                cleaned = en
                if style_prefix:
                    cleaned = cleaned.replace(style_prefix, "", 1).strip().lstrip(",").strip()
                en_texts.append(cleaned)
            else:
                en_texts.append("")

        if any(en_texts):
            trans_items = "\n".join(f"[{i}] {t}" for i, t in enumerate(en_texts) if t)
            trans_prompt = f"""你是一个专业翻译。请将以下英文镜头描述严格翻译为中文。

要求：
- 翻译必须完整、精确，不遗漏任何细节
- 保留所有画面信息：角色动作、场景、光线、氛围、视角、景别等
- 不要省略任何英文原文中的内容
- 用自然的中文表达，不要逐词死译

输出格式：每行一条，以[index]开头：
[0] 中文翻译
[1] 中文翻译

待翻译文本：
{trans_items}"""
            trans_result = await llm_service.complete_with_provider("auto", trans_prompt)
            translations = {}
            for line in trans_result.strip().split("\n"):
                m = re.match(r'\[(\d+)\]\s*(.*)', line.strip())
                if m:
                    idx = int(m.group(1))
                    if 0 <= idx < len(en_texts):
                        translations[idx] = m.group(2)

            # Replace prompt_cn with translations
            for i, shot_info in enumerate(shots_data):
                if i in translations and translations[i]:
                    shot_info["prompt_cn"] = translations[i]
    except Exception:
        # If translation fails, keep original prompt_cn from LLM
        pass

    # Clear existing shots for this board
    db.query(Shot).filter(Shot.board_id == board_id).delete()

    # Calculate default shot duration based on board's total duration
    default_shot_duration = board.duration_sec / len(shots_data) if shots_data else 2.0

    # Create new shots
    created_shots = []
    for i, shot_info in enumerate(shots_data):
        # Get prompts
        prompt_cn = shot_info.get("prompt_cn") or shot_info.get("prompt") or ""
        prompt_en = shot_info.get("prompt_en") or ""

        # Ensure prompt_en has style prefix (AI might forget to add it)
        if style_prefix and prompt_en:
            # Check if prompt_en already starts with the style prefix (or similar)
            if not (prompt_en.lower().startswith("anime") or prompt_en.lower().startswith("3d") or prompt_en.lower().startswith(style_prefix.lower())):
                prompt_en = style_prefix + prompt_en

        shot = Shot(
            id=str(uuid.uuid4()),
            board_id=board_id,
            order_index=i,
            prompt=prompt_cn,  # Chinese description for display
            prompt_en=prompt_en,  # English prompt with style prefix for generation
            characters=shot_info.get("characters") or [],  # Characters in this shot
            shot_size=shot_info.get("shot_size") or "中景",
            camera_angle=shot_info.get("camera_angle") or shot_info.get("camera_type") or "固定",
            duration_sec=float(shot_info.get("duration_sec") or default_shot_duration),
        )
        db.add(shot)
        created_shots.append(shot)

    db.commit()

    return {
        "board_id": board_id,
        "shots_count": len(created_shots),
        "shots": [
            {
                "id": s.id,
                "order_index": s.order_index,
                "prompt": s.prompt,  # Chinese description
                "prompt_en": s.prompt_en,  # English prompt for generation
                "characters": s.characters,  # Characters in this shot
                "shot_size": s.shot_size,
                "camera_angle": s.camera_angle,
                "duration_sec": s.duration_sec,
            }
            for s in created_shots
        ],
    }


# ── Batch Generate All Shots for a Board ──

@router.post("/{board_id}/generate-all-shots")
async def generate_all_shots_for_board(
    board_id: str,
    provider: str = "auto",
    db: Session = Depends(get_session),
):
    """Generate images for all shots of a board sequentially (to avoid rate limits)."""
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(404, "Board not found")

    shots = db.query(Shot).filter(Shot.board_id == board_id).order_by(Shot.order_index).all()
    if len(shots) == 0:
        raise HTTPException(400, "No shots to generate. Please break down the segment first.")

    # Return immediately and process in background
    # This avoids blocking and handles rate limits with delays

    async def generate_shots_task():
        from db.database import SessionLocal
        local_db = SessionLocal()
        print(f"[generate-all-shots] Starting background task for board {board_id}, {len(shots)} shots to generate")
        try:
            for i, shot in enumerate(shots):
                if shot.has_image:
                    print(f"[generate-all-shots] Shot {shot.id} already has image, skipping")
                    continue  # Skip already generated

                print(f"[generate-all-shots] Generating shot {i+1}/{len(shots)}: {shot.id[:8]}...")
                # Find reference image based on shot's characters
                ref_image_path = None
                shot_characters = shot.characters or []  # Characters in this specific shot
                print(f"[generate-all-shots] Shot characters: {shot_characters}")

                if board.reference_images and board.reference_images.get("characters"):
                    from db.models import Asset
                    char_refs = board.reference_images.get("characters", [])

                    # Try to find reference image for the first character in this shot
                    for shot_char in shot_characters:
                        # Find matching character reference by name
                        for char_ref in char_refs:
                            ref_name = char_ref.get("name", "")
                            # Match by name (handle Chinese characters)
                            if ref_name and (shot_char == ref_name or shot_char in ref_name or ref_name in shot_char):
                                asset_id = char_ref.get("assetId")
                                if asset_id:
                                    asset = local_db.query(Asset).filter(Asset.id == asset_id).first()
                                    if asset and asset.reference_image_path and os.path.exists(asset.reference_image_path):
                                        ref_image_path = asset.reference_image_path
                                        print(f"[generate-all-shots] Using reference for '{shot_char}': {ref_image_path}")
                                        break
                        if ref_image_path:
                            break  # Found a match, stop searching

                try:
                    # Use English prompt for image generation, fallback to prompt if not available
                    gen_prompt = shot.prompt_en or shot.prompt
                    image_bytes = await image_gen_service.generate(
                        prompt=gen_prompt,
                        width=768,
                        height=1024,
                        provider=provider,
                        reference_image_path=ref_image_path,
                    )
                    print(f"[generate-all-shots] Shot {shot.id[:8]} generated successfully, {len(image_bytes)} bytes")

                    shot_dir = os.path.join(DATA_DIR, "shots", shot.board_id)
                    os.makedirs(shot_dir, exist_ok=True)
                    img_path = os.path.join(shot_dir, f"{shot.id}.png")
                    with open(img_path, "wb") as f:
                        f.write(image_bytes)

                    # Update shot in DB
                    shot_db = local_db.query(Shot).filter(Shot.id == shot.id).first()
                    if shot_db:
                        shot_db.image_path = img_path
                        shot_db.has_image = 1
                        local_db.commit()

                except Exception as e:
                    print(f"[generate-all-shots] Shot {shot.id[:8]} failed: {e}")
                    # Continue with other shots

                # Wait 5 seconds between shots to avoid rate limits
                if i < len(shots) - 1:
                    print(f"[generate-all-shots] Waiting 5 seconds before next shot...")
                    await asyncio.sleep(5)

            print(f"[generate-all-shots] Background task completed for board {board_id}")

        except Exception as e:
            print(f"[generate-all-shots] Background task error: {e}")
        finally:
            local_db.close()

    # Run in background using asyncio.create_task (background_tasks doesn't work well with async)
    import asyncio as _asyncio
    _asyncio.create_task(generate_shots_task())

    return {
        "board_id": board_id,
        "shots_count": len(shots),
        "pending_count": sum(1 for s in shots if not s.has_image),
        "message": "Generation started in background",
    }


# ── Composite Video Generation (combine shots into video) ──

@router.post("/{board_id}/composite-video")
async def composite_video_from_shots(
    board_id: str,
    provider: str = "auto",
    db: Session = Depends(get_session),
):
    """Combine shot images into a video slideshow."""
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(404, "Board not found")

    shots = db.query(Shot).filter(Shot.board_id == board_id).order_by(Shot.order_index).all()
    if len(shots) == 0:
        raise HTTPException(400, "没有镜头可合成，请先拆镜头并生成图片")

    # Check if all shots have images
    shots_with_images = [s for s in shots if s.image_path and os.path.exists(s.image_path)]
    if len(shots_with_images) == 0:
        raise HTTPException(400, "没有已生成的镜头图片，请先生成图片")

    # Create video task
    from db.models import GenTask
    task = GenTask(
        id=str(uuid.uuid4()),
        type="composite_video",
        status="pending",
        provider=provider,
        input_params={
            "board_id": board_id,
            "shots": [
                {
                    "id": s.id,
                    "image_path": s.image_path,
                    "duration_sec": s.duration_sec or 2.0,
                    "prompt_en": s.prompt_en or s.prompt,
                }
                for s in shots_with_images
            ],
            "total_duration": sum(s.duration_sec or 2.0 for s in shots_with_images),
        },
    )
    db.add(task)
    db.commit()

    return {
        "task_id": task.id,
        "shots_count": len(shots_with_images),
        "total_duration": sum(s.duration_sec or 2.0 for s in shots_with_images),
        "message": "视频合成任务已创建，请在生成中心查看进度",
    }


# ── Legacy endpoints for backward compatibility ──

@router.post("/generate-image")
async def generate_board_image_legacy(body: dict, db: Session = Depends(get_session)):
    """Legacy endpoint: Generate image for a board (now creates a single shot)."""
    board_id = body.get("board_id")
    provider = body.get("provider", "auto")

    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(404, "Board not found")
    if not board.prompt:
        raise HTTPException(400, "Board has no prompt")

    # If gen_mode is "video", this should not be called
    if board.gen_mode == "video":
        raise HTTPException(400, "Use video generation endpoint for gen_mode='video'")

    # Check if board has shots
    shots = db.query(Shot).filter(Shot.board_id == board_id).all()

    if len(shots) == 0:
        # Create a single shot from board's prompt
        shot = Shot(
            id=str(uuid.uuid4()),
            board_id=board_id,
            order_index=0,
            prompt=board.prompt,
            shot_size="中景",
            camera_angle="固定",
            duration_sec=board.duration_sec or 4.0,
        )
        db.add(shot)
        db.commit()
        db.refresh(shot)
        shots = [shot]

    # Generate for the first ungenerated shot
    for shot in shots:
        if not shot.has_image:
            # Generate image
            from db.models import Asset
            ref_image_path = None
            if board.reference_images and board.reference_images.get("characters"):
                for char_ref in board.reference_images["characters"]:
                    asset_id = char_ref.get("assetId")
                    if asset_id:
                        asset = db.query(Asset).filter(Asset.id == asset_id).first()
                        if asset and asset.reference_image_path and os.path.exists(asset.reference_image_path):
                            ref_image_path = asset.reference_image_path
                            break

            try:
                # Use English prompt for image generation, fallback to prompt if not available
                gen_prompt = shot.prompt_en or shot.prompt
                image_bytes = await image_gen_service.generate(
                    prompt=gen_prompt,
                    provider=provider,
                    reference_image_path=ref_image_path,
                )

                shot_dir = os.path.join(DATA_DIR, "shots", shot.board_id)
                os.makedirs(shot_dir, exist_ok=True)
                img_path = os.path.join(shot_dir, f"{shot.id}.png")
                with open(img_path, "wb") as f:
                    f.write(image_bytes)

                shot.image_path = img_path
                shot.has_image = 1
                db.commit()

                return {"shot_id": shot.id, "image_path": img_path}

            except Exception as e:
                raise HTTPException(500, f"图像生成失败: {e}")

    return {"message": "All shots already have images"}


@router.get("/{board_id}/image")
def get_board_image_legacy(board_id: str, db: Session = Depends(get_session)):
    """Legacy: Get image for a board (returns first shot's image)."""
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(404, "Board not found")

    shots = db.query(Shot).filter(Shot.board_id == board_id).order_by(Shot.order_index).all()
    if shots and shots[0].image_path and os.path.exists(shots[0].image_path):
        with open(shots[0].image_path, "rb") as f:
            return Response(content=f.read(), media_type="image/png")

    raise HTTPException(404, "No image")


@router.get("/{board_id}/video")
def get_board_video(board_id: str, db: Session = Depends(get_session)):
    """Serve the generated composite video for a board."""
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board or not board.video_path or not os.path.exists(board.video_path):
        raise HTTPException(404, "No video")
    mime, _ = mimetypes.guess_type(board.video_path)
    return FileResponse(board.video_path, media_type=mime or "video/mp4")


# ── Audio Synthesis for Board Dialogue ──

class SynthesizeBoardAudioRequest(BaseModel):
    voice: str = "Cherry"
    provider: str = "auto"
    instructions: str = ""


@router.post("/{board_id}/synthesize-audio")
async def synthesize_board_audio(
    board_id: str,
    body: SynthesizeBoardAudioRequest = Body(...),
    db: Session = Depends(get_session),
):
    """Synthesize audio for board's dialogue and save to audio_path."""
    import re as _re
    from services.tts import tts_service

    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(404, "Board not found")
    if not board.dialogue or not board.dialogue.strip():
        raise HTTPException(400, "该分镜暂无台词")

    raw_dialogue = board.dialogue.strip()
    tts_text = raw_dialogue
    emotion_hint = ""

    # Parse "角色名（情绪语气）：台词内容" or "角色名(情绪)：台词"
    m = _re.match(
        r'^[^（(：:]*[（(]([^）)]+)[）)]\s*[：:]\s*(.+)$',
        raw_dialogue,
        _re.DOTALL,
    )
    if m:
        emotion_hint = m.group(1).strip()
        tts_text = m.group(2).strip()
    else:
        # Try "角色名：台词内容" without emotion
        m2 = _re.match(r'^[一-鿿\w]+[：:]\s*(.+)$', raw_dialogue, _re.DOTALL)
        if m2:
            tts_text = m2.group(1).strip()

    # Combine emotion hint with caller-provided instructions
    instructions = body.instructions
    if emotion_hint:
        instructions = f"请用{emotion_hint}的语气来朗读。{instructions}".strip()

    print(f"[BoardTTS] raw={raw_dialogue[:60]}, text={tts_text[:60]}, emotion={emotion_hint}, instructions={instructions[:80]}")

    try:
        audio_bytes = await tts_service.synthesize(
            text=tts_text,
            voice=body.voice,
            provider=body.provider,
            instructions=instructions,
        )
    except Exception as e:
        raise HTTPException(500, f"TTS failed: {e}")

    out_dir = os.path.join(DATA_DIR, "generated", "audio")
    os.makedirs(out_dir, exist_ok=True)
    filename = f"board_{board_id[:8]}.mp3"
    out_path = os.path.join(out_dir, filename)
    with open(out_path, "wb") as f:
        f.write(audio_bytes)

    board.audio_path = out_path
    db.commit()

    return {"board_id": board_id, "audio_path": out_path, "size": len(audio_bytes)}


@router.get("/{board_id}/audio")
def get_board_audio(board_id: str, db: Session = Depends(get_session)):
    """Serve the generated audio for a board's dialogue."""
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board or not board.audio_path or not os.path.exists(board.audio_path):
        raise HTTPException(404, "No audio")
    mime, _ = mimetypes.guess_type(board.audio_path)
    return FileResponse(board.audio_path, media_type=mime or "audio/mpeg")


# ── Import from storyboard script (legacy, creates boards as segments) ──

@router.post("/from-shots")
def create_boards_from_shots(
    episode_id: str,
    shots: list[dict],
    db: Session = Depends(get_session),
):
    """Bulk create boards from storyboard script shots (each shot becomes a segment)."""
    from db.models import Asset
    import re

    ep = db.query(Episode).filter(Episode.id == episode_id).first()
    if not ep:
        raise HTTPException(404, "Episode not found")

    project_id = ep.project_id
    assets = db.query(Asset).filter(Asset.project_id == project_id).all()
    character_assets = [a for a in assets if a.type == "character"]
    scene_assets = [a for a in assets if a.type == "scene"]

    def match_character_asset(char_name: str) -> dict:
        clean_name = re.sub(r'[（\(][^）\)]*[）\)]', '', char_name).strip()
        for asset in character_assets:
            if asset.name == clean_name or asset.name == char_name or clean_name in asset.name or asset.name in clean_name:
                return {"name": char_name, "assetId": asset.id}
        return {"name": char_name, "assetId": None}

    def match_scene_asset(scene_name: str) -> dict:
        for asset in scene_assets:
            if asset.name == scene_name or scene_name in asset.name or asset.name in scene_name:
                return {"name": scene_name, "assetId": asset.id}
        return {"name": scene_name, "assetId": None}

    def _recommend_gen_mode(shot: dict) -> str:
        action = (shot.get("action") or "").strip()
        dialogue = (shot.get("dialogue") or "").strip()
        camera = (shot.get("camera_type") or "").strip()
        is_dynamic = camera in ("推进", "拉远", "摇镜", "跟拍", "环绕", "升降")
        if len(action) > 8 or len(dialogue) > 0 or is_dynamic:
            return "video"
        return "image"

    # Clear existing boards
    db.query(Board).filter(Board.episode_id == episode_id).delete()

    boards = []
    for i, shot in enumerate(shots):
        # Use Chinese prompt for display, English for generation
        prompt_cn = shot.get("prompt_cn") or shot.get("prompt") or ""
        prompt_en = shot.get("prompt_en") or shot.get("prompt_hint") or ""
        # If no Chinese prompt, generate from scene/action/characters
        if not prompt_cn:
            parts = []
            if shot.get("scene"):
                parts.append(f"场景：{shot.get('scene')}")
            if shot.get("characters"):
                parts.append(f"人物：{', '.join(shot.get('characters', []))}")
            if shot.get("action"):
                parts.append(f"动作：{shot.get('action')}")
            prompt_cn = "，".join(parts) if parts else prompt_en

        characters = shot.get("characters", [])
        character_refs = [match_character_asset(c) for c in characters]
        scene_ref = match_scene_asset(shot.get("scene", "")) if shot.get("scene") else None

        reference_images = {"characters": character_refs}
        if scene_ref:
            reference_images["scene"] = scene_ref

        board = Board(
            id=str(uuid.uuid4()),
            episode_id=episode_id,
            order_index=i,
            prompt=prompt_cn,  # Chinese description for display
            prompt_en=prompt_en,  # English prompt with style prefix for generation
            characters=characters,
            duration_sec=float(shot.get("duration_sec", 4.0)),
            dialogue=shot.get("dialogue") or "",
            notes=f"{shot.get('scene', '')} | {shot.get('action', '')} | {shot.get('mood', '')}",
            reference_images=reference_images,
            gen_mode=_recommend_gen_mode(shot),
        )
        db.add(board)
        boards.append({"id": board.id, "order_index": i})

    ep.status = "storyboard"
    db.commit()
    return {"created": len(boards), "boards": boards}