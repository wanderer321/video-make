"""Video generation service - image-to-video, text-to-video."""
import httpx
import os
import base64
import asyncio
import time
import jwt  # PyJWT for Kling auth
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


def _kling_jwt(api_key: str, api_secret: str) -> str:
    """Generate JWT token for Kling API authentication."""
    payload = {
        "iss": api_key,
        "exp": int(time.time()) + 1800,
        "nbf": int(time.time()) - 5,
    }
    return jwt.encode(payload, api_secret, algorithm="HS256")


class VideoGenService:
    async def generate(
        self,
        prompt: str,
        image_url: str = "",
        duration: int = 5,
        provider: str = "auto",
    ) -> str:
        """Unified entry: if image_url is provided, use i2v; otherwise t2v."""
        if image_url:
            return await self.generate_i2v(image_url, prompt, duration, provider)
        return await self.generate_t2v(prompt, duration, provider)

    async def generate_i2v(
        self,
        image_path: str,
        prompt: str,
        duration: int = 5,
        provider: str = "auto",
    ) -> str:
        """Image-to-video. image_path can be a local path or a URL."""
        if provider == "auto":
            provider = self._pick_provider()

        if provider == "kling_video":
            return await self._kling_i2v(image_path, prompt, duration)
        elif provider == "vidu":
            return await self._vidu_i2v(image_path, prompt, duration)
        elif provider == "runway":
            return await self._runway_i2v(image_path, prompt, duration)
        elif provider == "fal":
            return await self._fal_i2v(image_path, prompt, duration)
        elif provider == "pika":
            return await self._pika_i2v(image_path, prompt, duration)
        elif provider == "jimeng_video":
            return await self._jimeng_i2v(image_path, prompt, duration)
        else:
            raise ValueError(f"Unknown video provider: {provider}")

    async def generate_t2v(
        self,
        prompt: str,
        duration: int = 5,
        provider: str = "auto",
    ) -> str:
        if provider == "auto":
            provider = self._pick_provider()

        if provider == "kling_video":
            return await self._kling_t2v(prompt, duration)
        elif provider == "pika":
            return await self._pika_t2v(prompt, duration)
        else:
            raise ValueError(f"Provider {provider} t2v not supported yet")

    def _pick_provider(self) -> str:
        for p in ("kling_video", "vidu", "runway", "fal", "pika", "jimeng_video"):
            cfg = _get_config(p)
            if cfg.get("api_key"):
                return p
        return "kling_video"

    def _img_to_b64(self, image_path: str) -> str:
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode()

    async def _kling_i2v(self, image_path: str, prompt: str, duration: int) -> str:
        cfg = _get_config("kling_video")
        api_key = cfg.get("api_key", "")
        api_secret = cfg.get("api_secret", "")
        token = _kling_jwt(api_key, api_secret)

        img_b64 = self._img_to_b64(image_path)
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.klingai.com/v1/videos/image2video",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "model_name": "kling-v1",
                    "image": img_b64,
                    "prompt": prompt,
                    "duration": str(duration),
                    "cfg_scale": 0.5,
                    "mode": "std",
                },
            )
            r.raise_for_status()
            task_id = r.json()["data"]["task_id"]

        # Poll for result
        for _ in range(120):
            await asyncio.sleep(5)
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.get(
                    f"https://api.klingai.com/v1/videos/image2video/{task_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                data = r.json()["data"]
                status = data.get("task_status")
                if status == "succeed":
                    return data["task_result"]["videos"][0]["url"]
                elif status == "failed":
                    raise RuntimeError(f"Kling generation failed: {data.get('task_status_msg')}")
        raise TimeoutError("Kling video generation timed out")

    async def _kling_t2v(self, prompt: str, duration: int) -> str:
        cfg = _get_config("kling_video")
        api_key = cfg.get("api_key", "")
        api_secret = cfg.get("api_secret", "")
        token = _kling_jwt(api_key, api_secret)

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.klingai.com/v1/videos/text2video",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "model_name": "kling-v1",
                    "prompt": prompt,
                    "duration": str(duration),
                    "cfg_scale": 0.5,
                    "mode": "std",
                },
            )
            r.raise_for_status()
            task_id = r.json()["data"]["task_id"]

        for _ in range(120):
            await asyncio.sleep(5)
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.get(
                    f"https://api.klingai.com/v1/videos/text2video/{task_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                data = r.json()["data"]
                if data.get("task_status") == "succeed":
                    return data["task_result"]["videos"][0]["url"]
                elif data.get("task_status") == "failed":
                    raise RuntimeError("Kling t2v failed")
        raise TimeoutError("Kling t2v timed out")

    async def _vidu_i2v(self, image_path: str, prompt: str, duration: int) -> str:
        cfg = _get_config("vidu")
        api_key = cfg.get("api_key", "")
        img_b64 = self._img_to_b64(image_path)

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.vidu.cn/ent/v2/img2video",
                headers={"Authorization": f"Token {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "vidu-q1",
                    "images": [{"type": "base64", "data": img_b64}],
                    "prompt": prompt,
                    "duration": duration,
                    "resolution": "1080p",
                    "movement_amplitude": "auto",
                },
            )
            r.raise_for_status()
            task_id = r.json()["id"]

        for _ in range(120):
            await asyncio.sleep(5)
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.get(
                    f"https://api.vidu.cn/ent/v2/tasks/{task_id}/creations",
                    headers={"Authorization": f"Token {api_key}"},
                )
                data = r.json()
                if data.get("state") == "success":
                    return data["creations"][0]["url"]
                elif data.get("state") in ("failed", "error"):
                    raise RuntimeError(f"Vidu generation failed: {data.get('err_code')}")
        raise TimeoutError("Vidu generation timed out")

    async def _runway_i2v(self, image_path: str, prompt: str, duration: int) -> str:
        cfg = _get_config("runway")
        api_key = cfg.get("api_key", "")
        img_b64 = f"data:image/png;base64,{self._img_to_b64(image_path)}"

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.dev.runwayml.com/v1/image_to_video",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "X-Runway-Version": "2024-11-06",
                },
                json={
                    "model": "gen4_turbo",
                    "promptImage": img_b64,
                    "promptText": prompt,
                    "duration": duration,
                    "ratio": "9:16",
                },
            )
            r.raise_for_status()
            task_id = r.json()["id"]

        for _ in range(120):
            await asyncio.sleep(5)
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.get(
                    f"https://api.dev.runwayml.com/v1/tasks/{task_id}",
                    headers={"Authorization": f"Bearer {api_key}", "X-Runway-Version": "2024-11-06"},
                )
                data = r.json()
                if data.get("status") == "SUCCEEDED":
                    return data["output"][0]
                elif data.get("status") == "FAILED":
                    raise RuntimeError(f"Runway generation failed: {data.get('failure')}")
        raise TimeoutError("Runway generation timed out")


    async def _fal_i2v(self, image_path: str, prompt: str, duration: int) -> str:
        """fal.ai image-to-video via kling-video API."""
        cfg = _get_config("fal")
        api_key = cfg.get("api_key", "")
        img_b64 = f"data:image/png;base64,{self._img_to_b64(image_path)}"

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://fal.run/fal-ai/kling-video/v1.6/pro/image-to-video",
                headers={"Authorization": f"Key {api_key}", "Content-Type": "application/json"},
                json={
                    "prompt": prompt,
                    "image_url": img_b64,
                    "duration": str(duration),
                    "aspect_ratio": "9:16",
                },
            )
            r.raise_for_status()
            data = r.json()
            # fal.ai may return result directly or a request_id for polling
            if "video" in data:
                return data["video"]["url"]
            request_id = data.get("request_id", "")

        if not request_id:
            raise RuntimeError("fal.ai: no request_id returned")

        # Poll status
        for _ in range(120):
            await asyncio.sleep(5)
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.get(
                    f"https://fal.run/fal-ai/kling-video/v1.6/pro/image-to-video/requests/{request_id}",
                    headers={"Authorization": f"Key {api_key}"},
                )
                data = r.json()
                status = data.get("status", "")
                if status == "COMPLETED":
                    return data["output"]["video"]["url"]
                elif status in ("FAILED", "CANCELLED"):
                    raise RuntimeError(f"fal.ai video failed: {data.get('error', 'unknown')}")
        raise TimeoutError("fal.ai video generation timed out")


    async def _jimeng_i2v(self, image_path: str, prompt: str, duration: int) -> str:
        """即梦视频 (Bytedance) image-to-video via VolcEngine API."""
        cfg = _get_config("jimeng_video")
        api_key = cfg.get("api_key", "")
        img_b64 = self._img_to_b64(image_path)

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://visual.volcengineapi.com",
                params={"Action": "CVSubmitTask", "Version": "2022-08-31"},
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "req_key": "img2video_v2",
                    "binary_data_base64": [img_b64],
                    "prompt": prompt,
                    "duration": duration,
                    "ratio": "9_16",
                },
            )
            r.raise_for_status()
            data = r.json()
            task_id = data.get("data", {}).get("task_id", "")
            if not task_id:
                raise RuntimeError(f"Jimeng: no task_id in response: {data}")

        for _ in range(120):
            await asyncio.sleep(5)
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.post(
                    "https://visual.volcengineapi.com",
                    params={"Action": "CVGetResult", "Version": "2022-08-31"},
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"task_id": task_id},
                )
                data = r.json().get("data", {})
                status = data.get("status", 0)
                if status == 3:  # succeeded
                    return data["resp_data"]["video_url"]
                elif status in (4, 5):  # failed or cancelled
                    raise RuntimeError(f"Jimeng generation failed: {data}")
        raise TimeoutError("Jimeng generation timed out")

    async def _pika_t2v(self, prompt: str, duration: int) -> str:
        """Pika Labs text-to-video via their API."""
        cfg = _get_config("pika")
        api_key = cfg.get("api_key", "")

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.pika.art/v1/generate/text2video",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "prompt": prompt,
                    "options": {
                        "duration": min(duration, 5),
                        "aspectRatio": "9:16",
                    },
                },
            )
            r.raise_for_status()
            data = r.json()
            task_id = data.get("id") or data.get("taskId")

        for _ in range(120):
            await asyncio.sleep(5)
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.get(
                    f"https://api.pika.art/v1/tasks/{task_id}",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                data = r.json()
                status = data.get("status", "")
                if status in ("completed", "COMPLETED", "succeeded"):
                    return data.get("videoUrl") or data.get("output", {}).get("url", "")
                elif status in ("failed", "FAILED", "error"):
                    raise RuntimeError(f"Pika generation failed: {data.get('error', 'unknown')}")
        raise TimeoutError("Pika generation timed out")

    async def _pika_i2v(self, image_path: str, prompt: str, duration: int) -> str:
        """Pika Labs image-to-video."""
        cfg = _get_config("pika")
        api_key = cfg.get("api_key", "")
        img_b64 = f"data:image/png;base64,{self._img_to_b64(image_path)}"

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.pika.art/v1/generate/image2video",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "image": img_b64,
                    "prompt": prompt,
                    "options": {
                        "duration": min(duration, 5),
                        "aspectRatio": "9:16",
                    },
                },
            )
            r.raise_for_status()
            data = r.json()
            task_id = data.get("id") or data.get("taskId")

        for _ in range(120):
            await asyncio.sleep(5)
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.get(
                    f"https://api.pika.art/v1/tasks/{task_id}",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                data = r.json()
                status = data.get("status", "")
                if status in ("completed", "COMPLETED", "succeeded"):
                    return data.get("videoUrl") or data.get("output", {}).get("url", "")
                elif status in ("failed", "FAILED", "error"):
                    raise RuntimeError(f"Pika i2v failed: {data.get('error', 'unknown')}")
        raise TimeoutError("Pika i2v generation timed out")


video_gen_service = VideoGenService()
