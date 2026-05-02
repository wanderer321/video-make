import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Sparkles,
  Trash2,
  Image,
  Video,
  Wand2,
  Save,
  Eye,
  GripVertical,
} from "lucide-react";

const BACKEND = "http://localhost:17322";

interface Board {
  id: string;
  episode_id: string;
  shot_id: string;
  order_index: number;
  image_path: string | null;
  video_path: string | null;
  prompt: string;
  characters: string[];
  scene_id: string | null;
  camera_angle: string;
  shot_size: string;
  duration_sec: number;
  dialogue: string;
  notes: string;
}

export function SingleEpisodePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const storeProjectId = useAppStore((s) => s.currentProjectId);
  const storeEpisodeId = useAppStore((s) => s.currentEpisodeId);
  const projectId = params.get("project") ?? storeProjectId;
  const episodeId = params.get("episode") ?? storeEpisodeId;

  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Board>>({});

  useEffect(() => {
    if (!episodeId) return;
    loadBoards();
  }, [episodeId]);

  const loadBoards = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/boards/episode/${episodeId}`);
      const data = await r.json();
      setBoards(data);
    } finally {
      setLoading(false);
    }
  };

  const handleAiDecompose = async () => {
    if (!episodeId) return;
    setGenerating(true);
    try {
      // Call the storyboard endpoint to generate boards from script
      const r = await fetch(`${BACKEND}/api/scripts/storyboard-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: episodeId,
          episode_outline: "",
          shots_per_episode: 20,
          style: "",
          characters: [],
          scenes: [],
        }),
      });
      const data = await r.json();
      // Convert shots to boards
      if (data.shots) {
        await fetch(`${BACKEND}/api/boards/from-shots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ episode_id: episodeId, shots: data.shots }),
        });
        await loadBoards();
      }
    } catch {
      // Fallback: show hint
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveEdit = async (board: Board) => {
    await fetch(`${BACKEND}/api/boards/${board.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...board, ...editForm }),
    });
    setEditingId(null);
    setEditForm({});
    await loadBoards();
  };

  const handleDelete = async (id: string) => {
    await fetch(`${BACKEND}/api/boards/${id}`, { method: "DELETE" });
    setBoards(boards.filter((b) => b.id !== id));
  };

  const handleGenerateImage = async (board: Board) => {
    await fetch(`${BACKEND}/api/boards/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board_id: board.id, provider: "auto" }),
    });
    await loadBoards();
  };

  const handleNavigateToStoryboard = () => {
    navigate(`/storyboard?project=${projectId}&episode=${episodeId}`);
  };

  if (!episodeId) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[--text-muted]">
        请先选择集数
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-subtle] header-gradient">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/episodes?project=${projectId}`)} className="p-1.5 rounded-md hover:bg-[--bg-hover] transition-colors">
            <ArrowLeft size={16} className="text-[--text-secondary]" />
          </button>
          <div>
            <h1 className="text-lg font-bold gradient-text">单集管理</h1>
            <p className="text-xs text-[--text-muted] mt-0.5">
              {boards.length} 个镜头片段 · AI 拆分镜 → 参考图 → 视频生成
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleAiDecompose} loading={generating} icon={<Sparkles size={13} />}>
            AI 拆分镜
          </Button>
          <Button onClick={handleNavigateToStoryboard} icon={<Image size={13} />}>
            进入分镜画板
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="text-center py-12 text-sm text-[--text-muted]">加载中...</div>
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Video size={40} className="text-[--text-muted]" strokeWidth={1.5} />
            <div className="text-sm text-[--text-secondary]">还没有镜头片段</div>
            <p className="text-xs text-[--text-muted] max-w-md text-center">
              点击「AI 拆分镜」将本集自动拆分为多个镜头片段，或手动添加
            </p>
            <div className="flex gap-2">
              <Button onClick={handleAiDecompose} loading={generating} icon={<Sparkles size={13} />}>
                AI 拆分镜
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Table header */}
            <div className="grid grid-cols-[40px_120px_140px_1fr_80px_100px] gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[--text-muted] border-b border-[--border-subtle]">
              <div>序号</div>
              <div>出镜主体</div>
              <div>参考垫图</div>
              <div>视频提示词</div>
              <div>时长</div>
              <div>操作</div>
            </div>

            {/* Rows */}
            {boards.map((board, idx) => {
              const isEditing = editingId === board.id;
              return (
                <div
                  key={board.id}
                  className={cn(
                    "grid grid-cols-[40px_120px_140px_1fr_80px_100px] gap-2 px-3 py-3 border-b border-[--border-subtle] transition-colors hover:bg-[--bg-hover]/30",
                    isEditing && "bg-[--accent-dim]/20"
                  )}
                >
                  {/* Index */}
                  <div className="flex items-center">
                    <GripVertical size={14} className="text-[--text-muted] mr-1" />
                    <span className="text-xs font-mono text-[--text-muted]">{idx + 1}</span>
                  </div>

                  {/* Subject */}
                  <div className="flex items-center">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.characters?.join(", ") ?? board.characters?.join(", ") ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, characters: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                        className="w-full rounded px-2 py-1 text-xs bg-[--bg-elevated] border border-[--border] text-[--text-primary] outline-none focus:border-[--accent]"
                        placeholder="角色名..."
                      />
                    ) : (
                      <span className="text-xs text-[--text-primary] truncate">
                        {board.characters?.join(", ") || "—"}
                      </span>
                    )}
                  </div>

                  {/* Reference image */}
                  <div className="flex items-center gap-2">
                    {board.image_path ? (
                      <div className="relative group/img">
                        <img src={`${BACKEND}/api/boards/${board.id}/image`} alt="" className="w-10 h-10 rounded object-cover border border-[--border]" />
                        <div className="absolute inset-0 bg-[--bg-base]/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded">
                          <Eye size={12} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleGenerateImage(board)}
                        className="flex items-center gap-1 rounded-md border border-dashed border-[--border] px-2 py-1.5 text-[10px] text-[--text-muted] hover:border-[--accent]/40 hover:text-[--accent] transition-colors"
                      >
                        <Wand2 size={10} />
                        生成
                      </button>
                    )}
                  </div>

                  {/* Prompt */}
                  <div className="flex items-center">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.prompt ?? board.prompt ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })}
                        className="w-full rounded px-2 py-1 text-xs bg-[--bg-elevated] border border-[--border] text-[--text-primary] outline-none focus:border-[--accent]"
                        placeholder="视频提示词..."
                      />
                    ) : (
                      <span className="text-xs text-[--text-secondary] line-clamp-1">
                        {board.prompt || "—"}
                      </span>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="flex items-center">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.duration_sec ?? board.duration_sec ?? 4}
                        onChange={(e) => setEditForm({ ...editForm, duration_sec: parseFloat(e.target.value) })}
                        className="w-full rounded px-2 py-1 text-xs bg-[--bg-elevated] border border-[--border] text-[--text-primary] outline-none focus:border-[--accent]"
                        min={1}
                        max={30}
                      />
                    ) : (
                      <span className="text-xs font-mono text-[--text-muted]">{board.duration_sec ?? 4}s</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <button onClick={() => handleSaveEdit(board)} className="p-1 rounded hover:bg-[--success]/20 text-[--success] transition-colors">
                          <Save size={12} />
                        </button>
                        <button onClick={() => { setEditingId(null); setEditForm({}); }} className="p-1 rounded hover:bg-[--bg-hover] text-[--text-muted] transition-colors">
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingId(board.id); setEditForm({}); }} className="p-1 rounded hover:bg-[--bg-hover] text-[--text-muted] hover:text-[--accent] transition-colors">
                          <Sparkles size={12} />
                        </button>
                        <button onClick={() => handleDelete(board.id)} className="p-1 rounded hover:bg-[--error]/20 text-[--text-muted] hover:text-[--error] transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
