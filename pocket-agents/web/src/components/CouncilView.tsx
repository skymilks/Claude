import { useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Markdown } from './Markdown';
import { progressPct, etaLabel, timeAgo } from '../selectors';
import type { CouncilDraft, ModelStats, RosterSeat, Task } from '../types';

// The product's core surface: the CEO asks their VP one question; a panel of
// four AI models each answers; their reports are scored and a winner crowned;
// a synthesis merges the best into one executive brief. No pixel office, no
// pathfinding — just the bake-off.
export function CouncilView() {
  const state = useStore((s) => s.state)!;

  if (state.workspace.needsBusiness) return <BusinessCapture />;

  const councilTasks = state.tasks
    .filter((t) => t.kind === 'council')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const current = councilTasks[0];

  return (
    <div className="space-y-6">
      <AskBar busy={!!current && (current.status === 'queued' || current.status === 'running')} />
      <Panel roster={state.roster} />
      {current ? (
        <CouncilStage task={current} now={state.now} />
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-[#d8c4a0] bg-white/50 p-10 text-center text-sm text-stone-500">
          Ask your VP anything above — pricing calls, hard decisions, messy situations. The panel will weigh in and you'll get one decisive brief.
        </div>
      )}
      {councilTasks.length > 1 && <History tasks={councilTasks.slice(1)} />}
    </div>
  );
}

// --- the ask -----------------------------------------------------------------

function AskBar({ busy }: { busy: boolean }) {
  const { toast, refresh } = useStore();
  const [brief, setBrief] = useState('');
  const [sending, setSending] = useState(false);

  const ask = async () => {
    const q = brief.trim();
    if (!q || busy || sending) return;
    setSending(true);
    try {
      await api.startCouncil(q);
      setBrief('');
      await refresh();
    } catch (err) {
      toast({ icon: '⚠️', title: 'Could not reach the panel', body: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border-2 border-[#d8c4a0] bg-[#faf3e6] p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-stone-800 text-sm text-white">VP</span>
        <div className="text-sm font-semibold text-stone-700">Ask your VP</div>
        <span className="text-xs text-stone-400">— they'll put it to the panel</span>
      </div>
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') ask();
        }}
        rows={3}
        placeholder="e.g. Should we add a free tier to our product? Make the call and tell me why."
        className="w-full resize-none rounded-xl border border-[#d8c4a0] bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-amber-400"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-stone-400">⌘/Ctrl + Enter to send</span>
        <button
          onClick={ask}
          disabled={!brief.trim() || busy || sending}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Panel in session…' : sending ? 'Sending…' : 'Ask the panel →'}
        </button>
      </div>
    </section>
  );
}

// --- the panel roster --------------------------------------------------------

const STAT_LABELS: [keyof ModelStats, string][] = [
  ['reasoning', 'Reasoning'],
  ['knowledge', 'Knowledge'],
  ['speed', 'Speed'],
  ['creativity', 'Creativity'],
  ['rigor', 'Rigor'],
];

function StatBars({ stats }: { stats: ModelStats }) {
  return (
    <div className="space-y-1">
      {STAT_LABELS.map(([key, label]) => (
        <div key={key} className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-[10px] uppercase tracking-wide text-stone-400">{label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200">
            <div className="h-full rounded-full bg-stone-500" style={{ width: `${(stats[key] / 10) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Avatar({ brand, color, size = 36 }: { brand: string; color: string; size?: number }) {
  const initials = brand.replace(/^Claude\s+/, '').slice(0, 2).toUpperCase();
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ background: color, width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials}
    </span>
  );
}

function Panel({ roster }: { roster: RosterSeat[] }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
        Your panel
        <span className="font-normal normal-case text-stone-400">— four models compete; the best of each is merged</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {roster.map((seat) => (
          <div key={seat.modelKey} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Avatar brand={seat.brand} color={seat.color} />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-stone-800">{seat.brand}</div>
                <div className="truncate text-[11px] text-stone-500">{seat.title}</div>
              </div>
            </div>
            <StatBars stats={seat.stats} />
            <div className="mt-2 text-[10px] font-medium uppercase tracking-wide text-stone-400">
              {seat.live ? `${seat.provider} · live` : 'Claude seat'}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- the stage: a live council, then the scoreboard + brief ------------------

function CouncilStage({ task, now }: { task: Task; now: string }) {
  const result = task.drafts;
  const live = task.status === 'queued' || task.status === 'running';
  const brief = task.input?.brief ?? task.title;

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
        <span className="font-semibold text-stone-700">You asked:</span> {brief}
        {result?.refinedBrief && result.refinedBrief !== brief && (
          <div className="mt-1 text-xs text-stone-500">
            <span className="font-semibold">VP framed it as:</span> {result.refinedBrief}
          </div>
        )}
      </div>

      {task.status === 'failed' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          The panel couldn't finish: {task.error}
        </div>
      )}

      {live && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            The panel is deliberating… <span className="text-stone-400">{etaLabel(task, now)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${progressPct(task, now)}%` }} />
          </div>
        </div>
      )}

      {result && result.drafts.length > 0 && <Scoreboard drafts={result.drafts} winner={result.winner} live={live} />}

      {task.status === 'done' && task.output && <FinalBrief output={task.output} />}
    </section>
  );
}

function Scoreboard({ drafts, winner, live }: { drafts: CouncilDraft[]; winner: string; live: boolean }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {drafts.map((d) => {
        const isWinner = !live && d.modelKey === winner && d.ok;
        return (
          <button
            key={d.modelKey}
            onClick={() => d.ok && setOpenKey(openKey === d.modelKey ? null : d.modelKey)}
            className={`relative rounded-xl border bg-white p-3 text-left shadow-sm transition ${
              isWinner ? 'border-amber-400 ring-2 ring-amber-300' : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            {isWinner && <span className="absolute -top-2 -right-2 text-lg" title="Top report">👑</span>}
            <div className="flex items-center gap-2">
              <Avatar brand={d.brand} color={d.color} size={30} />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-stone-800">{d.brand}</div>
                <div className="truncate text-[11px] text-stone-500">{d.title}</div>
              </div>
            </div>
            <div className="mt-2 flex items-end justify-between">
              {!d.ok ? (
                <span className="text-xs font-medium text-red-500">no answer</span>
              ) : live ? (
                <span className="flex items-center gap-1 text-xs text-stone-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> thinking…
                </span>
              ) : (
                <span className="text-2xl font-extrabold tabular-nums text-stone-800">{d.score ?? '—'}</span>
              )}
              {!live && d.ok && <span className="text-[10px] text-stone-400">tap to read</span>}
            </div>
            {!live && d.ok && d.scoreNote && (
              <div className="mt-1 line-clamp-2 text-[11px] leading-tight text-stone-500">{d.scoreNote}</div>
            )}
            {openKey === d.modelKey && (
              <div className="mt-2 max-h-72 overflow-auto rounded-lg bg-stone-50 p-2 text-xs">
                <Markdown text={d.text} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// The deliverable: the merged executive brief, with the dissent split out.
function FinalBrief({ output }: { output: string }) {
  const [body, dissent] = splitDissent(output);
  const { toast } = useStore();
  const copy = () => {
    navigator.clipboard.writeText(output).then(() => toast({ icon: '📋', title: 'Brief copied' }));
  };
  return (
    <div className="rounded-2xl border-2 border-[#d8c4a0] bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-pixel text-xs text-[#5d4326]">THE VP'S BRIEF</div>
        <button onClick={copy} className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50">
          📋 Copy
        </button>
      </div>
      <Markdown text={body} />
      {dissent && (
        <details className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-amber-800">⚖️ The dissent — the counterpoint not to ignore</summary>
          <div className="mt-2 text-sm text-amber-900">
            <Markdown text={dissent} />
          </div>
        </details>
      )}
    </div>
  );
}

function splitDissent(output: string): [string, string | null] {
  const m = output.match(/\n#{2,3}\s*Dissent\s*\n/i);
  if (!m || m.index === undefined) return [output, null];
  return [output.slice(0, m.index).trim(), output.slice(m.index + m[0].length).trim()];
}

// --- past briefs -------------------------------------------------------------

function History({ tasks }: { tasks: Task[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const shown = tasks.find((t) => t.id === open);
  return (
    <section>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Earlier briefs</div>
      <div className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
        {tasks.slice(0, 12).map((t) => (
          <button
            key={t.id}
            onClick={() => setOpen(open === t.id ? null : t.id)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-stone-50"
          >
            <span className="text-sm">{t.status === 'done' ? '✅' : t.status === 'failed' ? '⚠️' : '⏳'}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-stone-700">{t.title}</span>
            <span className="shrink-0 text-xs text-stone-400">{timeAgo(t.createdAt)}</span>
          </button>
        ))}
      </div>
      {shown && shown.status === 'done' && (
        <div className="mt-3">
          <CouncilStage task={shown} now={new Date().toISOString()} />
        </div>
      )}
    </section>
  );
}

// --- first-run: tell the VP about the business -------------------------------

function BusinessCapture() {
  const { refresh, toast } = useStore();
  const [business, setBusiness] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const v = business.trim();
    if (v.length < 10) return;
    setSaving(true);
    try {
      await api.setBusiness(v);
      await refresh();
    } catch (err) {
      toast({ icon: '⚠️', title: 'Could not save', body: (err as Error).message });
      setSaving(false);
    }
  };
  return (
    <div className="mx-auto max-w-xl rounded-2xl border-2 border-[#d8c4a0] bg-[#faf3e6] p-6 text-center shadow-sm">
      <div className="mb-1 text-3xl">🧑‍💼</div>
      <h2 className="font-pixel text-sm text-[#5d4326]">MEET YOUR VP</h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-stone-600">
        Your VP runs a panel of four AI models on every question and hands you one decisive brief. First — what's the
        business? One or two sentences so they can frame your asks well.
      </p>
      <textarea
        value={business}
        onChange={(e) => setBusiness(e.target.value)}
        rows={3}
        autoFocus
        placeholder="e.g. We're a 4-person B2B SaaS selling invoicing software to freelancers, mostly in the US."
        className="mt-4 w-full resize-none rounded-xl border border-[#d8c4a0] bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
      />
      <button
        onClick={save}
        disabled={business.trim().length < 10 || saving}
        className="mt-3 w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-40"
      >
        {saving ? 'Setting up…' : 'Meet the panel →'}
      </button>
    </div>
  );
}
