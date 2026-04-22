"""LLM service - routes requests to the configured provider."""
import json
import httpx
from typing import AsyncIterator
from db.database import get_db
from db.models import ApiConfig
from services.crypto import decrypt


def _get_config(provider: str) -> dict:
    db = next(get_db())
    try:
        row = db.query(ApiConfig).filter(ApiConfig.provider == provider).first()
        if not row or not row.encrypted_data:
            return {}
        return decrypt(row.encrypted_data)
    finally:
        db.close()


def _get_active_llm() -> tuple[str, dict]:
    """Return (provider_id, config) for the first configured LLM provider."""
    for provider in ("claude", "openai", "deepseek", "qianwen", "ollama"):
        cfg = _get_config(provider)
        if cfg.get("api_key") or (provider == "ollama" and cfg.get("base_url")):
            return provider, cfg
    # Fallback to local Ollama with clear error message
    return "ollama", {"base_url": "http://localhost:11434", "model": "qwen2.5:7b",
                      "__no_config__": True}


class LLMService:
    async def complete(self, prompt: str, system: str = "") -> str:
        provider, cfg = _get_active_llm()

        if cfg.get("__no_config__"):
            raise RuntimeError(
                "未配置任何 LLM 接口。请在[设置]页面配置以下任意一项：\n"
                "• Claude (Anthropic)\n• OpenAI / 兼容接口\n• DeepSeek\n• 通义千问\n• Ollama（本地）"
            )

        if provider == "claude":
            return await self._claude(prompt, system, cfg)
        elif provider == "ollama":
            return await self._ollama(prompt, system, cfg)
        elif provider == "qianwen":
            # DashScope uses OpenAI-compat with a specific base_url
            if not cfg.get("base_url"):
                cfg["base_url"] = "https://dashscope.aliyuncs.com/compatible-mode/v1"
            if not cfg.get("model"):
                cfg["model"] = "qwen-max"
            return await self._openai_compat(prompt, system, cfg)
        else:
            return await self._openai_compat(prompt, system, cfg)

    async def stream(self, prompt: str, system: str = "") -> AsyncIterator[str]:
        """Stream LLM response in text chunks."""
        provider, cfg = _get_active_llm()
        if cfg.get("__no_config__"):
            raise RuntimeError(
                "未配置任何 LLM 接口。请在[设置]页面配置以下任意一项：\n"
                "• Claude (Anthropic)\n• OpenAI / 兼容接口\n• DeepSeek\n• 通义千问\n• Ollama（本地）"
            )
        if provider == "claude":
            async for chunk in self._stream_claude(prompt, system, cfg):
                yield chunk
        elif provider == "ollama":
            async for chunk in self._stream_ollama(prompt, system, cfg):
                yield chunk
        else:
            # OpenAI-compat (openai/deepseek/qianwen) support streaming
            if provider == "qianwen" and not cfg.get("base_url"):
                cfg["base_url"] = "https://dashscope.aliyuncs.com/compatible-mode/v1"
            if provider == "qianwen" and not cfg.get("model"):
                cfg["model"] = "qwen-max"
            async for chunk in self._stream_openai_compat(prompt, system, cfg):
                yield chunk

    async def _stream_claude(self, prompt: str, system: str, cfg: dict) -> AsyncIterator[str]:
        api_key = cfg.get("api_key", "")
        base_url = cfg.get("base_url", "https://api.anthropic.com").rstrip("/")
        model = cfg.get("model", "claude-sonnet-4-6")
        messages = [{"role": "user", "content": prompt}]
        body: dict = {"model": model, "max_tokens": 4096, "messages": messages, "stream": True}
        if system:
            body["system"] = system

        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{base_url}/v1/messages",
                headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json=body,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            event = json.loads(data)
                            if event.get("type") == "content_block_delta":
                                text = event.get("delta", {}).get("text", "")
                                if text:
                                    yield text
                        except json.JSONDecodeError:
                            pass

    async def _stream_openai_compat(self, prompt: str, system: str, cfg: dict) -> AsyncIterator[str]:
        api_key = cfg.get("api_key", "")
        base_url = cfg.get("base_url", "https://api.openai.com/v1").rstrip("/")
        model = cfg.get("model", "gpt-4o")
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": messages, "max_tokens": 4096, "stream": True},
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            event = json.loads(data)
                            content = event.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            pass

    async def _stream_ollama(self, prompt: str, system: str, cfg: dict) -> AsyncIterator[str]:
        base_url = cfg.get("base_url", "http://localhost:11434").rstrip("/")
        model = cfg.get("model", "qwen2.5:7b")
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=180) as client:
            async with client.stream(
                "POST",
                f"{base_url}/api/chat",
                json={"model": model, "messages": messages, "stream": True},
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            content = data.get("message", {}).get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            pass

    async def complete_with_provider(self, provider: str, prompt: str, system: str = "") -> str:
        cfg = _get_config(provider)
        if provider == "claude":
            return await self._claude(prompt, system, cfg)
        elif provider in ("openai", "deepseek", "qianwen"):
            return await self._openai_compat(prompt, system, cfg)
        elif provider == "ollama":
            return await self._ollama(prompt, system, cfg)
        raise ValueError(f"Unknown LLM provider: {provider}")

    async def _claude(self, prompt: str, system: str, cfg: dict) -> str:
        api_key = cfg.get("api_key", "")
        base_url = cfg.get("base_url", "https://api.anthropic.com").rstrip("/")
        model = cfg.get("model", "claude-sonnet-4-6")

        messages = [{"role": "user", "content": prompt}]
        body = {"model": model, "max_tokens": 4096, "messages": messages}
        if system:
            body["system"] = system

        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(
                f"{base_url}/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json=body,
            )
            r.raise_for_status()
            data = r.json()
            return data["content"][0]["text"]

    async def _openai_compat(self, prompt: str, system: str, cfg: dict) -> str:
        api_key = cfg.get("api_key", "")
        base_url = cfg.get("base_url", "https://api.openai.com/v1").rstrip("/")
        model = cfg.get("model", "gpt-4o")

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={"model": model, "messages": messages, "max_tokens": 4096},
            )
            r.raise_for_status()
            data = r.json()
            return data["choices"][0]["message"]["content"]

    async def _ollama(self, prompt: str, system: str, cfg: dict) -> str:
        base_url = cfg.get("base_url", "http://localhost:11434").rstrip("/")
        model = cfg.get("model", "qwen2.5:7b")

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=180) as client:
            r = await client.post(
                f"{base_url}/api/chat",
                json={"model": model, "messages": messages, "stream": False},
            )
            r.raise_for_status()
            data = r.json()
            return data["message"]["content"]


llm_service = LLMService()
