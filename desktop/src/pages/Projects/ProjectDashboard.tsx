import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  LayoutGrid,
  Image as ImageIcon,
  Film,
  Settings2,
  Users,
  MapPin,
  Package,
  ChevronRight,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";

const BACKEND = "http://localhost:17322";

interface EpisodeStat {
  id: string;
  episode_no: number;
  title: string;
  status: string;
  board_count: number;
  image_count: number;
  video_count: number;
}

interface AssetStat {
  character_count: number;
  scene_count: number;
  prop_count: number;
}

interface ProjectDashboardProps {
  projectId: string;
  onBack: () => void;
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
  generating: "bg-yellow-400",
  done: "bg-green-400",
};

export function ProjectDashboard({ projectId, onBack }: ProjectDashboardProps) {
  const navigate = useNavigate();
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const [project, setProject] = useState<{ name: string; type: string; style?: string; description?: string } | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeStat[]>([]);
  const [assets, setAssets] = useState<AssetStat>({ character_count: 0, scene_count: 0, prop_count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [pr, ep] = await Promise.all([
          fetch(`${BACKEND}/api/projects/${projectId}`).then(r => r.json()),
          fetch(`${BACKEND}/api/projects/${projectId}/episodes`).then(r => r.json()),
        ]);
        setProject(pr);
        setEpisodes(Array.isArray(ep) ? ep : []);

        // Load asset counts
        const ar = await fetch(`${BACKEND}/api/assets/project/${projectId}`).then(r => r.json()).catch(() => []);
        if (Array.isArray(ar)) {
          setAssets({
            character_count: ar.filter((a: { type: string }) => a.type === "character").length,
            scene_count: ar.filter((a: { type: string }) => a.type === "scene").length,
            prop_count: ar.filter((a: { type: string }) => a.type === "prop").length,
          });
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [projectId]);

  const totalBoards = episodes.reduce((s, e) => s + e.board_count, 0);
  const totalImages = episodes.reduce((s, e) => s + e.image_count, 0);
  const totalVideos = episodes.reduce((s, e) => s + e.video_count, 0);
  const imageProgress = totalBoards > 0 ? Math.round(totalImages / totalBoards * 100) : 0;
  const videoProgress = totalBoards > 0 ? Math.round(totalVideos / totalBoards * 100) : 0;

  const handleEnterProject = () => {
    setCurrentProject(projectId, project?.name ?? "");
    navigate(`/script?project=${projectId}`);
  };

  if (loading) {
    return <div className="text-center py-12 text-sm text-[--text-muted]">加载中...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back button + Project header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-[--text-muted] hover:text-[--text-primary] transition-colors"
        >
          <ArrowLeft size={13} />
          返回项目列表
        </button>
      </div>

      {/* Project info */}
      <div className="rounded-xl bg-[--bg-surface] border border-[--border] p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[--text-primary]">{project?.name}</h1>
            {project?.style && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="accent">{project.style}</Badge>
                <span className="text-xs text-[--text-muted]">{project.type === "manga_2d" ? "2D漫剧" : project.type === "manga_3d" ? "3D漫剧" : "真人剧"}</span>
              </div>
            )}
            {project?.description && (
              <p className="text-sm text-[--text-muted] mt-2 max-w-lg">{project.description}</p>
            )}
          </div>
          <Button onClick={handleEnterProject} icon={<Wand2 size={14} />}>
            进入项目
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "分集数", value: episodes.length, icon: BookOpen, color: "text-blue-400" },
          { label: "分镜数", value: totalBoards, icon: LayoutGrid, color: "text-purple-400" },
          { label: "已生图", value: totalImages, icon: ImageIcon, color: "text-green-400" },
          { label: "已生视频", value: totalVideos, icon: Film, color: "text-orange-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-[--bg-surface] border border-[--border] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <span className="text-xs text-[--text-muted]">{label}</span>
            </div>
            <div className="text-2xl font-bold text-[--text-primary]">{value}</div>
          </div>
        ))}
      </div>

      {/* Progress bars */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[--bg-surface] border border-[--border] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[--text-primary]">分镜图进度</span>
            <span className="text-sm font-mono text-[--accent-hover]">{imageProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-[--bg-elevated] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
              style={{ width: `${imageProgress}%` }}
            />
          </div>
          <div className="text-xs text-[--text-muted] mt-1">{totalImages} / {totalBoards} 张</div>
        </div>
        <div className="rounded-xl bg-[--bg-surface] border border-[--border] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[--text-primary]">视频进度</span>
            <span className="text-sm font-mono text-[--accent-hover]">{videoProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-[--bg-elevated] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
              style={{ width: `${videoProgress}%` }}
            />
          </div>
          <div className="text-xs text-[--text-muted] mt-1">{totalVideos} / {totalBoards} 个</div>
        </div>
      </div>

      {/* Asset counts */}
      <div className="rounded-xl bg-[--bg-surface] border border-[--border] p-4">
        <div className="text-sm font-medium text-[--text-primary] mb-3">资产统计</div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "角色", count: assets.character_count, icon: Users, color: "text-pink-400" },
            { label: "场景", count: assets.scene_count, icon: MapPin, color: "text-cyan-400" },
            { label: "道具", count: assets.prop_count, icon: Package, color: "text-amber-400" },
          ].map(({ label, count, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={cn("size-8 rounded-lg flex items-center justify-center", "bg-[--bg-elevated] border border-[--border]")}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <div className="text-lg font-bold text-[--text-primary]">{count}</div>
                <div className="text-[10px] text-[--text-muted]">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Episode list */}
      <div className="rounded-xl bg-[--bg-surface] border border-[--border] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[--border-subtle]">
          <span className="text-sm font-medium text-[--text-primary]">分集进度</span>
        </div>
        <div className="divide-y divide-[--border-subtle]">
          {episodes.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-[--text-muted]">暂无分集</div>
          ) : (
            episodes.map(ep => {
              const progress = ep.board_count > 0 ? Math.round(ep.image_count / ep.board_count * 100) : 0;
              return (
                <div
                  key={ep.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-[--bg-hover] transition-colors cursor-pointer"
                  onClick={() => {
                    setCurrentProject(projectId, project?.name ?? "");
                    useAppStore.getState().setCurrentEpisode(ep.id);
                    navigate(`/storyboard?episode=${ep.id}&project=${projectId}`);
                  }}
                >
                  {/* Episode number */}
                  <div className="w-8 h-8 rounded-lg bg-[--bg-elevated] border border-[--border] flex items-center justify-center text-xs font-mono font-bold text-[--text-muted] shrink-0">
                    {ep.episode_no}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[--text-primary] truncate">{ep.title}</span>
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_COLORS[ep.status] ?? "bg-[--text-muted]")} />
                      <span className="text-[10px] text-[--text-muted]">{STATUS_LABELS[ep.status] ?? ""}</span>
                    </div>
                    {ep.board_count > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 rounded-full bg-[--border] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[--accent]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[--text-muted]">{ep.image_count}/{ep.board_count}图</span>
                        {ep.video_count > 0 && (
                          <span className="text-[10px] text-[--success]">{ep.video_count}视频</span>
                        )}
                      </div>
                    )}
                  </div>

                  <ChevronRight size={14} className="text-[--text-muted] shrink-0" />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "剧本工坊", desc: "导入或生成剧本", icon: BookOpen, action: () => { setCurrentProject(projectId, project?.name ?? ""); navigate(`/script?project=${projectId}`); } },
          { label: "资产库", desc: "管理角色、场景、道具", icon: ImageIcon, action: () => { setCurrentProject(projectId, project?.name ?? ""); navigate(`/assets?project=${projectId}`); } },
          { label: "设置", desc: "配置 AI 接口", icon: Settings2, action: () => navigate("/settings") },
        ].map(({ label, desc, icon: Icon, action }) => (
          <button
            key={label}
            onClick={action}
            className="flex items-center gap-3 rounded-xl border border-[--border] bg-[--bg-surface] p-4 text-left hover:border-[--accent]/40 transition-all"
          >
            <div className="size-9 rounded-lg bg-[--bg-elevated] border border-[--border] flex items-center justify-center">
              <Icon size={16} className="text-[--accent-hover]" />
            </div>
            <div>
              <div className="text-sm font-medium text-[--text-primary]">{label}</div>
              <div className="text-[10px] text-[--text-muted]">{desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
