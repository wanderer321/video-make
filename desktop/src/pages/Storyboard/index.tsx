import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { LayoutGrid, Wand2, Plus, Image, Clock, MessageSquare, Film, Mic, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EpisodeSelector } from "@/components/ui/EpisodeSelector";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useToast } from "@/components/ui/Toast";

const BACKEND = "http://localhost:17321";

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

function BoardCardItem({ card, index, onGenerate, onUpdate, onDelete, onUpdateDuration, isDragOver }: {
  card: BoardCard;
  index: number;
  onGenerate: () => Promise<void>;
  onUpdate: (prompt: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onUpdateDuration: (sec: number) => Promise<void>;
  isDragOver?: boolean;
}) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [imgKey, setImgKey] = useState(0);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState(card.prompt ?? "");
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationDraft, setDurationDraft] = useState(String(card.duration_sec ?? 4));

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

  return (
    <div className={cn(
      "group rounded-xl border bg-[--bg-surface] overflow-hidden transition-all",
      isDragOver ? "border-[--accent] ring-1 ring-[--accent]/40 scale-[1.02]" : "border-[--border] hover:border-[--accent]/40"
    )}>
      {/* Image area */}
      <div
        className="relative h-36 flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, var(--bg-elevated), var(--bg-hover))" }}
      >
        {/* Drag handle */}
        <div className="absolute top-2 left-8 opacity-0 group-hover:opacity-60 transition-opacity cursor-grab text-white">
          <GripVertical size={13} />
        </div>
        {/* Shot number */}
        <div className="absolute top-2 left-2 text-xs font-mono bg-[--bg-base]/80 text-[--text-muted] px-1.5 py-0.5 rounded backdrop-blur-sm">
          #{index + 1}
        </div>

        {card.shot_size && (
          <div className="absolute top-2 right-2">
            <Badge variant="default" className="text-[10px]">{card.shot_size}</Badge>
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
            <div className="flex items-center gap-0.5 bg-[--success]/90 text-white text-[9px] px-1.5 py-0.5 rounded-full backdrop-blur-sm">
              <Film size={9} />视频
            </div>
          </div>
        )}

        {/* Generate button overlay */}
        <div className="absolute inset-0 bg-[--bg-base]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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

        <div className="flex items-center gap-2 text-[10px] text-[--text-muted]">
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
            card.duration_sec && (
              <span
                className="flex items-center gap-0.5 cursor-pointer hover:text-[--text-primary] transition-colors"
                title="点击编辑时长"
                onClick={() => { setEditingDuration(true); setDurationDraft(String(card.duration_sec)); }}
              >
                <Clock size={10} /> {card.duration_sec}s
              </span>
            )
          )}
          {card.camera_angle && <span>{card.camera_angle}</span>}
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
  const [videoDispatching, setVideoDispatching] = useState(false);
  const [videoProvider, setVideoProvider] = useState("kling_video");
  const [addingBoard, setAddingBoard] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [ttsDispatching, setTtsDispatching] = useState(false);
  const dragIndexRef = useRef<number>(-1);
  const [dragOverIndex, setDragOverIndex] = useState<number>(-1);

  const loadBoards = async () => {
    if (!episodeId) return;
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/boards/episode/${episodeId}`);
      setBoards(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBoards(); }, [episodeId]);

  const handleGenerateAll = async () => {
    const ungenerated = boards.filter((b) => !b.has_image && b.prompt);
    if (ungenerated.length === 0) return;
    setGenerating(true);
    let done = 0;
    const BATCH = 3;
    try {
      for (let i = 0; i < ungenerated.length; i += BATCH) {
        const batch = ungenerated.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map((board) =>
            fetch(`${BACKEND}/api/boards/generate-image`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ board_id: board.id, provider: "auto" }),
            }).then(async (r) => {
              if (!r.ok) {
                const data = await r.json().catch(() => ({}));
                throw new Error(data.detail ?? `HTTP ${r.status}`);
              }
            })
          )
        );
        for (const r of results) {
          if (r.status === "fulfilled") done++;
          else toastError(`分镜图生成失败：${r.reason?.message ?? "未知错误"}`);
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

  const handleDispatchVideoTasks = async () => {
    const withPrompt = boards.filter(b => b.prompt);
    if (withPrompt.length === 0) return;
    setVideoDispatching(true);
    try {
      for (const board of withPrompt) {
        await fetch(`${BACKEND}/api/generate/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "video",
            provider: videoProvider,
            input_params: {
              prompt: board.prompt,
              board_id: board.id,
              duration: board.duration_sec,
            },
          }),
        });
      }
      success(`已创建 ${withPrompt.length} 个视频生成任务`);
      navigate("/generate");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "任务创建失败");
    } finally {
      setVideoDispatching(false);
    }
  };

  const handleDispatchTtsTasks = async () => {
    const withDialogue = boards.filter(b => b.dialogue && b.dialogue.trim());
    if (withDialogue.length === 0) return;
    setTtsDispatching(true);
    try {
      // Load character assets to look up per-character voice config
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
        // Pick voice: first matching character's config, else default
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
    if (!episodeId || !newPrompt.trim()) return;
    setAddLoading(true);
    try {
      await fetch(`${BACKEND}/api/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: episodeId,
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
      await loadBoards(); // revert
    }
  };

  const totalDuration = boards.reduce((sum, b) => sum + (b.duration_sec ?? 4), 0);
  const generatedCount = boards.filter(b => b.has_image).length;
  const videoCount = boards.filter(b => b.has_video).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-subtle]">
        <div>
          <h1 className="text-lg font-bold text-[--text-primary]">分镜画板</h1>
          <p className="text-xs text-[--text-muted] mt-0.5">
            {boards.length > 0
              ? `${boards.length} 个分镜 · ${generatedCount} 已生图${videoCount > 0 ? ` · ${videoCount} 已生视频` : ''} · 预估时长 ${Math.floor(totalDuration / 60)}分${Math.floor(totalDuration % 60)}秒`
              : "分镜序列，逐帧规划镜头"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projectId && <EpisodeSelector projectId={projectId} />}
          {(generatedCount > 0 || videoCount > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/compose?episode=${episodeId}&project=${projectId}`)}
            >
              前往合成 →
            </Button>
          )}
          {boards.length > 0 && (
            <>
              <select
                value={videoProvider}
                onChange={e => setVideoProvider(e.target.value)}
                className="h-8 rounded-md px-2 text-xs bg-[--bg-elevated] border border-[--border] text-[--text-primary] outline-none"
              >
                <option value="kling_video">可灵视频</option>
                <option value="vidu">Vidu</option>
                <option value="runway">Runway Gen-4</option>
                <option value="fal">fal.ai (Kling)</option>
                <option value="pika">Pika</option>
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
                onClick={handleDispatchVideoTasks}
                loading={videoDispatching}
                icon={<Film size={13} />}
              >
                生成视频
              </Button>
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
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setAddingBoard(true)} disabled={!episodeId}>添加分镜</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {!episodeId ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <LayoutGrid size={36} className="text-[--text-muted]" strokeWidth={1.5} />
            <div className="text-sm text-[--text-secondary]">请先从剧本工坊生成分镜脚本</div>
            <div className="text-xs text-[--text-muted]">剧本拆解完成后，可一键转为分镜序列</div>
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-sm text-[--text-muted]">加载中...</div>
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <LayoutGrid size={36} className="text-[--text-muted]" strokeWidth={1.5} />
            <div className="text-sm text-[--text-secondary]">暂无分镜</div>
            <div className="text-xs text-[--text-muted]">从剧本工坊点击「一键生成分镜画板」后自动填充</div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/script?project=${projectId}`)}>
              前往剧本工坊
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
            {boards.map((card, i) => (
              <div
                key={card.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragLeave={() => setDragOverIndex(-1)}
                onDrop={() => handleDrop(i)}
                className="cursor-grab active:cursor-grabbing"
              >
                <BoardCardItem
                  card={card}
                  index={i}
                  onGenerate={() => handleGenerateOne(card.id)}
                  onUpdate={(prompt) => handleUpdateBoard(card.id, prompt)}
                  onDelete={() => handleDeleteBoard(card.id)}
                  onUpdateDuration={(sec) => handleUpdateDuration(card.id, sec)}
                  isDragOver={dragOverIndex === i}
                />
              </div>
            ))}
          </div>
        )}
      </div>

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
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setAddingBoard(false); setNewPrompt(""); }}>取消</Button>
              <Button size="sm" loading={addLoading} disabled={!newPrompt.trim()} onClick={handleAddBoard} icon={<Plus size={13} />}>添加</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
