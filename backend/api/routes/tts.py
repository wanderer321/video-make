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
