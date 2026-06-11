import { useState } from 'react';
import { useStore } from '../store';
import { api, ApiError } from '../api';
import { Modal, ModalHeader } from './Modal';
import { Sprite } from '../pixel/Sprite';
import { character } from '../pixel/sprites';
import type { DraftAgent } from '../types';

// The empty desk: describe a job in plain English, Claude drafts the hire —
// name, instructions, task form, and a ready-to-run first task — review it,
// then seat them. This replaces the old pick-from-a-gallery hiring flow.
export function AgentBuilder() {
  const { set, refresh, toast, state } = useStore();
  const [job, setJob] = useState('');
  const [handoff, setHandoff] = useState('');
  const [business, setBusiness] = useState('');
  const [draft, setDraft] = useState<DraftAgent | null>(null);
  const [busy, setBusy] = useState<'draft' | 'create' | null>(null);

  const close = () => set({ builderOpen: false });
  const input = 'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none';

  const doDraft = async () => {
    setBusy('draft');
    try {
      setDraft(await api.draftAgent({ job, handoff, business }));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'over_cap') set({ upgradeOpen: true });
      else toast({ icon: '⚠️', title: 'Could not draft the hire', body: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const doCreate = async () => {
    if (!draft) return;
    setBusy('create');
    try {
      const agent = await api.createCustomAgent(draft);
      toast({ icon: '🪑', title: `${agent.displayName} took the empty desk!`, body: 'Click them to put them to work.' });
      await refresh();
      close();
    } catch (err) {
      toast({ icon: '⚠️', title: 'Could not seat them', body: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const deskFree = state ? [0, 1, 2, 4].some((slot) => !state.agents.some((a) => a.deskSlot === slot)) : true;

  return (
    <Modal onClose={close}>
      <ModalHeader
        title="🪑 The empty desk"
        subtitle="Describe the job in plain English — we'll draft the hire, you approve them."
        onClose={close}
      />
      <div className="max-h-[75vh] space-y-4 overflow-y-auto p-6">
        {!deskFree && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-stone-700">
            Every desk is taken — your office is fully staffed.
          </div>
        )}

        {deskFree && !draft && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">
                What job do you want done? <span className="text-red-400">*</span>
              </span>
              <input
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder="e.g. Chase unpaid invoices without souring the relationship"
                className={input}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">
                What should they hand you, and what does great look like? <span className="text-red-400">*</span>
              </span>
              <textarea
                value={handoff}
                onChange={(e) => setHandoff(e.target.value)}
                rows={3}
                placeholder="e.g. A short, friendly reminder email I can send as-is. Firm but never awkward — these are repeat customers."
                className={input}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">Anything about your business they should know? (optional)</span>
              <textarea
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                rows={2}
                placeholder="e.g. Family-run landscaping company, ~30 regular clients, most invoices are $200-800."
                className={input}
              />
            </label>
            <button
              onClick={doDraft}
              disabled={busy !== null || !job.trim() || !handoff.trim()}
              className="w-full rounded-xl bg-amber-600 py-3 font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50"
            >
              {busy === 'draft' ? 'Drafting your hire…' : '✨ Draft this hire'}
            </button>
          </>
        )}

        {deskFree && draft && (
          <>
            <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <div className="rounded-lg bg-[#e8dcc8] p-2">
                <Sprite def={character(draft.avatar, 0)} scale={3} />
              </div>
              <span className="min-w-0 flex-1">
                <input
                  value={draft.displayName}
                  onChange={(e) => setDraft({ ...draft, displayName: e.target.value.slice(0, 24) })}
                  className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-bold text-stone-800 hover:border-stone-300 focus:border-amber-500 focus:outline-none"
                />
                <span className="block px-1 text-xs text-stone-500">{draft.tagline}</span>
              </span>
            </div>

            {draft.starterTasks.length > 0 && (
              <div className="text-xs text-stone-500">
                💡 Comes with {draft.starterTasks.length === 1 ? 'a ready-to-run first task' : `${draft.starterTasks.length} ready-to-run tasks`}:{' '}
                {draft.starterTasks.map((t) => `“${t.label}”`).join(', ')}
              </div>
            )}

            <details className="rounded-lg border border-stone-200 bg-white">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-stone-600">Their instructions (edit if you like)</summary>
              <div className="border-t border-stone-100 p-3">
                <textarea
                  value={draft.systemPrompt}
                  onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
                  rows={8}
                  className={`${input} font-mono text-xs`}
                />
              </div>
            </details>

            <div className="flex gap-2">
              <button
                onClick={() => setDraft(null)}
                className="rounded-xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-600 hover:bg-stone-50"
              >
                ← Start over
              </button>
              <button
                onClick={doCreate}
                disabled={busy !== null}
                className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy === 'create' ? 'Pulling up their chair…' : `🪑 Seat ${draft.displayName || 'them'} at the desk`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
