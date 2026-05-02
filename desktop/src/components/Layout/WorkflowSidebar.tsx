import { cn, PIPELINE_STEPS } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import {
  BookOpen,
  Image,
  LayoutGrid,
  Zap,
  Mic,
  Film,
  Download,
  Settings,
  ChevronRight,
  Layers,
  ArrowRight,
} from "lucide-react";
import { NavLink, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useEffect } from "react";

const STEP_ICONS = [BookOpen, Image, LayoutGrid, Zap, Mic, Film, Download];

const ROUTE_TO_STEP: Record<string, number> = {
  "/script": 1,
  "/assets": 2,
  "/storyboard": 3,
  "/generate": 4,
  "/compose": 6,
};

const BACKEND = "http://localhost:17322";

function StepItem({ step, index, hasProject }: {
  step: typeof PIPELINE_STEPS[number];
  index: number;
  isActive: boolean;
  hasProject: boolean;
}) {
  const Icon = STEP_ICONS[index];
  const href = hasProject ? `${step.route}?project=${useAppStore.getState().currentProjectId}` : step.route;

  return (
    <NavLink
      to={href}
      className={({ isActive }) => {
        const active = isActive || index === useAppStore.getState().workflowStep - 1;
        return cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-all duration-200",
          active
            ? "bg-gradient-to-r from-[--accent]/20 to-[--accent-dim] text-[--accent-hover] font-semibold border-l-2 border-[--accent]"
            : "text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]"
        );
      }}
    >
      {({ isActive }) => {
        const active = isActive || index === useAppStore.getState().workflowStep - 1;
        return (
          <>
            <div className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-all duration-200",
              active
                ? "bg-[--accent] text-white shadow-lg shadow-[--accent]/30"
                : "border border-[--border] text-[--text-muted] group-hover:border-[--accent]/40 group-hover:text-[--text-secondary]"
            )}>
              <Icon size={14} />
            </div>
            <span className="flex-1 truncate">{step.label}</span>
          </>
        );
      }}
    </NavLink>
  );
}

export function WorkflowSidebar() {
  const online = useAppStore((s) => s.backendOnline);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const currentProjectName = useAppStore((s) => s.currentProjectName);
  const workflowStep = useAppStore((s) => s.workflowStep);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const hasProject = !!currentProjectId;

  // Load project info from URL parameter if store is empty
  useEffect(() => {
    const projectIdFromUrl = params.get("project");
    if (projectIdFromUrl && !currentProjectId) {
      fetch(`${BACKEND}/api/projects/${projectIdFromUrl}`)
        .then(r => r.json())
        .then((project: { id: string; name: string }) => {
          setCurrentProject(project.id, project.name);
        })
        .catch(() => {});
    }
  }, [params, currentProjectId, setCurrentProject]);

  // Determine active step from route
  let activeStepIdx = 0;
  const path = location.pathname;
  for (const [route, step] of Object.entries(ROUTE_TO_STEP)) {
    if (path.startsWith(route)) {
      activeStepIdx = step - 1;
      break;
    }
  }
  if (workflowStep > 0) activeStepIdx = Math.max(activeStepIdx, workflowStep - 1);

  return (
    <aside
      className="flex h-full flex-col border-r border-[--border-subtle] animate-slide-in"
      style={{ width: "var(--sidebar-width)", background: "var(--bg-surface)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[--border-subtle]">
        <div
          className="flex size-10 items-center justify-center rounded-xl shrink-0 transition-transform duration-200 hover:scale-110"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-hover))", boxShadow: "0 2px 12px var(--accent-glow)" }}
        >
          <Layers size={20} className="text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-bold tracking-wide text-[--text-primary]">WoniMar~</div>
          <div className="text-xs text-[--text-muted]">全流程 AI 漫剧创作</div>
        </div>
      </div>

      {/* Project entry point */}
      {hasProject ? (
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-[--border-subtle] hover:bg-[--accent]/10 transition-all duration-200 w-full text-left group"
        >
          <div className="size-9 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30">
            <Layers size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold tracking-wide bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">我的项目</div>
            <div className="text-[11px] text-[--text-muted] truncate mt-0.5">{currentProjectName}</div>
          </div>
          <ChevronRight size={16} className="text-pink-400 shrink-0 transition-transform group-hover:translate-x-1" />
        </button>
      ) : (
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-2 mx-3 mt-3 mb-1 rounded-lg border-2 border-[--accent]/30 bg-[--accent]/10 px-3 py-2.5 hover:bg-[--accent]/20 hover:border-[--accent]/50 transition-all duration-200 w-[calc(100%-24px)] text-left group"
        >
          <div className="size-7 rounded-lg bg-[--accent] flex items-center justify-center shrink-0 shadow-lg shadow-[--accent]/30">
            <Layers size={14} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-[--accent-hover]">新建项目</div>
            <div className="text-[11px] text-[--accent]/70">开始创作之旅</div>
          </div>
          <ArrowRight size={12} className="text-[--accent] shrink-0 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}

      {/* Pipeline Steps */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Section header */}
        <div className="mb-3 px-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-[--text-muted]">
            创作流程
          </div>
        </div>

        {/* Steps with connecting lines */}
        <div className="relative">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.key} className="relative">
              <StepItem
                step={step}
                index={i}
                isActive={i <= activeStepIdx}
                hasProject={hasProject}
              />
              {/* Connecting line */}
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="absolute left-[23px] top-[44px] h-3 w-px">
                  <div className={cn(
                    "h-full w-px transition-all duration-300",
                    i < activeStepIdx ? "bg-[--accent]/50" : "bg-[--border-subtle]"
                  )} />
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom: Settings + Status */}
      <div className="border-t border-[--border-subtle] px-3 py-3 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200",
              isActive
                ? "bg-[--accent-dim] text-[--accent-hover] font-medium"
                : "text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]"
            )
          }
        >
          <Settings size={15} className="shrink-0" />
          AI 接口设置
        </NavLink>

        {/* Backend status */}
        <div className="flex items-center gap-2 px-3 py-2 mt-1 rounded-lg bg-[--bg-base]/50">
          <span
            className={cn(
              "size-2 rounded-full shrink-0 transition-all duration-300",
              online ? "bg-[--success]" : "bg-[--error]"
            )}
            style={online ? { boxShadow: "0 0 6px var(--success)" } : {}}
          />
          <span className="text-[11px] text-[--text-muted]">
            {online ? "后端已连接" : "后端未启动"}
          </span>
        </div>
      </div>
    </aside>
  );
}
