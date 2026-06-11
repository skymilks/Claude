import { useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Modal, ModalHeader } from './Modal';
import { Markdown } from './Markdown';
import { agentById, taskById } from '../selectors';

export function ResultPanel() {
  const { state, resultTaskId, set, refresh, toast } = useStore();
  const [copied, setCopied] = useState(false);
  const task = state ? taskById(state, resultTaskId) : undefined;
  const agent = state && task ? agentById(state, task.agentId) : undefined;
  if (!state || !task) return null;

  const close = () => set({ resultTaskId: null });

  const act = async (action: 'copy' | 'save' | 'rerun' | 'rate', rating?: number) => {
    try {
      const res = await api.act(task.id, action, rating);
      if (action === 'rerun' && res.rerunTask) {
        toast({ icon: '🔁', title: `${agent?.displayName ?? 'Agent'} is re-running it` });
        close();
      }
      await refresh();
    } catch (err) {
      toast({ icon: '⚠️', title: 'Action failed', body: (err as Error).message });
    }
  };

  const copy = async () => {
    if (!task.output) return;
    await navigator.clipboard.writeText(task.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    act('copy');
  };

  const remove = async () => {
    await api.deleteTask(task.id);
    close();
    refresh();
  };

  const meta = [
    task.finishedAt && new Date(task.finishedAt).toLocaleString(),
    task.modelUsed && `model: ${task.modelUsed}`,
    task.tokensUsed > 0 && `${task.tokensUsed.toLocaleString()} tokens`,
    task.actedAt && '✓ acted on',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Modal wide onClose={close}>
      <ModalHeader
        title={task.kind === 'boardroom' ? `📊 ${task.title}` : task.title}
        subtitle={`${agent?.displayName ?? 'Agent'} · ${meta}`}
        onClose={close}
      />

      <div className="max-h-[58vh] overflow-y-auto px-8 py-6">
        {task.status === 'failed' ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <div className="font-semibold">This task failed</div>
            <div className="mt-1 text-sm">{task.error}</div>
          </div>
        ) : task.output ? (
          <Markdown text={task.output} />
        ) : (
          <div className="text-stone-400">No output.</div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 px-6 py-4">
        {task.status === 'done' && task.output && (
          <>
            <button onClick={copy} className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700">
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
            <button
              onClick={() => act('save')}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              {task.actedAt ? 'Saved ✓' : 'Save'}
            </button>
          </>
        )}
        {task.kind !== 'boardroom' && (
          <button
            onClick={() => act('rerun')}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Re-run
          </button>
        )}
        {task.status === 'done' && (
          <span className="ml-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => act('rate', star)}
                className={`text-xl leading-none ${task.rating && star <= task.rating ? 'text-amber-400' : 'text-stone-300 hover:text-amber-300'}`}
                title={`Rate ${star}/5`}
              >
                ★
              </button>
            ))}
          </span>
        )}
        <span className="flex-1" />
        <button onClick={remove} className="rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50">
          Delete
        </button>
      </div>
    </Modal>
  );
}
