"""Script module: import novels/text, AI breakdown, storyboard script generation."""
import uuid
import json
import io
import re
import zipfile
from typing import Optional, List
from xml.etree import ElementTree as ET
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.models import Episode, Project
from db.database import get_db
from api.deps import get_session
from services.llm import llm_service
from services.prompts import load_prompt, load_enhanced_prompt


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
    project_id: Optional[str] = None  # 添加 project_id 以保存拆解结果
    raw_text: str
    total_episodes: int = 1
    style: Optional[str] = None
    llm_provider: Optional[str] = None  # 指定 LLM 提供商，None 或 "auto" 表示自动选择


class ScriptGenerateRequest(BaseModel):
    topic: str
    style: Optional[str] = "都市"
    total_episodes: int = 12
    episodes_per_request: int = 1
    llm_provider: Optional[str] = None  # 指定 LLM 提供商


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
    characters: Optional[List[CharacterRef]] = None  # character reference data from assets
    scenes: Optional[List[SceneRef]] = None  # scene/location reference data from assets
    llm_provider: Optional[str] = None  # 指定 LLM 提供商


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
    project_type = "manga_2d"  # default

    if body.episode_id and body.episode_id != "placeholder":
        ep = db.query(Episode).filter(Episode.id == body.episode_id).first()
        if not ep:
            raise HTTPException(404, "Episode not found")
        # Get project type
        if body.project_id:
            proj = db.query(Project).filter(Project.id == body.project_id).first()
            if proj:
                project_type = proj.type or "manga_2d"

    prompt = load_enhanced_prompt(
        "breakdown.txt",
        style=body.style,
        project_type=project_type,
        context={"task": "breakdown"},
        raw_text=body.raw_text[:4000],
        total_episodes=body.total_episodes,
    )

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

    # 保存拆解结果到项目并更新 workflow_step
    if body.project_id:
        project = db.query(Project).filter(Project.id == body.project_id).first()
        if project:
            project.breakdown_result = parsed
            project.workflow_step = 2  # 进入资产准备步骤
            db.commit()

    return {"episode_id": body.episode_id, "breakdown": parsed}


@router.post("/generate-from-idea")
async def generate_from_idea(body: ScriptGenerateRequest):
    """Generate a full script outline from a one-line idea."""
    prompt = load_enhanced_prompt(
        "generate_script.txt",
        style=body.style,
        project_type="manga_2d",  # default for idea generation
        context={"task": "generate_script"},
        topic=body.topic,
        total_episodes=body.total_episodes,
    )

    result = await llm_service.complete(prompt)
    try:
        parsed = json.loads(result)
    except Exception:
        import re
        match = re.search(r'\{.*\}', result, re.DOTALL)
        parsed = json.loads(match.group()) if match else {"raw": result}

    return {"script": parsed}


@router.post("/breakdown-stream")
async def breakdown_script_stream(body: ScriptBreakdownRequest, db: Session = Depends(get_session)):
    """Stream script breakdown via Server-Sent Events. Two-phase approach for better quality."""
    import asyncio

    # Require minimum text length
    if len(body.raw_text.strip()) < 100:
        async def error_gen():
            yield f"data: {json.dumps({'error': '剧本内容太少（少于100字），请先导入或粘贴完整的剧本文本'}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(error_gen(), media_type="text/event-stream")

    full_text = body.raw_text
    text_len = len(full_text)
    total_eps = body.total_episodes

    # Get project type for enhancement
    project_type = "manga_2d"
    if body.project_id:
        proj = db.query(Project).filter(Project.id == body.project_id).first()
        if proj:
            project_type = proj.type or "manga_2d"

    # 每集对应文本的字符数
    chars_per_ep = text_len // total_eps if total_eps > 0 else text_len

    async def gen():
        yield f"data: {json.dumps({'chunk': f'【拆解开始】这是一个两阶段拆解过程，预计需要{total_eps + 1}次AI调用，请耐心等待...\n'}, ensure_ascii=False)}\n\n"

        # ========== 阶段1：生成全局信息 + 每集标题简介 ==========
        phase1_prompt = load_prompt(
            "breakdown_phase1.txt",
            full_text=full_text[:15000],
            text_len=text_len,
            total_eps=total_eps,
        )

        phase1_text = ""
        yield f"data: {json.dumps({'chunk': f'\n【阶段1】分析剧本，提取角色、世界观，生成{total_eps}集标题...\n'}, ensure_ascii=False)}\n\n"

        max_retries = 3
        success = False

        for retry in range(max_retries):
            try:
                phase1_text = ""
                async for chunk in llm_service.stream(phase1_prompt, provider=body.llm_provider):
                    phase1_text += chunk
                    yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
                success = True
                break
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "rate" in error_str.lower() or "limit" in error_str.lower():
                    wait_time = 15 + retry * 10
                    yield f"data: {json.dumps({'chunk': f'\n遇到速率限制，等待{wait_time}秒后重试（第{retry+1}/{max_retries}次）...\n'}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(wait_time)
                else:
                    yield f"data: {json.dumps({'error': f'阶段1失败: {error_str}'}, ensure_ascii=False)}\n\n"
                    yield "data: [DONE]\n\n"
                    return

        if not success:
            yield f"data: {json.dumps({'error': '阶段1多次重试失败'}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 解析阶段1结果
        try:
            match = re.search(r'\{.*\}', phase1_text, re.DOTALL)
            if match:
                phase1_result = json.loads(match.group())
            else:
                phase1_result = {"raw": phase1_text}
        except json.JSONDecodeError:
            phase1_result = {"raw": phase1_text}

        episodes_brief = phase1_result.get("episodes", [])

        # 补充缺失的集数（如果有）
        if len(episodes_brief) < total_eps:
            missing_eps = [i for i in range(1, total_eps + 1) if not any(ep.get("episode_no") == i for ep in episodes_brief)]
            for ep_no in missing_eps:
                episodes_brief.append({
                    "episode_no": ep_no,
                    "title": f"第{ep_no}集",
                    "summary_brief": f"（待补充）",
                    "opening_hook": ""
                })

        episodes_brief.sort(key=lambda x: x.get("episode_no", 0))

        # ========== 阶段2：逐集生成详细剧本 ==========
        yield f"data: {json.dumps({'chunk': f'\n【阶段2】逐集生成详细剧本（共{total_eps}集，每集单独调用确保质量）...\n'}, ensure_ascii=False)}\n\n"

        characters_info = json.dumps(phase1_result.get("characters", [])[:5], ensure_ascii=False)
        worldview_info = json.dumps(phase1_result.get("worldview", {}), ensure_ascii=False)

        detailed_episodes = []
        for ep_brief in episodes_brief:
            ep_no = ep_brief.get("episode_no", 0)
            ep_title = ep_brief.get("title", f"第{ep_no}集")
            summary_brief = ep_brief.get("summary_brief", "")
            opening_hook = ep_brief.get("opening_hook", "")

            yield f"data: {json.dumps({'chunk': f'\n正在生成第{ep_no}集详细剧本...\n'}, ensure_ascii=False)}\n\n"

            # 获取该集对应的原文段落作为参考
            text_start = (ep_no - 1) * chars_per_ep
            text_end = min(text_len, ep_no * chars_per_ep + chars_per_ep)
            ep_text_segment = full_text[text_start:text_end][:8000]

            phase2_prompt = load_prompt(
                "breakdown_episode_detail.txt",
                episode_no=ep_no,
                episode_title=ep_title,
                summary_brief=summary_brief,
                opening_hook=opening_hook,
                characters_info=characters_info,
                worldview_info=worldview_info,
                ep_text_segment=ep_text_segment,
            )

            try:
                ep_detail_text = ""
                async for chunk in llm_service.stream(phase2_prompt, provider=body.llm_provider):
                    ep_detail_text += chunk
                    yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"

                # 解析详细剧本
                match = re.search(r'\{.*\}', ep_detail_text, re.DOTALL)
                if match:
                    ep_detail = json.loads(match.group())
                    # 合合简要信息和详细信息
                    ep_detail["episode_no"] = ep_no
                    ep_detail["title"] = ep_detail.get("title") or ep_title
                    if not ep_detail.get("summary"):
                        ep_detail["summary"] = summary_brief
                    detailed_episodes.append(ep_detail)
                else:
                    # 如果解析失败，使用简要信息
                    detailed_episodes.append({
                        "episode_no": ep_no,
                        "title": ep_title,
                        "summary": summary_brief,
                        "opening_hook": opening_hook,
                        "ending_hook": "",
                        "highlight": "",
                        "key_shots": []
                    })

            except Exception as e:
                yield f"data: {json.dumps({'chunk': f'\n第{ep_no}集生成失败: {str(e)}，使用简要信息\n'}, ensure_ascii=False)}\n\n"
                detailed_episodes.append({
                    "episode_no": ep_no,
                    "title": ep_title,
                    "summary": summary_brief,
                    "opening_hook": opening_hook,
                    "ending_hook": "",
                    "highlight": "",
                    "key_shots": []
                })

            # 每集之间等待3秒，避免速率限制
            if ep_no < total_eps:
                yield f"data: {json.dumps({'chunk': f'\n等待3秒后继续...\n'}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(3)

        # 合合最终结果
        detailed_episodes.sort(key=lambda x: x.get("episode_no", 0))
        final_result = {
            **phase1_result,
            "episodes": detailed_episodes
        }
        # 移除旧的 episodes_brief 字段（如果存在）
        if "episodes_brief" in final_result:
            del final_result["episodes_brief"]

        yield f"data: {json.dumps({'chunk': f'\n✅ 拆解完成！共生成{len(detailed_episodes)}集详细剧本\n'}, ensure_ascii=False)}\n\n"

        # 保存到数据库
        if body.project_id:
            try:
                project = db.query(Project).filter(Project.id == body.project_id).first()
                if project:
                    project.breakdown_result = final_result
                    project.workflow_step = 2

                    # Create Episode records
                    existing_eps = db.query(Episode).filter(Episode.project_id == body.project_id).all()
                    existing_no_set = {ep.episode_no for ep in existing_eps}

                    for ep_data in detailed_episodes:
                        ep_no = ep_data.get("episode_no", 0)
                        if ep_no > 0 and ep_no not in existing_no_set:
                            new_ep = Episode(
                                id=str(uuid.uuid4()),
                                project_id=body.project_id,
                                episode_no=ep_no,
                                title=ep_data.get("title", f"第{ep_no}集"),
                                script_content=ep_data.get("summary", ""),
                                status="draft",
                            )
                            db.add(new_ep)

                    db.commit()
            except Exception as e:
                yield f"data: {json.dumps({'chunk': f'\n保存失败: {str(e)}\n'}, ensure_ascii=False)}\n\n"

        yield f"data: {json.dumps({'result': final_result}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/generate-from-idea-stream")
async def generate_from_idea_stream(body: ScriptGenerateRequest):
    """Stream script generation from idea via SSE."""
    prompt = load_enhanced_prompt(
        "generate_script.txt",
        style=body.style,
        project_type="manga_2d",
        context={"task": "generate_script"},
        topic=body.topic,
        total_episodes=body.total_episodes,
    )

    async def gen():
        full_text = ""
        try:
            async for chunk in llm_service.stream(prompt, provider=body.llm_provider):
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
async def generate_storyboard_script(body: StoryboardScriptRequest, db: Session = Depends(get_session)):
    """Convert episode outline to shot-by-shot storyboard script with style enhancement."""
    style_hint = body.style or "漫剧"

    # Get project type from episode
    project_type = "manga_2d"
    if body.episode_id:
        ep = db.query(Episode).filter(Episode.id == body.episode_id).first()
        if ep:
            proj = db.query(Project).filter(Project.id == ep.project_id).first()
            if proj:
                project_type = proj.type or "manga_2d"

    # Project type style info
    PROJECT_TYPE_INFO = {
        "manga_2d": {
            "label": "2D动画",
            "hint": "所有英文提示词必须以 'anime style, 2D anime illustration, Japanese anime aesthetic,' 开头",
            "prefix": "anime style, 2D anime illustration, Japanese anime aesthetic, ",
        },
        "manga_3d": {
            "label": "3D动画",
            "hint": "所有英文提示词必须以 '3D anime style, 3D rendered anime character, stylized 3D,' 开头",
            "prefix": "3D anime style, 3D rendered anime character, stylized 3D, ",
        },
        "live_action": {
            "label": "真人视频",
            "hint": "所有英文提示词必须是写实风格，不需要动画前缀，直接描述真实场景和人物",
            "prefix": "",
        },
    }
    type_info = PROJECT_TYPE_INFO.get(project_type, PROJECT_TYPE_INFO["manga_2d"])
    style_prefix = type_info["prefix"]

    char_section = ""
    if body.characters:
        char_lines = []
        constraint_lines = []
        for c in body.characters:
            parts = [f"• {c.name}"]
            if c.description:
                parts.append(f"描述：{c.description}")
            if c.prompt:
                parts.append(f"英文生图提示词：{c.prompt}")
            char_lines.append(" | ".join(parts))

            desc = c.description or ""
            prompt_text = c.prompt or ""
            gender = "female" if any(k in desc + prompt_text for k in ["女", "女性", "female", "woman", "girl"]) else "male"
            age = ""
            for a in ["幼年", "少年", "青年", "中年", "老年", "young", "middle-aged", "elderly", "teen", "child"]:
                if a in desc or a in prompt_text:
                    age = a
                    break
            hair = ""
            clothing = ""
            temperament = ""
            if prompt_text:
                prompt_parts = prompt_text.split(",")
                for pp in prompt_parts:
                    pp = pp.strip().lower()
                    if "hair" in pp:
                        hair = pp
                    if any(c in pp for c in ["dress", "robe", "suit", "armor", "coat", "shirt", "clothes", "outfit", "uniform"]):
                        clothing = pp
                    if any(t in pp for t in ["elegant", "confident", "shy", "determined", "mysterious", "gentle", "cold", "warm", "brave", "sad", "happy"]):
                        temperament = pp

            constraint_parts = []
            constraint_parts.append(f"性别：{'女性' if gender == 'female' else '男性'}({gender})")
            if age:
                constraint_parts.append(f"年龄段：{age}")
            if hair:
                constraint_parts.append(f"发型发色：{hair}")
            if clothing:
                constraint_parts.append(f"服装：{clothing}")
            if temperament:
                constraint_parts.append(f"气质：{temperament}")
            constraint_lines.append(f"【{c.name}】{' | '.join(constraint_parts)}")

        constraint_block = "\n".join(constraint_lines) if constraint_lines else ""
        char_section = f"""
【角色属性约束】（生成的每个镜头prompt_en必须包含出镜角色的以下约束属性，严禁改变性别/年龄/发型等核心特征）：
{constraint_block}

【角色参考库】：
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

    # Build context with character/scene info for enhancement
    context = {
        "task": "storyboard",
        "characters": [c.name for c in (body.characters or [])],
        "scenes": [s.name for s in (body.scenes or [])],
    }

    # Use base prompt directly without enhancement to avoid injecting unrelated content
    from services.prompts import load_prompt
    prompt = load_prompt(
        "storyboard_script.txt",
        episode_outline=body.episode_outline,
        char_section=char_section,
        scene_section=scene_section,
        shots_per_episode=body.shots_per_episode,
        style_hint=style_hint,
        project_type_label=type_info["label"],
        project_type_hint=type_info["hint"],
        style_prefix=style_prefix,
    )

    # Use specified provider or default to "glm" (智谱) if available
    provider = body.llm_provider or "glm"
    result = await llm_service.complete_with_provider(provider, prompt)

    # Debug: log the raw result
    print(f"[storyboard-script] Provider: {provider}, Result length: {len(result)}")

    shots = []
    try:
        import re
        # 尝试多种JSON提取方式
        # 1. 先尝试直接匹配完整数组
        match = re.search(r'\[.*\]', result, re.DOTALL)
        if match:
            json_str = match.group()
            try:
                parsed = json.loads(json_str)
                # Handle nested arrays: if result is [[...]], flatten to [...]
                if isinstance(parsed, list) and len(parsed) > 0 and isinstance(parsed[0], list):
                    shots = parsed[0] if parsed[0] else []
                    print(f"[storyboard-script] Flattened nested array, got {len(shots)} shots")
                else:
                    shots = parsed
            except json.JSONDecodeError as e:
                print(f"[storyboard-script] JSON parse error: {e}, attempting repair...")
                # 2. 尝试修复常见的JSON错误
                # 移除末尾可能的不完整内容
                # 尝试找到最后一个完整的对象
                last_complete = re.search(r'\}\s*,?\s*\]', json_str, re.DOTALL)
                if last_complete:
                    # 找最后一个完整对象的结束位置
                    repaired = json_str[:last_complete.end()-1]  # 排除最后的]
                    # 重新匹配
                    repaired_match = re.search(r'\[.*\]', repaired + ']', re.DOTALL)
                    if repaired_match:
                        try:
                            shots = json.loads(repaired_match.group())
                            print(f"[storyboard-script] Reparsed {len(shots)} shots after repair")
                        except:
                            pass

                # 3. 尝试逐个提取对象
                if not shots:
                    objects = re.findall(r'\{[^{}]*"shot_no"[^{}]*\}', result, re.DOTALL)
                    for obj_str in objects:
                        try:
                            obj = json.loads(obj_str)
                            shots.append(obj)
                        except:
                            continue
                    if shots:
                        print(f"[storyboard-script] Extracted {len(shots)} objects individually")

        if shots:
            print(f"[storyboard-script] Successfully parsed {len(shots)} shots")
        else:
            print(f"[storyboard-script] No shots found in result")

        # Process each shot: ensure prompt_cn and ensure prompt_en has style prefix
        for s in shots:
            # Generate prompt_cn if not provided (combine scene, action, characters)
            if not s.get("prompt_cn"):
                scene_desc = s.get("scene", "")
                action_desc = s.get("action", "")
                characters_desc = s.get("characters", [])
                mood_desc = s.get("mood", "")
                parts = []
                if scene_desc:
                    parts.append(f"场景：{scene_desc}")
                if characters_desc:
                    parts.append(f"人物：{', '.join(characters_desc)}")
                if action_desc:
                    parts.append(f"动作：{action_desc}")
                if mood_desc:
                    parts.append(f"氛围：{mood_desc}")
                s["prompt_cn"] = "，".join(parts) if parts else ""

            # Ensure prompt_en has style prefix (AI might forget)
            prompt_en = s.get("prompt_en", "")
            if prompt_en and style_prefix:
                if not (prompt_en.lower().startswith("anime") or prompt_en.lower().startswith("3d") or prompt_en.lower().startswith(style_prefix.lower())):
                    s["prompt_en"] = style_prefix + prompt_en

            # Map prompt_en to prompt_hint for backward compat
            if "prompt_en" in s and not s.get("prompt_hint"):
                s["prompt_hint"] = s["prompt_en"]
    except Exception as e:
        print(f"[storyboard-script] Unexpected error: {e}")
        shots = []

    return {"episode_id": body.episode_id, "shots": shots}


class TranslateRequest(BaseModel):
    texts: list[str]
    direction: str = "en2zh"  # "en2zh" or "zh2en"
    mode: str = "general"  # "general" or "scene_prop"


@router.post("/translate")
async def translate_text(body: TranslateRequest):
    """Translate texts between Chinese and English using LLM."""
    if not body.texts:
        return {"translations": []}

    items = "\n".join(f"[{i}] {text}" for i, text in enumerate(body.texts))

    if body.direction == "zh2en":
        if body.mode == "scene_prop":
            prompt = f"""你是一个专业翻译。请将以下中文场景/道具描述翻译为纯名词形式的英文描述。

**绝对约束**：
- 只输出名词短语，描述外观、材质、环境、光线、氛围
- 禁止一切动词（wake, open, stand, sit, walk, look, enter, leave, run, move, turn, grab, hold等）
- 禁止人物相关词汇（he, she, someone, man, woman, person, his, her, their等）
- 禁止动作描述（睁眼、醒来、站立、坐着、走进、离开等）

示例：
中文: "在土坯房昏暗的油灯下睁眼醒来"
英文输出: "adobe house interior, dim oil lamp, mud walls, straw bed"

中文: "古代剑，黑色剑鞘，金色剑柄"
英文输出: "ancient sword, black scabbard, golden hilt"

输出格式：每行一条，以[index]开头，只输出名词短语：
[0] noun phrase only
[1] noun phrase only

待翻译文本：
{items}"""
        else:
            prompt = f"""你是一个专业翻译。请将以下中文描述严格翻译为英文。

要求：
- 翻译必须完整、精确，不遗漏任何细节
- 保留所有事实信息：物品特征、外观、材质、用途、风格等
- 不要省略任何中文原文中的内容
- 用自然流畅的英文表达

输出格式：每行一条，以[index]开头：
[0] English translation
[1] English translation

待翻译文本：
{items}"""
    else:
        prompt = f"""你是一个专业翻译。请将以下英文角色描述严格翻译为中文。

要求：
- 翻译必须完整、精确，不遗漏任何细节
- 保留所有事实信息：年龄、外貌、服装、姿势、光线、风格、视角等
- 不要省略任何英文原文中的内容
- 用自然的中文表达，不要逐词死译

输出格式：每行一条，以[index]开头：
[0] 中文翻译
[1] 中文翻译

待翻译文本：
{items}"""

    result = await llm_service.complete_with_provider("auto", prompt)
    translations = body.texts.copy()
    for line in result.strip().split("\n"):
        m = re.match(r'\[(\d+)\]\s*(.*)', line.strip())
        if m:
            idx = int(m.group(1))
            if 0 <= idx < len(translations):
                translations[idx] = m.group(2)

    return {"translations": translations}


class ExtractNounsRequest(BaseModel):
    texts: list[str]
    type: str = "scene"  # "scene" or "prop"


@router.post("/extract-nouns")
async def extract_nouns(body: ExtractNounsRequest):
    """从文本中提取纯名词内容，去掉所有动词、动作、人物描述。返回中英文纯名词版本。"""
    if not body.texts:
        return {"nouns": [], "nouns_en": []}

    items = "\n".join(f"[{i}] {text}" for i, text in enumerate(body.texts))

    if body.type == "scene":
        prompt = f"""你是一个场景元素分解器。请从以下场景描述文本中分解出场景内的静态元素。

**任务**：分解场景内的元素，去掉所有动作、动词、人物行为。同时生成中文和英文版本。

**分解规则**：
- 提取场景中的建筑、环境、物品、光线等静态元素
- 去掉所有动词：睁眼、觉醒、醒来、站起、坐下、走过、看着、进入、离开、支起、照亮、堆满等
- 去掉人物动作描述
- 保留场景的空间结构和氛围
- 中文输出：纯名词短语，用逗号分隔
- 英文输出：纯名词短语翻译，用逗号分隔，只包含静态元素名词

**示例**：
输入："土坯房昏暗油灯下睁眼觉醒"
中文输出："土坯房，昏暗油灯"
英文输出："adobe house interior, dim oil lamp, mud walls"

输入："街口青石板上支起酸梅汤摊"
中文输出："街口青石板上，酸梅汤摊"
英文输出："street corner, stone pavement, sour plum drink stall"

输出格式：每行两条输出，以[index]开头，先中文后英文（用 | 分隔）：
[0] 中文纯名词 | 英文纯名词
[1] 中文纯名词 | 英文纯名词

待处理文本：
{items}"""
    else:
        prompt = f"""你是一个道具元素分解器。请从以下道具描述文本中分解出道具本身的静态元素。

**任务**：分解出道具的静态元素，去掉所有动作、位置关系、人物行为。同时生成中文和英文版本。

**分解规则**：
- 提取道具的名称、材质、颜色、外观特征
- 去掉所有动词：压在、放在、拿着、使用、缠着等
- 廻掉位置描述和人物行为
- 保留道具的核心特征
- 中文输出：纯名词短语
- 英文输出：纯名词短语翻译，只包含道具本身的静态描述

**示例**：
输入："褪色婚约残卷（压在砚台下）"
中文输出："褪色婚约残卷"
英文输出："faded marriage contract scroll"

输入："青釉陶瓮（酸梅汤专用）"
中文输出："青釉陶瓮"
英文输出："green glazed ceramic jar"

输入："铜算盘（沈秋自改三档快算版）"
中文输出："铜算盘"
英文输出："bronze abacus"

输出格式：每行两条输出，以[index]开头，先中文后英文（用 | 分隔）：
[0] 中文纯名词 | 英文纯名词
[1] 中文纯名词 | 英文纯名词

待处理文本：
{items}"""

    result = await llm_service.complete_with_provider("auto", prompt)
    nouns = body.texts.copy()
    nouns_en = body.texts.copy()

    for line in result.strip().split("\n"):
        m = re.match(r'\[(\d+)\]\s*(.*)', line.strip())
        if m:
            idx = int(m.group(1))
            if 0 <= idx < len(nouns):
                content = m.group(2)
                # Parse Chinese | English format
                if '|' in content:
                    parts = content.split('|')
                    nouns[idx] = parts[0].strip()
                    nouns_en[idx] = parts[1].strip() if len(parts) > 1 else parts[0].strip()
                else:
                    # Fallback: treat whole content as Chinese
                    nouns[idx] = content.strip()
                    nouns_en[idx] = content.strip()

    return {"nouns": nouns, "nouns_en": nouns_en}
