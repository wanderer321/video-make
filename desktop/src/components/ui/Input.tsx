import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        className={cn(
          "h-9 w-full rounded-md px-3 text-sm",
          "bg-[--bg-elevated] border border-[--border]",
          "text-[--text-primary] placeholder:text-[--text-muted]",
          "focus:border-[--accent] focus:ring-1 focus:ring-[--accent]/30",
          "transition-colors duration-150",
          error && "border-[--error] focus:border-[--error]",
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-[--text-muted]">{hint}</p>}
      {error && <p className="text-xs text-[--error]">{error}</p>}
    </div>
  );
}

interface SecretInputProps extends Omit<InputProps, "type"> {}

export function SecretInput({ label, hint, error, className, ...props }: SecretInputProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...props}
          type={show ? "text" : "password"}
          className={cn(
            "h-9 w-full rounded-md px-3 pr-9 text-sm",
            "bg-[--bg-elevated] border border-[--border]",
            "text-[--text-primary] placeholder:text-[--text-muted]",
            "focus:border-[--accent] focus:ring-1 focus:ring-[--accent]/30",
            "transition-colors duration-150",
            error && "border-[--error] focus:border-[--error]",
            className
          )}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text-secondary] transition-colors"
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {hint && !error && <p className="text-xs text-[--text-muted]">{hint}</p>}
      {error && <p className="text-xs text-[--error]">{error}</p>}
    </div>
  );
}
