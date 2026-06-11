import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Sprite } from '../pixel/Sprite';
import { character, desk, PLANT, COFFEE, DOG } from '../pixel/sprites';
import { activeTaskFor, unseenDone, hasCosmetic, progressPct } from '../selectors';
import type { Agent, ServerState } from '../types';

const STAGE_W = 740;
const STAGE_H = 500;

// Three worker desks in a row, the CEO up by the window. Server assigns
// deskSlot 0-2 to workers and 3 to the CEO.
const SLOTS = [
  { x: 100, y: 250, hire: 'a worker' },
  { x: 330, y: 250, hire: 'a worker' },
  { x: 560, y: 250, hire: 'a worker' },
  { x: 330, y: 96, hire: 'the Chief of Staff' },
];

export function Office() {
  const state = useStore((s) => s.state)!;
  const setStore = useStore((s) => s.set);
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
  const workerSlotsFree = [0, 1, 2].some((i) => !agentsBySlot.has(i));
  const anyWorkerUnhired = ['sales', 'pm', 'researcher'].some((role) => !state.agents.some((a) => a.role === role));

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-[760px]" style={{ height: STAGE_H * scale }}>
      <div
        className="relative"
        style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
          {/* walls + floor */}
          <div className="office-wall absolute inset-x-0 top-0 h-[72px] rounded-t-xl" />
          <div className="office-floor absolute inset-x-0 top-[72px] bottom-0 rounded-b-xl" />
          {/* windows */}
          <div className="absolute left-[90px] top-[12px] h-[44px] w-[64px] rounded-sm border-4 border-[#7a5a38] bg-gradient-to-b from-[#aee0f7] to-[#d8f0fb]" />
          <div className="absolute right-[90px] top-[12px] h-[44px] w-[64px] rounded-sm border-4 border-[#7a5a38] bg-gradient-to-b from-[#aee0f7] to-[#d8f0fb]" />
          <div className="font-pixel absolute left-1/2 top-[24px] -translate-x-1/2 text-[10px] text-[#5d4326]">
            ★ HQ ★
          </div>

          {/* cosmetics — unlocked through valuable usage */}
          {hasCosmetic(state, 'rug') && (
            <div className="absolute left-[240px] top-[150px] h-[80px] w-[260px] rounded-[16px] border-4 border-[#9c3f3f] bg-[#c25151] opacity-70" />
          )}
          {hasCosmetic(state, 'plant') && (
            <div className="absolute left-[678px] top-[100px]">
              <Sprite def={PLANT} scale={4} />
            </div>
          )}
          {hasCosmetic(state, 'coffee') && (
            <div className="absolute left-[16px] top-[96px]">
              <Sprite def={COFFEE} scale={4} />
            </div>
          )}
          {hasCosmetic(state, 'dog') && (
            <div className="absolute left-[340px] top-[420px] animate-[bob_1.6s_ease-in-out_infinite]">
              <Sprite def={DOG} scale={4} />
            </div>
          )}

          {SLOTS.map((slot, slotIndex) => {
            const agent = agentsBySlot.get(slotIndex);
            if (agent) return <AgentAtDesk key={agent.id} agent={agent} slot={slot} frame={frame} state={state} />;
            const isCeoSlot = slotIndex === 3;
            const showGhost = isCeoSlot
              ? !state.agents.some((a) => a.role === 'ceo')
              : workerSlotsFree && anyWorkerUnhired;
            if (!showGhost) return null;
            return (
              <button
                key={`ghost-${slotIndex}`}
                onClick={() => setStore({ hireOpen: true })}
                className="group absolute opacity-50 transition hover:opacity-100"
                style={{ left: slot.x - 24, top: slot.y + 38 }}
                title={`Hire ${slot.hire}`}
              >
                <Sprite def={desk(false)} scale={4} />
                <div className="font-pixel mt-1 text-center text-[8px] text-[#5d4326] group-hover:text-[#2f2008]">
                  + HIRE
                </div>
              </button>
            );
          })}
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
      className="absolute w-[48px] text-left transition hover:brightness-110"
      style={{ left: slot.x, top: slot.y }}
    >
      {bubble && (
        <div
          className={`absolute -top-7 left-[24px] z-10 -translate-x-1/2 rounded-md border-2 border-[#5d4326] bg-white px-1 text-sm ${
            hasUnseen && !working ? 'animate-bounce' : 'animate-pulse'
          }`}
        >
          {bubble}
        </div>
      )}
      {/* character behind, desk drawn over the legs */}
      <div className={working ? '' : 'animate-[bob_1.8s_ease-in-out_infinite]'}>
        <Sprite def={character(agent.avatar, working ? frame : 0)} scale={4} />
      </div>
      <div className="-mt-[24px] -ml-[24px]">
        <Sprite def={desk(working)} scale={4} />
      </div>
      <div className="-ml-[24px] mt-1 w-[96px] text-center">
        <div className="inline-block rounded bg-[#00000055] px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {agent.displayName} <span className="text-[#ffd76b]">Lv{agent.level}</span>
        </div>
        {active && (
          <div className="mx-auto mt-1 h-1.5 w-[80px] overflow-hidden rounded bg-[#00000040]">
            <div className="h-full bg-[#7fd4ff] transition-all" style={{ width: `${progressPct(active, state.now)}%` }} />
          </div>
        )}
      </div>
    </button>
  );
}
