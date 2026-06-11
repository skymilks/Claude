import { useStore } from '../store';
import { Modal, ModalHeader } from './Modal';

export function Unlocks({ onClose }: { onClose: () => void }) {
  const state = useStore((s) => s.state);
  if (!state) return null;
  const earned = new Map(state.unlocks.map((u) => [u.key, u]));

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        title="🏆 Achievements & unlocks"
        subtitle="Earned by getting real value — completing meaningful tasks, acting on outputs, holding boardrooms."
        onClose={onClose}
      />
      <div className="max-h-[70vh] space-y-2 overflow-y-auto p-6">
        {state.unlockDefs.map((def) => {
          const got = earned.get(def.key);
          return (
            <div
              key={def.key}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                got ? 'border-amber-200 bg-amber-50' : 'border-stone-150 bg-stone-50 opacity-60'
              }`}
            >
              <span className="text-2xl">{got ? def.icon : '🔒'}</span>
              <span className="flex-1">
                <span className="block font-semibold text-stone-800">{def.name}</span>
                <span className="block text-xs text-stone-500">{def.desc}</span>
              </span>
              {got && <span className="text-xs text-stone-400">{new Date(got.unlockedAt).toLocaleDateString()}</span>}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
