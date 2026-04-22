import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

export function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={cn(
          "w-full mx-4 rounded-xl border border-[--border] shadow-2xl",
          "bg-[--bg-elevated] flex flex-col max-h-[90vh]",
          sizeStyles[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[--border]">
            <h2 className="font-semibold text-[--text-primary]">{title}</h2>
            <button
              onClick={onClose}
              className="text-[--text-muted] hover:text-[--text-primary] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-[--border] flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
