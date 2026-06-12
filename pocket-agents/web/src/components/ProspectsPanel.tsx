import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Modal, ModalHeader } from './Modal';
import { timeAgo } from '../selectors';
import type { ProspectListItem } from '../types';

// Founder-only (ADMIN_EMAILS): set up a client's office before you've met
// them. You preload who they are and what the business does (their website is
// read for grounding); their first visit runs the intake, where THEY name
// their pain points and approve the team. The link is the full product — if
// it doesn't work out, revoke it here.
export function ProspectsPanel({ onClose }: { onClose: () => void }) {
  const toast = useStore((s) => s.toast);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [existing, setExisting] = useState<ProspectListItem[]>([]);

  const loadExisting = () => api.listProspects().then(setExisting).catch(() => {});
  useEffect(() => {
    loadExisting();
  }, []);

  const fullUrl = (path: string) => `${location.origin}${path}`;
  const copy = (path: string) => {
    navigator.clipboard.writeText(fullUrl(path));
    toast({ icon: '🔗', title: 'Link copied', body: 'Paste it into an email or message.' });
  };

  const create = async () => {
    setBusy(true);
    try {
      const { url } = await api.createProspect({ name, company, description, websiteUrl });
      setCreatedUrl(url);
      copy(url);
      setName('');
      setCompany('');
      setWebsiteUrl('');
      setDescription('');
      loadExisting();
    } catch (err) {
      toast({ icon: '⚠️', title: 'Could not create the office', body: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: ProspectListItem) => {
    if (!confirm(`Revoke ${item.name}'s office (${item.company})? The link stops working and their agents and work are deleted.`))
      return;
    await api.deleteProspect(item.id).catch(() => {});
    loadExisting();
  };

  // A paying client gets a proper login on top of the same workspace — same
  // agents, same work history.
  const convert = async (item: ProspectListItem) => {
    const email = (window.prompt(`Set up a login for ${item.name} (${item.company}).\n\nTheir email:`) ?? '').trim();
    if (!email) return;
    const password = (window.prompt('Temporary password (8+ characters — they should change it later):') ?? '').trim();
    if (!password) return;
    try {
      await api.convertProspect(item.id, email, password);
      toast({
        icon: '🔑',
        title: `${item.company} now has a login`,
        body: `They sign in at ${location.origin} with ${email}.`,
      });
      loadExisting();
    } catch (err) {
      toast({ icon: '⚠️', title: 'Could not set up the login', body: (err as Error).message });
    }
  };

  const input = 'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none';

  return (
    <Modal onClose={onClose} wide>
      <ModalHeader
        title="🏗️ Client offices"
        subtitle="Preload who they are; their first visit asks THEM what hurts and builds the team around it."
        onClose={onClose}
      />
      <div className="max-h-[75vh] space-y-6 overflow-y-auto p-6">
        <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-stone-500">Owner's name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Chen" className={input} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-stone-500">Company</span>
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Chen Plumbing" className={input} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">
              Their website (optional — read once so their team is grounded in real services and customers)
            </span>
            <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="e.g. chenplumbing.ca" className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">What does their business do? (plain English)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. Residential plumbing company in Calgary, ~8 staff. Mostly emergency repairs and renovations. Gets work through referrals and Google…"
              className={input}
            />
          </label>
          <button
            onClick={create}
            disabled={busy || !name.trim() || !company.trim() || !description.trim()}
            className="rounded-xl bg-amber-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50"
          >
            {busy ? 'Setting up their office…' : '🔗 Create their office link'}
          </button>
          {createdUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-mono text-emerald-800">{fullUrl(createdUrl)}</span>
              <button onClick={() => copy(createdUrl)} className="rounded bg-white px-2 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                Copy
              </button>
              <a href={createdUrl} target="_blank" rel="noreferrer" className="rounded bg-white px-2 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                Open ↗
              </a>
            </div>
          )}
        </div>

        {existing.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-stone-500">Active offices</h3>
            <div className="space-y-1.5">
              {existing.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-stone-800">{item.name}</span>
                    <span className="text-stone-500"> · {item.company}</span>
                    <span className="block text-xs text-stone-400">
                      created {timeAgo(item.createdAt)} ·{' '}
                      {item.agentCount === 0
                        ? 'intake not done yet'
                        : `${item.agentCount} agents · ${item.tasksDone} tasks delivered`}
                      {item.tokensUsed > 0 && <> · {item.tokensUsed.toLocaleString()} tokens this month</>}
                    </span>
                  </span>
                  <button onClick={() => copy(item.url)} className="rounded bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-200">
                    Copy link
                  </button>
                  <a href={item.url} target="_blank" rel="noreferrer" className="rounded bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-200">
                    Open ↗
                  </a>
                  <button
                    onClick={() => convert(item)}
                    title="Give this workspace a proper email + password login (same agents, same history)"
                    className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    🔑 Add login
                  </button>
                  <button onClick={() => remove(item)} className="rounded px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50">
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
