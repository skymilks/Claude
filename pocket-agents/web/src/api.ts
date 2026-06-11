import type { ServerState, Task, Template, Agent } from './types';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) throw new ApiError(body.error || `Request failed (${res.status})`, res.status, body.code);
  return body as T;
}

export const api = {
  state: () => request<ServerState>('/api/state'),
  templates: () => request<Template[]>('/api/templates'),
  signup: (email: string, password: string) =>
    request<{ ok: true }>('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<{ ok: true }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  upgrade: () => request<{ ok: true }>('/api/billing/upgrade', { method: 'POST' }),
  hire: (templateId: string, displayName?: string) =>
    request<Agent>('/api/agents', { method: 'POST', body: JSON.stringify({ templateId, displayName }) }),
  createTask: (agentId: string, input: Record<string, string>) =>
    request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify({ agentId, input }) }),
  act: (taskId: string, action: 'copy' | 'save' | 'rerun' | 'rate', rating?: number) =>
    request<{ task: Task; rerunTask: Task | null }>(`/api/tasks/${taskId}/act`, {
      method: 'POST',
      body: JSON.stringify({ action, rating }),
    }),
  markSeen: (taskId: string) => request<{ ok: true }>(`/api/tasks/${taskId}/seen`, { method: 'POST' }),
  deleteTask: (taskId: string) => request<{ ok: true }>(`/api/tasks/${taskId}`, { method: 'DELETE' }),
  convene: () => request<Task>('/api/boardroom/convene', { method: 'POST' }),
  wipeAccount: () => request<{ ok: true }>('/api/account', { method: 'DELETE' }),
};
