import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface Tab {
  key: string;
  label: string;
  icon?: ReactNode;
  desc?: string;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
  variant?: "compact" | "cards";
}

export function Tabs({ tabs, active, onChange, className, variant = "compact" }: TabsProps) {
  if (variant === "cards") {
    return (
      <div className={cn("grid grid-cols-4 gap-3", className)}>
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl px-4 py-4 transition-all duration-200 group cursor-pointer",
                isActive
                  ? "bg-[--accent] text-white border-2 border-[--accent-hover] ring-2 ring-[--accent]/50"
                  : "bg-[--bg-surface] text-[--text-secondary] border-2 border-[--border] hover:border-[--accent] hover:bg-[--bg-hover]"
              )}
            >
              <div className={cn(
                "size-10 rounded-full flex items-center justify-center mb-2",
                isActive ? "bg-white/20" : "bg-[--bg-elevated] group-hover:bg-[--accent]/20"
              )}>
                {tab.icon}
              </div>
              <span className="text-sm font-semibold">{tab.label}</span>
              {tab.desc && (
                <span className={cn(
                  "text-xs mt-1",
                  isActive ? "text-white/70" : "text-[--text-muted]"
                )}>{tab.desc}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-1 p-1 rounded-lg bg-[--bg-surface] border border-[--border-subtle]",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
            active === tab.key
              ? "bg-[--bg-elevated] text-[--text-primary] shadow-sm border border-[--border]"
              : "text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-hover]"
          )}
        >
          {tab.icon && <span className="text-xs">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
