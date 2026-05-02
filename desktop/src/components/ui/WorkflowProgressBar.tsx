import { cn, PIPELINE_STEPS } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { Check, ChevronRight } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

const BACKEND = "http://localhost:17322";

const ROUTE_MAP: Record<string, string> = {
  "script": "/script",
  "assets": "/assets",
  "storyboard": "/storyboard",
  "image-gen": "/generate",
  "tts": "/generate",
  "compose": "/compose",
  "export": "/compose",
};

const STEP_ROUTES = ["/script", "/assets", "/storyboard", "/generate", "/generate", "/compose", "/compose"];

interface ProjectStatus {
  hasBreakdown: boolean;
  assetsCount: number;
  boardsCount: number;
  generatedImages: number;
  generatedAudio: number;
}

export function WorkflowProgressBar() {
  const workflowStep = useAppStore((s) => s.workflowStep);
  const setWorkflowStep = useAppStore((s) => s.setWorkflowStep);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>({
    hasBreakdown: false,
    assetsCount: 0,
    boardsCount: 0,
    generatedImages: 0,
    generatedAudio: 0,
  });

  // Fetch actual project completion status
  useEffect(() => {
    const projectId = params.get("project") || currentProjectId;
    if (!projectId) return;

    // Fetch project breakdown status and sync workflow step
    fetch(`${BACKEND}/api/projects/${projectId}`)
      .then(r => r.json())
      .then((p: { breakdown_result?: Record<string, unknown>; workflow_step?: number }) => {
        setProjectStatus(prev => ({ ...prev, hasBreakdown: !!p.breakdown_result }));
        // Sync store's workflowStep with database
        if (p.workflow_step && p.workflow_step > 0) {
          setWorkflowStep(p.workflow_step);
        }
      })
      .catch(() => {});

    // Fetch assets count
    fetch(`${BACKEND}/api/assets/project/${projectId}`)
      .then(r => r.json())
      .then((assets: unknown[]) => {
        setProjectStatus(prev => ({ ...prev, assetsCount: Array.isArray(assets) ? assets.length : 0 }));
      })
      .catch(() => {});

    // Fetch boards count
    fetch(`${BACKEND}/api/boards/project/${projectId}`)
      .then(r => r.json())
      .then((data: { boards?: unknown[] } | unknown[]) => {
        const boardsArr = Array.isArray(data) ? data : (data as { boards?: unknown[] }).boards || [];
        const typedBoards = boardsArr as Array<{ image_path?: string; audio_path?: string }>;
        const generatedImages = typedBoards.filter(b => b.image_path).length;
        const generatedAudio = typedBoards.filter(b => b.audio_path).length;
        setProjectStatus(prev => ({ ...prev, boardsCount: boardsArr.length, generatedImages, generatedAudio }));
      })
      .catch(() => {});
  }, [params, currentProjectId, setWorkflowStep]);

  // Determine current step from route
  let currentStep = 0;
  const path = location.pathname;
  for (let i = 0; i < STEP_ROUTES.length; i++) {
    if (path.startsWith(STEP_ROUTES[i])) {
      currentStep = i + 1;
      break;
    }
  }

  // Determine completed steps based on actual content
  const completedSteps: number[] = [];
  if (projectStatus.hasBreakdown) completedSteps.push(1); // Script complete when breakdown exists
  if (projectStatus.assetsCount > 0) completedSteps.push(2); // Assets complete when assets exist
  if (projectStatus.boardsCount > 0) completedSteps.push(3); // Storyboard complete when boards exist
  if (projectStatus.generatedImages > 0) completedSteps.push(4); // Image generation complete
  if (projectStatus.generatedAudio > 0) completedSteps.push(5); // TTS complete

  // Current step should be at least the highest completed + 1
  const maxCompleted = Math.max(0, ...completedSteps);
  if (currentStep === 0 && maxCompleted > 0) currentStep = maxCompleted + 1;
  if (workflowStep > 0) currentStep = Math.max(currentStep, workflowStep);

  if (currentStep === 0) return null;

  const handleStepClick = (stepKey: string) => {
    const route = ROUTE_MAP[stepKey];
    if (route) {
      // Navigate with project context
      const projectParam = params.get("project") || currentProjectId;
      if (projectParam) {
        navigate(`${route}?project=${projectParam}`);
      } else {
        navigate(route);
      }
    }
  };

  return (
    <div className="flex items-center justify-center gap-1 px-6 py-4 border-b-2 border-[#3f3f46] bg-[#232329]">
      {PIPELINE_STEPS.map((step, i) => {
        const stepNum = i + 1;
        const isCompleted = completedSteps.includes(stepNum);
        const isCurrent = stepNum === currentStep;
        const isClickable = stepNum <= currentStep; // Only completed and current steps are clickable

        return (
          <div key={step.key} className="flex items-center gap-1">
            {/* Step indicator - clickable */}
            <button
              onClick={() => isClickable && handleStepClick(step.key)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
                isCompleted
                  ? "bg-green-500/20 text-green-400 border-2 border-green-500/40 shadow-sm cursor-pointer hover:bg-green-500/30"
                  : isCurrent
                    ? "bg-[#7c5ef5] text-white border-2 border-[#a78bfa] shadow-lg shadow-[#7c5ef5]/30 scale-105 cursor-pointer"
                    : isClickable
                      ? "bg-[#27272a] text-gray-500 border-2 border-[#3f3f46] cursor-pointer hover:border-[#7c5ef5]/50"
                      : "bg-[#27272a] text-gray-500 border-2 border-[#3f3f46] cursor-not-allowed opacity-60"
              )}
            >
              <div className={cn(
                "size-6 rounded-full flex items-center justify-center font-bold",
                isCompleted
                  ? "bg-green-500 text-white"
                  : isCurrent
                    ? "bg-white/20 text-white"
                    : "bg-[#27272a] text-gray-500"
              )}>
                {isCompleted ? (
                  <Check size={14} />
                ) : (
                  <span>{stepNum}</span>
                )}
              </div>
              <span className="whitespace-nowrap">{step.label}</span>
            </button>

            {/* Connector arrow */}
            {i < PIPELINE_STEPS.length - 1 && (
              <ChevronRight
                size={18}
                className={cn(
                  "mx-1 transition-colors",
                  isCompleted ? "text-green-400" : "text-[#3f3f46]"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}