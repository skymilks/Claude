// The council bake-off: the CEO asks the VP one question; the VP frames it,
// puts it to a panel of four AI models in parallel, then merges + scores their
// reports into one executive brief. ~6 model calls: 1 cheap VP framing, 4
// parallel advisories, 1 strong synthesis (which also scores). Partial
// failures are tolerated — as long as one advisor responds, the CEO gets a brief.
import { runModel } from './claude.js';
import { MODEL_REGISTRY, pickRoster, SYNTH_MODEL_KEY, VP_FRAME_MODEL_KEY } from './models.js';
import { COUNCIL_SYNTH_SYSTEM, councilSynthUserContent } from './synthesis.js';

const VP_SYSTEM = `You are the VP / Chief of Staff to the CEO. Restate the CEO's request as a crisp brief for your advisory panel: one or two sentences capturing exactly what they need and any context that matters. Do not answer it. Output only the brief, no preamble.`;

const ADVISOR_SYSTEM = `You are a sharp executive advisor to the CEO of a small company. You'll get the CEO's brief and any business context. Deliver a complete, decisive advisory covering every angle that matters — the opportunity, the risks, the relevant evidence or assumptions, and concrete recommended next steps. Be specific and grounded; no hedging, no filler. Yours is one of four independent advisories that will be compared and scored, so make it genuinely useful on its own. Clean Markdown, tight enough to read in a few minutes.`;

const withContext = (brief, businessContext) =>
  `${businessContext ? `Business context:\n${businessContext}\n\n` : ''}The CEO's request:\n${brief}`;

// Cheap framing pass — gives the VP a voice and a clean brief for the panel.
export async function vpFrame(brief, businessContext) {
  try {
    const { text, tokensUsed } = await runModel({
      modelKey: VP_FRAME_MODEL_KEY,
      system: VP_SYSTEM,
      userContent: withContext(brief, businessContext),
    });
    const refined = (text || '').trim();
    return { refinedBrief: refined && refined.length <= 1500 ? refined : brief, tokensUsed: tokensUsed || 0 };
  } catch {
    return { refinedBrief: brief, tokensUsed: 0 };
  }
}

// Pull the `## Dissent` section and the trailing ```json scores block out of the
// synthesis text; returns the clean brief body + dissent + a brand→score map.
function parseSynthesis(text) {
  let body = text || '';
  const scores = {};

  const jsonMatch = body.match(/```json\s*([\s\S]*?)```/i);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      const arr = Array.isArray(parsed) ? parsed : parsed.scores || [];
      for (const s of arr) {
        const key = s.brand ?? s.advisor ?? s.key;
        if (key == null) continue;
        const n = Number(s.score);
        scores[String(key)] = { score: Number.isFinite(n) ? Math.round(n) : null, note: (s.note ?? s.rationale ?? '').toString() };
      }
    } catch {
      /* leave scores empty if the block is malformed */
    }
    body = body.slice(0, jsonMatch.index).trim();
  }

  let dissent = null;
  let finalText = body;
  const dm = body.match(/\n#{2,3}\s*Dissent\s*\n/i);
  if (dm) {
    finalText = body.slice(0, dm.index).trim();
    dissent = body.slice(dm.index + dm[0].length).trim();
  }
  return { finalText, dissent, scores };
}

// Run one council: frame → 4 parallel advisories → synthesis (merge + score).
export async function runCouncil({ brief, businessContext }) {
  const { refinedBrief, tokensUsed: frameTokens } = await vpFrame(brief, businessContext);

  const roster = pickRoster();
  const settled = await Promise.allSettled(
    roster.map((key) =>
      runModel({ modelKey: key, system: ADVISOR_SYSTEM, userContent: withContext(refinedBrief, businessContext) })
    )
  );

  const drafts = settled.map((r, i) => {
    const key = roster[i];
    const m = MODEL_REGISTRY[key];
    const base = { modelKey: key, brand: m.brand, title: m.title, color: m.color, stats: m.stats, score: null, scoreNote: null };
    return r.status === 'fulfilled'
      ? { ...base, model: r.value.modelUsed, text: r.value.text, tokensUsed: r.value.tokensUsed, ok: true }
      : { ...base, model: m.modelId, text: '', tokensUsed: 0, ok: false, error: String(r.reason?.message ?? r.reason) };
  });

  const ok = drafts.filter((d) => d.ok);
  if (ok.length === 0) throw new Error('All four advisors failed to respond. Try again in a moment.');

  const { text: synthText, tokensUsed: synthTokens } = await runModel({
    modelKey: SYNTH_MODEL_KEY,
    system: COUNCIL_SYNTH_SYSTEM,
    userContent: councilSynthUserContent(refinedBrief, ok),
  });
  const { finalText, dissent, scores } = parseSynthesis(synthText);

  for (const d of drafts) {
    const s = scores[d.brand] ?? scores[d.modelKey];
    if (s) {
      d.score = s.score;
      d.scoreNote = s.note;
    }
  }
  const ranked = drafts.filter((d) => d.ok && d.score != null).sort((a, b) => b.score - a.score);
  const winner = ranked[0]?.modelKey ?? ok[0].modelKey;

  const tokensUsed = frameTokens + synthTokens + drafts.reduce((sum, d) => sum + d.tokensUsed, 0);
  return { finalText, dissent, drafts, winner, refinedBrief, tokensUsed };
}
