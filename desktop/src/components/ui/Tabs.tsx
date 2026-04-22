import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface Tab {
  key: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
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
