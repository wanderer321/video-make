import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus, Image, User, MapPin, Package, Wand2, Trash2, RefreshCw, Upload, Mic, Film, Sparkles, FileText, Settings, AlertCircle, FlipHorizontal, Sliders, ChevronRight, Check, LayoutGrid, Music, Volume2 } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { cn, IMAGE_PROVIDERS, VIDEO_PROVIDERS } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

const BACKEND = "http://localhost:17322";

// Resolution presets
const RESOLUTION_PRESETS = [
  { label: "竖版 3:4", width: 768, height: 1024 },
  { label: "方形 1:1", width: 512, height: 512 },
  { label: "横版 4:3", width: 1024, height: 768 },
  { label: "大方形", width: 1024, height: 1024 },
  { label: "竖版 9:16", width: 576, height: 1024 },
  { label: "自定义", width: 0, height: 0 },
];

const EDGE_VOICES = [
  { id: "zh-CN-XiaoxiaoNeural", name: "晓晓 (女/普通话)" },
  { id: "zh-CN-YunxiNeural",    name: "云希 (男/普通话)" },
  { id: "zh-CN-XiaohanNeural",  name: "晓涵 (女/普通话)" },
  { id: "zh-CN-YunjianNeural",  name: "云健 (男/普通话)" },
  { id: "zh-CN-XiaoyiNeural",   name: "晓伊 (女/普通话)" },
  { id: "zh-TW-HsiaoChenNeural",name: "晓臻 (女/台湾)" },
  { id: "en-US-JennyNeural",    name: "Jenny (女/英语)" },
  { id: "en-US-GuyNeural",      name: "Guy (男/英语)" },
  { id: "ja-JP-NanamiNeural",   name: "七海 (女/日语)" },
];

interface TtsConfig {
  voice?: string;
  provider?: string;
  speed?: number;
  prompt?: string; // 音频提示词
}

interface Asset {
  id: string;
  type: string;
  name: string;
  description?: string;
  prompt?: string;
  tags?: string[];
  has_image: boolean;
  tts_config?: TtsConfig;
  has_audio?: boolean; // 是否已生成音频
  audio_path?: string; // 音频文件路径
  variant_count: number;
}

interface Variant {
  id: string;
  label: string;
  image_path: string;
  is_reference: boolean;
}

interface VideoAsset {
  id: string;
  name: string;
  description?: string;
  file_path?: string;
  duration?: number;
  created_at?: string;
}

const ASSET_TABS = [
  { key: "all",      label: "所有资产", icon: <Image size={14} />, desc: "全部资产" },
  { key: "character", label: "角色资产", icon: <User size={14} />, desc: "人物角色" },
  { key: "scene",     label: "场景资产", icon: <MapPin size={14} />, desc: "背景场景" },
  { key: "prop",      label: "道具资产", icon: <Package size={14} />, desc: "道具物品" },
  { key: "video",     label: "视频素材", icon: <Film size={14} />, desc: "参考视频" },
];

/* ── Audio Card with flip effect and play/generate functionality ── */
function AudioCard({
  assetId,
  name,
  audioPrompt,
  hasAudio,
  audioPath,
  onGenerate,
  onRefresh,
  generating,
  refreshing,
}: {
  assetId?: string;
  name: string;
  audioPrompt?: string;
  hasAudio?: boolean;
  audioPath?: string;
  onGenerate?: () => void;
  onRefresh?: () => void;
  generating?: boolean;
  refreshing?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = () => {
    if (!audioPath) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current?.play();
      setIsPlaying(true);
      setFlipped(true); // 播放时自动翻转显示提示词
    }
  };

  const audioCacheBuster = audioPath ? `${BACKEND}/api/assets/${assetId}/audio?t=${encodeURIComponent(audioPath)}` : "";

  useEffect(() => {
    if (!audioCacheBuster) return;
    audioRef.current = new Audio(audioCacheBuster);
    audioRef.current.onended = () => {
      setIsPlaying(false);
      setFlipped(false);
    };
  }, [audioCacheBuster]);

  return (
    <div
      className="w-[90px] h-[90px] rounded-lg border border-[--border] bg-[--bg-surface] overflow-hidden relative shrink-0 cursor-pointer group"
      style={{ perspective: "200px" }}
      onClick={hasAudio ? handlePlay : undefined}
    >
      {/* Hidden audio element */}
      {audioPath && (
        <audio
          ref={audioRef}
          src={audioCacheBuster}
          onEnded={() => { setIsPlaying(false); setFlipped(false); }}
          className="hidden"
        />
      )}

      {/* Top-left refresh button */}
      {onRefresh && (
        <button
          onClick={(e) => { e.stopPropagation(); onRefresh(); }}
          disabled={refreshing}
          className="absolute top-1 left-1 z-20 size-4 rounded bg-[--bg-elevated]/80 border border-[--border] flex items-center justify-center hover:bg-[--accent]/20 transition-colors"
          title="从剧本提取声音特点"
        >
          {refreshing ? (
            <RefreshCw size={8} className="text-[--accent] animate-spin" />
          ) : (
            <Sparkles size={8} className="text-[--text-muted]" />
          )}
        </button>
      )}

      {/* Flip container */}
      <div
        className="absolute inset-0 transition-transform duration-300"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front side */}
        <div
          className="absolute inset-0 flex flex-col"
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Prompt content area */}
          <div className="flex-1 p-2 overflow-hidden">
            {audioPrompt ? (
              <p className="text-[10px] text-[--text-secondary] line-clamp-4 leading-tight">
                {audioPrompt}
              </p>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Music size={16} className="text-[--text-muted]" />
              </div>
            )}
          </div>

          {/* Bottom: Generate button or status */}
          <div className="h-[22px] border-t border-[--border]/50 flex items-center justify-end px-1.5 bg-[--bg-elevated]/50">
            {generating ? (
              <RefreshCw size={10} className="text-[--accent] animate-spin" />
            ) : hasAudio ? (
              <button
                onClick={(e) => { e.stopPropagation(); onGenerate?.(); }}
                className="text-[9px] text-[--accent] hover:text-[--accent-hover] flex items-center gap-0.5"
              >
                <RefreshCw size={9} />
                重生成
              </button>
            ) : onGenerate ? (
              <button
                onClick={(e) => { e.stopPropagation(); onGenerate(); }}
                className="text-[9px] text-[--accent] hover:text-[--accent-hover] flex items-center gap-0.5"
                disabled={!audioPrompt || generating}
              >
                <Wand2 size={9} />
                生成
              </button>
            ) : (
              <span className="text-[9px] text-[--text-muted]">-</span>
            )}
          </div>

          {/* Playing indicator */}
          {isPlaying && (
            <div className="absolute top-1 right-1 size-4 rounded-full bg-[--success] animate-pulse flex items-center justify-center">
              <Volume2 size={8} className="text-white" />
            </div>
          )}
        </div>

        {/* Back side - shows prompt details */}
        <div
          className="absolute inset-0 bg-[--bg-elevated] flex flex-col p-2"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="text-[9px] text-[--accent] mb-1 font-medium">声音特点提示词</div>
          <p className="text-[10px] text-[--text-secondary] line-clamp-5 leading-tight flex-1">
            {audioPrompt || "暂无"}
          </p>
          <div className="flex items-center justify-between mt-1">
            {isPlaying && (
              <div className="flex items-center gap-0.5">
                <Volume2 size={10} className="text-[--success] animate-pulse" />
                <span className="text-[9px] text-[--success]">播放中</span>
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setFlipped(false); }}
              className="text-[9px] text-[--text-muted] hover:text-[--text-primary]"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Prompt Cell with flip effect and hover variants panel ── */
function PromptCell({
  type,
  index,
  name,
  prompt,
  prompt_en,
  assetId,
  isActive,
  refreshVersion,
  onUpdateName,
  onUpdatePrompt,
  onRemove,
  onGenerate,
  onRefresh,
  generatingKeys,
}: {
  type: "character" | "scene" | "prop";
  index: number;
  name: string;
  prompt: string;
  prompt_en?: string;
  assetId: string | undefined;
  isActive: boolean;
  refreshVersion: number;
  onUpdateName: (value: string) => void;
  onUpdatePrompt: (value: string) => void;
  onRemove: () => void;
  onGenerate: () => void;
  onRefresh?: () => Promise<void>;
  generatingKeys: Set<string>;
}) {
  const [showingPrompt, setShowingPrompt] = useState(!assetId);
  const [imgKey, setImgKey] = useState(0);
  const [showVariants, setShowVariants] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (assetId) {
      setImgKey(k => k + 1);
      setShowingPrompt(false);
    }
  }, [assetId]);

  // Refresh image when global refreshVersion changes
  useEffect(() => {
    if (assetId) {
      setImgKey(k => k + 1);
    }
  }, [refreshVersion, assetId]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Load variants when hovering on expand area
  const handleHoverExpand = async () => {
    if (!assetId) return;
    // Clear any pending close timer
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowVariants(true);
    if (variants.length === 0) {
      setLoadingVariants(true);
      try {
        const r = await fetch(`${BACKEND}/api/assets/${assetId}/variants`);
        setVariants(await r.json());
      } finally {
        setLoadingVariants(false);
      }
    }
  };

  // Cancel close when mouse enters panel or stays on expand strip
  const handleHoverEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  // Delayed close when mouse leaves
  const handleHoverLeave = () => {
    hoverTimeoutRef.current = window.setTimeout(() => {
      setShowVariants(false);
    }, 200);
  };

  // Select a variant as reference
  const handleSelectVariant = async (variantId: string) => {
    await fetch(`${BACKEND}/api/assets/${assetId}/select-variant/${variantId}`, { method: "POST" });
    setImgKey(k => k + 1);
    setShowVariants(false);
    const r = await fetch(`${BACKEND}/api/assets/${assetId}/variants`);
    setVariants(await r.json());
  };

  const hasImage = !!assetId;

  // Derive display name from name field or prompt
  const displayName = name || (prompt ? prompt.slice(0, 15) + "..." : `未命名-${index + 1}`);

  return (
    <div className="relative">
      {/* Name header with refresh */}
      <div className="text-xs font-medium text-[--text-secondary] mb-1 truncate px-1 flex items-center gap-1.5">
        {onRefresh && name && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (refreshing) return;
              setRefreshing(true);
              try { await onRefresh(); } finally { setRefreshing(false); }
            }}
            title={`从剧本重新提取此${type === "character" ? "角色" : type === "scene" ? "场景" : "道具"}`}
            className={cn(
              "size-5 flex items-center justify-center rounded-md transition-all shrink-0",
              refreshing
                ? "bg-[#7c5ef5]/20 cursor-not-allowed"
                : "bg-[#2d2d42] hover:bg-[#7c5ef5]/30 hover:text-[#7c5ef5] text-[--text-muted]"
            )}
          >
            <RefreshCw size={11} className={refreshing ? "animate-spin text-[#7c5ef5]" : ""} />
          </button>
        )}
        <span className="truncate">{displayName}</span>
      </div>

      <div
        className="relative aspect-square rounded-lg overflow-visible group"
        style={{ perspective: "1000px" }}
        onMouseEnter={handleHoverEnter}
        onMouseLeave={handleHoverLeave}
      >
      {/* Flip card container */}
      <div
        className="relative w-full h-full transition-transform duration-500 rounded-lg overflow-visible"
        style={{
          transformStyle: "preserve-3d",
          transform: hasImage && showingPrompt ? "rotateY(180deg)" : "rotateY(0deg)"
        }}
      >
        {/* Front: Image or Prompt */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full rounded-lg border-2 bg-[#18181b]",
            isActive ? "border-[#6366f1]" : "border-[#3f3f46]"
          )}
          style={{ backfaceVisibility: "hidden", overflow: "visible" }}
        >
          {hasImage ? (
            <>
              <img
                key={imgKey}
                src={`${BACKEND}/api/assets/${assetId}/image?t=${imgKey}`}
                alt="Reference"
                className="w-full h-full object-cover rounded-lg"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  onClick={() => setShowingPrompt(true)}
                  icon={<FlipHorizontal size={12} />}
                  size="sm"
                  variant="outline"
                  className="h-6 px-3 text-xs border-white/30 text-white hover:bg-white/20"
                >
                  切换提示词
                </Button>
              </div>
              {/* Regenerate button */}
              {isActive && (
                <Button
                  onClick={onGenerate}
                  disabled={generatingKeys.has(`${type}-${index}`)}
                  loading={generatingKeys.has(`${type}-${index}`)}
                  icon={<RefreshCw size={10} />}
                  size="sm"
                  className="absolute bottom-2 right-2 h-5 px-2 text-xs bg-[#6366f1] hover:bg-[#818cf8] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  再生成
                </Button>
              )}
              {/* Expand strip on right side */}
              {isActive && (
                <div
                  className="absolute right-0 top-0 bottom-0 w-10 bg-[#18181b]/90 hover:bg-[#6366f1]/30 flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  onMouseEnter={handleHoverExpand}
                >
                  <ChevronRight size={18} className="text-[--text-secondary]" />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col w-full h-full p-2 gap-0.5">
                <div className="flex-1 flex flex-col min-h-0">
                  <span className="text-[9px] text-gray-500 mb-0.5 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-blue-400 shrink-0" />
                    中文描述
                  </span>
                  <textarea
                    placeholder={`${type === "character" ? "角色描述" : type === "scene" ? "场景描述" : "道具描述"}`}
                    value={prompt}
                    onChange={(e) => onUpdatePrompt(e.target.value)}
                    className={cn(
                      "w-full flex-1 rounded px-2 py-1 text-xs resize-none bg-transparent outline-none",
                      isActive ? "text-[--text-primary] placeholder:text-[--text-muted]" : "text-[--text-muted] placeholder:text-[--text-muted]"
                    )}
                  />
                </div>
                {prompt_en ? (
                  <div className="flex-[0.55] flex flex-col min-h-0 border-t border-[#3f3f46] pt-0.5">
                    <span className="text-[9px] text-gray-500 mb-0.5 flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                      英文生图提示词
                    </span>
                    <div className="text-[10px] text-gray-400 leading-relaxed overflow-y-auto whitespace-pre-wrap break-all line-clamp-3">
                      {prompt_en}
                    </div>
                  </div>
                ) : (
                  <div className="flex-[0.45] flex items-center justify-center border-t border-[#3f3f46] pt-0.5">
                    <span className="text-[9px] text-gray-600">无英文提示词</span>
                  </div>
                )}
              </div>
              <button
                onClick={onRemove}
                className="absolute top-1 right-2 z-10 size-5 rounded bg-[--bg-elevated] text-[--text-muted] hover:text-[--error] hover:bg-[--error]/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
              {isActive && (
                <Button
                  onClick={onGenerate}
                  disabled={!prompt.trim() || generatingKeys.has(`${type}-${index}`)}
                  loading={generatingKeys.has(`${type}-${index}`)}
                  icon={<Sparkles size={10} />}
                  size="sm"
                  className="absolute bottom-2 right-2 h-5 px-2 text-xs bg-[#6366f1] hover:bg-[#818cf8] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  生成参考图
                </Button>
              )}
            </>
          )}
        </div>

        {/* Back: Prompt textarea (when flipped) */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full rounded-lg border-2 bg-[#18181b]",
            isActive ? "border-[#6366f1]" : "border-[#3f3f46]"
          )}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", overflow: "hidden" }}
        >
          {/* Name input at top */}
          <input
            type="text"
            placeholder="名称"
            value={name}
            onChange={(e) => onUpdateName(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-transparent border-b border-[--border] text-[--text-primary] placeholder:text-[--text-muted] outline-none"
          />
          {/* Prompt textarea */}
          <div className="flex flex-col w-full h-[calc(100%-28px)] p-2 gap-0.5">
            <div className="flex-1 flex flex-col min-h-0">
              <span className="text-[9px] text-gray-500 mb-0.5 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-blue-400 shrink-0" />
                中文描述
              </span>
              <textarea
                placeholder={`${type === "character" ? "角色描述" : type === "scene" ? "场景描述" : "道具描述"}`}
                value={prompt}
                onChange={(e) => onUpdatePrompt(e.target.value)}
                className="w-full flex-1 rounded px-2 py-1 text-xs resize-none bg-transparent outline-none text-[--text-primary] placeholder:text-[--text-muted]"
              />
            </div>
            {prompt_en ? (
              <div className="flex-[0.55] flex flex-col min-h-0 border-t border-[#3f3f46] pt-0.5">
                <span className="text-[9px] text-gray-500 mb-0.5 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                  英文生图提示词
                </span>
                <div className="text-[10px] text-gray-400 leading-relaxed overflow-y-auto whitespace-pre-wrap break-all line-clamp-2">
                  {prompt_en}
                </div>
              </div>
            ) : (
              <div className="flex-[0.45] flex items-center justify-center border-t border-[#3f3f46] pt-0.5">
                <span className="text-[9px] text-gray-600">无英文提示词</span>
              </div>
            )}
          </div>
          <button
            onClick={onRemove}
            className="absolute top-1 right-2 size-5 rounded bg-[--bg-elevated] text-[--text-muted] hover:text-[--error] hover:bg-[--error]/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 size={12} />
          </button>
          <Button
            onClick={() => setShowingPrompt(false)}
            icon={<FlipHorizontal size={10} />}
            size="sm"
            variant="outline"
            className="absolute bottom-2 left-2 h-5 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity border-[#3f3f46]"
          >
            切换图片
          </Button>
          {isActive && (
            <Button
              onClick={onGenerate}
              disabled={!prompt.trim() || generatingKeys.has(`${type}-${index}`)}
              loading={generatingKeys.has(`${type}-${index}`)}
              icon={<Sparkles size={10} />}
              size="sm"
              className="absolute bottom-2 right-2 h-5 px-2 text-xs bg-[#6366f1] hover:bg-[#818cf8] text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              生成参考图
            </Button>
          )}
        </div>
      </div>

      {/* Hover variants panel - positioned to the right */}
      {showVariants && assetId && (
        <div
          className="absolute left-[calc(100%+8px)] top-0 z-50 bg-[#18181b] border border-[#6366f1]/30 rounded-lg p-3 shadow-xl min-w-[300px]"
        >
          <div className="text-xs text-[--text-muted] mb-2 font-medium">选择参考图</div>
          {loadingVariants ? (
            <div className="text-center py-6 text-[--text-muted] text-xs">加载中...</div>
          ) : variants.length === 0 ? (
            <div className="text-center py-6 text-[--text-muted] text-xs">暂无变体</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {variants.map((v) => (
                <div
                  key={v.id}
                  onClick={() => handleSelectVariant(v.id)}
                  className={cn(
                    "relative rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02]",
                    v.is_reference ? "ring-2 ring-[#6366f1]" : "border border-[#3f3f46] hover:border-[#6366f1]/50"
                  )}
                >
                  <img
                    src={`${BACKEND}/api/assets/variants/${v.id}/image`}
                    alt={v.label}
                    className="w-full aspect-square object-cover"
                  />
                  {v.is_reference && (
                    <div className="absolute top-1 right-1 bg-[#6366f1] rounded-full p-0.5">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

/* ── Asset Card (for character/scene/prop) ── */
function AssetCard({ asset, onDelete, onGenerate, onRegenerate, onUpload, onVoiceConfig, onRefresh }: {
  asset: Asset;
  onDelete: () => void;
  onGenerate: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  onVoiceConfig?: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [generating, setGenerating] = useState(false);
  const [imgKey, setImgKey] = useState(0);
  const [showVariants, setShowVariants] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const prevHasImage = useRef(asset.has_image);

  // Reset imgKey when has_image changes from false to true (new image generated)
  useEffect(() => {
    if (asset.has_image && !prevHasImage.current) {
      setImgKey(k => k + 1);
    }
    prevHasImage.current = asset.has_image;
  }, [asset.has_image]);

  const handleGenerate = async () => {
    setGenerating(true);
    try { await onGenerate(); setImgKey(k => k + 1); }
    finally { setGenerating(false); }
  };

  const handleRegen = async () => {
    setGenerating(true);
    try { await onRegenerate(); setImgKey(k => k + 1); }
    finally { setGenerating(false); }
  };

  const loadVariants = async () => {
    setLoadingVariants(true);
    try {
      const r = await fetch(`${BACKEND}/api/assets/${asset.id}/variants`);
      setVariants(await r.json());
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleShowVariants = async () => {
    setShowVariants(true);
    await loadVariants();
  };

  const handleSelectVariant = async (variantId: string) => {
    await fetch(`${BACKEND}/api/assets/${asset.id}/select-variant/${variantId}`, { method: "POST" });
    setShowVariants(false);
    await onRefresh();
    setImgKey(k => k + 1);
  };

  return (
    <>
      <div className="group rounded-xl border border-[--border] bg-[--bg-surface] overflow-hidden hover:border-[--accent]/40 transition-all duration-200 hover-lift">
        <div
          className="h-44 flex items-center justify-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--bg-elevated), var(--bg-hover))" }}
        >
          {asset.has_image ? (
            <img key={imgKey} src={`${BACKEND}/api/assets/${asset.id}/image?t=${imgKey}`} alt={asset.name} className="w-full h-full object-cover" />
          ) : (
            <Image size={32} className="text-[--text-muted]" strokeWidth={1.5} />
          )}

          {/* Expand button on the right side */}
          {asset.variant_count > 0 && (
            <button
              onClick={handleShowVariants}
              className="absolute right-0 top-0 bottom-0 w-8 bg-[--bg-elevated]/80 hover:bg-[--accent]/20 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
              title="查看所有变体"
            >
              <ChevronRight size={16} className="text-[--text-muted]" />
            </button>
          )}

          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { onUpload(f); setImgKey(k => k + 1); } e.target.value = ""; }}
          />

          <div className="absolute inset-0 bg-[--bg-base]/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 flex-wrap p-2">
            {!asset.has_image ? (
              <button onClick={handleGenerate} disabled={generating || !asset.prompt}
                className="rounded-md bg-[--accent] text-white px-2.5 py-1.5 text-xs flex items-center gap-1.5 hover:bg-[--accent-hover] disabled:opacity-50 transition-colors">
                {generating ? <Wand2 size={12} className="animate-pulse" /> : <Wand2 size={12} />}
                {generating ? "生成中..." : "AI 生成"}
              </button>
            ) : (
              <button onClick={handleRegen} disabled={generating}
                className="rounded-md bg-[--bg-elevated]/90 text-[--text-secondary] px-2 py-1.5 text-xs flex items-center gap-1 hover:bg-[--accent] hover:text-white disabled:opacity-50 transition-colors border border-[--border]">
                <RefreshCw size={11} className={generating ? "animate-spin" : ""} />
                重新生成
              </button>
            )}
            <button onClick={() => uploadRef.current?.click()} disabled={generating}
              className="rounded-md bg-[--bg-elevated]/90 text-[--text-secondary] px-2 py-1.5 text-xs flex items-center gap-1 hover:bg-[--success] hover:text-white disabled:opacity-50 transition-colors border border-[--border]">
              <Upload size={11} />
              上传图片
            </button>
            {onVoiceConfig && (
              <button onClick={onVoiceConfig}
                className="rounded-md bg-[--bg-elevated]/90 text-[--text-secondary] px-2 py-1.5 text-xs flex items-center gap-1 hover:bg-[--accent] hover:text-white transition-colors border border-[--border]">
                <Mic size={11} />
                配音设置
              </button>
            )}
            <button onClick={onDelete}
              className="rounded-md bg-[--error]/80 text-white p-1.5 hover:bg-[--error] transition-colors">
              <Trash2 size={12} />
            </button>
          </div>

          <div className="absolute top-2 right-2 flex gap-1">
            {asset.has_image && (
              <span className="text-[10px] bg-[--success]/20 text-[--success] border border-[--success]/30 px-1.5 py-0.5 rounded-full">已生图</span>
            )}
            {asset.tts_config?.voice && (
              <span className="text-[10px] bg-[--accent-dim] text-[--accent-hover] border border-[--accent]/20 px-1.5 py-0.5 rounded-full">已配音</span>
            )}
          </div>
        </div>

      <div className="p-3">
        <div className="font-medium text-[--text-primary] text-sm mb-1">{asset.name}</div>
        {asset.description && (
          <div className="text-xs text-[--text-muted] line-clamp-2 leading-relaxed">{asset.description}</div>
        )}
        {asset.prompt && (
          <div className="mt-1.5 pt-1.5 border-t border-[--border]">
            <div className="text-[10px] text-gray-500 mb-0.5 font-medium">EN Prompt</div>
            <div className="text-[10px] text-gray-400 leading-relaxed line-clamp-2">{asset.prompt}</div>
          </div>
        )}
        {asset.tts_config?.voice && (
          <div className="text-[10px] text-[--accent-hover] mt-1 flex items-center gap-1">
            <Mic size={9} />
            {EDGE_VOICES.find(v => v.id === asset.tts_config?.voice)?.name ?? asset.tts_config.voice}
          </div>
        )}
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {asset.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="default" className="text-[10px] px-1.5 py-0">{tag}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Variants selection modal */}
    <Modal open={showVariants} onClose={() => setShowVariants(false)} title={`选择参考图 · ${asset.name}`}
      footer={<Button variant="outline" onClick={() => setShowVariants(false)}>关闭</Button>}
    >
      <div className="p-4">
        {loadingVariants ? (
          <div className="text-center py-8 text-[--text-muted]">加载中...</div>
        ) : variants.length === 0 ? (
          <div className="text-center py-8 text-[--text-muted]">暂无变体图片</div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {variants.map((v) => (
              <div
                key={v.id}
                onClick={() => handleSelectVariant(v.id)}
                className={cn(
                  "relative rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02]",
                  v.is_reference ? "ring-2 ring-[--accent] ring-offset-2" : "border border-[--border] hover:border-[--accent]/50"
                )}
              >
                <img
                  src={`${BACKEND}/api/assets/variants/${v.id}/image`}
                  alt={v.label}
                  className="w-full h-24 object-cover"
                />
                {v.is_reference && (
                  <div className="absolute top-1 right-1 bg-[--accent] rounded-full p-1">
                    <Check size={10} className="text-white" />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-[--bg-elevated]/80 text-[--text-secondary] text-[10px] text-center py-1">
                  {v.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  </>
  );
}

/* ── Main Assets Page ── */
interface CreateAssetForm {
  name: string;
  description: string;
  prompt: string;
  tags: string;
}

export function AssetsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const storeProjectId = useAppStore((s) => s.currentProjectId);
  const projectId = params.get("project") ?? storeProjectId ?? "";

  const [assets, setAssets] = useState<Asset[]>([]);
  const [projectType, setProjectType] = useState("manga_2d");
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [tab, setTab] = useState("character");
  const [createOpen, setCreateOpen] = useState(false);
  const [uploadVideoOpen, setUploadVideoOpen] = useState(false);
  const [form, setForm] = useState<CreateAssetForm>({ name: "", description: "", prompt: "", tags: "" });
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voiceAsset, setVoiceAsset] = useState<Asset | null>(null);
  const [voiceDraft, setVoiceDraft] = useState<TtsConfig>({});
  const [savingVoice, setSavingVoice] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoName, setVideoName] = useState("");
  const [videoDesc, setVideoDesc] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // New states for inline prompt generation - each item has name and prompt
  type PromptItem = { name: string; prompt: string; prompt_en?: string };
  type PromptState = { character: PromptItem[]; scene: PromptItem[]; prop: PromptItem[] };
  const [inlinePrompts, setInlinePrompts] = useState<PromptState>({
    character: [{ name: "", prompt: "" }],
    scene: [{ name: "", prompt: "" }],
    prop: [{ name: "", prompt: "" }],
  });
  // Store asset ID for each prompt cell
  const [promptAssetIds, setPromptAssetIds] = useState<Record<string, string[]>>({
    character: [],
    scene: [],
    prop: [],
  });
  const [extractingPrompt, setExtractingPrompt] = useState(false);
  const [generatingKeys, setGeneratingKeys] = useState(new Set<string>());
  const [generatingAudioIds, setGeneratingAudioIds] = useState(new Set<string>());
  const [refreshingAudioIds, setRefreshingAudioIds] = useState(new Set<string>());
  const [generateError, setGenerateError] = useState("");
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [showConfirmNavigate, setShowConfirmNavigate] = useState(false);
  const [pendingPromptsWithoutImage, setPendingPromptsWithoutImage] = useState<string[]>([]);
  const [refreshVersion, setRefreshVersion] = useState(0);  // Version to force image refresh

  // Generation settings: resolution and count
  const [resolutionPreset, setResolutionPreset] = useState(0); // index of RESOLUTION_PRESETS
  const [customWidth, setCustomWidth] = useState(512);
  const [customHeight, setCustomHeight] = useState(512);
  const [imageCount, setImageCount] = useState(1);

  // Model configuration
  const [showModelConfig, setShowModelConfig] = useState(false);
  const [imageProvider, setImageProvider] = useState("kling_image");
  const [videoProvider, setVideoProvider] = useState("jimeng_video_v30");
  const [ttsProvider, setTtsProvider] = useState("auto");

  // Get current resolution
  const currentResolution = resolutionPreset === RESOLUTION_PRESETS.length - 1 // custom
    ? { width: customWidth, height: customHeight }
    : RESOLUTION_PRESETS[resolutionPreset];

  // Check configured API providers
  useEffect(() => {
    fetch(`${BACKEND}/api/settings/configured`)
      .then(r => r.json())
      .then((data: { configured: string[] }) => setConfiguredProviders(data.configured ?? []))
      .catch(() => {});
  }, []);

  const loadAssets = async () => {
    if (!projectId) return;
    const r = await fetch(`${BACKEND}/api/assets/project/${projectId}`);
    setAssets(await r.json());
  };

  // Load project and restore asset_prompts_map
  const loadProjectAndAssets = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/projects/${projectId}`);
      const project = await r.json();
      setProjectType(project.type || "manga_2d");
      const assetsData = await fetch(`${BACKEND}/api/assets/project/${projectId}`).then(r => r.json());
      setAssets(assetsData);

      // Build a map of existing assets by type
      const existingAssetsByType: Record<string, Asset[]> = {
        character: assetsData.filter((a: Asset) => a.type === 'character'),
        scene: assetsData.filter((a: Asset) => a.type === 'scene'),
        prop: assetsData.filter((a: Asset) => a.type === 'prop'),
      };

      // Restore asset_prompts_map
      const map = project.asset_prompts_map;
      let loadedItems: PromptState = { character: [], scene: [], prop: [] };
      let loadedAssetIds: Record<string, string[]> = { character: [], scene: [], prop: [] };

      if (map && Object.keys(map).length > 0) {
        const firstItem = (map as any).character?.[0];
        if (firstItem && typeof firstItem === 'object' && 'prompt' in firstItem) {
          // New format: extract prompts and names
          for (const type of ["character", "scene", "prop"] as const) {
            const items = (map as any)[type] || [];
            for (const item of items) {
              loadedItems[type].push({
                name: item.name || "",
                prompt: item.prompt || "",
                prompt_en: item.prompt_en || ""
              });
              // Try to find matching asset:
              // 1. By assetId (if stored in map)
              // 2. By name (most reliable match)
              // 3. By prompt (fallback, may not work due to CN/EN mismatch)
              let matchingAsset = null;
              if (item.assetId) {
                matchingAsset = existingAssetsByType[type].find(a => a.id === item.assetId);
              }
              if (!matchingAsset && item.name) {
                matchingAsset = existingAssetsByType[type].find(a => a.name === item.name);
              }
              if (!matchingAsset) {
                // Last resort: try to match by prompt (may fail if CN vs EN)
                matchingAsset = existingAssetsByType[type].find(a => a.prompt === item.prompt || a.prompt === item.prompt_en);
              }
              loadedAssetIds[type].push(matchingAsset?.id || item.assetId || "");
            }
          }
        } else {
          // Old format - convert to new format
          const oldPrompts = map as { character: string[]; scene: string[]; prop: string[] };
          for (const type of ["character", "scene", "prop"] as const) {
            const prompts = oldPrompts[type] || [];
            for (const p of prompts) {
              loadedItems[type].push({ name: "", prompt: p });
            }
          }
        }
      }

      // If no prompts loaded or all assetIds empty, migrate from existing assets
      const hasAnyAssetId = Object.values(loadedAssetIds).some(ids => ids.some(id => id));
      const hasAnyContent = Object.values(loadedItems).some(items => items.some((i: PromptItem) => i.name || i.prompt));
      if (!hasAnyAssetId && !hasAnyContent) {
        // Clear and rebuild from existing assets with images
        for (const type of ["character", "scene", "prop"] as const) {
          const assetsWithType = existingAssetsByType[type];
          const assetsWithImage = assetsWithType.filter((a: Asset) => a.has_image);
          if (assetsWithImage.length > 0) {
            // Use assets with images
            loadedItems[type] = assetsWithImage.map((a: Asset) => ({
              name: a.name || "",
              prompt: a.prompt || ""
            }));
            loadedAssetIds[type] = assetsWithImage.map((a: Asset) => a.id);
          }
        }
      }

      // Ensure at least one empty cell for each type
      for (const type of ["character", "scene", "prop"] as const) {
        if (loadedItems[type].length === 0) {
          loadedItems[type] = [{ name: "", prompt: "" }];
          loadedAssetIds[type] = [];
        }
      }

      setInlinePrompts(loadedItems);
      setPromptAssetIds(loadedAssetIds);

      // Save to backend
      const mapToSave: Record<string, any> = {};
      for (const type of ["character", "scene", "prop"] as const) {
        mapToSave[type] = loadedItems[type].map((item: PromptItem, i: number) => ({
          name: item.name,
          prompt: item.prompt,
          prompt_en: item.prompt_en || "",
          assetId: loadedAssetIds[type][i] || "",
        }));
      }
      await fetch(`${BACKEND}/api/projects/${projectId}/asset-prompts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_prompts_map: mapToSave }),
      });

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjectAndAssets(); }, [projectId]);

  // Save prompts map to backend
  const savePromptsMap = async (updatedAssetIds?: Record<string, string[]>) => {
    if (!projectId) return;
    const assetIdsToUse = updatedAssetIds || promptAssetIds;
    const mapToSave: Record<string, any> = {};
    for (const type of ["character", "scene", "prop"] as const) {
      const items = inlinePrompts[type] || [];
      const assetIds = assetIdsToUse[type] || [];
      mapToSave[type] = items.map((item: PromptItem, i: number) => ({
        name: item.name,
        prompt: item.prompt,
        prompt_en: item.prompt_en || "",
        assetId: assetIds[i] || "",
      }));
    }
    await fetch(`${BACKEND}/api/projects/${projectId}/asset-prompts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset_prompts_map: mapToSave }),
    });
  };

  const filtered = tab === "all"
    ? assets.filter((a) => a.type !== "video") // "all" shows all except video
    : assets.filter((a) => a.type === tab);
  const typeLabel = ASSET_TABS.find((t) => t.key === tab)?.label ?? tab;

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await fetch(`${BACKEND}/api/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          type: tab,
          name: form.name,
          description: form.description || undefined,
          prompt: form.prompt || undefined,
          tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        }),
      });
      await loadAssets();
      setCreateOpen(false);
      setForm({ name: "", description: "", prompt: "", tags: "" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`${BACKEND}/api/assets/${id}`, { method: "DELETE" });
    setAssets(assets.filter((a) => a.id !== id));
  };

  // Extract prompt from script breakdown
  const handleExtractFromScript = async () => {
    if (!projectId) {
      setGenerateError("请先选择一个项目");
      return;
    }
    setExtractingPrompt(true);
    setGenerateError("");
    try {
      const r = await fetch(`${BACKEND}/api/projects/${projectId}`);
      if (!r.ok) {
        setGenerateError("项目不存在或网络错误");
        return;
      }
      const project = await r.json();
      const breakdown = project.breakdown_result;

      if (!breakdown || (typeof breakdown === 'object' && Object.keys(breakdown).length === 0)) {
        setGenerateError("未找到剧本拆解结果，请先在剧本工坊完成「拆解剧本」");
        return;
      }

      // Check if breakdown has the expected structure
      const hasCharacters = breakdown.characters && Array.isArray(breakdown.characters) && breakdown.characters.length > 0;
      const hasScenes = breakdown.key_scenes && Array.isArray(breakdown.key_scenes) && breakdown.key_scenes.length > 0;
      const hasProps = breakdown.key_props && Array.isArray(breakdown.key_props) && breakdown.key_props.length > 0;
      const hasWorldview = breakdown.worldview && (breakdown.worldview.era || breakdown.worldview.location || breakdown.worldview.setting);

      console.log("breakdown_result:", breakdown); // Debug log
      console.log("hasCharacters:", hasCharacters, "hasScenes:", hasScenes, "hasProps:", hasProps, "hasWorldview:", hasWorldview);

      if (!hasCharacters && !hasScenes && !hasProps && !hasWorldview) {
        setGenerateError("剧本拆解结果中缺少角色、场景、道具信息。请重新拆解剧本。");
        return;
      }

      // Get project type to add style prefix to prompts
      const projectType = project.type || "manga_2d";
      const stylePrefixMap: Record<string, string> = {
        manga_2d: "anime style, 2D anime illustration, Japanese anime aesthetic, ",
        anime_2d: "anime style, 2D animation, Chinese anime aesthetic, ",
        manga_3d: "3D anime style, 3D rendered anime character, stylized 3D, ",
        anime_3d: "3D anime style, 3D rendered anime character, stylized 3D, ",
        live_action: "",  // Realistic live action, no animation prefix needed
        overseas_live: "cinematic, photorealistic, live action, ",
      };
      const stylePrefix = stylePrefixMap[projectType] || "";

      // Extract characters - Chinese appearance for display, English for generation
      const characterItems: PromptItem[] = breakdown.characters
        ? breakdown.characters.map((c: any) => {
            return {
              name: c.name || "",
              prompt: c.appearance || "",  // LLM生成的中文描述
              prompt_en: stylePrefix + (c.character_prompt || c.appearance || ""),  // 英文生图提示词
            };
          })
        : [];

      // Derive era prefix from worldview.era to avoid ancient/modern confusion
      const eraText = breakdown.worldview?.era || "";
      let eraPrefix = "";
      if (eraText.includes("古代") || eraText.includes("唐朝") || eraText.includes("明朝") || eraText.includes("清朝") || eraText.includes("民国") || eraText.includes("历史") || eraText.includes("古装")) {
        eraPrefix = "ancient Chinese era, historical setting, ";
      } else if (eraText.includes("现代") || eraText.includes("当代") || eraText.includes("都市") || eraText.includes("21世纪") || eraText.includes("城市")) {
        eraPrefix = "modern era, contemporary setting, ";
      } else if (eraText.includes("未来") || eraText.includes("科幻") || eraText.includes("末世")) {
        eraPrefix = "futuristic era, sci-fi setting, ";
      }

      // Extract scenes - add style prefix with era and no-people constraint
      const sceneStylePrefixMap: Record<string, string> = {
        manga_2d: "anime style background, 2D anime scenery, empty scene, no people, ",
        anime_2d: "anime style background, 2D anime scenery, empty scene, no people, ",
        manga_3d: "3D anime style background, stylized 3D environment, empty scene, no people, ",
        anime_3d: "3D anime style background, stylized 3D environment, empty scene, no people, ",
        overseas_live: "cinematic scene, realistic environment, empty scene, no people, ",
      };
      const sceneStylePrefix = eraPrefix + (sceneStylePrefixMap[projectType] || "");

      // Step 0: Extract nouns from all scene and prop items (remove verbs via LLM)
      // Collect ALL items (both string and object types) for noun extraction
      const sceneStringIndices: number[] = [];
      const sceneStrings: string[] = [];
      breakdown.key_scenes?.forEach((s: any, idx: number) => {
        const text = typeof s === 'object' ? (s.description || s.scene || "") : s;
        if (text) {
          sceneStringIndices.push(idx);
          sceneStrings.push(text);
        }
      });

      const propStringIndices: number[] = [];
      const propStrings: string[] = [];
      breakdown.key_props?.forEach((p: any, idx: number) => {
        const text = typeof p === 'object' ? (p.description || p.name || "") : p;
        if (text) {
          propStringIndices.push(idx);
          propStrings.push(text);
        }
      });

      // Map from original index to extracted noun
      const sceneNounMap: Record<number, string> = {};
      const sceneNounEnMap: Record<number, string> = {};
      const propNounMap: Record<number, string> = {};
      const propNounEnMap: Record<number, string> = {};

      // 中文风格前缀
      const eraPrefixCn = eraText.includes("古代") || eraText.includes("唐朝") || eraText.includes("明朝") || eraText.includes("清朝") || eraText.includes("民国") || eraText.includes("历史") || eraText.includes("古装")
        ? "古代中国时期，历史背景，"
        : eraText.includes("现代") || eraText.includes("当代") || eraText.includes("都市") || eraText.includes("21世纪") || eraText.includes("城市")
        ? "现代都市，当代背景，"
        : "";
      const scenePrefixCn = eraPrefixCn + "动漫风格背景，2D动漫场景，空旷场景，无人，";
      const propPrefixCn = eraPrefixCn + "动漫风格物品，2D动漫元素，独立物品，无人物，";

      if (sceneStrings.length > 0) {
        try {
          const extractRes = await fetch(`${BACKEND}/api/scripts/extract-nouns`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts: sceneStrings, type: "scene" }),
          });
          if (extractRes.ok) {
            const { nouns, nouns_en } = await extractRes.json();
            // Map nouns back to original indices
            sceneStringIndices.forEach((origIdx, nounIdx) => {
              sceneNounMap[origIdx] = nouns[nounIdx] || sceneStrings[nounIdx];
              sceneNounEnMap[origIdx] = nouns_en?.[nounIdx] || sceneStrings[nounIdx];
            });
          }
        } catch (e) {
          console.warn("Scene noun extraction failed", e);
        }
      }

      if (propStrings.length > 0) {
        try {
          const extractRes = await fetch(`${BACKEND}/api/scripts/extract-nouns`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts: propStrings, type: "prop" }),
          });
          if (extractRes.ok) {
            const { nouns, nouns_en } = await extractRes.json();
            // Map nouns back to original indices
            propStringIndices.forEach((origIdx, nounIdx) => {
              propNounMap[origIdx] = nouns[nounIdx] || propStrings[nounIdx];
              propNounEnMap[origIdx] = nouns_en?.[nounIdx] || propStrings[nounIdx];
            });
          }
        } catch (e) {
          console.warn("Prop noun extraction failed", e);
        }
      }

      const sceneItems: PromptItem[] = [];
      if (breakdown.key_scenes && Array.isArray(breakdown.key_scenes)) {
        breakdown.key_scenes.forEach((s: any, idx: number) => {
          // All items have been processed by extract-nouns
          const nounText = sceneNounMap[idx] || (typeof s === 'object' ? (s.description || s.scene || "") : s);
          const nounEnText = sceneNounEnMap[idx] || (typeof s === 'object' ? (s.description_en || "") : nounText);
          const name = typeof s === 'object' ? (s.name || s.scene || "") : nounText.match(/^([^（\(]+)/)?.[1]?.trim() || nounText.slice(0, 20);
          // 中文 = 中文风格前缀 + 中文纯名词
          const promptCn = scenePrefixCn + nounText;
          // 英文 = 英文风格前缀 + 英文纯名词
          const promptEn = sceneStylePrefix + nounEnText;
          sceneItems.push({ name, prompt: promptCn, prompt_en: promptEn });
        });
      }
      // Fallback to worldview if no key_scenes
      if (sceneItems.length === 0 && breakdown.worldview) {
        if (breakdown.worldview.era) sceneItems.push({ name: "时代背景", prompt: scenePrefixCn + breakdown.worldview.era, prompt_en: sceneStylePrefix + breakdown.worldview.era });
        if (breakdown.worldview.location) sceneItems.push({ name: "主要地点", prompt: scenePrefixCn + breakdown.worldview.location, prompt_en: sceneStylePrefix + breakdown.worldview.location });
        if (breakdown.worldview.setting) sceneItems.push({ name: "世界观", prompt: scenePrefixCn + breakdown.worldview.setting, prompt_en: sceneStylePrefix + breakdown.worldview.setting });
      }

      // Extract props
      const propStylePrefixMap: Record<string, string> = {
        manga_2d: "anime style object, 2D anime item, isolated object, no people, ",
        anime_2d: "anime style object, 2D anime item, isolated object, no people, ",
        manga_3d: "3D anime style object, stylized 3D prop, isolated object, no people, ",
        anime_3d: "3D anime style object, stylized 3D prop, isolated object, no people, ",
        overseas_live: "realistic object, photorealistic prop, isolated object, no people, ",
      };
      const propStylePrefix = eraPrefix + (propStylePrefixMap[projectType] || "");
      const propItems: PromptItem[] = [];
      if (breakdown.key_props && Array.isArray(breakdown.key_props)) {
        breakdown.key_props.forEach((p: any, idx: number) => {
          // All items have been processed by extract-nouns
          const nounText = propNounMap[idx] || (typeof p === 'object' ? (p.description || p.name || "") : p);
          const nounEnText = propNounEnMap[idx] || (typeof p === 'object' ? (p.description_en || "") : nounText);
          const name = typeof p === 'object' ? (p.name || "") : nounText.match(/^([^（\(]+)/)?.[1]?.trim() || nounText.slice(0, 20);
          // 中文 = 中文风格前缀 + 中文纯名词
          const promptCn = propPrefixCn + nounText;
          // 英文 = 英文风格前缀 + 英文纯名词
          const promptEn = propStylePrefix + nounEnText;
          propItems.push({ name, prompt: promptCn, prompt_en: promptEn });
        });
      }

      // Scene and prop items now have both Chinese and English prompts with style prefixes
      // No need for additional translation steps since extract-nouns returns both languages

      // Also extract character appearances as additional assets
      if (breakdown.characters && Array.isArray(breakdown.characters)) {
        breakdown.characters.forEach((c: any) => {
          if (c.appearance && !c.character_prompt) {
            // Add appearance as additional prompt for existing character
            const existing = characterItems.find(ci => ci.name === c.name);
            if (existing && !existing.prompt) {
              existing.prompt = c.appearance;
            }
          }
        });
      }

      // Translate English character_prompt to Chinese for display
      if (characterItems.length > 0) {
        const charsWithEn = breakdown.characters?.filter((c: any) => c.character_prompt) || [];
        if (charsWithEn.length > 0) {
          try {
            const textsToTranslate = charsWithEn.map((c: any) => c.character_prompt);
            const transRes = await fetch(`${BACKEND}/api/scripts/translate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ texts: textsToTranslate }),
            });
            if (transRes.ok) {
              const { translations } = await transRes.json();
              let ti = 0;
              for (let i = 0; i < breakdown.characters.length && ti < translations.length; i++) {
                if (breakdown.characters[i]?.character_prompt && ti < characterItems.length) {
                  characterItems[i].prompt = translations[ti] || characterItems[i].prompt;
                  ti++;
                }
              }
            }
          } catch (e) {
            console.warn("LLM翻译失败，使用原始中文外观描述", e);
          }
        }
      }


      // Merge extracted items with existing user-added items (preserve items with assetId/image)
      const mergeWithExisting = (
        extractedItems: PromptItem[],
        existingItems: PromptItem[],
        existingAssetIds: string[]
      ): { items: PromptItem[], assetIds: string[] } => {
        const mergedItems: PromptItem[] = [...extractedItems];
        const mergedAssetIds: string[] = extractedItems.map(() => "");

        // Add existing items that have assetId (already generated image) and not in extracted list
        for (let i = 0; i < existingItems.length; i++) {
          const existing = existingItems[i];
          const hasAsset = existingAssetIds[i] && existingAssetIds[i].trim() !== "";
          // Check if this item is already in extracted list (by name)
          const alreadyExtracted = extractedItems.some(e => e.name === existing.name);
          if (!alreadyExtracted && (hasAsset || existing.name || existing.prompt)) {
            mergedItems.push(existing);
            mergedAssetIds.push(existingAssetIds[i] || "");
          }
        }

        // Ensure at least one empty cell if nothing exists
        if (mergedItems.length === 0) {
          mergedItems.push({ name: "", prompt: "" });
          mergedAssetIds.push("");
        }
        return { items: mergedItems, assetIds: mergedAssetIds };
      };

      const mergedCharacter = mergeWithExisting(characterItems, inlinePrompts.character || [], promptAssetIds.character || []);
      const mergedScene = mergeWithExisting(sceneItems, inlinePrompts.scene || [], promptAssetIds.scene || []);
      const mergedProp = mergeWithExisting(propItems, inlinePrompts.prop || [], promptAssetIds.prop || []);

      setInlinePrompts({
        character: mergedCharacter.items,
        scene: mergedScene.items,
        prop: mergedProp.items,
      });
      setPromptAssetIds({
        character: mergedCharacter.assetIds,
        scene: mergedScene.assetIds,
        prop: mergedProp.assetIds,
      });

      if (characterItems.length === 0 && sceneItems.length === 0 && propItems.length === 0) {
        setGenerateError("剧本中没有找到可提取的资产信息");
      } else {
        // Persist extracted prompts to backend immediately so they survive refresh
        const mapToSave: Record<string, any> = {};
        for (const type of ["character", "scene", "prop"] as const) {
          const items = { character: mergedCharacter.items, scene: mergedScene.items, prop: mergedProp.items }[type];
          const ids = { character: mergedCharacter.assetIds, scene: mergedScene.assetIds, prop: mergedProp.assetIds }[type];
          mapToSave[type] = items.map((item: PromptItem, i: number) => ({
            name: item.name,
            prompt: item.prompt,
            prompt_en: item.prompt_en || "",
            assetId: ids[i] || "",
          }));
        }
        await fetch(`${BACKEND}/api/projects/${projectId}/asset-prompts`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ asset_prompts_map: mapToSave }),
        });
        success(`已提取 ${characterItems.length} 角色、${sceneItems.length} 场景、${propItems.length} 道具`);
      }
    } catch (e) {
      console.error("Extract error:", e);
      setGenerateError("提取失败: " + (e instanceof Error ? e.message : "请检查项目状态或网络连接"));
    } finally {
      setExtractingPrompt(false);
    }
  };

  // Regenerate a single prompt cell from the breakdown by name
  const handleRefreshSinglePrompt = async (type: "character" | "scene" | "prop", index: number) => {
    if (!projectId) return;
    const item = inlinePrompts[type]?.[index];
    const itemName = item?.name;
    if (!itemName) return;

    try {
      const r = await fetch(`${BACKEND}/api/projects/${projectId}`);
      if (!r.ok) return;
      const project = await r.json();
      const breakdown = project.breakdown_result;
      if (!breakdown) return;

      const projectType = project.type || "manga_2d";
      const stylePrefixMap: Record<string, string> = {
        manga_2d: "anime style, 2D anime illustration, Japanese anime aesthetic, ",
        anime_2d: "anime style, 2D animation, Chinese anime aesthetic, ",
        manga_3d: "3D anime style, 3D rendered anime character, stylized 3D, ",
        anime_3d: "3D anime style, 3D rendered anime character, stylized 3D, ",
        live_action: "",
        overseas_live: "cinematic, photorealistic, live action, ",
      };
      const stylePrefix = stylePrefixMap[projectType] || "";

      // Derive era prefix from worldview.era
      const eraText = breakdown.worldview?.era || "";
      let eraPrefix = "";
      if (eraText.includes("古代") || eraText.includes("唐朝") || eraText.includes("明朝") || eraText.includes("清朝") || eraText.includes("民国") || eraText.includes("历史") || eraText.includes("古装")) {
        eraPrefix = "ancient Chinese era, historical setting, ";
      } else if (eraText.includes("现代") || eraText.includes("当代") || eraText.includes("都市") || eraText.includes("21世纪") || eraText.includes("城市")) {
        eraPrefix = "modern era, contemporary setting, ";
      } else if (eraText.includes("未来") || eraText.includes("科幻") || eraText.includes("末世")) {
        eraPrefix = "futuristic era, sci-fi setting, ";
      }

      const sceneStylePrefixMap: Record<string, string> = {
        manga_2d: "anime style background, 2D anime scenery, empty scene, no people, ",
        anime_2d: "anime style background, 2D anime scenery, empty scene, no people, ",
        manga_3d: "3D anime style background, stylized 3D environment, empty scene, no people, ",
        anime_3d: "3D anime style background, stylized 3D environment, empty scene, no people, ",
        overseas_live: "cinematic scene, realistic environment, empty scene, no people, ",
      };
      const sceneStylePrefix = eraPrefix + (sceneStylePrefixMap[projectType] || "");
      const propStylePrefixMap: Record<string, string> = {
        manga_2d: "anime style object, 2D anime item, isolated object, no people, ",
        anime_2d: "anime style object, 2D anime item, isolated object, no people, ",
        manga_3d: "3D anime style object, stylized 3D prop, isolated object, no people, ",
        anime_3d: "3D anime style object, stylized 3D prop, isolated object, no people, ",
        overseas_live: "realistic object, photorealistic prop, isolated object, no people, ",
      };
      const propStylePrefix = eraPrefix + (propStylePrefixMap[projectType] || "");

      // 中文风格前缀
      const eraPrefixCn = eraText.includes("古代") || eraText.includes("唐朝") || eraText.includes("明朝") || eraText.includes("清朝") || eraText.includes("民国") || eraText.includes("历史") || eraText.includes("古装")
        ? "古代中国时期，历史背景，"
        : eraText.includes("现代") || eraText.includes("当代") || eraText.includes("都市") || eraText.includes("21世纪") || eraText.includes("城市")
        ? "现代都市，当代背景，"
        : "";
      const scenePrefixCn = eraPrefixCn + "动漫风格背景，2D动漫场景，空旷场景，无人，";
      const propPrefixCn = eraPrefixCn + "动漫风格物品，2D动漫元素，独立物品，无人物，";

      if (type === "character" && breakdown.characters) {
        const ch = breakdown.characters.find((c: any) => c.name === itemName);
        if (!ch) return;
        let newPrompt = ch.appearance || item.prompt;
        let newPromptEn = stylePrefix + (ch.character_prompt || ch.appearance || "");
        if (ch.character_prompt) {
          try {
            const transRes = await fetch(`${BACKEND}/api/scripts/translate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ texts: [ch.character_prompt] }),
            });
            if (transRes.ok) {
              const { translations } = await transRes.json();
              if (translations[0]) newPrompt = translations[0];
            }
          } catch {}
        }
        setInlinePrompts(prev => ({
          ...prev,
          character: prev.character.map((p, i) => i === index ? { ...p, prompt: newPrompt, prompt_en: newPromptEn } : p),
        }));
      } else if (type === "scene" && breakdown.key_scenes) {
        let sc = breakdown.key_scenes.find((s: any) => {
          const sName = typeof s === 'object' ? (s.name || s.scene || "") : s;
          // 去掉逗号和空格进行匹配
          const sNameClean = sName.replace(/[，,]/g, '').replace(/\s+/g, '');
          const itemNameClean = itemName.replace(/[，,]/g, '').replace(/\s+/g, '');
          return typeof sName === 'string' && sNameClean.includes(itemNameClean) || itemNameClean.includes(sNameClean);
        });
        if (!sc) {
          // 如果找不到，尝试用第一个字符匹配
          const firstChar = itemName.charAt(0);
          sc = breakdown.key_scenes.find((s: any) => {
            const sName = typeof s === 'object' ? (s.name || s.scene || "") : s;
            return typeof sName === 'string' && sName.startsWith(firstChar);
          });
        }
        if (!sc) return;
        const scCnRaw = typeof sc === 'object' ? (sc.description || sc.scene || "") : sc;
        const scEnFromLLM = typeof sc === 'object' ? (sc.description_en || "") : "";

        // Step 1: Call extract-nouns to get Chinese AND English pure nouns (remove verbs via LLM)
        let scCnClean = scCnRaw;
        let scEnClean = scEnFromLLM;

        // Always call extract-nouns to ensure pure nouns in both languages
        try {
          const extractRes = await fetch(`${BACKEND}/api/scripts/extract-nouns`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts: [scCnRaw], type: "scene" }),
          });
          if (extractRes.ok) {
            const { nouns, nouns_en } = await extractRes.json();
            scCnClean = nouns[0] || scCnRaw;
            scEnClean = nouns_en?.[0] || scEnFromLLM || scCnClean;
          }
        } catch {}

        // Step 2: Build prompt_cn = Chinese style prefix + Chinese pure nouns
        const promptCn = scenePrefixCn + scCnClean;

        // Step 3: Build prompt_en = English style prefix + English pure nouns
        const promptEn = sceneStylePrefix + scEnClean;

        setInlinePrompts(prev => ({
          ...prev,
          scene: prev.scene.map((p, i) => i === index ? { ...p, prompt: promptCn, prompt_en: promptEn } : p),
        }));
      } else if (type === "prop" && breakdown.key_props) {
        let pr = breakdown.key_props.find((p: any) => {
          const pName = typeof p === 'object' ? (p.name || "") : p;
          // 去掉逗号和空格进行匹配
          const pNameClean = pName.replace(/[，,]/g, '').replace(/\s+/g, '');
          const itemNameClean = itemName.replace(/[，,]/g, '').replace(/\s+/g, '');
          return typeof pName === 'string' && pNameClean.includes(itemNameClean) || itemNameClean.includes(pNameClean);
        });
        if (!pr) {
          // 如果找不到，尝试用第一个字符匹配
          const firstChar = itemName.charAt(0);
          pr = breakdown.key_props.find((p: any) => {
            const pName = typeof p === 'object' ? (p.name || "") : p;
            return typeof pName === 'string' && pName.startsWith(firstChar);
          });
        }
        if (!pr) return;
        const prCnRaw = typeof pr === 'object' ? (pr.description || pr.name || "") : pr;
        const prEnFromLLM = typeof pr === 'object' ? (pr.description_en || "") : "";

        // Step 1: Call extract-nouns to get Chinese AND English pure nouns (remove verbs via LLM)
        let prCnClean = prCnRaw;
        let prEnClean = prEnFromLLM;

        // Always call extract-nouns to ensure pure nouns in both languages
        try {
          const extractRes = await fetch(`${BACKEND}/api/scripts/extract-nouns`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts: [prCnRaw], type: "prop" }),
          });
          if (extractRes.ok) {
            const { nouns, nouns_en } = await extractRes.json();
            prCnClean = nouns[0] || prCnRaw;
            prEnClean = nouns_en?.[0] || prEnFromLLM || prCnClean;
          }
        } catch {}

        // Step 2: Build prompt_cn = Chinese style prefix + Chinese pure nouns
        const promptCn = propPrefixCn + prCnClean;

        // Step 3: Build prompt_en = English style prefix + English pure nouns
        const promptEn = propStylePrefix + prEnClean;

        setInlinePrompts(prev => ({
          ...prev,
          prop: prev.prop.map((p, i) => i === index ? { ...p, prompt: promptCn, prompt_en: promptEn } : p),
        }));
      }

      await savePromptsMap();
      success(`已重新提取「${itemName}」`);
    } catch (e) {
      console.warn("Single refresh failed:", e);
      toastError(`重新提取「${itemName}」失败`);
    }
  };

  // Generate audio for a character asset
  const handleGenerateAudio = async (index: number) => {
    const assetId = (promptAssetIds.character || [])[index];
    if (!assetId) {
      toastError("请先生成角色图片");
      return;
    }
    const asset = assets.find(a => a.id === assetId);
    const audioText = asset?.tts_config?.text || asset?.tts_config?.prompt || asset?.description || asset?.name;
    if (!audioText) {
      toastError("缺少音频提示词");
      return;
    }

    setGeneratingAudioIds(prev => new Set(prev).add(assetId));
    try {
      const res = await fetch(`${BACKEND}/api/assets/${assetId}/synthesize-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: audioText,
          voice: asset?.tts_config?.voice || "Cherry",
          provider: "auto",
          instructions: asset?.tts_config?.prompt || "",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "音频生成失败");
      }
      await loadAssets();
      success("音频已生成");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "音频生成失败");
    } finally {
      setGeneratingAudioIds(prev => {
        const next = new Set(prev);
        next.delete(assetId);
        return next;
      });
    }
  };

  // Refresh audio prompt from script (extract voice characteristics)
  const handleRefreshAudioPrompt = async (index: number) => {
    const assetId = (promptAssetIds.character || [])[index];
    if (!assetId) {
      toastError("请先生成角色图片");
      return;
    }

    setRefreshingAudioIds(prev => new Set(prev).add(assetId));
    try {
      const res = await fetch(`${BACKEND}/api/assets/${assetId}/extract-voice-prompt`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "提取声音特点失败");
      }
      await loadAssets();
      success("已提取声音特点");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "提取声音特点失败");
    } finally {
      setRefreshingAudioIds(prev => {
        const next = new Set(prev);
        next.delete(assetId);
        return next;
      });
    }
  };

  // Generate audio for a character asset by asset ID (for grid view)
  const handleGenerateAudioById = async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    const audioText = asset?.tts_config?.text || asset?.tts_config?.prompt || asset?.description || asset?.name;
    if (!audioText) {
      toastError("缺少音频提示词");
      return;
    }
    setGeneratingAudioIds(prev => new Set(prev).add(assetId));
    try {
      const res = await fetch(`${BACKEND}/api/assets/${assetId}/synthesize-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: audioText,
          voice: asset?.tts_config?.voice || "Cherry",
          provider: "auto",
          instructions: asset?.tts_config?.prompt || "",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "音频生成失败");
      }
      await loadAssets();
      success("音频已生成");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "音频生成失败");
    } finally {
      setGeneratingAudioIds(prev => { const next = new Set(prev); next.delete(assetId); return next; });
    }
  };

  // Refresh audio prompt by asset ID (for grid view)
  const handleRefreshAudioPromptById = async (assetId: string) => {
    setRefreshingAudioIds(prev => new Set(prev).add(assetId));
    try {
      const res = await fetch(`${BACKEND}/api/assets/${assetId}/extract-voice-prompt`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "提取声音特点失败");
      }
      await loadAssets();
      success("已提取声音特点");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "提取声音特点失败");
    } finally {
      setRefreshingAudioIds(prev => { const next = new Set(prev); next.delete(assetId); return next; });
    }
  };

  // Extract voice prompt from script + auto generate audio (index-based, for "all" tab)
  const handleExtractAndGenerate = async (index: number) => {
    const assetId = (promptAssetIds.character || [])[index];
    if (!assetId) { toastError("请先生成角色图片"); return; }

    // Phase 1: Extract voice prompt + pick voice
    setRefreshingAudioIds(prev => new Set(prev).add(assetId));
    try {
      const res = await fetch(`${BACKEND}/api/assets/${assetId}/extract-voice-prompt`, { method: "POST" });
      if (!res.ok) { const data = await res.json(); throw new Error(data.detail || "提取音色特点失败"); }
      const result = await res.json();
      await loadAssets();
      success(`已提取音色，匹配音色：${result.voice || "默认"}`);

      // Phase 2: Generate audio — voice=LLM选的音色, instructions=音色描述, text=示范台词
      setRefreshingAudioIds(prev => { const next = new Set(prev); next.delete(assetId); return next; });
      setGeneratingAudioIds(prev => new Set(prev).add(assetId));
      const voicePrompt = result.voice_prompt;
      const voiceText = result.text || voicePrompt;
      const voiceId = result.voice || "Cherry";
      if (!voiceText) { toastError("提取的音色提示词为空"); return; }
      const audioRes = await fetch(`${BACKEND}/api/assets/${assetId}/synthesize-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: voiceText,
          voice: voiceId,
          provider: "auto",
          instructions: voicePrompt,
        }),
      });
      if (!audioRes.ok) { const data = await audioRes.json(); throw new Error(data.detail || "音频生成失败"); }
      await loadAssets();
      success("音频已生成");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "提取音色或生成音频失败");
    } finally {
      setRefreshingAudioIds(prev => { const next = new Set(prev); next.delete(assetId); return next; });
      setGeneratingAudioIds(prev => { const next = new Set(prev); next.delete(assetId); return next; });
    }
  };

  // Extract voice prompt + auto generate audio by asset ID (for grid view)
  const handleExtractAndGenerateById = async (assetId: string) => {
    // Phase 1: Extract voice prompt + pick voice
    setRefreshingAudioIds(prev => new Set(prev).add(assetId));
    try {
      const res = await fetch(`${BACKEND}/api/assets/${assetId}/extract-voice-prompt`, { method: "POST" });
      if (!res.ok) { const data = await res.json(); throw new Error(data.detail || "提取音色特点失败"); }
      const result = await res.json();
      await loadAssets();
      success(`已提取音色，匹配音色：${result.voice || "默认"}`);

      // Phase 2: Generate audio — voice=LLM选的音色, instructions=音色描述, text=示范台词
      setRefreshingAudioIds(prev => { const next = new Set(prev); next.delete(assetId); return next; });
      setGeneratingAudioIds(prev => new Set(prev).add(assetId));
      const voicePrompt = result.voice_prompt;
      const voiceText = result.text || voicePrompt;
      const voiceId = result.voice || "Cherry";
      if (!voiceText) { toastError("提取的音色提示词为空"); return; }
      const audioRes = await fetch(`${BACKEND}/api/assets/${assetId}/synthesize-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: voiceText,
          voice: voiceId,
          provider: "auto",
          instructions: voicePrompt,
        }),
      });
      if (!audioRes.ok) { const data = await audioRes.json(); throw new Error(data.detail || "音频生成失败"); }
      await loadAssets();
      success("音频已生成");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "提取音色或生成音频失败");
    } finally {
      setRefreshingAudioIds(prev => { const next = new Set(prev); next.delete(assetId); return next; });
      setGeneratingAudioIds(prev => { const next = new Set(prev); next.delete(assetId); return next; });
    }
  };

  // Add new prompt cell for a type
  const handleAddPromptCell = (type: "character" | "scene" | "prop") => {
    setInlinePrompts((prev: PromptState) => ({
      ...prev,
      [type]: [...(prev[type] || []), { name: "", prompt: "" }]
    }));
    setPromptAssetIds((prev) => ({
      ...prev,
      [type]: [...(prev[type] || []), ""]
    }));
  };

  // Update name in a cell
  const handleUpdateName = (type: "character" | "scene" | "prop", index: number, value: string) => {
    setInlinePrompts((prev: PromptState) => ({
      ...prev,
      [type]: prev[type].map((item: PromptItem, i: number) => i === index ? { ...item, name: value } : item)
    }));
  };

  // Update prompt in a cell
  const handleUpdatePrompt = (type: "character" | "scene" | "prop", index: number, value: string) => {
    setInlinePrompts((prev: PromptState) => ({
      ...prev,
      [type]: prev[type].map((item: PromptItem, i: number) => i === index ? { ...item, prompt: value } : item)
    }));
  };

  // Remove prompt cell
  const handleRemovePromptCell = (type: "character" | "scene" | "prop", index: number) => {
    setInlinePrompts((prev: PromptState) => ({
      ...prev,
      [type]: prev[type].filter((_: PromptItem, i: number) => i !== index)
    }));
    setPromptAssetIds((prev) => ({
      ...prev,
      [type]: prev[type].filter((_: string, i: number) => i !== index)
    }));
  };

  // Generate reference image from a specific prompt
  const handleGenerateRefImage = async (type: "character" | "scene" | "prop", index: number) => {
    const item = inlinePrompts[type]?.[index];

    // IMPORTANT: Use prompt_en (English) for image generation APIs
    // Most image generation APIs (Kling, Stability, fal.ai) primarily understand English prompts
    // Chinese prompts may be ignored or misinterpreted, causing wrong style/person generation

    let prompt = item?.prompt_en;  // Must use English prompt for generation

    // If prompt_en is missing or empty, we need to generate it
    if (!prompt?.trim()) {
      // Fallback to prompt (Chinese) but this is problematic for image APIs
      // Log warning for debugging
      console.warn(`[handleGenerateRefImage] prompt_en is empty for ${type}-${index}, falling back to Chinese prompt`);
      prompt = item?.prompt;
    }

    const displayPrompt = item?.prompt;  // Keep Chinese for display description

    // Note: The frontend already added proper style prefixes in prompt/prompt_en
    // Scene/Prop prompts have "no people", "empty scene", "isolated object" constraints
    // No additional prefix should be added here - trust the existing prompt

    if (!prompt?.trim() || !projectId) return;

    const imageProviders = ["stability", "kling_image", "jimeng_image", "fal", "comfyui", "sdwebui"];
    const hasImageConfig = imageProviders.some(p => configuredProviders.includes(p));

    if (!hasImageConfig) {
      setGenerateError("没有配置图像生成模型，请先配置");
      return;
    }

    setGeneratingKeys(prev => new Set(prev).add(`${type}-${index}`));
    setGenerateError("");
    try {
      const typeLabel = ASSET_TABS.find(t => t.key === type)?.label ?? type;
      const itemName = item?.name || `${typeLabel}-${index + 1}`;

      // Check if this cell already has an asset ID
      let assetId = promptAssetIds[type]?.[index];
      let newAssetIdsState: Record<string, string[]> | null = null;

      // IMPORTANT: Always update Asset.prompt before generating image!
      // The Asset table may have old data (pure nouns without style prefix)
      // We must sync the correct prompt (with style prefix) to the database

      if (assetId) {
        // Asset exists - UPDATE its prompt to the correct value (with style prefix)
        await fetch(`${BACKEND}/api/assets/${assetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            type: type,
            name: itemName,
            description: (displayPrompt || prompt).slice(0, 100),
            prompt: prompt,  // Correct prompt with style prefix (prompt_en)
          }),
        });
      } else {
        // Check if an asset with same name+type already exists — if so, update it instead of creating duplicate
        const existingAsset = assets.find(a => a.name === itemName && a.type === type);
        if (existingAsset) {
          assetId = existingAsset.id;
          await fetch(`${BACKEND}/api/assets/${assetId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: projectId,
              type: type,
              name: itemName,
              description: (displayPrompt || prompt).slice(0, 100),
              prompt: prompt,
            }),
          });
        } else {
          // Create a new asset for this cell
          const createRes = await fetch(`${BACKEND}/api/assets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project_id: projectId,
              type: type,
              name: itemName,
              description: (displayPrompt || prompt).slice(0, 100),  // Chinese description for display
              prompt: prompt,  // Enhanced English prompt for generation
            }),
          });
          const newAsset = await createRes.json();
          assetId = newAsset.id;
        }

        // Build new assetIds state immediately for saving
        const currentIds = promptAssetIds[type] || [];
        const newIds = [...currentIds];
        while (newIds.length <= index) {
          newIds.push("");
        }
        newIds[index] = assetId;
        newAssetIdsState = { ...promptAssetIds, [type]: newIds };
        setPromptAssetIds(newAssetIdsState);
      }

      // Generate image(s) for this asset
      const genRes = await fetch(`${BACKEND}/api/assets/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id: assetId,
          provider: "auto",
          width: currentResolution.width,
          height: currentResolution.height,
          count: imageCount,
        }),
      });

      if (!genRes.ok) {
        const errData = await genRes.json().catch(() => ({}));
        throw new Error(errData.detail || "生成失败");
      }

      // Save state to backend with the updated assetIds
      await savePromptsMap(newAssetIdsState || undefined);
      await savePromptsMap();

      // Refresh assets to show the new generated image
      await loadAssets();
      setRefreshVersion(prev => prev + 1);  // Force all PromptCells to refresh images

    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "生成失败，请检查API配置");
    } finally {
      setGeneratingKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${type}-${index}`);
        return newSet;
      });
    }
  };

  const handleGenerate = async (asset: Asset) => {
    await fetch(`${BACKEND}/api/assets/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asset_id: asset.id,
        provider: "auto",
        width: currentResolution.width,
        height: currentResolution.height,
        count: imageCount,
      }),
    });
    await loadAssets();
  };

  const handleSaveVoice = async () => {
    if (!voiceAsset) return;
    setSavingVoice(true);
    try {
      await fetch(`${BACKEND}/api/assets/${voiceAsset.id}/tts-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(voiceDraft),
      });
      await loadAssets();
      setVoiceAsset(null);
    } finally {
      setSavingVoice(false);
    }
  };

  const handleUploadImage = async (asset: Asset, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`${BACKEND}/api/assets/${asset.id}/upload-image`, { method: "POST", body: fd });
    await loadAssets();
  };

  const handleUploadVideo = async () => {
    if (!videoFile || !projectId) return;
    setUploadingVideo(true);
    try {
      const fd = new FormData();
      fd.append("file", videoFile);
      fd.append("name", videoName || videoFile.name);
      if (videoDesc) fd.append("description", videoDesc);
      // Placeholder: the backend doesn't have a video upload endpoint yet
      // Store locally for now
      setVideos(prev => [...prev, {
        id: `video-${Date.now()}`,
        name: videoName || videoFile.name,
        description: videoDesc || undefined,
        duration: 0,
      }]);
      setUploadVideoOpen(false);
      setVideoFile(null);
      setVideoName("");
      setVideoDesc("");
    } finally {
      setUploadingVideo(false);
    }
  };

  // Check for prompts without images before navigating
  const checkAndNavigateToStoryboard = () => {
    const pending: string[] = [];
    for (const type of ["character", "scene", "prop"] as const) {
      const items = inlinePrompts[type] || [];
      const assetIds = promptAssetIds[type] || [];
      for (let i = 0; i < items.length; i++) {
        // Has prompt text but no asset/image
        if (items[i]?.prompt?.trim() && !assetIds[i]) {
          const typeLabel = ASSET_TABS.find(t => t.key === type)?.label ?? type;
          const name = items[i].name || `${typeLabel}-${i + 1}`;
          pending.push(`${name}: ${items[i].prompt.slice(0, 30)}...`);
        }
      }
    }

    if (pending.length > 0) {
      setPendingPromptsWithoutImage(pending);
      setShowConfirmNavigate(true);
    } else {
      navigate(`/storyboard?project=${projectId}`);
    }
  };

  const handleConfirmNavigate = () => {
    setShowConfirmNavigate(false);
    navigate(`/storyboard?project=${projectId}`);
  };

  const handleDeleteVideo = (id: string) => {
    setVideos(videos.filter(v => v.id !== id));
  };

  return (
    <div className="flex h-full flex-col animate-fade-in">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-subtle] header-gradient">
        <div>
          <h1 className="text-lg font-bold gradient-text">资产库</h1>
          <p className="text-xs text-[--text-muted] mt-0.5">
            管理角色、场景、道具资产 · 支持 AI 生成参考图
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={checkAndNavigateToStoryboard}
            icon={<LayoutGrid size={14} />}
          >
            进入分镜规划
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Tabs row - 5 tabs, left aligned, 150px width */}
        <div className="flex gap-2 mb-4">
          {ASSET_TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setGenerateError(""); }}
                className={cn(
                  "w-[150px] flex flex-col items-center justify-center rounded-xl px-2 py-3 transition-all duration-300 group cursor-pointer",
                  isActive
                    ? "bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white border-2 border-violet-300 shadow-lg shadow-violet-500/50 scale-[1.02]"
                    : "bg-[#2a2a3e] text-[--text-secondary] border-2 border-[#3a3a5a] hover:border-violet-400 hover:bg-[#353550] hover:text-violet-300"
                )}
              >
                <div className={cn(
                  "size-7 rounded-full flex items-center justify-center mb-1.5 transition-all duration-200",
                  isActive ? "bg-white/25 shadow-inner" : "bg-[#4a4a6a] group-hover:bg-violet-400/30"
                )}>
                  {t.icon}
                </div>
                <span className={cn(
                  "text-xs font-semibold tracking-wide",
                  isActive && "text-white font-bold"
                )}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Extract button row */}
        {tab !== "video" && (
          <div className="flex items-center gap-3 mb-4">
            <Button
              onClick={handleExtractFromScript}
              loading={extractingPrompt}
              icon={<FileText size={13} />}
              variant="outline"
              size="sm"
            >
              从剧本提取
              <Badge className="ml-1.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] px-1">💰</Badge>
            </Button>
            <span className="text-xs text-[--text-muted]">
              {tab === "all" ? "批量提取角色、场景、道具的提示词" : "自动从剧本拆解结果提取提示词"}
            </span>
            {/* Error display */}
            {generateError && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/20 border border-red-500/30 ml-auto">
                <AlertCircle size={12} className="text-red-400" />
                <span className="text-xs text-red-400">{generateError}</span>
                <button
                  onClick={() => navigate("/settings")}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[--bg-elevated] text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover] transition-colors"
                >
                  <Settings size={12} />
                  配置API
                </button>
              </div>
            )}
          </div>
        )}

        {/* Generation Settings Bar - Resolution and Count */}
        {tab !== "video" && (
          <div className="flex items-center gap-4 mb-4 px-4 py-3 rounded-lg bg-[#18181b] border border-[#3f3f46]">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-[#818cf8]" />
              <span className="text-xs font-medium text-[--text-secondary]">生成设置</span>
            </div>

            {/* Resolution preset selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-[--text-muted]">分辨率</label>
              <select
                value={resolutionPreset}
                onChange={(e) => setResolutionPreset(Number(e.target.value))}
                className="h-7 rounded-md px-2 text-xs bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none focus:border-[#6366f1]"
              >
                {RESOLUTION_PRESETS.map((preset, i) => (
                  <option key={i} value={i} className="bg-[#27272a] text-gray-200">
                    {preset.label} {preset.width > 0 ? `(${preset.width}×${preset.height})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom width/height inputs when "自定义" selected */}
            {resolutionPreset === RESOLUTION_PRESETS.length - 1 && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Number(e.target.value) || 512)}
                  min={256}
                  max={2048}
                  className="w-16 h-7 rounded-md px-2 text-xs bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none focus:border-[#6366f1]"
                  placeholder="宽"
                />
                <span className="text-xs text-[--text-muted]">×</span>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value) || 512)}
                  min={256}
                  max={2048}
                  className="w-16 h-7 rounded-md px-2 text-xs bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none focus:border-[#6366f1]"
                  placeholder="高"
                />
              </div>
            )}

            {/* Image count selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-[--text-muted]">张数</label>
              <select
                value={imageCount}
                onChange={(e) => setImageCount(Number(e.target.value))}
                className="h-7 rounded-md px-2 text-xs bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none focus:border-[#6366f1]"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n} className="bg-[#27272a] text-gray-200">{n} 张</option>
                ))}
              </select>
            </div>

            {/* Model Config Button */}
            <button
              onClick={() => setShowModelConfig(true)}
              className="h-7 px-3 rounded-md bg-[#6366f1]/20 border border-[#6366f1]/40 text-xs text-[#818cf8] flex items-center gap-1.5 hover:bg-[#6366f1]/30 transition-colors"
            >
              <Settings size={12} />
              模型配置
            </button>

            {/* Preview current settings */}
            <div className="ml-auto text-xs text-[--text-muted]">
              当前: {currentResolution.width}×{currentResolution.height} · {imageCount}张
            </div>
          </div>
        )}

        {/* Model Config Modal */}
        {showModelConfig && (
          <Modal
            open={showModelConfig}
            onClose={() => setShowModelConfig(false)}
            title="生成模型配置"
            footer={<Button onClick={() => setShowModelConfig(false)}>确定</Button>}
          >
            <div className="p-4 space-y-4">
              {/* Image Generation Model */}
              <div className="flex items-center gap-4">
                <label className="text-sm text-[--text-primary] font-medium w-[120px]">图像生成</label>
                <select
                  value={imageProvider}
                  onChange={(e) => setImageProvider(e.target.value)}
                  className="flex-1 h-9 rounded-md px-3 text-sm bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none"
                >
                  {Object.entries(IMAGE_PROVIDERS).map(([key, label]) => (
                    <option key={key} value={key} className="bg-[#27272a]">{label}</option>
                  ))}
                </select>
                {configuredProviders.includes(imageProvider) ? (
                  <span className="text-xs text-[--success] flex items-center gap-1"><Check size={12} />已配置</span>
                ) : (
                  <span className="text-xs text-yellow-400 flex items-center gap-1"><AlertCircle size={12} />未配置</span>
                )}
              </div>

              {/* Video Generation Model */}
              <div className="flex items-center gap-4">
                <label className="text-sm text-[--text-primary] font-medium w-[120px]">视频生成</label>
                <select
                  value={videoProvider}
                  onChange={(e) => setVideoProvider(e.target.value)}
                  className="flex-1 h-9 rounded-md px-3 text-sm bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none"
                >
                  {Object.entries(VIDEO_PROVIDERS).map(([key, label]) => (
                    <option key={key} value={key} className="bg-[#27272a]">{label}</option>
                  ))}
                </select>
                {configuredProviders.includes(videoProvider) ? (
                  <span className="text-xs text-[--success] flex items-center gap-1"><Check size={12} />已配置</span>
                ) : (
                  <span className="text-xs text-yellow-400 flex items-center gap-1"><AlertCircle size={12} />未配置</span>
                )}
              </div>

              {/* Audio/TTS Model */}
              <div className="flex items-center gap-4">
                <label className="text-sm text-[--text-primary] font-medium w-[120px]">音频生成</label>
                <select
                  value={ttsProvider}
                  onChange={(e) => setTtsProvider(e.target.value)}
                  className="flex-1 h-9 rounded-md px-3 text-sm bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none"
                >
                  <option value="auto" className="bg-[#27272a]">自动选择</option>
                  <option value="edge" className="bg-[#27272a]">Edge TTS (免费)</option>
                  <option value="qwen3_tts" className="bg-[#27272a]">Qwen3-TTS-Instruct-Flash</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[--border]">
                <button
                  onClick={() => navigate("/settings")}
                  className="text-xs text-[#818cf8] hover:text-[#6366f1] underline"
                >
                  前往设置页面配置API密钥
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Prompt cells area - compact square cells */}
        {tab === "all" && (
          <div className="flex gap-3 mb-4">
            {/* Character column with audio cards */}
            <div className="w-[300px] flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[--text-secondary]">角色资产</span>
                <Button
                  onClick={() => handleAddPromptCell("character")}
                  icon={<Plus size={12} />}
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-xs text-[--text-muted] hover:text-[--text-primary]"
                >
                  新增
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {(inlinePrompts.character || []).map((item: PromptItem, index: number) => {
                  const assetId = (promptAssetIds.character || [])[index];
                  const asset = assets.find(a => a.id === assetId);
                  const audioPrompt = asset?.tts_config?.prompt || asset?.description || "";
                  const hasAudio = asset?.has_audio || false;
                  return (
                    <div key={`character-${index}-${assetId || 'empty'}`} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <PromptCell
                          type="character"
                          index={index}
                          name={item.name}
                          prompt={item.prompt}
                          prompt_en={item.prompt_en}
                          assetId={assetId}
                          isActive={true}
                          refreshVersion={refreshVersion}
                          onUpdateName={(value) => handleUpdateName("character", index, value)}
                          onUpdatePrompt={(value) => handleUpdatePrompt("character", index, value)}
                          onRemove={() => handleRemovePromptCell("character", index)}
                          onGenerate={() => handleGenerateRefImage("character", index)}
                          onRefresh={item.name ? () => handleRefreshSinglePrompt("character", index) : undefined}
                          generatingKeys={generatingKeys}
                        />
                      </div>
                      {/* Audio Card with extract button above */}
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleExtractAndGenerate(index)}
                          disabled={refreshingAudioIds.has(assetId || "") || generatingAudioIds.has(assetId || "") || !assetId}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-[--accent] hover:bg-[--accent]/10 border border-[--accent]/20 hover:border-[--accent]/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="从剧本提取角色音色提示词并生成音频"
                        >
                          {refreshingAudioIds.has(assetId || "") ? (
                            <><RefreshCw size={9} className="animate-spin" /> 提取中</>
                          ) : generatingAudioIds.has(assetId || "") ? (
                            <><RefreshCw size={9} className="animate-spin" /> 生成中</>
                          ) : (
                            <><Sparkles size={9} /> 提取音色</>
                          )}
                        </button>
                        <AudioCard
                          assetId={assetId}
                          name={item.name}
                          audioPrompt={audioPrompt}
                          hasAudio={hasAudio}
                          audioPath={asset?.audio_path}
                          onGenerate={() => handleGenerateAudio(index)}
                          generating={generatingAudioIds.has(assetId || "")}
                          onRefresh={() => handleRefreshAudioPrompt(index)}
                          refreshing={refreshingAudioIds.has(assetId || "")}
                        />
                      </div>
                    </div>
                  );
                })}
                {(inlinePrompts.character || []).length === 0 && (
                  <div className="aspect-square rounded-lg border-2 border-dashed border-[--border] flex items-center justify-center text-xs text-[--text-muted]">
                    点击"新增"添加
                  </div>
                )}
              </div>
            </div>

            {/* Scene column */}
            <div className="w-[224px] flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[--text-secondary]">场景资产</span>
                <Button
                  onClick={() => handleAddPromptCell("scene")}
                  icon={<Plus size={12} />}
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-xs text-[--text-muted] hover:text-[--text-primary]"
                >
                  新增
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {(inlinePrompts.scene || []).map((item: PromptItem, index: number) => (
                  <PromptCell
                    key={`scene-${index}-${(promptAssetIds.scene || [])[index] || 'empty'}`}
                    type="scene"
                    index={index}
                    name={item.name}
                    prompt={item.prompt}
                    prompt_en={item.prompt_en}
                    assetId={(promptAssetIds.scene || [])[index]}
                    isActive={true}
                    refreshVersion={refreshVersion}
                    onUpdateName={(value) => handleUpdateName("scene", index, value)}
                    onUpdatePrompt={(value) => handleUpdatePrompt("scene", index, value)}
                    onRemove={() => handleRemovePromptCell("scene", index)}
                    onGenerate={() => handleGenerateRefImage("scene", index)}
                    onRefresh={item.name ? () => handleRefreshSinglePrompt("scene", index) : undefined}
                    generatingKeys={generatingKeys}
                  />
                ))}
                {(inlinePrompts.scene || []).length === 0 && (
                  <div className="aspect-square rounded-lg border-2 border-dashed border-[--border] flex items-center justify-center text-xs text-[--text-muted]">
                    点击"新增"添加
                  </div>
                )}
              </div>
            </div>

            {/* Prop column */}
            <div className="w-[224px] flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[--text-secondary]">道具资产</span>
                <Button
                  onClick={() => handleAddPromptCell("prop")}
                  icon={<Plus size={12} />}
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-xs text-[--text-muted] hover:text-[--text-primary]"
                >
                  新增
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {(inlinePrompts.prop || []).map((item: PromptItem, index: number) => (
                  <PromptCell
                    key={`prop-${index}-${(promptAssetIds.prop || [])[index] || 'empty'}`}
                    type="prop"
                    index={index}
                    name={item.name}
                    prompt={item.prompt}
                    prompt_en={item.prompt_en}
                    assetId={(promptAssetIds.prop || [])[index]}
                    isActive={true}
                    refreshVersion={refreshVersion}
                    onUpdateName={(value) => handleUpdateName("prop", index, value)}
                    onUpdatePrompt={(value) => handleUpdatePrompt("prop", index, value)}
                    onRemove={() => handleRemovePromptCell("prop", index)}
                    onGenerate={() => handleGenerateRefImage("prop", index)}
                    onRefresh={item.name ? () => handleRefreshSinglePrompt("prop", index) : undefined}
                    generatingKeys={generatingKeys}
                  />
                ))}
                {(inlinePrompts.prop || []).length === 0 && (
                  <div className="aspect-square rounded-lg border-2 border-dashed border-[--border] flex items-center justify-center text-xs text-[--text-muted]">
                    点击"新增"添加
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Single type prompt area */}
        {tab !== "all" && tab !== "video" && (
          <div className="flex gap-3 mb-4">
            {(["character", "scene", "prop"] as const).map((type) => {
              const isActive = tab === type;
              const prompts = inlinePrompts[type] || [];
              const assetIds = promptAssetIds[type] || [];
              const typeInfo = ASSET_TABS.find(t => t.key === type);
              return (
                <div key={type} className={cn(
                  "w-[224px] flex flex-col transition-opacity",
                  isActive ? "opacity-100" : "opacity-40"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-xs font-medium",
                      isActive ? "text-[--accent-hover]" : "text-[--text-muted]"
                    )}>{typeInfo?.label}</span>
                    <Button
                      onClick={() => handleAddPromptCell(type)}
                      icon={<Plus size={12} />}
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-5 px-1.5 text-xs",
                        isActive ? "text-[--text-secondary] hover:text-[--text-primary]" : "text-[--text-muted]"
                      )}
                    >
                      新增
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {prompts.map((item: PromptItem, index: number) => (
                      <PromptCell
                        key={`${type}-${index}-${assetIds[index] || 'empty'}`}
                        type={type}
                        index={index}
                        name={item.name}
                        prompt={item.prompt}
                        prompt_en={item.prompt_en}
                        assetId={assetIds[index]}
                        isActive={isActive}
                        refreshVersion={refreshVersion}
                        onUpdateName={(value) => handleUpdateName(type, index, value)}
                        onUpdatePrompt={(value) => handleUpdatePrompt(type, index, value)}
                        onRemove={() => handleRemovePromptCell(type, index)}
                        onGenerate={() => handleGenerateRefImage(type, index)}
                        onRefresh={item.name ? () => handleRefreshSinglePrompt(type, index) : undefined}
                        generatingKeys={generatingKeys}
                      />
                    ))}
                    {prompts.length === 0 && (
                      <div className={cn(
                        "aspect-square rounded-lg border-2 border-dashed flex items-center justify-center text-xs",
                        isActive ? "border-[--accent]/30 text-[--text-muted]" : "border-[--border] text-[--text-muted]"
                      )}>
                        点击"新增"添加
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!projectId ? (
          <div className="text-center py-12 text-sm text-[--text-muted]">请先从项目页面进入</div>
        ) : loading ? (
          <div className="text-center py-12 text-sm text-[--text-muted]">加载中...</div>
        ) : tab === "video" ? (
          <div className="flex gap-3">
            {/* Video upload cells */}
            <div className="w-[224px] flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[--text-secondary]">视频素材</span>
                <Button
                  onClick={() => setUploadVideoOpen(true)}
                  icon={<Plus size={12} />}
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-xs text-[--text-muted] hover:text-[--text-primary]"
                >
                  新增
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {videos.map((v) => (
                  <div key={v.id} className="relative aspect-square rounded-lg border-2 border-[#3f3f46] bg-[#18181b] flex flex-col items-center justify-center gap-2 group">
                    <Film size={24} className="text-[--text-muted]" strokeWidth={1.5} />
                    <span className="text-xs text-[--text-secondary] text-center truncate w-full px-2">{v.name}</span>
                    {v.duration && (
                      <span className="text-[10px] text-[--text-muted]">{v.duration}s</span>
                    )}
                    <div className="absolute inset-0 bg-[#18181b]/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button className="rounded-md bg-[#6366f1] text-white px-2 py-1 text-xs hover:bg-[#818cf8]">
                        预览
                      </button>
                      <button
                        onClick={() => handleDeleteVideo(v.id)}
                        className="rounded-md bg-red-500/80 text-white p-1 hover:bg-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {/* Empty cell for adding new video */}
                <button
                  onClick={() => setUploadVideoOpen(true)}
                  className="aspect-square rounded-lg border-2 border-dashed border-[--border] flex flex-col items-center justify-center gap-2 text-[--text-muted] hover:border-[--accent]/50 hover:text-[--text-secondary] transition-colors"
                >
                  <Upload size={20} strokeWidth={1.5} />
                  <span className="text-xs">导入视频</span>
                </button>
              </div>
            </div>
            {/* Placeholder columns to align with other tabs */}
            <div className="w-[224px] flex flex-col opacity-40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[--text-secondary]">角色资产</span>
                <span className="text-xs text-[--text-muted]">切换查看</span>
              </div>
              <div className="aspect-square rounded-lg border-2 border-dashed border-[--border] flex items-center justify-center text-xs text-[--text-muted]">
                点击"角色资产"tab
              </div>
            </div>
            <div className="w-[224px] flex flex-col opacity-40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[--text-secondary]">场景资产</span>
                <span className="text-xs text-[--text-muted]">切换查看</span>
              </div>
              <div className="aspect-square rounded-lg border-2 border-dashed border-[--border] flex items-center justify-center text-xs text-[--text-muted]">
                点击"场景资产"tab
              </div>
            </div>
            <div className="w-[224px] flex flex-col opacity-40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[--text-secondary]">道具资产</span>
                <span className="text-xs text-[--text-muted]">切换查看</span>
              </div>
              <div className="aspect-square rounded-lg border-2 border-dashed border-[--border] flex items-center justify-center text-xs text-[--text-muted]">
                点击"道具资产"tab
              </div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 animate-fade-in">
            <div className="size-12 rounded-xl bg-[--bg-elevated] flex items-center justify-center">
              <Image size={20} className="text-[--text-muted]" strokeWidth={1.5} />
            </div>
            <div className="text-sm text-[--text-muted]">还没有{typeLabel}资产</div>
            <div className="text-xs text-[--text-muted]">使用上方输入框快速生成，或点击新建</div>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {filtered.map((asset) => (
              <div key={asset.id} className={asset.type === "character" ? "flex gap-2 items-end" : ""}>
                <div className={asset.type === "character" ? "flex-1 min-w-0" : ""}>
                  <AssetCard
                    asset={asset}
                    onDelete={() => handleDelete(asset.id)}
                    onGenerate={() => handleGenerate(asset)}
                    onRegenerate={() => handleGenerate(asset)}
                    onUpload={(file) => handleUploadImage(asset, file)}
                    onVoiceConfig={asset.type === "character" ? () => { setVoiceAsset(asset); setVoiceDraft(asset.tts_config ?? {}); } : undefined}
                    onRefresh={loadAssets}
                  />
                </div>
                {asset.type === "character" && (
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleExtractAndGenerateById(asset.id)}
                      disabled={refreshingAudioIds.has(asset.id) || generatingAudioIds.has(asset.id)}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-[--accent] hover:bg-[--accent]/10 border border-[--accent]/20 hover:border-[--accent]/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="从剧本提取角色音色提示词并生成音频"
                    >
                      {refreshingAudioIds.has(asset.id) ? (
                        <><RefreshCw size={9} className="animate-spin" /> 提取中</>
                      ) : generatingAudioIds.has(asset.id) ? (
                        <><RefreshCw size={9} className="animate-spin" /> 生成中</>
                      ) : (
                        <><Sparkles size={9} /> 提取音色</>
                      )}
                    </button>
                    <AudioCard
                      assetId={asset.id}
                      name={asset.name}
                      audioPrompt={asset.tts_config?.prompt || asset.description || ""}
                      hasAudio={asset.has_audio}
                      audioPath={asset.audio_path}
                      onGenerate={() => handleGenerateAudioById(asset.id)}
                      generating={generatingAudioIds.has(asset.id)}
                      onRefresh={() => handleRefreshAudioPromptById(asset.id)}
                      refreshing={refreshingAudioIds.has(asset.id)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voice config modal */}
      <Modal open={!!voiceAsset} onClose={() => setVoiceAsset(null)} title={`配音设置 · ${voiceAsset?.name}`}
        footer={<>
          <Button variant="ghost" onClick={() => setVoiceAsset(null)}>取消</Button>
          <Button onClick={handleSaveVoice} loading={savingVoice} icon={<Mic size={13} />}>保存</Button>
        </>}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">TTS 服务</label>
            <select value={voiceDraft.provider ?? "edge_tts"} onChange={e => setVoiceDraft(d => ({ ...d, provider: e.target.value }))}
              className="h-9 rounded-md px-3 text-sm bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none">
              <option value="edge_tts" className="bg-[#27272a] text-gray-200">Edge TTS（免费）</option>
              <option value="elevenlabs" className="bg-[#27272a] text-gray-200">ElevenLabs</option>
              <option value="fish_audio" className="bg-[#27272a] text-gray-200">Fish Audio</option>
              <option value="azure_tts" className="bg-[#27272a] text-gray-200">Azure TTS</option>
              <option value="cosyvoice" className="bg-[#27272a] text-gray-200">CosyVoice（本地）</option>
              <option value="qwen3_tts" className="bg-[#27272a] text-gray-200">Qwen3-TTS-Instruct-Flash</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">音色</label>
            {(!voiceDraft.provider || voiceDraft.provider === "edge_tts") ? (
              <select value={voiceDraft.voice ?? "zh-CN-XiaoxiaoNeural"} onChange={e => setVoiceDraft(d => ({ ...d, voice: e.target.value }))}
                className="h-9 rounded-md px-3 text-sm bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none">
                {EDGE_VOICES.map(v => <option key={v.id} value={v.id} className="bg-[#27272a] text-gray-200">{v.name}</option>)}
              </select>
            ) : (
              <input type="text" value={voiceDraft.voice ?? ""} onChange={e => setVoiceDraft(d => ({ ...d, voice: e.target.value }))}
                placeholder="音色 ID / Voice ID"
                className="h-9 rounded-md px-3 text-sm bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none" />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">语速 ({voiceDraft.speed ?? 1.0}×)</label>
            <input type="range" min="0.5" max="2.0" step="0.1" value={voiceDraft.speed ?? 1.0}
              onChange={e => setVoiceDraft(d => ({ ...d, speed: Number(e.target.value) }))} className="w-full" />
          </div>
        </div>
      </Modal>

      {/* Create Asset Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={`新建${typeLabel}`}
        footer={<>
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>取消</Button>
          <Button onClick={handleCreate} loading={creating} disabled={!form.name.trim()}>创建</Button>
        </>}
      >
        <div className="space-y-4">
          <Input label="名称"
            placeholder={tab === "character" ? "角色名，如：凌霄" : tab === "scene" ? "场景名，如：皇宫大殿" : "道具名，如：玄铁剑"}
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="描述" placeholder="简要描述..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">图像生成提示词</label>
            <textarea rows={3}
              placeholder={tab === "character" ? "外观描述，如：年轻男子，黑发，红色汉服，英俊，高挑..." : tab === "scene" ? "场景描述，如：古风宫殿内部，红柱金匾..." : "道具描述，如：古代长剑，黑色剑鞘..."}
              value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              className="w-full rounded-md px-3 py-2 text-sm resize-none bg-[--bg-elevated] border border-[--border] text-[--text-primary] placeholder:text-[--text-muted] focus:border-[--accent] transition-colors outline-none" />
          </div>
          <Input label="标签（逗号分隔）" placeholder="古装, 女主, 灵气飘渺" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </div>
      </Modal>

      {/* Upload Video Modal */}
      <Modal open={uploadVideoOpen} onClose={() => setUploadVideoOpen(false)} title="导入视频片段"
        footer={<>
          <Button variant="ghost" onClick={() => setUploadVideoOpen(false)}>取消</Button>
          <Button onClick={handleUploadVideo} loading={uploadingVideo} disabled={!videoFile}>导入</Button>
        </>}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">选择视频文件</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[--border] py-6 cursor-pointer hover:border-[--accent]/40 transition-colors">
                <input type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setVideoFile(f); if (!videoName) setVideoName(f.name); } }} />
                <Upload size={20} className="text-[--text-muted]" />
                <span className="text-sm text-[--text-muted]">{videoFile ? videoFile.name : "点击或拖拽上传"}</span>
              </label>
            </div>
          </div>
          <Input label="视频名称" placeholder="默认为文件名" value={videoName} onChange={(e) => setVideoName(e.target.value)} />
          <Input label="描述（可选）" placeholder="简要描述视频内容..." value={videoDesc} onChange={(e) => setVideoDesc(e.target.value)} />
        </div>
      </Modal>

      {/* Confirm Navigate Modal */}
      <Modal open={showConfirmNavigate} onClose={() => setShowConfirmNavigate(false)} title="提示词未生成参考图"
        footer={<>
          <Button variant="ghost" onClick={() => setShowConfirmNavigate(false)}>取消，继续准备资产</Button>
          <Button onClick={handleConfirmNavigate} icon={<LayoutGrid size={13} />}>确认进入分镜规划</Button>
        </>}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
            <AlertCircle size={18} className="text-yellow-400" />
            <span className="text-sm text-yellow-400">以下提示词尚未生成参考图：</span>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {pendingPromptsWithoutImage.map((item, i) => (
              <div key={i} className="text-xs text-[--text-muted] px-3 py-1.5 rounded bg-[--bg-surface] border border-[--border]">
                {item}
              </div>
            ))}
          </div>
          <p className="text-xs text-[--text-muted]">
            建议先为这些提示词生成参考图，以保证分镜效果一致性。确认后将直接进入分镜规划页面。
          </p>
        </div>
      </Modal>
    </div>
  );
}
