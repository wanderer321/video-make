"""Script module: import novels/text, AI breakdown, storyboard script generation."""
import uuid
import json
import io
import re
import zipfile
from typing import Optional
from xml.etree import ElementTree as ET
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.models import Episode, Project
from db.database import get_db
from api.deps import get_session
from services.llm import llm_service


def _extract_docx(content: bytes) -> str:
    """Extract plain text from .docx (Office Open XML) without external libs."""
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            with z.open("word/document.xml") as f:
                tree = ET.parse(f)
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        paragraphs = []
        for para in tree.findall(".//w:p", ns):
            text = "".join(r.text or "" for r in para.findall(".//w:t", ns))
            if text.strip():
                paragraphs.append(text)
        return "\n".join(paragraphs)
    except Exception as e:
        raise ValueError(f"无法解析 .docx 文件: {e}")

router = APIRouter()


class ScriptBreakdownRequest(BaseModel):
    episode_id: str
    raw_text: str
    total_episodes: int = 1
    style: Optional[str] = None


class ScriptGenerateRequest(BaseModel):
    topic: str
    style: Optional[str] = "都市"
    total_episodes: int = 12
    episodes_per_request: int = 1


class CharacterRef(BaseModel):
    name: str
    prompt: Optional[str] = None
    description: Optional[str] = None


class SceneRef(BaseModel):
    name: str
    prompt: Optional[str] = None
    description: Optional[str] = None


class StoryboardScriptRequest(BaseModel):
    episode_id: str
    episode_outline: str  # the episode summary/outline
    shots_per_episode: int = 30
    style: Optional[str] = None
    characters: Optional[list[CharacterRef]] = None  # character reference data from assets
    scenes: Optional[list[SceneRef]] = None  # scene/location reference data from assets


@router.post("/upload-text")
async def upload_text(file: UploadFile = File(...), episode_id: Optional[str] = None, db: Session = Depends(get_session)):
    content = await file.read()
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

    if ext == "docx":
        try:
            text = _extract_docx(content)
        except ValueError as e:
            raise HTTPException(400, str(e))
    elif ext == "pdf":
        # Try pdfplumber if installed, else fall back to raw extraction
        try:
            import pdfplumber  # type: ignore
            import io as _io
            with pdfplumber.open(_io.BytesIO(content)) as pdf:
                text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        except ImportError:
            raise HTTPException(400, "PDF 解析需要 pdfplumber 包，请运行: pip install pdfplumber")
        except Exception as e:
            raise HTTPException(400, f"PDF 解析失败: {e}")
    else:
        for enc in ("utf-8", "gbk", "gb2312", "utf-16"):
            try:
                text = content.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        else:
            text = content.decode("utf-8", errors="replace")

    return {"episode_id": episode_id, "char_count": len(text), "preview": text[:500], "text": text}


@router.post("/breakdown")
async def breakdown_script(body: ScriptBreakdownRequest, db: Session = Depends(get_session)):
    """Use LLM to break down raw text into episode outlines and character list."""
    # episode_id validation is optional — breakdown is a pure LLM task
    if body.episode_id and body.episode_id != "placeholder":
        ep = db.query(Episode).filter(Episode.id == body.episode_id).first()
        if not ep:
            raise HTTPException(404, "Episode not found")

    prompt = f"""你是专业的漫剧编剧顾问，服务于 AI 短剧制作平台。请分析以下小说/剧本文本并完成拆解任务。

【原文（前4000字）】
{body.raw_text[:4000]}

【任务】
1. 提取角色列表：每个角色需包含姓名、性别、身份、外貌特征（供 AI 生图参考）、性格
2. 提取世界观设定（时代、主要地点、背景设定）
3. 生成 {body.total_episodes} 集分集梗概（每集 150-250 字，明确主要冲突、转折点和结尾钩子，要有强烈的追剧欲望）
4. 提取核心道具（服装、标志性物品）和重要场景（用于资产库）
5. 提炼全剧核心矛盾和主题

风格偏好：{body.style or "通用"}

请以纯JSON格式返回（不要任何额外说明或代码块标记），结构如下：
{{
  "title_suggestion": "建议剧名",
  "core_conflict": "核心矛盾一句话总结",
  "characters": [
    {{
      "name": "角色名",
      "gender": "男/女",
      "role": "主角/女主/反派/配角",
      "appearance": "外貌描述（含发型、服装风格、气质，供AI生图用）",
      "personality": "性格特点",
      "character_prompt": "English SD prompt for this character's appearance"
    }}
  ],
  "worldview": {{
    "era": "时代背景",
    "location": "主要地点",
    "setting": "世界观概述"
  }},
  "episodes": [
    {{
      "episode_no": 1,
      "title": "集名",
      "summary": "剧情梗概（含冲突和转折）",
      "hook": "结尾钩子（让观众必须追下一集的悬念）",
      "highlight": "本集爽点"
    }}
  ],
  "key_props": ["道具1", "道具2"],
  "key_scenes": ["场景1（附描述）", "场景2（附描述）"]
}}"""

    result = await llm_service.complete(prompt)
    try:
        parsed = json.loads(result)
    except json.JSONDecodeError:
        # Try to extract JSON from the response
        import re
        match = re.search(r'\{.*\}', result, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group())
            except Exception:
                parsed = {"raw": result}
        else:
            parsed = {"raw": result}

    return {"episode_id": body.episode_id, "breakdown": parsed}


@router.post("/generate-from-idea")
async def generate_from_idea(body: ScriptGenerateRequest):
    """Generate a full script outline from a one-line idea."""
    prompt = f"""你是顶级的爆款短剧编剧，深度了解抖音/快手短剧受众喜好。请根据以下题材生成完整剧本框架。

题材：{body.topic}
风格：{body.style}
总集数：{body.total_episodes}集

创作原则：
- 第一集必须在30秒内抓住观众（开篇冲突/反转）
- 每集结尾必须有强力钩子（悬念/爽点/反转）
- 角色要有鲜明对比（强弱、贫富、善恶）
- 爽点密度高，每3集一个大爽点

以纯JSON格式返回（不要额外说明）：
{{
  "titles": ["剧名1（3字以内强记忆）", "剧名2", "剧名3"],
  "tagline": "一句话宣传语",
  "core_conflict": "核心矛盾",
  "theme": "主题",
  "characters": [
    {{
      "name": "角色名",
      "gender": "男/女",
      "role": "主角/女主/反派/配角",
      "appearance": "外貌描述（供AI生图参考）",
      "personality": "性格",
      "character_prompt": "English SD/Flux image prompt for this character"
    }}
  ],
  "episodes": [
    {{
      "episode_no": 1,
      "title": "集名",
      "summary": "剧情梗概（含冲突和转折，150字以上）",
      "hook": "结尾钩子（让人必须看下一集）",
      "highlight": "本集最大爽点"
    }}
  ],
  "key_scenes": ["场景1", "场景2"],
  "key_props": ["道具1", "道具2"]
}}"""

    result = await llm_service.complete(prompt)
    try:
        parsed = json.loads(result)
    except Exception:
        import re
        match = re.search(r'\{.*\}', result, re.DOTALL)
        parsed = json.loads(match.group()) if match else {"raw": result}

    return {"script": parsed}


@router.post("/breakdown-stream")
async def breakdown_script_stream(body: ScriptBreakdownRequest):
    """Stream script breakdown via Server-Sent Events."""
    prompt = f"""你是专业的漫剧编剧顾问，服务于 AI 短剧制作平台。请分析以下小说/剧本文本并完成拆解任务。

【原文（前4000字）】
{body.raw_text[:4000]}

【任务】
1. 提取角色列表：每个角色需包含姓名、性别、身份、外貌特征（供 AI 生图参考）、性格
2. 提取世界观设定（时代、主要地点、背景设定）
3. 生成 {body.total_episodes} 集分集梗概（每集 150-250 字，明确主要冲突、转折点和结尾钩子，要有强烈的追剧欲望）
4. 提取核心道具（服装、标志性物品）和重要场景（用于资产库）
5. 提炼全剧核心矛盾和主题

风格偏好：{body.style or "通用"}

请以纯JSON格式返回（不要任何额外说明或代码块标记），结构如下：
{{
  "title_suggestion": "建议剧名",
  "core_conflict": "核心矛盾一句话总结",
  "characters": [
    {{
      "name": "角色名",
      "gender": "男/女",
      "role": "主角/女主/反派/配角",
      "appearance": "外貌描述（含发型、服装风格、气质，供AI生图用）",
      "personality": "性格特点",
      "character_prompt": "English SD prompt for this character's appearance"
    }}
  ],
  "worldview": {{
    "era": "时代背景",
    "location": "主要地点",
    "setting": "世界观概述"
  }},
  "episodes": [
    {{
      "episode_no": 1,
      "title": "集名",
      "summary": "剧情梗概（含冲突和转折）",
      "hook": "结尾钩子（让观众必须追下一集的悬念）",
      "highlight": "本集爽点"
    }}
  ],
  "key_props": ["道具1", "道具2"],
  "key_scenes": ["场景1（附描述）", "场景2（附描述）"]
}}"""

    async def gen():
        full_text = ""
        try:
            async for chunk in llm_service.stream(prompt):
                full_text += chunk
                yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            return

        # Parse result and send
        try:
            match = re.search(r'\{.*\}', full_text, re.DOTALL)
            parsed = json.loads(match.group()) if match else {"raw": full_text}
        except Exception:
            parsed = {"raw": full_text}
        yield f"data: {json.dumps({'result': parsed}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/generate-from-idea-stream")
async def generate_from_idea_stream(body: ScriptGenerateRequest):
    """Stream script generation from idea via SSE."""
    prompt = f"""你是顶级的爆款短剧编剧，深度了解抖音/快手短剧受众喜好。请根据以下题材生成完整剧本框架。

题材：{body.topic}
风格：{body.style}
总集数：{body.total_episodes}集

创作原则：
- 第一集必须在30秒内抓住观众（开篇冲突/反转）
- 每集结尾必须有强力钩子（悬念/爽点/反转）
- 角色要有鲜明对比（强弱、贫富、善恶）
- 爽点密度高，每3集一个大爽点

以纯JSON格式返回（不要额外说明）：
{{
  "titles": ["剧名1（3字以内强记忆）", "剧名2", "剧名3"],
  "tagline": "一句话宣传语",
  "core_conflict": "核心矛盾",
  "theme": "主题",
  "characters": [
    {{
      "name": "角色名",
      "gender": "男/女",
      "role": "主角/女主/反派/配角",
      "appearance": "外貌描述（供AI生图参考）",
      "personality": "性格",
      "character_prompt": "English SD/Flux image prompt for this character"
    }}
  ],
  "episodes": [
    {{
      "episode_no": 1,
      "title": "集名",
      "summary": "剧情梗概（含冲突和转折，150字以上）",
      "hook": "结尾钩子（让人必须看下一集）",
      "highlight": "本集最大爽点"
    }}
  ],
  "key_scenes": ["场景1", "场景2"],
  "key_props": ["道具1", "道具2"]
}}"""

    async def gen():
        full_text = ""
        try:
            async for chunk in llm_service.stream(prompt):
                full_text += chunk
                yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            return

        try:
            match = re.search(r'\{.*\}', full_text, re.DOTALL)
            parsed = json.loads(match.group()) if match else {"raw": full_text}
        except Exception:
            parsed = {"raw": full_text}
        yield f"data: {json.dumps({'result': parsed}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/storyboard-script")
async def generate_storyboard_script(body: StoryboardScriptRequest):
    """Convert episode outline to shot-by-shot storyboard script."""
    style_hint = body.style or "漫剧"
    char_section = ""
    if body.characters:
        char_lines = []
        for c in body.characters:
            parts = [f"• {c.name}"]
            if c.description:
                parts.append(f"描述：{c.description}")
            if c.prompt:
                parts.append(f"英文生图提示词：{c.prompt}")
            char_lines.append(" | ".join(parts))
        char_section = f"""
【角色参考库】（生成 prompt_en 时必须使用这些角色的关键词，确保一致性）：
{chr(10).join(char_lines)}
"""

    scene_section = ""
    if body.scenes:
        scene_lines = []
        for s in body.scenes:
            parts = [f"• {s.name}"]
            if s.description:
                parts.append(f"描述：{s.description}")
            if s.prompt:
                parts.append(f"英文生图提示词：{s.prompt}")
            scene_lines.append(" | ".join(parts))
        scene_section = f"""
【场景参考库】（生成 prompt_en 时必须为对应场景使用这些关键词，确保场景视觉一致性）：
{chr(10).join(scene_lines)}
"""

    prompt = f"""你是专业的漫剧分镜导演，同时精通 AI 图像生成（Stable Diffusion / Flux）。请将以下集数梗概转化为标准分镜脚本。

集数概要：
{body.episode_outline}
{char_section}{scene_section}
要求：
- 生成约{body.shots_per_episode}个镜头
- 每个镜头需包含：场景、人物、动作、台词、镜头类型、景别、氛围
- 镜头要有电影感，节奏张弛有度，每3-5个镜头设置一个小高潮
- 风格：{style_hint}
- prompt_en 字段必须是英文，适合直接输入 Stable Diffusion/Flux 的专业 prompt
  包含：具体角色外观关键词（来自角色参考库）、场景、镜头语言、光线、氛围、艺术风格
  示例：「young woman in red hanfu, long black hair, standing in autumn imperial courtyard, medium shot, warm afternoon light, cinematic, manga style, detailed, 8k」

以JSON数组返回（仅返回数组，不要任何额外说明），每个镜头格式：
[
  {{
    "shot_no": 1,
    "scene": "场景中文描述",
    "characters": ["人物1", "人物2"],
    "action": "动作描述",
    "dialogue": "台词（无台词则留空字符串）",
    "camera_type": "固定/推进/拉远/摇镜/跟拍",
    "shot_size": "特写/近景/中景/全景/远景",
    "mood": "紧张/温馨/压抑/欢快/悬疑",
    "duration_sec": 4,
    "prompt_en": "English SD/Flux prompt here, character appearance keywords, scene, camera, lighting, art style"
  }}
]"""

    result = await llm_service.complete(prompt)
    try:
        import re
        match = re.search(r'\[.*\]', result, re.DOTALL)
        shots = json.loads(match.group()) if match else []
        # Map prompt_en to prompt_hint for backward compat, prefer prompt_en
        for s in shots:
            if "prompt_en" in s and not s.get("prompt_hint"):
                s["prompt_hint"] = s["prompt_en"]
    except Exception:
        shots = []

    return {"episode_id": body.episode_id, "shots": shots}
