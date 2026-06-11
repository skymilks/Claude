import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Sprite } from '../pixel/Sprite';
import { character, desk, CHAIR, PLANT, SUCCULENT, COFFEE, DOG, SHELF, LAMP } from '../pixel/sprites';
import { activeTaskFor, unseenDone, hasCosmetic, progressPct } from '../selectors';
import type { Agent, ServerState } from '../types';

const STAGE_W = 820;
const STAGE_H = 520;

// Three worker desks in a row, the CEO and an open desk up by the window.
// Server assigns deskSlot 0-2 and 4 to workers/custom hires, 3 to the CEO.
// Each entry is the desk's anchor.
const SLOTS = [
  { x: 60, y: 250 },
  { x: 320, y: 250 },
  { x: 580, y: 250 },
  { x: 320, y: 86 },
  { x: 60, y: 86 },
];
const CEO_SLOT = 3;

// Sprite footprints at scale 4 (px). The seated character sits in the chair;
// the deep desk (184px) is drawn in front, hiding the lower body.
const DESK_W = 184;
const CHAIR_DX = 52, CHAIR_DY = -10; // chair behind, offset from the desk anchor
const CHAR_DX = 60, CHAR_DY = -24; // seated character, centered behind the desk top

export function Office() {
  const state = useStore((s) => s.state)!;
  const setStore = useStore((s) => s.set);
  const { refresh, toast } = useStore();
  const [frame, setFrame] = useState<0 | 1>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 450);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fit = () => {
      const w = containerRef.current?.clientWidth ?? STAGE_W;
      setScale(Math.min(1, w / STAGE_W));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const agentsBySlot = new Map(state.agents.map((a) => [a.deskSlot, a]));

  // The Chief of Staff is the one templated hire left — one click seats them.
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
    <div ref={containerRef} className="mx-auto w-full max-w-[840px]" style={{ height: STAGE_H * scale }}>
      <div
        className="office-stage relative overflow-hidden rounded-xl"
        style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {/* walls + floor */}
        <div className="office-wall absolute inset-x-0 top-0 h-[96px]" />
        <div className="office-floor absolute inset-x-0 top-[96px] bottom-0" />
        {/* big sunny window */}
        <div className="office-window absolute left-[120px] top-[20px] h-[58px] w-[150px]">
          <span className="office-window-bar" />
        </div>

        {/* always-on decor — makes the room feel lived-in */}
        <div className="absolute left-[690px] top-[8px]">
          <Sprite def={SHELF} scale={5} />
        </div>
        <div className="absolute left-[26px] top-[316px] drop-shadow-[0_8px_6px_rgba(0,0,0,0.25)]">
          <Sprite def={LAMP} scale={5} />
        </div>
        <div className="office-lampglow absolute left-[10px] top-[150px] h-[260px] w-[260px]" />
        <div className="absolute left-[726px] top-[330px] drop-shadow-[0_10px_8px_rgba(0,0,0,0.25)]">
          <Sprite def={PLANT} scale={6} />
        </div>

        {/* cosmetics — unlocked through valuable usage */}
        {hasCosmetic(state, 'rug') && (
          <div className="absolute left-[250px] top-[400px] h-[70px] w-[300px] rounded-[20px] border-[6px] border-[#9c3f3f] bg-[#b85a5a] opacity-80" />
        )}
        {hasCosmetic(state, 'plant') && (
          <div className="absolute left-[636px] top-[214px]">
            <Sprite def={SUCCULENT} scale={4} />
          </div>
        )}
        {hasCosmetic(state, 'coffee') && (
          <div className="absolute left-[20px] top-[120px]">
            <Sprite def={COFFEE} scale={4} />
          </div>
        )}
        {hasCosmetic(state, 'dog') && (
          <div className="absolute left-[470px] top-[440px] animate-[bob_1.6s_ease-in-out_infinite]">
            <Sprite def={DOG} scale={5} />
          </div>
        )}

        {SLOTS.map((slot, slotIndex) => {
          const agent = agentsBySlot.get(slotIndex);
          if (agent) return <AgentAtDesk key={agent.id} agent={agent} slot={slot} frame={frame} state={state} />;
          const isCeoSlot = slotIndex === CEO_SLOT;
          if (isCeoSlot && state.agents.some((a) => a.role === 'ceo')) return null;
          return (
            <button
              key={`ghost-${slotIndex}`}
              onClick={() => (isCeoSlot ? hireChief() : setStore({ builderOpen: true }))}
              className="group absolute opacity-45 transition hover:opacity-90"
              style={{ left: slot.x, top: slot.y, width: DESK_W, height: 200 }}
              title={isCeoSlot ? 'Bring in the Chief of Staff' : 'An empty desk — create your own agent for it'}
            >
              <div className="absolute" style={{ left: CHAIR_DX, top: CHAIR_DY }}>
                <Sprite def={CHAIR} scale={4} />
              </div>
              <div className="absolute left-0 top-0">
                <Sprite def={desk(false)} scale={4} />
              </div>
              <div className="font-pixel absolute left-0 top-[166px] w-full text-center text-[9px] text-[#5d4326] group-hover:text-[#2f2008]">
                {isCeoSlot ? '+ HIRE CHIEF' : '+ CREATE YOUR OWN'}
              </div>
            </button>
          );
        })}

        {/* warm cozy lighting on top of everything */}
        <div className="office-vignette pointer-events-none absolute inset-0" />
      </div>
    </div>
  );
}

function AgentAtDesk({ agent, slot, frame, state }: { agent: Agent; slot: { x: number; y: number }; frame: 0 | 1; state: ServerState }) {
  const setStore = useStore((s) => s.set);
  const active = activeTaskFor(state, agent.id);
  const hasUnseen = unseenDone(state).some((t) => t.agentId === agent.id);
  const working = !!active;
  const bubble = working ? '💭' : hasUnseen ? '✅' : null;

  return (
    <button
      onClick={() => setStore({ agentModalId: agent.id })}
      className="absolute text-left transition hover:brightness-105"
      style={{ left: slot.x, top: slot.y, width: DESK_W, height: 210 }}
    >
      {/* soft ground shadow under the desk */}
      <div className="absolute left-[8px] top-[150px] h-[22px] w-[200px] rounded-[50%] bg-black/25 blur-[3px]" />

      {/* chair behind the character */}
      <div className="absolute" style={{ left: CHAIR_DX, top: CHAIR_DY }}>
        <Sprite def={CHAIR} scale={4} />
      </div>

      {/* seated character */}
      <div className="absolute" style={{ left: CHAR_DX, top: CHAR_DY }}>
        {bubble && (
          <div
            className={`absolute -top-6 left-[32px] z-10 -translate-x-1/2 rounded-md border-2 border-[#5d4326] bg-white px-1 text-sm ${
              hasUnseen && !working ? 'animate-bounce' : 'animate-pulse'
            }`}
          >
            {bubble}
          </div>
        )}
        <div className={working ? '' : 'animate-[bob_2.6s_ease-in-out_infinite]'}>
          <Sprite def={character(agent.avatar, working ? frame : 0)} scale={4} />
        </div>
      </div>

      {/* deep desk in front */}
      <div className="absolute left-0 top-0">
        <Sprite def={desk(working)} scale={4} />
      </div>

      {/* nameplate + progress */}
      <div className="absolute left-0 top-[166px] w-full text-center">
        <div className="inline-block rounded bg-[#00000066] px-2 py-0.5 text-[12px] font-semibold text-white">
          {agent.displayName} <span className="text-[#ffd76b]">Lv{agent.level}</span>
        </div>
        {active && (
          <div className="mx-auto mt-1 h-1.5 w-[96px] overflow-hidden rounded bg-[#00000040]">
            <div className="h-full bg-[#7fd4ff] transition-all" style={{ width: `${progressPct(active, state.now)}%` }} />
          </div>
        )}
      </div>
    </button>
  );
}
