"""Asset library: characters, scenes, props with AI generation."""
import uuid
import os
import mimetypes
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Response, UploadFile, File
from fastapi.responses import FileResponse
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
    count: int = 1  # number of images to generate


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
            "reference_image_path": a.reference_image_path,
            "tts_config": a.tts_config or {},
            "audio_path": a.audio_path,
            "has_audio": bool(a.audio_path and os.path.exists(a.audio_path)),
            "variant_count": len(a.variants),
        }
        for a in assets
    ]


@router.get("/{asset_id}/variants")
def get_asset_variants(asset_id: str, db: Session = Depends(get_session)):
    """Get all image variants for an asset."""
    variants = db.query(AssetVariant).filter(AssetVariant.asset_id == asset_id).all()
    return [
        {
            "id": v.id,
            "label": v.label,
            "image_path": v.image_path,
            "is_reference": v.image_path == db.query(Asset).filter(Asset.id == asset_id).first().reference_image_path,
        }
        for v in variants
    ]


@router.get("/variants/{variant_id}/image")
def get_variant_image(variant_id: str, db: Session = Depends(get_session)):
    """Serve variant image file."""
    variant = db.query(AssetVariant).filter(AssetVariant.id == variant_id).first()
    if not variant or not variant.image_path:
        raise HTTPException(404, "No image")
    with open(variant.image_path, "rb") as f:
        return Response(content=f.read(), media_type="image/png")


@router.post("/{asset_id}/select-variant/{variant_id}")
def select_variant_as_reference(asset_id: str, variant_id: str, db: Session = Depends(get_session)):
    """Set a variant as the reference image for an asset."""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    variant = db.query(AssetVariant).filter(AssetVariant.id == variant_id, AssetVariant.asset_id == asset_id).first()
    if not variant:
        raise HTTPException(404, "Variant not found")
    asset.reference_image_path = variant.image_path
    db.commit()
    return {"ok": True}


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
    # DEBUG: Print received data
    print(f"[DEBUG create_asset] ====== Received Asset Creation ======")
    print(f"[DEBUG create_asset] body.name: {body.name}")
    print(f"[DEBUG create_asset] body.type: {body.type}")
    print(f"[DEBUG create_asset] body.prompt: {body.prompt}")
    print(f"[DEBUG create_asset] ====================================")

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
    """Generate one or more images for an asset and save as variants."""
    import asyncio
    asset = db.query(Asset).filter(Asset.id == body.asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    if not asset.prompt:
        raise HTTPException(400, "Asset has no prompt set")

    # Get project info to enhance prompt with style/type
    project = db.query(Project).filter(Project.id == asset.project_id).first()
    project_type = project.type if project else "manga_2d"
    project_style = project.style if project else ""

    # DEBUG: Print asset info before generating
    print(f"[DEBUG generate-image] ====== Asset Info ======")
    print(f"[DEBUG generate-image] asset.id: {asset.id}")
    print(f"[DEBUG generate-image] asset.name: {asset.name}")
    print(f"[DEBUG generate-image] asset.type: {asset.type}")
    print(f"[DEBUG generate-image] asset.prompt (from DB): {asset.prompt}")
    print(f"[DEBUG generate-image] project_type: {project_type}")

    # Build enhanced prompt based on ASSET TYPE and project type
    # Scene/Prop prompts should NOT have character-style prefixes (which may generate people)
    final_prompt = asset.prompt

    # Check if prompt already has style prefix (Chinese or English)
    has_style_prefix = (
        asset.prompt.lower().startswith("anime") or
        asset.prompt.lower().startswith("3d") or
        asset.prompt.lower().startswith("cinematic") or
        asset.prompt.lower().startswith("realistic") or
        "动漫风格" in asset.prompt or
        "anime style" in asset.prompt.lower() or
        "2d anime" in asset.prompt.lower() or
        "3d anime" in asset.prompt.lower()
    )

    # Only add prefix for CHARACTER assets if missing
    # Scene and Prop prompts should keep their own specialized prefixes (no people, empty scene, etc.)
    if not has_style_prefix and asset.type == "character":
        if project_type == "manga_2d":
            style_prefix = "anime style, 2D anime illustration, Japanese anime aesthetic, "
            final_prompt = style_prefix + asset.prompt
        elif project_type == "manga_3d":
            style_prefix = "3D anime style, 3D rendered anime character, stylized 3D, "
            final_prompt = style_prefix + asset.prompt
        elif project_type == "live_action":
            style_prefix = "cinematic, photorealistic, live action portrait, "
            final_prompt = style_prefix + asset.prompt
        elif project_type == "overseas_live":
            style_prefix = "cinematic, photorealistic, live action, "
            final_prompt = style_prefix + asset.prompt

    # For scene/prop: trust the existing prompt (which already has "no people" constraints)
    # No additional prefix needed - the frontend already adds proper prefixes

    # DEBUG: Print final prompt
    print(f"[DEBUG generate-image] final_prompt (sent to image API): {final_prompt}")
    print(f"[DEBUG generate-image] ==============================")

    asset_dir = os.path.join(DATA_DIR, "assets", body.asset_id)
    os.makedirs(asset_dir, exist_ok=True)

    results = []
    for i in range(body.count):
        print(f"[DEBUG generate-image] Calling image_gen_service.generate with prompt: {final_prompt}")
        image_bytes = await image_gen_service.generate(
            prompt=final_prompt,
            negative_prompt=asset.negative_prompt or "",
            width=body.width,
            height=body.height,
            provider=body.provider,
        )

        variant_id = str(uuid.uuid4())
        img_path = os.path.join(asset_dir, f"{variant_id}.png")

        with open(img_path, "wb") as f:
            f.write(image_bytes)

        # First generated image becomes the reference image (always update, replacing old one)
        if i == 0:
            asset.reference_image_path = img_path
            db.commit()

        variant = AssetVariant(
            id=variant_id,
            asset_id=asset.id,
            label=f"变体{i + 1}",
            image_path=img_path,
            prompt=asset.prompt,
        )
        db.add(variant)
        results.append({"variant_id": variant_id, "image_path": img_path})

    db.commit()
    return {"variants": results, "count": len(results)}


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
    # DEBUG: Print received data
    print(f"[DEBUG update_asset] ====== Received Asset Update ======")
    print(f"[DEBUG update_asset] asset_id: {asset_id}")
    print(f"[DEBUG update_asset] body.name: {body.name}")
    print(f"[DEBUG update_asset] body.type: {body.type}")
    print(f"[DEBUG update_asset] body.prompt: {body.prompt}")
    print(f"[DEBUG update_asset] ====================================")

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


# ── Audio Synthesis for Asset ──

class SynthesizeAssetAudioRequest(BaseModel):
    text: str
    voice: str = "Cherry"
    provider: str = "auto"
    instructions: Optional[str] = None


@router.post("/{asset_id}/synthesize-audio")
async def synthesize_asset_audio(
    asset_id: str,
    body: SynthesizeAssetAudioRequest,
    db: Session = Depends(get_session),
):
    """Synthesize audio for an asset and save to audio_path."""
    from services.tts import tts_service

    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    if not body.text.strip():
        raise HTTPException(400, "Text is empty")

    print(f"[synthesize-audio] asset_id={asset_id}, voice={body.voice}, provider={body.provider}, text={body.text[:50]}..., instructions={body.instructions[:50] if body.instructions else 'None'}...")

    try:
        instructions = body.instructions or ""
        if not instructions and asset.tts_config:
            instructions = asset.tts_config.get("prompt", "")
        audio_bytes = await tts_service.synthesize(
            text=body.text,
            voice=body.voice,
            provider=body.provider,
            instructions=instructions,
        )
    except Exception as e:
        raise HTTPException(500, f"TTS failed: {e}")

    # Save audio file
    asset_dir = os.path.join(DATA_DIR, "assets", asset_id)
    os.makedirs(asset_dir, exist_ok=True)
    audio_path = os.path.join(asset_dir, f"audio_{str(uuid.uuid4())[:8]}.mp3")
    with open(audio_path, "wb") as f:
        f.write(audio_bytes)

    # Update asset
    asset.audio_path = audio_path
    asset.has_audio = True
    # Preserve existing tts_config fields (voice, text, etc.), only update prompt if not already set
    tts_config = asset.tts_config or {}
    if not tts_config.get("prompt"):
        tts_config["prompt"] = body.text
    if body.voice and body.voice != "zh-CN-XiaoxiaoNeural":
        tts_config["voice"] = body.voice
    asset.tts_config = tts_config
    db.commit()

    return {"asset_id": asset_id, "audio_path": audio_path, "size": len(audio_bytes)}


@router.get("/{asset_id}/audio")
def get_asset_audio(asset_id: str, db: Session = Depends(get_session)):
    """Serve the generated audio for an asset."""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset or not asset.audio_path or not os.path.exists(asset.audio_path):
        raise HTTPException(404, "No audio")
    mime, _ = mimetypes.guess_type(asset.audio_path)
    return FileResponse(asset.audio_path, media_type=mime or "audio/mpeg")


# ── Extract Voice Characteristics from Script ──

QWEN3_TTS_VOICES = [
    {"id": "Cherry", "desc": "阳光积极、亲切自然小姐姐（女性）"},
    {"id": "Serena", "desc": "温柔小姐姐（女性）"},
    {"id": "Ethan", "desc": "阳光、温暖、活力、朝气（男性）"},
    {"id": "Chelsie", "desc": "二次元虚拟女友（女性）"},
    {"id": "Momo", "desc": "撒娇搞怪，逗你开心（女性）"},
    {"id": "Vivian", "desc": "拽拽的、可爱的小暴躁（女性）"},
    {"id": "Moon", "desc": "率性帅气的月白（男性）"},
    {"id": "Maia", "desc": "知性与温柔的碰撞（女性）"},
    {"id": "Kai", "desc": "耳朵的一场SPA（男性）"},
    {"id": "Nofish", "desc": "不会翘舌音的设计师（男性）"},
    {"id": "Bella", "desc": "喝酒不打醉拳的小萝莉（女性）"},
    {"id": "Eldric Sage", "desc": "沉稳睿智的老者（男性）"},
    {"id": "Mia", "desc": "温顺如春水，乖巧如初雪（女性）"},
    {"id": "Mochi", "desc": "聪明伶俐的小大人（男性）"},
    {"id": "Bellona", "desc": "声音洪亮，吐字清晰（女性）"},
    {"id": "Vincent", "desc": "独特的沙哑烟嗓（男性）"},
    {"id": "Bunny", "desc": "萌属性爆棚的小萝莉（女性）"},
    {"id": "Neil", "desc": "专业新闻主持人（男性）"},
    {"id": "Elias", "desc": "知识型讲师（女性）"},
    {"id": "Arthur", "desc": "质朴嗓音的老者（男性）"},
    {"id": "Nini", "desc": "又软又黏的嗓音（女性）"},
    {"id": "Seren", "desc": "温和舒缓的声线（女性）"},
    {"id": "Pip", "desc": "调皮捣蛋充满童真（男性）"},
    {"id": "Stella", "desc": "甜到发腻的少女音（女性）"},
]


@router.post("/{asset_id}/extract-voice-prompt")
async def extract_voice_prompt(
    asset_id: str,
    db: Session = Depends(get_session),
):
    """Extract voice characteristics and pick best matching TTS voice for a character."""
    from services.llm import llm_service
    import json as _json

    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    if asset.type != "character":
        raise HTTPException(400, "Only character assets support voice extraction")

    # Get project and breakdown result
    project = db.query(Project).filter(Project.id == asset.project_id).first()
    if not project or not project.breakdown_result:
        raise HTTPException(400, "Project has no breakdown data")

    breakdown = project.breakdown_result
    characters = breakdown.get("characters", [])

    # Find the character data
    char_data = None
    for ch in characters:
        if ch.get("name") == asset.name or asset.name in ch.get("name", ""):
            char_data = ch
            break

    if not char_data:
        raise HTTPException(404, f"Character '{asset.name}' not found in breakdown")

    # Determine gender and filter voice list accordingly
    gender = (char_data.get('gender', '') or '').strip()
    is_male = any(k in gender for k in ('男', '男性', 'male', 'M'))
    is_female = any(k in gender for k in ('女', '女性', 'female', 'F'))

    if is_male:
        filtered_voices = [v for v in QWEN3_TTS_VOICES if '男性' in v['desc']]
        gender_hint = "该角色为男性，请务必选择男性音色。"
    elif is_female:
        filtered_voices = [v for v in QWEN3_TTS_VOICES if '女性' in v['desc']]
        gender_hint = "该角色为女性，请务必选择女性音色。"
    else:
        filtered_voices = QWEN3_TTS_VOICES
        gender_hint = ""

    voice_list_str = "\n".join(
        f"- {v['id']}：{v['desc']}" for v in filtered_voices
    )

    voice_prompt_text = f"""请根据以下角色信息，完成三个任务：

【角色信息】
角色名称：{asset.name}
角色描述：{char_data.get('description', '') or char_data.get('appearance', '')}
性格特点：{char_data.get('personality', '') or char_data.get('traits', '')}
年龄：{char_data.get('age', '未知')}
性别：{gender or '未知'}

【任务1】从以下可用音色列表中，选择一个最匹配该角色的音色（{gender_hint}）。
选择音色的核心原则——必须根据角色名字、年龄、性格综合判断：
- 名字含"公子""少爷""王子"等贵族少年气质的角色 → 选温暖、清朗、有朝气的音色（如Ethan、Moon、Kai），绝对不能选沙哑粗犷的音色
- 年轻活泼的角色 → 选阳光活力的音色
- 成熟稳重的角色 → 选沉稳有磁性的音色
- 年长者/老者 → 选老者音色
- 沙哑烟嗓类音色（如Vincent）只适合粗犷、沧桑、叛逆类角色，不适合文雅、温润、贵气的角色
请仔细分析角色气质后再选择，不要默认选某个音色：
{voice_list_str}

【任务2】生成一段150-200字的中文描述，详细描述该角色的声音特点（音调高低、语速快慢、情感表达、说话风格、音色质感等），用于控制TTS的instructions参数。要求具体而非模糊，多维度描述，注意：这是描述声音的特点，不是描述外貌的。

【任务3】以该角色的口吻写一段100-200字的示范台词，内容要符合角色的性格和说话风格，用于TTS试听。

请严格按照以下JSON格式输出，不要加任何前缀、后缀或解释：
{{"voice": "选中的音色id", "instructions": "声音特点描述", "text": "示范台词"}}"""

    try:
        result = await llm_service.complete_with_provider("auto", voice_prompt_text)
        result = result.strip()

        # Parse JSON from LLM response
        if result.startswith("```"):
            result = result.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        parsed = _json.loads(result)
        voice_id = parsed.get("voice", "Cherry")
        voice_instructions = parsed.get("instructions", "")
        voice_text = parsed.get("text", voice_instructions)

        # Validate voice_id against filtered list
        filtered_ids = {v["id"] for v in filtered_voices}
        if voice_id not in filtered_ids:
            voice_id = filtered_voices[0]["id"] if filtered_voices else "Cherry"

        # Post-correction: override unsuitable voice based on character traits
        # Vincent (沙哑烟嗓) is only for rough/grizzled characters, not elegant/young ones
        young_elegant_keywords = ("公子", "少爷", "王子", "少年", "小姐", "仙子", "书生", "才子")
        age = char_data.get('age', '')
        age_num = int(''.join(c for c in str(age) if c.isdigit()) or '0')
        is_young_elegant = (
            any(kw in asset.name for kw in young_elegant_keywords) or
            any(kw in str(char_data.get('description', '')) for kw in young_elegant_keywords) or
            (0 < age_num <= 25)
        )
        if is_young_elegant and voice_id == "Vincent":
            if is_male:
                voice_id = "Ethan"
            elif is_female:
                voice_id = "Cherry"

        # Update asset's tts_config
        tts_config = asset.tts_config or {}
        tts_config["prompt"] = voice_instructions
        tts_config["voice"] = voice_id
        tts_config["text"] = voice_text
        asset.tts_config = tts_config
        db.commit()

        return {
            "asset_id": asset_id,
            "voice_prompt": voice_instructions,
            "voice": voice_id,
            "text": voice_text,
        }
    except _json.JSONDecodeError:
        # Fallback: treat entire result as instructions, pick default voice by gender
        voice_prompt = result.strip()
        fallback_voice = filtered_voices[0]["id"] if filtered_voices else "Cherry"
        tts_config = asset.tts_config or {}
        tts_config["prompt"] = voice_prompt
        tts_config["voice"] = fallback_voice
        asset.tts_config = tts_config
        db.commit()
        return {
            "asset_id": asset_id,
            "voice_prompt": voice_prompt,
            "voice": fallback_voice,
        }
    except Exception as e:
        raise HTTPException(500, f"LLM failed: {e}")
