import { useStore } from '../store';
import { unseenDone, agentById, timeAgo } from '../selectors';

// In-app "ready" notifications — the v1 baseline for hearing back from agents
// (web push is a possible v2 enhancement).
export function Tray() {
  const { state, openResult } = useStore();
  if (!state) return null;
  const items = unseenDone(state);

  return (
    <div className="absolute right-0 top-12 z-30 w-80 rounded-xl border border-stone-200 bg-white p-2 shadow-xl">
      {items.length === 0 ? (
        <div className="p-4 text-center text-sm text-stone-400">Nothing new — assign some work!</div>
      ) : (
        items.map((task) => {
          const agent = agentById(state, task.agentId);
          return (
            <button
              key={task.id}
              onClick={() => openResult(task)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-stone-50"
            >
              <span className="text-lg">{task.kind === 'boardroom' ? '📊' : '✅'}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-stone-700">
                  {agent?.displayName ?? 'Agent'} delivered
                </span>
                <span className="block truncate text-xs text-stone-500">{task.title}</span>
              </span>
              <span className="shrink-0 text-xs text-stone-400">{task.finishedAt ? timeAgo(task.finishedAt) : ''}</span>
            </button>
          );
        })
      )}
    </div>
  );
}
