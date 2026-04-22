import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FolderOpen, Trash2, Film, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { CreateProjectModal } from "./CreateProjectModal";
import { useProjectStore } from "@/stores/useProjectStore";
import { useAppStore } from "@/stores/useAppStore";
import { cn, formatDate, PROJECT_TYPES } from "@/lib/utils";
import type { Project } from "@/lib/api";

const BACKEND = "http://localhost:17321";

const TYPE_COLORS: Record<string, "default" | "accent" | "success"> = {
  manga_2d: "accent",
  manga_3d: "success",
  live_action: "default",
};

interface EpisodeStat {
  id: string;
  episode_no: number;
  title: string;
  status: string;
  board_count: number;
  image_count: number;
  video_count: number;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-[--text-muted]",
    storyboard: "bg-blue-400",
    generating: "bg-yellow-400",
    done: "bg-[--success]",
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors[status] ?? "bg-[--text-muted]"}`} />;
}

function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const navigate = useNavigate();
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const setCurrentEpisode = useAppStore((s) => s.setCurrentEpisode);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [episodeStats, setEpisodeStats] = useState<EpisodeStat[]>([]);
  const [statsLoaded, setStatsLoaded] = useState(false);

  const typeLabel = PROJECT_TYPES[project.type] ?? project.type;
  const typeColor = TYPE_COLORS[project.type] ?? "default";

  const loadStats = async () => {
    if (statsLoaded) return;
    try {
      const r = await fetch(`${BACKEND}/api/projects/${project.id}/episodes`);
      const eps: EpisodeStat[] = await r.json();
      setEpisodeStats(eps);
      setStatsLoaded(true);
    } catch {}
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-[--border] overflow-hidden",
        "bg-[--bg-surface] hover:border-[--accent]/40 transition-all duration-200 cursor-pointer",
        "hover:shadow-lg hover:shadow-[--accent]/5"
      )}
      onMouseEnter={loadStats}
      onClick={async () => {
        setCurrentProject(project.id, project.name);
        try {
          const r = await fetch(`${BACKEND}/api/projects/${project.id}/episodes`);
          const eps = await r.json();
          if (Array.isArray(eps) && eps.length > 0) {
            setCurrentEpisode(eps[0].id);
          }
        } catch {}
        navigate(`/script?project=${project.id}`);
      }}
    >
      {/* Cover */}
      <div
        className="h-36 flex items-center justify-center relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, #${
            project.type === "manga_2d" ? "1a1535, 2a1a50" :
            project.type === "manga_3d" ? "0d2535, 0d3525" :
            "251a0d, 352510"
          })`,
        }}
      >
        <Film size={40} className="text-[--text-muted]/40" strokeWidth={1} />
        {/* Type badge in cover */}
        <div className="absolute top-2 left-2">
          <Badge variant={typeColor} className="text-[10px]">{typeLabel}</Badge>
        </div>
        {project.style && (
          <div className="absolute bottom-2 left-2 text-[10px] text-[--text-muted] bg-[--bg-base]/60 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
            {project.style}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2">
        <h3 className="font-semibold text-[--text-primary] text-sm leading-snug line-clamp-2">
          {project.name}
        </h3>

        <div className="flex items-center justify-between text-xs text-[--text-muted] mt-1">
          <div className="flex items-center gap-1">
            <BookOpen size={11} />
            {project.episode_count} 集
          </div>
          <span>{formatDate(project.updated_at)}</span>
        </div>

        {/* Episode progress stats */}
        {episodeStats.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {episodeStats.slice(0, 3).map(ep => (
              <div key={ep.id} className="flex items-center gap-1.5 text-[10px] text-[--text-muted]">
                <StatusDot status={ep.status} />
                <span className="truncate flex-1">{ep.title}</span>
                {ep.board_count > 0 && (
                  <span className="shrink-0 text-[--text-muted]/60">
                    {ep.image_count}/{ep.board_count}图 {ep.video_count > 0 ? `· ${ep.video_count}视频` : ""}
                  </span>
                )}
              </div>
            ))}
            {episodeStats.length > 3 && (
              <div className="text-[10px] text-[--text-muted]/60">+{episodeStats.length - 3} 集更多...</div>
            )}
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div
        className={cn(
          "absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {confirmDelete ? (
          <>
            <Button
              size="sm"
              variant="danger"
              onClick={async () => {
                onDelete();
                setConfirmDelete(false);
              }}
            >
              确认删除
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
              取消
            </Button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex size-7 items-center justify-center rounded-md bg-[--bg-base]/80 text-[--text-muted] hover:text-[--error] transition-colors backdrop-blur-sm"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ProjectsPage() {
  const { projects, loading, fetch, remove } = useProjectStore();
  const backendOnline = useAppStore((s) => s.backendOnline);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (backendOnline) fetch();
  }, [backendOnline, fetch]);

  if (!backendOnline) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-8">
        <div
          className="flex size-16 items-center justify-center rounded-2xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          <FolderOpen size={28} className="text-[--text-muted]" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[--text-primary] mb-1">后端服务未启动</h2>
          <p className="text-sm text-[--text-muted] max-w-xs">
            请在终端运行以下命令启动后端：
          </p>
          <code className="mt-2 block rounded-md bg-[--bg-elevated] border border-[--border] px-4 py-2 text-xs text-[--accent-hover] font-mono">
            cd backend && python main.py
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-subtle]">
        <div>
          <h1 className="text-lg font-bold text-[--text-primary]">我的项目</h1>
          <p className="text-xs text-[--text-muted] mt-0.5">{projects.length} 个项目</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>
          新建项目
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <PageSpinner />
        ) : projects.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center max-w-md mx-auto">
            <div
              className="flex size-20 items-center justify-center rounded-2xl"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
              <Film size={36} className="text-[--text-muted]" strokeWidth={1} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[--text-primary] mb-2">还没有项目</h2>
              <p className="text-sm text-[--text-muted] leading-relaxed">
                创建你的第一部漫剧。先配置 AI 接口密钥，再新建项目即可开始创作。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-left w-full">
              {[
                { step: "1", title: "配置 API", desc: "在设置页填写 LLM 和图像生成的 API Key" },
                { step: "2", title: "新建项目", desc: "选择题材类型，创建你的漫剧项目" },
                { step: "3", title: "AI 创作", desc: "导入剧本或一键生成，AI 帮你完成分镜图" },
              ].map(({ step, title, desc }) => (
                <div key={step} className="rounded-lg bg-[--bg-surface] border border-[--border] p-3">
                  <div className="text-xs font-mono text-[--accent-hover] bg-[--accent-dim] w-5 h-5 rounded flex items-center justify-center mb-2">{step}</div>
                  <div className="text-sm font-medium text-[--text-primary] mb-1">{title}</div>
                  <div className="text-xs text-[--text-muted] leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>
            <Button onClick={() => setCreateOpen(true)} icon={<Plus size={14} />} size="lg">
              新建项目
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={() => remove(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
