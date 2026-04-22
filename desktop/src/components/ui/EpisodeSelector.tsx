import { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";

const BACKEND = "http://localhost:17321";

interface Episode {
  id: string;
  episode_no: number;
  title: string;
  status: string;
  board_count?: number;
  image_count?: number;
  video_count?: number;
}

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
          <div className="absolute top-8 left-0 z-30 min-w-[200px] rounded-lg border border-[--border] bg-[--bg-elevated] shadow-xl overflow-hidden">
            {episodes.map(ep => (
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
                    {ep.board_count != null && ep.board_count > 0 && (
                      <span className="text-[10px] text-[--text-muted]/60 shrink-0">
                        {ep.image_count}/{ep.board_count}
                      </span>
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
            ))}
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
