import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useApiCheck } from "@/hooks/useApiCheck";
import {
  Wand2,
  Upload,
  Settings,
  X,
  ArrowRight,
} from "lucide-react";

interface Props {
  block: { key: string; label: string } | null;
  onClose: () => void;
}

const BACKEND = "http://localhost:17322";

const KEY_TO_PROVIDERS: Record<string, string[]> = {
  "text-to-music": [], // No specific provider yet
  "text-to-sfx": [],
  "text-to-speech": ["edge_tts", "elevenlabs", "fish_audio"],
  "video-to-music": [],
  "text-to-video": ["kling_video", "vidu", "runway", "pika"],
  "image-to-video": ["kling_video", "vidu", "runway", "pika"],
  "video-lip-sync": ["kling_video"],
  "ref-to-video": ["kling_video", "vidu"],
  "text-to-image": ["stability", "kling_image", "fal", "comfyui"],
  "ref-to-image": ["stability", "kling_image", "fal", "comfyui"],
};

export function FunctionGenerator({ block, onClose }: Props) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [refImage, setRefImage] = useState<File | null>(null);
  const [provider, setProvider] = useState("auto");
  const [count, setCount] = useState(1);
  const [resolution, setResolution] = useState("768x1024");
  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskDone, setTaskDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isVideo = block?.key.includes("video");
  const isImage = block?.key.includes("image");
  const isAudio = block?.key.includes("music") || block?.key.includes("speech") || block?.key.includes("sfx");

  const requiredProviders = KEY_TO_PROVIDERS[block?.key ?? ""] ?? [];
  const { allConfigured, missing, triggerCheck } = useApiCheck(requiredProviders);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    triggerCheck(async () => {
      setGenerating(true);
      setTaskId(null);
      setTaskDone(false);
      try {
        // Determine task type based on function block
        let taskType = "image";
        if (isVideo) taskType = "video";
        if (isAudio) taskType = "tts";

        const r = await fetch(`${BACKEND}/api/generate/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: taskType,
            provider: provider === "auto" ? (requiredProviders[0] || "auto") : provider,
            input_params: {
              prompt: prompt,
              count,
              resolution,
              ...(refImage ? { has_reference: true } : {}),
            },
          }),
        });
        const data = await r.json();
        setTaskId(data.id);
        setTaskDone(true);
      } catch {
        // Error handled by toast elsewhere
      } finally {
        setGenerating(false);
      }
    });
  };

  const handleGoToGenerateCenter = () => {
    onClose();
    navigate("/generate");
  };

  if (!block) return null;

  return (
    <Modal open onClose={onClose} title={block.label} size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          {taskDone && taskId ? (
            <Button onClick={handleGoToGenerateCenter} icon={<ArrowRight size={14} />}>
              查看生成结果
            </Button>
          ) : (
            <Button onClick={handleGenerate} loading={generating} disabled={!prompt.trim()} icon={<Wand2 size={13} />}>
              开始生成
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* Prompt */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[--text-secondary]">提示词</label>
          <textarea
            rows={4}
            placeholder={
              isVideo ? "描述你想要生成的视频画面，如：一只穿着宇航服的猫站在月球上，镜头缓慢拉远..."
              : isImage ? "描述你想要生成的图像，如：古风男子，白衣飘飘，站在竹林中，电影质感..."
              : isAudio ? "描述你想要的音乐/音效，如：古风背景音乐，悠扬笛声，带有战斗紧张感..."
              : "描述你想要生成的内容..."
            }
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            className="w-full rounded-md px-3 py-2 text-sm resize-none bg-[--bg-elevated] border border-[--border] text-[--text-primary] placeholder:text-[--text-muted] focus:border-[--accent] transition-colors outline-none"
          />
        </div>

        {/* Reference image upload (for ref-based functions) */}
        {(block.key.startsWith("ref-") || block.key.startsWith("image-") || block.key.startsWith("video-lip")) && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">参考图</label>
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setRefImage(f); }} />
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-lg border-2 border-dashed border-[--border] px-4 py-3 text-sm text-[--text-muted] hover:border-[--accent]/40 hover:text-[--accent] transition-colors">
                <Upload size={14} />
                {refImage ? refImage.name : "点击上传参考图"}
              </button>
              {refImage && (
                <button onClick={() => setRefImage(null)} className="p-1 rounded hover:bg-[--error]/20 text-[--error]">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Parameters row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">生成数量</label>
            <select value={count} onChange={e => setCount(parseInt(e.target.value))}
              className="h-9 rounded-md px-3 text-sm bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none">
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} className="bg-[#27272a] text-gray-200">{n}</option>)}
            </select>
          </div>
          {isImage && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[--text-secondary]">分辨率</label>
              <select value={resolution} onChange={e => setResolution(e.target.value)}
                className="h-9 rounded-md px-3 text-sm bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none">
                <option value="512x512" className="bg-[#27272a] text-gray-200">512×512</option>
                <option value="768x1024" className="bg-[#27272a] text-gray-200">768×1024</option>
                <option value="1024x1024" className="bg-[#27272a] text-gray-200">1024×1024</option>
                <option value="1024x1920" className="bg-[#27272a] text-gray-200">1024×1920</option>
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">Provider</label>
            <select value={provider} onChange={e => setProvider(e.target.value)}
              className="h-9 rounded-md px-3 text-sm bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none">
              <option value="auto" className="bg-[#27272a] text-gray-200">自动选择</option>
              {requiredProviders.map(p => (
                <option key={p} value={p} className="bg-[#27272a] text-gray-200">{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* API reminder if not configured */}
        {!allConfigured && requiredProviders.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-lg border border-[--warning]/30 bg-[--warning]/10 px-3 py-2.5">
            <Settings size={16} className="mt-0.5 shrink-0 text-[--warning]" />
            <div className="text-xs text-[--text-secondary]">
              <span className="font-medium text-[--warning]">提示：</span>
              未配置 {missing.join("、")} 接口，请前往
              <button onClick={() => { onClose(); navigate("/settings"); }} className="text-[--accent-hover] underline mx-1">设置</button>
              页面配置
            </div>
          </div>
        )}

        {/* Task result */}
        {taskDone && taskId && (
          <div className="rounded-lg border border-[--success]/30 bg-[--success]/10 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="success">已提交</Badge>
              <span className="text-xs text-[--text-secondary]">任务已提交到生成中心</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={handleGoToGenerateCenter} icon={<ArrowRight size={12} />}>
                前往查看
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
