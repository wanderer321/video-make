import httpx
from typing import Any
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.models import ApiConfig
from api.deps import get_session
from services.crypto import encrypt, decrypt

router = APIRouter()

PROVIDERS = [
    # LLM
    "claude", "openai", "deepseek", "qianwen", "ollama",
    # Image
    "stability", "kling_image", "fal", "comfyui", "sdwebui",
    # Video
    "kling_video", "vidu", "runway", "pika", "jimeng_video",
    # TTS
    "elevenlabs", "fish_audio", "azure_tts", "xunfei", "cosyvoice",
    # General
    "general",
]


class ConfigSave(BaseModel):
    provider: str
    data: dict[str, Any]


class TestRequest(BaseModel):
    provider: str
    data: dict[str, Any]


def _mask_value(k: str, v: Any) -> Any:
    if isinstance(v, str) and len(v) > 8 and ("key" in k.lower() or "secret" in k.lower() or "token" in k.lower()):
        return v[:4] + "****" + v[-4:]
    return v


def _get_config(provider: str, db: Session) -> dict:
    row = db.query(ApiConfig).filter(ApiConfig.provider == provider).first()
    if not row or not row.encrypted_data:
        return {}
    try:
        return decrypt(row.encrypted_data)
    except Exception:
        return {}


@router.get("")
def get_all_settings(db: Session = Depends(get_session)):
    rows = db.query(ApiConfig).all()
    result = {}
    for row in rows:
        try:
            data = decrypt(row.encrypted_data)
            result[row.provider] = {k: _mask_value(k, v) for k, v in data.items()}
        except Exception:
            result[row.provider] = {}
    return result


@router.get("/configured")
def get_configured_providers(db: Session = Depends(get_session)):
    """Return list of providers that have at least one key configured."""
    rows = db.query(ApiConfig).all()
    configured = []
    for row in rows:
        try:
            data = decrypt(row.encrypted_data)
            if any(v for v in data.values() if isinstance(v, str) and v.strip()):
                configured.append(row.provider)
        except Exception:
            pass
    return {"configured": configured}


@router.get("/{provider}")
def get_provider_settings(provider: str, db: Session = Depends(get_session)):
    if provider not in PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown provider")
    data = _get_config(provider, db)
    return {"provider": provider, "data": {k: _mask_value(k, v) for k, v in data.items()}}


@router.post("/save")
def save_settings(body: ConfigSave, db: Session = Depends(get_session)):
    if body.provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail="Unknown provider")
    existing = _get_config(body.provider, db)
    merged = {**existing}
    for k, v in body.data.items():
        if isinstance(v, str) and "****" in v:
            pass  # keep existing masked value
        else:
            merged[k] = v

    encrypted = encrypt(merged)
    row = db.query(ApiConfig).filter(ApiConfig.provider == body.provider).first()
    if row:
        row.encrypted_data = encrypted
    else:
        row = ApiConfig(provider=body.provider, encrypted_data=encrypted)
        db.add(row)
    db.commit()
    return {"ok": True}


@router.delete("/{provider}", status_code=204)
def clear_provider_settings(provider: str, db: Session = Depends(get_session)):
    """Clear all settings for a provider."""
    row = db.query(ApiConfig).filter(ApiConfig.provider == provider).first()
    if row:
        db.delete(row)
        db.commit()


@router.post("/test")
async def test_connection(body: TestRequest):
    provider = body.provider
    data = body.data

    try:
        if provider == "claude":
            api_key = data.get("api_key", "")
            base_url = data.get("base_url", "https://api.anthropic.com")
            if not api_key or "****" in api_key:
                return {"ok": False, "message": "API Key 未填写或仍为掩码值"}
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    f"{base_url.rstrip('/')}/v1/models",
                    headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"},
                )
                if r.status_code == 200:
                    return {"ok": True, "message": "Claude 连接成功"}
                elif r.status_code == 401:
                    return {"ok": False, "message": "API Key 无效 (401)"}
                return {"ok": False, "message": f"HTTP {r.status_code}"}

        elif provider in ("openai", "deepseek"):
            api_key = data.get("api_key", "")
            default_url = "https://api.openai.com/v1" if provider == "openai" else "https://api.deepseek.com/v1"
            base_url = data.get("base_url", default_url) or default_url
            if not api_key or "****" in api_key:
                return {"ok": False, "message": "API Key 未填写"}
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    f"{base_url.rstrip('/')}/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                if r.status_code == 200:
                    models = r.json().get("data", [])
                    return {"ok": True, "message": f"连接成功，{len(models)} 个模型可用"}
                elif r.status_code == 401:
                    return {"ok": False, "message": "API Key 无效"}
                return {"ok": False, "message": f"HTTP {r.status_code}"}

        elif provider == "qianwen":
            api_key = data.get("api_key", "")
            if not api_key or "****" in api_key:
                return {"ok": False, "message": "API Key 未填写"}
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                if r.status_code in (200, 400):
                    return {"ok": True, "message": "通义千问连接成功"}
                elif r.status_code == 401:
                    return {"ok": False, "message": "API Key 无效"}
                return {"ok": False, "message": f"HTTP {r.status_code}"}

        elif provider == "ollama":
            base_url = data.get("base_url", "http://localhost:11434")
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(f"{base_url.rstrip('/')}/api/tags")
                if r.status_code == 200:
                    models = r.json().get("models", [])
                    names = [m["name"] for m in models[:5]]
                    msg = f"已连接，{len(models)} 个模型"
                    if names:
                        msg += f": {', '.join(names)}"
                    return {"ok": True, "message": msg}
                return {"ok": False, "message": f"HTTP {r.status_code}"}

        elif provider == "comfyui":
            base_url = data.get("base_url", "http://localhost:8188")
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(f"{base_url.rstrip('/')}/system_stats")
                if r.status_code == 200:
                    return {"ok": True, "message": "ComfyUI 已连接"}
                return {"ok": False, "message": f"HTTP {r.status_code}"}

        elif provider == "sdwebui":
            base_url = data.get("base_url", "http://localhost:7860")
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(f"{base_url.rstrip('/')}/info")
                if r.status_code == 200:
                    return {"ok": True, "message": "SD WebUI 已连接"}
                return {"ok": False, "message": f"HTTP {r.status_code}"}

        elif provider == "elevenlabs":
            api_key = data.get("api_key", "")
            if not api_key or "****" in api_key:
                return {"ok": False, "message": "API Key 未填写"}
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    "https://api.elevenlabs.io/v1/user",
                    headers={"xi-api-key": api_key},
                )
                if r.status_code == 200:
                    return {"ok": True, "message": "ElevenLabs 连接成功"}
                return {"ok": False, "message": "API Key 无效"}

        elif provider == "fish_audio":
            api_key = data.get("api_key", "")
            if not api_key or "****" in api_key:
                return {"ok": False, "message": "API Key 未填写"}
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    "https://api.fish.audio/v1/me",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                if r.status_code == 200:
                    return {"ok": True, "message": "Fish Audio 连接成功"}
                return {"ok": False, "message": "API Key 无效"}

        else:
            return {"ok": True, "message": "配置已保存（此接口暂不支持自动测试）"}

    except httpx.ConnectError:
        return {"ok": False, "message": "无法连接，请检查地址或网络"}
    except httpx.TimeoutException:
        return {"ok": False, "message": "连接超时（10秒）"}
    except Exception as e:
        return {"ok": False, "message": str(e)}
