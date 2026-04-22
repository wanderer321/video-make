"""Whisper transcription service using faster-whisper."""
import os


def _sec_to_srt_time(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int((sec - int(sec)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


class WhisperService:
    _model = None
    _model_size = None

    def _load_model(self, model_size: str = "base"):
        if self._model is None or model_size != self._model_size:
            try:
                from faster_whisper import WhisperModel
            except ImportError:
                raise RuntimeError(
                    "faster-whisper 未安装。请运行：pip install faster-whisper"
                )
            self._model = WhisperModel(model_size, device="cpu", compute_type="int8")
            self._model_size = model_size
        return self._model

    def transcribe(self, audio_path: str, language: str = "zh", model_size: str = "base") -> dict:
        model = self._load_model(model_size)
        segments_iter, info = model.transcribe(
            audio_path, language=language or None, beam_size=5
        )

        segs = []
        srt_lines = []
        full_text_parts = []

        for i, seg in enumerate(segments_iter):
            text = seg.text.strip()
            segs.append({"start": seg.start, "end": seg.end, "text": text})
            full_text_parts.append(text)
            srt_lines += [
                str(i + 1),
                f"{_sec_to_srt_time(seg.start)} --> {_sec_to_srt_time(seg.end)}",
                text,
                "",
            ]

        return {
            "text": " ".join(full_text_parts),
            "language": info.language,
            "segments": segs,
            "srt": "\n".join(srt_lines),
        }


whisper_service = WhisperService()
