import { useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Modal, ModalHeader } from './Modal';
import { Sprite } from '../pixel/Sprite';
import { character } from '../pixel/sprites';

export function HireModal() {
  const { templates, state, set, refresh, toast } = useStore();
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  if (!state) return null;

  const hire = async (templateId: string) => {
    setBusy(templateId);
    try {
      const agent = await api.hire(templateId, names[templateId]);
      toast({ icon: '🤝', title: `${agent.displayName} joined the team!` });
      await refresh();
    } catch (err) {
      toast({ icon: '⚠️', title: 'Could not hire', body: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal wide onClose={() => set({ hireOpen: false })}>
      <ModalHeader
        title="Hiring gallery"
        subtitle="Your executive team. Each agent does real work — the office is just for fun."
        onClose={() => set({ hireOpen: false })}
      />
      <div className="grid gap-4 p-6 sm:grid-cols-2">
        {templates.map((t) => {
          const hired = state.agents.some((a) => a.role === t.role);
          return (
            <div key={t.id} className="flex flex-col rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#e8dcc8] p-2">
                  <Sprite def={character(t.avatar, 0)} scale={3} />
                </div>
                <div>
                  <div className="font-bold text-stone-800">{t.name}</div>
                  <div className="text-xs text-stone-500">{t.tagline}</div>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      t.modelTier === 'premium' ? 'bg-purple-100 text-purple-700' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {t.modelTier === 'premium' ? '✦ Premium model' : 'Standard model'}
                  </span>
                </div>
              </div>
              <p className="mt-3 flex-1 text-sm text-stone-600">{t.description}</p>
              {hired ? (
                <div className="mt-3 rounded-lg bg-emerald-100 px-3 py-2 text-center text-sm font-semibold text-emerald-700">
                  On the team ✓
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <input
                    value={names[t.id] ?? ''}
                    onChange={(e) => setNames({ ...names, [t.id]: e.target.value })}
                    placeholder={`Name (default: ${t.name})`}
                    maxLength={24}
                    className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    onClick={() => hire(t.id)}
                    disabled={busy === t.id}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {busy === t.id ? '…' : 'Hire'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
