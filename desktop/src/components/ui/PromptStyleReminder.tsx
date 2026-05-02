import { useState } from "react";
import { Lightbulb, Copy, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const MODEL_TIPS = [
  {
    model: "Claude / GPT-4",
    tip: "偏好详细、结构化的提示词。建议包含：主体描述 + 环境描述 + 镜头语言 + 风格标签。",
    example: "A young Chinese man in flowing red hanfu robes, standing on a moonlit cliff edge, looking at the distant palace. Cinematic lighting, dramatic atmosphere, anime style, 4K --ar 9:16",
  },
  {
    model: "可灵 / Kling",
    tip: "视频生成需要描述动态过程。格式：静态画面 + 运动描述。",
    example: "静态：古风女子站在竹林中。运动：镜头缓慢向前推进，竹叶随风飘落，衣袂飘动",
  },
  {
    model: "Stability AI / Flux",
    tip: "图像生成偏好英文提示词。建议用逗号分隔关键词，结尾加质量标签。",
    example: "Chinese fantasy warrior, black armor with gold trim, standing in bamboo forest, misty morning, cinematic lighting, highly detailed, 8k, masterpiece --ar 9:16",
  },
  {
    model: "Midjourney / DALL-E 3",
    tip: "可以用自然语言描述，DALL-E 3 对中文支持较好。",
    example: "一位穿着白色古装的少女站在樱花树下，微风吹落花瓣，画面温暖柔和",
  },
];

export function PromptStyleReminder({ open, onClose }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[--bg-base]/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-xl border border-[--border] bg-[--bg-surface] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[--border-subtle]">
          <h2 className="font-semibold text-[--text-primary]">提示词风格指南</h2>
          <button onClick={onClose} className="text-[--text-muted] hover:text-[--text-primary] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-[--accent]/20 bg-[--accent-dim]/20 px-3 py-2.5">
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-[--warning]" />
            <div className="text-xs text-[--text-secondary]">
              不同 AI 模型对提示词的理解和偏好不同。在生成前，根据目标模型调整提示词风格可以显著提升效果。
            </div>
          </div>

          <div className="space-y-3">
            {MODEL_TIPS.map((item, i) => (
              <div key={item.model} className="rounded-lg border border-[--border] bg-[--bg-card] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[--text-primary]">{item.model}</span>
                  {copiedIdx === i && (
                    <span className="text-[10px] text-[--success]">已复制</span>
                  )}
                </div>
                <div className="text-xs text-[--text-secondary]">{item.tip}</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-[--bg-elevated] px-2.5 py-1.5 text-[11px] text-[--accent-hover] font-mono leading-relaxed break-all">
                    {item.example}
                  </code>
                  <button onClick={() => handleCopy(item.example, i)}
                    className="p-1.5 rounded-md hover:bg-[--bg-hover] text-[--text-muted] hover:text-[--accent] transition-colors shrink-0">
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
