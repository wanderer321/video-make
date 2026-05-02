import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "accent";
  className?: string;
}

const variants = {
  default: "bg-[--bg-hover] text-[--text-secondary] border-[--border]",
  success: "bg-[--success]/10 text-[--success] border-[--success]/30",
  warning: "bg-[--warning]/10 text-[--warning] border-[--warning]/30",
  error: "bg-[--error]/10 text-[--error] border-[--error]/30",
  accent: "bg-[--accent-dim] text-[--accent-hover] border-[--accent]/30",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
