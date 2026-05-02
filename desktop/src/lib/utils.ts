import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// Pipeline workflow steps
export const PIPELINE_STEPS = [
  { key: "script", label: "剧本创作", route: "/script", icon: "BookOpen" },
  { key: "assets", label: "资产准备", route: "/assets", icon: "Image" },
  { key: "storyboard", label: "分镜规划", route: "/storyboard", icon: "LayoutGrid" },
  { key: "image-gen", label: "视频生成", route: "/generate", icon: "Zap" },
  { key: "tts", label: "配音合成", route: "/generate", icon: "Mic" },
  { key: "compose", label: "视频剪辑", route: "/compose", icon: "Film" },
  { key: "export", label: "成片导出", route: "/compose", icon: "Download" },
] as const;

// Drama types for project creation
export const DRAMA_TYPES: Record<string, { label: string; desc: string; icon: string }> = {
  domestic_live: { label: "国内仿真人剧", desc: "面向抖音/快手等国内平台的真人短剧", icon: "🎬" },
  overseas_live: { label: "海外真人剧", desc: "面向 Reels/YouTube/TikTok 的海外真人短剧", icon: "🌍" },
  anime_2d: { label: "2D动漫", desc: "二次元风格 2D 动画短剧", icon: "✨" },
  anime_3d: { label: "3D动漫", desc: "3D 渲染风格动画短剧", icon: "🎮" },
};

// Aspect ratio options
export const ASPECT_RATIOS = [
  { key: "9:16", label: "9:16 竖屏", desc: "抖音/快手/Reels", twClass: "w-4 h-7" },
  { key: "16:9", label: "16:9 横屏", desc: "B站/YouTube", twClass: "w-7 h-4" },
  { key: "1:1", label: "1:1 正方形", desc: "微信/朋友圈", twClass: "w-5 h-5" },
] as const;

export const PROJECT_TYPES: Record<string, string> = {
  manga_2d: "2D漫剧",
  manga_3d: "3D漫剧",
  live_action: "真人剧",
  domestic_live: "国内仿真人剧",
  overseas_live: "海外真人剧",
  anime_2d: "2D动漫",
  anime_3d: "3D动漫",
};

export const PROJECT_STYLES = [
  "都市",
  "古风",
  "玄幻",
  "科幻",
  "现实",
  "悬疑",
  "甜宠",
  "逆袭",
  "战争",
  "历史",
];

export const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  scripting: "剧本创作",
  storyboard: "分镜制作",
  generating: "视频生成",
  done: "已完成",
};

// LLM provider labels (with pricing info: 💰=付费, 🆓=免费)
export const LLM_PROVIDERS: Record<string, string> = {
  openai: "OpenAI 💰",
  deepseek: "DeepSeek 💰",
  qianwen: "通义千问 💰",
  glm: "智谱GLM 💰",
  minimax: "MiniMax 💰",
  ollama: "Ollama 🆓 免费",
  claude: "Claude 💰",
};

export const VIDEO_PROVIDERS: Record<string, string> = {
  kling_video: "可灵视频",
  vidu: "Vidu",
  runway: "Runway",
  pika: "Pika",
  jimeng_video_v30: "即梦-视频生成-3.0",
  jimeng_seedance: "即梦-Seedance 2.0",
  fal: "fal.ai",
  comfyui: "ComfyUI（本地）",
};

export const IMAGE_PROVIDERS: Record<string, string> = {
  stability: "Stability AI",
  kling_image: "可灵图像",
  jimeng_image: "即梦图像",
  wan26: "Wan2.6",
  fal: "fal.ai (Flux)",
  comfyui: "ComfyUI（本地）",
  sdwebui: "SD WebUI（本地）",
};
