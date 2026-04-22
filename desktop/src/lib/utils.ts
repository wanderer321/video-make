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

export const PROJECT_TYPES: Record<string, string> = {
  manga_2d: "2D漫剧",
  manga_3d: "3D漫剧",
  live_action: "真人剧",
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
