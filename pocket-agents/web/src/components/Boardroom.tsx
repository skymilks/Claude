import { useStore } from '../store';
import { api } from '../api';
import { Modal, ModalHeader } from './Modal';
import { Markdown } from './Markdown';
import { boardroomReports, timeAgo } from '../selectors';

const BLOCKED_COPY: Record<string, string> = {
  hire_ceo: 'Hire the Chief of Staff to hold a Boardroom.',
  in_flight: 'The team is convening right now…',
  no_new_work: 'No new completed work since the last Boardroom — give the team some tasks first.',
};

export function Boardroom() {
  const { state, set, refresh, toast, openResult } = useStore();
  if (!state) return null;
  const close = () => set({ boardroomOpen: false });
  const { boardroom } = state;
  const reports = boardroomReports(state);
  const latest = reports.find((t) => t.status === 'done');
  const actedCount = state.tasks.filter((t) => t.actedAt).length;

  const convene = async () => {
    try {
      await api.convene();
      toast({ icon: '🏛️', title: 'The team is convening', body: 'Your strategy brief will be ready in a few minutes.' });
      await refresh();
    } catch (err) {
      toast({ icon: '⚠️', title: 'Boardroom unavailable', body: (err as Error).message });
    }
  };

  return (
    <Modal wide onClose={close}>
      <ModalHeader
        title="🏛️ The Boardroom"
        subtitle="Once a week the whole team convenes and the Chief of Staff presents how to improve the business — on the premium model."
        onClose={close}
      />
      <div className="max-h-[70vh] overflow-y-auto p-6">
        {!boardroom.unlocked ? (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-6 text-center">
            <div className="text-4xl">🔒</div>
            <div className="mt-2 font-bold text-stone-800">Unlocks with valuable usage</div>
            <p className="mx-auto mt-1 max-w-md text-sm text-stone-600">
              Act on <b>5</b> agent outputs (copy, save, re-run, or rate them highly) to unlock the weekly Boardroom.
            </p>
            <div className="mx-auto mt-4 h-3 w-64 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full bg-amber-500 transition-all" style={{ width: `${Math.min(100, (actedCount / 5) * 100)}%` }} />
            </div>
            <div className="mt-1 text-xs text-stone-500">{Math.min(actedCount, 5)} / 5</div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            {boardroom.canConvene ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-amber-900">The board is ready to convene</div>
                  <div className="text-sm text-amber-800">
                    {boardroom.completedSinceLast} completed task{boardroom.completedSinceLast === 1 ? '' : 's'} since the last meeting.
                  </div>
                </div>
                <button onClick={convene} className="rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white shadow hover:bg-amber-700">
                  Convene Boardroom
                </button>
              </div>
            ) : (
              <div className="text-sm text-amber-900">
                {boardroom.blockedReason === 'cooldown' && boardroom.dueAt
                  ? `Next Boardroom available ${new Date(boardroom.dueAt).toLocaleDateString()} — it convenes automatically when the team has fresh work.`
                  : BLOCKED_COPY[boardroom.blockedReason ?? ''] ?? 'Unavailable right now.'}
              </div>
            )}
          </div>
        )}

        {latest && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-stone-500">Latest presentation</h3>
            <div className="rounded-xl border border-stone-200 p-6">
              <Markdown text={latest.output ?? ''} />
            </div>
          </div>
        )}

        {reports.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-stone-500">Past boardrooms</h3>
            <div className="space-y-1.5">
              {reports.map((task) => (
                <button
                  key={task.id}
                  onClick={() => openResult(task)}
                  className="flex w-full items-center gap-2 rounded-lg border border-stone-150 bg-stone-50 px-3 py-2 text-left text-sm hover:bg-stone-100"
                >
                  <span>{task.status === 'done' ? '📊' : task.status === 'failed' ? '⚠️' : '⚙️'}</span>
                  <span className="flex-1 truncate text-stone-700">{task.title}</span>
                  <span className="shrink-0 text-xs text-stone-400">{timeAgo(task.finishedAt ?? task.createdAt)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
