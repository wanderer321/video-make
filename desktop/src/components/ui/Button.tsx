import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
}

const variantStyles = {
  primary: "bg-[--accent] hover:bg-[--accent-hover] text-white shadow-lg shadow-[--accent]/30",
  ghost: "text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]",
  danger: "bg-[--error]/20 text-[--error] hover:bg-[--error]/30 border border-[--error]/30",
  outline: "border-2 border-[--border] text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]",
};

const sizeStyles = {
  sm: "h-7 px-3 text-xs gap-1.5",
  md: "h-8 px-4 text-sm gap-2",
  lg: "h-10 px-5 text-sm gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-all duration-150 select-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={14} />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
