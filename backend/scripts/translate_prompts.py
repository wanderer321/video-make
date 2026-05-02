"""Translate existing English prompts to Chinese."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import re
from db.database import SessionLocal
from db.models import Board, Shot
from services.llm import llm_service

TRANSLATE_PROMPT = """请将以下英文提示词翻译成简洁的中文描述，用于视频/图像生成的展示说明。
只需要翻译内容，不要添加任何解释或额外信息。保持专业、简洁。

英文提示词：
{english_prompt}

中文描述（仅输出翻译结果）："""


async def translate_text(text: str) -> str:
    """Translate English text to Chinese using LLM."""
    if not text or len(text.strip()) < 10:
        return text

    # Skip if already Chinese
    chinese_chars = len(re.findall(r'[一-鿿]', text))
    if chinese_chars > len(text) * 0.3:
        return text  # Already mostly Chinese

    try:
        prompt = TRANSLATE_PROMPT.format(english_prompt=text)
        result = await llm_service.complete_with_provider("glm", prompt)
        # Clean up result
        translated = result.strip()
        # Remove quotes if wrapped
        if translated.startswith('"') and translated.endswith('"'):
            translated = translated[1:-1]
        if translated.startswith("'") and translated.endswith("'"):
            translated = translated[1:-1]
        return translated
    except Exception as e:
        print(f"Translation failed: {e}")
        return text


async def main():
    db = SessionLocal()

    print("=== Translating Board prompts ===")
    boards = db.query(Board).filter(Board.prompt.isnot(None)).all()

    for i, board in enumerate(boards):
        print(f"\n[{i+1}/{len(boards)}] Board {board.id[:8]}")
        print(f"  EN: {board.prompt[:80]}...")

        # Translate
        chinese = await translate_text(board.prompt)
        print(f"  CN: {chinese[:80]}...")

        # Update: keep English in prompt_en, set Chinese in prompt
        board.prompt_en = board.prompt  # Save original English
        board.prompt = chinese  # Update to Chinese

        # Small delay to avoid rate limiting
        if i < len(boards) - 1:
            await asyncio.sleep(1)

    print("\n=== Translating Shot prompts ===")
    shots = db.query(Shot).filter(Shot.prompt.isnot(None)).all()

    for i, shot in enumerate(shots):
        print(f"\n[{i+1}/{len(shots)}] Shot {shot.id[:8]}")
        print(f"  EN: {shot.prompt[:80]}...")

        # Translate
        chinese = await translate_text(shot.prompt)
        print(f"  CN: {chinese[:80]}...")

        # Update
        shot.prompt_en = shot.prompt  # Save original English
        shot.prompt = chinese  # Update to Chinese

        if i < len(shots) - 1:
            await asyncio.sleep(1)

    # Commit all changes
    db.commit()
    print("\n=== Translation complete! ===")
    db.close()


if __name__ == "__main__":
    asyncio.run(main())