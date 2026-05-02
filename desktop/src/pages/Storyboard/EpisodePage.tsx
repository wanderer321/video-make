import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import {
  Wand2, Plus, Trash2, ChevronLeft, ChevronDown, ChevronUp, Expand, MessageSquare, Film, Image, Minus,
  AlertCircle, Sparkles, BookOpen, LayoutGrid, Check, RefreshCw, Settings, X, Layers, Play,
  ChevronRight, Mic, Volume2, Music
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, IMAGE_PROVIDERS, LLM_PROVIDERS, VIDEO_PROVIDERS } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useToast } from "@/components/ui/Toast";

const BACKEND = "http://localhost:17322";

interface Asset {
  id: string;
  type: string;
  name: string;
  prompt?: string;
  description?: string;
  has_image: boolean;
  tts_config?: {
    voice?: string;
    provider?: string;
    speed?: number;
    prompt?: string;
  };
}

interface Board {
  id: string;
  episode_id: string;
  order_index: number;
  prompt?: string;
  characters?: string[];
  scene_id?: string;
  duration_sec: number;
  dialogue?: string;
  notes?: string;
  gen_mode?: "image" | "video";
  reference_images?: {
    characters?: Array<{ name: string; assetId?: string | null }>;
    scene?: { name: string; assetId?: string | null };
  };
  has_video?: boolean;
  video_path?: string;
  audio_path?: string;
  image_provider?: string;
  video_provider?: string;
  // Shots (sub-shots for image mode)
  shots_count?: number;
  shots_generated?: number;
  shots?: ShotItem[];
}

interface ShotItem {
  id: string;
  order_index: number;
  prompt?: string;  // Chinese description for display
  prompt_en?: string;  // English prompt for image generation
  characters?: string[];  // Characters in this shot
  shot_size?: string;
  camera_angle?: string;
  duration_sec: number;
  has_image: boolean;
  image_path?: string;
}

interface Shot {
  shot_no: number;
  scene: string;
  characters: string[];
  action: string;
  dialogue: string;
  camera_type: string;
  shot_size: string;
  mood: string;
  duration_sec: number;
  prompt_en: string;
}

/* ── Reference Image Cell for each character/scene (compact) ── */
function ReferenceImageCell({
  name,
  assetId,
  assets,
  onUpdateAssetId,
  compact = false,
}: {
  name: string;
  assetId?: string | null;
  assets: Asset[];
  onUpdateAssetId: (newAssetId: string | null) => void;
  compact?: boolean;
}) {
  const asset = assets.find(a => a.id === assetId);
  const matchingAssets = assets.filter(a => a.name === name || a.name.includes(name) || name.includes(a.name));
  const otherAssets = assets.filter(a => !matchingAssets.includes(a));
  const allAssets = [...matchingAssets, ...otherAssets];
  const [showSelector, setShowSelector] = useState(false);

  const size = compact ? "size-10" : "size-16";

  return (
    <div className="relative">
      <div
        onClick={() => setShowSelector(true)}
        className={cn(
          "rounded border-2 border-[#3f3f46] bg-[#18181b] flex flex-col items-center justify-center cursor-pointer hover:border-[#6366f1]/50 overflow-hidden transition-all",
          size
        )}
      >
        {asset?.has_image ? (
          <img
            src={`${BACKEND}/api/assets/${asset.id}/image`}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className={cn("font-bold text-[#6366f1]", compact ? "text-xs" : "text-lg")}>
            {name.slice(0, compact ? 2 : 1)}
          </span>
        )}
      </div>

      {showSelector && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowSelector(false)} />
          <div className="absolute left-0 top-12 z-50 bg-[--bg-surface] border border-[--accent]/30 rounded-lg p-2 shadow-xl min-w-[180px] max-h-[240px] overflow-y-auto">
            <div className="text-xs text-[--text-muted] mb-1.5">选择参考图</div>
            {allAssets.length === 0 ? (
              <div className="text-xs text-[--text-muted] py-2">无可用资产</div>
            ) : (
              <div className="flex flex-col gap-1">
                {allAssets.slice(0, 5).map(a => (
                  <button
                    key={a.id}
                    onClick={() => { onUpdateAssetId(a.id); setShowSelector(false); }}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#27272a] transition-colors",
                      assetId === a.id && "bg-[#27272a]/20"
                    )}
                  >
                    {a.has_image && (
                      <img
                        src={`${BACKEND}/api/assets/${a.id}/image`}
                        alt={a.name}
                        className="size-8 rounded object-cover"
                      />
                    )}
                    <span className="text-xs text-[--text-secondary] truncate">{a.name}</span>
                    {assetId === a.id && <Check size={10} className="text-[--accent] ml-auto" />}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => { onUpdateAssetId(null); setShowSelector(false); }}
              className="text-xs text-[--text-muted] hover:text-[--error] mt-1 w-full text-center border-t border-[--border] pt-1"
            >
              清除
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Image Generation Modal ── */
function ImageGenerateModal({
  boardId,
  prompt,
  shotId,
  onComplete,
  onClose,
}: {
  boardId: string;
  prompt: string;
  shotId: string;
  onComplete: () => void;
  onClose: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("auto");

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");

    try {
      // Call backend to generate storyboard image
      const response = await fetch(`${BACKEND}/api/boards/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board_id: boardId,
          provider,
          width: 768,
          height: 1024,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "生成失败");
      }

      onComplete();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-[--bg-surface] border-2 border-[--accent]/30 rounded-xl max-w-[400px] w-full mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[--border]">
          <div className="flex items-center gap-3">
            <Layers size={18} className="text-[--accent]" />
            <span className="text-sm font-semibold text-[--text-primary]">分镜图生成</span>
            <Badge className="bg-[--bg-elevated] text-[--text-muted]">{shotId}</Badge>
          </div>
          <button onClick={onClose} className="text-[--text-muted] hover:text-[--text-primary]">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Provider selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[--text-muted]">生成模型：</span>
            <select
              value={provider}
              onChange={e => setProvider(e.target.value)}
              disabled={generating}
              className="h-7 rounded px-2 text-xs bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none disabled:opacity-50"
            >
              <option value="auto" className="bg-[#27272a] text-gray-200">自动选择</option>
              {Object.entries(IMAGE_PROVIDERS).map(([key, label]) => (
                <option key={key} value={key} className="bg-[#27272a] text-gray-200">{label}</option>
              ))}
            </select>
          </div>

          {/* Prompt preview */}
          <div className="rounded-lg bg-[--bg-elevated] border border-[--border] p-3">
            <div className="text-xs text-[--text-muted] mb-1">提示词</div>
            <div className="text-sm text-[--text-secondary] line-clamp-3">{prompt || "无提示词"}</div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-500/20 border border-red-500/30">
              <AlertCircle size={14} className="text-red-400" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          {/* Generating indicator */}
          {generating && (
            <div className="flex items-center justify-center gap-2 py-4">
              <RefreshCw size={16} className="text-[#6366f1] animate-spin" />
              <span className="text-xs text-[#818cf8]">正在生成...</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[--border] flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={!prompt}
            icon={<Wand2 size={14} />}
          >
            开始生成
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Prompt Detail Modal ── */
function PromptDetailModal({
  shot,
  onClose,
  onUpdate,
}: {
  shot: Board;
  onClose: () => void;
  onUpdate: (updates: Partial<Board>) => void;
}) {
  const [promptDraft, setPromptDraft] = useState(shot.prompt || "");
  const [notesDraft, setNotesDraft] = useState(shot.notes || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[--bg-surface] border-2 border-[--accent]/30 rounded-xl max-w-2xl w-full mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[--border]">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-[--accent-hover]">#{(shot.order_index || 0) + 1}</span>
            <span className="text-sm text-[--text-primary]">分镜详情</span>
          </div>
          <button onClick={onClose} className="text-[--text-muted] hover:text-[--text-primary]">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Video Prompt */}
          <div>
            <label className="text-xs font-semibold text-[--text-secondary] mb-2 block">视频生成提示词（英文）</label>
            <textarea
              rows={4}
              value={promptDraft}
              onChange={e => setPromptDraft(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm bg-[--bg-elevated] border border-[--border] text-[--text-primary] resize-none outline-none focus:border-[--accent]/50"
              placeholder="输入英文提示词，用于AI生成视频"
            />
          </div>

          {/* Notes / Scene Info */}
          <div>
            <label className="text-xs font-semibold text-[--text-secondary] mb-2 block">场景 / 动作 / 氛围</label>
            <textarea
              rows={2}
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm bg-[--bg-elevated] border border-[--border] text-[--text-primary] resize-none outline-none focus:border-[--accent]/50"
              placeholder="描述场景、动作、氛围等"
            />
          </div>

          {/* Dialogue */}
          {shot.dialogue && (
            <div>
              <label className="text-xs font-semibold text-[--text-secondary] mb-2 block">台词</label>
              <div className="text-sm text-[--text-muted] bg-[--bg-elevated] rounded-lg px-3 py-2 border border-[--border]">
                {shot.dialogue}
              </div>
            </div>
          )}

          {/* Quick info */}
          <div className="flex gap-4 text-xs text-[--text-muted]">
            <div>镜头：{shot.shot_size || "中景"}</div>
            <div>机位：{shot.camera_angle || "固定"}</div>
            <div>时长：{shot.duration_sec}s</div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[--border] flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={() => { onUpdate({ prompt: promptDraft, notes: notesDraft }); onClose(); }}>
            保存修改
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Segment Row (Board) with expandable Shots ── */
function SegmentRow({
  segment,
  index,
  assets,
  onUpdate,
  onDelete,
  onBreakdownShots,
  onGenerateShotImage,
  onGenerateVideo,
  onGenerateAllShots,
  onGenerateAudio,
  breakdownLoading,
  generatingShotId,
  generatingAllShots,
  generatingVideo,
  generatingAudio,
  videoStatus,
  onPlayVideo,
  voiceList,
  usedVoices,
  characterVoice,
}: {
  segment: Board;
  index: number;
  assets: Asset[];
  onUpdate: (updates: Partial<Board>) => void;
  onDelete: () => void;
  onBreakdownShots: () => void;
  onGenerateShotImage: (shotId: string) => void;
  onGenerateVideo: () => void;
  onGenerateAllShots: () => void;
  onGenerateAudio: (voiceOverride?: string) => void;
  breakdownLoading: boolean;
  generatingShotId: string | null;
  generatingAllShots: boolean;
  generatingVideo?: boolean;
  generatingAudio?: boolean;
  videoStatus?: string | null;
  onPlayVideo?: (boardId: string) => void;
  voiceList: Array<{ id: string; name: string; gender: string }>;
  usedVoices: Set<string>;
  characterVoice?: string;
}) {
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationDraft, setDurationDraft] = useState(String(segment.duration_sec));
  const [showShotsGallery, setShowShotsGallery] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string>(characterVoice || "Cherry");
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioButtonRef = useRef<HTMLButtonElement | null>(null);
  const videoButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleVoicePreview = async (voiceId: string) => {
    setSelectedVoice(voiceId);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewingVoice(true);
    try {
      const v = voiceList.find(x => x.id === voiceId);
      const previewText = v?.gender === "male"
        ? "大家好，我是一名男性配音演员，很高兴为您服务。"
        : "大家好，我是一名女性配音演员，很高兴为您服务。";
      const res = await fetch(`${BACKEND}/api/tts/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: previewText, voice: voiceId, provider: "auto" }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => { setPreviewingVoice(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setPreviewingVoice(false); URL.revokeObjectURL(url); };
      audio.play();
    } catch {
      setPreviewingVoice(false);
    }
  };

  const characterRefs = segment.reference_images?.characters || segment.characters?.map(c => ({ name: c, assetId: undefined as string | null | undefined })) || [];
  const characterAssets = assets.filter(a => a.type === "character");

  const handleUpdateReference = (charName: string, newAssetId: string | null) => {
    const currentRefs = segment.reference_images?.characters || [];
    const newRefs = currentRefs.map(r => r.name === charName ? { ...r, assetId: newAssetId } : r);
    onUpdate({ reference_images: { ...segment.reference_images, characters: newRefs } });
  };

  // Parse notes into scene/action/mood
  const parseNotes = (notes?: string) => {
    if (!notes) return { scene: "", action: "", mood: "" };
    const parts = notes.split("|").map(s => s.trim());
    return {
      scene: parts[0] || "",
      action: parts[1] || "",
      mood: parts[2] || "",
    };
  };
  const notesParsed = parseNotes(segment.notes);

  const shots = segment.shots || [];
  const hasShots = shots.length > 0;
  const allShotsGenerated = shots.length > 0 && shots.every(s => s.has_image);
  const someShotsGenerated = shots.some(s => s.has_image);
  const hasDialogue = segment.dialogue && segment.dialogue.trim().length > 0;
  const hasAudio = segment.audio_path && segment.audio_path.length > 0;

  return (
    <>
      {/* Main segment row */}
      <div className="flex items-center gap-2 py-3 px-3 border-b border-[#3f3f46] bg-[#18181b]/50 hover:bg-[#27272a]/80 transition-colors group relative">
        {/* Segment Number + Expand toggle */}
        <div className="flex-[0.06] flex items-center justify-center gap-0.5">
          <button
            className="text-[#6366f1] hover:text-[#818cf8] transition-colors"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "收起详情" : "展开详情"}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <div className="size-6 rounded bg-[#6366f1]/10 border border-[#6366f1] flex items-center justify-center">
            <span className="text-[10px] font-bold text-[#6366f1]">{index + 1}</span>
          </div>
        </div>

        {/* Characters Reference Images */}
        <div className="flex-[0.12]">
          <div className="flex gap-1 items-center flex-wrap">
            {characterRefs.slice(0, 2).map((c, i) => (
              <ReferenceImageCell
                key={i}
                name={c.name}
                assetId={c.assetId}
                assets={characterAssets}
                onUpdateAssetId={(newId) => handleUpdateReference(c.name, newId)}
                compact
              />
            ))}
            {characterRefs.length > 2 && (
              <div className="size-8 rounded bg-[--bg-elevated] border border-[--border] flex items-center justify-center">
                <span className="text-[10px] text-[--text-muted]">+{characterRefs.length - 2}</span>
              </div>
            )}
          </div>
        </div>

        {/* Prompt Preview */}
        <div className="flex-[0.9]">
          <button
            onClick={() => setShowPromptModal(true)}
            className="w-full text-left px-2 py-1 rounded bg-[--bg-elevated] border border-[--border] hover:border-[--accent]/50 hover:bg-[--bg-hover] transition-colors group"
          >
            <div className="flex items-center gap-1 mb-0.5">
              <MessageSquare size={10} className="text-[--text-muted] group-hover:text-[--accent]" />
              <span className="text-[10px] text-[--text-muted]">片段提示词</span>
            </div>
            <span className="text-xs text-[--text-secondary] line-clamp-1 leading-relaxed block">
              {segment.prompt || "点击编辑"}
            </span>
          </button>
        </div>

        {/* Duration */}
        <div className="flex-[0.05] flex justify-center">
          {editingDuration ? (
            <input
              type="number"
              min={1}
              max={60}
              value={durationDraft}
              onChange={e => setDurationDraft(e.target.value)}
              onBlur={() => { onUpdate({ duration_sec: Number(durationDraft) || 4 }); setEditingDuration(false); }}
              onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="w-full rounded px-1 text-center text-xs bg-[--bg-elevated] border border-[--accent]/30 text-[--text-primary] outline-none"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditingDuration(true)}
              className="px-1 py-0.5 rounded bg-[--bg-elevated] border border-[--border] text-xs text-[--text-muted] hover:text-[--text-primary] hover:border-[--accent]/50 transition-colors"
            >
              {segment.duration_sec}s
            </button>
          )}
        </div>

        {/* Gen Mode Toggle */}
        <div className="flex-[0.08] flex justify-center">
          <div className="inline-flex items-center rounded bg-[#3a3a48] p-0.5 gap-0.5 border border-[#4a4a58]">
            <button
              onClick={() => onUpdate({ gen_mode: "image" })}
              className={cn(
                "px-1.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1",
                segment.gen_mode !== "video"
                  ? "bg-[#0e7490] text-[#22d3ee]"
                  : "text-[#71717a] opacity-50 bg-transparent"
              )}
              title="分镜图模式"
            >
              <Image size={10} />
            </button>
            <button
              onClick={() => onUpdate({ gen_mode: "video" })}
              className={cn(
                "px-1.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1",
                segment.gen_mode === "video"
                  ? "bg-[#92400e] text-[#fbbf24]"
                  : "text-[#71717a] opacity-50 bg-transparent"
              )}
              title="直接视频模式"
            >
              <Film size={10} />
            </button>
          </div>
        </div>

        {/* Shots Preview / Status */}
        <div className="flex-[0.25] flex justify-center items-center gap-1">
          {segment.gen_mode === "video" ? (
            <div className="size-10 rounded bg-[--bg-elevated]/50 border border-[--border] flex flex-col items-center justify-center text-[--text-muted]">
              <Minus size={10} />
              <span className="text-[8px] mt-0.5">无需</span>
            </div>
          ) : hasShots ? (
            <div
              className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => hasShots && setShowShotsGallery(true)}
            >
              {shots.slice(0, 3).map((shot, i) => (
                <div
                  key={shot.id}
                  className={cn(
                    "size-8 rounded border overflow-hidden flex items-center justify-center",
                    shot.has_image ? "border-[#6366f1]/30" : "border-dashed border-[#3f3f46]"
                  )}
                >
                  {shot.has_image ? (
                    <img
                      src={`${BACKEND}/api/boards/shots/${shot.id}/image?t=${Date.now()}`}
                      alt={`镜头${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image size={10} className="text-gray-500" />
                  )}
                </div>
              ))}
              {shots.length > 3 && (
                <div className="size-8 rounded bg-[#27272a] border border-[#3f3f46] flex items-center justify-center">
                  <span className="text-[10px] text-gray-500">+{shots.length - 3}</span>
                </div>
              )}
              <span className="text-[10px] text-gray-400 ml-1">{segment.shots_generated}/{segment.shots_count}</span>
            </div>
          ) : (
            <button
              onClick={onBreakdownShots}
              disabled={breakdownLoading}
              className="px-2 py-1 rounded bg-[#6366f1]/20 border border-[#6366f1]/40 text-[#818cf8] text-[10px] hover:bg-[#6366f1]/30 transition-colors flex items-center gap-1"
            >
              {breakdownLoading ? <RefreshCw size={10} className="animate-spin" /> : <Layers size={10} />}
              拆镜头
            </button>
          )}
        </div>

        {/* Image Provider */}
        <div className="flex-[0.12] flex justify-center">
          <select
            value={segment.image_provider || ""}
            onChange={e => onUpdate({ image_provider: e.target.value })}
            className="h-6 rounded px-1 text-[10px] bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none w-full"
          >
            <option value="" className="bg-[#27272a]">默认</option>
            {Object.entries(IMAGE_PROVIDERS).map(([key, label]) => (
              <option key={key} value={key} className="bg-[#27272a]">{label}</option>
            ))}
          </select>
        </div>

        {/* Actions - Generate Button */}
        <div className="flex-[0.12]">
          {segment.gen_mode === "video" ? (
            <button
              ref={videoButtonRef}
              onClick={onGenerateVideo}
              disabled={!segment.prompt}
              className={cn(
                "w-full h-6 rounded font-semibold text-[10px] transition-all flex items-center justify-center gap-1",
                "bg-gradient-to-r from-[#fcd34d] to-[#f59e0b] text-white hover:from-[#fef3c7] hover:to-[#fcd34d] shadow shadow-[#f59e0b]/30",
                !segment.prompt && "opacity-40 bg-[#27272a] text-[#71717a]"
              )}
            >
              <Film size={10} />
              直接生成视频
            </button>
          ) : hasShots ? (
            allShotsGenerated ? (
              generatingVideo ? (
                <div className="w-full h-6 rounded font-semibold text-[10px] bg-gradient-to-r from-[#10b981]/50 to-[#059669]/50 text-white flex items-center justify-center gap-1">
                  <RefreshCw size={10} className="animate-spin" />
                  {videoStatus || "生成中..."}
                </div>
              ) : (
                <button
                  ref={videoButtonRef}
                  onClick={onGenerateVideo}
                  className="w-full h-6 rounded font-semibold text-[10px] bg-gradient-to-r from-[#10b981] to-[#059669] text-white shadow shadow-[#10b981]/30 flex items-center justify-center gap-1"
                >
                  <Play size={10} />
                  合并生成视频
                </button>
              )
            ) : (
              <button
                onClick={onGenerateAllShots}
                disabled={generatingAllShots}
                className={cn(
                  "w-full h-6 rounded font-semibold text-[10px] transition-all flex items-center justify-center gap-1",
                  "bg-gradient-to-r from-[#c4b5fd] to-[#a78bfa] text-white shadow shadow-[#8b5cf6]/30",
                  generatingAllShots && "opacity-70"
                )}
              >
                {generatingAllShots ? <RefreshCw size={10} className="animate-spin" /> : <Wand2 size={10} />}
                {generatingAllShots ? "生成中" : `生成${shots.length - segment.shots_generated}图`}
              </button>
            )
          ) : (
            <button
              onClick={onBreakdownShots}
              disabled={breakdownLoading || !segment.prompt}
              className={cn(
                "w-full h-6 rounded font-semibold text-[10px] transition-all flex items-center justify-center gap-1",
                "bg-gradient-to-r from-[#c4b5fd] to-[#a78bfa] text-white shadow shadow-[#8b5cf6]/30",
                !segment.prompt && "opacity-40 bg-[#27272a] text-[#71717a]",
                breakdownLoading && "opacity-70"
              )}
            >
              {breakdownLoading ? <RefreshCw size={10} className="animate-spin" /> : <Layers size={10} />}
              {breakdownLoading ? "拆解中" : "分镜图→视频"}
            </button>
          )}
        </div>

        {/* Video Provider */}
        <div className="flex-[0.12] flex justify-center">
          <select
            value={segment.video_provider || ""}
            onChange={e => onUpdate({ video_provider: e.target.value })}
            className="h-6 rounded px-1 text-[10px] bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none w-full"
          >
            <option value="" className="bg-[#27272a]">默认</option>
            {Object.entries(VIDEO_PROVIDERS).map(([key, label]) => (
              <option key={key} value={key} className="bg-[#27272a]">{label}</option>
            ))}
          </select>
        </div>

        {/* Video Result */}
        <div className="flex-[0.06] flex justify-center items-center">
          {segment.has_video ? (
            <button
              onClick={() => onPlayVideo?.(segment.id)}
              className="size-6 rounded bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center hover:bg-[#10b981]/30 transition-all hover:scale-105"
              title="播放视频"
            >
              <Play size={12} className="text-[#10b981] ml-0.5" />
            </button>
          ) : (
            <span className="text-[10px] text-[#3f3f46]">-</span>
          )}
        </div>
      </div>

      {/* Expanded Sub Rows (Notes + Dialogue) */}
      {expanded && (
        <>
          {/* Notes Sub Row */}
          <div className="flex items-center gap-2 py-2 px-3 border-b border-[#3f3f46]/50 bg-[#1a1a1f]/80">
            <div className="flex-[0.06] flex justify-center">
              <ChevronDown size={12} className="text-[#6366f1]/50" />
            </div>
            <div className="flex-[0.12]">
              <span className="text-[10px] text-[#6366f1]">场景/动作/氛围</span>
            </div>
            <div className="flex-[0.9] flex items-center gap-2">
              {notesParsed.scene && (
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-gray-200 border border-white/20">
                  📍 {notesParsed.scene}
                </span>
              )}
              {notesParsed.action && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-[10px] text-cyan-300 border border-cyan-500/20">
                  🎬 {notesParsed.action}
                </span>
              )}
              {notesParsed.mood && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-[10px] text-purple-300 border border-purple-500/20">
                  ✨ {notesParsed.mood}
                </span>
              )}
              {!notesParsed.scene && !notesParsed.action && !notesParsed.mood && (
                <span className="text-[10px] text-gray-500">暂无信息</span>
              )}
            </div>
            {/* Empty columns for alignment */}
            <div className="flex-[0.05]" />
            <div className="flex-[0.08]" />
            <div className="flex-[0.25]" />
            <div className="flex-[0.12]" />
            <div className="flex-[0.12]" />
            <div className="flex-[0.12]" />
            <div className="flex-[0.06]" />
          </div>

          {/* Dialogue Sub Row */}
          <div className="flex items-center gap-2 py-2 px-3 border-b border-[#3f3f46]/50 bg-[#1a1a1f]/80 relative">
            <div className="flex-[0.06]" />
            <div className="flex-[0.12]">
              <span className="text-[10px] text-yellow-400/80">台词</span>
            </div>
            <div className="flex-[0.9]">
              <div className="text-xs text-gray-300 line-clamp-2 bg-[#27272a] rounded px-2 py-1 border border-[#3f3f46]">
                {hasDialogue ? segment.dialogue : "暂无台词"}
              </div>
            </div>
            <div className="flex-[0.05]" />
            <div className="flex-[0.08]" />
            {/* Audio Generate Button + Audio player in 分镜图/音频 column */}
            <div className="flex-[0.25] flex items-center justify-center gap-1">
              {hasDialogue ? (
                generatingAudio ? (
                  <div className="h-5 px-2 rounded bg-[#22d3ee]/20 flex items-center gap-1">
                    <RefreshCw size={10} className="text-[#22d3ee] animate-spin" />
                    <span className="text-[10px] text-[#22d3ee]">生成中</span>
                  </div>
                ) : (
                  <>
                    {/* Voice selector */}
                    {characterVoice ? (
                      <div className="h-5 px-1.5 rounded bg-[#22d3ee]/10 border border-[#22d3ee]/20 flex items-center" title={`角色音色: ${characterVoice}`}>
                        <span className="text-[9px] text-[#22d3ee]/70 truncate max-w-[60px]">{characterVoice}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        <select
                          value={selectedVoice}
                          onChange={e => handleVoicePreview(e.target.value)}
                          className="h-5 text-[9px] bg-[#27272a] text-gray-300 border border-[#3f3f46] rounded px-0.5 max-w-[110px] focus:outline-none focus:border-[#22d3ee]/50"
                          title="选择音色（选择后自动试听）"
                        >
                          {voiceList
                            .filter(v => !usedVoices.has(v.id))
                            .map(v => (
                              <option key={v.id} value={v.id}>
                                {v.id}-{v.name.split(" - ")[1] || ""}({v.gender === "male" ? "男" : "女"})
                              </option>
                            ))
                          }
                        </select>
                        {previewingVoice && (
                          <Volume2 size={10} className="text-[#22d3ee] animate-pulse flex-shrink-0" />
                        )}
                      </div>
                    )}
                    {hasAudio ? (
                      <>
                        <audio
                          ref={audioRef}
                          src={`${BACKEND}/api/boards/${segment.id}/audio`}
                          onEnded={() => setIsPlayingAudio(false)}
                          className="hidden"
                        />
                        <button
                          onClick={() => {
                            if (isPlayingAudio) {
                              audioRef.current?.pause();
                              setIsPlayingAudio(false);
                            } else {
                              audioRef.current?.play();
                              setIsPlayingAudio(true);
                            }
                          }}
                          className="size-5 rounded-full bg-[#22d3ee]/20 border border-[#22d3ee]/30 flex items-center justify-center hover:bg-[#22d3ee]/30 transition-colors"
                          title={isPlayingAudio ? "暂停" : "播放音频"}
                        >
                          {isPlayingAudio ? <X size={9} className="text-[#22d3ee]" /> : <Play size={9} className="text-[#22d3ee] ml-0.5" />}
                        </button>
                        <button
                          onClick={() => onGenerateAudio(characterVoice || selectedVoice)}
                          className="size-5 rounded bg-[#22d3ee]/10 border border-[#22d3ee]/20 flex items-center justify-center hover:bg-[#22d3ee]/20 transition-colors"
                          title="重新生成音频"
                        >
                          <RefreshCw size={9} className="text-[#22d3ee]" />
                        </button>
                      </>
                    ) : (
                      <button
                        ref={audioButtonRef}
                        onClick={() => onGenerateAudio(characterVoice || selectedVoice)}
                        className="h-5 px-2 rounded bg-[#22d3ee]/20 border border-[#22d3ee]/30 flex items-center gap-1 hover:bg-[#22d3ee]/30 transition-colors"
                        title="生成台词音频"
                      >
                        <Mic size={10} className="text-[#22d3ee]" />
                        <span className="text-[10px] text-[#22d3ee]">生成</span>
                      </button>
                    )}
                  </>
                )
              ) : (
                <span className="text-[10px] text-gray-500">-</span>
              )}
            </div>
            <div className="flex-[0.12]" />
            <div className="flex-[0.12]" />
            <div className="flex-[0.12]" />
            <div className="flex-[0.06]" />
          </div>

          {/* SVG Connection Line (from audio button to video button) */}
          {hasAudio && (
            <svg
              className="absolute left-0 top-0 w-full h-full pointer-events-none z-10"
              style={{ overflow: "visible" }}
            >
              <defs>
                <linearGradient id={`audioLineGrad-${segment.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <filter id={`audioLineGlow-${segment.id}`}>
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Calculate connection from audioButtonRef to videoButtonRef */}
              {audioButtonRef.current && videoButtonRef.current && (
                <path
                  d={`M ${audioButtonRef.current.getBoundingClientRect().right} ${audioButtonRef.current.getBoundingClientRect().top + audioButtonRef.current.getBoundingClientRect().height / 2}
                      C ${audioButtonRef.current.getBoundingClientRect().right + 40} ${audioButtonRef.current.getBoundingClientRect().top + audioButtonRef.current.getBoundingClientRect().height / 2},
                        ${videoButtonRef.current.getBoundingClientRect().left - 40} ${videoButtonRef.current.getBoundingClientRect().top + videoButtonRef.current.getBoundingClientRect().height / 2},
                        ${videoButtonRef.current.getBoundingClientRect().left} ${videoButtonRef.current.getBoundingClientRect().top + videoButtonRef.current.getBoundingClientRect().height / 2}`}
                  stroke={`url(#audioLineGrad-${segment.id})`}
                  strokeWidth="2"
                  fill="none"
                  filter={`url(#audioLineGlow-${segment.id})`}
                  strokeDasharray="6 4"
                  className="animate-dash"
                />
              )}
            </svg>
          )}
        </>
      )}

      {/* Expanded Shots Grid */}
      {expanded && segment.gen_mode === "image" && hasShots && (
        <div className="bg-[#232329] border-b border-[#3f3f46] px-6 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={12} className="text-[#818cf8]" />
            <span className="text-xs font-medium text-gray-300">{shots.length} 个镜头</span>
            <button
              onClick={() => setExpanded(false)}
              className="ml-auto text-xs text-gray-500 hover:text-gray-300"
            >
              收起 <ChevronUp size={12} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {shots.map((shot, i) => (
              <ShotCard
                key={shot.id}
                shot={shot}
                index={i}
                onGenerate={() => onGenerateShotImage(shot.id)}
                generating={generatingShotId === shot.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Prompt Detail Modal */}
      {showPromptModal && (
        <PromptDetailModal
          shot={segment}
          onClose={() => setShowPromptModal(false)}
          onUpdate={onUpdate}
        />
      )}

      {/* Shots Gallery Modal */}
      {showShotsGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowShotsGallery(false)} />
          <div className="relative bg-[#18181b] border-2 border-[#6366f1]/30 rounded-xl max-w-4xl w-full mx-4 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#3f3f46]">
              <div className="flex items-center gap-3">
                <Layers size={18} className="text-[#6366f1]" />
                <span className="text-sm font-semibold text-gray-200">片段 #{index + 1} 镜头预览</span>
                <span className="text-xs text-gray-500 bg-[#27272a] px-2 py-0.5 rounded">{shots.length} 张</span>
              </div>
              <button onClick={() => setShowShotsGallery(false)} className="text-gray-500 hover:text-gray-300">
                <X size={20} />
              </button>
            </div>

            {/* Images Grid */}
            <div className="p-5">
              <div className="grid grid-cols-4 gap-4">
                {shots.map((shot, i) => (
                  <div key={shot.id} className="relative group/shot">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-[#232329] border border-[#3f3f46]">
                      {shot.has_image ? (
                        <img
                          src={`${BACKEND}/api/boards/shots/${shot.id}/image?t=${Date.now()}`}
                          alt={`镜头${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image size={24} className="text-gray-500" />
                        </div>
                      )}
                    </div>
                    {/* Shot info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#818cf8]">#{i + 1}</span>
                        <span className="text-xs text-gray-400">{shot.shot_size || "中景"}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{shot.duration_sec}s</div>
                    </div>
                    {/* Hover tooltip for full prompt */}
                    {shot.prompt && (
                      <div className="absolute inset-0 bg-black/90 flex flex-col p-2 opacity-0 group-hover/shot:opacity-100 transition-opacity z-10">
                        <div className="text-xs text-[#818cf8] mb-1 font-medium">#{i + 1} 分镜提示词</div>
                        <p className="text-xs text-gray-300 flex-1 overflow-y-auto whitespace-pre-wrap">{shot.prompt}</p>
                        {shot.prompt_en && (
                          <div className="mt-1 pt-1 border-t border-[#3f3f46]">
                            <p className="text-xs text-gray-400 overflow-y-auto max-h-20">{shot.prompt_en}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Segment prompt preview */}
              {segment.prompt && (
                <div className="mt-4 p-3 rounded-lg bg-[#232329] border border-[#3f3f46]">
                  <div className="text-xs text-gray-500 mb-1">片段提示词</div>
                  <div className="text-sm text-gray-300 line-clamp-2">{segment.prompt}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#3f3f46] flex justify-between items-center">
              <div className="text-xs text-gray-500">
                已生成 {segment.shots_generated}/{segment.shots_count} 张
              </div>
              <div className="flex items-center gap-3">
                {/* Generate all shots button */}
                {segment.shots_generated < segment.shots_count && (
                  <button
                    onClick={() => {
                      setShowShotsGallery(false);
                      onGenerateAllShots();
                    }}
                    disabled={generatingAllShots}
                    className="text-xs text-[#818cf8] hover:text-[#6366f1] flex items-center gap-1 disabled:opacity-50"
                  >
                    {generatingAllShots ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Wand2 size={12} />
                    )}
                    {generatingAllShots ? "生成中..." : "生成全部图片"}
                  </button>
                )}
                <button
                  onClick={() => {
                    // Don't close gallery, let user see loading state
                    onBreakdownShots();
                  }}
                  disabled={breakdownLoading}
                  className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 disabled:opacity-50"
                >
                  {breakdownLoading ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Layers size={12} />
                  )}
                  {breakdownLoading ? "拆解中..." : "重新拆镜头"}
                </button>
                <button
                  onClick={() => { setShowShotsGallery(false); setExpanded(true); }}
                  className="text-xs text-[#818cf8] hover:text-[#6366f1] flex items-center gap-1"
                >
                  <ChevronDown size={12} />
                  展开编辑
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Shot Card for expanded view ── */
function ShotCard({
  shot,
  index,
  onGenerate,
  generating,
}: {
  shot: ShotItem;
  index: number;
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <div className="rounded-lg border border-[#3f3f46] bg-[#18181b] overflow-hidden">
      {/* Shot header */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-[#27272a] border-b border-[#3f3f46]">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono font-bold text-[#818cf8]">#{index + 1}</span>
          <span className="text-xs text-gray-400">{shot.shot_size || "中景"}</span>
        </div>
        <span className="text-xs text-gray-500">{shot.duration_sec}s</span>
      </div>

      {/* Shot image */}
      <div className="aspect-[3/4] bg-[#232329] flex items-center justify-center relative">
        {shot.has_image ? (
          <img
            src={`${BACKEND}/api/boards/shots/${shot.id}/image?t=${Date.now()}`}
            alt={`镜头${index + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500">
            <Image size={20} />
            <span className="text-xs mt-1">待生成</span>
          </div>
        )}
        {generating && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <RefreshCw size={16} className="text-[#818cf8] animate-spin" />
          </div>
        )}
      </div>

      {/* Shot actions */}
      <div className="px-2 py-1.5 border-t border-[#3f3f46]">
        <button
          onClick={onGenerate}
          disabled={!shot.prompt || generating}
          className={cn(
            "w-full h-6 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors",
            shot.has_image
              ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30"
              : "bg-[#6366f1]/20 text-[#818cf8] border border-[#6366f1]/30 hover:bg-[#6366f1]/30",
            (!shot.prompt || generating) && "opacity-50"
          )}
        >
          {generating ? (
            <RefreshCw size={10} className="animate-spin" />
          ) : shot.has_image ? (
            <Check size={10} />
          ) : (
            <Wand2 size={10} />
          )}
          {shot.has_image ? "已生成" : "生成"}
        </button>
      </div>

      {/* Prompt preview with hover tooltip */}
      {shot.prompt && (
        <div className="px-2 pb-2 relative group/prompt">
          <p className="text-xs text-gray-400 line-clamp-2 cursor-help">{shot.prompt}</p>
          {/* Hover tooltip showing full prompt */}
          <div className="absolute left-0 right-0 bottom-full mb-1 hidden group-hover/prompt:block z-20">
            <div className="bg-[#27272a] border border-[#6366f1]/30 rounded-lg p-2 shadow-lg max-h-60 overflow-y-auto">
              <div className="text-xs text-[#818cf8] mb-1 font-medium">分镜提示词（中文）：</div>
              <p className="text-xs text-gray-300 whitespace-pre-wrap">{shot.prompt}</p>
              {shot.prompt_en && (
                <div className="mt-2 pt-2 border-t border-[#3f3f46]">
                  <div className="text-xs text-gray-500 mb-1">英文生图提示词：</div>
                  <p className="text-xs text-gray-400 whitespace-pre-wrap">{shot.prompt_en}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── AI Breakdown Progress Panel ── */
function AiBreakdownPanel({
  episodeId,
  episode,
  projectId,
  assets,
  onComplete,
  onClose,
}: {
  episodeId: string;
  episode: { episode_no: number; title: string } | null;
  projectId: string;
  assets: Asset[];
  onComplete: (shots: Shot[]) => void;
  onClose: () => void;
}) {
  const [llmProvider, setLlmProvider] = useState("auto");
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedShots, setGeneratedShots] = useState<Shot[]>([]);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState("");
  const { error: toastError } = useToast();

  useEffect(() => {
    fetch(`${BACKEND}/api/settings/configured`)
      .then(r => r.json())
      .then((data: { configured: string[] }) => {
        const providers = data.configured ?? [];
        setConfiguredProviders(providers);
        const llmKeys = Object.keys(LLM_PROVIDERS);
        const firstConfigured = llmKeys.find(k => providers.includes(k));
        if (firstConfigured) setLlmProvider(firstConfigured);
      })
      .catch(() => {});
  }, []);

  const handleStart = async () => {
    if (llmProvider !== "auto" && !configuredProviders.includes(llmProvider)) {
      setError("所选模型未配置");
      return;
    }
    setGenerating(true);
    setError("");
    setGeneratedShots([]);
    setStreamText("");

    try {
      // Get project data with breakdown result
      const projectRes = await fetch(`${BACKEND}/api/projects/${projectId}`);
      const project = await projectRes.json();
      const breakdown = project.breakdown_result;

      // Find the specific episode data from breakdown
      const episodeData = breakdown?.episodes?.find(
        (e: any) => e.episode_no === episode?.episode_no
      );

      // Use specific episode outline or fallback to entire breakdown
      const episodeOutline = episodeData
        ? JSON.stringify({
            episode_no: episodeData.episode_no,
            title: episodeData.title,
            summary: episodeData.summary,
            hook: episodeData.hook,
            key_shots: episodeData.key_shots,
            characters: breakdown?.characters,
            worldview: breakdown?.worldview,
          })
        : JSON.stringify(breakdown);

      // Get character refs from assets
      const characters = assets
        .filter(a => a.type === "character")
        .map(a => ({ name: a.name, prompt: a.prompt, description: a.description }));
      const scenes = assets
        .filter(a => a.type === "scene")
        .map(a => ({ name: a.name, prompt: a.prompt, description: a.description }));

      // Call storyboard-script API with specific episode outline
      const response = await fetch(`${BACKEND}/api/scripts/storyboard-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: episodeId || "",
          episode_outline: episodeOutline,
          style: "漫剧",
          characters,
          scenes,
          llm_provider: llmProvider,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "生成失败");
      }

      const data = await response.json();
      const shots = data.shots || [];

      // Simulate progressive display
      for (let i = 0; i < shots.length; i++) {
        await new Promise(r => setTimeout(r, 100));
        setGeneratedShots(prev => [...prev, shots[i]]);
        setStreamText(`镜头 ${i + 1}/${shots.length} 已生成`);
      }

      onComplete(shots);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
      toastError(e instanceof Error ? e.message : "AI拆分镜失败，请检查配置");
    } finally {
      setGenerating(false);
      setStreamText("");
    }
  };

  return (
    <div className="rounded-xl border-2 border-[--accent] bg-gradient-to-r from-[--accent-dim]/50 to-transparent p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="size-8 rounded-full bg-[--bg-elevated] flex items-center justify-center">
          <Sparkles size={16} className="text-[--text-primary]" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-[--text-primary]">AI 拆分镜</div>
          <div className="text-xs text-[--text-muted]">自动从剧本生成分镜头提示词</div>
        </div>
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">💰 积分消耗</Badge>
      </div>

      {/* LLM selector */}
      <div className="flex items-center gap-2 mb-3">
        <select
          value={llmProvider}
          onChange={e => setLlmProvider(e.target.value)}
          disabled={generating}
          className="h-7 rounded px-2 text-xs bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none disabled:opacity-50"
        >
          <option value="auto" className="bg-[#27272a] text-gray-200">自动选择</option>
          {Object.entries(LLM_PROVIDERS).map(([key, label]) => {
            const isConfigured = configuredProviders.includes(key);
            return (
              <option key={key} value={key} className="bg-[#27272a] text-gray-200">
                {label} {isConfigured ? "✓" : "(未配置)"}
              </option>
            );
          })}
        </select>
        <Button
          variant="ghost"
          size="sm"
          icon={<Settings size={12} />}
          onClick={() => window.open("/settings", "_blank")}
        >
          配置
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-500/20 border border-red-500/30 mb-3">
          <AlertCircle size={12} className="text-red-400" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}

      {/* Progress */}
      {generating && (
        <div className="mb-3">
          <div className="text-xs text-[--accent-hover] mb-1">{streamText}</div>
          <div className="h-1 rounded-full bg-[--bg-elevated] overflow-hidden">
            <div className="h-full bg-[--accent] animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {/* Generated shots preview */}
      {generatedShots.length > 0 && (
        <div className="max-h-32 overflow-y-auto border border-[--border] rounded bg-[--bg-surface] p-2 mb-3">
          <div className="text-xs text-[--text-muted] mb-1">已生成 {generatedShots.length} 个镜头</div>
          <div className="space-y-1">
            {generatedShots.map((shot, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-[--bg-elevated]">
                <span className="text-xs font-mono text-[--accent]">#{shot.shot_no}</span>
                <span className="text-xs text-[--text-secondary] truncate">{shot.prompt_en?.slice(0, 40)}...</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={generating}>
          取消
        </Button>
        <Button
          size="sm"
          icon={<Wand2 size={14} />}
          loading={generating}
          onClick={handleStart}
        >
          开始拆解
        </Button>
      </div>
    </div>
  );
}

/* ── Main Episode Page ── */
export function EpisodePage() {
  const [params] = useSearchParams();
  const { episodeId } = useParams<{ episodeId: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const storeProjectId = useAppStore((s) => s.currentProjectId);
  const projectId = params.get("project") ?? storeProjectId ?? "";

  const [episode, setEpisode] = useState<{ id: string; episode_no: number; title: string; script_content?: string } | null>(null);
  const [project, setProject] = useState<{ name: string; breakdown_result?: any } | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAiBreakdown, setShowAiBreakdown] = useState(false);
  const [showGenConfig, setShowGenConfig] = useState(false);  // 生成配置浮层
  const [imageProvider, setImageProvider] = useState("kling_image");  // 图像模型默认可灵
  const [compositeVideoProvider, setCompositeVideoProvider] = useState("jimeng_video_v30");  // 分镜生视频：即梦-视频生成-3.0
  const [directVideoProvider, setDirectVideoProvider] = useState("jimeng_seedance");  // 直接生视频：即梦-seedance2.0
  const [generatingBoardId, setGeneratingBoardId] = useState<string | null>(null);
  const [videoTaskId, setVideoTaskId] = useState<string | null>(null);
  const [videoTaskStatus, setVideoTaskStatus] = useState<string | null>(null);
  const [breakdownLoadingId, setBreakdownLoadingId] = useState<string | null>(null);
  const [generatingShotId, setGeneratingShotId] = useState<string | null>(null);
  const [generatingAllShotsId, setGeneratingAllShotsId] = useState<string | null>(null);
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
  const [videoModalBoardId, setVideoModalBoardId] = useState<string | null>(null);

  // Voice list for dropdown
  const qwen3Voices: Array<{ id: string; name: string; gender: string }> = [
    { id: "Cherry", name: "Cherry - 阳光积极小姐姐", gender: "female" },
    { id: "Serena", name: "Serena - 温柔小姐姐", gender: "female" },
    { id: "Ethan", name: "Ethan - 阳光温暖活力", gender: "male" },
    { id: "Chelsie", name: "Chelsie - 二次元女友", gender: "female" },
    { id: "Momo", name: "Momo - 撒娇搞怪", gender: "female" },
    { id: "Vivian", name: "Vivian - 可爱小暴躁", gender: "female" },
    { id: "Moon", name: "Moon - 率性帅气", gender: "male" },
    { id: "Maia", name: "Maia - 知性温柔", gender: "female" },
    { id: "Kai", name: "Kai - 耳朵SPA", gender: "male" },
    { id: "Nofish", name: "Nofish - 设计师", gender: "male" },
    { id: "Bella", name: "Bella - 小萝莉", gender: "female" },
    { id: "Eldric Sage", name: "Eldric Sage - 沉稳老者", gender: "male" },
    { id: "Mia", name: "Mia - 温顺乖巧", gender: "female" },
    { id: "Mochi", name: "Mochi - 聪明小大人", gender: "male" },
    { id: "Bellona", name: "Bellona - 洪亮清晰", gender: "female" },
    { id: "Vincent", name: "Vincent - 沙哑烟嗓", gender: "male" },
    { id: "Bunny", name: "Bunny - 萌萝莉", gender: "female" },
    { id: "Neil", name: "Neil - 新闻主持人", gender: "male" },
    { id: "Elias", name: "Elias - 知识讲师", gender: "female" },
    { id: "Arthur", name: "Arthur - 质朴老者", gender: "male" },
    { id: "Nini", name: "Nini - 软黏嗓音", gender: "female" },
    { id: "Seren", name: "Seren - 温和舒缓", gender: "female" },
    { id: "Pip", name: "Pip - 调皮童真", gender: "male" },
    { id: "Stella", name: "Stella - 甜腻少女", gender: "female" },
  ];

  // Compute voices already used by character assets (locked, not selectable by others)
  const usedVoices = new Set(
    assets
      .filter(a => a.type === "character" && a.tts_config?.voice)
      .map(a => a.tts_config!.voice!)
  );

  // Get character voice for a specific board
  const getCharacterVoice = (board: Board): string | undefined => {
    if (!board.characters || assets.length === 0) return undefined;
    const charAsset = assets.find(
      a => a.type === "character" && board.characters!.includes(a.name) && a.tts_config?.voice
    );
    return charAsset?.tts_config?.voice;
  };

  // Service configuration status
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const videoProvidersRequired = ["kling_video", "vidu", "jimeng_video_v30", "jimeng_seedance"]; // keling/Vidu/即梦3.0/Seedance
  const imageProvidersRequired = ["stability", "kling_image", "jimeng_image", "fal", "comfyui", "sdwebui"];

  // Check configured providers
  useEffect(() => {
    fetch(`${BACKEND}/api/settings/configured`)
      .then(r => r.json())
      .then((data: { configured: string[] }) => {
        setConfiguredProviders(data.configured ?? []);
      })
      .catch(() => {});
  }, []);

  // Check if any image/video provider is configured
  const allVideoConfigured = videoProvidersRequired.every(p => configuredProviders.includes(p));
  const anyImageConfigured = imageProvidersRequired.some(p => configuredProviders.includes(p));

  // Load data
  useEffect(() => {
    if (!episodeId || !projectId) return;
    setLoading(true);

    Promise.all([
      fetch(`${BACKEND}/api/projects/${projectId}`).then(r => r.json()),
      fetch(`${BACKEND}/api/boards/episode/${episodeId}`).then(r => r.json()),
      fetch(`${BACKEND}/api/assets/project/${projectId}`).then(r => r.json()),
    ])
      .then(([proj, boardsData, assetsData]) => {
        setProject(proj);
        setBoards(boardsData);
        setAssets(assetsData);
        // Find episode info
        const ep = proj.episodes?.find((e: any) => e.id === episodeId);
        if (ep) setEpisode(ep);
      })
      .catch(() => toastError("加载失败"))
      .finally(() => setLoading(false));
  }, [episodeId, projectId]);

  // Match reference images from assets
  const matchReferenceImages = (shot: Shot): Board => {
    const characterRefs = shot.characters?.map(charName => {
      const asset = assets.find(a => a.type === "character" && (a.name === charName || a.name.includes(charName)));
      return { name: charName, assetId: asset?.id };
    }) || [];

    // Auto-recommend gen_mode based on shot content
    const _recommendGenMode = (s: Shot): "image" | "video" => {
      const action = (s.action || "").trim();
      const dialogue = (s.dialogue || "").trim();
      const mood = (s.mood || "").trim();
      const camera = (s.camera_type || "").trim();
      const shotSize = (s.shot_size || "").trim();

      const hasAction = action.length > 8;
      const hasDialogue = dialogue.length > 0;
      const isDynamic = ["推进", "拉远", "摇镜", "跟拍", "环绕", "升降"].includes(camera);
      const isCloseUp = ["特写", "近景"].includes(shotSize);
      const isActionMood = ["紧张", "激烈", "悬疑", "震撼"].includes(mood);
      const isStatic = ["固定", ""].includes(camera);
      const isWide = ["全景", "远景"].includes(shotSize);
      const isCalm = ["温馨", "欢快", "安静", "唯美", "浪漫", ""].includes(mood);

      if (hasAction && (hasDialogue || isDynamic)) return "video";
      if (hasDialogue && isDynamic) return "video";
      if (isDynamic && isActionMood) return "video";
      if (isCloseUp && hasDialogue) return "video";
      if (hasAction && isActionMood) return "video";
      if (isStatic && isCalm) return "image";
      if (isWide) return "image";
      if (!hasAction && !hasDialogue) return "image";
      return "image";
    };

    return {
      id: "",
      episode_id: episodeId || "",
      shot_id: `SHOT-${String(shot.shot_no).padStart(3, '0')}`,
      order_index: shot.shot_no,
      prompt: shot.prompt_cn || shot.prompt_en,  // Chinese for display, fallback to English
      prompt_en: shot.prompt_en,  // English with style prefix for generation
      characters: shot.characters,
      shot_size: shot.shot_size,
      camera_angle: shot.camera_type,
      duration_sec: shot.duration_sec,
      dialogue: shot.dialogue,
      notes: `${shot.scene} | ${shot.action} | ${shot.mood}`,
      gen_mode: _recommendGenMode(shot),
      reference_images: { characters: characterRefs },
      has_image: false,
      has_video: false,
    };
  };

  // Create boards from shots
  const handleAiBreakdownComplete = async (shots: Shot[]) => {
    try {
      // Convert shots to board format with matched reference images
      const boardData = shots.map(matchReferenceImages);

      const response = await fetch(`${BACKEND}/api/boards/from-shots?episode_id=${episodeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shots),
      });

      if (!response.ok) throw new Error("创建分镜失败");

      // Now update each board with reference_images
      const createdBoards = await response.json();
      for (let i = 0; i < createdBoards.boards.length; i++) {
        const boardId = createdBoards.boards[i].id;
        const refImages = boardData[i].reference_images;
        if (refImages) {
          await fetch(`${BACKEND}/api/boards/${boardId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference_images: refImages }),
          });
        }
      }

      // Reload boards
      const boardsRes = await fetch(`${BACKEND}/api/boards/episode/${episodeId}`);
      setBoards(await boardsRes.json());
      setShowAiBreakdown(false);
      success(`已创建 ${shots.length} 个分镜`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "创建分镜失败");
    }
  };

  // Regenerate boards - clear existing and open AI breakdown
  const handleRegenerateBoards = async () => {
    if (!episodeId) return;

    try {
      // Delete all existing boards for this episode
      for (const board of boards) {
        await fetch(`${BACKEND}/api/boards/${board.id}`, { method: "DELETE" });
      }

      // Clear local state and open AI breakdown panel
      setBoards([]);
      setShowAiBreakdown(true);
      success("已清除片段，请重新进行AI拆分镜");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "清除失败");
    }
  };

  // Add single board
  const handleAddBoard = async () => {
    try {
      await fetch(`${BACKEND}/api/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: episodeId || "",
          order_index: boards.length,
          shot_size: "中景",
          duration_sec: 4,
        }),
      });
      const boardsRes = await fetch(`${BACKEND}/api/boards/episode/${episodeId}`);
      setBoards(await boardsRes.json());
      success("已添加分镜");
    } catch {
      toastError("添加失败");
    }
  };

  // Update board
  const handleUpdateBoard = async (boardId: string, updates: Partial<Board>) => {
    await fetch(`${BACKEND}/api/boards/${boardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setBoards(boards.map(b => b.id === boardId ? { ...b, ...updates } : b));
  };

  // Delete board
  const handleDeleteBoard = async (boardId: string) => {
    await fetch(`${BACKEND}/api/boards/${boardId}`, { method: "DELETE" });
    setBoards(boards.filter(b => b.id !== boardId));
  };

  // Breakdown shots for a segment (AI拆镜头)
  const handleBreakdownShots = async (boardId: string) => {
    setBreakdownLoadingId(boardId);
    try {
      const res = await fetch(`${BACKEND}/api/boards/${boardId}/breakdown-shots?shots_count=4`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "拆镜头失败");
      }
      // Reload boards to get updated shots
      const boardsRes = await fetch(`${BACKEND}/api/boards/episode/${episodeId}`);
      setBoards(await boardsRes.json());
      success("已拆分镜头");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "拆镜头失败");
    } finally {
      setBreakdownLoadingId(null);
    }
  };

  // Generate image for a single shot
  const handleGenerateShotImage = async (shotId: string) => {
    setGeneratingShotId(shotId);
    try {
      const res = await fetch(`${BACKEND}/api/boards/shots/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shot_id: shotId, provider: imageProvider }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "生成失败");
      }
      // Reload boards
      const boardsRes = await fetch(`${BACKEND}/api/boards/episode/${episodeId}`);
      setBoards(await boardsRes.json());
      success("镜头图已生成");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setGeneratingShotId(null);
    }
  };

  // Generate all shots for a segment (batch, with delays)
  const handleGenerateAllShots = async (boardId: string) => {
    setGeneratingAllShotsId(boardId);
    try {
      const res = await fetch(`${BACKEND}/api/boards/${boardId}/generate-all-shots?provider=${imageProvider}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "批量生成失败");
      }

      // Poll for completion - check every 8 seconds until all shots have images
      const maxAttempts = 60; // 8 * 60 = 480 seconds max wait
      let attempts = 0;

      const pollStatus = async () => {
        attempts++;
        const boardsRes = await fetch(`${BACKEND}/api/boards/episode/${episodeId}`);
        const newBoards = await boardsRes.json();
        setBoards(newBoards);

        // Find the board and check if all shots have images
        const currentBoard = newBoards.find((b: Board) => b.id === boardId);
        if (currentBoard && currentBoard.shots_generated === currentBoard.shots_count) {
          success("所有镜头图已生成完成！");
          setGeneratingAllShotsId(null);
          return true;
        }

        if (attempts >= maxAttempts) {
          toastError("生成超时，请稍后刷新查看");
          setGeneratingAllShotsId(null);
          return true;
        }

        // Continue polling
        setTimeout(pollStatus, 8000);
        return false;
      };

      success("正在批量生成镜头图...");
      setTimeout(pollStatus, 8000); // First check after 8 seconds
    } catch (e) {
      toastError(e instanceof Error ? e.message : "批量生成失败");
      setGeneratingAllShotsId(null);
    }
  };

  // Generate video (direct or composite from shots)
  const handleGenerateVideo = async (boardId: string, genMode: "image" | "video") => {
    setGeneratingBoardId(boardId);
    setVideoTaskStatus("creating");
    try {
      let taskId: string;
      // 根据生成模式选择不同的视频 provider
      const videoProviderToUse = genMode === "video" ? directVideoProvider : compositeVideoProvider;

      if (genMode === "video") {
        // Direct video generation - 使用即梦-seedance2.0
        const res = await fetch(`${BACKEND}/api/generate/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "video",
            provider: videoProviderToUse,
            input_params: { board_id: boardId, prompt: boards.find(b => b.id === boardId)?.prompt },
          }),
        });
        if (!res.ok) throw new Error("创建视频任务失败");
        const data = await res.json();
        taskId = data.task_id;
      } else {
        // Composite video from shots - 使用即梦-视频生成-3.0
        const res = await fetch(`${BACKEND}/api/boards/${boardId}/composite-video?provider=${videoProviderToUse}`, {
          method: "POST",
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || "创建合成视频任务失败");
        }
        const data = await res.json();
        taskId = data.task_id;
        success(`视频合成任务已创建（${data.shots_count}张图片，${data.total_duration}秒）`);
      }

      setVideoTaskId(taskId);
      setVideoTaskStatus("processing");

      // Poll for video file by checking board's has_video status (avoid task API rate limiting)
      const maxAttempts = 120;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 5000));  // Poll every 5 seconds

        // Check board status directly - reload boards and check has_video
        const boardRes = await fetch(`${BACKEND}/api/boards/episode/${episodeId}`);
        const updatedBoards = await boardRes.json();
        const updatedBoard = updatedBoards.find((b: Board) => b.id === boardId);

        if (updatedBoard && updatedBoard.has_video) {
          setBoards(updatedBoards);
          setVideoTaskStatus("completed");
          success("视频生成完成！");
          setGeneratingBoardId(null);
          setVideoTaskId(null);
          setVideoTaskStatus(null);
          return;
        }

        // Update status for UI
        setVideoTaskStatus(`生成中... (${Math.floor((i + 1) * 5 / 60)}分钟)`);
      }

      toastError("视频生成超时，请稍后刷新页面查看");
      setGeneratingBoardId(null);
      setVideoTaskId(null);
      setVideoTaskStatus(null);

    } catch (e) {
      toastError(e instanceof Error ? e.message : "生成失败");
      setGeneratingBoardId(null);
      setVideoTaskId(null);
      setVideoTaskStatus(null);
    }
  };

  // Generate audio for board's dialogue
  const handleGenerateAudio = async (boardId: string, voiceOverride?: string) => {
    setGeneratingAudioId(boardId);
    try {
      const board = boards.find(b => b.id === boardId);
      let voice = voiceOverride || "Cherry";
      let provider = "auto";
      let instructions = "";
      if (!voiceOverride && board?.characters && assets.length > 0) {
        const charAsset = assets.find(
          a => a.type === "character" && board.characters!.includes(a.name) && a.tts_config?.voice
        );
        if (charAsset?.tts_config) {
          voice = charAsset.tts_config.voice || "Cherry";
          provider = charAsset.tts_config.provider || "auto";
          instructions = charAsset.tts_config.prompt || "";
        }
      }
      const res = await fetch(`${BACKEND}/api/boards/${boardId}/synthesize-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice, provider, instructions }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "音频生成失败");
      }
      // Reload boards to get updated audio_path
      const boardsRes = await fetch(`${BACKEND}/api/boards/episode/${episodeId}`);
      setBoards(await boardsRes.json());
      success("台词音频已生成");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "音频生成失败");
    } finally {
      setGeneratingAudioId(null);
    }
  };

  // Generate image for board
  const handleGenerateImage = async (boardId: string) => {
    setGeneratingBoardId(boardId);
    try {
      await fetch(`${BACKEND}/api/boards/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: boardId, provider: imageProvider }),
      });
      const boardsRes = await fetch(`${BACKEND}/api/boards/episode/${episodeId}`);
      setBoards(await boardsRes.json());
      success("分镜图已生成");
    } catch {
      toastError("生成失败");
    } finally {
      setGeneratingBoardId(null);
    }
  };

  // Get script content for left panel - show specific episode data
  const getEpisodeContent = () => {
    if (!project?.breakdown_result?.episodes) return null;
    const epData = project.breakdown_result.episodes.find(
      (e: any) => e.episode_no === episode?.episode_no
    );
    return epData;
  };

  const episodeData = getEpisodeContent();

  // Format episode content for display
  const formatEpisodeContent = () => {
    if (!episodeData) {
      // Fallback to episode.script_content if no breakdown data
      return episode?.script_content || null;
    }

    const lines = [];
    lines.push(`【第${episodeData.episode_no}集】${episodeData.title || episode?.title || ""}`);
    lines.push("");
    if (episodeData.summary) {
      lines.push("剧情梗概：");
      lines.push(episodeData.summary);
      lines.push("");
    }
    if (episodeData.hook) {
      lines.push("结尾钩子：" + episodeData.hook);
      lines.push("");
    }
    if (episodeData.highlight) {
      lines.push("本集爽点：" + episodeData.highlight);
      lines.push("");
    }
    if (episodeData.key_shots && episodeData.key_shots.length > 0) {
      lines.push("关键镜头：");
      episodeData.key_shots.forEach((shot: any, i: number) => {
        lines.push(`  ${i + 1}. ${shot.scene || ""}`);
        if (shot.characters?.length > 0) {
          lines.push(`     角色：${shot.characters.join("、")}`);
        }
        if (shot.prompt_en) {
          lines.push(`     提示词：${shot.prompt_en.slice(0, 80)}${shot.prompt_en.length > 80 ? "..." : ""}`);
        }
      });
    }
    return lines.join("\n");
  };

  const scriptContent = formatEpisodeContent();

  return (
    <div className="flex h-full flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-subtle] header-gradient">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/storyboard?project=${projectId}`)}
            className="text-[--text-muted] hover:text-[--text-primary] transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold gradient-text">
                {episode ? `E${episode.episode_no} ${episode.title}` : "分镜编辑"}
              </h1>
              {boards.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerateBoards}
                  icon={<RefreshCw size={12} />}
                  className="text-xs text-[#f59e0b] hover:text-[#fbbf24] border border-[#f59e0b]/30 hover:border-[#f59e0b]/50"
                >
                  重新生成片段
                </Button>
              )}
            </div>
            <p className="text-xs text-[--text-muted] mt-0.5">
              {boards.length > 0 ? `${boards.length} 分镜 · ${boards.filter(b => b.has_image).length} 已生图` : "编辑分镜镜头"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {boards.length > 0 && (
            <>
              {/* 生成配置按钮 */}
              <div className="relative">
                <Button
                  onClick={() => setShowGenConfig(!showGenConfig)}
                  icon={<Settings size={14} className="text-violet-400" />}
                  variant="outline"
                  size="sm"
                  className="h-7 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-violet-500/30 hover:border-violet-400/50 hover:from-violet-500/20 hover:via-purple-500/20 hover:to-fuchsia-500/20"
                >
                  <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent font-semibold">生成配置</span>
                </Button>

                {/* 配置浮层 */}
                {showGenConfig && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-[520px] bg-[#1a1a24] border border-[#3f3f46] rounded-xl p-5 shadow-xl">
                    <div className="text-sm font-semibold text-[--text-primary] mb-4 pb-2 border-b border-[#3f3f46]">
                      AI生成模型配置
                    </div>

                    {/* 分镜图生成 - 一行布局 + 配置状态 */}
                    <div className="flex items-center gap-4 mb-4">
                      <label className="text-sm text-[--text-primary] font-medium shrink-0 w-[140px]">
                        分镜图生成
                      </label>
                      <select
                        value={imageProvider}
                        onChange={e => setImageProvider(e.target.value)}
                        className="flex-1 h-9 rounded-lg px-3 text-sm bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none focus:border-violet-500"
                      >
                        {Object.entries(IMAGE_PROVIDERS).map(([key, label]) => (
                          <option key={key} value={key} className="bg-[#27272a] text-gray-200">{label}</option>
                        ))}
                      </select>
                      {/* 配置状态 */}
                      <div className={cn(
                        "shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs",
                        configuredProviders.includes(imageProvider)
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      )}>
                        {configuredProviders.includes(imageProvider) ? (
                          <><Check size={12} /><span>已配置</span></>
                        ) : (
                          <><AlertCircle size={12} /><span>未配置</span></>
                        )}
                      </div>
                    </div>

                    {/* 分镜生成视频 - 一行布局 + 配置状态 */}
                    <div className="flex items-center gap-4 mb-4">
                      <label className="text-sm text-[--text-primary] font-medium shrink-0 w-[140px]">
                        分镜生成视频
                      </label>
                      <select
                        value={compositeVideoProvider}
                        onChange={e => setCompositeVideoProvider(e.target.value)}
                        className="flex-1 h-9 rounded-lg px-3 text-sm bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none focus:border-violet-500"
                      >
                        <option value="jimeng_video_v30" className="bg-[#27272a] text-gray-200">即梦-视频生成-3.0</option>
                        <option value="kling_video" className="bg-[#27272a] text-gray-200">可灵视频</option>
                        <option value="vidu" className="bg-[#27272a] text-gray-200">Vidu</option>
                      </select>
                      {/* 配置状态 */}
                      <div className={cn(
                        "shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs",
                        configuredProviders.includes(compositeVideoProvider)
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      )}>
                        {configuredProviders.includes(compositeVideoProvider) ? (
                          <><Check size={12} /><span>已配置</span></>
                        ) : (
                          <><AlertCircle size={12} /><span>未配置</span></>
                        )}
                      </div>
                    </div>

                    {/* 直接生成视频 - 一行布局 + 配置状态 */}
                    <div className="flex items-center gap-4 mb-4">
                      <label className="text-sm text-[--text-primary] font-medium shrink-0 w-[140px]">
                        直接生成视频
                      </label>
                      <select
                        value={directVideoProvider}
                        onChange={e => setDirectVideoProvider(e.target.value)}
                        className="flex-1 h-9 rounded-lg px-3 text-sm bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none focus:border-violet-500"
                      >
                        <option value="jimeng_seedance" className="bg-[#27272a] text-gray-200">即梦-Seedance2.0</option>
                        <option value="jimeng_video_v30" className="bg-[#27272a] text-gray-200">即梦-视频生成-3.0</option>
                        <option value="kling_video" className="bg-[#27272a] text-gray-200">可灵视频</option>
                        <option value="vidu" className="bg-[#27272a] text-gray-200">Vidu</option>
                      </select>
                      {/* 配置状态 */}
                      <div className={cn(
                        "shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs",
                        configuredProviders.includes(directVideoProvider)
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      )}>
                        {configuredProviders.includes(directVideoProvider) ? (
                          <><Check size={12} /><span>已配置</span></>
                        ) : (
                          <><AlertCircle size={12} /><span>未配置</span></>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#3f3f46] flex justify-between items-center">
                      <button
                        onClick={() => navigate("/settings")}
                        className="text-xs text-violet-400 hover:text-violet-300 underline"
                      >
                        配置API密钥
                      </button>
                      <Button
                        onClick={() => setShowGenConfig(false)}
                        size="sm"
                        className="h-7 px-4 text-xs"
                      >
                        确定
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/generate?project=${projectId}`)}
              >
                批量生成 →
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main content - two columns */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Script content */}
        <div className="w-[300px] border-r border-[#3f3f46] overflow-y-auto bg-[#18181b]">
          <div className="px-4 py-3 border-b border-[#3f3f46] bg-[#27272a]">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-[#6366f1]" />
              <span className="text-sm font-semibold text-white">剧本内容</span>
            </div>
          </div>
          <div className="px-4 py-4">
            {scriptContent ? (
              <div className="text-xs text-[--text-secondary] leading-relaxed space-y-3">
                {episodeData ? (
                  <>
                    {/* Episode title */}
                    <div className="text-sm font-semibold text-white border-b border-[#3f3f46] pb-2">
                      第{episodeData.episode_no}集 · {episodeData.title || episode?.title || ""}
                    </div>
                    {/* Summary */}
                    {episodeData.summary && (
                      <div>
                        <div className="text-[#6366f1] font-medium mb-1">剧情梗概</div>
                        <div className="text-[--text-muted]">{episodeData.summary}</div>
                      </div>
                    )}
                    {/* Hook */}
                    {episodeData.hook && (
                      <div>
                        <div className="text-yellow-400 font-medium mb-1">结尾钩子</div>
                        <div className="text-[--text-muted]">{episodeData.hook}</div>
                      </div>
                    )}
                    {/* Highlight */}
                    {episodeData.highlight && (
                      <div>
                        <div className="text-green-400 font-medium mb-1">本集爽点</div>
                        <div className="text-[--text-muted]">{episodeData.highlight}</div>
                      </div>
                    )}
                    {/* Key shots */}
                    {episodeData.key_shots?.length > 0 && (
                      <div>
                        <div className="text-[#6366f1] font-medium mb-2">关键镜头</div>
                        <div className="space-y-2">
                          {episodeData.key_shots.map((shot: any, i: number) => (
                            <div key={i} className="pl-2 border-l-2 border-[#3f3f46]">
                              <div className="text-[--text-secondary]">{shot.scene}</div>
                              {shot.characters?.length > 0 && (
                                <div className="text-[--text-muted]">角色：{shot.characters.join("、")}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono">{scriptContent}</pre>
                )}
              </div>
            ) : (
              <div className="text-xs text-[--text-muted] italic">暂无剧本内容</div>
            )}
          </div>
        </div>

        {/* Right: Storyboard area */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="text-center py-12 text-sm text-[--text-muted]">加载中...</div>
          ) : showAiBreakdown ? (
            // Show AI Breakdown Panel when requested, regardless of existing boards
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <AiBreakdownPanel
                episodeId={episodeId || ""}
                episode={episode}
                projectId={projectId}
                assets={assets}
                onComplete={handleAiBreakdownComplete}
                onClose={() => setShowAiBreakdown(false)}
              />
            </div>
          ) : boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="size-14 rounded-xl bg-[--bg-elevated] flex items-center justify-center">
                <LayoutGrid size={24} className="text-[--text-muted]" strokeWidth={1.5} />
              </div>
              <div className="text-sm text-[--text-muted]">开始创建分镜</div>
              <div className="text-xs text-[--text-muted] max-w-sm text-center">
                分镜画板可以独立使用。手动添加分镜后，输入提示词即可 AI 生成分镜图，或直接上传已有图片。
              </div>
              <div className="flex gap-3 mt-2">
                <Button onClick={handleAddBoard} icon={<Plus size={14} />}>
                  手动添加分镜
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAiBreakdown(true)}
                  icon={<Sparkles size={14} />}
                >
                  AI 拆分镜
                  <Badge className="ml-1.5 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] px-1">💰</Badge>
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {/* Header bar */}
              <div className="flex items-center gap-2 py-2.5 px-3 border-b border-[--border-subtle] bg-[--bg-surface] sticky top-0 z-10">
                <div className="flex-[0.06] text-[11px] font-bold text-[--text-secondary] uppercase tracking-wide text-center">编号</div>
                <div className="flex-[0.12] text-[11px] font-bold text-[--text-secondary] uppercase tracking-wide">出镜</div>
                <div className="flex-[0.9] text-[11px] font-bold text-[--text-secondary] uppercase tracking-wide text-left pl-2">提示词</div>
                <div className="flex-[0.05] text-center text-[11px] font-bold text-[--text-secondary] uppercase tracking-wide">时长</div>
                <div className="flex-[0.08] text-center text-[11px] font-bold text-[--text-secondary] uppercase tracking-wide">模式</div>
                <div className="flex-[0.25] text-center text-[11px] font-bold text-[--text-secondary] uppercase tracking-wide">分镜图/音频</div>
                <div className="flex-[0.12] text-center text-[11px] font-bold text-[--text-secondary] uppercase tracking-wide">图片模型</div>
                <div className="flex-[0.12] text-center text-[11px] font-bold text-[--text-secondary] uppercase tracking-wide">生成</div>
                <div className="flex-[0.12] text-center text-[11px] font-bold text-[--text-secondary] uppercase tracking-wide">视频模型</div>
                <div className="flex-[0.06] text-center text-[11px] font-bold text-[--text-secondary] uppercase tracking-wide">结果</div>
              </div>

              {/* Segment cards */}
              {boards.sort((a, b) => a.order_index - b.order_index).map((board, i) => (
                <SegmentRow
                  key={board.id}
                  segment={board}
                  index={i}
                  assets={assets}
                  onUpdate={(updates) => handleUpdateBoard(board.id, updates)}
                  onDelete={() => handleDeleteBoard(board.id)}
                  onBreakdownShots={() => handleBreakdownShots(board.id)}
                  onGenerateShotImage={(shotId) => handleGenerateShotImage(shotId)}
                  onGenerateVideo={() => handleGenerateVideo(board.id, board.gen_mode || "image")}
                  onGenerateAllShots={() => handleGenerateAllShots(board.id)}
                  onGenerateAudio={(voiceOverride) => handleGenerateAudio(board.id, voiceOverride)}
                  breakdownLoading={breakdownLoadingId === board.id}
                  generatingShotId={generatingShotId}
                  generatingAllShots={generatingAllShotsId === board.id}
                  generatingVideo={generatingBoardId === board.id}
                  generatingAudio={generatingAudioId === board.id}
                  videoStatus={generatingBoardId === board.id ? videoTaskStatus : null}
                  onPlayVideo={(id) => setVideoModalBoardId(id)}
                  voiceList={qwen3Voices}
                  usedVoices={usedVoices}
                  characterVoice={getCharacterVoice(board)}
                />
              ))}

              {/* Add more button */}
              <div className="mt-4 flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleAddBoard} icon={<Plus size={12} />}>
                  添加分镜
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAiBreakdown(true)} icon={<Sparkles size={12} />}>
                  AI 拆分镜
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {videoModalBoardId && (
        <VideoPlayerModal
          boards={boards}
          initialBoardId={videoModalBoardId}
          onClose={() => setVideoModalBoardId(null)}
        />
      )}
    </div>
  );
}


/* ── Video Player Modal (for storyboard) ── */
function VideoPlayerModal({ boards, initialBoardId, onClose }: {
  boards: Board[];
  initialBoardId: string;
  onClose: () => void;
}) {
  const videoBoards = boards.filter(b => b.has_video);
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.max(0, videoBoards.findIndex(b => b.id === initialBoardId))
  );
  const current = videoBoards[currentIndex];
  if (!current || videoBoards.length === 0) return null;

  const videoUrl = `${BACKEND}/api/boards/${current.id}/video`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full max-w-5xl mx-6 max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">片段 {current.order_index + 1} 视频</span>
            <span className="text-xs text-white/50">{currentIndex + 1} / {videoBoards.length}</span>
            <span className="text-xs text-white/40 truncate max-w-[200px]">{current.prompt?.slice(0, 40)}</span>
          </div>
          <div className="flex items-center gap-2">
            {currentIndex > 0 && (
              <button onClick={() => setCurrentIndex(i => i - 1)}
                className="px-2 py-1 rounded-md bg-white/10 text-white text-xs hover:bg-white/20 transition-colors">◀ 上一个</button>
            )}
            {currentIndex < videoBoards.length - 1 && (
              <button onClick={() => setCurrentIndex(i => i + 1)}
                className="px-2 py-1 rounded-md bg-white/10 text-white text-xs hover:bg-white/20 transition-colors">下一个 ▶</button>
            )}
            <button onClick={onClose}
              className="size-7 flex items-center justify-center rounded-md bg-white/10 text-white text-xs hover:bg-white/20 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="bg-black rounded-lg overflow-hidden">
          <video key={current.id} src={videoUrl} controls autoPlay
            className="w-full max-h-[75vh] mx-auto" style={{ maxHeight: "75vh" }} />
        </div>
      </div>
    </div>
  );
}