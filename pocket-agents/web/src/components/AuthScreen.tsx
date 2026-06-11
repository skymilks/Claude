import { useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Sprite } from '../pixel/Sprite';
import { character } from '../pixel/sprites';

export function AuthScreen() {
  const { afterAuth, set } = useStore();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') await api.signup(email, password);
      else await api.login(email, password);
      await afterAuth();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3e7d3] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex items-end justify-center gap-2">
          {(['sales', 'pm', 'researcher', 'ceo'] as const).map((role) => (
            <Sprite key={role} def={character(role, 0)} scale={3} />
          ))}
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
          <h1 className="font-pixel text-center text-sm text-[#5d4326]">POCKET AGENTS</h1>
          <p className="mt-2 text-center text-sm text-stone-500">
            Your executive team of AI agents. Real work, cozy office.
          </p>

          <div className="mt-5 grid grid-cols-2 rounded-lg bg-stone-100 p-1 text-sm font-semibold">
            {(['signup', 'login'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`rounded-md py-1.5 transition ${mode === m ? 'bg-white text-stone-800 shadow' : 'text-stone-500'}`}
              >
                {m === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-4 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={input}
              autoComplete="email"
            />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Password (8+ characters)' : 'Password'}
              className={input}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-amber-600 py-3 font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? '…' : mode === 'signup' ? 'Open your office' : 'Back to the office'}
            </button>
          </form>

          <button
            onClick={() => set({ privacyOpen: true })}
            className="mt-4 w-full text-center text-xs text-stone-400 underline hover:text-stone-600"
          >
            How we handle your data
          </button>
        </div>
      </div>
    </div>
  );
}
