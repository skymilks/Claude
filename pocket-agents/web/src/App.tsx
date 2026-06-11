import { useEffect, useState } from 'react';
import { useStore } from './store';
import { api } from './api';
import { Office } from './components/Office';
import { ListView } from './components/ListView';
import { HireModal } from './components/HireModal';
import { AgentModal } from './components/AgentModal';
import { ResultPanel } from './components/ResultPanel';
import { Boardroom } from './components/Boardroom';
import { Tray } from './components/Tray';
import { Unlocks } from './components/Unlocks';
import { AuthScreen } from './components/AuthScreen';
import { UpgradeModal } from './components/UpgradeModal';
import { PrivacyModal } from './components/PrivacyModal';
import { unseenDone } from './selectors';

export default function App() {
  const store = useStore();
  const { state, authed } = store;
  const [unlocksOpen, setUnlocksOpen] = useState(false);

  useEffect(() => {
    store.init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authed === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3e7d3]">
        <div className="font-pixel text-sm text-[#6b4f2e]">LOADING OFFICE…</div>
      </div>
    );
  }

  if (authed === false || !state) {
    return (
      <>
        <AuthScreen />
        {store.privacyOpen && <PrivacyModal />}
      </>
    );
  }

  const unseen = unseenDone(state).length;
  const xpPct = state.company.nextLevelXp
    ? Math.min(100, Math.round((state.company.xp / state.company.nextLevelXp) * 100))
    : 100;
  const usagePct = Math.min(100, Math.round((state.user.usageThisPeriod / state.user.tokenCap) * 100));

  const wipe = async () => {
    if (!confirm('Delete ALL agents, tasks, and unlocks in this workspace? This cannot be undone.')) return;
    await api.wipeAccount();
    store.set({ menuOpen: false });
    location.reload();
  };

  const anyDropdownOpen = store.trayOpen || store.menuOpen;

  return (
    <div className="min-h-screen bg-[#f3e7d3] pb-16">
      <header className="sticky top-0 z-30 border-b-4 border-[#d8c4a0] bg-[#faf3e6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <h1 className="font-pixel text-sm text-[#5d4326]">POCKET AGENTS</h1>

          <div className="flex items-center gap-2" title={`${state.company.xp} XP`}>
            <span className="rounded-md bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">Lv{state.company.level}</span>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-[#e2d3b6]">
              <div className="h-full bg-amber-500" style={{ width: `${xpPct}%` }} />
            </div>
          </div>

          <button
            onClick={() => store.set({ upgradeOpen: true })}
            className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-700"
            title={`${state.user.usageThisPeriod.toLocaleString()} of ${state.user.tokenCap.toLocaleString()} tokens used this month`}
          >
            <div className="h-2 w-20 overflow-hidden rounded-full bg-[#e2d3b6]">
              <div
                className={`h-full ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-orange-400' : 'bg-emerald-500'}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <span>
              {usagePct}% · {state.plans[state.user.plan].name}
            </span>
            {state.user.plan === 'free' && <span className="font-semibold text-amber-600">Upgrade</span>}
          </button>

          {state.demoMode && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700" title="Set ANTHROPIC_API_KEY on the server for real outputs">
              demo mode
            </span>
          )}

          <span className="flex-1" />

          <nav className="relative flex items-center gap-1.5">
            <HeaderButton onClick={() => store.set({ hireOpen: true })}>🤝 Hire</HeaderButton>
            <HeaderButton onClick={() => store.set({ boardroomOpen: true })}>
              🏛️ Boardroom
              {state.boardroom.unlocked && state.boardroom.canConvene && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500" />
              )}
            </HeaderButton>
            <HeaderButton onClick={() => setUnlocksOpen(true)}>🏆</HeaderButton>
            <HeaderButton onClick={() => store.set({ trayOpen: !store.trayOpen, menuOpen: false })}>
              📬
              {unseen > 0 && (
                <span className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {unseen}
                </span>
              )}
            </HeaderButton>
            <HeaderButton
              onClick={() => store.set({ cosmeticsOff: !store.cosmeticsOff })}
              title="Toggle the game layer — all work is fully usable without it"
            >
              {store.cosmeticsOff ? '🏢' : '📋'}
            </HeaderButton>
            <HeaderButton onClick={() => store.set({ menuOpen: !store.menuOpen, trayOpen: false })}>⚙️</HeaderButton>
            {store.trayOpen && <Tray />}
            {store.menuOpen && (
              <div className="absolute right-0 top-12 z-30 w-64 rounded-xl border border-stone-200 bg-white p-2 shadow-xl">
                <div className="truncate px-3 py-1.5 text-xs font-semibold text-stone-400">{state.user.email}</div>
                <a
                  href="/api/account/export"
                  download
                  onClick={() => store.set({ menuOpen: false })}
                  className="block rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  ⬇️ Export all my data (JSON)
                </a>
                <button
                  onClick={() => store.set({ privacyOpen: true, menuOpen: false })}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
                >
                  🔒 How we handle your data
                </button>
                <button onClick={wipe} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                  🗑️ Delete all my data
                </button>
                <button
                  onClick={() => store.logout()}
                  className="mt-1 block w-full rounded-lg border-t border-stone-100 px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
                >
                  👋 Sign out
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* click-outside closes header dropdowns */}
      {anyDropdownOpen && (
        <div className="fixed inset-0 z-20" onClick={() => store.set({ trayOpen: false, menuOpen: false })} />
      )}

      <main className="mx-auto max-w-5xl px-4 pt-6">
        {state.agents.length === 0 && (
          <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
            <div className="font-pixel text-xs text-[#5d4326]">WELCOME, CEO</div>
            <p className="mt-2 text-sm text-stone-600">
              Build your executive team of AI agents. They do real work — outreach, plans, research — while the office
              keeps it fun.
            </p>
            <button
              onClick={() => store.set({ hireOpen: true })}
              className="mt-4 rounded-xl bg-amber-600 px-6 py-3 font-semibold text-white shadow hover:bg-amber-700"
            >
              Hire your first agent
            </button>
          </div>
        )}
        {store.cosmeticsOff ? <ListView /> : <Office />}
      </main>

      {store.hireOpen && <HireModal />}
      {store.agentModalId && <AgentModal />}
      {store.resultTaskId && <ResultPanel />}
      {store.boardroomOpen && <Boardroom />}
      {store.upgradeOpen && <UpgradeModal />}
      {store.privacyOpen && <PrivacyModal />}
      {unlocksOpen && <Unlocks onClose={() => setUnlocksOpen(false)} />}

      {/* toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {store.toasts.map((toast) => (
          <button
            key={toast.id}
            onClick={() => store.dismissToast(toast.id)}
            className="toast-in flex w-72 items-start gap-2 rounded-xl border border-stone-200 bg-white p-3 text-left shadow-lg"
          >
            <span className="text-xl">{toast.icon}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-stone-800">{toast.title}</span>
              {toast.body && <span className="block truncate text-xs text-stone-500">{toast.body}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HeaderButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="relative rounded-lg border border-[#d8c4a0] bg-white px-2.5 py-1.5 text-sm font-semibold text-stone-700 shadow-sm hover:bg-amber-50"
    >
      {children}
    </button>
  );
}
