import type { ServerState, Task, Agent } from './types';

export const activeTaskFor = (state: ServerState, agentId: string): Task | undefined =>
  state.tasks.find((t) => t.agentId === agentId && (t.status === 'queued' || t.status === 'running'));

export const tasksFor = (state: ServerState, agentId: string): Task[] =>
  state.tasks.filter((t) => t.agentId === agentId);

export const unseenDone = (state: ServerState): Task[] =>
  state.tasks.filter((t) => t.status === 'done' && !t.seenAt);

export const agentById = (state: ServerState, id: string | null): Agent | undefined =>
  state.agents.find((a) => a.id === id);

export const taskById = (state: ServerState, id: string | null): Task | undefined =>
  state.tasks.find((t) => t.id === id);

export const hasCosmetic = (state: ServerState, key: string): boolean =>
  state.unlocks.some((u) => u.key === key);

export const boardroomReports = (state: ServerState): Task[] =>
  state.tasks.filter((t) => t.kind === 'boardroom');

export function progressPct(task: Task, nowIso: string): number {
  if (task.status === 'done' || task.status === 'failed') return 100;
  if (task.status === 'queued' || !task.startedAt) return 4;
  const elapsed = (new Date(nowIso).getTime() - new Date(task.startedAt).getTime()) / 1000;
  return Math.min(95, Math.round((elapsed / Math.max(task.estimatedSeconds, 1)) * 100));
}

export function etaLabel(task: Task, nowIso: string): string {
  if (task.status === 'queued') return `~${task.estimatedSeconds}s once started`;
  if (!task.startedAt) return `~${task.estimatedSeconds}s`;
  const elapsed = (new Date(nowIso).getTime() - new Date(task.startedAt).getTime()) / 1000;
  const left = Math.round(task.estimatedSeconds - elapsed);
  return left > 0 ? `~${left}s left` : 'wrapping up…';
}

export const timeAgo = (iso: string): string => {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};
