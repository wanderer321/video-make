import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useApiCheck } from "@/hooks/useApiCheck";
import { VIDEO_PROVIDERS } from "@/lib/utils";
import {
  Wand2,
  Upload,
  Image,
  Settings,
  X,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  episodeId: string;
  onSubmitted: () => void;
}

const BACKEND = "http://localhost:17322";

export function VideoGenModal({ open, onClose, episodeId, onSubmitted }: Props) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [refImages, setRefImages] = useState<File[]>([]);
  const [provider, setProvider] = useState("kling_video");
  const [count, setCount] = useState(1);
  const [resolution, setResolution] = useState("720p");
  const [generating, setGenerating] = useState(false);

  const { allConfigured, missing, triggerCheck } = useApiCheck(["kling_video", "vidu", "runway"]);

  const handleGenerate = () => {
    triggerCheck(async () => {
      setGenerating(true);
      try {
        // Create tasks for each count
        for (let i = 0; i < count; i++) {
          await fetch(`${BACKEND}/api/generate/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "video",
              provider,
              input_params: {
                prompt,
                duration: 5,
                episode_id: episodeId,
              },
            }),
          });
        }
        onSubmitted();
      } catch {
        // Error handled elsewhere
      } finally {
        setGenerating(false);
      }
    });
  };

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title="单集视频生成" size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button onClick={handleGenerate} loading={generating} disabled={!prompt.trim()} icon={<Wand2 size={13} />}>
          生成视频
        </Button>
      </>}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-lg border border-[--accent]/20 bg-[--accent-dim]/20 px-3 py-2.5">
          <Image size={16} className="mt-0.5 shrink-0 text-[--accent]" />
          <div className="text-xs text-[--text-secondary]">
            根据提示词和参考图，为当前集数生成视频。支持选择模型和分辨率
          </div>
        </div>

        {/* Prompt */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[--text-secondary]">视频提示词</label>
          <textarea rows={3}
            placeholder="描述视频画面动态，如：镜头缓慢向后拉远，角色转身望向远方..."
            value={prompt} onChange={e => setPrompt(e.target.value)}
            className="w-full rounded-md px-3 py-2 text-sm resize-none bg-[--bg-elevated] border border-[--border] text-[--text-primary] placeholder:text-[--text-muted] focus:border-[--accent] transition-colors outline-none" />
        </div>

        {/* Reference images */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[--text-secondary]">参考图（角色/场景/道具）</label>
          <div className="flex flex-wrap gap-2">
            {refImages.map((f, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[--border]">
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setRefImages(refImages.filter((_, j) => j !== i))}
                  className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/50 text-white hover:bg-[--error] transition-colors">
                  <X size={10} />
                </button>
              </div>
            ))}
            <label className="w-16 h-16 rounded-lg border-2 border-dashed border-[--border] flex flex-col items-center justify-center cursor-pointer hover:border-[--accent]/40 transition-colors text-[--text-muted]">
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={e => { const files = Array.from(e.target.files ?? []); setRefImages(prev => [...prev, ...files]); }} />
              <Upload size={14} />
              <span className="text-[10px]">上传</span>
            </label>
          </div>
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">视频模型</label>
            <select value={provider} onChange={e => setProvider(e.target.value)}
              className="h-9 rounded-md px-3 text-sm bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none">
              {Object.entries(VIDEO_PROVIDERS).map(([key, label]) => (
                <option key={key} value={key} className="bg-[#27272a] text-gray-200">{label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">生成数量</label>
            <select value={count} onChange={e => setCount(parseInt(e.target.value))}
              className="h-9 rounded-md px-3 text-sm bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none">
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} className="bg-[#27272a] text-gray-200">{n}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">分辨率</label>
            <select value={resolution} onChange={e => setResolution(e.target.value)}
              className="h-9 rounded-md px-3 text-sm bg-[#27272a] border border-[#3f3f46] text-gray-200 outline-none">
              <option value="720p" className="bg-[#27272a] text-gray-200">720p</option>
              <option value="1080p" className="bg-[#27272a] text-gray-200">1080p</option>
            </select>
          </div>
        </div>

        {/* API reminder */}
        {!allConfigured && (
          <div className="flex items-start gap-2.5 rounded-lg border border-[--warning]/30 bg-[--warning]/10 px-3 py-2.5">
            <Settings size={16} className="mt-0.5 shrink-0 text-[--warning]" />
            <div className="text-xs text-[--text-secondary]">
              <span className="font-medium text-[--warning]">未配置视频 API：</span>
              {missing.map(m => VIDEO_PROVIDERS[m] || m).join("、")}
              <br />
              <span>推荐购买</span>
              <button onClick={() => navigate("/settings?tab=2")} className="text-[--accent-hover] underline mx-1">可灵视频</button>
              或
              <button onClick={() => navigate("/settings?tab=2")} className="text-[--accent-hover] underline mx-1">Vidu</button>
              套餐后在设置中配置
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
