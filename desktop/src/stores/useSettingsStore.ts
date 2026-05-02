import { create } from "zustand";
import { api } from "@/lib/api";

interface SettingsState {
  configs: Record<string, Record<string, string>>;
  configured: string[];
  loading: boolean;
  fetch: () => Promise<void>;
  save: (provider: string, data: Record<string, string>) => Promise<void>;
  clear: (provider: string) => Promise<void>;
  test: (provider: string, data: Record<string, string>) => Promise<{ ok: boolean; message: string }>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  configs: {},
  configured: [],
  loading: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const [configs, configuredData] = await Promise.all([
        api.settings.getAll(),
        api.settings.getConfigured(),
      ]);
      set({ configs, configured: configuredData.configured });
    } finally {
      set({ loading: false });
    }
  },

  save: async (provider, data) => {
    await api.settings.save(provider, data);
    const configured = get().configured;
    if (!configured.includes(provider)) {
      configured.push(provider);
    }
    set({
      configs: { ...get().configs, [provider]: data },
      configured: [...configured],
    });
  },

  clear: async (provider) => {
    await api.settings.clear(provider);
    set({
      configs: { ...get().configs, [provider]: {} },
      configured: get().configured.filter((p) => p !== provider),
    });
  },

  test: async (provider, data) => {
    return api.settings.test(provider, data);
  },
}));
