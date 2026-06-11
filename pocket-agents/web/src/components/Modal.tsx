import { useEffect, type ReactNode } from 'react';

export function Modal({ onClose, children, wide }: { onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[6vh]" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-2xl border border-stone-200 bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, subtitle, onClose }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between border-b border-stone-100 px-6 py-4">
      <div>
        <h2 className="text-lg font-bold text-stone-800">{title}</h2>
        {subtitle && <div className="mt-0.5 text-sm text-stone-500">{subtitle}</div>}
      </div>
      <button onClick={onClose} className="rounded-lg px-2 py-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700">
        ✕
      </button>
    </div>
  );
}
