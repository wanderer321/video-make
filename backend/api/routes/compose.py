"""Compose/export module: SRT generation, FFmpeg pipeline, video preview."""
import os
import uuid
import shutil
import subprocess
import tempfile
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api.deps import get_session
from db.models import Board, Episode

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")


def _ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


def _sec_to_srt_time(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int((sec - int(sec)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _build_srt(boards: list) -> str:
    """Generate SRT subtitle file from board dialogue."""
    lines = []
    cursor = 0.0
    idx = 1
    for b in boards:
        dur = b.duration_sec or 4.0
        if b.dialogue and b.dialogue.strip():
            start = _sec_to_srt_time(cursor + 0.2)
            end = _sec_to_srt_time(cursor + dur - 0.2)
            lines.append(f"{idx}")
            lines.append(f"{start} --> {end}")
            lines.append(b.dialogue.strip())
            lines.append("")
            idx += 1
        cursor += dur
    return "\n".join(lines)


class ExportRequest(BaseModel):
    episode_id: str
    include_subtitles: bool = True
    bgm_path: Optional[str] = None
    output_format: str = "mp4"
    resolution: str = "1080x1920"   # 9:16 portrait for short drama


@router.post("/export")
async def export_episode(body: ExportRequest, db: Session = Depends(get_session)):
    """Export episode boards to a single MP4 using FFmpeg."""
    if not _ffmpeg_available():
        raise HTTPException(500, "FFmpeg 未安装。请先安装 FFmpeg 并确保在 PATH 中：https://ffmpeg.org/download.html")

    ep = db.query(Episode).filter(Episode.id == body.episode_id).first()
    if not ep:
        raise HTTPException(404, "Episode not found")

    boards = (
        db.query(Board)
        .filter(Board.episode_id == body.episode_id)
        .order_by(Board.order_index)
        .all()
    )
    if not boards:
        raise HTTPException(400, "该集暂无分镜数据")

    # Separate boards with video vs image-only
    video_boards = [b for b in boards if b.video_path and os.path.exists(b.video_path)]
    image_boards = [b for b in boards if not (b.video_path and os.path.exists(b.video_path))
                    and b.image_path and os.path.exists(b.image_path)]

    if not video_boards and not image_boards:
        raise HTTPException(400, "没有可用的视频或图像素材，请先生成分镜图或视频")

    out_dir = os.path.join(DATA_DIR, "exports")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{body.episode_id}.mp4")
    w, h = body.resolution.split("x")

    with tempfile.TemporaryDirectory() as tmp:
        # Build individual clips (video or still image → short video)
        clip_paths = []
        for b in boards:
            clip_out = os.path.join(tmp, f"{b.id}_clip.mp4")
            dur = b.duration_sec or 4.0

            if b.video_path and os.path.exists(b.video_path):
                # Re-encode to consistent format/resolution
                cmd = [
                    "ffmpeg", "-y", "-i", b.video_path,
                    "-vf", f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2",
                    "-c:v", "libx264", "-crf", "23", "-preset", "fast",
                    "-an", "-t", str(dur),
                    clip_out,
                ]
            elif b.image_path and os.path.exists(b.image_path):
                # Image slideshow clip
                cmd = [
                    "ffmpeg", "-y", "-loop", "1", "-i", b.image_path,
                    "-vf", f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+0.0007,1.05)':d={int(dur*25)}:s={w}x{h}",
                    "-c:v", "libx264", "-crf", "23", "-preset", "fast",
                    "-t", str(dur), "-r", "25", "-an",
                    clip_out,
                ]
            else:
                # Black frame placeholder
                cmd = [
                    "ffmpeg", "-y",
                    "-f", "lavfi", "-i", f"color=black:s={w}x{h}:r=25:d={dur}",
                    "-c:v", "libx264", "-an",
                    clip_out,
                ]

            result = subprocess.run(cmd, capture_output=True, timeout=120)
            if result.returncode != 0:
                err = result.stderr.decode("utf-8", errors="replace")[-500:]
                raise HTTPException(500, f"FFmpeg clip 生成失败：{err}")
            clip_paths.append(clip_out)

        # Concatenate clips
        concat_list = os.path.join(tmp, "concat.txt")
        with open(concat_list, "w", encoding="utf-8") as f:
            for p in clip_paths:
                f.write(f"file '{p}'\n")

        concat_out = os.path.join(tmp, "concat.mp4")
        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", concat_list,
            "-c", "copy",
            concat_out,
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=300)
        if result.returncode != 0:
            err = result.stderr.decode("utf-8", errors="replace")[-500:]
            raise HTTPException(500, f"FFmpeg 拼接失败：{err}")

        # Build audio mix: board audio tracks
        audio_inputs = [b for b in boards if b.audio_path and os.path.exists(b.audio_path)]
        final_input = concat_out

        if audio_inputs or body.bgm_path:
            # Create silent base audio equal to total duration
            total_dur = sum(b.duration_sec or 4.0 for b in boards)
            audio_out = os.path.join(tmp, "audio_mix.aac")

            if audio_inputs:
                # Build timeline of audio clips with delays
                cursor = 0.0
                filter_parts = []
                input_args = ["-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo:d={total_dur}"]
                n_inputs = 1

                for b in boards:
                    dur = b.duration_sec or 4.0
                    if b.audio_path and os.path.exists(b.audio_path):
                        input_args += ["-i", b.audio_path]
                        delay_ms = int(cursor * 1000)
                        filter_parts.append(
                            f"[{n_inputs}:a]adelay={delay_ms}|{delay_ms},apad=whole_dur={total_dur}[a{n_inputs}]"
                        )
                        n_inputs += 1
                    cursor += dur

                if filter_parts:
                    mix_labels = "[0:a]" + "".join(f"[a{i+1}]" for i in range(len(filter_parts)))
                    filter_str = ";".join(filter_parts) + f";{mix_labels}amix=inputs={len(filter_parts)+1}:duration=first[aout]"
                    cmd = (
                        ["ffmpeg", "-y"] + input_args +
                        ["-filter_complex", filter_str, "-map", "[aout]",
                         "-c:a", "aac", "-ar", "44100", audio_out]
                    )
                else:
                    cmd = [
                        "ffmpeg", "-y", "-f", "lavfi",
                        "-i", f"anullsrc=r=44100:cl=stereo:d={total_dur}",
                        "-c:a", "aac", audio_out,
                    ]
            else:
                cmd = [
                    "ffmpeg", "-y", "-f", "lavfi",
                    "-i", f"anullsrc=r=44100:cl=stereo:d={total_dur}",
                    "-c:a", "aac", audio_out,
                ]

            subprocess.run(cmd, capture_output=True, timeout=120)

            # Mix BGM if provided
            if body.bgm_path and os.path.exists(body.bgm_path):
                bgm_mixed = os.path.join(tmp, "bgm_mixed.aac")
                subprocess.run([
                    "ffmpeg", "-y",
                    "-i", audio_out, "-i", body.bgm_path,
                    "-filter_complex",
                    f"[1:a]volume=0.15,apad=whole_dur={total_dur}[bgm];[0:a][bgm]amix=inputs=2:duration=first[aout]",
                    "-map", "[aout]", "-c:a", "aac", bgm_mixed,
                ], capture_output=True, timeout=120)
                audio_out = bgm_mixed

            final_with_audio = os.path.join(tmp, "final_audio.mp4")
            subprocess.run([
                "ffmpeg", "-y", "-i", concat_out, "-i", audio_out,
                "-c:v", "copy", "-c:a", "aac", "-shortest",
                final_with_audio,
            ], capture_output=True, timeout=120)
            final_input = final_with_audio

        # Burn-in subtitles
        if body.include_subtitles:
            srt_content = _build_srt(boards)
            if srt_content.strip():
                srt_file = os.path.join(tmp, "subs.srt")
                with open(srt_file, "w", encoding="utf-8") as f:
                    f.write(srt_content)

                font_dir = os.path.join(os.path.dirname(__file__), "fonts")
                subtitled_out = os.path.join(tmp, "subtitled.mp4")
                srt_escaped = srt_file.replace("\\", "/").replace(":", "\\:")
                sub_filter = f"subtitles='{srt_escaped}':force_style='FontSize=18,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2,MarginV=60'"
                result = subprocess.run([
                    "ffmpeg", "-y", "-i", final_input,
                    "-vf", sub_filter,
                    "-c:v", "libx264", "-crf", "23", "-preset", "fast",
                    "-c:a", "copy",
                    subtitled_out,
                ], capture_output=True, timeout=300)
                if result.returncode == 0:
                    final_input = subtitled_out

        # Copy to final output
        shutil.copy2(final_input, out_path)

    return {"path": out_path, "filename": os.path.basename(out_path)}


@router.get("/export/{episode_id}/download")
def download_export(episode_id: str):
    """Download the previously exported MP4."""
    out_path = os.path.join(DATA_DIR, "exports", f"{episode_id}.mp4")
    if not os.path.exists(out_path):
        raise HTTPException(404, "导出文件不存在，请先导出")
    return FileResponse(
        out_path,
        media_type="video/mp4",
        filename=f"episode_{episode_id[:8]}.mp4",
    )


@router.get("/episode/{episode_id}/srt")
def get_srt(episode_id: str, db: Session = Depends(get_session)):
    """Return SRT subtitle file for the episode."""
    boards = (
        db.query(Board)
        .filter(Board.episode_id == episode_id)
        .order_by(Board.order_index)
        .all()
    )
    srt = _build_srt(boards)
    return Response(content=srt, media_type="text/plain; charset=utf-8",
                    headers={"Content-Disposition": f"attachment; filename=episode_{episode_id[:8]}.srt"})


@router.post("/upload-bgm")
async def upload_bgm(file: UploadFile = File(...)):
    """Upload a BGM audio file. Returns path for use in export."""
    bgm_dir = os.path.join(DATA_DIR, "bgm")
    os.makedirs(bgm_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "bgm.mp3")[1] or ".mp3"
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(bgm_dir, filename)

    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)

    return {"path": path, "filename": filename, "original_name": file.filename}


@router.post("/transcribe")
async def transcribe_audio(
    board_id: Optional[str] = Form(None),
    language: str = Form("zh"),
    model_size: str = Form("base"),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_session),
):
    """Transcribe board audio or an uploaded audio file using faster-whisper."""
    audio_path = None
    temp_file = None

    if board_id:
        board = db.query(Board).filter(Board.id == board_id).first()
        if not board:
            raise HTTPException(404, "Board not found")
        if not board.audio_path or not os.path.exists(board.audio_path):
            raise HTTPException(400, "该分镜暂无配音文件，请先生成配音")
        audio_path = board.audio_path
    elif file:
        suffix = os.path.splitext(file.filename or "audio.mp3")[1] or ".mp3"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp.write(await file.read())
        tmp.close()
        audio_path = tmp.name
        temp_file = tmp.name
    else:
        raise HTTPException(400, "需要提供 board_id 或上传音频文件")

    try:
        from services.whisper_svc import whisper_service
        result = whisper_service.transcribe(audio_path, language=language, model_size=model_size)
        return result
    except RuntimeError as e:
        raise HTTPException(500, str(e))
    finally:
        if temp_file and os.path.exists(temp_file):
            os.unlink(temp_file)


@router.post("/transcribe-episode")
async def transcribe_episode(
    episode_id: str,
    language: str = "zh",
    model_size: str = "base",
    db: Session = Depends(get_session),
):
    """Transcribe all board audio files in an episode and save dialogues."""
    boards = (
        db.query(Board)
        .filter(Board.episode_id == episode_id)
        .order_by(Board.order_index)
        .all()
    )

    try:
        from services.whisper_svc import whisper_service
    except Exception:
        raise HTTPException(500, "Whisper 服务不可用")

    results = []
    for b in boards:
        if not b.audio_path or not os.path.exists(b.audio_path):
            continue
        try:
            r = whisper_service.transcribe(b.audio_path, language=language, model_size=model_size)
            b.dialogue = r["text"]
            results.append({"board_id": b.id, "text": r["text"]})
        except Exception as e:
            results.append({"board_id": b.id, "error": str(e)})

    db.commit()
    return {"processed": len(results), "results": results}
