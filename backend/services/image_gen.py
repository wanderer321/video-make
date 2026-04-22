"""Image generation service - routes to configured provider."""
import httpx
import base64
import os
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
        else:
            raise ValueError(f"Unknown image provider: {provider}")

    def _pick_provider(self) -> str:
        for p in ("comfyui", "sdwebui", "stability", "fal", "kling_image"):
            cfg = _get_config(p)
            if p in ("comfyui", "sdwebui") and cfg.get("base_url"):
                return p
            elif p not in ("comfyui", "sdwebui") and cfg.get("api_key"):
                return p
        raise RuntimeError(
            '未配置任何图像生成服务。请在[设置]页面配置以下任意一项：'
            '\n• ComfyUI 或 SD WebUI（本地，免费）'
            '\n• fal.ai（Flux，海外云端）'
            '\n• Stability AI（云端）'
            '\n• 可灵图像（国内云端）'
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
        """Kling image generation via Kuaishou API."""
        import time
        import jwt as _jwt
        cfg = _get_config("kling_image")
        api_key = cfg.get("api_key", "")
        api_secret = cfg.get("api_secret", "")

        payload = {"iss": api_key, "exp": int(time.time()) + 1800, "nbf": int(time.time()) - 5}
        token = _jwt.encode(payload, api_secret, algorithm="HS256")

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.klingai.com/v1/images/generations",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "model_name": "kling-v1",
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "image_ratio": "9:16" if height > width else "16:9",
                    "image_count": 1,
                },
            )
            r.raise_for_status()
            task_id = r.json()["data"]["task_id"]

        # Poll for result
        for _ in range(60):
            await asyncio.sleep(3)
            async with httpx.AsyncClient(timeout=20) as client:
                r = await client.get(
                    f"https://api.klingai.com/v1/images/generations/{task_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                data = r.json()["data"]
                status = data.get("task_status")
                if status == "succeed":
                    img_url = data["task_result"]["images"][0]["url"]
                    async with httpx.AsyncClient(timeout=60) as dl:
                        img_r = await dl.get(img_url)
                        return img_r.content
                elif status == "failed":
                    raise RuntimeError(f"Kling image failed: {data.get('task_status_msg')}")
        raise TimeoutError("Kling image generation timed out")


image_gen_service = ImageGenService()
