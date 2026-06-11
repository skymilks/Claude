import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Modal, ModalHeader } from './Modal';
import { Sprite } from '../pixel/Sprite';
import { character } from '../pixel/sprites';
import { timeAgo } from '../selectors';
import type { ProspectDraft, ProspectListItem } from '../types';

// Founder-only (ADMIN_EMAILS): describe a prospect's business in plain
// English, let Claude draft their tailored office, tweak it, and get a
// shareable demo link to send before the first meeting.
export function ProspectsPanel({ onClose }: { onClose: () => void }) {
  const toast = useStore((s) => s.toast);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [draft, setDraft] = useState<ProspectDraft | null>(null);
  const [busy, setBusy] = useState<'draft' | 'create' | null>(null);
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

  const doDraft = async () => {
    setBusy('draft');
    try {
      setDraft(await api.draftProspect(name, company, description));
      setCreatedUrl(null);
    } catch (err) {
      toast({ icon: '⚠️', title: 'Could not draft the office', body: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const doCreate = async () => {
    if (!draft) return;
    setBusy('create');
    try {
      const { url } = await api.createProspect({
        name,
        company,
        brief: draft.brief,
        welcomeLine: draft.welcomeLine,
        ctaUrl,
        agents: draft.agents,
      });
      setCreatedUrl(url);
      copy(url);
      loadExisting();
    } catch (err) {
      toast({ icon: '⚠️', title: 'Could not create the demo', body: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (item: ProspectListItem) => {
    if (!confirm(`Delete the demo office for ${item.name} (${item.company})? The link will stop working.`)) return;
    await api.deleteProspect(item.id).catch(() => {});
    loadExisting();
  };

  // They said yes: the demo becomes their real account — same agents, same
  // work history. Founder sets a temp login and sends it to the client.
  const handOver = async (item: ProspectListItem) => {
    const email = (window.prompt(`${item.name} said yes! 🎉\n\nTheir login email:`) ?? '').trim();
    if (!email) return;
    const password = (window.prompt('Temporary password for them (8+ characters — they should change it later):') ?? '').trim();
    if (!password) return;
    try {
      await api.convertProspect(item.id, email, password);
      toast({
        icon: '🔑',
        title: `${item.company} is now a client`,
        body: `Send them: sign in at ${location.origin} with ${email}. The demo link is dead.`,
      });
      loadExisting();
    } catch (err) {
      toast({ icon: '⚠️', title: 'Handover failed', body: (err as Error).message });
    }
  };

  const input = 'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none';

  return (
    <Modal onClose={onClose} wide>
      <ModalHeader
        title="🏗️ Prospect offices"
        subtitle="Build a personalized office before you've even met them — then send the link."
        onClose={onClose}
      />
      <div className="max-h-[75vh] space-y-6 overflow-y-auto p-6">
        {/* Step 1: describe the prospect */}
        <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="text-sm font-semibold text-stone-700">1 · Who is this for?</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-stone-500">Prospect's name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Chen" className={input} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-stone-500">Company</span>
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Chen Plumbing" className={input} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">What does their business do? (plain English — more detail = better agents)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. Residential plumbing company in Calgary, ~8 staff. Mostly emergency repairs and renovations. Gets work through referrals and Google. Struggles to follow up on quotes…"
              className={input}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-stone-500">"Claim your office" link (optional — your booking page, Calendly, etc.)</span>
            <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://calendly.com/you/intro" className={input} />
          </label>
          <button
            onClick={doDraft}
            disabled={busy !== null || !name.trim() || !company.trim() || !description.trim()}
            className="rounded-xl bg-amber-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-amber-700 disabled:opacity-50"
          >
            {busy === 'draft' ? 'Drafting their team…' : draft ? 'Re-draft from scratch' : '✨ Draft their office'}
          </button>
        </div>

        {/* Step 2: review & tweak the draft */}
        {draft && (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="text-sm font-semibold text-stone-700">2 · Review the draft — edit anything before creating the link</div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-stone-500">Welcome line (the Chief of Staff says this when they arrive)</span>
              <textarea
                value={draft.welcomeLine}
                onChange={(e) => setDraft({ ...draft, welcomeLine: e.target.value })}
                rows={2}
                className={input}
              />
            </label>
            <div className="space-y-2">
              {draft.agents.map((agent, i) => (
                <details key={i} className="rounded-lg border border-stone-200 bg-white">
                  <summary className="flex cursor-pointer items-center gap-3 px-3 py-2">
                    <Sprite def={character(agent.avatar, 0)} scale={2} />
                    <span className="flex-1">
                      <input
                        value={agent.displayName}
                        onClick={(e) => e.preventDefault()}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            agents: draft.agents.map((a, j) => (j === i ? { ...a, displayName: e.target.value.slice(0, 24) } : a)),
                          })
                        }
                        className="w-44 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-stone-800 hover:border-stone-300 focus:border-amber-500 focus:outline-none"
                      />
                      <span className="block px-1 text-xs text-stone-500">{agent.tagline}</span>
                    </span>
                    <span className="text-xs text-stone-400">edit ▾</span>
                  </summary>
                  <div className="border-t border-stone-100 p-3">
                    <span className="mb-1 block text-xs font-medium text-stone-500">Instructions (what this agent is and does for {company || 'them'})</span>
                    <textarea
                      value={agent.systemPrompt}
                      onChange={(e) =>
                        setDraft({ ...draft, agents: draft.agents.map((a, j) => (j === i ? { ...a, systemPrompt: e.target.value } : a)) })
                      }
                      rows={8}
                      className={`${input} font-mono text-xs`}
                    />
                  </div>
                </details>
              ))}
            </div>
            <button
              onClick={doCreate}
              disabled={busy !== null}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy === 'create' ? 'Creating…' : '🔗 Create demo link'}
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
        )}

        {/* Existing demos */}
        {existing.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-stone-500">Sent offices</h3>
            <div className="space-y-1.5">
              {existing.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-stone-800">{item.name}</span>
                    <span className="text-stone-500"> · {item.company}</span>
                    <span className="block text-xs text-stone-400">
                      {item.runsUsed}/{item.runCap} runs used · created {timeAgo(item.createdAt)}
                    </span>
                  </span>
                  <button onClick={() => copy(item.url)} className="rounded bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-200">
                    Copy link
                  </button>
                  <a href={item.url} target="_blank" rel="noreferrer" className="rounded bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-200">
                    Open ↗
                  </a>
                  <button
                    onClick={() => handOver(item)}
                    title="They said yes — turn this demo into their real account (same agents, same history)"
                    className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    🔑 Hand over
                  </button>
                  <button onClick={() => remove(item)} className="rounded px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50">
                    Delete
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
