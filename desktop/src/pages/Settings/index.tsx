import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Input, SecretInput } from "@/components/ui/Input";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { cn } from "@/lib/utils";

type TestStatus = "idle" | "testing" | "ok" | "fail";

interface ProviderFieldDef {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  hint?: string;
}

interface ProviderDef {
  id: string;
  name: string;
  description: string;
  fields: ProviderFieldDef[];
  testable: boolean;
}

const PROVIDERS: Record<string, ProviderDef[]> = {
  llm: [
    {
      id: "claude",
      name: "Claude (Anthropic)",
      description: "最强文本推理，剧本创作首选",
      testable: true,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "sk-ant-..." },
        { key: "base_url", label: "Base URL（可选）", placeholder: "https://api.anthropic.com", hint: "如有代理或中转地址请填写" },
      ],
    },
    {
      id: "openai",
      name: "OpenAI / 兼容接口",
      description: "GPT-4o 系列，支持任意 OpenAI 兼容接口",
      testable: true,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "sk-..." },
        { key: "base_url", label: "Base URL", placeholder: "https://api.openai.com/v1", hint: "中转地址填这里" },
        { key: "model", label: "默认模型", placeholder: "gpt-4o" },
      ],
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      description: "性价比极高的国产大模型",
      testable: true,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "sk-..." },
        { key: "base_url", label: "Base URL", placeholder: "https://api.deepseek.com/v1" },
        { key: "model", label: "默认模型", placeholder: "deepseek-chat" },
      ],
    },
    {
      id: "qianwen",
      name: "通义千问（阿里云）",
      description: "阿里云大模型，中文效果好",
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "sk-..." },
        { key: "model", label: "默认模型", placeholder: "qwen-max" },
      ],
    },
    {
      id: "ollama",
      name: "Ollama（本地）",
      description: "完全本地运行，零成本，无隐私风险",
      testable: true,
      fields: [
        { key: "base_url", label: "服务地址", placeholder: "http://localhost:11434", hint: "确保 Ollama 已启动" },
        { key: "model", label: "默认模型", placeholder: "qwen2.5:7b" },
      ],
    },
  ],
  image: [
    {
      id: "stability",
      name: "Stability AI",
      description: "Stable Diffusion 官方 API，高质量图像",
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "sk-..." },
      ],
    },
    {
      id: "kling_image",
      name: "可灵图像（Kling）",
      description: "快手可灵，中文场景效果出色",
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true },
        { key: "api_secret", label: "API Secret", secret: true },
      ],
    },
    {
      id: "fal",
      name: "fal.ai（Flux）",
      description: "Flux.1 系列高质量图像，海外稳定",
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "fal-..." },
      ],
    },
    {
      id: "comfyui",
      name: "ComfyUI（本地）",
      description: "本地图像生成，支持 ControlNet / IP-Adapter",
      testable: true,
      fields: [
        { key: "base_url", label: "服务地址", placeholder: "http://localhost:8188" },
      ],
    },
    {
      id: "sdwebui",
      name: "SD WebUI（本地）",
      description: "Stable Diffusion WebUI，支持海量模型",
      testable: true,
      fields: [
        { key: "base_url", label: "服务地址", placeholder: "http://localhost:7860" },
      ],
    },
  ],
  video: [
    {
      id: "kling_video",
      name: "可灵视频（Kling）",
      description: "快手可灵视频，国内首选",
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true },
        { key: "api_secret", label: "API Secret", secret: true },
      ],
    },
    {
      id: "vidu",
      name: "Vidu（生数科技）",
      description: "漫剧专属优化，角色一致性强",
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true },
      ],
    },
    {
      id: "runway",
      name: "Runway Gen-4",
      description: "高质量视频，国际主流",
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true },
      ],
    },
    {
      id: "pika",
      name: "Pika",
      description: "快速生成，性价比高",
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true },
      ],
    },
    {
      id: "jimeng_video",
      name: "即梦视频（字节）",
      description: "字节跳动视频生成",
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true },
      ],
    },
    {
      id: "fal",
      name: "fal.ai（图像+视频）",
      description: "Flux 图像 + Kling 视频，海外稳定，API Key 通用于图像和视频",
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "fal-..." },
      ],
    },
  ],
  tts: [
    {
      id: "elevenlabs",
      name: "ElevenLabs",
      description: "顶级多语言 TTS，支持音色克隆",
      testable: true,
      fields: [
        { key: "api_key", label: "API Key", secret: true },
      ],
    },
    {
      id: "fish_audio",
      name: "Fish Audio",
      description: "中文专属，音色丰富自然",
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true },
      ],
    },
    {
      id: "azure_tts",
      name: "Azure TTS",
      description: "微软语音服务，稳定多语言",
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true },
        { key: "region", label: "Region", placeholder: "eastasia" },
      ],
    },
    {
      id: "xunfei",
      name: "讯飞 TTS",
      description: "科大讯飞，中文顶级质量",
      testable: false,
      fields: [
        { key: "app_id", label: "App ID" },
        { key: "api_key", label: "API Key", secret: true },
        { key: "api_secret", label: "API Secret", secret: true },
      ],
    },
    {
      id: "cosyvoice",
      name: "CosyVoice（本地）",
      description: "阿里开源 TTS，可克隆音色，完全免费",
      testable: false,
      fields: [
        { key: "base_url", label: "服务地址", placeholder: "http://localhost:9880" },
      ],
    },
  ],
};

const TABS = [
  { key: "llm", label: "文本 / 剧本" },
  { key: "image", label: "图像生成" },
  { key: "video", label: "视频生成" },
  { key: "tts", label: "配音 / TTS" },
];

interface ProviderFormProps {
  def: ProviderDef;
  initialData: Record<string, string>;
  isConfigured: boolean;
}

function ProviderForm({ def, initialData, isConfigured }: ProviderFormProps) {
  const { save, test, clear } = useSettingsStore();
  const [values, setValues] = useState<Record<string, string>>(initialData);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMsg, setTestMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setValue = (k: string, v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await save(def.id, values);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTestStatus("testing");
    setTestMsg("");
    try {
      const result = await test(def.id, values);
      setTestStatus(result.ok ? "ok" : "fail");
      setTestMsg(result.message);
    } catch (e) {
      setTestStatus("fail");
      setTestMsg("请求失败");
    }
  };

  return (
    <div className={cn(
      "rounded-xl border bg-[--bg-surface] overflow-hidden transition-colors",
      isConfigured ? "border-[--accent]/30" : "border-[--border]"
    )}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[--border-subtle] flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="font-medium text-[--text-primary] text-sm">{def.name}</div>
            {isConfigured && (
              <span className="text-[10px] bg-[--success]/10 text-[--success] border border-[--success]/20 px-1.5 py-0.5 rounded-full">
                已配置
              </span>
            )}
          </div>
          <div className="text-xs text-[--text-muted] mt-0.5">{def.description}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isConfigured && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clear(def.id)}
              className="text-[--error] hover:text-[--error]"
            >
              清除
            </Button>
          )}
          {def.testable && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              loading={testStatus === "testing"}
            >
              测试连接
            </Button>
          )}
          <Button size="sm" onClick={handleSave} loading={saving}>
            {saved ? "✓ 已保存" : "保存"}
          </Button>
        </div>
      </div>

      {/* Fields */}
      <div className="px-5 py-4 space-y-3">
        {def.fields.map((field) =>
          field.secret ? (
            <SecretInput
              key={field.key}
              label={field.label}
              placeholder={field.placeholder}
              hint={field.hint}
              value={values[field.key] ?? ""}
              onChange={(e) => setValue(field.key, e.target.value)}
            />
          ) : (
            <Input
              key={field.key}
              label={field.label}
              placeholder={field.placeholder}
              hint={field.hint}
              value={values[field.key] ?? ""}
              onChange={(e) => setValue(field.key, e.target.value)}
            />
          )
        )}

        {/* Test result */}
        {testStatus !== "idle" && testMsg && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-xs",
              testStatus === "ok"
                ? "bg-[--success]/10 text-[--success] border border-[--success]/20"
                : testStatus === "fail"
                ? "bg-[--error]/10 text-[--error] border border-[--error]/20"
                : "bg-[--bg-elevated] text-[--text-muted]"
            )}
          >
            {testStatus === "ok" ? (
              <CheckCircle size={13} />
            ) : testStatus === "fail" ? (
              <XCircle size={13} />
            ) : (
              <Loader2 size={13} className="animate-spin" />
            )}
            {testMsg}
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [tab, setTab] = useState("llm");
  const { configs, configured, loading, fetch } = useSettingsStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const providers = PROVIDERS[tab] ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[--border-subtle]">
        <h1 className="text-lg font-bold text-[--text-primary]">设置</h1>
        <p className="text-xs text-[--text-muted] mt-0.5">
          配置 AI 接口密钥，所有 Key 加密存储在本地，不会上传
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <Tabs
          tabs={TABS}
          active={tab}
          onChange={setTab}
          className="mb-5"
        />

        {loading ? (
          <div className="text-sm text-[--text-muted]">加载中...</div>
        ) : (
          <div className="space-y-4">
            {providers.map((def) => (
              <ProviderForm
                key={def.id}
                def={def}
                initialData={configs[def.id] ?? {}}
                isConfigured={configured.includes(def.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
