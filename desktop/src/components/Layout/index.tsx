import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAppStore } from "@/stores/useAppStore";
import { api } from "@/lib/api";

export function Layout() {
  const setBackendOnline = useAppStore((s) => s.setBackendOnline);

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
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
