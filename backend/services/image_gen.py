"""Image generation service - routes to configured provider."""
import httpx
import base64
import json
import hashlib
import hmac
import os
import asyncio
from datetime import datetime, timezone
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


class ImageGenService:
    async def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 768,
        height: int = 1024,
        provider: str = "auto",
        reference_image_path: str | None = None,
    ) -> bytes:
        """Generate an image and return raw bytes."""
        if provider == "auto":
            provider = self._pick_provider()

        if provider == "stability":
            return await self._stability(prompt, negative_prompt, width, height)
        elif provider == "comfyui":
            return await self._comfyui(prompt, negative_prompt, width, height, reference_image_path)
        elif provider == "sdwebui":
            return await self._sdwebui(prompt, negative_prompt, width, height, reference_image_path)
        elif provider == "fal":
            return await self._fal(prompt, width, height)
        elif provider == "kling_image":
            return await self._kling_image(prompt, negative_prompt, width, height)
        elif provider == "jimeng_image":
            return await self._jimeng_image(prompt, negative_prompt, width, height)
        else:
            raise ValueError(f"Unknown image provider: {provider}")

    def _pick_provider(self) -> str:
        for p in ("comfyui", "sdwebui", "stability", "fal", "kling_image", "jimeng_image"):
            cfg = _get_config(p)
            if p in ("comfyui", "sdwebui") and cfg.get("base_url"):
                return p
            elif p in ("kling_image", "jimeng_image") and cfg.get("access_key") and cfg.get("secret_key"):
                return p
            elif p not in ("comfyui", "sdwebui", "kling_image", "jimeng_image") and cfg.get("api_key"):
                return p
        raise RuntimeError(
            '未配置任何图像生成服务。请在[设置]页面配置以下任意一项：'
            '\n• ComfyUI 或 SD WebUI（本地，免费）'
            '\n• fal.ai（Flux，海外云端）'
            '\n• Stability AI（云端）'
            '\n• 可灵图像（国内云端）'
            '\n• 即梦图像（火山引擎，国内云端）'
        )

    async def _stability(self, prompt: str, negative_prompt: str, width: int, height: int) -> bytes:
        cfg = _get_config("stability")
        api_key = cfg.get("api_key", "")
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                "https://api.stability.ai/v2beta/stable-image/generate/core",
                headers={"Authorization": f"Bearer {api_key}", "Accept": "image/*"},
                data={
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "aspect_ratio": f"{width}:{height}",
                    "output_format": "png",
                },
            )
            r.raise_for_status()
            return r.content

    async def _comfyui(self, prompt: str, negative_prompt: str, width: int, height: int, ref_path: str | None) -> bytes:
        cfg = _get_config("comfyui")
        base_url = cfg.get("base_url", "http://localhost:8188").rstrip("/")

        workflow = {
            "3": {
                "class_type": "KSampler",
                "inputs": {
                    "cfg": 7,
                    "denoise": 1,
                    "latent_image": ["5", 0],
                    "model": ["4", 0],
                    "negative": ["7", 0],
                    "positive": ["6", 0],
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "seed": 42,
                    "steps": 20,
                },
            },
            "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "v1-5-pruned-emaonly.ckpt"}},
            "5": {
                "class_type": "EmptyLatentImage",
                "inputs": {"batch_size": 1, "height": height, "width": width},
            },
            "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 1], "text": prompt}},
            "7": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 1], "text": negative_prompt}},
            "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
            "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "dramaforge", "images": ["8", 0]}},
        }

        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(f"{base_url}/prompt", json={"prompt": workflow})
            r.raise_for_status()
            prompt_id = r.json()["prompt_id"]

            # Poll for result
            for _ in range(60):
                await asyncio.sleep(2)
                hist = await client.get(f"{base_url}/history/{prompt_id}")
                data = hist.json()
                if prompt_id in data and data[prompt_id].get("outputs"):
                    outputs = data[prompt_id]["outputs"]
                    for node_id, node_out in outputs.items():
                        if "images" in node_out:
                            img_info = node_out["images"][0]
                            img_r = await client.get(
                                f"{base_url}/view",
                                params={"filename": img_info["filename"], "subfolder": img_info.get("subfolder", ""), "type": img_info.get("type", "output")},
                            )
                            return img_r.content
        raise TimeoutError("ComfyUI generation timed out")

    async def _sdwebui(self, prompt: str, negative_prompt: str, width: int, height: int, ref_path: str | None) -> bytes:
        cfg = _get_config("sdwebui")
        base_url = cfg.get("base_url", "http://localhost:7860").rstrip("/")

        if ref_path and os.path.exists(ref_path):
            # Use img2img with reference
            with open(ref_path, "rb") as f:
                ref_b64 = base64.b64encode(f.read()).decode()
            payload = {
                "init_images": [ref_b64],
                "denoising_strength": 0.65,
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "width": width,
                "height": height,
                "steps": 20,
                "cfg_scale": 7,
                "sampler_name": "Euler a",
            }
            endpoint = "/sdapi/v1/img2img"
        else:
            payload = {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "width": width,
                "height": height,
                "steps": 20,
                "cfg_scale": 7,
                "sampler_name": "Euler a",
            }
            endpoint = "/sdapi/v1/txt2img"

        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(f"{base_url}{endpoint}", json=payload)
            r.raise_for_status()
            data = r.json()
            img_bytes = base64.b64decode(data["images"][0])
            return img_bytes

    async def _fal(self, prompt: str, width: int, height: int) -> bytes:
        cfg = _get_config("fal")
        api_key = cfg.get("api_key", "")
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(
                "https://fal.run/fal-ai/flux/schnell",
                headers={"Authorization": f"Key {api_key}", "Content-Type": "application/json"},
                json={"prompt": prompt, "image_size": {"width": width, "height": height}, "num_images": 1},
            )
            r.raise_for_status()
            data = r.json()
            image_url = data["images"][0]["url"]
            img_r = await client.get(image_url)
            return img_r.content


    async def _kling_image(self, prompt: str, negative_prompt: str, width: int, height: int) -> bytes:
        """Kling image generation via Kuaishou API (官方JWT格式)."""
        import time
        import jwt as _jwt
        cfg = _get_config("kling_image")
        ak = cfg.get("api_key", cfg.get("access_key", ""))
        sk = cfg.get("api_secret", cfg.get("secret_key", ""))

        if not ak or not sk:
            raise ValueError("可灵图像未配置 Access Key 或 Secret Key")

        # 生成JWT Token (官方格式)
        headers = {
            "alg": "HS256",
            "typ": "JWT",
        }
        payload = {
            "iss": ak,                              # Access Key
            "exp": int(time.time()) + 1800,         # 过期时间：30分钟后
            "nbf": int(time.time()) - 5,            # 生效时间：5秒前（必填！）
        }
        token = _jwt.encode(payload, sk, headers=headers)

        async with httpx.AsyncClient(timeout=60) as client:
            # 调用图像生成API (使用北京域名)
            r = await client.post(
                "https://api-beijing.klingai.com/v1/images/generations",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json={
                    "model_name": "kling-v1",
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "image_ratio": "9:16" if height > width else "16:9",
                    "image_count": 1,
                },
            )

            resp_data = r.json() if r.text else {}

            # 优先检查是否有task_id（即使状态码非200，任务可能已创建）
            task_id = resp_data.get("data", {}).get("task_id")

            # 如果没有task_id，才处理错误
            if not task_id:
                if r.status_code == 401:
                    code = resp_data.get("code", "")
                    message = resp_data.get("message", "认证失败")
                    raise RuntimeError(f"可灵图像认证失败(401) [{code}]: {message}")
                if r.status_code == 402:
                    raise RuntimeError("可灵图像余额不足(402)：请充值后继续使用")
                if r.status_code == 400:
                    raise RuntimeError(f"可灵图像请求参数错误(400): {resp_data.get('message', '参数错误')}")
                if r.status_code == 429:
                    raise RuntimeError("可灵图像请求频率限制(429)：请稍后再试")
                if r.status_code != 200:
                    raise RuntimeError(f"可灵图像API错误({r.status_code}): {resp_data.get('message', '未知错误')}")
                if resp_data.get("code") and resp_data["code"] != 0:
                    raise RuntimeError(f"可灵图像API错误: {resp_data.get('message', '未知错误')}")
                raise RuntimeError("可灵图像API未返回task_id")

        # Poll for result (低频率：最多10次，每次10秒，总计100秒)
        for _ in range(10):
            await asyncio.sleep(10)  # 每次等待10秒
            # 每次轮询重新生成token（避免过期）
            new_payload = {
                "iss": ak,
                "exp": int(time.time()) + 1800,
                "nbf": int(time.time()) - 5,
            }
            new_token = _jwt.encode(new_payload, sk, headers=headers)

            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.get(
                    f"https://api-beijing.klingai.com/v1/images/generations/{task_id}",
                    headers={"Authorization": f"Bearer {new_token}"},
                )

                # 处理查询接口的错误状态码
                if r.status_code == 429:
                    continue  # 频率限制，继续等待下次轮询
                if r.status_code != 200:
                    continue  # 其他错误也继续轮询

                resp_data = r.json()
                data = resp_data.get("data", {})
                status = data.get("task_status", "")

                if status == "succeed":
                    images = data.get("task_result", {}).get("images", [])
                    if images:
                        img_url = images[0].get("url")
                        if img_url:
                            async with httpx.AsyncClient(timeout=60) as dl:
                                img_r = await dl.get(img_url)
                                return img_r.content
                elif status == "failed":
                    raise RuntimeError(f"可灵图像生成失败: {data.get('task_status_msg', '未知原因')}")

        raise TimeoutError("可灵图像生成超时(100秒)")

    async def _jimeng_image(self, prompt: str, negative_prompt: str, width: int, height: int) -> bytes:
        """即梦图像 (VolcEngine) text-to-image generation using CVProcess API."""
        import hashlib
        import hmac
        from datetime import datetime, timezone
        cfg = _get_config("jimeng_image")
        access_key = cfg.get("access_key", "")
        secret_key = cfg.get("secret_key", "")

        if not access_key or not secret_key:
            raise ValueError("即梦图像未配置 Access Key 或 Secret Key")

        # Clamp width/height to valid range [256, 768]
        width = max(256, min(768, width))
        height = max(256, min(768, height))

        # VolcEngine authentication (AWS Signature v4 style)
        now = datetime.now(timezone.utc)
        x_date = now.strftime("%Y%m%dT%H%M%SZ")
        short_date = now.strftime("%Y%m%d")

        # Build request body per official docs
        body = {
            "req_key": "jimeng_high_aes_general_v21_L",
            "prompt": prompt,
            "width": width,
            "height": height,
            "use_sr": True,
            "return_url": True,
        }
        body_str = json.dumps(body)
        body_hash = hashlib.sha256(body_str.encode()).hexdigest()

        # Build canonical request
        method = "POST"
        path = "/"
        query = "Action=CVProcess&Version=2022-08-31"
        signed_headers = "content-type;x-content-sha256;x-date"
        canonical_headers = f"content-type:application/json\nx-content-sha256:{body_hash}\nx-date:{x_date}\n"
        canonical_request = f"{method}\n{path}\n{query}\n{canonical_headers}\n{signed_headers}\n{body_hash}"

        # Build string to sign
        algorithm = "HMAC-SHA256"
        credential_scope = f"{short_date}/cn-north-1/cv/request"
        string_to_sign = f"{algorithm}\n{x_date}\n{credential_scope}\n{hashlib.sha256(canonical_request.encode()).hexdigest()}"

        # Calculate signature
        k_date = hmac.new(secret_key.encode(), short_date.encode(), hashlib.sha256).digest()
        k_region = hmac.new(k_date, "cn-north-1".encode(), hashlib.sha256).digest()
        k_service = hmac.new(k_region, "cv".encode(), hashlib.sha256).digest()
        k_signing = hmac.new(k_service, "request".encode(), hashlib.sha256).digest()
        signature = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()

        authorization = f"{algorithm} Credential={access_key}/{credential_scope}, SignedHeaders={signed_headers}, Signature={signature}"

        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(
                "https://visual.volcengineapi.com",
                params={"Action": "CVProcess", "Version": "2022-08-31"},
                headers={
                    "Authorization": authorization,
                    "Content-Type": "application/json",
                    "X-Date": x_date,
                    "X-Content-Sha256": body_hash,
                },
                content=body_str,
            )
            resp = r.json()

            # Check for errors
            if r.status_code != 200 or resp.get("status") != 10000:
                error_msg = resp.get("message", resp.get("ResponseMetadata", {}).get("Error", {}).get("Message", str(resp)))
                raise RuntimeError(f"即梦图像生成API错误: {error_msg}")

            # Extract image URL from response (synchronous, no polling)
            data = resp.get("data", {})
            image_urls = data.get("image_urls", [])
            if image_urls:
                img_url = image_urls[0]
                async with httpx.AsyncClient(timeout=60) as dl:
                    img_r = await dl.get(img_url)
                    return img_r.content

            # Or base64 data
            binary_data = data.get("binary_data_base64", [])
            if binary_data:
                return base64.b64decode(binary_data[0])

            raise RuntimeError(f"即梦图像生成失败: 响应中没有图片数据")


image_gen_service = ImageGenService()
