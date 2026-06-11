import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api';
import { ding } from '../audio';
import { Sprite } from '../pixel/Sprite';
import { character, standing, desk, CHAIR, PLANT, SHELF, LAMP } from '../pixel/sprites';
import { Modal, ModalHeader } from './Modal';
import { FieldInput, StarterIdeas } from './AgentModal';
import { Markdown } from './Markdown';
import { progressPct, etaLabel } from '../selectors';
import type { DemoState, Agent, Task } from '../types';

// The prospect-side demo: a no-login link that drops them into their own
// pre-built office. The Chief of Staff walks up, greets them by name, gives a
// short first-day tour, and they can try their agents for real — then claim
// the office. This is the founder's closing weapon.

const STAGE_W = 740;
const STAGE_H = 500;
const DESKS = [
  { x: 40, y: 250 },
  { x: 300, y: 250 },
  { x: 540, y: 250 },
];
const CHAIR_DX = 52, CHAIR_DY = -10;
const CHAR_DX = 60, CHAR_DY = -24;
// The greeter's marks: off-stage left → front-and-center → home by the window.
const GREETER = {
  offstage: { x: -70, y: 330 },
  center: { x: 330, y: 320 },
  home: { x: 470, y: 150 },
};
// Where the Chief stands to host a desk while its agent works.
const deskMark = (slot: number) => {
  const d = DESKS[slot] ?? DESKS[0];
  return { x: d.x - 4, y: d.y + 64 };
};

// Live status the Chief speaks while a task runs — tracks real elapsed time
// off progressPct, so no fake timers.
function waitingLine(task: Task, name: string, nowIso: string): string {
  if (task.status === 'queued') return `Getting ${name} started…`;
  const pct = progressPct(task, nowIso);
  if (pct < 30) return `${name}'s on it — reading your request…`;
  if (pct < 70) return `Drafting it now. ${name}'s good at this.`;
  return `Just polishing it up…`;
}

type Phase = 'enter' | 'welcome' | number /* tour step = agent index */ | 'free';

export function DemoExperience({ token }: { token: string }) {
  const [state, setState] = useState<DemoState | null>(null);
  const [gone, setGone] = useState(false);
  const [phase, setPhase] = useState<Phase>('enter');
  const [tryAgentId, setTryAgentId] = useState<string | null>(null);
  const [resultTaskId, setResultTaskId] = useState<string | null>(null);
  const [walkFrame, setWalkFrame] = useState<0 | 1>(0);
  // When a task just finished: the Chief delivers a "here's what they did"
  // beat at the desk before the result modal opens.
  const [doneBeat, setDoneBeat] = useState<{ taskId: string; agentId: string } | null>(null);
  // The prospect raised their hand in the warm close (lifted so every CTA
  // instance reflects it; seeded from the server so a reload stays confirmed).
  const [interested, setInterested] = useState(false);
  const prevStatuses = useRef<Map<string, string> | null>(null);

  // Poll the demo state; ding + host the completion when a task finishes.
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const next = await api.demoState(token);
        if (stop) return;
        if (prevStatuses.current) {
          for (const task of next.tasks) {
            const prev = prevStatuses.current.get(task.id);
            if (prev && prev !== 'done' && prev !== 'failed' && task.status === 'done') {
              ding();
              setDoneBeat({ taskId: task.id, agentId: task.agentId });
            }
          }
        }
        prevStatuses.current = new Map(next.tasks.map((t) => [t.id, t.status]));
        setState(next);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setGone(true);
          stop = true;
        }
      }
    };
    load();
    const id = setInterval(() => !stop && load(), 2500);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [token]);

  // The walk-in: render off-stage first, then move so the CSS transition runs;
  // speak on arrival.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!state || entered) return;
    const t0 = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t0);
  }, [state, entered]);
  useEffect(() => {
    if (!entered || phase !== 'enter') return;
    const t1 = setTimeout(() => setPhase('welcome'), 2100);
    return () => clearTimeout(t1);
  }, [entered, phase]);

  // Responsive stage scaling (same trick as the main Office).
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (containerRef.current?.clientWidth ?? STAGE_W) / STAGE_W));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Which desk the Chief is hosting: the one with a running task, or the one
  // that just finished (during the done beat). null = she's at her own mark.
  const activeTask = state?.tasks.find((t) => t.status === 'queued' || t.status === 'running') ?? null;
  const focusAgentId = doneBeat?.agentId ?? activeTask?.agentId ?? null;
  const focusSlot = focusAgentId ? state?.agents.find((a) => a.id === focusAgentId)?.deskSlot ?? null : null;

  // Where she's headed — used both to place her and to animate her feet while
  // she's in transit (the CSS transition does the gliding).
  const targetKey = !entered ? 'off' : focusSlot != null ? `desk${focusSlot}` : phase === 'free' ? 'home' : 'center';
  const [moving, setMoving] = useState(false);
  const prevTarget = useRef(targetKey);
  useEffect(() => {
    if (prevTarget.current === targetKey) return;
    prevTarget.current = targetKey;
    setMoving(true);
    const t = setTimeout(() => setMoving(false), 1900);
    return () => clearTimeout(t);
  }, [targetKey]);
  const walking = phase === 'enter' || moving;
  useEffect(() => {
    if (!walking) return setWalkFrame(0);
    const id = setInterval(() => setWalkFrame((f) => (f === 0 ? 1 : 0)), 220);
    return () => clearInterval(id);
  }, [walking]);

  // After the "here's what they did" beat, open the result.
  useEffect(() => {
    if (!doneBeat) return;
    const t = setTimeout(() => {
      setResultTaskId(doneBeat.taskId);
      setDoneBeat(null);
    }, 1500);
    return () => clearTimeout(t);
  }, [doneBeat]);

  // Stay confirmed across reloads once the server records the hand-raise.
  useEffect(() => {
    if (state?.interested) setInterested(true);
  }, [state?.interested]);

  if (gone) {
    return (
      <Shell>
        <div className="mx-auto mt-24 max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="text-3xl">🌙</div>
          <h1 className="mt-3 text-lg font-bold text-stone-800">This office has closed for the night</h1>
          <p className="mt-2 text-sm text-stone-500">The demo link is no longer active. Reply to the message that brought you here and we'll open it back up.</p>
        </div>
      </Shell>
    );
  }

  if (!state) {
    return (
      <Shell>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="font-pixel text-sm text-[#6b4f2e]">UNLOCKING YOUR OFFICE…</div>
        </div>
      </Shell>
    );
  }

  const { prospect, agents } = state;
  const firstName = (prospect.name ?? '').split(/\s+/)[0] || 'there';
  const runsLeft = Math.max(0, state.demoRunCap - state.demoRunsUsed);
  const tourIndex = typeof phase === 'number' ? phase : null;
  const greeterAt =
    !entered ? GREETER.offstage : focusSlot != null ? deskMark(focusSlot) : phase === 'free' ? GREETER.home : GREETER.center;
  const tryAgent = agents.find((a) => a.id === tryAgentId) ?? null;
  const resultTask = state.tasks.find((t) => t.id === resultTaskId) ?? null;
  const anyActive = !!activeTask;

  // While she's at a desk, the Chief narrates the work instead of the tour.
  const activeAgent = activeTask ? agents.find((a) => a.id === activeTask.agentId) ?? null : null;
  const doneAgent = doneBeat ? agents.find((a) => a.id === doneBeat.agentId) ?? null : null;
  const narration =
    doneBeat && doneAgent
      ? `Here's what ${doneAgent.displayName} put together —`
      : activeTask && activeAgent
        ? waitingLine(activeTask, activeAgent.displayName, state.now)
        : null;

  const dialogue =
    phase === 'welcome'
      ? {
          text: prospect.welcomeLine || `Hey ${firstName}, welcome to ${prospect.company}'s office! I'm your Chief of Staff — let me show you around.`,
          button: 'Show me around →',
          onNext: () => setPhase(0),
          skip: true,
        }
      : tourIndex !== null && agents[tourIndex]
        ? {
            text: `This is ${agents[tourIndex].displayName} — ${(agents[tourIndex].tagline || 'part of your new team').replace(/\.$/, '')}. ${
              tourIndex < agents.length - 1
                ? ''
                : `That's the team, ${firstName} — click anyone to put them to work${
                    agents.some((a) => a.suggestions?.length) ? '; I left a few ideas on their desks to get you started' : ''
                  }. The first ${state.demoRunCap} tasks are on us.`
            }`,
            button: tourIndex < agents.length - 1 ? 'Next →' : "Let's get to work!",
            onNext: () => setPhase(tourIndex < agents.length - 1 ? tourIndex + 1 : 'free'),
            skip: tourIndex < agents.length - 1,
          }
        : null;

  return (
    <Shell company={prospect.company} ctaUrl={prospect.ctaUrl}>
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-4 text-center">
          <h1 className="font-pixel text-sm text-[#5d4326]">{(prospect.company || 'YOUR').toUpperCase()} — HQ</h1>
          <p className="mt-2 text-sm text-stone-600">
            {phase === 'free' ? (
              runsLeft > 0 ? (
                <>Click an agent to give them real work — <b>{runsLeft} free {runsLeft === 1 ? 'run' : 'runs'}</b> left.</>
              ) : (
                <>Your free runs are used up — claim the office to keep the team.</>
              )
            ) : (
              <>Your team is already here. Built for {prospect.company}.</>
            )}
          </p>
        </div>

        {/* the stage */}
        <div ref={containerRef} className="mx-auto w-full max-w-[760px]" style={{ height: STAGE_H * scale }}>
          <div className="office-stage relative overflow-hidden rounded-xl" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <div className="office-wall absolute inset-x-0 top-0 h-[96px]" />
            <div className="office-floor absolute inset-x-0 top-[96px] bottom-0" />
            <div className="office-window absolute left-[100px] top-[20px] h-[58px] w-[140px]">
              <span className="office-window-bar" />
            </div>
            <div className="font-pixel absolute left-1/2 top-[34px] -translate-x-1/2 whitespace-nowrap text-[11px] text-[#5d4326]">
              ★ {(prospect.company || 'HQ').toUpperCase().slice(0, 18)} ★
            </div>
            {/* decor */}
            <div className="absolute left-[612px] top-[8px]"><Sprite def={SHELF} scale={5} /></div>
            <div className="absolute left-[18px] top-[300px] drop-shadow-[0_8px_6px_rgba(0,0,0,0.25)]"><Sprite def={LAMP} scale={5} /></div>
            <div className="office-lampglow absolute left-[4px] top-[150px] h-[240px] w-[240px]" />
            <div className="absolute left-[648px] top-[330px] drop-shadow-[0_10px_8px_rgba(0,0,0,0.25)]"><Sprite def={PLANT} scale={6} /></div>

            {agents.slice(0, 3).map((agent, i) => (
              <DemoAgentDesk
                key={agent.id}
                agent={agent}
                slot={DESKS[agent.deskSlot] ?? DESKS[i]}
                state={state}
                highlight={tourIndex === i}
                clickable={phase === 'free'}
                onClick={() => phase === 'free' && setTryAgentId(agent.id)}
              />
            ))}

            {/* the Chief of Staff — your greeter and guide */}
            <div
              className="absolute z-10"
              style={{
                left: greeterAt.x,
                top: greeterAt.y,
                transition: 'left 1.9s ease-in-out, top 1.9s ease-in-out',
              }}
            >
              <div className={phase === 'free' ? 'animate-[bob_1.8s_ease-in-out_infinite]' : ''}>
                <Sprite def={standing('ceo', walking ? walkFrame : 0)} scale={4} />
              </div>
              <div className="-ml-[16px] mt-1 w-[96px] text-center">
                <div className="inline-block rounded bg-[#00000066] px-1.5 py-0.5 text-[11px] font-semibold text-white">Chief of Staff</div>
              </div>
            </div>

            {/* dialogue box — the Chief's narration takes precedence over the tour */}
            {(narration || dialogue) && (
              <div className="absolute inset-x-[40px] bottom-[16px] z-20 rounded-xl border-4 border-[#5d4326] bg-[#faf3e6] p-4 shadow-xl">
                <Typewriter key={narration ?? dialogue!.text} text={narration ?? dialogue!.text} />
                {!narration && dialogue && (
                  <div className="mt-3 flex items-center justify-end gap-3">
                    {dialogue.skip && (
                      <button onClick={() => setPhase('free')} className="text-xs font-semibold text-stone-400 hover:text-stone-600">
                        Skip tour
                      </button>
                    )}
                    <button
                      onClick={dialogue.onNext}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-700"
                    >
                      {dialogue.button}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="office-vignette pointer-events-none absolute inset-0" />
          </div>
        </div>

        {/* below the stage: runs + working state + CTA */}
        <div className="mx-auto mt-4 max-w-xl space-y-3 pb-16 text-center">
          {anyActive && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
              <span className="animate-spin inline-block">⚙️</span> Your team is working — results appear here automatically.
            </div>
          )}
          {phase === 'free' && (
            <ClaimCard
              token={token}
              firstName={firstName}
              company={prospect.company}
              ctaUrl={prospect.ctaUrl}
              interested={interested}
              onInterested={() => setInterested(true)}
              subtle={!interested && runsLeft > 0 && !state.tasks.some((t) => t.status === 'done')}
            />
          )}
          <div className="text-xs text-stone-400">
            A personalized preview built for {prospect.name} · powered by Pocket Agents
          </div>
        </div>
      </div>

      {tryAgent && (
        <DemoTaskModal
          token={token}
          agent={tryAgent}
          runsLeft={runsLeft}
          firstName={firstName}
          ctaUrl={prospect.ctaUrl}
          interested={interested}
          onInterested={() => setInterested(true)}
          onQueued={() => setTryAgentId(null)}
          onClose={() => setTryAgentId(null)}
        />
      )}
      {resultTask && (
        <DemoResultModal
          task={resultTask}
          state={state}
          token={token}
          firstName={firstName}
          ctaUrl={prospect.ctaUrl}
          company={prospect.company}
          interested={interested}
          onInterested={() => setInterested(true)}
          onClose={() => setResultTaskId(null)}
        />
      )}
    </Shell>
  );
}

function Shell({ children, company, ctaUrl }: { children: React.ReactNode; company?: string; ctaUrl?: string | null }) {
  return (
    <div className="min-h-screen bg-[#f3e7d3]">
      <header className="sticky top-0 z-30 border-b-4 border-[#d8c4a0] bg-[#faf3e6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <span className="font-pixel text-sm text-[#5d4326]">POCKET AGENTS</span>
          {company && <span className="hidden text-sm text-stone-500 sm:block">· a team built for {company}</span>}
          <span className="flex-1" />
          {ctaUrl && (
            <a
              href={ctaUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
            >
              Claim your office →
            </a>
          )}
        </div>
      </header>
      <main className="pt-6">{children}</main>
    </div>
  );
}

function Typewriter({ text }: { text: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const id = setInterval(() => setShown((n) => (n >= text.length ? n : n + 2)), 24);
    return () => clearInterval(id);
  }, [text]);
  return (
    <p className="min-h-[2.5rem] text-sm leading-relaxed text-stone-800">
      {text.slice(0, shown)}
      {shown < text.length && <span className="animate-pulse">▌</span>}
    </p>
  );
}

function DemoAgentDesk({
  agent,
  slot,
  state,
  highlight,
  clickable,
  onClick,
}: {
  agent: Agent;
  slot: { x: number; y: number };
  state: DemoState;
  highlight: boolean;
  clickable: boolean;
  onClick: () => void;
}) {
  const active = state.tasks.find((t) => t.agentId === agent.id && (t.status === 'queued' || t.status === 'running'));
  const [frame, setFrame] = useState<0 | 1>(0);
  useEffect(() => {
    if (!active) return setFrame(0);
    const id = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 450);
    return () => clearInterval(id);
  }, [!!active]);

  return (
    <button
      onClick={onClick}
      className={`absolute text-left transition ${clickable ? 'cursor-pointer hover:brightness-105' : 'cursor-default'}`}
      style={{ left: slot.x, top: slot.y, width: 184, height: 210 }}
    >
      {highlight && <div className="absolute inset-x-0 top-[-20px] h-[200px] animate-pulse rounded-2xl border-4 border-amber-400" />}
      <div className="absolute left-[8px] top-[150px] h-[22px] w-[200px] rounded-[50%] bg-black/25 blur-[3px]" />

      <div className="absolute" style={{ left: CHAIR_DX, top: CHAIR_DY }}>
        <Sprite def={CHAIR} scale={4} />
      </div>
      <div className="absolute" style={{ left: CHAR_DX, top: CHAR_DY }}>
        {active && (
          <div className="absolute -top-6 left-[32px] z-10 -translate-x-1/2 animate-pulse rounded-md border-2 border-[#5d4326] bg-white px-1 text-sm">💭</div>
        )}
        {/* ideas waiting on this desk, not yet tried */}
        {!active && clickable && (agent.suggestions?.length ?? 0) > 0 && !state.tasks.some((t) => t.agentId === agent.id) && (
          <div className="absolute -top-6 left-[32px] z-10 -translate-x-1/2 animate-bounce rounded-md border-2 border-[#5d4326] bg-white px-1 text-sm">💡</div>
        )}
        <div className={active ? '' : 'animate-[bob_2.6s_ease-in-out_infinite]'}>
          <Sprite def={character(agent.avatar, active ? frame : 0)} scale={4} />
        </div>
      </div>
      <div className="absolute left-0 top-0">
        <Sprite def={desk(!!active)} scale={4} />
      </div>
      <div className="absolute left-0 top-[166px] w-full text-center">
        <div className="inline-block rounded bg-[#00000066] px-2 py-0.5 text-[12px] font-semibold text-white">{agent.displayName}</div>
        {active && (
          <div className="mx-auto mt-1 h-1.5 w-[96px] overflow-hidden rounded bg-[#00000040]">
            <div className="h-full bg-[#7fd4ff] transition-all" style={{ width: `${progressPct(active, state.now)}%` }} />
          </div>
        )}
      </div>
    </button>
  );
}

function DemoTaskModal({
  token,
  agent,
  runsLeft,
  firstName,
  ctaUrl,
  interested,
  onInterested,
  onQueued,
  onClose,
}: {
  token: string;
  agent: Agent;
  runsLeft: number;
  firstName: string;
  ctaUrl: string | null;
  interested: boolean;
  onInterested: () => void;
  onQueued: () => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.demoTry(token, agent.id, values);
      onQueued();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        title={
          <span className="flex items-center gap-3">
            <Sprite def={character(agent.avatar, 0)} scale={2} />
            {agent.displayName}
          </span>
        }
        subtitle={agent.tagline || 'Give them something real — this runs for real.'}
        onClose={onClose}
      />
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
        {runsLeft <= 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <div className="font-semibold text-emerald-900">That's your team in action, {firstName}.</div>
            <p className="mb-3 mt-1 text-sm text-emerald-800">
              The free runs are used up — but {agent.displayName} and the rest are ready to go full-time.
            </p>
            <ClaimAction token={token} firstName={firstName} ctaUrl={ctaUrl} interested={interested} onInterested={onInterested} />
          </div>
        ) : (
          <>
            <StarterIdeas tasks={agent.suggestions} onPick={setValues} />
            {agent.inputSchema.map((field) => (
              <FieldInput key={field.key} field={field} value={values[field.key] ?? ''} onChange={(v) => setValues({ ...values, [field.key]: v })} />
            ))}
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <button
              onClick={submit}
              disabled={busy}
              className="w-full rounded-xl bg-amber-600 py-3 font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? 'Assigning…' : `Put ${agent.displayName} to work (${runsLeft} free ${runsLeft === 1 ? 'run' : 'runs'} left)`}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

function DemoResultModal({
  task,
  state,
  token,
  firstName,
  ctaUrl,
  company,
  interested,
  onInterested,
  onClose,
}: {
  task: Task;
  state: DemoState;
  token: string;
  firstName: string;
  ctaUrl: string | null;
  company: string;
  interested: boolean;
  onInterested: () => void;
  onClose: () => void;
}) {
  const agent = state.agents.find((a) => a.id === task.agentId);
  const [copied, setCopied] = useState(false);

  if (task.status === 'queued' || task.status === 'running') {
    return (
      <Modal onClose={onClose}>
        <ModalHeader title={`${agent?.displayName ?? 'Agent'} is working…`} onClose={onClose} />
        <div className="p-6">
          <div className="h-2 overflow-hidden rounded bg-sky-100">
            <div className="h-full bg-sky-500 transition-all" style={{ width: `${progressPct(task, state.now)}%` }} />
          </div>
          <div className="mt-2 text-xs text-sky-700">{etaLabel(task, state.now)}</div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} wide>
      <ModalHeader
        title={
          <span className="flex items-center gap-3">
            {agent && <Sprite def={character(agent.avatar, 0)} scale={2} />}
            {agent?.displayName ?? 'Agent'} delivered
          </span>
        }
        subtitle={task.title}
        onClose={onClose}
      />
      <div className="max-h-[70vh] overflow-y-auto p-6">
        {task.status === 'failed' ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{task.error}</div>
        ) : (
          <>
            <Markdown text={task.output ?? ''} />
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(task.output ?? '');
                  setCopied(true);
                }}
                className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-200"
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="font-semibold text-emerald-900">This took your team a minute. Imagine it every day.</div>
              <p className="mb-3 mt-1 text-sm text-emerald-800">
                {company}'s office is built and ready — agents, history, the lot. We just hand you the keys.
              </p>
              <ClaimAction token={token} firstName={firstName} ctaUrl={ctaUrl} interested={interested} onInterested={onInterested} />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function ClaimCard({
  token,
  firstName,
  company,
  ctaUrl,
  interested,
  onInterested,
  subtle,
}: {
  token: string;
  firstName: string;
  company: string;
  ctaUrl: string | null;
  interested: boolean;
  onInterested: () => void;
  subtle: boolean;
}) {
  if (subtle) return null;
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-5 text-center shadow-sm">
      <div className="font-semibold text-stone-800">Like your new team?</div>
      <p className="mb-3 mt-1 text-sm text-stone-600">This office was built just for {company}. Say the word and they start Monday.</p>
      <ClaimAction token={token} firstName={firstName} ctaUrl={ctaUrl} interested={interested} onInterested={onInterested} />
    </div>
  );
}

// The one-tap "I want this" — the single sold-action across every CTA spot.
// On send it flags the demo HOT for the founder; once raised, it stays
// confirmed (and offers a booking link as a gentle secondary step).
function ClaimAction({
  token,
  firstName,
  ctaUrl,
  interested,
  onInterested,
}: {
  token: string;
  firstName: string;
  ctaUrl: string | null;
  interested: boolean;
  onInterested: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (interested) {
    return (
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
          ✓ They know you're interested
        </div>
        <p className="text-sm text-emerald-800">Amazing — I'll tell the team you're coming, {firstName}. Talk soon.</p>
        {ctaUrl && (
          <a href={ctaUrl} target="_blank" rel="noreferrer" className="inline-block text-sm font-semibold text-emerald-700 underline">
            Want to grab a time now? →
          </a>
        )}
      </div>
    );
  }

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.demoInterested(token, note);
      onInterested();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow hover:bg-emerald-700"
      >
        Yes — I want my team →
      </button>
    );
  }

  return (
    <div className="space-y-2 text-left">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Anything you want me to know? (optional)"
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      />
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button
        onClick={send}
        disabled={busy}
        className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? 'Sending…' : 'Send — have them reach out'}
      </button>
    </div>
  );
}
