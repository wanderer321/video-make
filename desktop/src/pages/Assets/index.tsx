import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Image, User, MapPin, Package, Wand2, Trash2, RefreshCw, Upload, Mic } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";

const BACKEND = "http://localhost:17321";

const EDGE_VOICES = [
  { id: "zh-CN-XiaoxiaoNeural", name: "晓晓 (女/普通话)" },
  { id: "zh-CN-YunxiNeural",    name: "云希 (男/普通话)" },
  { id: "zh-CN-XiaohanNeural",  name: "晓涵 (女/普通话)" },
  { id: "zh-CN-YunjianNeural",  name: "云健 (男/普通话)" },
  { id: "zh-CN-XiaoyiNeural",   name: "晓伊 (女/普通话)" },
  { id: "zh-TW-HsiaoChenNeural","name": "晓臻 (女/台湾)" },
  { id: "en-US-JennyNeural",    name: "Jenny (女/英语)" },
  { id: "en-US-GuyNeural",      name: "Guy (男/英语)" },
  { id: "ja-JP-NanamiNeural",   name: "七海 (女/日语)" },
];

interface TtsConfig {
  voice?: string;
  provider?: string;
  speed?: number;
}

interface Asset {
  id: string;
  type: string;
  name: string;
  description?: string;
  prompt?: string;
  tags?: string[];
  has_image: boolean;
  tts_config?: TtsConfig;
  variant_count: number;
}

const ASSET_TABS = [
  { key: "character", label: "角色", icon: <User size={12} /> },
  { key: "scene",     label: "场景", icon: <MapPin size={12} /> },
  { key: "prop",      label: "道具", icon: <Package size={12} /> },
];

function AssetCard({ asset, onDelete, onGenerate, onRegenerate, onUpload, onVoiceConfig }: {
  asset: Asset;
  onDelete: () => void;
  onGenerate: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  onVoiceConfig?: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [imgKey, setImgKey] = useState(0);
  const uploadRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerate();
      setImgKey(k => k + 1);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegen = async () => {
    setGenerating(true);
    try {
      await onRegenerate();
      setImgKey(k => k + 1);
    } finally {
      setGenerating(false);
    }
  };

  const handleUpload = async (file: File) => {
    setGenerating(true);
    try {
      await onUpload(file);
      setImgKey(k => k + 1);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="group rounded-xl border border-[--border] bg-[--bg-surface] overflow-hidden hover:border-[--accent]/40 transition-all">
      {/* Image area */}
      <div
        className="h-44 flex items-center justify-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--bg-elevated), var(--bg-hover))" }}
      >
        {asset.has_image ? (
          <img
            key={imgKey}
            src={`${BACKEND}/api/assets/${asset.id}/image?t=${imgKey}`}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Image size={32} className="text-[--text-muted]" strokeWidth={1.5} />
        )}

        {/* Hidden file input */}
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
        />

        {/* Overlay actions */}
        <div className="absolute inset-0 bg-[--bg-base]/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 flex-wrap p-2">
          {!asset.has_image ? (
            <button
              onClick={handleGenerate}
              disabled={generating || !asset.prompt}
              className="rounded-md bg-[--accent] text-white px-2.5 py-1.5 text-xs flex items-center gap-1.5 hover:bg-[--accent-hover] disabled:opacity-50 transition-colors"
            >
              {generating ? <Wand2 size={12} className="animate-pulse" /> : <Wand2 size={12} />}
              {generating ? "生成中..." : "AI 生成"}
            </button>
          ) : (
            <button
              onClick={handleRegen}
              disabled={generating}
              className="rounded-md bg-[--bg-elevated]/90 text-[--text-secondary] px-2 py-1.5 text-xs flex items-center gap-1 hover:bg-[--accent] hover:text-white disabled:opacity-50 transition-colors border border-[--border]"
            >
              <RefreshCw size={11} className={generating ? "animate-spin" : ""} />
              重新生成
            </button>
          )}
          <button
            onClick={() => uploadRef.current?.click()}
            disabled={generating}
            className="rounded-md bg-[--bg-elevated]/90 text-[--text-secondary] px-2 py-1.5 text-xs flex items-center gap-1 hover:bg-[--success] hover:text-white disabled:opacity-50 transition-colors border border-[--border]"
          >
            <Upload size={11} />
            上传图片
          </button>
          {onVoiceConfig && (
            <button
              onClick={onVoiceConfig}
              className="rounded-md bg-[--bg-elevated]/90 text-[--text-secondary] px-2 py-1.5 text-xs flex items-center gap-1 hover:bg-[--accent] hover:text-white transition-colors border border-[--border]"
            >
              <Mic size={11} />
              配音设置
            </button>
          )}
          <button
            onClick={onDelete}
            className="rounded-md bg-[--error]/80 text-white p-1.5 hover:bg-[--error] transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Status badges */}
        <div className="absolute top-2 right-2 flex gap-1">
          {asset.has_image && (
            <span className="text-[9px] bg-[--success]/20 text-[--success] border border-[--success]/30 px-1.5 py-0.5 rounded-full">
              已生图
            </span>
          )}
          {asset.tts_config?.voice && (
            <span className="text-[9px] bg-[--accent-dim] text-[--accent-hover] border border-[--accent]/20 px-1.5 py-0.5 rounded-full">
              已配音
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="font-medium text-[--text-primary] text-sm mb-1">{asset.name}</div>
        {asset.description && (
          <div className="text-xs text-[--text-muted] line-clamp-2 leading-relaxed">{asset.description}</div>
        )}
        {asset.tts_config?.voice && (
          <div className="text-[10px] text-[--accent-hover] mt-1 flex items-center gap-1">
            <Mic size={9} />
            {EDGE_VOICES.find(v => v.id === asset.tts_config?.voice)?.name ?? asset.tts_config.voice}
          </div>
        )}
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {asset.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="default" className="text-[10px] px-1.5 py-0">{tag}</Badge>
            ))}
            {asset.tags.length > 3 && (
              <span className="text-[10px] text-[--text-muted]">+{asset.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface CreateAssetForm {
  name: string;
  description: string;
  prompt: string;
  tags: string;
}

export function AssetsPage() {
  const [params] = useSearchParams();
  const storeProjectId = useAppStore((s) => s.currentProjectId);
  const projectId = params.get("project") ?? storeProjectId ?? "";

  const [assets, setAssets] = useState<Asset[]>([]);
  const [tab, setTab] = useState("character");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateAssetForm>({ name: "", description: "", prompt: "", tags: "" });
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voiceAsset, setVoiceAsset] = useState<Asset | null>(null);
  const [voiceDraft, setVoiceDraft] = useState<TtsConfig>({});
  const [savingVoice, setSavingVoice] = useState(false);

  const loadAssets = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/assets/project/${projectId}`);
      setAssets(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAssets(); }, [projectId]);

  const filtered = assets.filter((a) => a.type === tab);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await fetch(`${BACKEND}/api/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          type: tab,
          name: form.name,
          description: form.description || undefined,
          prompt: form.prompt || undefined,
          tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        }),
      });
      await loadAssets();
      setCreateOpen(false);
      setForm({ name: "", description: "", prompt: "", tags: "" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`${BACKEND}/api/assets/${id}`, { method: "DELETE" });
    setAssets(assets.filter((a) => a.id !== id));
  };

  const handleGenerate = async (asset: Asset) => {
    await fetch(`${BACKEND}/api/assets/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset_id: asset.id, provider: "auto" }),
    });
    await loadAssets();
  };

  const handleSaveVoice = async () => {
    if (!voiceAsset) return;
    setSavingVoice(true);
    try {
      await fetch(`${BACKEND}/api/assets/${voiceAsset.id}/tts-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(voiceDraft),
      });
      await loadAssets();
      setVoiceAsset(null);
    } finally {
      setSavingVoice(false);
    }
  };

  const handleUploadImage = async (asset: Asset, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`${BACKEND}/api/assets/${asset.id}/upload-image`, {
      method: "POST",
      body: fd,
    });
    await loadAssets();
  };

  const typeLabel = ASSET_TABS.find((t) => t.key === tab)?.label ?? tab;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-subtle]">
        <div>
          <h1 className="text-lg font-bold text-[--text-primary]">资产库</h1>
          <p className="text-xs text-[--text-muted] mt-0.5">
            管理角色、场景、道具资产
            {filtered.length > 0 && ` · ${filtered.length} 个${typeLabel}`}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>
          新建{typeLabel}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <Tabs tabs={ASSET_TABS} active={tab} onChange={setTab} className="mb-5" />

        {!projectId ? (
          <div className="text-center py-12 text-sm text-[--text-muted]">请先从项目页面进入</div>
        ) : loading ? (
          <div className="text-center py-12 text-sm text-[--text-muted]">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Image size={36} className="text-[--text-muted]" strokeWidth={1.5} />
            <div className="text-sm text-[--text-secondary]">还没有{typeLabel}资产</div>
            <Button variant="outline" onClick={() => setCreateOpen(true)} icon={<Plus size={13} />}>
              新建{typeLabel}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {filtered.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDelete={() => handleDelete(asset.id)}
                onGenerate={() => handleGenerate(asset)}
                onRegenerate={() => handleGenerate(asset)}
                onUpload={(file) => handleUploadImage(asset, file)}
                onVoiceConfig={asset.type === "character" ? () => { setVoiceAsset(asset); setVoiceDraft(asset.tts_config ?? {}); } : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Voice config modal */}
      <Modal
        open={!!voiceAsset}
        onClose={() => setVoiceAsset(null)}
        title={`配音设置 · ${voiceAsset?.name}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setVoiceAsset(null)}>取消</Button>
            <Button onClick={handleSaveVoice} loading={savingVoice} icon={<Mic size={13} />}>保存</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">TTS 服务</label>
            <select
              value={voiceDraft.provider ?? "edge_tts"}
              onChange={e => setVoiceDraft(d => ({ ...d, provider: e.target.value }))}
              className="h-9 rounded-md px-3 text-sm bg-[--bg-elevated] border border-[--border] text-[--text-primary] outline-none"
            >
              <option value="edge_tts">Edge TTS（免费）</option>
              <option value="elevenlabs">ElevenLabs</option>
              <option value="fish_audio">Fish Audio</option>
              <option value="azure_tts">Azure TTS</option>
              <option value="cosyvoice">CosyVoice（本地）</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">音色</label>
            {(!voiceDraft.provider || voiceDraft.provider === "edge_tts") ? (
              <select
                value={voiceDraft.voice ?? "zh-CN-XiaoxiaoNeural"}
                onChange={e => setVoiceDraft(d => ({ ...d, voice: e.target.value }))}
                className="h-9 rounded-md px-3 text-sm bg-[--bg-elevated] border border-[--border] text-[--text-primary] outline-none"
              >
                {EDGE_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            ) : (
              <input
                type="text"
                value={voiceDraft.voice ?? ""}
                onChange={e => setVoiceDraft(d => ({ ...d, voice: e.target.value }))}
                placeholder="音色 ID / Voice ID"
                className="h-9 rounded-md px-3 text-sm bg-[--bg-elevated] border border-[--border] text-[--text-primary] outline-none"
              />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary]">语速 ({voiceDraft.speed ?? 1.0}×)</label>
            <input
              type="range" min="0.5" max="2.0" step="0.1"
              value={voiceDraft.speed ?? 1.0}
              onChange={e => setVoiceDraft(d => ({ ...d, speed: Number(e.target.value) }))}
              className="w-full"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={`新建${typeLabel}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} loading={creating} disabled={!form.name.trim()}>创建</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="名称"
            placeholder={tab === "character" ? "角色名，如：凌霄" : tab === "scene" ? "场景名，如：皇宫大殿" : "道具名，如：玄铁剑"}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="描述"
            placeholder="简要描述..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">图像生成提示词</label>
            <textarea
              rows={3}
              placeholder={
                tab === "character"
                  ? "外观描述，如：年轻男子，黑发，红色汉服，英俊，高挑..."
                  : tab === "scene"
                  ? "场景描述，如：古风宫殿内部，红柱金匾，华丽大殿..."
                  : "道具描述，如：古代长剑，黑色剑鞘，刃上有龙纹..."
              }
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              className={cn(
                "w-full rounded-md px-3 py-2 text-sm resize-none",
                "bg-[--bg-elevated] border border-[--border]",
                "text-[--text-primary] placeholder:text-[--text-muted]",
                "focus:border-[--accent] transition-colors outline-none"
              )}
            />
          </div>
          <Input
            label="标签（逗号分隔）"
            placeholder="古装, 女主, 灵气飘渺"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
