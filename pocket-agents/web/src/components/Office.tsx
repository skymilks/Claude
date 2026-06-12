import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { OfficeScene, type SceneAgent } from './OfficeScene';
import { STAGE_W, STAGE_H, tileAt, DESK_TILES, CEO_SLOT, standBeside } from '../pixel/iso';
import { activeTaskFor, unseenDone, hasCosmetic, progressPct } from '../selectors';
import type { Task } from '../types';

// The office: PixiJS draws the isometric room (OfficeScene); this component
// projects the interactive layer — click targets, nameplates, progress,
// bubbles, empty-desk actions — onto the same grid coordinates, so the two
// layers can never drift apart.

export function Office() {
  const state = useStore((s) => s.state)!;
  const setStore = useStore((s) => s.set);
  const { refresh, toast } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);

  useEffect(() => {
    const onResize = () => {
      const w = containerRef.current?.clientWidth ?? STAGE_W;
      setFit(Math.min(1, w / STAGE_W));
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const agentsBySlot = new Map(state.agents.map((a) => [a.deskSlot, a]));
  const hasChief = state.agents.some((a) => a.role === 'ceo');

  // What the canvas needs to know, nothing more.
  const sceneAgents: SceneAgent[] = state.agents.map((a) => ({
    id: a.id,
    slot: a.deskSlot,
    avatar: a.avatar,
    working: !!activeTaskFor(state, a.id),
  }));
  const cosmetics = {
    rug: hasCosmetic(state, 'rug'),
    plant: hasCosmetic(state, 'plant'),
    coffee: hasCosmetic(state, 'coffee'),
    dog: hasCosmetic(state, 'dog'),
  };

  // The desk the Chief hosts: the earliest live task by a non-chief agent.
  const liveTasks = state.tasks
    .filter((t) => t.status === 'queued' || t.status === 'running')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let hostSlot: number | null = null;
  let hostTask: Task | null = null;
  for (const t of liveTasks) {
    const agent = state.agents.find((a) => a.id === t.agentId);
    if (agent && agent.deskSlot !== CEO_SLOT) {
      hostSlot = agent.deskSlot;
      hostTask = t;
      break;
    }
  }

  const hireChief = async () => {
    if (!confirm('Bring in the Chief of Staff? They read the team’s work and deliver strategy on the premium model.')) return;
    try {
      const agent = await api.hire('ceo');
      toast({ icon: '🤝', title: `${agent.displayName} joined the team!` });
      await refresh();
    } catch (err) {
      toast({ icon: '⚠️', title: 'Could not hire', body: (err as Error).message });
    }
  };

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-[900px]" style={{ height: STAGE_H * fit }}>
      <div
        className="relative overflow-hidden rounded-xl"
        style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${fit})`, transformOrigin: 'top left', background: '#262017' }}
      >
        <OfficeScene agents={sceneAgents} cosmetics={cosmetics} hostSlot={hostSlot} />

        {/* interactive layer, projected onto the same iso grid */}
        <div className="absolute inset-0">
          {Object.entries(DESK_TILES).map(([slotStr, tile]) => {
            const slot = Number(slotStr);
            const agent = agentsBySlot.get(slot);
            const p = tileAt(tile.gx, tile.gy);
            if (!agent) {
              const isCeoSlot = slot === CEO_SLOT;
              return (
                <button
                  key={`ghost-${slot}`}
                  onClick={() => (isCeoSlot ? hireChief() : setStore({ builderOpen: true }))}
                  className="group absolute -translate-x-1/2"
                  style={{ left: p.x, top: p.y - 46, width: 150, height: 104 }}
                  title={isCeoSlot ? 'Bring in the Chief of Staff' : 'An empty desk — create your own agent for it'}
                >
                  {/* a chalk outline where a desk could go */}
                  <div
                    className="mx-auto h-[60px] w-[120px] border-[3px] border-dashed opacity-80 transition group-hover:opacity-100"
                    style={{
                      borderColor: '#8a6444',
                      transform: 'rotateX(58deg) rotateZ(45deg)',
                      borderRadius: 12,
                    }}
                  />
                  <div className="font-pixel mt-0 text-center text-[9px] font-bold text-[#6d4f30] transition group-hover:text-amber-700">
                    {isCeoSlot ? '+ BRING IN THE CHIEF' : '+ CREATE YOUR OWN'}
                  </div>
                </button>
              );
            }

            const active = activeTaskFor(state, agent.id);
            const hasUnseen = unseenDone(state).some((t) => t.agentId === agent.id);
            const bubble = active ? '💭' : hasUnseen ? '✅' : null;
            return (
              <button
                key={agent.id}
                onClick={() => setStore({ agentModalId: agent.id })}
                className="absolute -translate-x-1/2 text-left"
                style={{ left: p.x, top: p.y - 118, width: 160, height: 196 }}
                title={`${agent.displayName} — ${agent.tagline ?? agent.role}`}
              >
                {bubble && (
                  <div
                    className={`absolute left-1/2 top-0 -translate-x-1/2 rounded-md border-2 border-[#5d4326] bg-white px-1 text-sm ${
                      hasUnseen && !active ? 'animate-bounce' : 'animate-pulse'
                    }`}
                  >
                    {bubble}
                  </div>
                )}
                <div className="absolute bottom-0 left-1/2 w-[150px] -translate-x-1/2 text-center">
                  <div className="inline-block whitespace-nowrap rounded bg-[#00000080] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {agent.displayName.slice(0, 14)} <span className="text-[#ffd76b]">Lv{agent.level}</span>
                    {agent.routine && <span title={`Weekly: ${agent.routine.label}`} className="text-emerald-300"> ↻</span>}
                  </div>
                  {active && (
                    <div className="mx-auto mt-1 h-1.5 w-[96px] overflow-hidden rounded bg-[#00000060]">
                      <div className="h-full bg-[#7fd4ff] transition-all" style={{ width: `${progressPct(active, state.now)}%` }} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {/* the Chief hosts the wait: a status line beside the working desk */}
          {hasChief && hostSlot !== null && hostTask && <ChiefBubble slot={hostSlot} task={hostTask} now={state.now} />}
        </div>

        {/* warm lighting on top of everything */}
        <div className="office-vignette pointer-events-none absolute inset-0" />
      </div>
    </div>
  );
}

// What the Chief says while she watches an agent work — tracks the task's
// real progress off the poll, so the line always matches the bar.
function ChiefBubble({ slot, task, now }: { slot: number; task: Task; now: string }) {
  const agentName = useStore((s) => s.state?.agents.find((a) => a.id === task.agentId)?.displayName) ?? 'They';
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // she needs a beat to walk over before she starts narrating
    const id = setTimeout(() => setVisible(true), 1400);
    return () => clearTimeout(id);
  }, [task.id]);
  if (!visible) return null;

  const pct = progressPct(task, now);
  const line =
    task.status === 'queued'
      ? `Getting ${agentName} started…`
      : pct < 40
        ? `${agentName}'s on it — reading your request…`
        : pct < 75
          ? 'Drafting it now…'
          : 'Just polishing…';

  const pos = standBeside(slot);
  const p = tileAt(pos.gx, pos.gy);
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full"
      style={{ left: p.x, top: p.y - 88 }}
    >
      <div className="relative max-w-[190px] rounded-xl border-2 border-[#5d4326] bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 shadow">
        {line}
        <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#5d4326] bg-white" />
      </div>
    </div>
  );
}
