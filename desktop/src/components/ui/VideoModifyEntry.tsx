import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Sparkles, Upload, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

const BACKEND = "http://localhost:17322";

export function VideoModifyEntry({ open, onClose, onSubmitted }: Props) {
  const [prompt, setPrompt] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() && !videoFile) return;
    setGenerating(true);
    try {
      // Kling video modification - submit to generation center
      await fetch(`${BACKEND}/api/generate/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "video",
          provider: "kling_video",
          input_params: {
            prompt,
            mode: "modify",
            has_reference_video: !!videoFile,
          },
        }),
      });
      onSubmitted();
      setPrompt("");
      setVideoFile(null);
    } catch {
      // Error handled elsewhere
    } finally {
      setGenerating(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title="AI 改视频" size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button onClick={handleGenerate} loading={generating} icon={<Sparkles size={13} />}>
          开始修改
        </Button>
      </>}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-lg border border-[--accent]/20 bg-[--accent-dim]/20 px-3 py-2.5">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-[--accent]" />
          <div className="text-xs text-[--text-secondary]">
            上传已有视频，用 AI 修改画面内容。当前支持可灵 AI 视频改写能力。
          </div>
        </div>

        {/* Video upload */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[--text-secondary]">上传视频（可选）</label>
          <div className="flex items-center gap-3">
            <label className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[--border] py-5 cursor-pointer hover:border-[--accent]/40 transition-colors">
              <input type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setVideoFile(f); }} />
              <Upload size={16} className="text-[--text-muted]" />
              <span className="text-xs text-[--text-muted]">{videoFile ? videoFile.name : "点击上传"}</span>
            </label>
            {videoFile && (
              <button onClick={() => setVideoFile(null)} className="p-1 rounded hover:bg-[--error]/20 text-[--error]">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Modification prompt */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[--text-secondary]">修改描述</label>
          <textarea rows={3}
            placeholder="描述你想要如何修改，如：将背景从白天改为夜晚，增加下雨效果..."
            value={prompt} onChange={e => setPrompt(e.target.value)}
            className="w-full rounded-md px-3 py-2 text-sm resize-none bg-[--bg-elevated] border border-[--border] text-[--text-primary] placeholder:text-[--text-muted] focus:border-[--accent] transition-colors outline-none" />
        </div>
      </div>
    </Modal>
  );
}
