import type { ServerState, Task, Template, Agent } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  return body as T;
}

export const api = {
  state: () => request<ServerState>('/api/state'),
  templates: () => request<Template[]>('/api/templates'),
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
