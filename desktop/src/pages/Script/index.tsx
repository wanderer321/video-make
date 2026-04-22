import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Wand2,
  ChevronRight,
  Upload,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";

const TABS = [
  { key: "import",    label: "导入剧本",  icon: <Upload size={12} /> },
  { key: "generate",  label: "一键生剧本", icon: <Wand2 size={12} /> },
  { key: "edit",      label: "剧本编辑",  icon: <FileText size={12} /> },
  { key: "breakdown", label: "拆解结果",  icon: <BookOpen size={12} /> },
];

const BACKEND = "http://localhost:17321";

interface BreakdownResult {
  title_suggestion?: string;
  titles?: string[];
  tagline?: string;
  core_conflict?: string;
  theme?: string;
  characters?: Array<{ name: string; gender: string; role: string; appearance: string; personality: string; character_prompt?: string }>;
  worldview?: { era: string; location: string; setting: string };
  episodes?: Array<{ episode_no: number; title: string; summary: string; hook: string; highlight?: string }>;
  key_props?: string[];
  key_scenes?: string[];
}

export function ScriptPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const storeProjectId = useAppStore((s) => s.currentProjectId);
  const storeEpisodeId = useAppStore((s) => s.currentEpisodeId);
  const setCurrentEpisode = useAppStore((s) => s.setCurrentEpisode);
  const projectId = params.get("project") ?? storeProjectId;
  const episodeId = storeEpisodeId;

  // Load first episode if we have a project but no episode
  useEffect(() => {
    if (projectId && !storeEpisodeId) {
      fetch(`${BACKEND}/api/projects/${projectId}/episodes`)
        .then(r => r.json())
        .then((eps: Array<{ id: string }>) => {
          if (Array.isArray(eps) && eps.length > 0) {
            setCurrentEpisode(eps[0].id);
          }
        })
        .catch(() => {});
    }
  }, [projectId, storeEpisodeId, setCurrentEpisode]);

  const [tab, setTab] = useState("import");
  const [rawText, setRawText] = useState("");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("都市");
  const [totalEpisodes, setTotalEpisodes] = useState(12);
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [breakdown, setBreakdown] = useState<BreakdownResult | null>(null);
  const [generatedScript, setGeneratedScript] = useState<Record<string, unknown> | null>(null);
  const [storyboardGenerating, setStoryboardGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleFileUpload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "txt") {
      // Read locally for .txt (fast, no server round-trip)
      const reader = new FileReader();
      reader.onload = (ev) => setRawText(ev.target?.result as string ?? "");
      reader.readAsText(file, "utf-8");
      return;
    }
    // For .docx/.pdf use the server-side parser
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${BACKEND}/api/scripts/upload-text`, { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail ?? "解析失败");
      setRawText(data.text ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "文件解析失败");
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const _consumeStream = async (
    url: string,
    body: Record<string, unknown>,
    onResult: (result: BreakdownResult | Record<string, unknown>) => void,
  ) => {
    setLoading(true);
    setStreamText("");
    setError("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail ?? "请求失败");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") { setLoading(false); return; }
          try {
            const event = JSON.parse(data);
            if (event.chunk) {
              accumulated += event.chunk;
              setStreamText(accumulated.slice(-800));
            }
            if (event.result) {
              onResult(event.result);
              setTab("breakdown");
              setStreamText("");
            }
            if (event.error) setError(event.error);
          } catch {}
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败，请检查后端和 API 配置");
    } finally {
      setLoading(false);
    }
  };

  const handleBreakdown = () => {
    if (!rawText.trim()) { setError("请先导入或粘贴剧本文本"); return; }
    _consumeStream(
      `${BACKEND}/api/scripts/breakdown-stream`,
      { episode_id: episodeId || "placeholder", raw_text: rawText, total_episodes: totalEpisodes, style },
      (r) => setBreakdown(r as unknown as BreakdownResult),
    );
  };

  const handleGenerateFromIdea = () => {
    if (!topic.trim()) { setError("请输入题材/一句话描述"); return; }
    _consumeStream(
      `${BACKEND}/api/scripts/generate-from-idea-stream`,
      { topic, style, total_episodes: totalEpisodes },
      (r) => setGeneratedScript(r as Record<string, unknown>),
    );
  };

  const handleGenerateStoryboard = async () => {
    if (!episodeId) return setError("请先选择集数");
    const result = breakdown ?? generatedScript;
    if (!result) return setError("请先拆解剧本");
    setStoryboardGenerating(true); setError("");
    try {
      const chars = (result as BreakdownResult).characters?.map(c => ({
        name: c.name,
        description: `${c.gender} · ${c.role}，外貌：${c.appearance}，性格：${c.personality}`,
        prompt: c.character_prompt,
      })) ?? [];

      // Fetch scene assets from project to inject into storyboard prompts
      let sceneRefs: Array<{ name: string; description?: string; prompt?: string }> = [];
      if (projectId) {
        try {
          const sr = await fetch(`${BACKEND}/api/assets/project/${projectId}`);
          const allAssets = await sr.json();
          sceneRefs = (Array.isArray(allAssets) ? allAssets : [])
            .filter((a: { type: string }) => a.type === "scene")
            .map((a: { name: string; description?: string; prompt?: string }) => ({
              name: a.name,
              description: a.description,
              prompt: a.prompt,
            }));
        } catch {}
      }

      const r = await fetch(`${BACKEND}/api/scripts/storyboard-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: episodeId,
          episode_outline: JSON.stringify(result),
          style,
          characters: chars.length > 0 ? chars : undefined,
          scenes: sceneRefs.length > 0 ? sceneRefs : undefined,
        }),
      });
      const data = await r.json();
      const shots = data.shots ?? [];

      // Import shots into storyboard
      await fetch(`${BACKEND}/api/boards/from-shots?episode_id=${episodeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shots),
      });

      navigate(`/storyboard?episode=${episodeId}&project=${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setStoryboardGenerating(false);
    }
  };

  const [importingAssets, setImportingAssets] = useState(false);

  const handleImportCharactersAsAssets = async () => {
    const result = breakdown ?? generatedScript;
    if (!projectId || !result) return;
    const characters = (result as BreakdownResult).characters ?? [];
    if (characters.length === 0) return;
    setImportingAssets(true);
    try {
      for (const c of characters) {
        await fetch(`${BACKEND}/api/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            type: "character",
            name: c.name,
            description: `${c.gender} · ${c.role}\n外貌：${c.appearance}\n性格：${c.personality}`,
            prompt: c.character_prompt || c.appearance,
            tags: [c.role, c.gender],
          }),
        });
      }
    } finally {
      setImportingAssets(false);
    }
  };

  const currentResult = breakdown ?? generatedScript;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-subtle]">
        <div>
          <h1 className="text-lg font-bold text-[--text-primary]">剧本工坊</h1>
          <p className="text-xs text-[--text-muted] mt-0.5">导入或生成剧本，AI 自动拆解分集</p>
        </div>
        {currentResult && (
          <div className="flex items-center gap-2">
            {(currentResult as BreakdownResult).characters && (currentResult as BreakdownResult).characters!.length > 0 && projectId && (
              <Button
                onClick={handleImportCharactersAsAssets}
                loading={importingAssets}
                variant="ghost"
                size="sm"
              >
                导入角色到素材库
              </Button>
            )}
            <Button
              onClick={handleGenerateStoryboard}
              loading={storyboardGenerating}
              icon={<LayoutGrid size={14} />}
              variant="outline"
            >
              生成分镜画板
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <Tabs tabs={TABS} active={tab} onChange={setTab} className="mb-5" />

        {error && (
          <div className="mb-4 rounded-md bg-[--error]/10 border border-[--error]/20 px-3 py-2 text-xs text-[--error]">
            {error}
          </div>
        )}

        {/* Live streaming preview */}
        {loading && streamText && (
          <div className="mb-4 rounded-md bg-[--bg-surface] border border-[--accent]/20 px-3 py-2">
            <div className="text-[10px] text-[--accent-hover] mb-1.5 flex items-center gap-1.5">
              <Wand2 size={10} className="animate-pulse" />
              AI 正在思考...
            </div>
            <pre className="text-[10px] text-[--text-muted] font-mono leading-relaxed overflow-hidden max-h-32 whitespace-pre-wrap break-all">{streamText}</pre>
          </div>
        )}

        {/* Import Tab */}
        {tab === "import" && (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={cn(
                "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                "border-[--border] hover:border-[--accent]/50 cursor-pointer"
              )}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className="mx-auto mb-2 text-[--text-muted]" size={28} strokeWidth={1.5} />
              <div className="text-sm text-[--text-secondary] font-medium">拖拽 .txt / .docx / .pdf 到此处</div>
              <div className="text-xs text-[--text-muted] mt-1">或点击选择文件，最大支持 100 万字符</div>
              <input id="file-input" type="file" accept=".txt,.docx,.pdf" className="hidden" onChange={handleFileInput} />
            </div>

            {/* Or paste */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
                或直接粘贴文本
              </label>
              <textarea
                rows={12}
                placeholder="粘贴你的小说或剧本内容..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className={cn(
                  "w-full rounded-md px-3 py-2.5 text-sm resize-y font-mono",
                  "bg-[--bg-elevated] border border-[--border]",
                  "text-[--text-primary] placeholder:text-[--text-muted]",
                  "focus:border-[--accent] transition-colors outline-none"
                )}
              />
            </div>

            {rawText && (
              <div className="flex items-center gap-3 rounded-lg bg-[--bg-surface] border border-[--border] px-4 py-3">
                <div className="text-xs text-[--text-muted]">已导入 {rawText.length.toLocaleString()} 字符</div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[--text-secondary]">共</label>
                  <input
                    type="number"
                    min={1} max={100}
                    value={totalEpisodes}
                    onChange={(e) => setTotalEpisodes(Number(e.target.value))}
                    className="w-16 h-7 rounded bg-[--bg-elevated] border border-[--border] px-2 text-xs text-center text-[--text-primary] outline-none"
                  />
                  <label className="text-xs text-[--text-secondary]">集</label>
                </div>
                <Button onClick={handleBreakdown} loading={loading} icon={<Wand2 size={13} />}>
                  AI 拆解分集
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Generate Tab */}
        {tab === "generate" && (
          <div className="space-y-4 max-w-xl">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">题材 / 一句话创意</label>
              <textarea
                rows={3}
                placeholder="例：穿越到古代成为皇后，凭借现代知识逆天改命，既要斗宫斗又要发展经济..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className={cn(
                  "w-full rounded-md px-3 py-2.5 text-sm resize-none",
                  "bg-[--bg-elevated] border border-[--border]",
                  "text-[--text-primary] placeholder:text-[--text-muted]",
                  "focus:border-[--accent] transition-colors outline-none"
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">风格</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="h-9 rounded-md px-3 text-sm bg-[--bg-elevated] border border-[--border] text-[--text-primary] outline-none"
                >
                  {["都市", "古风", "玄幻", "科幻", "现实", "悬疑", "甜宠", "逆袭"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">总集数</label>
                <input
                  type="number" min={1} max={100} value={totalEpisodes}
                  onChange={(e) => setTotalEpisodes(Number(e.target.value))}
                  className="h-9 rounded-md px-3 text-sm bg-[--bg-elevated] border border-[--border] text-[--text-primary] outline-none"
                />
              </div>
            </div>

            <Button onClick={handleGenerateFromIdea} loading={loading} icon={<Wand2 size={14} />} size="lg" className="w-full">
              {loading ? "AI 正在生成剧本框架..." : "一键生成剧本框架"}
            </Button>
          </div>
        )}

        {/* Edit Tab */}
        {tab === "edit" && (
          <div className="flex flex-col gap-1.5 h-[calc(100vh-220px)]">
            <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">剧本编辑器</label>
            <textarea
              className={cn(
                "flex-1 w-full rounded-md px-4 py-3 text-sm resize-none",
                "bg-[--bg-elevated] border border-[--border]",
                "text-[--text-primary] placeholder:text-[--text-muted] leading-relaxed",
                "focus:border-[--accent] transition-colors font-mono outline-none"
              )}
              placeholder="在此编辑剧本内容..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </div>
        )}

        {/* Breakdown Result Tab */}
        {tab === "breakdown" && (
          <div className="space-y-5">
            {!currentResult ? (
              <div className="text-center py-12 text-[--text-muted]">
                <BookOpen size={32} className="mx-auto mb-2" strokeWidth={1.5} />
                <div className="text-sm">还没有拆解结果，请先导入剧本或生成剧本框架</div>
              </div>
            ) : (
              <>
                {/* Title/Tagline */}
                {((currentResult as BreakdownResult).title_suggestion || (currentResult as BreakdownResult).titles || (currentResult as BreakdownResult).tagline || (currentResult as BreakdownResult).core_conflict) && (
                  <section className="rounded-lg bg-[--accent-dim] border border-[--accent]/20 px-4 py-3 space-y-1.5">
                    {(currentResult as BreakdownResult).titles && (
                      <div className="flex flex-wrap gap-1.5">
                        {(currentResult as BreakdownResult).titles!.map((t, i) => (
                          <span key={i} className="text-sm font-semibold text-[--accent-hover] bg-[--accent]/10 border border-[--accent]/20 px-2.5 py-1 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}
                    {(currentResult as BreakdownResult).title_suggestion && (
                      <div className="text-sm font-semibold text-[--accent-hover]">{(currentResult as BreakdownResult).title_suggestion}</div>
                    )}
                    {(currentResult as BreakdownResult).tagline && (
                      <div className="text-xs text-[--text-secondary] italic">{(currentResult as BreakdownResult).tagline}</div>
                    )}
                    {(currentResult as BreakdownResult).core_conflict && (
                      <div className="text-xs text-[--text-muted]">核心矛盾：{(currentResult as BreakdownResult).core_conflict}</div>
                    )}
                  </section>
                )}

                {/* Characters */}
                {(currentResult as BreakdownResult).characters && (
                  <section>
                    <h3 className="text-sm font-semibold text-[--text-primary] mb-3 flex items-center gap-2">
                      <span className="size-5 rounded bg-[--accent-dim] text-[--accent-hover] flex items-center justify-center text-xs">人</span>
                      角色列表
                    </h3>
                    <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
                      {(currentResult as BreakdownResult).characters!.map((c, i) => (
                        <div key={i} className="rounded-lg bg-[--bg-surface] border border-[--border] px-4 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-[--text-primary] text-sm">{c.name}</span>
                            <span className="text-xs text-[--text-muted] bg-[--bg-elevated] px-1.5 py-0.5 rounded">{c.gender} · {c.role}</span>
                          </div>
                          {c.appearance && <div className="text-xs text-[--text-secondary] mb-0.5">外貌：{c.appearance}</div>}
                          {c.personality && <div className="text-xs text-[--text-muted]">性格：{c.personality}</div>}
                          {c.character_prompt && (
                            <div className="mt-1.5 text-[10px] text-[--text-muted] font-mono bg-[--bg-elevated] px-2 py-1 rounded leading-relaxed line-clamp-2" title={c.character_prompt}>
                              {c.character_prompt}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Worldview */}
                {(currentResult as BreakdownResult).worldview && (
                  <section>
                    <h3 className="text-sm font-semibold text-[--text-primary] mb-3 flex items-center gap-2">
                      <span className="size-5 rounded bg-[--accent-dim] text-[--accent-hover] flex items-center justify-center text-xs">界</span>
                      世界观设定
                    </h3>
                    <div className="rounded-lg bg-[--bg-surface] border border-[--border] px-4 py-3 text-sm text-[--text-secondary] space-y-1">
                      <div><span className="text-[--text-muted]">时代：</span>{(currentResult as BreakdownResult).worldview!.era}</div>
                      <div><span className="text-[--text-muted]">地点：</span>{(currentResult as BreakdownResult).worldview!.location}</div>
                      <div><span className="text-[--text-muted]">背景：</span>{(currentResult as BreakdownResult).worldview!.setting}</div>
                    </div>
                  </section>
                )}

                {/* Episodes */}
                {(currentResult as BreakdownResult).episodes && (
                  <section>
                    <h3 className="text-sm font-semibold text-[--text-primary] mb-3 flex items-center gap-2">
                      <span className="size-5 rounded bg-[--accent-dim] text-[--accent-hover] flex items-center justify-center text-xs">集</span>
                      分集梗概
                    </h3>
                    <div className="space-y-2">
                      {(currentResult as BreakdownResult).episodes!.map((ep) => (
                        <div key={ep.episode_no} className="rounded-lg bg-[--bg-surface] border border-[--border] px-4 py-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-mono text-[--accent-hover] bg-[--accent-dim] px-1.5 py-0.5 rounded">E{ep.episode_no}</span>
                            <span className="font-medium text-[--text-primary] text-sm">{ep.title}</span>
                          </div>
                          <div className="text-xs text-[--text-secondary] leading-relaxed">{ep.summary}</div>
                          {ep.highlight && (
                            <div className="mt-1.5 text-xs text-[--success] flex items-center gap-1">
                              <ChevronRight size={11} />
                              爽点：{ep.highlight}
                            </div>
                          )}
                          {ep.hook && (
                            <div className="mt-1 text-xs text-[--warning] flex items-center gap-1">
                              <ChevronRight size={11} />
                              钩子：{ep.hook}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Call to action */}
                <div className="pt-2 border-t border-[--border-subtle] flex justify-end">
                  <Button
                    onClick={handleGenerateStoryboard}
                    loading={storyboardGenerating}
                    icon={<LayoutGrid size={14} />}
                  >
                    {storyboardGenerating ? "生成分镜中..." : "一键生成分镜画板"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
