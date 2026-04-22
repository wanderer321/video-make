"""TTS service - text to speech, routes to configured provider."""
import httpx
import json
import asyncio
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


class TTSService:
    async def synthesize(
        self,
        text: str,
        voice: str = "zh-CN-XiaoxiaoNeural",
        provider: str = "auto",
        speed: float = 1.0,
    ) -> bytes:
        if provider == "auto":
            provider = self._pick_provider()

        if provider == "edge_tts":
            return await self._edge_tts(text, voice, speed)
        elif provider == "elevenlabs":
            return await self._elevenlabs(text, voice)
        elif provider == "fish_audio":
            return await self._fish_audio(text, voice)
        elif provider == "azure_tts":
            return await self._azure_tts(text, voice, speed)
        elif provider == "cosyvoice":
            return await self._cosyvoice(text, voice)
        elif provider == "xunfei":
            return await self._xunfei_tts(text, voice, speed)
        else:
            return await self._edge_tts(text, voice, speed)

    def _pick_provider(self) -> str:
        for p in ("elevenlabs", "fish_audio", "azure_tts", "cosyvoice", "xunfei"):
            cfg = _get_config(p)
            if p == "cosyvoice" and cfg.get("base_url"):
                return p
            elif p != "cosyvoice" and cfg.get("api_key"):
                return p
        return "edge_tts"

    async def _edge_tts(self, text: str, voice: str, speed: float) -> bytes:
        try:
            import edge_tts
            rate_str = f"+{int((speed - 1) * 100)}%" if speed >= 1 else f"{int((speed - 1) * 100)}%"
            communicate = edge_tts.Communicate(text, voice=voice, rate=rate_str)
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
            return audio_data
        except ImportError:
            raise RuntimeError("edge-tts not installed. Run: pip install edge-tts")

    async def _elevenlabs(self, text: str, voice_id: str) -> bytes:
        cfg = _get_config("elevenlabs")
        api_key = cfg.get("api_key", "")
        if not voice_id or len(voice_id) < 10:
            voice_id = "21m00Tcm4TlvDq8ikWAM"  # Rachel default

        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={"xi-api-key": api_key, "Content-Type": "application/json"},
                json={"text": text, "model_id": "eleven_multilingual_v2"},
            )
            r.raise_for_status()
            return r.content

    async def _fish_audio(self, text: str, reference_id: str) -> bytes:
        cfg = _get_config("fish_audio")
        api_key = cfg.get("api_key", "")
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                "https://api.fish.audio/v1/tts",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "text": text,
                    "reference_id": reference_id or None,
                    "format": "mp3",
                    "latency": "normal",
                },
            )
            r.raise_for_status()
            return r.content

    async def _azure_tts(self, text: str, voice: str, speed: float) -> bytes:
        cfg = _get_config("azure_tts")
        api_key = cfg.get("api_key", "")
        region = cfg.get("region", "eastasia")

        # Acquire short-lived token
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"https://{region}.api.cognitive.microsoft.com/sts/v1.0/issueToken",
                headers={"Ocp-Apim-Subscription-Key": api_key},
            )
            r.raise_for_status()
            token = r.text

        rate_str = f"+{int((speed - 1) * 100)}%" if speed >= 1 else f"{int((speed - 1) * 100)}%"
        if not voice or not voice.startswith("zh") and not voice.startswith("en") and not voice.startswith("ja"):
            voice = "zh-CN-XiaoxiaoNeural"
        ssml = (
            f"<speak version='1.0' xml:lang='zh-CN'>"
            f"<voice name='{voice}'>"
            f"<prosody rate='{rate_str}'>{text}</prosody>"
            f"</voice></speak>"
        )

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/ssml+xml",
                    "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
                },
                content=ssml.encode("utf-8"),
            )
            r.raise_for_status()
            return r.content

    async def _cosyvoice(self, text: str, voice: str) -> bytes:
        """CosyVoice local server (default port 9880). voice = spk_id."""
        cfg = _get_config("cosyvoice")
        base_url = cfg.get("base_url", "http://localhost:9880").rstrip("/")
        spk_id = voice or "中文女"
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                f"{base_url}/inference_sft",
                params={"tts_text": text, "spk_id": spk_id},
            )
            r.raise_for_status()
            return r.content

    async def _xunfei_tts(self, text: str, voice: str, speed: float) -> bytes:
        """iFlytek TTS via REST API (Spark TTS)."""
        import hashlib, hmac as _hmac, base64 as _b64, time as _time
        cfg = _get_config("xunfei")
        app_id = cfg.get("app_id", "")
        api_key = cfg.get("api_key", "")
        api_secret = cfg.get("api_secret", "")

        # Build authorization for Spark API
        date = _time.strftime("%a, %d %b %Y %H:%M:%S GMT", _time.gmtime())
        host = "tts-api.xfyun.cn"
        path = "/v2/tts"
        origin = f"host: {host}\ndate: {date}\nGET {path} HTTP/1.1"
        signature = _b64.b64encode(
            _hmac.new(api_secret.encode(), origin.encode(), hashlib.sha256).digest()
        ).decode()
        auth = _b64.b64encode(
            f'api_key="{api_key}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature}"'.encode()
        ).decode()

        vcn = voice or "xiaoyan"
        speed_int = max(0, min(100, int(50 + (speed - 1) * 50)))
        business = {"aue": "lame", "sfl": 1, "auf": "audio/L16;rate=16000", "vcn": vcn, "speed": speed_int, "tte": "UTF8"}
        data_b64 = _b64.b64encode(text.encode("utf-8")).decode()

        import websockets, json as _json
        ws_url = (
            f"wss://{host}{path}"
            f"?authorization={auth}&date={date.replace(' ', '%20')}&host={host}"
        )
        audio_chunks: list[bytes] = []
        async with websockets.connect(ws_url) as ws:
            await ws.send(_json.dumps({
                "common": {"app_id": app_id},
                "business": business,
                "data": {"text": data_b64, "status": 2},
            }))
            while True:
                msg = _json.loads(await ws.recv())
                if msg.get("data", {}).get("audio"):
                    audio_chunks.append(_b64.b64decode(msg["data"]["audio"]))
                if msg.get("data", {}).get("status") == 2:
                    break
        return b"".join(audio_chunks)

    async def list_edge_voices(self, lang: str = "zh") -> list[dict]:
        """List available Edge TTS voices for a language."""
        try:
            import edge_tts
            voices = await edge_tts.list_voices()
            return [
                {"name": v["ShortName"], "display": v["FriendlyName"], "gender": v["Gender"]}
                for v in voices
                if v["Locale"].startswith(lang)
            ]
        except ImportError:
            return []


tts_service = TTSService()
