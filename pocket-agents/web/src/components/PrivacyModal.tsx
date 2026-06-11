import { useStore } from '../store';
import { Modal, ModalHeader } from './Modal';

// Plain-language policy. Deliberately modest: no compliance claims we don't
// have, and a clear "don't paste regulated data" warning.
export function PrivacyModal() {
  const set = useStore((s) => s.set);
  const close = () => set({ privacyOpen: false });

  return (
    <Modal onClose={close}>
      <ModalHeader title="How we handle your data" subtitle="Plain language, no fine print" onClose={close} />
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6 text-sm leading-relaxed text-stone-700">
        <section>
          <h3 className="font-bold text-stone-800">What we store</h3>
          <p className="mt-1">
            Your account email, your agents, and your tasks. Task <b>inputs</b> (what you paste) are kept just long
            enough to do the work and support re-runs, then <b>automatically purged about 24 hours</b> after a task
            finishes. Completed outputs you never act on are deleted after <b>30 days</b>; outputs you copy, save, or
            rate stay until you delete them. Boardroom reports stay until you delete them.
          </p>
        </section>
        <section>
          <h3 className="font-bold text-stone-800">Where it goes</h3>
          <p className="mt-1">
            To generate a result, your task input is sent to our AI provider (Anthropic) and nowhere else. We use the
            commercial API, which under the provider’s current terms does not train models on customer data by
            default. We don’t sell or share your data.
          </p>
        </section>
        <section>
          <h3 className="font-bold text-stone-800">Security basics</h3>
          <p className="mt-1">
            The AI API key lives only on the server. Passwords are stored as salted scrypt hashes. Server logs record
            request paths and status codes — never the contents of your tasks.
          </p>
        </section>
        <section>
          <h3 className="font-bold text-stone-800">Your controls</h3>
          <p className="mt-1">
            One click in the ⚙️ menu exports everything you have as JSON, and one click deletes all of it. No retention
            after deletion.
          </p>
        </section>
        <section className="rounded-lg bg-amber-50 p-3 text-amber-900">
          <b>Honest limits:</b> we’re a young product and don’t yet hold certifications like SOC 2 or HIPAA. Please
          don’t paste regulated data (medical records, full card numbers, government IDs) yet.
        </section>
      </div>
    </Modal>
  );
}
