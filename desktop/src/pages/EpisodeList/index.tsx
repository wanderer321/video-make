import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { STATUS_LABELS } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Grid3x3,
  Film,
  Trash2,
  ChevronRight,
} from "lucide-react";

const BACKEND = "http://localhost:17322";

interface Episode {
  id: string;
  project_id: string;
  episode_no: number;
  title: string;
  status: string;
  board_count: number;
}

export function EpisodeListPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const storeProjectId = useAppStore((s) => s.currentProjectId);
  const storeProjectName = useAppStore((s) => s.currentProjectName);
  const projectId = params.get("project") ?? storeProjectId;

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    loadEpisodes();
  }, [projectId]);

  const loadEpisodes = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/projects/${projectId}/episodes`);
      const data = await r.json();
      // Fetch board counts for each episode
      const episodesWithBoards = await Promise.all(
        data.map(async (ep: Episode) => {
          try {
            const br = await fetch(`${BACKEND}/api/boards/episode/${ep.id}`);
            const boards = await br.json();
            return { ...ep, board_count: boards.length };
          } catch {
            return { ...ep, board_count: 0 };
          }
        })
      );
      setEpisodes(episodesWithBoards);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEpisode = async () => {
    if (!projectId) return;
    setCreating(true);
    try {
      await fetch(`${BACKEND}/api/projects/${projectId}/episodes`, { method: "POST" });
      await loadEpisodes();
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEpisode = async (epId: string) => {
    await fetch(`${BACKEND}/api/projects/${projectId}/episodes/${epId}`, { method: "DELETE" });
    setEpisodes(episodes.filter((e) => e.id !== epId));
  };

  const handleNavigateEpisode = (ep: Episode) => {
    useAppStore.getState().setCurrentEpisode(ep.id);
    navigate(`/storyboard?project=${projectId}&episode=${ep.id}`);
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[--text-muted]">
        请先选择项目
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-subtle] header-gradient">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/projects`)} className="p-1.5 rounded-md hover:bg-[--bg-hover] transition-colors">
            <ArrowLeft size={16} className="text-[--text-secondary]" />
          </button>
          <div>
            <h1 className="text-lg font-bold gradient-text">{storeProjectName} · 集数管理</h1>
            <p className="text-xs text-[--text-muted] mt-0.5">
              共 {episodes.length} 集 · 管理每集的分镜和进度
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleAddEpisode} loading={creating} icon={<Plus size={13} />}>
            新增集数
          </Button>
        </div>
      </div>

      {/* Episode Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="text-center py-12 text-sm text-[--text-muted]">加载中...</div>
        ) : episodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 animate-fade-in">
            <div className="size-14 rounded-2xl bg-[--accent-dim]/30 flex items-center justify-center">
              <Grid3x3 size={24} className="text-[--accent-hover]" strokeWidth={1.5} />
            </div>
            <div className="text-sm text-[--text-secondary] font-medium">还没有集数</div>
            <div className="flex gap-2">
              <Button onClick={handleAddEpisode} loading={creating} icon={<Plus size={13} />}>
                新增集数
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
            {episodes.map((ep) => (
              <div
                key={ep.id}
                className="group rounded-xl border border-[--border] bg-[--bg-surface] p-4 cursor-pointer transition-all duration-200 hover:border-[--accent]/40 hover-lift"
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="accent" className="text-xs">
                    第 {ep.episode_no} 集
                  </Badge>
                  <Badge variant={ep.status === "done" ? "success" : ep.status === "generating" ? "warning" : "default"} className="text-[10px]">
                    {STATUS_LABELS[ep.status] || ep.status}
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold text-[--text-primary] mb-2 truncate">
                  {ep.title || `第 ${ep.episode_no} 集`}
                </h3>
                <div className="flex items-center justify-between text-xs text-[--text-muted]">
                  <span className="flex items-center gap-1">
                    <Film size={11} />
                    {ep.board_count} 个分镜
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteEpisode(ep.id); }}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[--error]/20 text-[--text-muted] hover:text-[--error] transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                    <ChevronRight size={12} className="text-[--accent]/60" />
                  </div>
                </div>

                {/* Click area to navigate */}
                <button
                  onClick={() => handleNavigateEpisode(ep)}
                  className="absolute inset-0 w-full h-full"
                  style={{ zIndex: 0 }}
                />
              </div>
            ))}

            {/* Add episode card */}
            <button
              onClick={handleAddEpisode}
              disabled={creating}
              className="rounded-xl border-2 border-dashed border-[--border] bg-[--bg-surface]/50 p-4 flex flex-col items-center justify-center gap-2 min-h-[100px] hover:border-[--accent]/40 transition-colors text-[--text-muted] hover:text-[--accent]"
            >
              <Plus size={20} />
              <span className="text-xs">新增集数</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
