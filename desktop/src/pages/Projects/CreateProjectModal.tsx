import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn, DRAMA_TYPES, ASPECT_RATIOS } from "@/lib/utils";
import { useProjectStore } from "@/stores/useProjectStore";
import { useAppStore } from "@/stores/useAppStore";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Film,
  Settings2,
  CheckCircle,
  AlertTriangle,
  Monitor,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const STYLE_PRESETS = [
  { key: "古风玄幻", desc: "仙侠、修真、古代背景", emoji: "⚔️" },
  { key: "都市甜宠", desc: "现代都市、恋爱、职场", emoji: "🏙️" },
  { key: "逆袭爽剧", desc: "废柴逆袭、打脸、复仇", emoji: "🔥" },
  { key: "悬疑推理", desc: "探案、推理、反转", emoji: "🔍" },
  { key: "科幻末世", desc: "未来科技、末日、太空", emoji: "🚀" },
  { key: "历史权谋", desc: "宫廷斗争、权谋、战争", emoji: "👑" },
  { key: "青春校园", desc: "校园、友情、成长", emoji: "🎓" },
  { key: "灵异惊悚", desc: "鬼怪、恐怖、超自然", emoji: "👻" },
];

const STEP_CONFIG = [
  { key: "type", label: "剧目类型", icon: Film },
  { key: "aspect", label: "画面比例", icon: Monitor },
  { key: "style", label: "风格设定", icon: Sparkles },
  { key: "config", label: "剧集配置", icon: Settings2 },
  { key: "review", label: "确认创建", icon: CheckCircle },
];

const TYPE_GRADIENTS: Record<string, string> = {
  domestic_live: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
  overseas_live: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
  anime_2d: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
  anime_3d: "linear-gradient(135deg, #06b6d4 0%, #10b981 100%)",
};

export function CreateProjectModal({ open, onClose }: Props) {
  const create = useProjectStore((s) => s.create);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [type, setType] = useState("domestic_live");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [style, setStyle] = useState("");
  const [reference, setReference] = useState("");
  const [totalEpisodes, setTotalEpisodes] = useState(12);
  const [episodeDuration, setEpisodeDuration] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setName("");
    setType("domestic_live");
    setAspectRatio("9:16");
    setStyle("");
    setReference("");
    setTotalEpisodes(12);
    setEpisodeDuration(3);
    setStep(0);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("请输入项目名称");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const project = await create({
        name: name.trim(),
        type,
        style: style || undefined,
        description: reference ? `参考作品：${reference}` : undefined,
      });
      // Store drama type and aspect ratio
      useAppStore.getState().setCurrentProject(project.id, name.trim());
      useAppStore.getState().setDramaType(type);
      useAppStore.getState().setAspectRatio(aspectRatio);
      useAppStore.getState().setWorkflowStep(1); // Start at script creation
      handleClose();
      navigate(`/script?project=${project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    switch (step) {
      case 0: return true;
      case 1: return true;
      case 2: return true;
      case 3: return name.trim().length > 0;
      default: return true;
    }
  };

  const nextStep = () => { if (canNext() && step < STEP_CONFIG.length - 1) setStep(s => s + 1); };
  const prevStep = () => { if (step > 0) setStep(s => s - 1); };

  const renderStep = () => {
    switch (step) {
      case 0: // Drama type
        return (
          <div className="space-y-4 animate-fade-in">
            <p className="text-sm text-[--text-muted]">选择剧目类型，这将决定 AI 生成的视觉风格和推荐的平台</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(DRAMA_TYPES).map(([key, info]) => {
                const selected = type === key;
                return (
                  <button
                    key={key}
                    onClick={() => setType(key)}
                    className={cn(
                      "flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 hover-lift",
                      selected
                        ? "border-[--accent] bg-[--accent-dim]/40 shadow-lg shadow-[--accent]/10"
                        : "border-[--border] hover:border-[--text-muted]/40 hover:bg-[--bg-hover]"
                    )}
                  >
                    <div
                      className="flex size-12 items-center justify-center rounded-lg text-2xl shrink-0"
                      style={{ background: TYPE_GRADIENTS[key] }}
                    >
                      {info.icon}
                    </div>
                    <div>
                      <div className={cn("font-semibold text-sm", selected ? "text-[--accent-hover]" : "text-[--text-primary]")}>
                        {info.label}
                      </div>
                      <div className="text-[11px] text-[--text-muted] mt-0.5">{info.desc}</div>
                    </div>
                    {selected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[--accent] flex items-center justify-center">
                        <CheckCircle size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 1: // Aspect ratio
        return (
          <div className="space-y-4 animate-fade-in">
            {/* Warning banner */}
            <div className="flex items-start gap-2.5 rounded-lg border border-[--warning]/30 bg-[--warning]/10 px-3 py-2.5">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[--warning]" />
              <div className="text-xs text-[--text-secondary]">
                <span className="font-medium text-[--warning]">注意：</span>
                画面比例创建后<span className="font-medium text-[--text-primary]">不支持修改</span>，请根据目标发布平台谨慎选择
              </div>
            </div>

            <p className="text-sm text-[--text-muted]">选择画面比例，这将决定最终导出视频的尺寸</p>

            <div className="grid gap-3">
              {ASPECT_RATIOS.map((ratio) => {
                const selected = aspectRatio === ratio.key;
                return (
                  <button
                    key={ratio.key}
                    onClick={() => setAspectRatio(ratio.key)}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200 hover-lift",
                      selected
                        ? "border-[--accent] bg-[--accent-dim]/40 shadow-lg shadow-[--accent]/10"
                        : "border-[--border] hover:border-[--text-muted]/40 hover:bg-[--bg-hover]"
                    )}
                  >
                    {/* Visual preview */}
                    <div className={cn(
                      "flex items-center justify-center rounded-lg border-2 transition-all duration-200",
                      selected ? "border-[--accent] bg-[--accent-dim]/30" : "border-[--border-subtle] bg-[--bg-elevated]"
                    )}>
                      <div className={cn("border-2 border-dashed rounded transition-all duration-200", selected ? "border-[--accent]/60" : "border-[--text-muted]/30", ratio.twClass)} />
                    </div>
                    <div className="flex-1">
                      <div className={cn("font-semibold text-sm", selected ? "text-[--accent-hover]" : "text-[--text-primary]")}>
                        {ratio.label}
                      </div>
                      <div className="text-[11px] text-[--text-muted] mt-0.5">{ratio.desc}</div>
                    </div>
                    {selected && (
                      <CheckCircle size={18} className="text-[--accent-hover] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 2: // Style
        return (
          <div className="space-y-4 animate-fade-in">
            <p className="text-sm text-[--text-muted]">选择故事风格，AI 将根据风格调整角色和场景设定</p>
            <div className="grid grid-cols-2 gap-2.5">
              {STYLE_PRESETS.map((preset) => {
                const selected = style === preset.key;
                return (
                  <button
                    key={preset.key}
                    onClick={() => setStyle(style === preset.key ? "" : preset.key)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all duration-200",
                      selected
                        ? "border-[--accent] bg-[--accent-dim]/40"
                        : "border-[--border] hover:border-[--text-muted]/40"
                    )}
                  >
                    <span className="text-lg leading-none mt-0.5">{preset.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[--text-primary] text-sm">{preset.key}</div>
                      <div className="text-[10px] text-[--text-muted] mt-0.5">{preset.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-1.5 pt-2">
              <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
                参考作品（可选）
              </label>
              <Input
                placeholder='例："参考《庆余年》的权谋风格"'
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>
        );

      case 3: // Configuration
        return (
          <div className="space-y-5 animate-fade-in">
            <Input
              label="项目名称"
              placeholder="例：气运三角洲"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={error}
              autoFocus
            />

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
                总集数
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={80}
                  value={totalEpisodes}
                  onChange={(e) => setTotalEpisodes(Number(e.target.value))}
                  className="flex-1 accent-[--accent]"
                />
                <span className="text-sm font-mono font-bold text-[--accent-hover] w-12 text-center">
                  {totalEpisodes}
                </span>
                <span className="text-xs text-[--text-muted]">集</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
                每集时长
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 5].map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setEpisodeDuration(dur)}
                    className={cn(
                      "rounded-lg border py-2.5 text-sm font-medium transition-all",
                      episodeDuration === dur
                        ? "border-[--accent] bg-[--accent-dim] text-[--accent-hover]"
                        : "border-[--border] text-[--text-secondary] hover:border-[--text-muted]"
                    )}
                  >
                    {dur} 分钟
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-[--bg-elevated] border border-[--border] p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[--text-muted]">预计总时长</span>
                <span className="font-bold text-[--accent-hover]">{(totalEpisodes * episodeDuration).toLocaleString()} 分钟</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[--text-muted]">类型</span>
                <span className="text-[--text-primary]">{DRAMA_TYPES[type]?.label}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[--text-muted]">画面比例</span>
                <span className="text-[--text-primary]">{aspectRatio}</span>
              </div>
            </div>
          </div>
        );

      case 4: // Review
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-xl bg-[--accent-dim]/30 border border-[--accent]/20 p-4 space-y-3">
              <h3 className="text-base font-bold text-[--text-primary]">{name || "未命名项目"}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[10px] text-[--text-muted] uppercase">类型</div>
                  <div className="font-medium text-[--text-primary]">{DRAMA_TYPES[type]?.label}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[--text-muted] uppercase">画面比例</div>
                  <div className="font-medium text-[--text-primary]">{aspectRatio}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[--text-muted] uppercase">风格</div>
                  <div className="font-medium text-[--text-primary]">{style || "未选择"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[--text-muted] uppercase">集数</div>
                  <div className="font-medium text-[--text-primary]">{totalEpisodes} 集</div>
                </div>
                <div>
                  <div className="text-[10px] text-[--text-muted] uppercase">每集时长</div>
                  <div className="font-medium text-[--text-primary]">{episodeDuration} 分钟</div>
                </div>
                <div>
                  <div className="text-[10px] text-[--text-muted] uppercase">预计总时长</div>
                  <div className="font-bold text-[--accent-hover]">{(totalEpisodes * episodeDuration).toLocaleString()} 分钟</div>
                </div>
              </div>
              {reference && (
                <div className="pt-2 border-t border-[--accent]/10">
                  <div className="text-[10px] text-[--text-muted] uppercase">参考作品</div>
                  <div className="font-medium text-[--text-secondary] text-sm">{reference}</div>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-[--error]/10 border border-[--error]/20 px-3 py-2 text-xs text-[--error]">
                {error}
              </div>
            )}

            <p className="text-xs text-[--text-muted] text-center">
              创建后将进入剧本工坊，开始 AI 创作之旅
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const currentStep = STEP_CONFIG[step];
  const StepIcon = currentStep?.icon;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          {StepIcon && <StepIcon size={16} className="text-[--accent-hover]" />}
          <span>{currentStep?.label}</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1">
            {STEP_CONFIG.map((s, i) => (
              <div
                key={s.key}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step
                    ? "w-6 bg-[--accent]"
                    : i < step
                    ? "w-3 bg-[--accent]/40"
                    : "w-3 bg-[--border]"
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" onClick={prevStep} icon={<ChevronLeft size={14} />}>
                上一步
              </Button>
            )}
            {step < STEP_CONFIG.length - 1 ? (
              <Button onClick={nextStep} disabled={!canNext()}>
                下一步
                <ChevronRight size={14} />
              </Button>
            ) : (
              <Button onClick={handleCreate} loading={loading} icon={<CheckCircle size={14} />}>
                创建项目
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="min-h-[340px]">
        {renderStep()}
      </div>
    </Modal>
  );
}
