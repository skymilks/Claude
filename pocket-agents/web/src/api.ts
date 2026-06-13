import type { ServerState, Task, Agent, ProspectListItem, DraftAgent, IntakeDraft } from './types';

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
  // The council: ask the VP one question; a panel of four models answers.
  startCouncil: (brief: string) => request<Task>('/api/council', { method: 'POST', body: JSON.stringify({ brief }) }),
  setBusiness: (business: string) =>
    request<{ ok: true }>('/api/workspace/context', { method: 'POST', body: JSON.stringify({ business }) }),
  act: (taskId: string, action: 'copy' | 'save' | 'rerun' | 'rate', rating?: number) =>
    request<{ task: Task; rerunTask: Task | null }>(`/api/tasks/${taskId}/act`, {
      method: 'POST',
      body: JSON.stringify({ action, rating }),
    }),
  markSeen: (taskId: string) => request<{ ok: true }>(`/api/tasks/${taskId}/seen`, { method: 'POST' }),
  deleteTask: (taskId: string) => request<{ ok: true }>(`/api/tasks/${taskId}`, { method: 'DELETE' }),
  convene: () => request<Task>('/api/boardroom/convene', { method: 'POST' }),
  wipeAccount: () => request<{ ok: true }>('/api/account', { method: 'DELETE' }),

  // The intake: pain points in, a proposed team out, approved team seated.
  intakeDraft: (payload: { pains: string; handoff: string; business?: string }) =>
    request<IntakeDraft>('/api/intake/draft', { method: 'POST', body: JSON.stringify(payload) }),
  intakeAccept: (agents: DraftAgent[]) =>
    request<{ ok: true }>('/api/intake/accept', { method: 'POST', body: JSON.stringify({ agents }) }),

  // Standing weekly routines on an agent.
  setRoutine: (agentId: string, routine: { label: string; freq: 'weekly'; input: Record<string, string> }) =>
    request<Agent>(`/api/agents/${agentId}/routine`, { method: 'PUT', body: JSON.stringify({ routine }) }),
  clearRoutine: (agentId: string) => request<Agent>(`/api/agents/${agentId}/routine`, { method: 'DELETE' }),

  // Client office links: visiting one starts a normal session for that
  // workspace — the link is the sign-in.
  enterOffice: (token: string) => request<{ ok: true }>(`/api/office/${token}/enter`, { method: 'POST' }),

  // Founder tools: client offices.
  createProspect: (payload: { name: string; company: string; description: string; websiteUrl: string }) =>
    request<{ id: string; token: string; url: string }>('/api/admin/prospects', { method: 'POST', body: JSON.stringify(payload) }),
  listProspects: () => request<ProspectListItem[]>('/api/admin/prospects'),
  deleteProspect: (id: string) => request<{ ok: true }>(`/api/admin/prospects/${id}`, { method: 'DELETE' }),
  convertProspect: (id: string, email: string, password: string) =>
    request<{ ok: true }>(`/api/admin/prospects/${id}/convert`, { method: 'POST', body: JSON.stringify({ email, password }) }),
};
