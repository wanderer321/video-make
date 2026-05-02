import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Plus, Pencil, Check, X, Image as ImageIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";

const BACKEND = "http://localhost:17322";

interface Episode {
  id: string;
  episode_no: number;
  title: string;
  status: string;
  board_count?: number;
  image_count?: number;
  video_count?: number;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  storyboard: "分镜中",
  generating: "生成中",
  done: "已完成",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-[--text-muted]",
  storyboard: "bg-blue-400",
  generating: "bg-yellow-400 animate-pulse",
  done: "bg-green-400",
};

interface EpisodeSelectorProps {
  projectId: string;
  className?: string;
}

function EpisodeTitleEditor({ ep, projectId, onDone }: { ep: Episode; projectId: string; onDone: () => void }) {
  const [draft, setDraft] = useState(ep.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const save = async () => {
    if (!draft.trim() || draft === ep.title) { onDone(); return; }
    await fetch(`${BACKEND}/api/projects/${projectId}/episodes/${ep.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draft.trim() }),
    }).catch(() => {});
    onDone();
  };

  return (
    <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") onDone(); }}
        className="flex-1 min-w-0 text-xs bg-[--bg-base] border border-[--accent]/40 rounded px-1.5 py-0.5 text-[--text-primary] outline-none"
      />
      <button onClick={save} className="text-[--success] hover:text-[--success] p-0.5">
        <Check size={11} />
      </button>
      <button onClick={onDone} className="text-[--text-muted] hover:text-[--text-primary] p-0.5">
        <X size={11} />
      </button>
    </div>
  );
}

export function EpisodeSelector({ projectId, className }: EpisodeSelectorProps) {
  const currentEpisodeId = useAppStore((s) => s.currentEpisodeId);
  const setCurrentEpisode = useAppStore((s) => s.setCurrentEpisode);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadEpisodes = async () => {
    if (!projectId) return;
    const r = await fetch(`${BACKEND}/api/projects/${projectId}/episodes`);
    const data = await r.json();
    if (Array.isArray(data)) {
      setEpisodes(data);
      if (data.length > 0 && !currentEpisodeId) {
        setCurrentEpisode(data[0].id);
      }
    }
  };

  useEffect(() => { loadEpisodes(); }, [projectId]);

  const current = episodes.find(e => e.id === currentEpisodeId);

  const handleAddEpisode = async () => {
    setCreating(true);
    try {
      const r = await fetch(`${BACKEND}/api/projects/${projectId}/episodes`, { method: "POST" });
      const ep = await r.json();
      await loadEpisodes();
      setCurrentEpisode(ep.id);
    } finally {
      setCreating(false);
    }
  };

  if (!projectId || episodes.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex items-center gap-1.5 h-7 px-3 rounded-md text-xs transition-colors",
          "bg-[--bg-elevated] border border-[--border] text-[--text-secondary]",
          "hover:border-[--accent]/40 hover:text-[--text-primary]"
        )}
      >
        <span>{current ? `第${current.episode_no}集 · ${current.title}` : "选择集数"}</span>
        <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => { setOpen(false); setEditingId(null); }} />
          <div className="absolute top-8 left-0 z-30 min-w-[240px] rounded-lg border border-[--border] bg-[--bg-elevated] shadow-xl overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {episodes.map(ep => {
                const progress = ep.board_count && ep.board_count > 0
                  ? Math.round((ep.image_count ?? 0) / ep.board_count * 100)
                  : 0;
                return (
                  <div
                    key={ep.id}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-xs transition-colors group",
                      ep.id === currentEpisodeId
                        ? "bg-[--accent-dim] text-[--accent-hover]"
                        : "text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]"
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_COLORS[ep.status] ?? "bg-[--text-muted]")} />
                    {editingId === ep.id ? (
                      <EpisodeTitleEditor
                        ep={ep}
                        projectId={projectId}
                        onDone={() => { setEditingId(null); loadEpisodes(); }}
                      />
                    ) : (
                      <>
                        <span
                          className="flex-1 cursor-pointer"
                          onClick={() => { setCurrentEpisode(ep.id); setOpen(false); }}
                        >
                          第{ep.episode_no}集 · {ep.title}
                        </span>
                        <span className="text-[10px] text-[--text-muted]/60 shrink-0">
                          {STATUS_LABELS[ep.status] ?? ""}
                        </span>
                        {ep.board_count != null && ep.board_count > 0 && (
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="w-8 h-1 rounded-full bg-[--border] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[--accent]"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-[--text-muted]/60">{progress}%</span>
                          </div>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setEditingId(ep.id); }}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[--text-muted] p-0.5 transition-opacity"
                          title="编辑集名"
                        >
                          <Pencil size={10} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="border-t border-[--border-subtle]">
              <button
                onClick={() => { setOpen(false); handleAddEpisode(); }}
                disabled={creating}
                className="w-full text-left px-3 py-2 text-xs text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-hover] transition-colors flex items-center gap-1.5"
              >
                <Plus size={10} />
                {creating ? "添加中..." : "添加下一集"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Episode management panel - shows all episodes with progress, navigation, and management.
 * Used in the Script page sidebar.
 */
export function EpisodeManagementPanel({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const currentEpisodeId = useAppStore((s) => s.currentEpisodeId);
  const setCurrentEpisode = useAppStore((s) => s.setCurrentEpisode);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEpisodes = async () => {
    if (!projectId) return;
    const r = await fetch(`${BACKEND}/api/projects/${projectId}/episodes`);
    const data = await r.json();
    if (Array.isArray(data)) setEpisodes(data);
  };

  useEffect(() => { loadEpisodes(); }, [projectId]);

  useEffect(() => {
    if (episodes.length > 0 && !currentEpisodeId) {
      setCurrentEpisode(episodes[0].id);
    }
  }, [episodes, currentEpisodeId, setCurrentEpisode]);

  const handleAddEpisode = async () => {
    setCreating(true);
    try {
      const r = await fetch(`${BACKEND}/api/projects/${projectId}/episodes`, { method: "POST" });
      const ep = await r.json();
      await loadEpisodes();
      setCurrentEpisode(ep.id);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEpisode = async (epId: string) => {
    setDeletingId(epId);
    try {
      await fetch(`${BACKEND}/api/projects/${projectId}/episodes/${epId}`, { method: "DELETE" });
      await loadEpisodes();
      if (currentEpisodeId === epId && episodes.length > 1) {
        const remaining = episodes.filter(e => e.id !== epId);
        if (remaining.length > 0) setCurrentEpisode(remaining[0].id);
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (!projectId) return null;

  return (
    <div className="space-y-1">
      {/* Episode list */}
      <div className="text-[10px] text-[--text-muted] uppercase tracking-wide px-1 mb-1.5">分集管理</div>
      {episodes.length === 0 ? (
        <div className="text-xs text-[--text-muted] py-2">暂无分集</div>
      ) : (
        <div className="space-y-0.5 max-h-64 overflow-y-auto">
          {episodes.map(ep => {
            const progress = ep.board_count && ep.board_count > 0
              ? Math.round((ep.image_count ?? 0) / ep.board_count * 100)
              : 0;
            const isCurrent = ep.id === currentEpisodeId;
            return (
              <div
                key={ep.id}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-2 transition-all cursor-pointer group",
                  isCurrent
                    ? "bg-[--accent-dim] border border-[--accent]/30"
                    : "hover:bg-[--bg-hover] border border-transparent"
                )}
                onClick={() => setCurrentEpisode(ep.id)}
              >
                {/* Episode number */}
                <div className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-bold shrink-0",
                  isCurrent
                    ? "bg-[--accent] text-white"
                    : "bg-[--bg-elevated] text-[--text-muted] border border-[--border]"
                )}>
                  {ep.episode_no}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-xs truncate",
                    isCurrent ? "text-[--accent-hover] font-medium" : "text-[--text-secondary]"
                  )}>
                    {ep.title}
                  </div>
                  {ep.board_count != null && ep.board_count > 0 ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="flex-1 h-1 rounded-full bg-[--border] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[--accent] transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[--text-muted]">{progress}%</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-[--text-muted] mt-0.5">
                      {STATUS_LABELS[ep.status] ?? "草稿"}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      navigate(`/storyboard?episode=${ep.id}&project=${projectId}`);
                    }}
                    className="p-0.5 text-[--text-muted] hover:text-[--accent-hover] transition-colors"
                    title="查看分镜"
                  >
                    <ImageIcon size={11} />
                  </button>
                  {ep.episode_no > 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteEpisode(ep.id); }}
                      disabled={deletingId === ep.id}
                      className="p-0.5 text-[--text-muted] hover:text-[--error] transition-colors disabled:opacity-50"
                      title="删除此集"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add episode button */}
      <button
        onClick={handleAddEpisode}
        disabled={creating}
        className={cn(
          "w-full flex items-center justify-center gap-1.5 rounded-md py-2 text-xs transition-colors mt-1",
          "border border-dashed border-[--border] text-[--text-muted] hover:border-[--accent]/40 hover:text-[--accent-hover]"
        )}
      >
        <Plus size={11} />
        {creating ? "添加中..." : "添加新集"}
      </button>
    </div>
  );
}
