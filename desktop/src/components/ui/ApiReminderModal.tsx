import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AlertCircle, ArrowRight, Settings } from "lucide-react";
import {
  LLM_PROVIDERS,
  VIDEO_PROVIDERS,
  IMAGE_PROVIDERS,
} from "@/lib/utils";

const PROVIDER_LABELS: Record<string, string> = {
  ...LLM_PROVIDERS,
  ...VIDEO_PROVIDERS,
  ...IMAGE_PROVIDERS,
  edge_tts: "Edge TTS（免费）",
  elevenlabs: "ElevenLabs",
  fish_audio: "Fish Audio",
  azure_tts: "Azure TTS",
  xunfei: "讯飞 TTS",
  cosyvoice: "CosyVoice（本地）",
  stability: "Stability AI",
  kling_image: "可灵图像",
  fal: "fal.ai",
  comfyui: "ComfyUI",
  sdwebui: "SD WebUI",
  kling_video: "可灵视频",
  vidu: "Vidu",
  runway: "Runway",
  pika: "Pika",
  jimeng_video_v30: "即梦-视频生成-3.0",
  jimeng_seedance: "即梦-Seedance 2.0",
};

interface ApiReminderModalProps {
  missing: string[];
  onProceed?: () => void;
  onClose: () => void;
}

const TAB_MAP: Record<string, number> = {
  claude: 0, openai: 0, deepseek: 0, qianwen: 0, ollama: 0,
  stability: 1, kling_image: 1, fal: 1, comfyui: 1, sdwebui: 1,
  kling_video: 2, vidu: 2, runway: 2, pika: 2, jimeng_video_v30: 2, jimeng_seedance: 2,
  elevenlabs: 3, fish_audio: 3, azure_tts: 3, xunfei: 3, cosyvoice: 3,
  edge_tts: 3,
};

export function ApiReminderModal({ missing, onProceed, onClose }: ApiReminderModalProps) {
  const navigate = useNavigate();

  const handleGoSettings = () => {
    const tab = TAB_MAP[missing[0]];
    onClose();
    navigate(`/settings?tab=${tab}`);
  };

  const handleProceed = () => {
    onClose();
    onProceed?.();
  };

  const isOllama = missing.includes("ollama");
  const hasVideoProvider = missing.some((m) => ["kling_video", "vidu", "runway", "pika", "jimeng_video_v30", "jimeng_seedance"].includes(m));

  return (
    <Modal open onClose={onClose} title="需要配置 AI 接口" size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-[--border] bg-[--accent-dim]/30 p-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[--accent]" />
          <div className="text-sm text-[--text-secondary]">
            {hasVideoProvider
              ? "视频生成需要配置视频 API。推荐先购买可灵视频或 Vidu 套餐，也可在设置中配置。"
              : isOllama && missing.length === 1
                ? "检测到您使用 Ollama 本地模型，请确保 Ollama 服务已启动（默认 localhost:11434）。"
                : "以下 AI 接口未配置，配置后才能继续生成。"}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-[--text-primary]">缺失的接口：</p>
          <div className="space-y-1.5">
            {missing.map((p) => (
              <div key={p} className="flex items-center justify-between rounded-md border border-[--border] bg-[--bg-surface] px-3 py-2">
                <div>
                  <span className="text-sm text-[--text-primary]">{PROVIDER_LABELS[p] || p}</span>
                  {p === "edge_tts" && (
                    <span className="ml-2 rounded bg-[--success]/20 px-1.5 py-0.5 text-[10px] text-[--success]">免费</span>
                  )}
                </div>
                <button
                  className="rounded px-2 py-1 text-xs text-[--accent] hover:bg-[--accent-dim]"
                  onClick={() => navigate(`/settings?tab=${TAB_MAP[p] ?? 0}`)}
                >
                  去配置
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleGoSettings} icon={<Settings size={14} />}>
            前往设置
          </Button>
          {onProceed && (
            <Button variant="ghost" onClick={handleProceed} icon={<ArrowRight size={14} />}>
              稍后配置
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// Global listener that catches api-check-failed events
export function useApiReminderListener() {
  const [state, setState] = useState<{ missing: string[]; onProceed?: () => void } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setState({ missing: detail.missing, onProceed: detail.onProceed });
    };
    window.addEventListener("api-check-failed", handler);
    return () => window.removeEventListener("api-check-failed", handler);
  }, []);

  return {
    state,
    clear: () => setState(null),
  };
}
