import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Download, Play, Pause, SkipBack, Volume2, Mic, Music,
  AlignLeft, ChevronRight, ChevronLeft, Film, Wand2, X,
  CheckCircle, AlertCircle, FileAudio,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";

const BACKEND = "http://localhost:17321";

interface BoardCard {
  id: string;
  order_index: number;
  has_image: boolean;
  has_video: boolean;
  has_audio: boolean;
  prompt?: string;
  shot_size?: string;
  camera_angle?: string;
  duration_sec: number;
  dialogue?: string;
  shot_id?: string;
}

interface Track {
  id: string;
  type: "video" | "audio" | "subtitle";
  label: string;
  color: string;
  clips: Clip[];
}

interface Clip {
  id: string;
  boardId?: string;
  label: string;
  startSec: number;
  durationSec: number;
  hasMedia: boolean;
}

const VOICES = [
  { id: "zh-CN-XiaoxiaoNeural", name: "晓晓 (女)" },
  { id: "zh-CN-YunxiNeural",    name: "云希 (男)" },
  { id: "zh-CN-XiaohanNeural",  name: "晓涵 (女)" },
  { id: "zh-CN-YunjianNeural",  name: "云健 (男)" },
  { id: "zh-CN-XiaoyiNeural",   name: "晓伊 (女)" },
];

function buildTracksFromBoards(boards: BoardCard[]): Track[] {
  let cursor = 0;
  const starts: number[] = [];

  const videoClips: Clip[] = boards.map((b) => {
    starts.push(cursor);
    const clip: Clip = {
      id: `v-${b.id}`,
      boardId: b.id,
      label: b.shot_id ?? `镜头${b.order_index + 1}`,
      startSec: cursor,
      durationSec: b.duration_sec,
      hasMedia: b.has_video || b.has_image,
    };
    cursor += b.duration_sec;
    return clip;
  });

  const audioClips: Clip[] = boards
    .map((b, i) => ({ b, start: starts[i] }))
    .filter(({ b }) => b.has_audio)
    .map(({ b, start }) => ({
      id: `a-${b.id}`,
      boardId: b.id,
      label: b.dialogue?.slice(0, 15) ?? `配音${b.order_index + 1}`,
      startSec: start,
      durationSec: b.duration_sec,
      hasMedia: true,
    }));

  const subtitleClips: Clip[] = boards
    .map((b, i) => ({ b, start: starts[i] }))
    .filter(({ b }) => b.dialogue)
    .map(({ b, start }) => ({
      id: `s-${b.id}`,
      boardId: b.id,
      label: b.dialogue!.slice(0, 20),
      startSec: start,
      durationSec: b.duration_sec,
      hasMedia: true,
    }));

  return [
    {
      id: "video",
      type: "video",
      label: "视频轨道",
      color: "#7c5ef5",
      clips: videoClips,
    },
    {
      id: "audio",
      type: "audio",
      label: "配音轨道",
      color: "#22c55e",
      clips: audioClips,
    },
    {
      id: "subtitle",
      type: "subtitle",
      label: "字幕轨道",
      color: "#f59e0b",
      clips: subtitleClips,
    },
    {
      id: "bgm",
      type: "audio",
      label: "背景音乐",
      color: "#06b6d4",
      clips: [],
    },
  ];
}

function TimelineRuler({ totalSec, pxPerSec }: { totalSec: number; pxPerSec: number }) {
  const marks: number[] = [];
  const step = totalSec > 120 ? 10 : totalSec > 60 ? 5 : 2;
  for (let t = 0; t <= totalSec; t += step) marks.push(t);

  return (
    <div className="relative h-6 border-b border-[--border-subtle] bg-[--bg-base] select-none shrink-0">
      {marks.map((t) => (
        <div
          key={t}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: t * pxPerSec }}
        >
          <div className="h-2 w-px bg-[--border]" />
          <span className="text-[9px] text-[--text-muted] mt-0.5">
            {t >= 60 ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}` : `${t}s`}
          </span>
        </div>
      ))}
    </div>
  );
}

function TimelineTrack({
  track,
  pxPerSec,
  selectedClipId,
  onSelectClip,
}: {
  track: Track;
  pxPerSec: number;
  selectedClipId: string | null;
  onSelectClip: (id: string) => void;
}) {
  return (
    <div className="flex h-12 border-b border-[--border-subtle] relative">
      {/* Track label */}
      <div className="w-28 shrink-0 flex items-center px-3 border-r border-[--border-subtle] bg-[--bg-elevated] z-10">
        <span className="text-[10px] text-[--text-muted] truncate">{track.label}</span>
      </div>

      {/* Clips area */}
      <div className="flex-1 relative overflow-hidden">
        {track.clips.map((clip) => (
          <button
            key={clip.id}
            onClick={() => onSelectClip(clip.id)}
            className={cn(
              "absolute top-1 bottom-1 rounded flex items-center px-1.5 overflow-hidden transition-all text-left",
              "border",
              selectedClipId === clip.id
                ? "border-white/60 ring-1 ring-white/30"
                : "border-transparent hover:border-white/20"
            )}
            style={{
              left: clip.startSec * pxPerSec,
              width: Math.max(clip.durationSec * pxPerSec - 1, 4),
              background: clip.hasMedia
                ? `${track.color}55`
                : `${track.color}22`,
              borderColor: selectedClipId === clip.id ? track.color : undefined,
            }}
          >
            {clip.hasMedia && (
              <div
                className="absolute inset-y-0 left-0 w-1 rounded-l"
                style={{ background: track.color }}
              />
            )}
            <span className="text-[9px] text-white/80 truncate pl-1.5 leading-tight">{clip.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ComposePage() {
  const [searchParams] = useSearchParams();
  const storeEpisodeId = useAppStore((s) => s.currentEpisodeId);
  const episodeId = searchParams.get("episode") ?? storeEpisodeId ?? "";

  const [boards, setBoards] = useState<BoardCard[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [pxPerSec, setPxPerSec] = useState(40);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [ttsPanel, setTtsPanel] = useState(false);
  const [ttsText, setTtsText] = useState("");
  const [ttsVoice, setTtsVoice] = useState("zh-CN-XiaoxiaoNeural");
  const [ttsSynth, setTtsSynth] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportResult, setExportResult] = useState<{ path?: string; error?: string } | null>(null);
  const [subtitlePanel, setSubtitlePanel] = useState(false);
  const [subtitleDraft, setSubtitleDraft] = useState("");
  const [subtitleSaving, setSubtitleSaving] = useState(false);
  const [bgmPath, setBgmPath] = useState<string>("");
  const [bgmName, setBgmName] = useState<string>("");
  const [bgmUploading, setBgmUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const bgmInputRef = useRef<HTMLInputElement>(null);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSec = boards.reduce((s, b) => s + b.duration_sec, 0);

  useEffect(() => {
    if (!episodeId) return;
    fetch(`${BACKEND}/api/boards/episode/${episodeId}`)
      .then(r => r.json())
      .then((data: BoardCard[]) => {
        setBoards(data);
        setTracks(buildTracksFromBoards(data));
      });
  }, [episodeId]);

  useEffect(() => {
    if (playing) {
      playRef.current = setInterval(() => {
        setCurrentSec(s => {
          if (s >= totalSec) {
            setPlaying(false);
            return 0;
          }
          return s + 0.1;
        });
      }, 100);
    } else {
      if (playRef.current) clearInterval(playRef.current);
    }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [playing, totalSec]);

  const handleSynthesizeTTS = async () => {
    if (!ttsText.trim()) return;
    setTtsSynth(true);
    try {
      const r = await fetch(`${BACKEND}/api/tts/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ttsText, voice: ttsVoice, provider: "auto" }),
      });
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } finally {
      setTtsSynth(false);
    }
  };

  const handleSaveSubtitle = async () => {
    if (!selectedBoard) return;
    setSubtitleSaving(true);
    try {
      await fetch(`${BACKEND}/api/boards/${selectedBoard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dialogue: subtitleDraft }),
      });
      setBoards(prev => prev.map(b => b.id === selectedBoard.id ? { ...b, dialogue: subtitleDraft } : b));
      setTracks(buildTracksFromBoards(
        boards.map(b => b.id === selectedBoard.id ? { ...b, dialogue: subtitleDraft } : b)
      ));
      setSubtitlePanel(false);
    } finally {
      setSubtitleSaving(false);
    }
  };

  const handleBgmUpload = async (file: File) => {
    setBgmUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${BACKEND}/api/compose/upload-bgm`, { method: "POST", body: fd });
      if (r.ok) {
        const data = await r.json();
        setBgmPath(data.path);
        setBgmName(data.original_name ?? file.name);
      }
    } finally {
      setBgmUploading(false);
    }
  };

  const handleTranscribeEpisode = async () => {
    if (!episodeId) return;
    setTranscribing(true);
    try {
      const r = await fetch(`${BACKEND}/api/compose/transcribe-episode?episode_id=${episodeId}&language=zh&model_size=base`, {
        method: "POST",
      });
      const data = await r.json();
      if (r.ok) {
        // Reload boards to get updated dialogues
        const br = await fetch(`${BACKEND}/api/boards/episode/${episodeId}`);
        const bdata: BoardCard[] = await br.json();
        setBoards(bdata);
        setTracks(buildTracksFromBoards(bdata));
      } else {
        alert(data.detail ?? "转录失败");
      }
    } finally {
      setTranscribing(false);
    }
  };

  const handleExport = async () => {
    if (!episodeId) return;
    setExportLoading(true);
    setExportResult(null);
    try {
      const r = await fetch(`${BACKEND}/api/compose/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: episodeId,
          include_subtitles: true,
          bgm_path: bgmPath || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setExportResult({ error: data.detail ?? "导出失败" });
      } else {
        setExportResult({ path: data.filename });
      }
    } catch (e) {
      setExportResult({ error: e instanceof Error ? e.message : "导出失败" });
    } finally {
      setExportLoading(false);
    }
  };

  const selectedClip = tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId);
  const selectedBoard = selectedClip?.boardId
    ? boards.find(b => b.id === selectedClip.boardId)
    : undefined;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[--border-subtle]">
        <div>
          <h1 className="text-lg font-bold text-[--text-primary]">后期合成</h1>
          <p className="text-xs text-[--text-muted] mt-0.5">
            {boards.length > 0
              ? `${boards.length} 个镜头 · 共 ${totalSec.toFixed(1)}s`
              : "视频拼接、配音、字幕、导出"}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* BGM upload */}
          <input
            ref={bgmInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleBgmUpload(f); e.target.value = ""; }}
          />
          <button
            onClick={() => bgmInputRef.current?.click()}
            disabled={bgmUploading}
            className={cn(
              "flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs border transition-colors",
              bgmPath
                ? "border-[--success]/40 bg-[--success]/10 text-[--success]"
                : "border-[--border] bg-[--bg-elevated] text-[--text-muted] hover:text-[--text-primary]"
            )}
            title={bgmPath ? `BGM: ${bgmName}` : "上传背景音乐"}
          >
            {bgmUploading ? <Music size={12} className="animate-pulse" /> : <Music size={12} />}
            {bgmPath ? bgmName.slice(0, 10) + (bgmName.length > 10 ? "…" : "") : "背景音乐"}
            {bgmPath && (
              <X size={10} onClick={(e: React.MouseEvent) => { e.stopPropagation(); setBgmPath(""); setBgmName(""); }} />
            )}
          </button>
          <Button variant="outline" size="sm" onClick={() => setTtsPanel(p => !p)} icon={<Mic size={13} />}>
            AI 配音
          </Button>
          <Button
            variant="outline"
            size="sm"
            loading={transcribing}
            onClick={handleTranscribeEpisode}
            disabled={!episodeId || boards.length === 0}
            icon={<FileAudio size={13} />}
          >
            自动字幕
          </Button>
          <Button
            size="sm"
            icon={<Download size={13} />}
            loading={exportLoading}
            onClick={handleExport}
            disabled={!episodeId || boards.length === 0}
          >
            导出 MP4
          </Button>
        </div>
      </div>

      {/* Export result banner */}
      {exportResult && (
        <div className={cn(
          "flex items-center gap-3 px-6 py-2.5 text-sm border-b",
          exportResult.error
            ? "bg-[--error]/10 border-[--error]/20 text-[--error]"
            : "bg-[--success]/10 border-[--success]/20 text-[--success]"
        )}>
          {exportResult.error
            ? <AlertCircle size={14} />
            : <CheckCircle size={14} />
          }
          {exportResult.error
            ? exportResult.error
            : (
              <>
                导出完成：{exportResult.path} ·&nbsp;
                <a
                  href={`${BACKEND}/api/compose/export/${episodeId}/download`}
                  className="underline hover:opacity-80"
                  download
                >
                  点击下载
                </a>
              </>
            )
          }
          <button onClick={() => setExportResult(null)} className="ml-auto opacity-60 hover:opacity-100">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Main timeline area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Preview strip */}
          <div className="h-36 bg-[--bg-base] border-b border-[--border-subtle] flex items-center justify-center relative">
            {boards.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <Film size={28} className="text-[--text-muted]" strokeWidth={1.5} />
                <div className="text-xs text-[--text-muted]">
                  {episodeId ? "该集暂无分镜数据" : "请先从分镜画板生成分镜图"}
                </div>
              </div>
            ) : (
              <>
                {/* Horizontal thumbnail strip */}
                <div className="flex gap-2 overflow-x-auto px-4 h-full items-center">
                  {boards.map((b, i) => (
                    <div
                      key={b.id}
                      onClick={() => setCurrentSec(boards.slice(0, i).reduce((s, x) => s + x.duration_sec, 0))}
                      className={cn(
                        "shrink-0 rounded-md overflow-hidden cursor-pointer transition-all border-2",
                        "w-20 h-28",
                        currentSec >= boards.slice(0, i).reduce((s, x) => s + x.duration_sec, 0) &&
                        currentSec < boards.slice(0, i + 1).reduce((s, x) => s + x.duration_sec, 0)
                          ? "border-[--accent] shadow-lg shadow-[--accent]/20"
                          : "border-transparent hover:border-[--border]"
                      )}
                      style={{ background: "var(--bg-elevated)" }}
                    >
                      {b.has_image ? (
                        <img
                          src={`${BACKEND}/api/boards/${b.id}/image`}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[10px] text-[--text-muted]">#{i + 1}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Playback position indicator */}
                <div className="absolute top-2 right-4 text-xs font-mono text-[--text-muted] bg-[--bg-elevated] px-2 py-1 rounded">
                  {currentSec.toFixed(1)}s / {totalSec.toFixed(1)}s
                </div>
              </>
            )}
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-[--border-subtle] bg-[--bg-surface]">
            <button
              onClick={() => setCurrentSec(0)}
              className="text-[--text-muted] hover:text-[--text-primary] transition-colors"
            >
              <SkipBack size={14} />
            </button>
            <button
              onClick={() => setPlaying(p => !p)}
              className="size-7 rounded-full bg-[--accent] text-white flex items-center justify-center hover:bg-[--accent-hover] transition-colors"
            >
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>

            {/* Scrubber */}
            <div className="flex-1 relative h-1.5 bg-[--bg-elevated] rounded-full cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                setCurrentSec(Math.max(0, Math.min(totalSec, ratio * totalSec)));
              }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-[--accent]"
                style={{ width: totalSec > 0 ? `${(currentSec / totalSec) * 100}%` : "0%" }}
              />
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-1 text-xs text-[--text-muted]">
              <button onClick={() => setPxPerSec(p => Math.max(10, p - 10))} className="hover:text-[--text-primary]">
                <ChevronLeft size={13} />
              </button>
              <span className="w-8 text-center">{pxPerSec}px</span>
              <button onClick={() => setPxPerSec(p => Math.min(120, p + 10))} className="hover:text-[--text-primary]">
                <ChevronRight size={13} />
              </button>
            </div>

            <Volume2 size={14} className="text-[--text-muted]" />
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-auto bg-[--bg-base]">
            {boards.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-xs text-[--text-muted]">时间轴将在分镜画板有内容后显示</div>
              </div>
            ) : (
              <div style={{ minWidth: totalSec * pxPerSec + 200 }}>
                {/* Ruler offset by track label width */}
                <div className="flex">
                  <div className="w-28 shrink-0 bg-[--bg-elevated] border-b border-r border-[--border-subtle] h-6" />
                  <div className="flex-1">
                    <TimelineRuler totalSec={totalSec} pxPerSec={pxPerSec} />
                  </div>
                </div>

                {/* Tracks */}
                {tracks.map((track) => (
                  <TimelineTrack
                    key={track.id}
                    track={track}
                    pxPerSec={pxPerSec}
                    selectedClipId={selectedClipId}
                    onSelectClip={setSelectedClipId}
                  />
                ))}

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-[--accent] pointer-events-none"
                  style={{
                    left: 112 + currentSec * pxPerSec,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right panel: clip inspector or TTS */}
        {(selectedClip || ttsPanel) && (
          <div className="w-64 border-l border-[--border-subtle] bg-[--bg-surface] flex flex-col overflow-hidden">
            {ttsPanel ? (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-[--border-subtle]">
                  <span className="text-sm font-medium text-[--text-primary]">AI 配音</span>
                  <button onClick={() => setTtsPanel(false)} className="text-[--text-muted] hover:text-[--text-primary]">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[--text-secondary]">音色</label>
                    <select
                      value={ttsVoice}
                      onChange={e => setTtsVoice(e.target.value)}
                      className="h-8 rounded-md px-2 text-xs bg-[--bg-elevated] border border-[--border] text-[--text-primary]"
                    >
                      {VOICES.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[--text-secondary]">台词文本</label>
                    <textarea
                      rows={6}
                      placeholder="输入要合成的台词文本..."
                      value={ttsText}
                      onChange={e => setTtsText(e.target.value)}
                      className={cn(
                        "w-full rounded-md px-3 py-2 text-xs resize-none",
                        "bg-[--bg-elevated] border border-[--border]",
                        "text-[--text-primary] placeholder:text-[--text-muted]",
                        "focus:border-[--accent] transition-colors outline-none"
                      )}
                    />
                  </div>

                  {selectedBoard?.dialogue && (
                    <button
                      onClick={() => setTtsText(selectedBoard.dialogue!)}
                      className="text-xs text-[--accent-hover] hover:underline text-left"
                    >
                      填入当前镜头台词
                    </button>
                  )}

                  <Button
                    onClick={handleSynthesizeTTS}
                    loading={ttsSynth}
                    icon={<Wand2 size={12} />}
                    size="sm"
                    className="w-full"
                    disabled={!ttsText.trim()}
                  >
                    {ttsSynth ? "合成中..." : "生成配音"}
                  </Button>

                  {audioUrl && (
                    <div className="rounded-lg bg-[--bg-elevated] border border-[--border] p-3">
                      <div className="text-xs text-[--text-muted] mb-2">预览</div>
                      <audio controls src={audioUrl} className="w-full h-8" />
                    </div>
                  )}
                </div>
              </>
            ) : selectedClip ? (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-[--border-subtle]">
                  <span className="text-sm font-medium text-[--text-primary]">片段属性</span>
                  <button onClick={() => setSelectedClipId(null)} className="text-[--text-muted] hover:text-[--text-primary]">
                    <X size={14} />
                  </button>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto">
                  <div>
                    <div className="text-xs text-[--text-muted] mb-1">名称</div>
                    <div className="text-sm text-[--text-primary]">{selectedClip.label}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[--text-muted] mb-1">时长</div>
                    <div className="text-sm text-[--text-primary]">{selectedClip.durationSec}s</div>
                  </div>
                  <div>
                    <div className="text-xs text-[--text-muted] mb-1">开始时间</div>
                    <div className="text-sm text-[--text-primary]">{selectedClip.startSec.toFixed(1)}s</div>
                  </div>
                  {selectedBoard && (
                    <>
                      {selectedBoard.shot_size && (
                        <div>
                          <div className="text-xs text-[--text-muted] mb-1">景别</div>
                          <div className="text-sm text-[--text-primary]">{selectedBoard.shot_size}</div>
                        </div>
                      )}
                      {selectedBoard.camera_angle && (
                        <div>
                          <div className="text-xs text-[--text-muted] mb-1">机位</div>
                          <div className="text-sm text-[--text-primary]">{selectedBoard.camera_angle}</div>
                        </div>
                      )}
                      {selectedBoard.dialogue && (
                        <div>
                          <div className="text-xs text-[--text-muted] mb-1">台词</div>
                          <div className="text-xs text-[--text-secondary] leading-relaxed">{selectedBoard.dialogue}</div>
                          <button
                            onClick={() => { setTtsText(selectedBoard.dialogue!); setTtsPanel(true); }}
                            className="mt-2 text-xs text-[--accent-hover] hover:underline flex items-center gap-1"
                          >
                            <Mic size={11} /> 生成配音
                          </button>
                        </div>
                      )}
                      {selectedBoard.prompt && (
                        <div>
                          <div className="text-xs text-[--text-muted] mb-1">画面描述</div>
                          <div className="text-xs text-[--text-secondary] leading-relaxed line-clamp-4">{selectedBoard.prompt}</div>
                        </div>
                      )}
                      {selectedBoard.has_image && (
                        <div>
                          <div className="text-xs text-[--text-muted] mb-1">预览图</div>
                          <img
                            src={`${BACKEND}/api/boards/${selectedBoard.id}/image`}
                            className="w-full rounded-md object-cover"
                            style={{ aspectRatio: "3/4" }}
                            alt=""
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div className="pt-2 border-t border-[--border-subtle] flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Music size={11} />}
                      className="flex-1 text-xs"
                      onClick={() => setTtsPanel(true)}
                    >
                      配音
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<AlignLeft size={11} />}
                      className="flex-1 text-xs"
                      onClick={() => {
                        setSubtitleDraft(selectedBoard?.dialogue ?? "");
                        setSubtitlePanel(true);
                      }}
                    >
                      字幕
                    </Button>
                  </div>

                  {/* Subtitle edit panel */}
                  {subtitlePanel && (
                    <div className="mt-2 space-y-2 border-t border-[--border-subtle] pt-2">
                      <label className="text-xs font-medium text-[--text-secondary]">编辑字幕</label>
                      <textarea
                        rows={3}
                        value={subtitleDraft}
                        onChange={e => setSubtitleDraft(e.target.value)}
                        className={cn(
                          "w-full rounded-md px-2 py-1.5 text-xs resize-none",
                          "bg-[--bg-elevated] border border-[--border]",
                          "text-[--text-primary] focus:border-[--accent] outline-none"
                        )}
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" className="flex-1 text-xs" loading={subtitleSaving} onClick={handleSaveSubtitle}>保存</Button>
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => setSubtitlePanel(false)}>取消</Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
