import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { LayoutGrid, Wand2, Plus, Image, Clock, MessageSquare, Film, Mic, GripVertical, Trash2, CheckSquare, Square, X, Lightbulb, Video, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EpisodeSelector } from "@/components/ui/EpisodeSelector";
import { PromptStyleReminder } from "@/components/ui/PromptStyleReminder";
import { VideoGenModal } from "@/components/ui/VideoGenModal";
import { VideoModifyEntry } from "@/components/ui/VideoModifyEntry";
import { cn, IMAGE_PROVIDERS } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useToast } from "@/components/ui/Toast";

// Re-export new pages for routing
export { EpisodesPage } from "./EpisodesPage";
export { EpisodePage } from "./EpisodePage";

const BACKEND = "http://localhost:17322";

const SHOT_SIZES = [
  { key: "特写", label: "特写", icon: "🔍", desc: "面部/细节" },
  { key: "近景", label: "近景", icon: "👤", desc: "上半身" },
  { key: "中景", label: "中景", icon: "🧍", desc: "膝盖以上" },
  { key: "全景", label: "全景", icon: "🏞️", desc: "全身+环境" },
  { key: "远景", label: "远景", icon: "🌄", desc: "大场景" },
];

const CAMERA_ANGLES = [
  { key: "平视", label: "平视", desc: "正常视角" },
  { key: "俯拍", label: "俯拍", desc: "从上往下" },
  { key: "仰拍", label: "仰拍", desc: "从下往上" },
  { key: "侧拍", label: "侧拍", desc: "侧面视角" },
  { key: "过肩", label: "过肩", desc: "越过肩膀" },
];

const QUICK_PROMPTS = [
  "角色面部特写，表情紧张",
  "角色站在场景中央，中景",
  "两人对话，过肩镜头",
  "全景展示环境，远景",
  "角色行走，侧面跟拍",
  "俯拍大场景，气势恢宏",
];

interface BoardCard {
  id: string;
  episode_id: string;
  shot_id?: string;
  order_index: number;
  has_image: boolean;
  has_video: boolean;
  has_audio: boolean;
  prompt?: string;
  shot_size?: string;
  camera_angle?: string;
  duration_sec: number;
  dialogue?: string;
  notes?: string;
  characters?: string[];
}

function BoardCardItem({ card, index, onGenerate, onUpdate, onDelete, onUpdateDuration, onUpdateShot, isDragOver, selected, onToggleSelect, onDetail }: {
  card: BoardCard;
  index: number;
  onGenerate: () => Promise<void>;
  onUpdate: (prompt: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onUpdateDuration: (sec: number) => Promise<void>;
  onUpdateShot: (shot_size?: string, camera_angle?: string) => Promise<void>;
  isDragOver?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onDetail?: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [imgKey, setImgKey] = useState(0);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState(card.prompt ?? "");
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationDraft, setDurationDraft] = useState(String(card.duration_sec ?? 4));
  const [showShotSelector, setShowShotSelector] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError("");
    try {
      await onGenerate();
      setImgKey(k => k + 1);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePrompt = async () => {
    await onUpdate(promptDraft);
    setEditingPrompt(false);
  };

  const handleShotSelect = (shotSize: string, angle?: string) => {
    const newShotSize = card.shot_size === shotSize ? undefined : shotSize;
    const newAngle = angle ?? card.camera_angle;
    onUpdateShot(newShotSize, newAngle);
    setShowShotSelector(false);
  };

  return (
    <div className={cn(
      "group rounded-xl border bg-[--bg-surface] overflow-hidden transition-all relative",
      isDragOver ? "border-[--accent] ring-1 ring-[--accent]/40 scale-[1.02]" : "border-[--border] hover:border-[--accent]/40",
      selected && "ring-2 ring-[--accent] border-[--accent]"
    )}>
      {/* Selection checkbox */}
      {onToggleSelect && (
        <button
          onClick={onToggleSelect}
          className="absolute top-2 left-2 z-10 size-5 rounded flex items-center justify-center transition-all"
          style={{
            background: selected ? "var(--accent)" : "rgba(0,0,0,0.4)",
            borderColor: selected ? "transparent" : "rgba(255,255,255,0.3)",
            borderWidth: 1,
          }}
        >
          {selected ? <CheckSquare size={14} className="text-white" /> : <Square size={14} className="text-white/50" />}
        </button>
      )}

      {/* Image area */}
      <div
        className="relative h-36 flex items-center justify-center cursor-pointer"
        style={{ background: "linear-gradient(135deg, var(--bg-elevated), var(--bg-hover))" }}
        onClick={onDetail}
      >
        {/* Drag handle (only when not in selection mode) */}
        {!onToggleSelect && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-60 transition-opacity cursor-grab text-white">
            <GripVertical size={13} />
          </div>
        )}

        {/* Shot number (shown when no selection mode) */}
        {!onToggleSelect && (
          <div className="absolute top-2 left-2 text-xs font-mono bg-[--bg-base]/80 text-[--text-muted] px-1.5 py-0.5 rounded backdrop-blur-sm">
            #{index + 1}
          </div>
        )}

        {/* Shot size + angle badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {card.shot_size && (
            <Badge variant="default" className="text-[10px]">{card.shot_size}</Badge>
          )}
          {card.camera_angle && (
            <Badge variant="accent" className="text-[10px]">{card.camera_angle}</Badge>
          )}
        </div>

        {/* Character badges */}
        {card.characters && card.characters.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-0.5">
            {card.characters.slice(0, 2).map((c, i) => (
              <span key={i} className="text-[10px] bg-[--accent-dim]/80 text-[--accent-hover] border border-[--accent]/20 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                {c}
              </span>
            ))}
            {card.characters.length > 2 && (
              <span className="text-[10px] bg-[--bg-base]/60 text-[--text-muted] px-1 py-0.5 rounded-full backdrop-blur-sm">
                +{card.characters.length - 2}
              </span>
            )}
          </div>
        )}

        {card.has_image ? (
          <img
            key={imgKey}
            src={`${BACKEND}/api/boards/${card.id}/image?t=${imgKey}`}
            alt={`Shot ${index + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <Image size={24} className="text-[--text-muted]" strokeWidth={1.5} />
        )}

        {/* Video ready indicator */}
        {card.has_video && (
          <div className="absolute bottom-2 right-2">
            <div className="flex items-center gap-0.5 bg-[--success]/90 text-white text-[10px] px-1.5 py-0.5 rounded-full backdrop-blur-sm">
              <Film size={9} />视频
            </div>
          </div>
        )}

        {/* Generate button overlay */}
        <div
          className="absolute inset-0 bg-[--bg-base]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={handleGenerate}
            disabled={generating || !card.prompt}
            className="rounded-lg bg-[--accent] text-white px-3 py-1.5 text-xs flex items-center gap-1.5 hover:bg-[--accent-hover] disabled:opacity-40 transition-colors"
          >
            {generating ? <Wand2 size={12} className="animate-pulse" /> : <Wand2 size={12} />}
            {generating ? "生成中..." : card.has_image ? "重新生成" : "生成分镜图"}
          </button>
          <button
            onClick={onDelete}
            className="rounded-md bg-[--error]/80 text-white p-1.5 hover:bg-[--error] transition-colors"
            title="删除分镜"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Card info */}
      <div className="px-3 py-2.5 space-y-1.5">
        {genError && (
          <div className="text-[10px] text-[--error] bg-[--error]/10 rounded px-2 py-1 leading-tight">{genError}</div>
        )}
        {editingPrompt ? (
          <div className="space-y-1">
            <textarea
              rows={3}
              value={promptDraft}
              onChange={e => setPromptDraft(e.target.value)}
              className="w-full rounded text-[10px] px-2 py-1 bg-[--bg-elevated] border border-[--accent]/40 text-[--text-primary] resize-none outline-none"
              autoFocus
            />
            <div className="flex gap-1">
              <button
                onClick={handleSavePrompt}
                className="flex-1 text-[10px] py-1 rounded bg-[--accent] text-white hover:bg-[--accent-hover] transition-colors"
              >保存</button>
              <button
                onClick={() => { setEditingPrompt(false); setPromptDraft(card.prompt ?? ""); }}
                className="text-[10px] px-2 py-1 rounded bg-[--bg-elevated] text-[--text-muted] hover:text-[--text-primary] transition-colors"
              >取消</button>
            </div>
          </div>
        ) : (
          <p
            className="text-[11px] text-[--text-secondary] line-clamp-2 leading-relaxed cursor-text hover:text-[--text-primary] transition-colors"
            onDoubleClick={() => setEditingPrompt(true)}
            title="双击编辑提示词"
          >
            {card.prompt || <span className="text-[--text-muted] italic">双击添加提示词</span>}
          </p>
        )}

        {/* Shot size quick selector */}
        <div className="flex items-center gap-1.5">
          {editingDuration ? (
            <span className="flex items-center gap-0.5">
              <Clock size={10} />
              <input
                type="number"
                min={1} max={60}
                value={durationDraft}
                onChange={e => setDurationDraft(e.target.value)}
                onBlur={async () => {
                  const sec = Math.max(1, Math.min(60, Number(durationDraft) || 4));
                  setDurationDraft(String(sec));
                  setEditingDuration(false);
                  await onUpdateDuration(sec);
                }}
                onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setEditingDuration(false); setDurationDraft(String(card.duration_sec ?? 4)); } }}
                autoFocus
                className="w-10 rounded bg-[--bg-elevated] border border-[--accent]/40 px-1 text-center outline-none text-[--text-primary]"
              />
              s
            </span>
          ) : (
            <span
              className="flex items-center gap-0.5 cursor-pointer hover:text-[--text-primary] transition-colors text-[10px] text-[--text-muted]"
              title="点击编辑时长"
              onClick={() => { setEditingDuration(true); setDurationDraft(String(card.duration_sec ?? 4)); }}
            >
              <Clock size={10} /> {card.duration_sec ?? 4}s
            </span>
          )}

          {/* Shot selector dropdown trigger */}
          <div className="relative">
            <button
              onClick={() => setShowShotSelector(s => !s)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-[--bg-elevated] border border-[--border] text-[--text-muted] hover:text-[--text-primary] hover:border-[--accent]/40 transition-colors"
            >
              {card.shot_size || "景别"}
            </button>
            {showShotSelector && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowShotSelector(false)} />
                <div className="absolute bottom-6 left-0 z-40 min-w-[160px] rounded-lg border border-[--border] bg-[--bg-elevated] shadow-xl overflow-hidden p-1.5">
                  <div className="text-[10px] text-[--text-muted] uppercase tracking-wide px-1.5 mb-1">景别</div>
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {SHOT_SIZES.map(ss => (
                      <button
                        key={ss.key}
                        onClick={() => handleShotSelect(ss.key)}
                        className={cn(
                          "flex flex-col items-center rounded py-1 px-0.5 text-center transition-all",
                          card.shot_size === ss.key
                            ? "bg-[--accent-dim] border border-[--accent]/40"
                            : "hover:bg-[--bg-hover]"
                        )}
                        title={ss.desc}
                      >
                        <span className="text-xs">{ss.icon}</span>
                        <span className="text-[8px] text-[--text-secondary] mt-0.5">{ss.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-[--text-muted] uppercase tracking-wide px-1.5 mb-1">机位</div>
                  <div className="grid grid-cols-3 gap-1">
                    {CAMERA_ANGLES.map(ca => (
                      <button
                        key={ca.key}
                        onClick={() => handleShotSelect(card.shot_size ?? "中景", ca.key === card.camera_angle ? undefined : ca.key)}
                        className={cn(
                          "rounded py-1 px-1 text-center text-[10px] transition-all",
                          card.camera_angle === ca.key
                            ? "bg-[--accent-dim] border border-[--accent]/40 text-[--accent-hover]"
                            : "text-[--text-muted] hover:bg-[--bg-hover]"
                        )}
                        title={ca.desc}
                      >
                        {ca.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {card.dialogue && (
          <div className="flex items-start gap-1 text-[10px] text-[--text-muted]">
            <MessageSquare size={10} className="mt-0.5 shrink-0" />
            <span className="line-clamp-1 italic">{card.dialogue}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Board detail modal */
function BoardDetailModal({ card, index, onClose, onUpdate }: {
  card: BoardCard;
  index: number;
  onClose: () => void;
  onUpdate: (updates: Partial<BoardCard>) => void;
}) {
  const [promptDraft, setPromptDraft] = useState(card.prompt ?? "");
  const [dialogueDraft, setDialogueDraft] = useState(card.dialogue ?? "");
  const [notesDraft, setNotesDraft] = useState(card.notes ?? "");

  const handleSave = async () => {
    const updates: Partial<BoardCard> = {};
    if (promptDraft !== card.prompt) updates.prompt = promptDraft;
    if (dialogueDraft !== card.dialogue) updates.dialogue = dialogueDraft;
    if (notesDraft !== card.notes) updates.notes = notesDraft;
    if (Object.keys(updates).length > 0) {
      await fetch(`${BACKEND}/api/boards/${card.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      onUpdate(updates);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[--bg-base]/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[600px] max-h-[80vh] rounded-2xl border border-[--border] bg-[--bg-surface] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[--border-subtle]">
          <div className="flex items-center gap-3">
            <span className="text-lg font-mono font-bold text-[--accent-hover]">#{index + 1}</span>
            <span className="text-sm font-semibold text-[--text-primary]">分镜详情</span>
            {card.shot_size && <Badge variant="default">{card.shot_size}</Badge>}
            {card.camera_angle && <Badge variant="accent">{card.camera_angle}</Badge>}
          </div>
          <button onClick={onClose} className="text-[--text-muted] hover:text-[--text-primary]">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Image preview */}
          {card.has_image && (
            <div className="rounded-lg overflow-hidden border border-[--border]">
              <img
                src={`${BACKEND}/api/boards/${card.id}/image`}
                className="w-full max-h-64 object-contain bg-[--bg-elevated]"
                alt=""
              />
            </div>
          )}

          {/* Characters */}
          {card.characters && card.characters.length > 0 && (
            <div>
              <div className="text-xs font-medium text-[--text-secondary] mb-1.5">出场角色</div>
              <div className="flex flex-wrap gap-1.5">
                {card.characters.map((c, i) => (
                  <span key={i} className="text-xs bg-[--accent-dim] text-[--accent-hover] border border-[--accent]/20 px-2.5 py-1 rounded-full">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prompt */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">画面提示词</label>
            <textarea
              rows={4}
              value={promptDraft}
              onChange={e => setPromptDraft(e.target.value)}
              className={cn(
                "w-full rounded-md px-3 py-2 text-xs resize-none font-mono",
                "bg-[--bg-elevated] border border-[--border]",
                "text-[--text-primary] placeholder:text-[--text-muted]",
                "focus:border-[--accent] outline-none"
              )}
              placeholder="输入画面描述..."
            />
          </div>

          {/* Dialogue */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">台词</label>
            <textarea
              rows={2}
              value={dialogueDraft}
              onChange={e => setDialogueDraft(e.target.value)}
              className={cn(
                "w-full rounded-md px-3 py-2 text-xs resize-none",
                "bg-[--bg-elevated] border border-[--border]",
                "text-[--text-primary] focus:border-[--accent] outline-none"
              )}
              placeholder="输入台词..."
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">备注</label>
            <textarea
              rows={2}
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              className={cn(
                "w-full rounded-md px-3 py-2 text-xs resize-none",
                "bg-[--bg-elevated] border border-[--border]",
                "text-[--text-primary] focus:border-[--accent] outline-none"
              )}
              placeholder="导演备注、运镜说明..."
            />
          </div>

          {/* Quick prompt templates */}
          <div>
            <div className="text-xs font-medium text-[--text-secondary] mb-2">快速模板</div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => setPromptDraft(qp)}
                  className="text-[10px] px-2 py-1 rounded bg-[--bg-elevated] border border-[--border] text-[--text-muted] hover:text-[--text-primary] hover:border-[--accent]/40 transition-colors"
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[--border-subtle]">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={async () => { await handleSave(); onClose(); }}>保存</Button>
        </div>
      </div>
    </div>
  );
}

export function StoryboardPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const storeEpisodeId = useAppStore((s) => s.currentEpisodeId);
  const storeProjectId = useAppStore((s) => s.currentProjectId);
  const episodeId = params.get("episode") ?? storeEpisodeId;
  const projectId = params.get("project") ?? storeProjectId;

  const { success, error: toastError } = useToast();
  const [boards, setBoards] = useState<BoardCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [videoProvider, setVideoProvider] = useState("kling_video");
  const [imageProvider, setImageProvider] = useState("auto");
  const [addingBoard, setAddingBoard] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [ttsDispatching, setTtsDispatching] = useState(false);
  const dragIndexRef = useRef<number>(-1);
  const [dragOverIndex, setDragOverIndex] = useState<number>(-1);

  // New state for batch selection and detail view
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailBoard, setDetailBoard] = useState<BoardCard | null>(null);
  const [promptReminderOpen, setPromptReminderOpen] = useState(false);
  const [videoGenOpen, setVideoGenOpen] = useState(false);
  const [videoModifyOpen, setVideoModifyOpen] = useState(false);

  const loadBoards = async () => {
    setLoading(true);
    try {
      let epId = episodeId;
      // 如果没有 episodeId，尝试获取项目的第一个 episode
      if (!epId && projectId) {
        const r = await fetch(`${BACKEND}/api/projects/${projectId}/episodes`);
        const eps = await r.json();
        if (Array.isArray(eps) && eps.length > 0) {
          epId = eps[0].id;
          useAppStore.getState().setCurrentEpisode(epId);
        }
      }
      if (epId) {
        const r = await fetch(`${BACKEND}/api/boards/episode/${epId}`);
        setBoards(await r.json());
      } else {
        setBoards([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBoards(); }, [projectId]);

  const handleGenerateAll = async () => {
    const ungenerated = boards.filter((b) => !b.has_image && b.prompt);
    if (ungenerated.length === 0) return;
    setGenerating(true);
    let done = 0;
    const DELAY_MS = 5000; // 5秒间隔避免频率限制
    try {
      for (let i = 0; i < ungenerated.length; i++) {
        const board = ungenerated[i];
        try {
          const r = await fetch(`${BACKEND}/api/boards/generate-image`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ board_id: board.id, provider: imageProvider }),
          });
          if (!r.ok) {
            const data = await r.json().catch(() => ({}));
            toastError(`分镜图生成失败：${data.detail ?? `HTTP ${r.status}`}`);
          } else {
            done++;
          }
        } catch (err) {
          toastError(`分镜图生成失败：${err instanceof Error ? err.message : "未知错误"}`);
        }
        // 等待间隔后再继续下一个（最后一个不需要等待）
        if (i < ungenerated.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
        await loadBoards();
      }
      success(`已生成 ${done} / ${ungenerated.length} 张分镜图`);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "生成失败，请检查图像服务配置");
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateBoard = async (boardId: string, prompt: string) => {
    await fetch(`${BACKEND}/api/boards/${boardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    setBoards(boards.map(b => b.id === boardId ? { ...b, prompt } : b));
  };

  const handleUpdateDuration = async (boardId: string, duration_sec: number) => {
    await fetch(`${BACKEND}/api/boards/${boardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duration_sec }),
    });
    setBoards(boards.map(b => b.id === boardId ? { ...b, duration_sec } : b));
  };

  const handleUpdateShot = async (boardId: string, shot_size?: string, camera_angle?: string) => {
    await fetch(`${BACKEND}/api/boards/${boardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shot_size, camera_angle }),
    });
    setBoards(boards.map(b => b.id === boardId ? { ...b, shot_size, camera_angle } : b));
  };

  const handleDeleteBoard = async (boardId: string) => {
    await fetch(`${BACKEND}/api/boards/${boardId}`, { method: "DELETE" });
    setBoards(prev => prev.filter(b => b.id !== boardId));
  };

  const handleGenerateOne = async (boardId: string) => {
    const r = await fetch(`${BACKEND}/api/boards/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board_id: boardId, provider: "auto" }),
    });
    if (!r.ok) {
      const text = await r.text();
      let detail = text;
      try { detail = JSON.parse(text).detail ?? text; } catch {}
      throw new Error(detail);
    }
    await loadBoards();
  };

  // Batch operations
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === boards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(boards.map(b => b.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await fetch(`${BACKEND}/api/boards/${id}`, { method: "DELETE" }).catch(() => {});
    }
    success(`已删除 ${selectedIds.size} 个分镜`);
    setSelectedIds(new Set());
    await loadBoards();
  };

  const handleBatchGenerate = async () => {
    const targets = boards.filter(b => selectedIds.has(b.id) && b.prompt && !b.has_image);
    if (targets.length === 0) return;
    setGenerating(true);
    let done = 0;
    for (const board of targets) {
      try {
        await fetch(`${BACKEND}/api/boards/generate-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ board_id: board.id, provider: imageProvider }),
        });
        done++;
      } catch {}
    }
    success(`已生成 ${done} / ${targets.length} 张分镜图`);
    setSelectedIds(new Set());
    await loadBoards();
  };

  const handleDispatchTtsTasks = async () => {
    const withDialogue = boards.filter(b => b.dialogue && b.dialogue.trim());
    if (withDialogue.length === 0) return;
    setTtsDispatching(true);
    try {
      let charVoiceMap: Record<string, { voice: string; provider: string; speed: number }> = {};
      if (projectId) {
        const r = await fetch(`${BACKEND}/api/assets/project/${projectId}`).then(r => r.json()).catch(() => []);
        if (Array.isArray(r)) {
          for (const a of r) {
            if (a.type === "character" && a.tts_config?.voice) {
              charVoiceMap[a.name] = {
                voice: a.tts_config.voice,
                provider: a.tts_config.provider || "edge_tts",
                speed: a.tts_config.speed || 1.0,
              };
            }
          }
        }
      }

      for (const board of withDialogue) {
        const matchedChar = board.characters?.find(c => charVoiceMap[c]);
        const voiceCfg = matchedChar ? charVoiceMap[matchedChar] : { voice: "zh-CN-XiaoxiaoNeural", provider: "auto", speed: 1.0 };
        await fetch(`${BACKEND}/api/generate/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "tts",
            provider: voiceCfg.provider,
            input_params: {
              text: board.dialogue,
              voice: voiceCfg.voice,
              speed: voiceCfg.speed,
              board_id: board.id,
            },
          }),
        });
      }
      success(`已创建 ${withDialogue.length} 个配音任务`);
      navigate("/generate");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "配音任务创建失败");
    } finally {
      setTtsDispatching(false);
    }
  };

  const handleAddBoard = async () => {
    if (!newPrompt.trim()) return;
    setAddLoading(true);
    try {
      // 如果没有 episodeId，先创建一个默认的 episode
      let epId = episodeId;
      if (!epId && projectId) {
        const r = await fetch(`${BACKEND}/api/projects/${projectId}/episodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ episode_no: 1, title: "默认分镜集" }),
        });
        const data = await r.json();
        epId = data.id;
        useAppStore.getState().setCurrentEpisode(epId);
      }
      if (!epId) {
        toastError("请先选择或创建项目");
        return;
      }
      await fetch(`${BACKEND}/api/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: epId,
          order_index: boards.length,
          prompt: newPrompt,
          duration_sec: 4,
          shot_size: "中景",
        }),
      });
      setNewPrompt("");
      setAddingBoard(false);
      await loadBoards();
      success("已添加分镜");
    } catch {
      toastError("添加失败");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (dropIndex: number) => {
    const fromIndex = dragIndexRef.current;
    setDragOverIndex(-1);
    if (fromIndex < 0 || fromIndex === dropIndex) return;

    const reordered = [...boards];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setBoards(reordered);
    dragIndexRef.current = -1;

    try {
      await fetch(`${BACKEND}/api/boards/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_ids: reordered.map(b => b.id) }),
      });
    } catch {
      toastError("排序保存失败");
      await loadBoards();
    }
  };

  const totalDuration = boards.reduce((sum, b) => sum + (b.duration_sec ?? 4), 0);
  const generatedCount = boards.filter(b => b.has_image).length;
  const videoCount = boards.filter(b => b.has_video).length;
  const detailIndex = detailBoard ? boards.findIndex(b => b.id === detailBoard.id) : -1;

  return (
    <div className="flex h-full flex-col animate-fade-in">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-subtle] header-gradient">
        <div>
          <h1 className="text-lg font-bold gradient-text">分镜画板</h1>
          <p className="text-xs text-[--text-muted] mt-0.5">
            {boards.length > 0
              ? `${boards.length} 个分镜 · ${generatedCount} 已生图${videoCount > 0 ? ` · ${videoCount} 已生视频` : ''} · 预估时长 ${Math.floor(totalDuration / 60)}分${Math.floor(totalDuration % 60)}秒`
              : "分镜序列，逐帧规划镜头"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projectId && <EpisodeSelector projectId={projectId} />}

          {/* Batch mode toggle */}
          {boards.length > 0 && (
            <Button
              variant={batchMode ? "outline" : "ghost"}
              size="sm"
              onClick={() => { setBatchMode(b => !b); setSelectedIds(new Set()); }}
              icon={batchMode ? <X size={13} /> : <CheckSquare size={13} />}
            >
              {batchMode ? "取消选择" : "批量选择"}
            </Button>
          )}

          {/* Batch action bar */}
          {batchMode && selectedIds.size > 0 && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-[--accent-dim] border border-[--accent]/30">
              <span className="text-xs text-[--accent-hover] font-medium">{selectedIds.size} 已选</span>
              <button onClick={selectAll} className="text-[10px] text-[--text-muted] hover:text-[--text-primary]">
                全选
              </button>
              <button onClick={handleBatchGenerate} className="text-[10px] text-[--accent-hover] hover:underline">
                批量生成
              </button>
              <button onClick={handleBatchDelete} className="text-[10px] text-[--error] hover:underline">
                批量删除
              </button>
            </div>
          )}

          {(generatedCount > 0 || videoCount > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/compose?episode=${episodeId}&project=${projectId}`)}
            >
              前往合成 →
            </Button>
          )}

          {/* New action buttons */}
          <Button variant="ghost" size="sm" onClick={() => setPromptReminderOpen(true)} icon={<Lightbulb size={12} />}>
            提示词指南
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setVideoModifyOpen(true)} icon={<Film size={12} />}>
            AI 改视频
          </Button>

          {boards.length > 0 && (
            <>
              <select
                value={videoProvider}
                onChange={e => setVideoProvider(e.target.value)}
                className="h-8 rounded-md px-2 text-xs bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none"
              >
                <option value="kling_video" className="bg-[#27272a] text-gray-200">可灵视频</option>
                <option value="vidu" className="bg-[#27272a] text-gray-200">Vidu</option>
                <option value="runway" className="bg-[#27272a] text-gray-200">Runway Gen-4</option>
                <option value="fal" className="bg-[#27272a] text-gray-200">fal.ai (Kling)</option>
                <option value="pika" className="bg-[#27272a] text-gray-200">Pika</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDispatchTtsTasks}
                loading={ttsDispatching}
                icon={<Mic size={13} />}
              >
                批量配音
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVideoGenOpen(true)}
                icon={<Video size={13} />}
              >
                生成视频
              </Button>
              <select
                value={imageProvider}
                onChange={e => setImageProvider(e.target.value)}
                className="h-8 rounded-md px-2 text-xs bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none"
              >
                <option value="auto" className="bg-[#27272a] text-gray-200">自动选择</option>
                {Object.entries(IMAGE_PROVIDERS).map(([key, label]) => (
                  <option key={key} value={key} className="bg-[#27272a] text-gray-200">{label}</option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAll}
                loading={generating}
                icon={<Wand2 size={13} />}
              >
                批量生成分镜图
              </Button>
            </>
          )}
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddingBoard(true)}>添加分镜</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="text-center py-12 text-sm text-[--text-muted]">加载中...</div>
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center animate-fade-in">
            <div className="size-16 rounded-2xl bg-[--accent-dim]/30 flex items-center justify-center mb-1">
              <LayoutGrid size={28} className="text-[--accent-hover]" strokeWidth={1.5} />
            </div>
            <div className="text-sm text-[--text-secondary] font-medium">开始创建分镜</div>
            <div className="text-xs text-[--text-muted] max-w-sm">
              分镜画板可以独立使用。手动添加分镜后，输入提示词即可 AI 生成分镜图，或直接上传已有图片。
            </div>
            <div className="flex gap-3 mt-2">
              <Button onClick={() => setAddingBoard(true)} icon={<Plus size={14} />}>
                手动添加分镜
              </Button>
              {projectId && (
                <Button variant="outline" onClick={() => navigate(`/script?project=${projectId}`)} icon={<BookOpen size={14} />}>
                  从剧本导入
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
            {boards.map((card, i) => (
              <div
                key={card.id}
                draggable={!batchMode}
                onDragStart={() => !batchMode && handleDragStart(i)}
                onDragOver={(e) => !batchMode && handleDragOver(e, i)}
                onDragLeave={() => setDragOverIndex(-1)}
                onDrop={() => !batchMode && handleDrop(i)}
                className={cn("cursor-grab active:cursor-grabbing", batchMode && "cursor-default")}
              >
                <BoardCardItem
                  card={card}
                  index={i}
                  onGenerate={() => handleGenerateOne(card.id)}
                  onUpdate={(prompt) => handleUpdateBoard(card.id, prompt)}
                  onDelete={() => handleDeleteBoard(card.id)}
                  onUpdateDuration={(sec) => handleUpdateDuration(card.id, sec)}
                  onUpdateShot={(shot_size, camera_angle) => handleUpdateShot(card.id, shot_size, camera_angle)}
                  isDragOver={dragOverIndex === i}
                  selected={batchMode && selectedIds.has(card.id)}
                  onToggleSelect={batchMode ? () => toggleSelect(card.id) : undefined}
                  onDetail={() => setDetailBoard(card)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detailBoard && detailIndex >= 0 && (
        <BoardDetailModal
          card={detailBoard}
          index={detailIndex}
          onClose={() => setDetailBoard(null)}
          onUpdate={(updates) => {
            setBoards(boards.map(b => b.id === detailBoard.id ? { ...b, ...updates } : b));
            setDetailBoard({ ...detailBoard, ...updates });
          }}
        />
      )}

      {/* Quick-add board modal */}
      {addingBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[--bg-base]/70 backdrop-blur-sm">
          <div className="w-96 rounded-2xl border border-[--border] bg-[--bg-surface] shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-[--text-primary]">添加分镜</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[--text-secondary]">画面提示词（英文 SD Prompt）</label>
              <textarea
                rows={4}
                autoFocus
                value={newPrompt}
                onChange={e => setNewPrompt(e.target.value)}
                placeholder="e.g. young woman in hanfu standing in autumn courtyard, medium shot..."
                className={cn(
                  "w-full rounded-md px-3 py-2 text-xs resize-none",
                  "bg-[--bg-elevated] border border-[--border]",
                  "text-[--text-primary] placeholder:text-[--text-muted]",
                  "focus:border-[--accent] outline-none transition-colors"
                )}
              />
            </div>
            {/* Quick prompts */}
            <div>
              <div className="text-[10px] text-[--text-muted] mb-1.5">快速模板</div>
              <div className="flex flex-wrap gap-1">
                {QUICK_PROMPTS.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => setNewPrompt(qp)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-[--bg-elevated] border border-[--border] text-[--text-muted] hover:text-[--text-primary] hover:border-[--accent]/40 transition-colors"
                  >
                    {qp}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setAddingBoard(false); setNewPrompt(""); }}>取消</Button>
              <Button size="sm" loading={addLoading} disabled={!newPrompt.trim()} onClick={handleAddBoard} icon={<Plus size={13} />}>添加</Button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Style Reminder */}
      <PromptStyleReminder open={promptReminderOpen} onClose={() => setPromptReminderOpen(false)} />

      {/* Video Generation Modal */}
      {episodeId && (
        <VideoGenModal
          open={videoGenOpen}
          onClose={() => setVideoGenOpen(false)}
          episodeId={episodeId}
          onSubmitted={() => { setVideoGenOpen(false); navigate(`/generate?project=${projectId}`); }}
        />
      )}

      {/* Video Modify Entry */}
      <VideoModifyEntry
        open={videoModifyOpen}
        onClose={() => setVideoModifyOpen(false)}
        onSubmitted={() => { setVideoModifyOpen(false); navigate(`/generate?project=${projectId}`); }}
      />
    </div>
  );
}
