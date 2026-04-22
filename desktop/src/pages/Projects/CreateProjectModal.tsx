import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { PROJECT_STYLES, PROJECT_TYPES } from "@/lib/utils";
import { useProjectStore } from "@/stores/useProjectStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ open, onClose }: Props) {
  const create = useProjectStore((s) => s.create);
  const [name, setName] = useState("");
  const [type, setType] = useState("manga_2d");
  const [style, setStyle] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setName("");
    setType("manga_2d");
    setStyle("");
    setDesc("");
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
      await create({ name: name.trim(), type, style: style || undefined, description: desc || undefined });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="新建项目"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleCreate} loading={loading}>
            创建项目
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="项目名称"
          placeholder="例：气运三角洲"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          autoFocus
        />

        {/* Type selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
            剧目类型
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PROJECT_TYPES).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setType(key)}
                className={cn(
                  "rounded-md border py-2.5 text-sm font-medium transition-all duration-150",
                  type === key
                    ? "border-[--accent] bg-[--accent-dim] text-[--accent-hover]"
                    : "border-[--border] text-[--text-secondary] hover:border-[--text-muted] hover:text-[--text-primary]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Style tags */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
            风格标签（可选）
          </label>
          <div className="flex flex-wrap gap-2">
            {PROJECT_STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(style === s ? "" : s)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
                  style === s
                    ? "border-[--accent] bg-[--accent-dim] text-[--accent-hover]"
                    : "border-[--border] text-[--text-muted] hover:border-[--text-muted] hover:text-[--text-secondary]"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
            简介（可选）
          </label>
          <textarea
            rows={3}
            placeholder="一句话描述你的故事..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className={cn(
              "w-full rounded-md px-3 py-2 text-sm resize-none",
              "bg-[--bg-elevated] border border-[--border]",
              "text-[--text-primary] placeholder:text-[--text-muted]",
              "focus:border-[--accent] focus:ring-1 focus:ring-[--accent]/30",
              "transition-colors duration-150"
            )}
          />
        </div>
      </div>
    </Modal>
  );
}
