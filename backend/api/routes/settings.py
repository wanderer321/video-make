import json
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
    "claude", "openai", "deepseek", "qianwen", "glm", "minimax", "ollama",
    # Image
    "stability", "kling_image", "jimeng_image", "fal", "comfyui", "sdwebui",
    # Video
    "kling_video", "vidu", "runway", "pika", "jimeng_video_v30", "jimeng_seedance",
    # TTS
    "elevenlabs", "fish_audio", "azure_tts", "xunfei", "cosyvoice", "qwen3_tts",
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

    # 通用的 LLM 测试：发送简单问题验证接口
    async def test_llm_openai_compat(base_url: str, api_key: str, model: str, provider_name: str):
        if not api_key or "****" in api_key:
            return {"ok": False, "message": "API Key 未填写"}
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": [{"role": "user", "content": "回复OK"}], "max_tokens": 5},
            )
            if r.status_code == 200:
                return {"ok": True, "message": f"{provider_name} 连接成功"}
            elif r.status_code == 401:
                return {"ok": False, "message": "API Key 无效"}
            elif r.status_code == 404:
                return {"ok": False, "message": f"模型 '{model}' 不存在"}
            return {"ok": False, "message": f"HTTP {r.status_code}: {r.text[:100]}"}

    async def test_llm_claude(base_url: str, api_key: str):
        if not api_key or "****" in api_key:
            return {"ok": False, "message": "API Key 未填写"}
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{base_url.rstrip('/')}/v1/messages",
                headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                json={"model": "claude-sonnet-4-6", "max_tokens": 10, "messages": [{"role": "user", "content": "回复OK"}]},
            )
            if r.status_code == 200:
                return {"ok": True, "message": "Claude 连接成功"}
            elif r.status_code == 401:
                return {"ok": False, "message": "API Key 无效"}
            return {"ok": False, "message": f"HTTP {r.status_code}"}

    try:
        if provider == "claude":
            base_url = data.get("base_url", "https://api.anthropic.com")
            return await test_llm_claude(base_url, data.get("api_key", ""))

        elif provider == "openai":
            base_url = data.get("base_url", "https://api.openai.com/v1")
            model = data.get("model", "gpt-4o")
            return await test_llm_openai_compat(base_url, data.get("api_key", ""), model, "OpenAI")

        elif provider == "deepseek":
            base_url = data.get("base_url", "https://api.deepseek.com/v1")
            model = data.get("model", "deepseek-chat")
            return await test_llm_openai_compat(base_url, data.get("api_key", ""), model, "DeepSeek")

        elif provider == "qianwen":
            base_url = data.get("base_url", "https://dashscope.aliyuncs.com/compatible-mode/v1")
            model = data.get("model", "qwen-max")
            return await test_llm_openai_compat(base_url, data.get("api_key", ""), model, "通义千问")

        elif provider == "glm":
            base_url = data.get("base_url", "https://open.bigmodel.cn/api/paas/v4")
            model = data.get("model", "glm-4-flash")
            return await test_llm_openai_compat(base_url, data.get("api_key", ""), model, "智谱GLM")

        elif provider == "minimax":
            base_url = data.get("base_url", "https://api.minimax.chat/v1")
            model = data.get("model", "abab6.5s-chat")
            api_key = data.get("api_key", "")
            group_id = data.get("group_id", "")
            if not api_key or "****" in api_key:
                return {"ok": False, "message": "API Key 未填写"}
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.post(
                    f"{base_url.rstrip('/')}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": model, "messages": [{"role": "user", "content": "回复OK"}], "max_tokens": 5},
                )
                if r.status_code == 200:
                    return {"ok": True, "message": "MiniMax 连接成功"}
                elif r.status_code == 401:
                    return {"ok": False, "message": "API Key 无效"}
                return {"ok": False, "message": f"HTTP {r.status_code}"}

        elif provider == "ollama":
            base_url = data.get("base_url", "http://localhost:11434")
            model = data.get("model", "qwen2.5:7b")
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.post(
                    f"{base_url.rstrip('/')}/api/chat",
                    json={"model": model, "messages": [{"role": "user", "content": "回复OK"}], "stream": False},
                )
                if r.status_code == 200:
                    return {"ok": True, "message": f"Ollama 连接成功，模型 {model}"}
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

        elif provider == "jimeng_image":
            # 火山引擎图像生成 - 需要 Access Key + Secret Key
            import hashlib
            import hmac
            from datetime import datetime, timezone
            access_key = data.get("access_key", "")
            secret_key = data.get("secret_key", "")
            if not access_key or "****" in access_key:
                return {"ok": False, "message": "Access Key 未填写"}
            if not secret_key or "****" in secret_key:
                return {"ok": False, "message": "Secret Key 未填写"}
            # Send a minimal test request
            now = datetime.now(timezone.utc)
            x_date = now.strftime("%Y%m%dT%H%M%SZ")
            short_date = now.strftime("%Y%m%d")
            body_str = '{"req_key":"jimeng_high_aes_general_v21_L","prompt":"test","width":512,"height":512}'
            body_hash = hashlib.sha256(body_str.encode()).hexdigest()
            signed_headers = "content-type;x-content-sha256;x-date"
            canonical_headers = f"content-type:application/json\nx-content-sha256:{body_hash}\nx-date:{x_date}\n"
            query = "Action=CVSubmitTask&Version=2022-08-31"
            canonical = f"POST\n/\n{query}\n{canonical_headers}\n{signed_headers}\n{body_hash}"
            cred_scope = f"{short_date}/cn-north-1/cv/request"
            string_to_sign = f"HMAC-SHA256\n{x_date}\n{cred_scope}\n{hashlib.sha256(canonical.encode()).hexdigest()}"
            k_date = hmac.new(secret_key.encode(), short_date.encode(), hashlib.sha256).digest()
            k_region = hmac.new(k_date, "cn-north-1".encode(), hashlib.sha256).digest()
            k_service = hmac.new(k_region, "cv".encode(), hashlib.sha256).digest()
            k_signing = hmac.new(k_service, "request".encode(), hashlib.sha256).digest()
            sig = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()
            auth = f"HMAC-SHA256 Credential={access_key}/{cred_scope}, SignedHeaders={signed_headers}, Signature={sig}"
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.post(
                    "https://visual.volcengineapi.com",
                    params={"Action": "CVSubmitTask", "Version": "2022-08-31"},
                    headers={
                        "Authorization": auth,
                        "Content-Type": "application/json",
                        "X-Date": x_date,
                        "X-Content-Sha256": body_hash,
                    },
                    content=body_str,
                )
                if r.status_code == 200:
                    return {"ok": True, "message": "即梦图像连接成功"}
                elif r.status_code in (401, 403):
                    return {"ok": False, "message": "Access Key 或 Secret Key 无效"}
                # Show actual error message
                try:
                    err_data = r.json()
                    err_msg = err_data.get("ResponseMetadata", {}).get("Error", {}).get("Message", f"HTTP {r.status_code}")
                except:
                    err_msg = f"HTTP {r.status_code}: {r.text[:100]}"
                return {"ok": False, "message": err_msg}

        elif provider in ("jimeng_video_v30", "jimeng_seedance"):
            # 火山引擎视频生成
            import hashlib
            import hmac
            from datetime import datetime, timezone
            access_key = data.get("access_key", "")
            secret_key = data.get("secret_key", "")
            api_key = data.get("api_key", "")

            # jimeng_video_v30 needs access_key + secret_key
            # jimeng_seedance needs api_key only
            if provider == "jimeng_video_v30":
                if not access_key or "****" in access_key:
                    return {"ok": False, "message": "Access Key 未填写"}
                if not secret_key or "****" in secret_key:
                    return {"ok": False, "message": "Secret Key 未填写"}
            else:  # jimeng_seedance
                if not api_key or "****" in api_key:
                    return {"ok": False, "message": "API Key 未填写"}

            req_key = "jimeng_ti2v_v30_pro" if provider == "jimeng_video_v30" else "jimeng_seedance"
            now = datetime.now(timezone.utc)
            x_date = now.strftime("%Y%m%dT%H%M%SZ")
            short_date = now.strftime("%Y%m%d")
            body_str = json.dumps({"req_key": req_key, "prompt": "test"})
            body_hash = hashlib.sha256(body_str.encode()).hexdigest()

            if provider == "jimeng_video_v30":
                # HMAC-SHA256 auth
                signed_headers = "content-type;x-content-sha256;x-date"
                canonical_headers = f"content-type:application/json\nx-content-sha256:{body_hash}\nx-date:{x_date}\n"
                query = "Action=CVSubmitTask&Version=2022-08-31"
                canonical = f"POST\n/\n{query}\n{canonical_headers}\n{signed_headers}\n{body_hash}"
                cred_scope = f"{short_date}/cn-north-1/cv/request"
                string_to_sign = f"HMAC-SHA256\n{x_date}\n{cred_scope}\n{hashlib.sha256(canonical.encode()).hexdigest()}"
                k_date = hmac.new(secret_key.encode(), short_date.encode(), hashlib.sha256).digest()
                k_region = hmac.new(k_date, "cn-north-1".encode(), hashlib.sha256).digest()
                k_service = hmac.new(k_region, "cv".encode(), hashlib.sha256).digest()
                k_signing = hmac.new(k_service, "request".encode(), hashlib.sha256).digest()
                sig = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()
                auth = f"HMAC-SHA256 Credential={access_key}/{cred_scope}, SignedHeaders={signed_headers}, Signature={sig}"
                headers = {
                    "Authorization": auth,
                    "Content-Type": "application/json",
                    "X-Date": x_date,
                    "X-Content-Sha256": body_hash,
                }
            else:
                # Simple Bearer auth for seedance
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                }

            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.post(
                    "https://visual.volcengineapi.com",
                    params={"Action": "CVSubmitTask", "Version": "2022-08-31"},
                    headers=headers,
                    content=body_str,
                )
                if r.status_code == 200:
                    provider_name = "即梦视频生成3.0" if provider == "jimeng_video_v30" else "即梦 Seedance 2.0"
                    return {"ok": True, "message": f"{provider_name}连接成功"}
                elif r.status_code in (401, 403):
                    return {"ok": False, "message": "API Key 无效"}
                return {"ok": False, "message": f"HTTP {r.status_code}: {r.text[:100]}"}

        else:
            # 其他提供商暂不支持测试
            return {"ok": True, "message": "配置已保存（此接口暂不支持自动测试）"}

    except httpx.ConnectError:
        return {"ok": False, "message": "无法连接，请检查地址或网络"}
    except httpx.TimeoutException:
        return {"ok": False, "message": "连接超时"}
    except Exception as e:
        return {"ok": False, "message": str(e)}
