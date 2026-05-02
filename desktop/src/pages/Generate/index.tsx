import { useState, useEffect } from "react";
import {
  Zap, Clock, CheckCircle, XCircle, Loader2, Trash2, Film,
  Image as ImageIcon, Mic, Plus, ChevronDown, ChevronUp, RefreshCw, Download,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { FunctionBlocks, type FunctionBlock } from "@/components/ui/FunctionBlocks";
import { FunctionGenerator } from "@/components/ui/FunctionGenerator";

const BACKEND = "http://localhost:17322";

interface GenTask {
  id: string;
  type: string;
  status: string;
  provider: string;
  input_params?: Record<string, unknown>;
  output_path?: string;
  error_msg?: string;
  cost_estimate?: number;
  created_at?: string;
  finished_at?: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "success" | "error" | "warning" | "accent"; icon: React.ReactNode }> = {
  pending: { label: "排队中",  variant: "default", icon: <Clock size={11} /> },
  running: { label: "生成中",  variant: "accent",  icon: <Loader2 size={11} className="animate-spin" /> },
  done:    { label: "已完成",  variant: "success", icon: <CheckCircle size={11} /> },
  failed:  { label: "失败",    variant: "error",   icon: <XCircle size={11} /> },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <ImageIcon size={14} />,
  video: <Film size={14} />,
  composite_video: <Film size={14} />,
  tts:   <Mic size={14} />,
  script: <Zap size={14} />,
};

const IMAGE_PROVIDERS = [
  { value: "comfyui",    label: "ComfyUI (本地)" },
  { value: "sdwebui",   label: "SD WebUI (本地)" },
  { value: "stability",  label: "Stability AI" },
  { value: "fal",        label: "fal.ai (Flux)" },
  { value: "kling_image", label: "可灵图像" },
];

const VIDEO_PROVIDERS = [
  { value: "kling_video", label: "可灵视频" },
  { value: "vidu",        label: "Vidu" },
  { value: "runway",      label: "Runway Gen-4" },
  { value: "pika",        label: "Pika" },
];

function TaskRow({ task, onDelete, onRetry, onPlayVideo }: { task: GenTask; onDelete: () => void; onRetry: () => void; onPlayVideo?: (taskId: string) => void }) {
  const status = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
  const [expanded, setExpanded] = useState(false);

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  };

  const filename = task.output_path?.split(/[\\/]/).pop() ?? "";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["png", "jpg", "jpeg", "webp"].includes(ext);
  const isVideo = ["mp4", "webm", "mov"].includes(ext);
  const isAudio = ["mp3", "wav", "aac", "ogg"].includes(ext);

  const mediaUrl = task.output_path ? `${BACKEND}/api/generate/tasks/${task.id}/output` : null;

  return (
    <div className="rounded-lg bg-[--bg-surface] border border-[--border] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="text-[--text-muted] shrink-0">{TYPE_ICONS[task.type] ?? <Zap size={14} />}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[--text-primary]">
              {task.type === "image" ? "图像生成" : (task.type === "video" || task.type === "composite_video") ? "视频生成" : task.type === "tts" ? "语音合成" : task.type}
            </span>
            <span className="text-xs text-[--text-muted]">{task.provider}</span>
            <Badge variant={status.variant} className="ml-auto flex items-center gap-1">
              {status.icon}
              {status.label}
            </Badge>
          </div>
          {task.input_params?.prompt != null && (
            <div className="text-[10px] text-[--text-muted] mt-0.5 truncate">
              {String(task.input_params.prompt).slice(0, 80)}
            </div>
          )}
          {task.error_msg && (
            <div className="text-xs text-[--error] mt-0.5 truncate">{task.error_msg}</div>
          )}
          {filename && task.status === "done" && (
            <button
              onClick={() => isVideo ? onPlayVideo?.(task.id) : setExpanded(e => !e)}
              className="text-xs text-[--success] mt-0.5 hover:underline text-left"
            >
              ✓ {filename} {isVideo ? "▶ 播放" : (isImage || isAudio) && (expanded ? "▲" : "▼")}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-[--text-muted] shrink-0">
          {task.created_at && <span>{formatTime(task.created_at)}</span>}
          {task.cost_estimate && (
            <span className="text-[--warning]">≈¥{task.cost_estimate.toFixed(3)}</span>
          )}
          {(task.status === "failed" || task.status === "done") && (
            <button
              onClick={onRetry}
              title="重新运行"
              className="text-[--text-muted] hover:text-[--accent-hover] transition-colors p-1 rounded"
            >
              <RefreshCw size={13} />
            </button>
          )}
          {task.status === "done" && mediaUrl && (
            <a
              href={mediaUrl}
              download={filename || true}
              title="下载"
              className="text-[--text-muted] hover:text-[--success] transition-colors p-1 rounded"
            >
              <Download size={13} />
            </a>
          )}
          <button
            onClick={onDelete}
            className="text-[--text-muted] hover:text-[--error] transition-colors p-1 rounded"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Media preview */}
      {expanded && mediaUrl && task.status === "done" && (
        <div className="px-4 pb-3 border-t border-[--border-subtle] pt-3">
          {isImage && (
            <img src={mediaUrl} alt="output" className="max-h-64 rounded-md object-contain" />
          )}
          {isVideo && (
            <div className="relative">
              <video src={mediaUrl} controls className="w-full max-h-64 rounded-md" />
              <button
                onClick={() => onPlayVideo?.(task.id)}
                className="absolute top-2 right-2 px-2.5 py-1.5 rounded-lg bg-black/60 text-white text-xs hover:bg-black/80 transition-colors"
              >
                全屏
              </button>
            </div>
          )}
          {isAudio && (
            <audio src={mediaUrl} controls className="w-full h-10" />
          )}
        </div>
      )}
    </div>
  );
}

function QuickTaskPanel() {
  const [expanded, setExpanded] = useState(false);
  const [type, setType] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("comfyui");
  const [creating, setCreating] = useState(false);

  const providers = type === "image" ? IMAGE_PROVIDERS : VIDEO_PROVIDERS;

  const handleCreate = async () => {
    if (!prompt.trim()) return;
    setCreating(true);
    try {
      await fetch(`${BACKEND}/api/generate/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          provider,
          input_params: { prompt, width: 768, height: 1024, duration: 5 },
        }),
      });
      setPrompt("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="border border-[--border] rounded-xl bg-[--bg-surface] overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[--bg-hover] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Plus size={14} className="text-[--accent-hover]" />
          <span className="text-sm font-medium text-[--text-primary]">手动创建任务</span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-[--text-muted]" /> : <ChevronDown size={14} className="text-[--text-muted]" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[--border-subtle]">
          {/* Type selector */}
          <div className="flex gap-2">
            {(["image", "video"] as const).map(t => (
              <button
                key={t}
                onClick={() => { setType(t); setProvider(t === "image" ? "comfyui" : "kling_video"); }}
                className={cn(
                  "flex-1 h-8 rounded-md text-xs font-medium transition-all border",
                  type === t
                    ? "bg-[--accent-dim] border-[--accent]/40 text-[--accent-hover]"
                    : "border-[--border] text-[--text-muted] hover:text-[--text-primary]"
                )}
              >
                {t === "image" ? "图像生成" : "视频生成"}
              </button>
            ))}
          </div>

          {/* Provider */}
          <div className="flex gap-2">
            <select
              value={provider}
              onChange={e => setProvider(e.target.value)}
              className="h-8 rounded-md px-2 text-xs bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none flex-1"
            >
              {providers.map(p => <option key={p.value} value={p.value} className="bg-[#27272a] text-gray-200">{p.label}</option>)}
            </select>
          </div>

          {/* Prompt */}
          <textarea
            rows={2}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="输入提示词..."
            className={cn(
              "w-full rounded-md px-3 py-2 text-xs resize-none",
              "bg-[--bg-elevated] border border-[--border]",
              "text-[--text-primary] placeholder:text-[--text-muted]",
              "focus:border-[--accent] transition-colors outline-none"
            )}
          />

          <Button
            onClick={handleCreate}
            loading={creating}
            icon={<Plus size={12} />}
            size="sm"
            className="w-full"
            disabled={!prompt.trim()}
          >
            创建任务
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── Video Player Modal ── */
function VideoPlayerModal({ tasks, initialTaskId, onClose }: {
  tasks: GenTask[];
  initialTaskId: string;
  onClose: () => void;
}) {
  const videoTasks = tasks.filter(t =>
    t.status === "done" &&
    t.output_path &&
    ["mp4", "webm", "mov"].includes(t.output_path.split(".").pop()?.toLowerCase() ?? "")
  );
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.max(0, videoTasks.findIndex(t => t.id === initialTaskId))
  );
  const current = videoTasks[currentIndex];
  if (!current || videoTasks.length === 0) return null;

  const mediaUrl = `${BACKEND}/api/generate/tasks/${current.id}/output`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full max-w-5xl mx-6 max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Top bar: title + navigation + close */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">视频播放</span>
            <span className="text-xs text-white/50">
              {currentIndex + 1} / {videoTasks.length}
            </span>
            <span className="text-xs text-white/40 truncate max-w-[200px]">
              {current.input_params?.prompt
                ? String(current.input_params.prompt).slice(0, 40)
                : current.output_path?.split(/[\\/]/).pop() ?? ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentIndex > 0 && (
              <button
                onClick={() => setCurrentIndex(i => i - 1)}
                className="px-2 py-1 rounded-md bg-white/10 text-white text-xs hover:bg-white/20 transition-colors"
              >
                ◀ 上一个
              </button>
            )}
            {currentIndex < videoTasks.length - 1 && (
              <button
                onClick={() => setCurrentIndex(i => i + 1)}
                className="px-2 py-1 rounded-md bg-white/10 text-white text-xs hover:bg-white/20 transition-colors"
              >
                下一个 ▶
              </button>
            )}
            <button
              onClick={onClose}
              className="size-7 flex items-center justify-center rounded-md bg-white/10 text-white text-xs hover:bg-white/20 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video player */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            key={current.id}
            src={mediaUrl}
            controls
            autoPlay
            className="w-full max-h-[75vh] mx-auto"
            style={{ maxHeight: "75vh" }}
          />
        </div>

        {/* Bottom info bar */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span>类型: {current.type === "composite_video" ? "合并成片" : current.type}</span>
            <span>|</span>
            <span>模型: {current.provider}</span>
            {current.created_at && (
              <>
                <span>|</span>
                <span>创建: {new Date(current.created_at).toLocaleTimeString("zh-CN")}</span>
              </>
            )}
          </div>
          <a
            href={mediaUrl}
            download
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 text-white text-xs hover:bg-white/20 transition-colors"
          >
            <Download size={11} />
            下载
          </a>
        </div>
      </div>
    </div>
  );
}

export function GeneratePage() {
  const [tasks, setTasks] = useState<GenTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<FunctionBlock | null>(null);
  const [videoModalTaskId, setVideoModalTaskId] = useState<string | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/generate/tasks`);
      const data = await r.json();
      setTasks(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // Try WebSocket for real-time updates; fall back to polling
    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    try {
      ws = new WebSocket("ws://localhost:17322/api/generate/ws");
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "task_update") loadTasks();
      };
      ws.onerror = () => {
        ws = null;
        pollTimer = setInterval(loadTasks, 4000);
      };
      ws.onclose = () => {
        if (!pollTimer) pollTimer = setInterval(loadTasks, 4000);
      };
    } catch {
      pollTimer = setInterval(loadTasks, 4000);
    }
    return () => {
      if (ws && ws.readyState <= WebSocket.OPEN) ws.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  const handleDelete = async (id: string) => {
    await fetch(`${BACKEND}/api/generate/tasks/${id}`, { method: "DELETE" });
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const handleRetry = async (id: string) => {
    await fetch(`${BACKEND}/api/generate/tasks/${id}/retry`, { method: "POST" });
    loadTasks();
  };

  const pending = tasks.filter((t) => t.status === "pending").length;
  const running = tasks.filter((t) => t.status === "running").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const failed = tasks.filter((t) => t.status === "failed").length;

  const hasActive = pending > 0 || running > 0;

  return (
    <div className="flex h-full flex-col animate-fade-in">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-subtle] header-gradient">
        <div>
          <h1 className="text-lg font-bold gradient-text">生成中心</h1>
          <p className="text-xs text-[--text-muted] mt-0.5">
            统一管理所有 AI 生成任务
            {hasActive && (
              <span className="ml-2 text-[--accent-hover]">
                · {running > 0 ? `${running} 个进行中` : `${pending} 个排队`}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {done > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const doneTasks = tasks.filter(t => t.status === "done");
                await Promise.all(doneTasks.map(t =>
                  fetch(`${BACKEND}/api/generate/tasks/${t.id}`, { method: "DELETE" })
                ));
                setTasks(tasks.filter(t => t.status !== "done"));
              }}
            >
              清除已完成
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={loadTasks}>刷新</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 px-6 py-4 border-b border-[--border-subtle]">
        {[
          { label: "排队", value: pending, color: "text-[--text-muted]" },
          { label: "生成中", value: running, color: "text-[--accent-hover]" },
          { label: "完成", value: done, color: "text-[--success]" },
          { label: "失败", value: failed, color: "text-[--error]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center py-2.5 rounded-xl bg-[--bg-surface] border border-[--border] hover-lift transition-all duration-200">
            <div className={cn("text-2xl font-bold tabular-nums", color)}>{value}</div>
            <div className="text-xs text-[--text-muted]">{label}</div>
          </div>
        ))}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-4">
          {/* Quick function blocks */}
          <FunctionBlocks onSelect={setSelectedBlock} />

          <QuickTaskPanel />

          {loading && tasks.length === 0 ? (
            <div className="text-center py-12 text-sm text-[--text-muted]">加载中...</div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center animate-fade-in">
              <div className="size-14 rounded-2xl bg-[--accent-dim]/30 flex items-center justify-center">
                <Zap size={24} className="text-[--accent-hover]" strokeWidth={1.5} />
              </div>
              <div className="text-sm text-[--text-secondary] font-medium">暂无生成任务</div>
              <div className="text-xs text-[--text-muted]">
                在分镜画板点击"批量生成分镜图"或"生成视频"后，任务会出现在这里
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onDelete={() => handleDelete(task.id)}
                  onRetry={() => handleRetry(task.id)}
                  onPlayVideo={(id) => setVideoModalTaskId(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Function Generator Modal */}
      {selectedBlock && (
        <FunctionGenerator block={selectedBlock} onClose={() => setSelectedBlock(null)} />
      )}

      {/* Video Player Overlay */}
      {videoModalTaskId && (
        <VideoPlayerModal
          tasks={tasks}
          initialTaskId={videoModalTaskId}
          onClose={() => setVideoModalTaskId(null)}
        />
      )}
    </div>
  );
}
