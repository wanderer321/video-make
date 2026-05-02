import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Wand2,
  Upload,
  LayoutGrid,
  Grid3x3,
  Settings,
  ArrowRight,
  Image,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, LLM_PROVIDERS } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";

const BACKEND = "http://localhost:17322";

interface KeyShot {
  scene: string;
  characters?: string[];
  action?: string;
  mood?: string;
  prompt_en: string;
}

interface BreakdownResult {
  title_suggestion?: string;
  titles?: string[];
  tagline?: string;
  core_conflict?: string;
  theme?: string;
  characters?: Array<{
    name: string;
    gender?: string;
    age?: string;
    role: string;
    appearance: string;
    personality: string;
    arc?: string;
    character_prompt?: string;
  }>;
  worldview?: { era: string; location: string; setting: string; rules?: string };
  episodes?: Array<{
    episode_no: number;
    title: string;
    summary: string;
    hook: string;
    highlight?: string;
    emotion?: string;
    key_shots?: KeyShot[];
  }>;
  key_props?: string[];
  key_scenes?: string[];
  relationships?: string[];
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

  const [rawText, setRawText] = useState("");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("都市");
  const [totalEpisodes, setTotalEpisodes] = useState(12);
  const [llmProvider, setLlmProvider] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [breakdown, setBreakdown] = useState<BreakdownResult | null>(null);
  const [generatedScript, setGeneratedScript] = useState<Record<string, unknown> | null>(null);
  const [storyboardGenerating, setStoryboardGenerating] = useState(false);
  const [error, setError] = useState("");
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [showGeneratePanel, setShowGeneratePanel] = useState(false);
  const [breakdownLlmProvider, setBreakdownLlmProvider] = useState("auto");
  const [isResultExpanded, setIsResultExpanded] = useState(false);

  // Check configured API providers and set default LLM
  useEffect(() => {
    fetch(`${BACKEND}/api/settings/configured`)
      .then(r => r.json())
      .then((data: { configured: string[] }) => {
        const providers = data.configured ?? [];
        setConfiguredProviders(providers);
        // Set default LLM to first configured provider if exists
        const llmKeys = Object.keys(LLM_PROVIDERS);
        const firstConfiguredLlm = llmKeys.find(k => providers.includes(k));
        if (firstConfiguredLlm) {
          setLlmProvider(firstConfiguredLlm);
          setBreakdownLlmProvider(firstConfiguredLlm);
        }
      })
      .catch(() => {});
  }, []);

  // Load project and episode data when entering the page
  useEffect(() => {
    const pid = params.get("project") || storeProjectId;
    if (!pid) return;

    fetch(`${BACKEND}/api/projects/${pid}`)
      .then(r => r.json())
      .then((project: { breakdown_result?: Record<string, unknown>; workflow_step?: number; episodes?: Array<{ id: string; episode_no: number; title: string; script_content?: string }> }) => {
        if (project.breakdown_result) {
          setBreakdown(project.breakdown_result as unknown as BreakdownResult);
          setIsResultExpanded(true);
        }
        if (project.workflow_step) {
          useAppStore.getState().setWorkflowStep(project.workflow_step);
        }
        // Restore script content - use current episode if available, else first episode
        if (project.episodes && project.episodes.length > 0) {
          // Find the episode matching current episodeId, or fall back to first
          const targetEp = storeEpisodeId
            ? project.episodes.find(ep => ep.id === storeEpisodeId)
            : project.episodes[0];
          if (targetEp?.script_content) {
            setRawText(targetEp.script_content);
          }
          // If no episodeId set, set it to first episode
          if (!storeEpisodeId && project.episodes[0]?.id) {
            setCurrentEpisode(project.episodes[0].id);
          }
        } else if (project.breakdown_result) {
          // No episodes yet but breakdown_result exists — fill editor from it
          setRawText(JSON.stringify(project.breakdown_result, null, 2));
        }
      })
      .catch(() => {});
  }, [params, storeProjectId, storeEpisodeId, setCurrentEpisode]);

  // Auto-save script content when rawText changes (debounced)
  useEffect(() => {
    if (!projectId || !episodeId || !rawText) return;
    const timer = setTimeout(() => {
      fetch(`${BACKEND}/api/projects/${projectId}/episodes/${episodeId}/script`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script_content: rawText }),
      }).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [projectId, episodeId, rawText]);

  const needsApiSetup = configuredProviders.length === 0;

  const handleFileUpload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "txt") {
      const reader = new FileReader();
      reader.onload = (ev) => setRawText(ev.target?.result as string ?? "");
      reader.readAsText(file, "utf-8");
      return;
    }
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
    if (rawText.trim().length < 100) { setError("剧本内容太少，请至少输入100字以上的剧本文本"); return; }
    if (breakdownLlmProvider !== "auto" && !configuredProviders.includes(breakdownLlmProvider)) {
      setError("所选模型未配置，请先在设置页面配置该模型"); return;
    }
    if (breakdownLlmProvider === "auto" && configuredProviders.length === 0) {
      setError("没有已配置的模型，请先在设置页面配置至少一个模型"); return;
    }
    _consumeStream(
      `${BACKEND}/api/scripts/breakdown-stream`,
      { episode_id: episodeId || "placeholder", project_id: projectId, raw_text: rawText, total_episodes: totalEpisodes, style, llm_provider: breakdownLlmProvider },
      (r) => { setBreakdown(r as unknown as BreakdownResult); setIsResultExpanded(true); },
    );
  };

  const handleGenerateFromIdea = () => {
    if (!topic.trim()) { setError("请输入题材/一句话描述"); return; }
    _consumeStream(
      `${BACKEND}/api/scripts/generate-from-idea-stream`,
      { topic, style, total_episodes: totalEpisodes, llm_provider: llmProvider },
      (r) => {
        setGeneratedScript(r as Record<string, unknown>);
        setRawText(JSON.stringify(r, null, 2));
        // Persist to project breakdown_result so it survives page refresh
        if (projectId) {
          fetch(`${BACKEND}/api/projects/${projectId}/breakdown-result`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ breakdown_result: r }),
          }).catch(() => {});
        }
      },
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


  const currentResult = breakdown ?? generatedScript;

  return (
    <div className="flex h-full flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-subtle] bg-[--bg-surface] header-gradient">
        <div>
          <h1 className="text-lg font-bold gradient-text">剧本工坊</h1>
          <p className="text-xs text-[--text-muted] mt-0.5">导入或生成剧本，AI 自动拆解分集</p>
        </div>
        <div className="flex items-center gap-2">
          {needsApiSetup && (
            <Badge variant="warning" className="text-xs flex items-center gap-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              <Settings size={12} />
              需配置 AI 接口
            </Badge>
          )}
          {currentResult && (
            <>
              {breakdown ? (
                <Button onClick={() => navigate(`/assets?project=${projectId}`)} icon={<Image size={14} />}>
                  进入资产准备
                  <ArrowRight size={14} className="ml-1" />
                </Button>
              ) : (
                <Button onClick={handleGenerateStoryboard} loading={storyboardGenerating} icon={<LayoutGrid size={14} />} variant="outline">
                  生成分镜画板
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex px-6 py-5">
        {/* Left: Script Editor + AI Generate - shrinks 20% when result expanded */}
        <div className={cn(
          "flex flex-col gap-4 min-w-0 pr-4 border-r-2 border-[#3f3f46] transition-all duration-300",
          isResultExpanded && currentResult ? "w-[55%]" : "flex-1"
        )}>
          {/* Two Options Banner - Clear parallel choices */}
          <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-[#27272a] border-2 border-[#3f3f46]">
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3f3f46] border-2 border-[#3d3d52] cursor-pointer hover:border-[#6366f1]/50 hover:bg-[#3d3d52]/80 transition-all">
              <Upload size={14} className="text-[--text-secondary]" />
              <span className="text-sm font-medium text-[--text-secondary]">导入现有剧本</span>
              <input
                type="file"
                accept=".txt,.docx,.pdf"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>
            <span className="text-xs text-[--text-muted]">或</span>
            <Button
              onClick={() => setShowGeneratePanel(!showGeneratePanel)}
              className="bg-[#6366f1] hover:bg-[#818cf8] text-white border-2 border-[#818cf8] shadow-lg shadow-[#6366f1]/30"
              icon={<Sparkles size={14} />}
            >
              一键生成剧本框架
              <Badge className="ml-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] px-1.5">💰</Badge>
            </Button>
            <div className="flex-1 text-xs text-[--text-muted] text-right">
              拖拽文件可直接导入
            </div>
          </div>

          {/* AI Generate Settings - shown when user clicks the button */}
          {showGeneratePanel && (
            <div className="rounded-xl border-2 border-[#6366f1] bg-gradient-to-r from-[#6366f1]/20 to-[#6366f1]/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 rounded-full bg-[#6366f1] flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">AI 剧本生成</div>
                  <div className="text-xs text-[--text-muted]">输入题材创意，AI 自动生成完整剧本大纲</div>
                </div>
                <button
                  onClick={() => setShowGeneratePanel(false)}
                  className="text-[--text-muted] hover:text-[--text-secondary] text-xs"
                >
                  收起
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <textarea
                  rows={2}
                  placeholder="例：穿越到古代成为皇后，凭借现代知识逆天改命..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-md px-3 py-2 text-sm resize-none bg-[--bg-elevated] border-2 border-[--border] text-[--text-primary] placeholder:text-[--text-muted] focus:border-[--accent] outline-none"
                />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[--text-muted]">题材：</span>
                    <select
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="h-7 rounded px-2 text-xs bg-[#27272a] border-2 border-[#3f3f46] text-gray-200 outline-none"
                    >
                      {["都市", "古风", "玄幻", "科幻", "现实", "悬疑", "甜宠", "逆袭"].map(s => (
                        <option key={s} value={s} className="bg-[#27272a] text-gray-200">{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[--text-muted]">集数：</span>
                    <input
                      type="number" min={1} max={100} value={totalEpisodes}
                      onChange={(e) => setTotalEpisodes(Number(e.target.value))}
                      className="w-20 h-7 rounded px-2 text-xs bg-[#27272a] border-2 border-[#3f3f46] text-white outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[--text-muted]">模型：</span>
                    <select
                      value={llmProvider}
                      onChange={(e) => setLlmProvider(e.target.value)}
                      className="h-7 rounded px-2 text-xs bg-[#27272a] border-2 border-[#3f3f46] text-gray-200 outline-none"
                    >
                      <option value="auto" className="bg-[#27272a] text-gray-200">自动选择</option>
                      {Object.entries(LLM_PROVIDERS).map(([key, label]) => {
                        const isConfigured = configuredProviders.includes(key);
                        return (
                          <option key={key} value={key} className="bg-[#27272a] text-gray-200">
                            {label} {isConfigured ? "✓" : "(未配置)"}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      onClick={() => navigate("/settings")}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[--bg-elevated] text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover] transition-colors"
                    >
                      <Settings size={12} />
                      配置
                    </button>
                  </div>
                  <Button
                    onClick={handleGenerateFromIdea}
                    disabled={!topic.trim() || loading}
                    loading={loading}
                    className="bg-[#6366f1] hover:bg-[#818cf8] text-white ml-auto"
                    icon={<Wand2 size={14} />}
                  >
                    {loading ? "生成中..." : "开始生成"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Streaming progress */}
          {loading && streamText && (
            <div className="rounded-lg border-2 border-[#6366f1]/30 bg-[#6366f1]/10 px-4 py-3">
              <div className="text-xs text-[#818cf8] flex items-center gap-1.5 mb-1">
                <Wand2 size={12} className="animate-pulse" />
                AI 正在生成...
              </div>
              <pre className="text-[10px] text-[--text-muted] font-mono max-h-16 overflow-hidden whitespace-pre-wrap">{streamText}</pre>
            </div>
          )}

          {/* Script Editor */}
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[--text-secondary]">剧本内容</span>
                <span className="text-xs text-[--text-muted]">{rawText.length.toLocaleString()} 字</span>
              </div>
              <div className="text-xs text-[--text-muted]">
                支持拖拽导入 .txt / .docx / .pdf
              </div>
            </div>

            {/* Drop zone + Editor combined */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="flex-1 flex flex-col rounded-xl border-2 border-[--border] bg-[--bg-surface] overflow-hidden"
            >
              <textarea
                className="flex-1 w-full px-4 py-3 text-sm resize-none bg-transparent text-[--text-primary] placeholder:text-[--text-muted] leading-relaxed focus:outline-none font-mono"
                placeholder="在此编辑或粘贴剧本内容...&#10;&#10;拖拽文件可直接导入，或使用顶部按钮导入/生成"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-500/20 border border-red-500/30 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Middle: Breakdown Button - hidden when result expanded */}
        {!isResultExpanded && (
          <div className="flex flex-col items-center justify-center px-4 min-w-[120px]">
            <div className="flex flex-col items-center gap-3">
              <ArrowRight size={24} className={cn(
                "transition-colors",
                rawText.trim() ? "text-[#6366f1]" : "text-[#3f3f46]"
              )} />
              <Button
                onClick={handleBreakdown}
                disabled={!rawText.trim() || loading}
                loading={loading}
                icon={<Grid3x3 size={16} />}
                className={cn(
                  "px-4 py-3 border-2 shadow-lg transition-all",
                  rawText.trim() && !loading
                    ? "bg-[#6366f1] hover:bg-[#818cf8] text-white border-[#818cf8] shadow-[#6366f1]/30"
                    : "bg-[--bg-elevated] text-[--text-muted] border-[--border] shadow-none"
                )}
              >
                进行拆解
              </Button>
              <div className="flex flex-col items-center gap-2">
                {/* Episode count setting */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[--text-muted]">拆解集数：</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={totalEpisodes}
                    onChange={(e) => setTotalEpisodes(Number(e.target.value))}
                    className="w-12 h-7 rounded px-2 text-xs text-center bg-[--bg-elevated] border-2 border-[--border] text-[--text-primary] outline-none focus:border-[--accent]"
                  />
                </div>
                <select
                  value={breakdownLlmProvider}
                  onChange={(e) => setBreakdownLlmProvider(e.target.value)}
                  className="h-7 rounded px-2 text-xs bg-[#27272a] border-2 border-[#3f3f46] text-gray-200 outline-none"
                >
                  <option value="auto" className="bg-[#27272a] text-gray-200">自动选择</option>
                  {Object.entries(LLM_PROVIDERS).map(([key, label]) => {
                    const isConfigured = configuredProviders.includes(key);
                    return (
                      <option key={key} value={key} className="bg-[#27272a] text-gray-200">
                        {label} {isConfigured ? "✓" : "(未配置)"}
                      </option>
                    );
                  })}
                </select>
                <button
                  onClick={() => navigate("/settings")}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[--bg-elevated] text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-hover] transition-colors"
                >
                  <Settings size={12} />
                  配置
                </button>
              </div>
              <span className="text-[10px] text-[--text-muted] text-center">AI 自动拆解分集</span>
            </div>
          </div>
        )}

        {/* Right: Breakdown Result - expands smoothly without jitter */}
        <div
          className={cn(
            "flex flex-col border-2 border-[#3f3f46] rounded-xl bg-[#18181b] overflow-hidden ml-4 transition-all duration-300 relative",
            isResultExpanded && currentResult ? "w-[520px]" : "w-[350px]"
          )}
        >
          {/* Quick breakdown controls when expanded */}
          {isResultExpanded && currentResult && (
            <div className="px-4 py-2 border-b border-[#3f3f46] flex items-center gap-3 bg-[#27272a]">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[--text-muted]">集数：</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={totalEpisodes}
                  onChange={(e) => setTotalEpisodes(Number(e.target.value))}
                  className="w-10 h-7 rounded px-1 text-xs text-center bg-[#18181b] border border-[#3f3f46] text-white outline-none focus:border-[#6366f1]"
                />
              </div>
              <Button
                onClick={handleBreakdown}
                disabled={!rawText.trim() || loading}
                loading={loading}
                icon={<Grid3x3 size={14} />}
                size="sm"
                className={cn(
                  rawText.trim() && !loading
                    ? "bg-[#6366f1] hover:bg-[#818cf8] text-white"
                    : "bg-[--bg-elevated] text-[--text-muted]"
                )}
              >
                重新拆解
              </Button>
              <select
                value={breakdownLlmProvider}
                onChange={(e) => setBreakdownLlmProvider(e.target.value)}
                className="h-7 rounded px-2 text-xs bg-[#18181b] border-2 border-[#3f3f46] text-white outline-none"
              >
                <option value="auto" className="bg-[#18181b] text-white">自动选择</option>
                {Object.entries(LLM_PROVIDERS).map(([key, label]) => {
                  const isConfigured = configuredProviders.includes(key);
                  return (
                    <option key={key} value={key} className="bg-[#18181b] text-white">
                      {label} {isConfigured ? "✓" : "(未配置)"}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={() => navigate("/settings")}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[--bg-elevated] text-[--text-secondary] hover:text-[--text-primary] transition-colors"
              >
                <Settings size={12} />
              </button>
            </div>
          )}
          <div className="px-4 py-3 border-b border-[#3f3f46] flex items-center gap-2">
            <BookOpen size={16} className="text-[#818cf8]" />
            <span className="text-sm font-semibold text-white">拆解结果</span>
            {currentResult && (
              <button
                onClick={() => setIsResultExpanded(!isResultExpanded)}
                className="ml-auto text-xs text-[--text-muted] hover:text-[--text-primary] flex items-center gap-1"
              >
                {isResultExpanded ? "收起" : "展开详情"}
                <ArrowRight size={12} className={cn("transition-transform", isResultExpanded && "rotate-180")} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {!currentResult ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="size-12 rounded-xl bg-[#27272a] flex items-center justify-center">
                  <BookOpen size={20} className="text-[--text-muted]" strokeWidth={1.5} />
                </div>
                <div className="text-sm text-[--text-muted]">还没有拆解结果</div>
                <div className="text-xs text-[--text-muted]">编辑剧本后点击「进行拆解」</div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Title & Core Info */}
                {((currentResult as BreakdownResult).title_suggestion || (currentResult as BreakdownResult).titles) && (
                  <div className="rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20 px-3 py-2.5">
                    {(currentResult as BreakdownResult).titles && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {(currentResult as BreakdownResult).titles!.map((t, i) => (
                          <span key={i} className="text-xs font-semibold text-[#818cf8] bg-[#6366f1]/20 px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}
                    {(currentResult as BreakdownResult).title_suggestion && (
                      <div className="text-sm font-semibold text-[#818cf8]">{(currentResult as BreakdownResult).title_suggestion}</div>
                    )}
                    {(currentResult as BreakdownResult).tagline && (
                      <div className="text-xs text-[#818cf8]/80 italic mt-1">{(currentResult as BreakdownResult).tagline}</div>
                    )}
                    {(currentResult as BreakdownResult).core_conflict && (
                      <div className="text-xs text-[--text-muted] mt-1">核心矛盾：{(currentResult as BreakdownResult).core_conflict}</div>
                    )}
                    {(currentResult as BreakdownResult).theme && (
                      <div className="text-xs text-[--text-muted]">主题：{(currentResult as BreakdownResult).theme}</div>
                    )}
                  </div>
                )}

                {/* Worldview */}
                {(currentResult as BreakdownResult).worldview && (
                  <div className="rounded-lg bg-[--bg-elevated] border border-[--border] px-3 py-2.5">
                    <div className="text-xs font-semibold text-[--text-secondary] mb-1.5 flex items-center gap-1.5">
                      <span className="size-4 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">界</span>
                      世界观
                    </div>
                    <div className="text-xs text-[--text-muted] space-y-0.5">
                      {(currentResult as BreakdownResult).worldview!.era && <div>时代：{(currentResult as BreakdownResult).worldview!.era}</div>}
                      {(currentResult as BreakdownResult).worldview!.location && <div>地点：{(currentResult as BreakdownResult).worldview!.location}</div>}
                      {(currentResult as BreakdownResult).worldview!.setting && <div>设定：{(currentResult as BreakdownResult).worldview!.setting}</div>}
                      {isResultExpanded && (currentResult as BreakdownResult).worldview!.rules && <div className="text-yellow-400/70">特殊规则：{(currentResult as BreakdownResult).worldview!.rules}</div>}
                    </div>
                  </div>
                )}

                {/* Relationships */}
                {isResultExpanded && (currentResult as BreakdownResult).relationships && (currentResult as BreakdownResult).relationships!.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-[--text-secondary] mb-2">人物关系</div>
                    <div className="space-y-1">
                      {(currentResult as BreakdownResult).relationships!.map((r, i) => (
                        <div key={i} className="text-xs text-[--text-muted] bg-[--bg-elevated] px-2 py-1 rounded">{r}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Characters - show all when expanded */}
                {(currentResult as BreakdownResult).characters && (currentResult as BreakdownResult).characters!.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-[--text-secondary] mb-2 flex items-center gap-1.5">
                      <span className="size-4 rounded bg-[--accent-dim] text-[--accent-hover] flex items-center justify-center text-[10px]">人</span>
                      角色 ({(currentResult as BreakdownResult).characters!.length})
                    </div>
                    <div className="space-y-2">
                      {(currentResult as BreakdownResult).characters!.slice(0, isResultExpanded ? 100 : 4).map((c, i) => (
                        <div key={i} className="rounded-md bg-[--bg-elevated] px-3 py-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-sm font-medium text-[--text-primary]">{c.name}</span>
                            <span className="text-[10px] text-[--text-muted] bg-[--bg-hover] px-1.5 py-0.5 rounded">{c.role}</span>
                            {c.gender && <span className="text-[10px] text-[--text-muted]">{c.gender}</span>}
                            {c.age && <span className="text-[10px] text-[--text-muted]">{c.age}</span>}
                          </div>
                          <div className={cn("text-xs text-[--text-muted] leading-relaxed", !isResultExpanded && "line-clamp-2")}>
                            {c.appearance}
                          </div>
                          {c.personality && (
                            <div className={cn("text-xs text-[--text-muted] mt-1", !isResultExpanded && "line-clamp-1")}>
                              性格：{c.personality}
                            </div>
                          )}
                          {isResultExpanded && c.arc && (
                            <div className="text-xs text-yellow-400/80 mt-1">
                              📈 人物弧线：{c.arc}
                            </div>
                          )}
                          {isResultExpanded && c.character_prompt && (
                            <div className="text-[10px] text-[#6366f1]/80 mt-1.5 font-mono bg-[#18181b] px-2 py-1 rounded leading-relaxed">
                              📝 {c.character_prompt}
                            </div>
                          )}
                        </div>
                      ))}
                      {!isResultExpanded && (currentResult as BreakdownResult).characters!.length > 4 && (
                        <div className="text-[10px] text-[--text-muted] text-center">+{(currentResult as BreakdownResult).characters!.length - 4} 更多，点击展开</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Episodes - show more detail when expanded */}
                {(currentResult as BreakdownResult).episodes && (currentResult as BreakdownResult).episodes!.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-[--text-secondary] mb-2 flex items-center gap-1.5">
                      <span className="size-4 rounded bg-[#6366f1]/20 text-[#818cf8] flex items-center justify-center text-[10px]">集</span>
                      分集梗概 ({(currentResult as BreakdownResult).episodes!.length})
                    </div>
                    <div className="space-y-2">
                      {(currentResult as BreakdownResult).episodes!.slice(0, isResultExpanded ? 100 : 5).map((ep) => (
                        <div key={ep.episode_no} className="rounded-md bg-[#27272a] px-3 py-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-mono text-[#818cf8] bg-[#6366f1]/20 px-1.5 py-0.5 rounded font-bold">E{ep.episode_no}</span>
                            <span className="text-sm font-medium text-white">{ep.title}</span>
                            {ep.emotion && <span className="text-[10px] text-[--text-muted] bg-[--bg-hover] px-1 rounded">{ep.emotion}</span>}
                          </div>
                          <div className={cn("text-xs text-[--text-muted] leading-relaxed", !isResultExpanded && "line-clamp-2")}>
                            {ep.summary}
                          </div>
                          {isResultExpanded && (
                            <div className="mt-2 space-y-1">
                              {ep.hook && (
                                <div className="text-xs text-yellow-400/80">
                                  <span className="text-[10px] bg-yellow-500/20 px-1 py-0.5 rounded mr-1">钩子</span>
                                  {ep.hook}
                                </div>
                              )}
                              {ep.highlight && (
                                <div className="text-xs text-green-400/80">
                                  <span className="text-[10px] bg-green-500/20 px-1 py-0.5 rounded mr-1">爽点</span>
                                  {ep.highlight}
                                </div>
                              )}
                              {/* Key shots */}
                              {ep.key_shots && ep.key_shots.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-[#3f3f46]">
                                  <div className="text-[10px] text-[--text-muted] mb-1.5">核心镜头 ({ep.key_shots.length})</div>
                                  <div className="space-y-1.5">
                                    {ep.key_shots.map((shot, si) => (
                                      <div key={si} className="rounded bg-[#18181b] px-2 py-1.5">
                                        <div className="flex items-center gap-1 mb-1">
                                          <span className="text-[10px] font-mono text-[#6366f1]">#{si + 1}</span>
                                          <span className="text-xs text-[--text-secondary]">{shot.scene}</span>
                                          {shot.characters && shot.characters.length > 0 && (
                                            <div className="flex gap-0.5">
                                              {shot.characters.map(c => (
                                                <span key={c} className="text-[10px] bg-[#6366f1]/20 text-[#818cf8] px-1 rounded">{c}</span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        {shot.action && <div className="text-[10px] text-[--text-muted] mb-1">{shot.action}</div>}
                                        <div className="text-[10px] text-[#6366f1]/70 font-mono leading-relaxed">
                                          {shot.prompt_en}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {!isResultExpanded && (currentResult as BreakdownResult).episodes!.length > 5 && (
                        <div className="text-[10px] text-[--text-muted] text-center">+{(currentResult as BreakdownResult).episodes!.length - 5} 更多，点击展开</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Key Props/Scenes */}
                {(currentResult as BreakdownResult).key_scenes && (currentResult as BreakdownResult).key_scenes!.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-[--text-secondary] mb-2">重要场景 ({(currentResult as BreakdownResult).key_scenes!.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {(currentResult as BreakdownResult).key_scenes!.slice(0, isResultExpanded ? 100 : 6).map((s, i) => (
                        <Badge key={i} className="text-xs bg-[--bg-elevated] text-[--text-secondary] border border-[--border]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Props */}
                {(currentResult as BreakdownResult).key_props && (currentResult as BreakdownResult).key_props!.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-[--text-secondary] mb-2">核心道具 ({(currentResult as BreakdownResult).key_props!.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {(currentResult as BreakdownResult).key_props!.slice(0, isResultExpanded ? 100 : 6).map((p, i) => (
                        <Badge key={i} className="text-xs bg-[--bg-elevated] text-[--text-secondary] border border-[--border]">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {currentResult && (
            <div className="px-4 py-3 border-t border-[#3f3f46]">
              <Button
                onClick={handleGenerateStoryboard}
                loading={storyboardGenerating}
                icon={<LayoutGrid size={14} />}
                className="w-full bg-[#6366f1] hover:bg-[#818cf8] text-white"
              >
                {storyboardGenerating ? "生成分镜中..." : "生成分镜画板"}
              </Button>
            </div>
          )}
        </div>
      </div>

      </div>
  );
}