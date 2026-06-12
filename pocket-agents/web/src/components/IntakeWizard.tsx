import { useState } from 'react';
import { useStore } from '../store';
import { api, ApiError } from '../api';
import { Sprite } from '../pixel/Sprite';
import { character } from '../pixel/sprites';
import type { DraftAgent, IntakeDraft } from '../types';

// The first-run intake: before anyone sits at a desk, the Chief of Staff asks
// the owner what's actually eating their week. Those answers (plus whatever
// business info was preloaded) drive the team draft, and the owner approves,
// renames, or skips every hire — nobody gets agents they didn't choose.

const PAIN_CHIPS = [
  'Chasing quotes & follow-ups',
  'Writing emails & messages',
  'Scheduling & planning the week',
  'Marketing & social media',
  'Answering customer questions',
  'Paperwork & admin',
  'Pricing & research',
];

type Step = 'hello' | 'pains' | 'handoff' | 'business' | 'drafting' | 'review';

export function IntakeWizard() {
  const { state, refresh, toast } = useStore();
  const [step, setStep] = useState<Step>('hello');
  const [picked, setPicked] = useState<string[]>([]);
  const [painDetail, setPainDetail] = useState('');
  const [handoff, setHandoff] = useState('');
  const [business, setBusiness] = useState('');
  const [draft, setDraft] = useState<IntakeDraft | null>(null);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [noRoutine, setNoRoutine] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state) return null;
  const ws = state.workspace;
  const firstName = (ws.name ?? '').split(/\s+/)[0] || null;
  const hasBusinessInfo = !!ws.brief;

  const pains = [...picked, painDetail.trim()].filter(Boolean).join('; ');

  const requestDraft = async () => {
    setStep('drafting');
    setError(null);
    try {
      const result = await api.intakeDraft({ pains, handoff: handoff.trim(), business: business.trim() });
      setDraft(result);
      setSkipped(new Set());
      setNoRoutine(new Set());
      setStep('review');
    } catch (err) {
      setError((err as Error).message);
      setStep(hasBusinessInfo ? 'handoff' : 'business');
    }
  };

  const hire = async () => {
    if (!draft) return;
    const team = draft.agents
      .filter((_, i) => !skipped.has(i))
      .map((agent, i) => ({ ...agent, routine: noRoutine.has(i) ? null : agent.routine }));
    if (team.length === 0) return;
    setBusy(true);
    try {
      await api.intakeAccept(team);
      toast({ icon: '🎉', title: 'Your team is in', body: 'Every desk has ideas waiting — tap an agent to start.' });
      await refresh();
    } catch (err) {
      toast({ icon: '⚠️', title: 'Could not seat the team', body: (err as Error).message });
      if (err instanceof ApiError && err.status === 409) await refresh();
    } finally {
      setBusy(false);
    }
  };

  const teamSize = draft ? draft.agents.length - skipped.size : 0;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#f3e7d3]">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-4 py-10">
        {/* The Chief hosts every step */}
        <div className="mb-6 flex items-end gap-4">
          <div className="shrink-0 rounded-2xl border-4 border-[#d8c4a0] bg-[#faf3e6] p-3">
            <Sprite def={character('ceo', 0)} scale={4} />
          </div>
          <ChiefLine step={step} firstName={firstName} welcomeLine={ws.welcomeLine} error={error} />
        </div>

        {step === 'hello' && (
          <Card>
            <p className="text-sm text-stone-600">
              Three quick questions, then I'll put together a team built around what's actually slowing you down. You
              approve every hire before anyone sits down.
            </p>
            <button onClick={() => setStep('pains')} className={primaryBtn}>
              Let's do it →
            </button>
          </Card>
        )}

        {step === 'pains' && (
          <Card>
            <div className="flex flex-wrap gap-2">
              {PAIN_CHIPS.map((chip) => {
                const on = picked.includes(chip);
                return (
                  <button
                    key={chip}
                    onClick={() => setPicked(on ? picked.filter((c) => c !== chip) : [...picked, chip])}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold shadow-sm transition ${
                      on ? 'border-amber-500 bg-amber-500 text-white' : 'border-stone-300 bg-white text-stone-600 hover:border-amber-400'
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
            <textarea
              value={painDetail}
              onChange={(e) => setPainDetail(e.target.value)}
              rows={2}
              placeholder="Anything else? The more specific, the better — e.g. “quotes go out and I never hear back”"
              className={input}
            />
            <button onClick={() => setStep('handoff')} disabled={!pains} className={primaryBtn}>
              Next →
            </button>
          </Card>
        )}

        {step === 'handoff' && (
          <Card>
            <textarea
              value={handoff}
              onChange={(e) => setHandoff(e.target.value)}
              rows={3}
              placeholder="e.g. “Following up every quote until it's a yes or a no” — dream big, this is the brief"
              className={input}
            />
            <div className="flex gap-2">
              <button onClick={() => setStep('pains')} className={ghostBtn}>
                ← Back
              </button>
              <button onClick={() => (hasBusinessInfo ? requestDraft() : setStep('business'))} className={primaryBtn}>
                {hasBusinessInfo ? 'Build my team →' : 'Next →'}
              </button>
            </div>
          </Card>
        )}

        {step === 'business' && (
          <Card>
            <textarea
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              rows={3}
              placeholder="e.g. “Residential plumbing in Calgary, 8 staff — mostly emergency repairs and renos, work comes from referrals and Google”"
              className={input}
            />
            <div className="flex gap-2">
              <button onClick={() => setStep('handoff')} className={ghostBtn}>
                ← Back
              </button>
              <button onClick={requestDraft} disabled={!business.trim()} className={primaryBtn}>
                Build my team →
              </button>
            </div>
          </Card>
        )}

        {step === 'drafting' && (
          <Card>
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <span className="animate-spin">⚙️</span> Reading what you told me and drafting the right people for it…
            </div>
          </Card>
        )}

        {step === 'review' && draft && (
          <div className="space-y-3">
            {draft.agents.map((agent, i) => (
              <HireCard
                key={i}
                agent={agent}
                skipped={skipped.has(i)}
                routineOn={!!agent.routine && !noRoutine.has(i)}
                onToggleSkip={() => setSkipped(toggle(skipped, i))}
                onToggleRoutine={() => setNoRoutine(toggle(noRoutine, i))}
                onRename={(name) =>
                  setDraft({
                    ...draft,
                    agents: draft.agents.map((a, j) => (j === i ? { ...a, displayName: name.slice(0, 24) } : a)),
                  })
                }
              />
            ))}
            <div className="flex gap-2">
              <button onClick={requestDraft} className={ghostBtn} title="Not the right team? Ask for a fresh draft">
                ↺ Re-draft
              </button>
              <button onClick={hire} disabled={busy || teamSize === 0} className={primaryBtn}>
                {busy ? 'Seating them…' : teamSize === 1 ? 'Hire this agent' : `Hire my team (${teamSize})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChiefLine({
  step,
  firstName,
  welcomeLine,
  error,
}: {
  step: Step;
  firstName: string | null;
  welcomeLine: string | null;
  error: string | null;
}) {
  const hey = firstName ? `Hey ${firstName}!` : 'Hey!';
  const lines: Record<Step, string> = {
    hello: welcomeLine || `${hey} I'm your Chief of Staff. Before I bring anyone in — tell me about your week.`,
    pains: 'What eats most of your week? Pick everything that hurts.',
    handoff: 'If you could hand one thing off forever, what would it be?',
    business: 'Last one — what does the business actually do?',
    drafting: 'Got it. Give me a moment…',
    review: 'Here\'s who I\'d bring in — rename anyone, skip anyone. You\'re the boss.',
  };
  return (
    <div className="relative flex-1 rounded-2xl border-2 border-[#d8c4a0] bg-white p-4 shadow-sm">
      <span className="absolute -left-2 bottom-4 h-4 w-4 rotate-45 border-b-2 border-l-2 border-[#d8c4a0] bg-white" />
      <p className="text-sm font-medium text-stone-700">{error ? `Hm — ${error} Let's try that again.` : lines[step]}</p>
    </div>
  );
}

// One proposed hire: approve (default), rename, peek at the job description,
// keep or skip the suggested weekly routine, or skip the hire entirely.
function HireCard({
  agent,
  skipped,
  routineOn,
  onToggleSkip,
  onToggleRoutine,
  onRename,
}: {
  agent: DraftAgent;
  skipped: boolean;
  routineOn: boolean;
  onToggleSkip: () => void;
  onToggleRoutine: () => void;
  onRename: (name: string) => void;
}) {
  return (
    <div className={`rounded-2xl border-2 bg-white p-4 shadow-sm transition ${skipped ? 'border-stone-200 opacity-50' : 'border-[#d8c4a0]'}`}>
      <div className="flex items-center gap-3">
        <Sprite def={character(agent.avatar, 0)} scale={3} />
        <div className="min-w-0 flex-1">
          <input
            value={agent.displayName}
            onChange={(e) => onRename(e.target.value)}
            disabled={skipped}
            className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-semibold text-stone-800 hover:border-stone-300 focus:border-amber-500 focus:outline-none"
          />
          <p className="px-1 text-xs text-stone-500">{agent.tagline}</p>
        </div>
        <button
          onClick={onToggleSkip}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
            skipped ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
          }`}
        >
          {skipped ? 'Bring them back' : 'Skip this hire'}
        </button>
      </div>
      {!skipped && (
        <div className="mt-3 space-y-2">
          {agent.starterTasks.length > 0 && (
            <p className="text-xs text-stone-500">
              💡 Ready on their desk: {agent.starterTasks.map((t) => `“${t.label}”`).join(' · ')}
            </p>
          )}
          {agent.routine && (
            <button
              onClick={onToggleRoutine}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                routineOn ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-stone-50 text-stone-400'
              }`}
            >
              <span>{routineOn ? '✓' : '○'}</span> ↻ Every week, unasked: {agent.routine.label}
            </button>
          )}
          <details>
            <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">Read their full job description</summary>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-stone-50 p-3 font-mono text-[11px] leading-relaxed text-stone-600">
              {agent.systemPrompt}
            </p>
          </details>
        </div>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 rounded-2xl border-2 border-[#d8c4a0] bg-[#faf3e6] p-5 shadow-sm">{children}</div>;
}

function toggle(set: Set<number>, i: number) {
  const next = new Set(set);
  if (next.has(i)) next.delete(i);
  else next.add(i);
  return next;
}

const input = 'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none';
const primaryBtn =
  'rounded-xl bg-amber-600 px-6 py-2.5 font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50';
const ghostBtn = 'rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50';
