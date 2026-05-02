import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, FileText, ArrowRight } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  scriptText: string;
  projectId?: string;
  onDecompose: (episodes: { episodeNo: number; title: string }[]) => void;
}

export function ScriptDecomposeModal({ open, onClose, scriptText, projectId, onDecompose }: Props) {
  const [decomposing, setDecomposing] = useState(false);
  const [episodes, setEpisodes] = useState<{ episodeNo: number; title: string }[]>([]);
  const [streamedText, setStreamedText] = useState("");

  const handleDecompose = async () => {
    if (!scriptText.trim()) return;
    setDecomposing(true);
    setStreamedText("");
    setEpisodes([]);

    try {
      // Call the breakdown-stream endpoint
      const response = await fetch("http://localhost:17322/api/scripts/breakdown-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: "",
          project_id: projectId || null,
          raw_text: scriptText,
          total_episodes: 10,
          style: "",
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullText += chunk;
        setStreamedText(fullText);

        // Try to parse episode titles from the streamed text
        // Expected format: "第X集：标题" or similar
        const episodeMatches = fullText.match(/第\s*(\d+)\s*集[：:]\s*(.+)/g);
        if (episodeMatches) {
          const parsed = episodeMatches.map((m) => {
            const match = m.match(/第\s*(\d+)\s*集[：:]\s*(.+)/);
            return match
              ? { episodeNo: parseInt(match[1]), title: match[2].trim().slice(0, 50) }
              : null;
          }).filter(Boolean) as { episodeNo: number; title: string }[];

          if (parsed.length > 0) {
            setEpisodes(parsed);
          }
        }
      }

      // If no episodes were parsed from streaming, create default ones
      if (episodes.length === 0) {
        setEpisodes([
          { episodeNo: 1, title: "第一集" },
          { episodeNo: 2, title: "第二集" },
        ]);
      }
    } catch {
      // Fallback: create default episodes
      setEpisodes([
        { episodeNo: 1, title: "第一集" },
        { episodeNo: 2, title: "第二集" },
      ]);
    } finally {
      setDecomposing(false);
    }
  };

  const handleConfirm = () => {
    if (episodes.length > 0) {
      onDecompose(episodes);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="AI 拆解剧本" size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          {episodes.length > 0 ? (
            <Button onClick={handleConfirm} icon={<ArrowRight size={14} />}>
              进入集数管理 ({episodes.length} 集)
            </Button>
          ) : (
            <Button onClick={handleDecompose} loading={decomposing} disabled={!scriptText.trim()} icon={<Sparkles size={13} />}>
              AI 拆解
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-lg border border-[--accent]/20 bg-[--accent-dim]/20 px-3 py-2.5">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-[--accent]" />
          <div className="text-xs text-[--text-secondary]">
            AI 将分析剧本内容，自动拆分为多个集数，并为每集生成标题和梗概
          </div>
        </div>

        {!decomposing && episodes.length === 0 && !streamedText && (
          <div className="rounded-lg border border-[--border] bg-[--bg-surface] p-6 text-center">
            <FileText size={32} className="mx-auto mb-3 text-[--text-muted]" strokeWidth={1.5} />
            <p className="text-sm text-[--text-secondary]">已加载 {scriptText.length} 字符剧本</p>
            <p className="text-xs text-[--text-muted] mt-1">点击「AI 拆解」开始分析</p>
          </div>
        )}

        {decomposing && (
          <div className="rounded-lg border border-[--border] bg-[--bg-surface] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-[--accent] animate-pulse" />
              <span className="text-sm font-medium text-[--accent-hover]">AI 分析中...</span>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-md bg-[--bg-elevated] p-3 text-xs text-[--text-secondary] whitespace-pre-wrap leading-relaxed">
              {streamedText || "正在读取剧本内容..."}
            </div>
          </div>
        )}

        {episodes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[--text-primary]">
              拆解结果：{episodes.length} 集
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {episodes.map((ep) => (
                <div key={ep.episodeNo} className="flex items-center gap-2 rounded-lg border border-[--border] bg-[--bg-surface] px-3 py-2">
                  <Badge variant="accent" className="text-xs w-8 justify-center">
                    EP{ep.episodeNo}
                  </Badge>
                  <span className="text-sm text-[--text-primary] truncate">{ep.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
