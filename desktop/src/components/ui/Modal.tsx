import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
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
  const [closing, setClosing] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (open) {
      setVisible(true);
      document.addEventListener("keydown", handleKey);
    }
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  useEffect(() => {
    if (!open && visible) {
      setClosing(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setClosing(false);
      }, 200); // match animation duration
      return () => clearTimeout(timer);
    }
  }, [open, visible]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setVisible(false);
      onClose();
    }, 200);
  };

  if (!visible && !closing) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200",
        closing ? "opacity-0" : "opacity-100"
      )}
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className={cn(
          "w-full mx-4 rounded-xl border border-[--border] shadow-2xl transition-all duration-200",
          "bg-[--bg-elevated] flex flex-col max-h-[90vh]",
          sizeStyles[size],
          closing ? "opacity-0 scale-95" : "opacity-100 scale-100 animate-scale-in"
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[--border]">
            <h2 className="font-semibold text-[--text-primary]">{title}</h2>
            <button
              onClick={handleClose}
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