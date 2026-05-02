"""TTS (text-to-speech) routes: voice list, synthesize, preview."""
import os
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

from services.tts import tts_service

router = APIRouter()

DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
)

VOICE_LIST = {
    "edge": [
        {"id": "zh-CN-XiaoxiaoNeural", "name": "晓晓 (女/普通话)", "lang": "zh-CN", "gender": "female"},
        {"id": "zh-CN-YunxiNeural",    "name": "云希 (男/普通话)", "lang": "zh-CN", "gender": "male"},
        {"id": "zh-CN-XiaohanNeural",  "name": "晓涵 (女/普通话)", "lang": "zh-CN", "gender": "female"},
        {"id": "zh-CN-YunjianNeural",  "name": "云健 (男/普通话)", "lang": "zh-CN", "gender": "male"},
        {"id": "zh-CN-XiaoyiNeural",   "name": "晓伊 (女/普通话)", "lang": "zh-CN", "gender": "female"},
        {"id": "zh-TW-HsiaoChenNeural","name": "晓臻 (女/台湾)", "lang": "zh-TW", "gender": "female"},
        {"id": "en-US-JennyNeural",    "name": "Jenny (女/英语)", "lang": "en-US", "gender": "female"},
        {"id": "en-US-GuyNeural",      "name": "Guy (男/英语)",   "lang": "en-US", "gender": "male"},
        {"id": "ja-JP-NanamiNeural",   "name": "七海 (女/日语)", "lang": "ja-JP", "gender": "female"},
    ],
    "qwen3_tts": [
        {"id": "Cherry", "name": "Cherry - 阳光积极小姐姐", "gender": "female"},
        {"id": "Serena", "name": "Serena - 温柔小姐姐", "gender": "female"},
        {"id": "Ethan", "name": "Ethan - 阳光温暖活力", "gender": "male"},
        {"id": "Chelsie", "name": "Chelsie - 二次元女友", "gender": "female"},
        {"id": "Momo", "name": "Momo - 撒娇搞怪", "gender": "female"},
        {"id": "Vivian", "name": "Vivian - 可爱小暴躁", "gender": "female"},
        {"id": "Moon", "name": "Moon - 率性帅气", "gender": "male"},
        {"id": "Maia", "name": "Maia - 知性温柔", "gender": "female"},
        {"id": "Kai", "name": "Kai - 耳朵SPA", "gender": "male"},
        {"id": "Nofish", "name": "Nofish - 设计师", "gender": "male"},
        {"id": "Bella", "name": "Bella - 小萝莉", "gender": "female"},
        {"id": "Eldric Sage", "name": "Eldric Sage - 沉稳老者", "gender": "male"},
        {"id": "Mia", "name": "Mia - 温顺乖巧", "gender": "female"},
        {"id": "Mochi", "name": "Mochi - 聪明小大人", "gender": "male"},
        {"id": "Bellona", "name": "Bellona - 洪亮清晰", "gender": "female"},
        {"id": "Vincent", "name": "Vincent - 沙哑烟嗓", "gender": "male"},
        {"id": "Bunny", "name": "Bunny - 萌萝莉", "gender": "female"},
        {"id": "Neil", "name": "Neil - 新闻主持人", "gender": "male"},
        {"id": "Elias", "name": "Elias - 知识讲师", "gender": "female"},
        {"id": "Arthur", "name": "Arthur - 质朴老者", "gender": "male"},
        {"id": "Nini", "name": "Nini - 软黏嗓音", "gender": "female"},
        {"id": "Seren", "name": "Seren - 温和舒缓", "gender": "female"},
        {"id": "Pip", "name": "Pip - 调皮童真", "gender": "male"},
        {"id": "Stella", "name": "Stella - 甜腻少女", "gender": "female"},
    ],
    "elevenlabs": [],
    "fish_audio": [],
}


class SynthesizeRequest(BaseModel):
    text: str
    voice: str = "zh-CN-XiaoxiaoNeural"
    provider: str = "auto"
    speed: float = 1.0
    pitch: float = 0.0


class TTSTaskRequest(BaseModel):
    text: str
    voice: str = "zh-CN-XiaoxiaoNeural"
    provider: str = "auto"
    board_id: Optional[str] = None
    output_filename: Optional[str] = None


@router.get("/voices")
def list_voices(provider: str = "edge"):
    voices = VOICE_LIST.get(provider, [])
    return {"provider": provider, "voices": voices}


@router.post("/synthesize")
async def synthesize(body: SynthesizeRequest):
    """Synthesize text and return audio bytes directly."""
    if not body.text.strip():
        raise HTTPException(400, "Text is empty")
    try:
        audio_bytes = await tts_service.synthesize(
            text=body.text,
            voice=body.voice,
            provider=body.provider,
        )
    except Exception as e:
        raise HTTPException(500, f"TTS failed: {e}")

    return Response(content=audio_bytes, media_type="audio/mpeg")


@router.post("/synthesize-file")
async def synthesize_to_file(body: TTSTaskRequest):
    """Synthesize and save to disk, return path."""
    if not body.text.strip():
        raise HTTPException(400, "Text is empty")
    try:
        audio_bytes = await tts_service.synthesize(
            text=body.text,
            voice=body.voice,
            provider=body.provider,
        )
    except Exception as e:
        raise HTTPException(500, f"TTS failed: {e}")

    out_dir = os.path.join(DATA_DIR, "generated", "audio")
    os.makedirs(out_dir, exist_ok=True)
    filename = body.output_filename or f"{uuid.uuid4()}.mp3"
    out_path = os.path.join(out_dir, filename)
    with open(out_path, "wb") as f:
        f.write(audio_bytes)

    return {"path": out_path, "size": len(audio_bytes)}


@router.get("/file/{filename}")
def get_audio_file(filename: str):
    """Serve a generated audio file."""
    safe_name = os.path.basename(filename)
    path = os.path.join(DATA_DIR, "generated", "audio", safe_name)
    if not os.path.exists(path):
        raise HTTPException(404, "Audio file not found")
    with open(path, "rb") as f:
        return Response(content=f.read(), media_type="audio/mpeg")
