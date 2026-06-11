import { useState } from 'react';
import { useStore } from '../store';

// First-week guidance: walks a new CEO through the loop that makes the
// product click — and that drives every unlock. Pure UI over existing state.
export function OnboardingCard() {
  const { state, set } = useStore();
  const [dismissed, setDismissed] = useState(localStorage.getItem('onboardingDone') === '1');
  if (!state || dismissed) return null;

  const steps = [
    { label: 'Hire your first agent', done: state.agents.length > 0, go: () => set({ hireOpen: true }) },
    {
      label: 'Assign a task (paste real work!)',
      done: state.tasks.length > 0,
      go: () => state.agents[0] && set({ agentModalId: state.agents[0].id }),
    },
    { label: 'Open the result when it lands in 📬', done: state.tasks.some((t) => t.seenAt) },
    { label: 'Act on it — copy, save, or rate it', done: state.tasks.some((t) => t.actedAt) },
    { label: 'Unlock the Boardroom (act on 5 outputs)', done: state.boardroom.unlocked, go: () => set({ boardroomOpen: true }) },
  ];
  const remaining = steps.filter((s) => !s.done).length;
  if (remaining === 0) return null;
  if (state.agents.length === 0) return null; // the welcome hero covers this moment

  const dismiss = () => {
    localStorage.setItem('onboardingDone', '1');
    setDismissed(true);
  };

  return (
    <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[10px] text-[#5d4326]">GETTING STARTED</span>
        <button onClick={dismiss} className="text-xs text-stone-400 hover:text-stone-600">
          dismiss
        </button>
      </div>
      <ul className="mt-2 space-y-1">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2 text-sm">
            <span>{step.done ? '✅' : '⬜'}</span>
            {!step.done && step.go ? (
              <button onClick={step.go} className="text-left text-stone-700 underline decoration-amber-400 hover:text-amber-700">
                {step.label}
              </button>
            ) : (
              <span className={step.done ? 'text-stone-400 line-through' : 'text-stone-700'}>{step.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
