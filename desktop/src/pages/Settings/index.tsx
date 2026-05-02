import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, SecretInput, Select } from "@/components/ui/Input";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { cn } from "@/lib/utils";

type TestStatus = "idle" | "testing" | "ok" | "fail";

interface ProviderFieldDef {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  hint?: string;
  options?: string[];  // 预定义选项列表，用于下拉选择
}

interface ProviderDef {
  id: string;
  name: string;
  description: string;
  use_cases?: string[];
  fields: ProviderFieldDef[];
  testable: boolean;
}

// 各提供商的常用模型列表
const MODEL_OPTIONS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  deepseek: ["deepseek-chat", "deepseek-coder"],
  qianwen: [
    "qwen3-max-2026-01-23",
    "qwen3.6-plus",
    "qwen3.5-plus",
    "qwen3-coder-next",
    "qwen3-coder-plus",
    "qwen-max",
    "qwen-plus",
    "qwen-turbo",
  ],
  ollama: ["qwen2.5:7b", "qwen2.5:14b", "llama3.1:8b", "deepseek-coder:6.7b"],
  glm: ["glm-4-plus", "glm-4-air", "glm-4-flash", "glm-4-long"],
  minimax: ["abab6.5s-chat", "abab6.5-chat", "abab5.5-chat"],
};

const PROVIDERS: Record<string, ProviderDef[]> = {
  llm: [
    {
      id: "openai",
      name: "OpenAI / 兼容接口 💰",
      description: "GPT-4o 系列，支持任意 OpenAI 兼容接口（付费）",
      use_cases: ["通用文本生成", "快速迭代测试", "第三方模型接入"],
      testable: true,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "sk-..." },
        { key: "base_url", label: "Base URL", placeholder: "https://api.openai.com/v1", hint: "中转地址填这里" },
        { key: "model", label: "模型版本", options: MODEL_OPTIONS.openai },
      ],
    },
    {
      id: "deepseek",
      name: "DeepSeek 💰",
      description: "性价比极高的国产大模型（付费，价格便宜）",
      use_cases: ["低成本剧本生成", "快速迭代", "中文场景优化"],
      testable: true,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "sk-..." },
        { key: "base_url", label: "Base URL", placeholder: "https://api.deepseek.com/v1" },
        { key: "model", label: "模型版本", options: MODEL_OPTIONS.deepseek },
      ],
    },
    {
      id: "qianwen",
      name: "通义千问（阿里云） 💰",
      description: "阿里云大模型，中文效果好（付费）",
      use_cases: ["中文剧本创作", "国产生态集成", "企业级稳定性"],
      testable: true,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "sk-..." },
        { key: "model", label: "模型版本", options: MODEL_OPTIONS.qianwen },
      ],
    },
    {
      id: "glm",
      name: "智谱 GLM 💰",
      description: "智谱 AI 大模型，国产领先（付费）",
      use_cases: ["中文剧本创作", "长文本理解", "低成本高质量"],
      testable: true,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "..." },
        { key: "model", label: "模型版本", options: MODEL_OPTIONS.glm },
      ],
    },
    {
      id: "minimax",
      name: "MiniMax 💰",
      description: "MiniMax 大模型，国产性价比高（付费）",
      use_cases: ["中文剧本创作", "角色对话生成", "低成本"],
      testable: true,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "..." },
        { key: "group_id", label: "Group ID", placeholder: "..." },
        { key: "model", label: "模型版本", options: MODEL_OPTIONS.minimax },
      ],
    },
    {
      id: "ollama",
      name: "Ollama（本地） 🆓",
      description: "完全本地运行，零成本，无隐私风险（免费）",
      use_cases: ["隐私敏感项目", "零API成本", "离线开发"],
      testable: true,
      fields: [
        { key: "base_url", label: "服务地址", placeholder: "http://localhost:11434", hint: "确保 Ollama 已启动" },
        { key: "model", label: "模型版本", options: MODEL_OPTIONS.ollama },
      ],
    },
    {
      id: "claude",
      name: "Claude (Anthropic) 💰",
      description: "最强文本推理，剧本创作首选（付费）",
      use_cases: ["长篇剧本生成", "复杂角色分析", "多集连贯性保持"],
      testable: true,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "sk-ant-..." },
        { key: "base_url", label: "Base URL（可选）", placeholder: "https://api.anthropic.com", hint: "如有代理或中转地址请填写" },
      ],
    },
  ],
  image: [
    {
      id: "stability",
      name: "Stability AI",
      description: "Stable Diffusion 官方 API，高质量图像",
      use_cases: ["高质量角色立绘", "精细场景渲染"],
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "sk-..." },
      ],
    },
    {
      id: "kling_image",
      name: "可灵图像（Kling）",
      description: "快手可灵，中文场景效果出色",
      use_cases: ["中文提示词优化", "国风场景"],
      testable: false,
      fields: [
        { key: "api_key", label: "Access Key", secret: true, placeholder: "在可灵开放平台获取" },
        { key: "api_secret", label: "Secret Key", secret: true, placeholder: "在可灵开放平台获取" },
      ],
    },
    {
      id: "jimeng_image",
      name: "即梦图像（火山引擎）",
      description: "字节跳动火山引擎图像生成",
      use_cases: ["中文提示词优化", "高质量角色立绘", "国内稳定"],
      testable: true,
      fields: [
        { key: "access_key", label: "Access Key ID", secret: true, placeholder: "AK..." },
        { key: "secret_key", label: "Secret Access Key", secret: true, placeholder: "SK...", hint: "在火山引擎控制台获取" },
      ],
    },
    {
      id: "fal",
      name: "fal.ai（Flux）",
      description: "Flux.1 系列高质量图像，海外稳定",
      use_cases: ["高质量写实风格", "海外服务稳定"],
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "fal-..." },
      ],
    },
    {
      id: "comfyui",
      name: "ComfyUI（本地）",
      description: "本地图像生成，支持 ControlNet / IP-Adapter",
      use_cases: ["角色一致性要求高", "ControlNet精准控制", "零成本批量生图"],
      testable: true,
      fields: [
        { key: "base_url", label: "服务地址", placeholder: "http://localhost:8188" },
      ],
    },
    {
      id: "sdwebui",
      name: "SD WebUI（本地）",
      description: "Stable Diffusion WebUI，支持海量模型",
      use_cases: ["自定义模型LoRA", "丰富插件生态", "零成本"],
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
      use_cases: ["国内视频生成首选", "中文提示词友好"],
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
      use_cases: ["角色一致性要求高", "漫剧场景优化"],
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true },
      ],
    },
    {
      id: "runway",
      name: "Runway Gen-4",
      description: "高质量视频，国际主流",
      use_cases: ["高质量视频", "国际主流服务"],
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true },
      ],
    },
    {
      id: "pika",
      name: "Pika",
      description: "快速生成，性价比高",
      use_cases: ["快速生成", "性价比高"],
      testable: false,
      fields: [
        { key: "api_key", label: "API Key", secret: true },
      ],
    },
    {
      id: "jimeng_video_v30",
      name: "即梦-视频生成-3.0",
      description: "字节跳动火山引擎视频生成3.0 Pro",
      use_cases: ["国内稳定", "中文场景优化", "高质量"],
      testable: true,
      fields: [
        { key: "access_key", label: "Access Key ID", secret: true, placeholder: "AK..." },
        { key: "secret_key", label: "Secret Access Key", secret: true, placeholder: "SK...", hint: "在火山引擎控制台获取" },
      ],
    },
    {
      id: "jimeng_seedance",
      name: "即梦-Seedance 2.0",
      description: "字节跳动火山引擎Seedance视频生成",
      use_cases: ["国内稳定", "创意视频"],
      testable: true,
      fields: [
        { key: "api_key", label: "API Key", secret: true, placeholder: "API Key..." },
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
      id: "cosyvoice",
      name: "CosyVoice（本地）",
      description: "阿里开源 TTS，可克隆音色，完全免费",
      testable: false,
      fields: [
        { key: "base_url", label: "服务地址", placeholder: "http://localhost:9880" },
      ],
    },
    {
      id: "qwen3_tts",
      name: "Qwen3-TTS-Instruct-Flash",
      description: "阿里通义 Qwen3 TTS，DashScope API，支持 instruct 控制语气风格",
      use_cases: ["中文语音合成", "角色语气控制", "高质量配音"],
      testable: false,
      fields: [
        { key: "api_key", label: "DashScope API Key", secret: true, placeholder: "sk-..." },
      ],
    },
  ],
};

const CATEGORY_LABELS: Record<string, string> = {
  llm: "文本 / 剧本生成",
  image: "图像生成",
  video: "视频生成",
  tts: "配音 / TTS",
};

export function SettingsPage() {
  const [category, setCategory] = useState("llm");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const { configs, configured, loading, fetch, save, test, clear } = useSettingsStore();
  const [values, setValues] = useState<Record<string, string>>({});
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMsg, setTestMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // 当切换类别时，自动选择已配置的第一个提供商，或第一个提供商
  useEffect(() => {
    const providers = PROVIDERS[category] ?? [];
    const configuredInCategory = providers.filter(p => configured.includes(p.id));
    if (configuredInCategory.length > 0) {
      setSelectedProvider(configuredInCategory[0].id);
    } else if (providers.length > 0) {
      setSelectedProvider(providers[0].id);
    }
  }, [category, configured]);

  // 当切换提供商时，加载其配置数据
  useEffect(() => {
    if (selectedProvider) {
      setValues(configs[selectedProvider] ?? {});
      setTestStatus("idle");
      setTestMsg("");
      setSaved(false);
    }
  }, [selectedProvider, configs]);

  const providers = PROVIDERS[category] ?? [];
  const currentDef = providers.find(p => p.id === selectedProvider);
  const isConfigured = configured.includes(selectedProvider ?? "");

  const setValue = (k: string, v: string) => {
    setValues(prev => ({ ...prev, [k]: v }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedProvider) return;
    setSaving(true);
    try {
      await save(selectedProvider, values);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!selectedProvider || !currentDef?.testable) return;
    setTestStatus("testing");
    setTestMsg("");
    try {
      const result = await test(selectedProvider, values);
      setTestStatus(result.ok ? "ok" : "fail");
      setTestMsg(result.message);
    } catch {
      setTestStatus("fail");
      setTestMsg("请求失败");
    }
  };

  const handleClear = async () => {
    if (!selectedProvider) return;
    await clear(selectedProvider);
    setValues({});
    setTestStatus("idle");
    setSaved(false);
  };

  return (
    <div className="flex h-full flex-col animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[--border-subtle] header-gradient">
        <h1 className="text-lg font-bold gradient-text">AI 接口设置</h1>
        <p className="text-xs text-[--text-muted] mt-0.5">
          配置 AI 接口密钥，所有 Key 加密存储在本地，不会上传
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Category tabs - large clickable cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
            const hasConfig = PROVIDERS[key]?.some(p => configured.includes(p.id));
            return (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-xl px-5 py-5 transition-all duration-200 group cursor-pointer",
                  category === key
                    ? "bg-[#6366f1] text-white border-2 border-[#818cf8] ring-2 ring-[#6366f1]/50"
                    : "bg-[#27272a] text-[--text-secondary] border-2 border-[#3f3f46] hover:border-[--accent] hover:bg-[#323238]"
                )}
              >
                {/* Icon circle */}
                <div className={cn(
                  "size-12 rounded-full flex items-center justify-center mb-3 font-bold text-xl",
                  category === key
                    ? "bg-white/20 text-white"
                    : "bg-[--bg-elevated] text-[--text-muted] group-hover:bg-[--accent-dim] group-hover:text-[--accent-hover]"
                )}>
                  {key === "llm" && "文"}
                  {key === "image" && "图"}
                  {key === "video" && "视"}
                  {key === "tts" && "音"}
                </div>
                <span className="text-sm font-semibold">
                  {label}
                </span>
                {/* Configured badge */}
                {hasConfig && (
                  <div className={cn(
                    "absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    category === key
                      ? "bg-white/20 text-white"
                      : "bg-green-500/20 text-green-400 border border-green-500/30"
                  )}>
                    ✓ 已配
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-sm text-[--text-muted]">加载中...</div>
        ) : (
          <div className="space-y-6">
            {/* Provider selector - horizontal card grid */}
            <div>
              <label className="text-sm font-semibold text-[--text-secondary] mb-3 block">选择提供商</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {providers.map(p => {
                  const isSelected = selectedProvider === p.id;
                  const isConf = configured.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProvider(p.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-4 transition-all duration-200 text-left group cursor-pointer",
                        isSelected
                          ? "bg-[#6366f1]/20 border-2 border-[#6366f1] ring-1 ring-[#6366f1]/30"
                          : "bg-[#18181b] border-2 border-[#3f3f46] hover:border-[#6366f1]/50 hover:bg-[#27272a]"
                      )}
                    >
                      {/* Status icon */}
                      <div className={cn(
                        "size-10 rounded-full flex items-center justify-center shrink-0 font-medium",
                        isSelected
                          ? "bg-[#6366f1] text-white"
                          : isConf
                            ? "bg-green-500/20 text-green-400 border border-green-500/40"
                            : "bg-[--bg-elevated] text-[--text-muted]"
                      )}>
                        {isSelected ? "✓" : isConf ? "✓" : "+"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "text-sm font-semibold truncate",
                          isSelected ? "text-[--accent-hover]" : "text-[--text-secondary]"
                        )}>
                          {p.name}
                        </div>
                        {!isSelected && isConf && (
                          <div className="text-xs text-green-400 mt-0.5">已配置</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
                
            {/* Current provider info + form */}
            {currentDef && (
              <div className="rounded-xl border-2 border-[#3f3f46] bg-[#18181b] overflow-hidden animate-fade-in">
                {/* Provider header */}
                <div className="px-5 py-4 border-b border-[#3f3f46]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{currentDef.name}</span>
                        {isConfigured && (
                          <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded-full">
                            已配置
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[--text-muted] mt-1">{currentDef.description}</div>
                      {currentDef.use_cases && (
                        <div className="text-[11px] text-[#818cf8] mt-1.5">
                          适用：{currentDef.use_cases.join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Config form */}
                <div className="px-5 py-4 space-y-4">
                  {currentDef.fields.map(field => {
                    const currentValue = values[field.key] ?? "";
                    // 如果有预定义选项，使用下拉选择
                    if (field.options && field.options.length > 0) {
                      return (
                        <Select
                          key={field.key}
                          label={field.label}
                          hint={field.hint}
                          options={field.options}
                          value={currentValue || field.options[0]}
                          onChange={v => setValue(field.key, v)}
                        />
                      );
                    }
                    // 密钥字段使用密钥输入框
                    if (field.secret) {
                      return (
                        <SecretInput
                          key={field.key}
                          label={field.label}
                          placeholder={field.placeholder}
                          hint={field.hint}
                          value={currentValue}
                          onChange={e => setValue(field.key, e.target.value)}
                        />
                      );
                    }
                    // 普通字段使用普通输入框
                    return (
                      <Input
                        key={field.key}
                        label={field.label}
                        placeholder={field.placeholder}
                        hint={field.hint}
                        value={currentValue}
                        onChange={e => setValue(field.key, e.target.value)}
                      />
                    );
                  })}

                  {/* Test result */}
                  {testStatus !== "idle" && testMsg && (
                    <div className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-xs",
                      testStatus === "ok"
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : testStatus === "fail"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-[--bg-elevated] text-[--text-muted]"
                    )}>
                      {testStatus === "ok" ? <CheckCircle size={13} /> :
                       testStatus === "fail" ? <XCircle size={13} /> :
                       <Loader2 size={13} className="animate-spin" />}
                      {testMsg}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-5 py-4 border-t border-[#3f3f46] flex items-center justify-between gap-3">
                  {isConfigured && (
                    <Button variant="ghost" onClick={handleClear} className="text-red-400 hover:text-red-400">
                      清除配置
                    </Button>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    {currentDef.testable && (
                      <Button variant="outline" onClick={handleTest} loading={testStatus === "testing"}>
                        测试连接
                      </Button>
                    )}
                    <Button onClick={handleSave} loading={saving}>
                      {saved ? "✓ 已保存" : "保存配置"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Hint: can configure multiple */}
            <div className="text-xs text-[--text-muted] text-center py-2">
              同一类别可以配置多个提供商，在使用时可切换选择
            </div>
          </div>
        )}
      </div>
    </div>
  );
}