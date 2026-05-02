import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Film, Image, CheckCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";

const BACKEND = "http://localhost:17322";

interface Episode {
  id: string;
  episode_no: number;
  title: string;
  script_content?: string;
  status: string;
  board_count: number;
  image_count: number;
  video_count: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "gray" },
  scripting: { label: "编剧中", color: "blue" },
  storyboard: { label: "分镜中", color: "purple" },
  generating: { label: "生成中", color: "yellow" },
  done: { label: "完成", color: "green" },
};

function EpisodeCard({ episode, projectId }: { episode: Episode; projectId: string }) {
  const navigate = useNavigate();
  const statusInfo = STATUS_LABELS[episode.status] || STATUS_LABELS.draft;
  const progress = episode.board_count > 0
    ? Math.round((episode.image_count / episode.board_count) * 100)
    : 0;

  return (
    <div
      onClick={() => navigate(`/storyboard/episode/${episode.id}?project=${projectId}`)}
      className="group cursor-pointer rounded-xl border-2 border-[#3f3f46] bg-[#232329] overflow-hidden hover:border-[#7c5ef5] hover:shadow-lg hover:shadow-[#7c5ef5]/20 transition-all duration-200"
    >
      {/* Header with episode number */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3f3f46] bg-[#2a2a32]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold text-[#a78bfa]">E{episode.episode_no}</span>
          <span className="text-sm font-medium text-gray-200 truncate max-w-[180px]">{episode.title}</span>
        </div>
        <Badge
          className={cn(
            "text-xs",
            statusInfo.color === "green" && "bg-green-500/20 text-green-400 border-green-500/30",
            statusInfo.color === "purple" && "bg-[#7c5ef5]/20 text-[#a78bfa] border-[#7c5ef5]/30",
            statusInfo.color === "yellow" && "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
            statusInfo.color === "blue" && "bg-blue-500/20 text-blue-400 border-blue-500/30",
            statusInfo.color === "gray" && "bg-gray-500/20 text-gray-400 border-gray-500/30"
          )}
        >
          {statusInfo.label}
        </Badge>
      </div>

      {/* Stats row */}
      <div className="px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Film size={14} className="text-gray-500" />
          <span className="text-xs text-gray-400">{episode.board_count} 分镜</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Image size={14} className="text-gray-500" />
          <span className="text-xs text-gray-400">{episode.image_count} 已生图</span>
        </div>
        {episode.video_count > 0 && (
          <div className="flex items-center gap-1.5">
            <CheckCircle size={14} className="text-green-400" />
            <span className="text-xs text-green-400">{episode.video_count} 视频</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {episode.board_count > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-[#2a2a32] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7c5ef5] to-[#a78bfa] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{progress}%</span>
          </div>
        </div>
      )}

      {/* Hover arrow */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight size={20} className="text-[#7c5ef5]" />
      </div>
    </div>
  );
}

export function EpisodesPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const storeProjectId = useAppStore((s) => s.currentProjectId);
  const projectId = params.get("project") ?? storeProjectId ?? "";

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    // Fetch project info and episodes
    fetch(`${BACKEND}/api/projects/${projectId}`)
      .then(r => r.json())
      .then((project) => {
        setProjectName(project.name || "");
        if (project.episodes) {
          setEpisodes(project.episodes);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  // If no project, redirect to projects page
  useEffect(() => {
    if (!projectId && !loading) {
      navigate("/projects");
    }
  }, [projectId, loading, navigate]);

  return (
    <div className="flex h-full flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-subtle] header-gradient">
        <div>
          <h1 className="text-lg font-bold gradient-text">分镜规划</h1>
          <p className="text-xs text-[--text-muted] mt-0.5">
            {projectName ? `${projectName} · ${episodes.length} 集` : "选择剧集进入分镜编辑"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/script?project=${projectId}`)}>
            返回剧本
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/assets?project=${projectId}`)}>
            资产准备
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="text-center py-12 text-sm text-[--text-muted]">加载中...</div>
        ) : episodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="size-14 rounded-xl bg-[--bg-elevated] flex items-center justify-center">
              <Film size={24} className="text-[--text-muted]" strokeWidth={1.5} />
            </div>
            <div className="text-sm text-[--text-muted]">没有剧集</div>
            <div className="text-xs text-[--text-muted]">请先在剧本工坊创建剧集</div>
            <Button onClick={() => navigate(`/script?project=${projectId}`)} icon={<Film size={14} />}>
              前往剧本工坊
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {episodes.sort((a, b) => a.episode_no - b.episode_no).map((ep) => (
              <EpisodeCard key={ep.id} episode={ep} projectId={projectId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}