import { cn } from "@/lib/utils";
import { Eye, EyeOff, ChevronDown } from "lucide-react";
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
          "bg-[--bg-elevated] border-2 border-[--border]",
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
            "bg-[--bg-elevated] border-2 border-[--border]",
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

interface SelectProps {
  label?: string;
  hint?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function Select({ label, hint, options, value, onChange }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={cn(
            "h-9 w-full rounded-md px-3 pr-8 text-sm appearance-none cursor-pointer",
            "bg-[#27272a] border-2 border-[#3f3f46]",
            "text-gray-200 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30",
            "transition-colors duration-150"
          )}
        >
          {options.map(opt => (
            <option key={opt} value={opt} className="bg-[#27272a] text-gray-200">
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
      </div>
      {hint && <p className="text-xs text-[--text-muted]">{hint}</p>}
    </div>
  );
}
