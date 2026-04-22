import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import {
  Clapperboard,
  Film,
  FolderOpen,
  Image,
  LayoutGrid,
  Layers,
  Settings,
  Zap,
  ChevronRight,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/projects", icon: FolderOpen, label: "项目" },
  { to: "/script",   icon: Clapperboard, label: "剧本工坊" },
  { to: "/assets",   icon: Image,        label: "资产库" },
  { to: "/storyboard", icon: LayoutGrid, label: "分镜画板" },
  { to: "/generate", icon: Zap,          label: "生成中心" },
  { to: "/compose",  icon: Film,         label: "后期合成" },
];

function NavItem({ to, icon: Icon, label, projectId }: {
  to: string;
  icon: React.ElementType;
  label: string;
  projectId: string;
}) {
  const href = to === "/projects" || !projectId ? to : `${to}?project=${projectId}`;
  return (
    <NavLink
      key={to}
      to={href}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-150",
          isActive
            ? "bg-[--accent-dim] text-[--accent-hover] font-medium"
            : "text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]"
        )
      }
    >
      <Icon size={15} className="shrink-0" />
      {label}
    </NavLink>
  );
}

export function Sidebar() {
  const online = useAppStore((s) => s.backendOnline);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const currentProjectName = useAppStore((s) => s.currentProjectName);
  const navigate = useNavigate();

  return (
    <aside
      className="flex h-full flex-col border-r border-[--border-subtle]"
      style={{ width: "var(--sidebar-width)", background: "var(--bg-surface)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[--border-subtle]">
        <div
          className="flex size-8 items-center justify-center rounded-lg shrink-0"
          style={{ background: "var(--accent)" }}
        >
          <Layers size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold tracking-wide text-[--text-primary]">DramaForge</div>
          <div className="text-[10px] text-[--text-muted]">剧锻工坊</div>
        </div>
      </div>

      {/* Current project banner */}
      {currentProjectName && (
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-2 px-4 py-2.5 border-b border-[--border-subtle] hover:bg-[--bg-hover] transition-colors w-full text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-[--text-muted] uppercase tracking-wide">当前项目</div>
            <div className="text-xs font-medium text-[--accent-hover] truncate">{currentProjectName}</div>
          </div>
          <ChevronRight size={12} className="text-[--text-muted] shrink-0" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavItem key={to} to={to} icon={icon} label={label} projectId={currentProjectId} />
        ))}
      </nav>

      {/* Bottom: Settings + Status */}
      <div className="border-t border-[--border-subtle] px-2 py-3 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-150",
              isActive
                ? "bg-[--accent-dim] text-[--accent-hover] font-medium"
                : "text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]"
            )
          }
        >
          <Settings size={15} className="shrink-0" />
          设置
        </NavLink>

        {/* Backend status */}
        <div className="flex items-center gap-2 px-3 py-2 mt-1">
          <span
            className={cn(
              "size-2 rounded-full shrink-0",
              online ? "bg-[--success]" : "bg-[--error]"
            )}
            style={online ? { boxShadow: "0 0 6px var(--success)" } : {}}
          />
          <span className="text-xs text-[--text-muted]">
            {online ? "后端已连接" : "后端未启动"}
          </span>
        </div>
      </div>
    </aside>
  );
}
