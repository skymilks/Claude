import type { ServerState, Task, Agent, ProspectDraft, ProspectListItem, DemoState, DraftAgent } from './types';

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
  signup: (email: string, password: string) =>
    request<{ ok: true }>('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<{ ok: true }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  upgrade: () => request<{ ok: true }>('/api/billing/upgrade', { method: 'POST' }),
  hire: (templateId: string, displayName?: string) =>
    request<Agent>('/api/agents', { method: 'POST', body: JSON.stringify({ templateId, displayName }) }),
  // The empty-desk builder: plain-English answers → drafted agent → seat it.
  draftAgent: (payload: { job: string; handoff: string; business: string }) =>
    request<DraftAgent>('/api/agents/draft', { method: 'POST', body: JSON.stringify(payload) }),
  createCustomAgent: (agent: DraftAgent) =>
    request<Agent>('/api/agents/custom', { method: 'POST', body: JSON.stringify({ agent }) }),
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

  // Founder tools: prospect demo offices.
  draftProspect: (name: string, company: string, description: string, websiteUrl: string) =>
    request<ProspectDraft>('/api/admin/prospects/draft', {
      method: 'POST',
      body: JSON.stringify({ name, company, description, websiteUrl }),
    }),
  createProspect: (payload: { name: string; company: string; brief: string; welcomeLine: string; ctaUrl: string; agents: DraftAgent[] }) =>
    request<{ id: string; token: string; url: string }>('/api/admin/prospects', { method: 'POST', body: JSON.stringify(payload) }),
  listProspects: () => request<ProspectListItem[]>('/api/admin/prospects'),
  deleteProspect: (id: string) => request<{ ok: true }>(`/api/admin/prospects/${id}`, { method: 'DELETE' }),
  convertProspect: (id: string, email: string, password: string) =>
    request<{ ok: true }>(`/api/admin/prospects/${id}/convert`, { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Prospect-side demo experience (token link, no login).
  demoState: (token: string) => request<DemoState>(`/api/demo/${token}`),
  demoTry: (token: string, agentId: string, input: Record<string, string>) =>
    request<Task>(`/api/demo/${token}/try`, { method: 'POST', body: JSON.stringify({ agentId, input }) }),
  demoInterested: (token: string, note: string) =>
    request<{ ok: true }>(`/api/demo/${token}/interested`, { method: 'POST', body: JSON.stringify({ note }) }),
};
