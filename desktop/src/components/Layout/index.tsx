import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { WorkflowSidebar } from "./WorkflowSidebar";
import { WorkflowProgressBar } from "@/components/ui/WorkflowProgressBar";
import { useAppStore } from "@/stores/useAppStore";
import { api } from "@/lib/api";
import { ApiReminderModal, useApiReminderListener } from "@/components/ui/ApiReminderModal";

export function Layout() {
  const setBackendOnline = useAppStore((s) => s.setBackendOnline);
  const apiReminder = useApiReminderListener();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    const check = async () => {
      try {
        await api.health();
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }
    };

    check();
    timer = setInterval(check, 5000);
    return () => clearInterval(timer);
  }, [setBackendOnline]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <WorkflowSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <WorkflowProgressBar />
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
      {apiReminder.state && (
        <ApiReminderModal
          missing={apiReminder.state.missing}
          onProceed={apiReminder.state.onProceed}
          onClose={apiReminder.clear}
        />
      )}
    </div>
  );
}
