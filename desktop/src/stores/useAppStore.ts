import { create } from "zustand";

interface AppState {
  backendOnline: boolean;
  setBackendOnline: (v: boolean) => void;

  currentProjectId: string;
  currentProjectName: string;
  currentEpisodeId: string;

  setCurrentProject: (id: string, name: string) => void;
  setCurrentEpisode: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  backendOnline: false,
  setBackendOnline: (v) => set({ backendOnline: v }),

  currentProjectId: "",
  currentProjectName: "",
  currentEpisodeId: "",

  setCurrentProject: (id, name) => set({ currentProjectId: id, currentProjectName: name }),
  setCurrentEpisode: (id) => set({ currentEpisodeId: id }),
}));
