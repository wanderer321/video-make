const BASE = "http://localhost:17321";

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  health: () => request<{ status: string; version: string }>("GET", "/api/health"),

  projects: {
    list: () => request<Project[]>("GET", "/api/projects"),
    get: (id: string) => request<Project>("GET", `/api/projects/${id}`),
    create: (data: ProjectCreate) =>
      request<Project>("POST", "/api/projects", data),
    update: (id: string, data: ProjectCreate) =>
      request<Project>("PATCH", `/api/projects/${id}`, data),
    delete: (id: string) => request<void>("DELETE", `/api/projects/${id}`),
  },

  settings: {
    getAll: () => request<Record<string, Record<string, string>>>("GET", "/api/settings"),
    getConfigured: () =>
      request<{ configured: string[] }>("GET", "/api/settings/configured"),
    getProvider: (provider: string) =>
      request<{ provider: string; data: Record<string, string> }>(
        "GET",
        `/api/settings/${provider}`
      ),
    save: (provider: string, data: Record<string, string>) =>
      request<{ ok: boolean }>("POST", "/api/settings/save", { provider, data }),
    clear: (provider: string) =>
      request<void>("DELETE", `/api/settings/${provider}`),
    test: (provider: string, data: Record<string, string>) =>
      request<{ ok: boolean; message: string }>("POST", "/api/settings/test", {
        provider,
        data,
      }),
  },

  generate: {
    listTasks: () => request<GenTask[]>("GET", "/api/generate/tasks"),
    createTask: (data: TaskCreate) =>
      request<{ id: string; status: string }>("POST", "/api/generate/tasks", data),
    deleteTask: (id: string) =>
      request<void>("DELETE", `/api/generate/tasks/${id}`),
  },

  tts: {
    voices: (provider?: string) =>
      request<{ provider: string; voices: VoiceInfo[] }>(
        "GET",
        `/api/tts/voices${provider ? `?provider=${provider}` : ""}`
      ),
    synthesizeFile: (data: TTSSynthesizeRequest) =>
      request<{ path: string; size: number }>("POST", "/api/tts/synthesize-file", data),
  },
};

export interface Project {
  id: string;
  name: string;
  type: string;
  style?: string;
  description?: string;
  cover_path?: string;
  episode_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectCreate {
  name: string;
  type: string;
  style?: string;
  description?: string;
}

export interface GenTask {
  id: string;
  type: string;
  status: string;
  provider: string;
  output_path?: string;
  error_msg?: string;
  cost_estimate?: number;
  created_at?: string;
  finished_at?: string;
}

export interface TaskCreate {
  type: string;
  provider: string;
  input_params: Record<string, unknown>;
}

export interface VoiceInfo {
  id: string;
  name: string;
  lang: string;
  gender: string;
}

export interface TTSSynthesizeRequest {
  text: string;
  voice?: string;
  provider?: string;
  board_id?: string;
  output_filename?: string;
}
