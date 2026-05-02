"""Video generation service - image-to-video, text-to-video."""
import httpx
import os
import base64
import asyncio
import time
import logging
import jwt  # PyJWT for Kling auth
from db.database import get_db
from db.models import ApiConfig
from services.crypto import decrypt

logger = logging.getLogger(__name__)


def _get_config(provider: str) -> dict:
    db = next(get_db())
    try:
        row = db.query(ApiConfig).filter(ApiConfig.provider == provider).first()
        if not row or not row.encrypted_data:
            return {}
        return decrypt(row.encrypted_data)
    finally:
        db.close()


def _kling_jwt(ak: str, sk: str) -> str:
    """Generate JWT token for Kling API authentication (官方格式)."""
    headers = {
        "alg": "HS256",
        "typ": "JWT",
    }
    payload = {
        "iss": ak,                              # Access Key
        "exp": int(time.time()) + 1800,         # 过期时间：30分钟后
        "nbf": int(time.time()) - 5,            # 生效时间：5秒前（必填！）
    }
    return jwt.encode(payload, sk, headers=headers)


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

    async def generate_multi_i2v(
        self,
        images: list,
        prompt: str,
        duration: int = 5,
        provider: str = "auto",
    ) -> str:
        """Multi-image-to-video. Uses provider's built-in multi-image feature."""
        if provider == "auto":
            provider = self._pick_provider()

        if provider == "kling_video":
            return await self._kling_multi_i2v(images, prompt, duration)
        elif provider in ("jimeng_video_v30", "jimeng_seedance"):
            return await self._jimeng_multi_i2v(images, prompt, duration, provider)
        else:
            # Fallback: generate video from first image only
            if images:
                return await self.generate_i2v(images[0], prompt, duration, provider)
            raise ValueError("No images provided for multi_i2v")

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
        elif provider in ("jimeng_video_v30", "jimeng_seedance"):
            return await self._jimeng_i2v(image_path, prompt, duration, provider)
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
        for p in ("kling_video", "vidu", "runway", "fal", "pika", "jimeng_video_v30", "jimeng_seedance"):
            cfg = _get_config(p)
            if p == "jimeng_video_v30" and cfg.get("access_key") and cfg.get("secret_key"):
                return p
            elif p == "jimeng_seedance" and cfg.get("api_key"):
                return p
            elif cfg.get("api_key"):
                return p
        return "kling_video"

    def _img_to_b64(self, image_path: str) -> str:
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode()

    async def _kling_multi_i2v(self, images: list, prompt: str, duration: int) -> str:
        """Kling multi-image-to-video (首尾帧模式 - 用两张图控制起始和结束画面)."""
        cfg = _get_config("kling_video")
        api_key = cfg.get("api_key", "")
        api_secret = cfg.get("api_secret", "")
        token = _kling_jwt(api_key, api_secret)

        # Kling supports 2 images (首尾帧)
        if len(images) < 2:
            # Fallback to single image
            return await self._kling_i2v(images[0], prompt, duration)

        img1_b64 = self._img_to_b64(images[0])
        img2_b64 = self._img_to_b64(images[-1])

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api-beijing.klingai.com/v1/videos/image2video",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "model_name": "kling-v1",
                    "image": img1_b64,
                    "tail_image": img2_b64,  # 首尾帧模式
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
                    f"https://api-beijing.klingai.com/v1/videos/image2video/{task_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                data = r.json()["data"]
                status = data.get("task_status")
                if status == "succeed":
                    return data["task_result"]["videos"][0]["url"]
                elif status == "failed":
                    raise RuntimeError(f"Kling multi-i2v failed: {data.get('task_status_msg')}")
        raise TimeoutError("Kling multi-i2v timed out")

    async def _jimeng_multi_i2v(self, images: list, prompt: str, duration: int, provider: str = "jimeng_video_v30") -> str:
        """即梦视频 multi-image-to-video."""
        import hashlib
        import hmac
        import json
        from datetime import datetime, timezone
        cfg = _get_config(provider)

        # jimeng_video_v30 uses HMAC-SHA256 auth (access_key + secret_key)
        # jimeng_seedance uses simple api_key auth
        if provider == "jimeng_seedance":
            api_key = cfg.get("api_key", "")
            if not api_key:
                raise ValueError("即梦 Seedance 未配置 API Key")
            # Use the single i2v for seedance (multi-i2v not supported)
            if images:
                return await self._jimeng_seedance_i2v(images[0], prompt, duration, api_key)
            raise ValueError("No images for Seedance")

        access_key = cfg.get("access_key", "")
        secret_key = cfg.get("secret_key", "")

        if not access_key or not secret_key:
            raise ValueError(f"{provider} 未配置 Access Key 或 Secret Key")

        # Convert all images to base64
        img_b64_list = [self._img_to_b64(img) for img in images]
        req_key = "jimeng_ti2v_v30_pro"

        # frames = 24fps × duration（秒）
        frames = int(24 * duration)

        # Build VolcEngine HMAC-SHA256 authentication
        now = datetime.now(timezone.utc)
        x_date = now.strftime("%Y%m%dT%H%M%SZ")
        short_date = now.strftime("%Y%m%d")

        body = {
            "req_key": req_key,
            "binary_data_base64": img_b64_list,  # 多图数组
            "prompt": prompt,
            "seed": -1,
            "frames": frames,
            "aspect_ratio": "16:9",
        }
        body_str = json.dumps(body)
        body_hash = hashlib.sha256(body_str.encode()).hexdigest()

        signed_headers = "content-type;x-content-sha256;x-date"
        canonical_headers = f"content-type:application/json\nx-content-sha256:{body_hash}\nx-date:{x_date}\n"
        query = "Action=CVSync2AsyncSubmitTask&Version=2022-08-31"
        canonical_request = f"POST\n/\n{query}\n{canonical_headers}\n{signed_headers}\n{body_hash}"

        credential_scope = f"{short_date}/cn-north-1/cv/request"
        string_to_sign = f"HMAC-SHA256\n{x_date}\n{credential_scope}\n{hashlib.sha256(canonical_request.encode()).hexdigest()}"

        k_date = hmac.new(secret_key.encode(), short_date.encode(), hashlib.sha256).digest()
        k_region = hmac.new(k_date, "cn-north-1".encode(), hashlib.sha256).digest()
        k_service = hmac.new(k_region, "cv".encode(), hashlib.sha256).digest()
        k_signing = hmac.new(k_service, "request".encode(), hashlib.sha256).digest()
        signature = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()

        authorization = f"HMAC-SHA256 Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}"

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://visual.volcengineapi.com",
                params={"Action": "CVSync2AsyncSubmitTask", "Version": "2022-08-31"},
                headers={
                    "Authorization": authorization,
                    "Content-Type": "application/json",
                    "X-Date": x_date,
                    "X-Content-Sha256": body_hash,
                    "Region": "cn-north-1",
                    "Service": "cv",
                },
                content=body_str,
            )
            logger.info("即梦多图API响应: status=%s, body=%s", r.status_code, r.text[:500] if r.text else "")
            r.raise_for_status()
            data = r.json()
            task_id = data.get("data", {}).get("task_id", "")
            if not task_id:
                # Print full error for debugging
                logger.error("即梦多图视频API返回错误: %s", data)
                raise RuntimeError(f"即梦多图视频生成失败: {data.get('message', data)}")

        # Poll for result with fresh authentication each time
        for _ in range(120):
            await asyncio.sleep(5)
            now_poll = datetime.now(timezone.utc)
            x_date_poll = now_poll.strftime("%Y%m%dT%H%M%SZ")
            short_date_poll = now_poll.strftime("%Y%m%d")

            # 查询请求需要包含 req_key 和 task_id
            result_body = json.dumps({
                "req_key": req_key,
                "task_id": task_id,
            })
            result_body_hash = hashlib.sha256(result_body.encode()).hexdigest()

            result_query = "Action=CVSync2AsyncGetResult&Version=2022-08-31"
            result_canonical_headers = f"content-type:application/json\nx-content-sha256:{result_body_hash}\nx-date:{x_date_poll}\n"
            result_canonical = f"POST\n/\n{result_query}\n{result_canonical_headers}\n{signed_headers}\n{result_body_hash}"

            result_cred_scope = f"{short_date_poll}/cn-north-1/cv/request"
            result_string_to_sign = f"HMAC-SHA256\n{x_date_poll}\n{result_cred_scope}\n{hashlib.sha256(result_canonical.encode()).hexdigest()}"

            k_date_poll = hmac.new(secret_key.encode(), short_date_poll.encode(), hashlib.sha256).digest()
            k_region_poll = hmac.new(k_date_poll, "cn-north-1".encode(), hashlib.sha256).digest()
            k_service_poll = hmac.new(k_region_poll, "cv".encode(), hashlib.sha256).digest()
            k_signing_poll = hmac.new(k_service_poll, "request".encode(), hashlib.sha256).digest()
            sig_poll = hmac.new(k_signing_poll, result_string_to_sign.encode(), hashlib.sha256).hexdigest()

            auth_poll = f"HMAC-SHA256 Credential={access_key}/{result_cred_scope}, SignedHeaders={signed_headers}, Signature={sig_poll}"

            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.post(
                    "https://visual.volcengineapi.com",
                    params={"Action": "CVSync2AsyncGetResult", "Version": "2022-08-31"},
                    headers={
                        "Authorization": auth_poll,
                        "Content-Type": "application/json",
                        "X-Date": x_date_poll,
                        "X-Content-Sha256": result_body_hash,
                        "Region": "cn-north-1",
                        "Service": "cv",
                    },
                    content=result_body,
                )
                resp = r.json()
                # 先检查 code，code=10000 才是成功
                if resp.get("code") != 10000:
                    logger.warning("即梦多图查询返回错误: %s", resp)
                    continue
                data = resp.get("data", {})
                status = data.get("status", "")
                if status == "done":  # 成功完成
                    # Volcengine CV API URL possible in multiple fields
                    video_url = data.get("video_url") or data.get("url", "")
                    if not video_url and data.get("results"):
                        results = data["results"]
                        if isinstance(results, list) and len(results) > 0:
                            video_url = results[0].get("url") or results[0].get("video_url", "")
                    if video_url:
                        return video_url
                    else:
                        logger.error("Jimeng video done but no URL found: %s", data)
                        raise RuntimeError("Jimeng video done but no URL found")
                elif status in ("failed", "cancelled"):  # 失败
                    raise RuntimeError(f"即梦多图视频生成失败: {data}")
        raise TimeoutError("即梦多图视频生成超时")

    async def _kling_i2v(self, image_path: str, prompt: str, duration: int) -> str:
        cfg = _get_config("kling_video")
        api_key = cfg.get("api_key", "")
        api_secret = cfg.get("api_secret", "")
        token = _kling_jwt(api_key, api_secret)

        img_b64 = self._img_to_b64(image_path)
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api-beijing.klingai.com/v1/videos/image2video",
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
                    f"https://api-beijing.klingai.com/v1/videos/image2video/{task_id}",
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
                "https://api-beijing.klingai.com/v1/videos/text2video",
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
                    f"https://api-beijing.klingai.com/v1/videos/text2video/{task_id}",
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


    async def _jimeng_i2v(self, image_path: str, prompt: str, duration: int, provider: str = "jimeng_video_v30") -> str:
        """即梦视频 (VolcEngine) image-to-video with proper HMAC-SHA256 authentication."""
        import hashlib
        import hmac
        import json
        from datetime import datetime, timezone

        cfg = _get_config(provider)

        # jimeng_video_v30 uses HMAC-SHA256 auth (access_key + secret_key)
        # jimeng_seedance uses simple api_key auth
        if provider == "jimeng_seedance":
            api_key = cfg.get("api_key", "")
            if not api_key:
                raise ValueError("即梦 Seedance 未配置 API Key")
            return await self._jimeng_seedance_i2v(image_path, prompt, duration, api_key)

        # jimeng_video_v30 - HMAC-SHA256 auth
        access_key = cfg.get("access_key", "")
        secret_key = cfg.get("secret_key", "")

        if not access_key or not secret_key:
            raise ValueError(f"{provider} 未配置 Access Key 或 Secret Key")

        img_b64 = self._img_to_b64(image_path)
        req_key = "jimeng_ti2v_v30_pro"  # 即梦视频生成3.0 Pro

        # frames = 24fps × duration（秒）
        frames = int(24 * duration)

        # Build VolcEngine HMAC-SHA256 authentication
        now = datetime.now(timezone.utc)
        x_date = now.strftime("%Y%m%dT%H%M%SZ")
        short_date = now.strftime("%Y%m%d")

        body = {
            "req_key": req_key,
            "binary_data_base64": [img_b64],
            "prompt": prompt,
            "seed": -1,
            "frames": frames,
            "aspect_ratio": "16:9",
        }
        body_str = json.dumps(body)
        body_hash = hashlib.sha256(body_str.encode()).hexdigest()

        signed_headers = "content-type;x-content-sha256;x-date"
        canonical_headers = f"content-type:application/json\nx-content-sha256:{body_hash}\nx-date:{x_date}\n"
        query = "Action=CVSync2AsyncSubmitTask&Version=2022-08-31"
        canonical_request = f"POST\n/\n{query}\n{canonical_headers}\n{signed_headers}\n{body_hash}"

        credential_scope = f"{short_date}/cn-north-1/cv/request"
        string_to_sign = f"HMAC-SHA256\n{x_date}\n{credential_scope}\n{hashlib.sha256(canonical_request.encode()).hexdigest()}"

        k_date = hmac.new(secret_key.encode(), short_date.encode(), hashlib.sha256).digest()
        k_region = hmac.new(k_date, "cn-north-1".encode(), hashlib.sha256).digest()
        k_service = hmac.new(k_region, "cv".encode(), hashlib.sha256).digest()
        k_signing = hmac.new(k_service, "request".encode(), hashlib.sha256).digest()
        signature = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()

        authorization = f"HMAC-SHA256 Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}"

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://visual.volcengineapi.com",
                params={"Action": "CVSync2AsyncSubmitTask", "Version": "2022-08-31"},
                headers={
                    "Authorization": authorization,
                    "Content-Type": "application/json",
                    "X-Date": x_date,
                    "X-Content-Sha256": body_hash,
                    "Region": "cn-north-1",
                    "Service": "cv",
                },
                content=body_str,
            )
            # Log full response for debugging
            logger.info("即梦API响应: status=%s, body=%s", r.status_code, r.text[:500] if r.text else "")
            r.raise_for_status()
            data = r.json()
            task_id = data.get("data", {}).get("task_id", "")
            if not task_id:
                # Print full error for debugging
                logger.error("即梦视频API返回错误: %s", data)
                raise RuntimeError(f"即梦视频生成失败: {data.get('message', data)}")

        # Poll for result with fresh authentication each time
        for _ in range(120):
            await asyncio.sleep(5)
            now_poll = datetime.now(timezone.utc)
            x_date_poll = now_poll.strftime("%Y%m%dT%H%M%SZ")
            short_date_poll = now_poll.strftime("%Y%m%d")

            # 查询请求需要包含 req_key 和 task_id
            result_body = json.dumps({
                "req_key": req_key,
                "task_id": task_id,
            })
            result_body_hash = hashlib.sha256(result_body.encode()).hexdigest()

            result_query = "Action=CVSync2AsyncGetResult&Version=2022-08-31"
            result_canonical_headers = f"content-type:application/json\nx-content-sha256:{result_body_hash}\nx-date:{x_date_poll}\n"
            result_canonical = f"POST\n/\n{result_query}\n{result_canonical_headers}\n{signed_headers}\n{result_body_hash}"

            result_cred_scope = f"{short_date_poll}/cn-north-1/cv/request"
            result_string_to_sign = f"HMAC-SHA256\n{x_date_poll}\n{result_cred_scope}\n{hashlib.sha256(result_canonical.encode()).hexdigest()}"

            k_date_poll = hmac.new(secret_key.encode(), short_date_poll.encode(), hashlib.sha256).digest()
            k_region_poll = hmac.new(k_date_poll, "cn-north-1".encode(), hashlib.sha256).digest()
            k_service_poll = hmac.new(k_region_poll, "cv".encode(), hashlib.sha256).digest()
            k_signing_poll = hmac.new(k_service_poll, "request".encode(), hashlib.sha256).digest()
            sig_poll = hmac.new(k_signing_poll, result_string_to_sign.encode(), hashlib.sha256).hexdigest()

            auth_poll = f"HMAC-SHA256 Credential={access_key}/{result_cred_scope}, SignedHeaders={signed_headers}, Signature={sig_poll}"

            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.post(
                    "https://visual.volcengineapi.com",
                    params={"Action": "CVSync2AsyncGetResult", "Version": "2022-08-31"},
                    headers={
                        "Authorization": auth_poll,
                        "Content-Type": "application/json",
                        "X-Date": x_date_poll,
                        "X-Content-Sha256": result_body_hash,
                        "Region": "cn-north-1",
                        "Service": "cv",
                    },
                    content=result_body,
                )
                resp = r.json()
                # 先检查 code，code=10000 才是成功
                if resp.get("code") != 10000:
                    logger.warning("即梦查询返回错误: %s", resp)
                    continue
                data = resp.get("data", {})
                status = data.get("status", "")
                if status == "done":  # 成功完成
                    # Volcengine CV API URL possible in multiple fields
                    video_url = data.get("video_url") or data.get("url", "")
                    if not video_url and data.get("results"):
                        results = data["results"]
                        if isinstance(results, list) and len(results) > 0:
                            video_url = results[0].get("url") or results[0].get("video_url", "")
                    if video_url:
                        return video_url
                    else:
                        logger.error("Jimeng video done but no URL found: %s", data)
                        raise RuntimeError("Jimeng video done but no URL found")
                elif status in ("failed", "cancelled"):  # 失败
                    raise RuntimeError(f"即梦视频生成失败: {data}")
        raise TimeoutError("即梦视频生成超时")

    async def _jimeng_seedance_i2v(self, image_path: str, prompt: str, duration: int, api_key: str) -> str:
        """即梦 Seedance 2.0 - 火山方舟平台API."""
        import json
        img_b64 = self._img_to_b64(image_path)

        # 火山方舟API格式
        body = {
            "model": "seedance-01-ai2v-720p",  # Seedance模型
            "prompt": prompt,
            "image": img_b64,  # 单个图片，不是数组
        }

        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                "https://ark.cn-beijing.volces.com/api/v3/videos/generations",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
            logger.info("Seedance方舟API响应: status=%s, body=%s", r.status_code, r.text[:500] if r.text else "")
            r.raise_for_status()
            data = r.json()
            task_id = data.get("id", "")
            if not task_id:
                logger.error("Seedance API返回错误: %s", data)
                raise RuntimeError(f"Seedance生成失败: {data.get('error', data)}")

        # Poll for result - 火山方舟查询接口
        for _ in range(120):
            await asyncio.sleep(5)
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.get(
                    f"https://ark.cn-beijing.volces.com/api/v3/videos/generations/{task_id}",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                )
                resp = r.json()
                logger.info("Seedance查询响应: %s", resp)
                status = resp.get("status", "")
                if status == "done":  # 成功完成
                    video_url = resp.get("video_url")
                    if video_url:
                        return video_url
                elif status == "failed":  # 失败
                    raise RuntimeError(f"Seedance生成失败: {resp.get('error', resp)}")
        raise TimeoutError("Seedance视频生成超时")

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
