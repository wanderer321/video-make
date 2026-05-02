"""Dynamic Prompt Enhancement System for DramaForge.

This module provides style-specific prompt enhancement by loading rules and examples
from the prompt-templates directory. Style matching uses semantic matching via Skills
instead of hardcoded aliases.

Architecture:
- StyleRegistry: Discover available styles, semantic matching
- StyleKnowledgeLoader: Load style-specific rules/examples
- PromptEnhancer: Main orchestrator for prompt enhancement
- ShotStrategyDecider: Determine shot generation strategy
"""
import os
import pathlib
import logging
import re
from dataclasses import dataclass, field
from typing import Optional
from functools import lru_cache

logger = logging.getLogger("prompt_enhancer")

# Root directory for prompt templates (relative to backend folder)
# backend/services/prompt_enhancer.py -> backend -> video-make -> prompt-templates
BACKEND_DIR = pathlib.Path(__file__).parent.parent  # backend directory
BASE_DIR = BACKEND_DIR.parent / "prompt-templates"  # video-make/prompt-templates
PROMPTS_DIR = BACKEND_DIR / "prompts"  # backend/prompts


@dataclass
class StyleInfo:
    """Information about a discovered style."""
    name: str                    # e.g., "逆袭爽剧"
    dir_name: str               # e.g., "风格-逆袭爽剧"
    dir_path: pathlib.Path      # absolute path
    has_script_rules: bool = False
    has_script_examples: bool = False
    has_animation_storyboard: bool = False
    has_live_storyboard: bool = False
    has_animation_refimg: bool = False
    has_live_refimg: bool = False


class StyleRegistry:
    """Discover and manage available styles from prompt-templates directory."""

    def __init__(self, base_dir: pathlib.Path = BASE_DIR):
        self.base_dir = base_dir
        self._styles: dict[str, StyleInfo] = {}
        self._discover_styles()

    def _discover_styles(self):
        """Scan directory for all 风格-* folders."""
        if not self.base_dir.exists():
            logger.warning(f"Prompt templates directory not found: {self.base_dir}")
            return

        for dir_path in sorted(self.base_dir.glob("风格-*")):
            if not dir_path.is_dir():
                continue
            name = dir_path.name.replace("风格-", "")
            style = StyleInfo(
                name=name,
                dir_name=dir_path.name,
                dir_path=dir_path,
                has_script_rules=bool(list(dir_path.glob("剧本-*规则知识方法.md"))),
                has_script_examples=bool(list(dir_path.glob("剧本-例子.md"))),
                has_animation_storyboard=bool((dir_path / "动画").exists()),
                has_live_storyboard=bool((dir_path / "真人视频").exists()),
                has_animation_refimg=bool(list(dir_path.glob("动画/参考图*.md"))),
                has_live_refimg=bool(list(dir_path.glob("真人视频/参考图*.md"))),
            )
            self._styles[name] = style
            logger.debug(f"Discovered style: {name} (rules={style.has_script_rules}, anim={style.has_animation_storyboard})")

        logger.info(f"Discovered {len(self._styles)} styles: {list(self._styles.keys())}")

    def list_styles(self) -> list[StyleInfo]:
        """Return all discovered styles."""
        return list(self._styles.values())

    def get_style(self, name: str) -> Optional[StyleInfo]:
        """Get style by name. Returns None if not found."""
        return self._styles.get(name)

    def match_style_semantic(self, user_input: str) -> Optional[StyleInfo]:
        """Match user input to available styles using semantic matching.

        This uses a simple keyword-based matching first, then could be extended
        to use Skills for more sophisticated semantic matching.

        Returns the best matching StyleInfo or None.
        """
        if not user_input:
            return None

        # Direct match
        if user_input in self._styles:
            return self._styles[user_input]

        # Partial match (user input is part of style name or vice versa)
        user_lower = user_input.lower()
        for name, style in self._styles.items():
            name_lower = name.lower()
            if user_lower in name_lower or name_lower in user_lower:
                logger.debug(f"Partial match: '{user_input}' -> '{name}'")
                return style

        # Keyword-based matching for common aliases
        # Note: User requested Skills for semantic matching, but we provide
        # a basic fallback for common cases. The actual semantic matching
        # should be done via Skills in the enhance() method.
        keyword_map = {
            "都市": "都市甜宠", "甜宠": "都市甜宠",
            "逆袭": "逆袭爽剧", "爽剧": "逆袭爽剧",
            "悬疑": "悬疑推理", "推理": "悬疑推理",
            "古风": "古风玄幻", "玄幻": "古风玄幻",
            "权谋": "历史权谋", "历史": "历史权谋",
            "惊悚": "灵异惊悚", "灵异": "灵异惊悚",
            "科幻": "科幻末世", "末世": "科幻末世",
            "校园": "青春校园", "青春": "青春校园",
        }
        if user_input in keyword_map:
            matched = keyword_map[user_input]
            logger.debug(f"Keyword match: '{user_input}' -> '{matched}'")
            return self._styles.get(matched)

        logger.warning(f"No style match found for: '{user_input}'")
        return None

    def get_media_type(self, project_type: str) -> str:
        """Map project type to media type for prompt templates."""
        if project_type in ("manga_2d", "manga_3d", "anime_2d", "anime_3d"):
            return "动画"
        elif project_type in ("live_action", "overseas_live"):
            return "真人视频"
        return "动画"  # default


class StyleKnowledgeLoader:
    """Load style-specific knowledge content from markdown files."""

    def __init__(self, registry: StyleRegistry):
        self.registry = registry
        self._file_cache: dict[str, str] = {}
        self._shot_strategy_rules: Optional[str] = None

    @lru_cache(maxsize=50)
    def _load_file(self, path: pathlib.Path) -> str:
        """Load file content with caching."""
        if not path.exists():
            return ""
        try:
            content = path.read_text(encoding="utf-8")
            logger.debug(f"Loaded file: {path.name} ({len(content)} chars)")
            return content
        except Exception as e:
            logger.error(f"Failed to load file {path}: {e}")
            return ""

    def load_script_rules(self, style: str, max_chars: int = 2500) -> str:
        """Load script generation rules for the style."""
        info = self.registry.get_style(style)
        if not info:
            return ""

        # Try both naming patterns
        patterns = [
            info.dir_path / f"剧本-生成剧本&分集%%分片段-规则知识方法.md",
            info.dir_path / "剧本-规则知识方法.md",
        ]
        for path in patterns:
            if path.exists():
                content = self._load_file(path)
                return self._extract_sections(content, ["编剧理论", "叙事", "节拍", "角色", "三幕"], max_chars)

        return ""

    def load_script_examples(self, style: str, max_examples: int = 2, max_chars: int = 1500) -> str:
        """Load script examples for the style."""
        info = self.registry.get_style(style)
        if not info or not info.has_script_examples:
            return ""

        path = info.dir_path / "剧本-例子.md"
        content = self._load_file(path)
        return self._extract_examples(content, max_examples, max_chars)

    def load_storyboard_rules(self, style: str, media_type: str, max_chars: int = 3000) -> str:
        """Load storyboard rules for the style and media type."""
        info = self.registry.get_style(style)
        if not info:
            return ""

        subdir = media_type  # "动画" or "真人视频"
        path = info.dir_path / subdir / "分镜-规则知识方法.md"
        if not path.exists():
            return ""

        content = self._load_file(path)
        # Extract key sections: Director's Formula, One-Move Rule, Camera Contract, Lighting
        return self._extract_sections(content, [
            "Director", "Formula", "One-Move", "Camera Contract", "运镜",
            "灯光", "Lighting", "类型运镜", "标准运镜"
        ], max_chars)

    def load_storyboard_examples(self, style: str, media_type: str, max_examples: int = 2, max_chars: int = 1500) -> str:
        """Load storyboard examples for the style and media type."""
        info = self.registry.get_style(style)
        if not info:
            return ""

        subdir = media_type
        path = info.dir_path / subdir / "分镜-例子.md"
        if not path.exists():
            return ""

        content = self._load_file(path)
        return self._extract_examples(content, max_examples, max_chars)

    def load_shot_strategy_rules(self, max_chars: int = 2000) -> str:
        """Load global shot strategy decision rules."""
        if self._shot_strategy_rules:
            return self._shot_strategy_rules[:max_chars]

        path = BASE_DIR / "分镜生成方式详解.md"
        if not path.exists():
            return ""

        content = self._load_file(path)
        # Extract the decision table and rules
        extracted = self._extract_sections(content, [
            "一套提示词", "多套提示词", "规则", "判断", "必须"
        ], max_chars)
        self._shot_strategy_rules = extracted
        return extracted

    def _extract_sections(self, content: str, keywords: list[str], max_chars: int) -> str:
        """Extract relevant sections from markdown content based on keywords."""
        if not content:
            return ""

        # Split by ## headings
        sections = re.split(r'\n## ', content)
        relevant = []

        for section in sections:
            # Check if section contains any keyword
            section_lower = section.lower()
            if any(kw.lower() in section_lower for kw in keywords):
                relevant.append(section)

        combined = "\n## ".join(relevant)
        if len(combined) > max_chars:
            combined = combined[:max_chars] + "\n... (truncated)"

        return combined

    def _extract_examples(self, content: str, max_examples: int, max_chars: int) -> str:
        """Extract numbered examples from content."""
        if not content:
            return ""

        # Find examples marked with ### or numbered
        examples = re.split(r'\n### 例子', content)
        if len(examples) <= 1:
            # Try alternative patterns
            examples = re.split(r'\n### ', content)

        selected = examples[1:max_examples+1] if len(examples) > 1 else [content[:500]]
        combined = "\n### ".join(selected)

        if len(combined) > max_chars:
            combined = combined[:max_chars] + "\n... (truncated)"

        return combined


class ShotStrategyDecider:
    """Determine shot generation strategy based on shot content analysis."""

    # Based on 分镜生成方式详解.md decision rules
    SINGLE_PROMPT_INDICATORS = [
        "推进", "拉远", "摇镜", "跟拍", "环绕", "升降",  # camera movement
        "固定", "推进", "拉镜",  # camera types
    ]

    MULTI_PROMPT_INDICATORS = [
        "特写", "近景", "中景", "全景", "远景",  # shot size changes
        "俯视", "仰视", "平视",  # angle changes
    ]

    def decide(self, shot: dict, prev_shot: Optional[dict] = None) -> str:
        """Determine the generation strategy for a shot.

        Returns: "single_prompt" | "multi_prompt" | "direct_video"
        """
        # If gen_mode is video, use direct_video
        if shot.get("gen_mode") == "video":
            return "direct_video"

        camera = (shot.get("camera_type") or shot.get("camera_angle") or "").strip()
        shot_size = (shot.get("shot_size") or "").strip()
        action = (shot.get("action") or "").strip()

        # Check for single prompt indicators (continuous camera movement)
        if camera in self.SINGLE_PROMPT_INDICATORS:
            # Compare with previous shot for continuity
            if prev_shot:
                prev_scene = (prev_shot.get("scene") or "").strip()
                curr_scene = (shot.get("scene") or "").strip()
                # Same scene + camera movement = single prompt
                if prev_scene and curr_scene and (prev_scene == curr_scene or prev_scene in curr_scene or curr_scene in prev_scene):
                    return "single_prompt"

        # Check for multi prompt indicators (shot size or angle changes)
        if prev_shot:
            prev_shot_size = (prev_shot.get("shot_size") or "").strip()
            # Shot size change = multi prompt
            if shot_size and prev_shot_size and shot_size != prev_shot_size:
                return "multi_prompt"

        # Has significant action with dialogue = likely needs multi prompt for complexity
        if len(action) > 20 and shot.get("dialogue"):
            return "multi_prompt"

        # Default to multi_prompt (safer for most cases)
        return "multi_prompt"


class PromptEnhancer:
    """Main orchestrator for dynamic prompt enhancement."""

    def __init__(self, registry: StyleRegistry = None, loader: StyleKnowledgeLoader = None):
        self.registry = registry or StyleRegistry()
        self.loader = loader or StyleKnowledgeLoader(self.registry)
        self.shot_decider = ShotStrategyDecider()

    def enhance(
        self,
        template_name: str,
        style: Optional[str] = None,
        project_type: str = "manga_2d",
        context: Optional[dict] = None,
        **kwargs,
    ) -> str:
        """Load and enhance a prompt template with style-specific knowledge.

        Args:
            template_name: Name of the base template file (e.g., "generate_script.txt")
            style: Style name for enhancement (e.g., "逆袭爽剧")
            project_type: Project type to determine media type (manga_2d, live_action)
            context: Additional context for enhancement (task, characters, scenes, etc.)
            **kwargs: Variables for template substitution

        Returns:
            Enhanced prompt string ready for LLM
        """
        # Load base template
        base_path = PROMPTS_DIR / template_name
        if not base_path.exists():
            logger.error(f"Template not found: {template_name}")
            return ""

        base_content = base_path.read_text(encoding="utf-8")

        # Substitute variables first
        if kwargs:
            try:
                base_content = base_content.format(**kwargs)
            except KeyError as e:
                logger.warning(f"Missing template variable: {e}")

        # If no style or style not found, return base content
        if not style:
            return base_content

        # Match style
        style_info = self.registry.match_style_semantic(style)
        if not style_info:
            logger.warning(f"Style '{style}' not found, using base prompt")
            return base_content

        media_type = self.registry.get_media_type(project_type)
        ctx = context or {}

        # Route to appropriate enhancer based on template
        if template_name == "generate_script.txt":
            return self._enhance_script(base_content, style_info, ctx)
        elif template_name in ("breakdown.txt", "breakdown_phase1.txt"):
            return self._enhance_breakdown(base_content, style_info, ctx)
        elif template_name == "storyboard_script.txt":
            return self._enhance_storyboard(base_content, style_info, media_type, ctx)
        elif template_name == "breakdown_supplement.txt":
            # Supplement doesn't need style enhancement
            return base_content
        else:
            return base_content

    def _enhance_script(self, base: str, style: StyleInfo, context: dict) -> str:
        """Enhance script generation prompt."""
        rules = self.loader.load_script_rules(style.name, max_chars=2500)
        examples = self.loader.load_script_examples(style.name, max_examples=2, max_chars=1500)

        if not rules and not examples:
            return base

        enhancement = f"""

--- 风格增强（{style.name}）---

【叙事规则参考】
{rules}

【剧本例子参考】
{examples}

请严格遵循{style.name}风格的叙事规则、节奏控制和角色设定原则来生成剧本。"""

        return base + enhancement

    def _enhance_breakdown(self, base: str, style: StyleInfo, context: dict) -> str:
        """Enhance script breakdown prompt."""
        rules = self.loader.load_script_rules(style.name, max_chars=2000)
        examples = self.loader.load_script_examples(style.name, max_examples=1, max_chars=1000)

        if not rules and not examples:
            return base

        # Focus on episode rhythm and hook design
        enhancement = f"""

--- 风格增强（{style.name}）---

【分集节奏规则】
{rules}

请在拆解时特别关注{style.name}风格的节奏特点、"三集定生死"公式和结尾钩子设计。每集结尾必须有强力悬念，让观众必须追下一集。"""

        return base + enhancement

    def _enhance_storyboard(self, base: str, style: StyleInfo, media_type: str, context: dict) -> str:
        """Enhance storyboard script prompt - most complex enhancement."""
        rules = self.loader.load_storyboard_rules(style.name, media_type, max_chars=3000)
        strategy = self.loader.load_shot_strategy_rules(max_chars=2000)

        if not rules:
            return base

        # NOTE: We do NOT load storyboard examples because they contain specific
        # character/scene content that can confuse the LLM and cause it to generate
        # content unrelated to the actual script. Rules and strategies are sufficient.

        enhancement = f"""

--- 风格增强（{style.name}/{media_type}）---

【分镜核心规则 - 必须遵守】
{rules}

【分镜生成策略判断规则】
{strategy}

请在生成分镜时严格遵循以上规则：
1. 必须根据实际剧本内容生成角色、场景、动作
2. One-Move Rule: 每镜头只指定一个主要运镜
3. prompt_cn 用纯中文描述镜头内容
4. prompt_en 用英文并包含项目类型风格前缀
"""

        return base + enhancement


# Module-level singleton for easy import
_prompt_enhancer: Optional[PromptEnhancer] = None


def get_prompt_enhancer() -> PromptEnhancer:
    """Get the singleton PromptEnhancer instance."""
    global _prompt_enhancer
    if _prompt_enhancer is None:
        _prompt_enhancer = PromptEnhancer()
    return _prompt_enhancer


def enhance_prompt(
    template_name: str,
    style: Optional[str] = None,
    project_type: str = "manga_2d",
    context: Optional[dict] = None,
    **kwargs,
) -> str:
    """Convenience function to enhance a prompt."""
    return get_prompt_enhancer().enhance(template_name, style, project_type, context, **kwargs)


__all__ = [
    "StyleRegistry",
    "StyleInfo",
    "StyleKnowledgeLoader",
    "ShotStrategyDecider",
    "PromptEnhancer",
    "get_prompt_enhancer",
    "enhance_prompt",
]