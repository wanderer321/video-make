import { create } from "zustand";
import { api, type Project } from "@/lib/api";

interface ProjectState {
  projects: Project[];
  loading: boolean;
  fetch: () => Promise<void>;
  create: (data: { name: string; type: string; style?: string; description?: string }) => Promise<Project>;
  remove: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const projects = await api.projects.list();
      set({ projects });
    } finally {
      set({ loading: false });
    }
  },

  create: async (data) => {
    const project = await api.projects.create(data);
    set({ projects: [project, ...get().projects] });
    return project;
  },

  remove: async (id) => {
    await api.projects.delete(id);
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },
}));
