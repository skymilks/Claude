import { useState } from 'react';
import { useStore } from '../store';
import { api, ApiError } from '../api';
import { Modal, ModalHeader } from './Modal';
import { Sprite } from '../pixel/Sprite';
import { character } from '../pixel/sprites';
import { activeTaskFor, tasksFor, agentById, etaLabel, progressPct, timeAgo } from '../selectors';
import type { Field, StarterTask } from '../types';

const STATUS_ICON: Record<string, string> = { queued: '🕐', running: '⚙️', done: '✅', failed: '⚠️' };

const inDays = (iso: string): string => {
  const days = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
  return days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
};

export function AgentModal() {
  const { state, agentModalId, set, refresh, toast, openResult } = useStore();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [weekly, setWeekly] = useState(false);
  const agent = state ? agentById(state, agentModalId) : undefined;
  if (!state || !agent) return null;

  const close = () => set({ agentModalId: null });
  const active = activeTaskFor(state, agent.id);
  const history = tasksFor(state, agent.id).filter((t) => t.status === 'done' || t.status === 'failed');

  const assign = async () => {
    setBusy(true);
    try {
      const task = await api.createTask(agent.id, values);
      // "Repeat weekly" turns this same brief into a standing routine the
      // agent runs on its own from next week.
      if (weekly) {
        const label = (Object.values(values).find(Boolean) ?? 'Weekly job').slice(0, 60);
        await api.setRoutine(agent.id, { label, freq: 'weekly', input: values }).catch(() => {});
      }
      toast({ icon: '📋', title: `${agent.displayName} is on it`, body: `Est. ~${task.estimatedSeconds}s — runs in the background` });
      setValues({});
      setWeekly(false);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'over_cap') set({ upgradeOpen: true });
      else toast({ icon: '⚠️', title: 'Could not assign', body: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const stopRoutine = async () => {
    await api.clearRoutine(agent.id).catch(() => {});
    await refresh();
  };

  return (
    <Modal onClose={close}>
      <ModalHeader
        title={
          <span className="flex items-center gap-3">
            <Sprite def={character(agent.avatar, 0)} scale={2} />
            {agent.displayName}
            <span className="text-sm font-normal text-amber-600">Lv{agent.level} · {agent.xp} XP</span>
          </span>
        }
        subtitle={
          agent.modelTier === 'premium'
            ? `Premium model (${state.models.premium})`
            : `Standard model (${state.models.standard})`
        }
        onClose={close}
      />
      <div className="max-h-[70vh] overflow-y-auto p-6">
        {agent.routine && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <span className="flex-1">
              ↻ Every week, unasked: <span className="font-semibold">{agent.routine.label}</span>
              {agent.routine.nextRunAt && <span className="text-emerald-600"> · next {inDays(agent.routine.nextRunAt)}</span>}
            </span>
            <button onClick={stopRoutine} className="rounded bg-white px-2 py-1 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100">
              Stop
            </button>
          </div>
        )}
        {active ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
            <div className="flex items-center gap-2 font-semibold text-sky-800">
              <span className="animate-spin">⚙️</span> Working on: {active.title}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded bg-sky-100">
              <div className="h-full bg-sky-500 transition-all" style={{ width: `${progressPct(active, state.now)}%` }} />
            </div>
            <div className="mt-1 text-xs text-sky-700">
              {active.status === 'queued' ? 'Queued — ' : ''}
              {etaLabel(active, state.now)} · runs on the server, you can close this tab
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <StarterIdeas tasks={agent.suggestions} onPick={setValues} />
            {agent.inputSchema.map((field) => (
              <FieldInput key={field.key} field={field} value={values[field.key] ?? ''} onChange={(v) => setValues({ ...values, [field.key]: v })} />
            ))}
            {agent.role !== 'ceo' && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-600">
                <input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} className="accent-emerald-600" />
                ↻ Repeat this every week without asking{agent.routine ? ' (replaces the current routine)' : ''}
              </label>
            )}
            <button
              onClick={assign}
              disabled={busy}
              className="w-full rounded-xl bg-amber-600 py-3 font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? 'Assigning…' : `Assign to ${agent.displayName}`}
            </button>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-stone-500">Recent work</h3>
            <div className="space-y-1.5">
              {history.slice(0, 8).map((task) => (
                <button
                  key={task.id}
                  onClick={() => openResult(task)}
                  className="flex w-full items-center gap-2 rounded-lg border border-stone-150 bg-stone-50 px-3 py-2 text-left text-sm hover:bg-stone-100"
                >
                  <span>{STATUS_ICON[task.status]}</span>
                  <span className="flex-1 truncate text-stone-700">{task.title}</span>
                  {task.rating && <span className="text-xs text-amber-500">{'★'.repeat(task.rating)}</span>}
                  <span className="shrink-0 text-xs text-stone-400">{task.finishedAt ? timeAgo(task.finishedAt) : ''}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Ideas left on the desk: one tap fills the whole task form with a realistic,
// ready-to-run example tailored to the business — nobody starts at a blank
// textarea. Values stay editable before assigning.
export function StarterIdeas({ tasks, onPick }: { tasks: StarterTask[]; onPick: (values: Record<string, string>) => void }) {
  if (!tasks?.length) return null;
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-stone-500">💡 Ideas on the desk — tap one to fill the form, tweak anything</div>
      <div className="flex flex-wrap gap-1.5">
        {tasks.map((task) => (
          <button
            key={task.label}
            onClick={() => onPick({ ...task.input })}
            className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
          >
            {task.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FieldInput({ field, value, onChange }: { field: Field; value: string; onChange: (v: string) => void }) {
  const base = 'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none';
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">
        {field.label} {field.required && <span className="text-red-400">*</span>}
      </span>
      {field.type === 'textarea' ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={5} className={base} />
      ) : field.type === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={base}>
          <option value="">— pick one —</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={base} />
      )}
    </label>
  );
}
