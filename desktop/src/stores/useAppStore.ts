import { create } from "zustand";

interface AppState {
  backendOnline: boolean;
  setBackendOnline: (v: boolean) => void;

  currentProjectId: string;
  currentProjectName: string;
  currentEpisodeId: string;

  // Workflow state
  workflowStep: number; // 0-7, which pipeline step the user is on
  dramaType: string; // project drama type
  aspectRatio: string; // project aspect ratio (9:16, 16:9, 1:1)
  firstVisit: boolean; // whether this is the user's first visit

  setCurrentProject: (id: string, name: string) => void;
  setCurrentEpisode: (id: string) => void;
  setWorkflowStep: (step: number) => void;
  setDramaType: (type: string) => void;
  setAspectRatio: (ratio: string) => void;
  setFirstVisit: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  backendOnline: false,
  setBackendOnline: (v) => set({ backendOnline: v }),

  currentProjectId: "",
  currentProjectName: "",
  currentEpisodeId: "",

  workflowStep: 0,
  dramaType: "",
  aspectRatio: "9:16",
  firstVisit: true,

  setCurrentProject: (id, name) => set({ currentProjectId: id, currentProjectName: name }),
  setCurrentEpisode: (id) => set({ currentEpisodeId: id }),
  setWorkflowStep: (step) => set({ workflowStep: step }),
  setDramaType: (type) => set({ dramaType: type }),
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  setFirstVisit: (v) => set({ firstVisit: v }),
}));
