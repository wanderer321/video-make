"""Prompt loader - reads prompt templates from the prompts/ directory."""
import os
import logging

_PROMPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "prompts")

logger = logging.getLogger("prompts")


def load_prompt(name: str, **kwargs) -> str:
    """Load a prompt template and optionally substitute variables.

    Usage:
        prompt = load_prompt("generate_script.txt", topic="武侠", style="古风", total_episodes=12)
    """
    path = os.path.join(_PROMPTS_DIR, name)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    if kwargs:
        return content.format(**kwargs)
    return content


def load_enhanced_prompt(
    name: str,
    style: str = None,
    project_type: str = "manga_2d",
    context: dict = None,
    **kwargs,
) -> str:
    """Load a prompt template with style-specific enhancement.

    This function extends load_prompt() by injecting style-specific rules
    and examples from the prompt-templates directory.

    Args:
        name: Template file name (e.g., "generate_script.txt")
        style: Style name for enhancement (e.g., "逆袭爽剧", "都市甜宠")
        project_type: Project type to determine media type (manga_2d, live_action)
        context: Additional context dict (task, characters, scenes, etc.)
        **kwargs: Variables for template substitution

    Returns:
        Enhanced prompt string, or base prompt if style not found

    Usage:
        prompt = load_enhanced_prompt(
            "storyboard_script.txt",
            style="逆袭爽剧",
            project_type="manga_2d",
            episode_outline="...",
            shots_per_episode=10,
        )
    """
    try:
        from services.prompt_enhancer import enhance_prompt
        enhanced = enhance_prompt(
            template_name=name,
            style=style,
            project_type=project_type,
            context=context,
            **kwargs,
        )
        if enhanced:
            logger.debug(f"Enhanced prompt for style '{style}' using template '{name}'")
            return enhanced
    except Exception as e:
        logger.warning(f"Prompt enhancement failed: {e}, falling back to base prompt")

    # Fallback to base prompt
    return load_prompt(name, **kwargs)


__all__ = ["load_prompt", "load_enhanced_prompt"]
