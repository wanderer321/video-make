import { Music, Volume2, Mic, Film, Image, ImageIcon, Target, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FunctionBlock {
  key: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
}

export const FUNCTION_BLOCKS: FunctionBlock[] = [
  { key: "text-to-music", label: "文生音乐", desc: "输入描述生成背景音乐", icon: Music, color: "from-purple-500/20 to-pink-500/20" },
  { key: "text-to-sfx", label: "文生音效", desc: "输入场景描述生成音效", icon: Volume2, color: "from-orange-500/20 to-red-500/20" },
  { key: "text-to-speech", label: "文生语音", desc: "文字转配音，多音色可选", icon: Mic, color: "from-cyan-500/20 to-blue-500/20" },
  { key: "video-to-music", label: "视频生音乐", desc: "根据视频画面匹配音乐", icon: Film, color: "from-emerald-500/20 to-green-500/20" },
  { key: "text-to-video", label: "文生视频", desc: "文字描述直接生成视频", icon: Film, color: "from-violet-500/20 to-purple-500/20" },
  { key: "image-to-video", label: "图生视频", desc: "静态图转为动态视频片段", icon: Image, color: "from-blue-500/20 to-indigo-500/20" },
  { key: "video-lip-sync", label: "视频对口型", desc: "让角色按语音对口型", icon: Mic, color: "from-rose-500/20 to-pink-500/20" },
  { key: "ref-to-video", label: "参考生视频", desc: "根据参考图生成视频", icon: Target, color: "from-amber-500/20 to-orange-500/20" },
  { key: "text-to-image", label: "文生图", desc: "文字描述生成图像", icon: ImageIcon, color: "from-teal-500/20 to-cyan-500/20" },
  { key: "ref-to-image", label: "参考生图", desc: "参考图基础上生成新图", icon: ImagePlus, color: "from-lime-500/20 to-green-500/20" },
];

interface Props {
  onSelect: (block: FunctionBlock) => void;
}

export function FunctionBlocks({ onSelect }: Props) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold gradient-text">快捷创作工具</h2>
          <p className="text-xs text-[--text-muted] mt-0.5">选择功能类型，快速开始 AI 生成</p>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {FUNCTION_BLOCKS.map((block) => {
          const Icon = block.icon;
          return (
            <button
              key={block.key}
              onClick={() => onSelect(block)}
              className={cn(
                "group rounded-xl border border-[--border] bg-[--bg-surface] p-4 text-left transition-all duration-200 hover-lift",
                "hover:border-[--accent]/40 hover:shadow-lg hover:shadow-[--accent]/10"
              )}
            >
              <div className={cn("size-10 rounded-lg mb-3 flex items-center justify-center bg-gradient-to-br transition-transform duration-200 group-hover:scale-110", block.color)}>
                <Icon size={18} className="text-[--text-primary]" />
              </div>
              <div className="font-medium text-sm text-[--text-primary] mb-0.5">{block.label}</div>
              <div className="text-[11px] text-[--text-muted]">{block.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
