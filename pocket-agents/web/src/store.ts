import { create } from 'zustand';
import { api } from './api';
import { ding } from './audio';
import type { ServerState, Template, Task } from './types';

type Toast = { id: number; icon: string; title: string; body?: string };

type Store = {
  state: ServerState | null;
  templates: Template[];
  toasts: Toast[];
  cosmeticsOff: boolean;
  // ui
  hireOpen: boolean;
  agentModalId: string | null; // agent panel (assign / progress)
  resultTaskId: string | null;
  boardroomOpen: boolean;
  trayOpen: boolean;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  set: (partial: Partial<Store>) => void;
  openResult: (task: Task) => void;
};

let toastSeq = 1;
let initialized = false; // StrictMode double-mounts; only ever start one poll loop
let prevStatuses: Map<string, string> | null = null;
let prevUnlockKeys: Set<string> | null = null;

export const useStore = create<Store>((set, get) => ({
  state: null,
  templates: [],
  toasts: [],
  cosmeticsOff: localStorage.getItem('cosmeticsOff') === '1',
  hireOpen: false,
  agentModalId: null,
  resultTaskId: null,
  boardroomOpen: false,
  trayOpen: false,

  set: (partial) => {
    if ('cosmeticsOff' in partial) localStorage.setItem('cosmeticsOff', partial.cosmeticsOff ? '1' : '0');
    set(partial as Store);
  },

  init: async () => {
    if (initialized) return;
    initialized = true;
    const [templates, state] = await Promise.all([api.templates(), api.state()]);
    prevStatuses = new Map(state.tasks.map((t) => [t.id, t.status]));
    prevUnlockKeys = new Set(state.unlocks.map((u) => u.key));
    set({ templates, state });
    setInterval(() => get().refresh(), 2500);
  },

  refresh: async () => {
    let next: ServerState;
    try {
      next = await api.state();
    } catch {
      return; // transient network blip; next poll will recover
    }

    // a task just finished → ding + toast
    if (prevStatuses) {
      for (const task of next.tasks) {
        const prev = prevStatuses.get(task.id);
        if (prev && prev !== 'done' && prev !== 'failed' && task.status === 'done') {
          ding();
          const agent = next.agents.find((a) => a.id === task.agentId);
          get().toast({
            icon: task.kind === 'boardroom' ? '📊' : '📬',
            title: `${agent?.displayName ?? 'Agent'} delivered`,
            body: task.title,
          });
        }
        if (prev && prev !== 'failed' && task.status === 'failed') {
          const agent = next.agents.find((a) => a.id === task.agentId);
          get().toast({ icon: '⚠️', title: `${agent?.displayName ?? 'Agent'} hit a problem`, body: task.error ?? undefined });
        }
      }
    }
    prevStatuses = new Map(next.tasks.map((t) => [t.id, t.status]));

    // new unlocks → celebrate
    if (prevUnlockKeys) {
      for (const unlock of next.unlocks) {
        if (!prevUnlockKeys.has(unlock.key)) {
          get().toast({ icon: unlock.icon, title: `Unlocked: ${unlock.name}`, body: unlock.desc });
        }
      }
    }
    prevUnlockKeys = new Set(next.unlocks.map((u) => u.key));

    set({ state: next });
  },

  toast: ({ icon, title, body }) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts, { id, icon, title, body }] }));
    setTimeout(() => get().dismissToast(id), 6000);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  openResult: (task) => {
    set({ resultTaskId: task.id, trayOpen: false, agentModalId: null, boardroomOpen: false });
    if (!task.seenAt) {
      api.markSeen(task.id).then(() => get().refresh());
    }
  },
}));
