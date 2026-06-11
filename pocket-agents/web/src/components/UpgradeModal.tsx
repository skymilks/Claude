import { useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Modal, ModalHeader } from './Modal';

export function UpgradeModal() {
  const { state, set, refresh, toast } = useStore();
  const [busy, setBusy] = useState(false);
  if (!state) return null;
  const close = () => set({ upgradeOpen: false });
  const used = state.user.usageThisPeriod;

  const upgrade = async () => {
    setBusy(true);
    try {
      await api.upgrade();
      toast({ icon: '🎉', title: 'Welcome to Pro!', body: 'Your monthly token budget just got a lot bigger.' });
      await refresh();
      close();
    } catch (err) {
      toast({ icon: '⚠️', title: 'Upgrade failed', body: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const PlanCard = ({ id }: { id: 'free' | 'pro' }) => {
    const plan = state.plans[id];
    const current = state.user.plan === id;
    return (
      <div className={`flex-1 rounded-xl border p-4 ${id === 'pro' ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-stone-50'}`}>
        <div className="flex items-baseline justify-between">
          <span className="font-bold text-stone-800">{plan.name}</span>
          {current && <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-600">current</span>}
        </div>
        <div className="mt-2 text-2xl font-bold text-stone-800">
          {(plan.tokenCap / 1000).toLocaleString()}K
          <span className="text-sm font-normal text-stone-500"> tokens / month</span>
        </div>
        <ul className="mt-3 space-y-1 text-sm text-stone-600">
          <li>✓ All four agents</li>
          <li>✓ Weekly Boardroom</li>
          {id === 'pro' && <li>✓ Room for a real working cadence</li>}
        </ul>
      </div>
    );
  };

  return (
    <Modal onClose={close}>
      <ModalHeader
        title="Upgrade your plan"
        subtitle={`You've used ${used.toLocaleString()} of ${state.user.tokenCap.toLocaleString()} tokens this month.`}
        onClose={close}
      />
      <div className="p-6">
        <div className="flex gap-3">
          <PlanCard id="free" />
          <PlanCard id="pro" />
        </div>
        {state.user.plan === 'free' ? (
          <>
            <button
              onClick={upgrade}
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-amber-600 py-3 font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? '…' : 'Upgrade to Pro'}
            </button>
            <p className="mt-2 text-center text-xs text-stone-400">
              Demo checkout — payments aren’t wired up yet, this switches your workspace to Pro instantly.
            </p>
          </>
        ) : (
          <p className="mt-4 text-center text-sm text-stone-500">You’re on Pro — thanks for supporting the team! 🎉</p>
        )}
      </div>
    </Modal>
  );
}
