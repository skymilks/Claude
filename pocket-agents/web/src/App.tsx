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
import { unseenDone } from './selectors';

export default function App() {
  const store = useStore();
  const { state } = store;
  const [unlocksOpen, setUnlocksOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    store.init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3e7d3]">
        <div className="font-pixel text-sm text-[#6b4f2e]">LOADING OFFICE…</div>
      </div>
    );
  }

  const unseen = unseenDone(state).length;
  const xpPct = state.company.nextLevelXp
    ? Math.min(100, Math.round((state.company.xp / state.company.nextLevelXp) * 100))
    : 100;

  const wipe = async () => {
    if (!confirm('Delete ALL agents, tasks, and unlocks? This cannot be undone.')) return;
    await api.wipeAccount();
    setMenuOpen(false);
    location.reload();
  };

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

          <span className="text-xs text-stone-500">
            {state.user.usageThisPeriod.toLocaleString()} tokens · {state.user.plan} plan
          </span>
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
            <HeaderButton onClick={() => store.set({ trayOpen: !store.trayOpen })}>
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
            <HeaderButton onClick={() => setMenuOpen(!menuOpen)}>⚙️</HeaderButton>
            {store.trayOpen && <Tray />}
            {menuOpen && (
              <div className="absolute right-0 top-12 z-30 w-60 rounded-xl border border-stone-200 bg-white p-2 shadow-xl">
                <a
                  href="/api/account/export"
                  download
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  ⬇️ Export all my data (JSON)
                </a>
                <button onClick={wipe} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                  🗑️ Delete all my data
                </button>
                <div className="mt-1 border-t border-stone-100 px-3 py-2 text-[11px] leading-snug text-stone-400">
                  Your task inputs & outputs stay in the local database and are sent only to the AI provider to generate
                  results. Don’t paste regulated data.
                </div>
              </div>
            )}
          </nav>
        </div>
      </header>

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
