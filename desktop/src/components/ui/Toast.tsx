import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle size={14} />,
  error:   <XCircle size={14} />,
  warning: <AlertTriangle size={14} />,
  info:    <Info size={14} />,
};

const COLORS: Record<ToastType, string> = {
  success: "text-[--success] bg-[--success]/10 border-[--success]/30",
  error:   "text-[--error] bg-[--error]/10 border-[--error]/30",
  warning: "text-[--warning] bg-[--warning]/10 border-[--warning]/30",
  info:    "text-[--accent-hover] bg-[--accent-dim] border-[--accent]/30",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, toast.duration ?? 4000);
    return () => clearTimeout(t);
  }, [toast.duration, onDismiss]);

  return (
    <div className={cn(
      "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs shadow-lg max-w-xs",
      COLORS[toast.type]
    )}>
      <span className="shrink-0 mt-0.5">{ICONS[toast.type]}</span>
      <span className="flex-1 leading-relaxed">{toast.message}</span>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <X size={12} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info", duration?: number) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-4), { id, type, message, duration }]);
  }, []);

  const success = useCallback((msg: string) => toast(msg, "success"), [toast]);
  const error = useCallback((msg: string) => toast(msg, "error", 6000), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
