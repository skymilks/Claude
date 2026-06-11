import { useStore } from '../store';
import { activeTaskFor, tasksFor, timeAgo, etaLabel } from '../selectors';

// The cosmetics-off mode: every bit of real work — assigning, status,
// results — fully usable as a plain professional list.
export function ListView() {
  const { state, set, openResult } = useStore();
  if (!state) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {state.agents.length === 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-500">
          No agents yet —{' '}
          <button className="font-semibold text-amber-600 hover:underline" onClick={() => set({ hireOpen: true })}>
            hire your first
          </button>
          .
        </div>
      )}
      {state.agents.map((agent) => {
        const active = activeTaskFor(state, agent.id);
        const recent = tasksFor(state, agent.id).filter((t) => t.status !== 'queued' && t.status !== 'running');
        return (
          <div key={agent.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div>
                <span className="font-bold text-stone-800">{agent.displayName}</span>
                <span className="ml-2 text-xs text-stone-400">
                  {agent.role} · Lv{agent.level} · {agent.modelTier === 'premium' ? 'premium model' : 'standard model'}
                </span>
              </div>
              <span className="flex-1" />
              {active ? (
                <span className="text-sm text-sky-600">
                  ⚙️ {active.title} — {etaLabel(active, state.now)}
                </span>
              ) : (
                <button
                  onClick={() => set({ agentModalId: agent.id })}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Assign task
                </button>
              )}
            </div>
            {recent.length > 0 && (
              <div className="mt-3 space-y-1">
                {recent.slice(0, 4).map((task) => (
                  <button
                    key={task.id}
                    onClick={() => openResult(task)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-stone-50"
                  >
                    <span>{task.status === 'done' ? (task.seenAt ? '📄' : '✅') : '⚠️'}</span>
                    <span className="flex-1 truncate text-stone-600">{task.title}</span>
                    {task.rating && <span className="text-xs text-amber-500">{'★'.repeat(task.rating)}</span>}
                    <span className="text-xs text-stone-400">{task.finishedAt ? timeAgo(task.finishedAt) : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
