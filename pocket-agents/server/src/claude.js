import Anthropic from '@anthropic-ai/sdk';
import { PROVIDERS, providerAvailable } from './providers.js';
import { resolveModelKey } from './models.js';

// Worker agents run on a cost-efficient model; the premium tier is reserved
// for synthesis (the paid-tier showcase). Token usage is tracked per task from
// day one — it's the basis for pricing and limits.
export const MODELS = {
  standard: process.env.MODEL_STANDARD || 'claude-haiku-4-5',
  premium: process.env.MODEL_PREMIUM || 'claude-fable-5',
};

// Without an API key the app runs in demo mode: calls complete with clearly
// labeled sample output so the whole loop stays testable. Keys only ever live
// server-side, on the platform's own accounts.
export const demoMode = !process.env.ANTHROPIC_API_KEY;

// The single LLM chokepoint. Back-compatible: callers pass EITHER the old
// `{ modelTier }` (anthropic standard/premium) OR the new `{ modelKey }` /
// `{ provider, modelId }` (the council's named models). Resolves to a concrete
// provider+model, falls back to Anthropic if the chosen vendor has no platform
// key, and drops to the demo placeholder only when nothing is configured.
export async function runModel({ modelTier, modelKey, provider, modelId, system, userContent }) {
  let desc;
  if (provider && modelId) desc = { provider, modelId };
  else if (modelKey) desc = { provider: resolveModelKey(modelKey).provider, modelId: resolveModelKey(modelKey).modelId };
  else desc = { provider: 'anthropic', modelId: MODELS[modelTier] ?? MODELS.standard };

  if (!providerAvailable(desc.provider)) {
    // Chosen vendor has no key — try Anthropic; if even that's missing, demo.
    if (providerAvailable('anthropic')) desc = { provider: 'anthropic', modelId: MODELS.standard };
    else return demoRun(modelTier ?? modelKey, userContent);
  }

  const maxTokens = modelTier === 'premium' || desc.modelId === MODELS.premium ? 8000 : 4096;
  return PROVIDERS[desc.provider].runChat({ modelId: desc.modelId, system, userContent, maxTokens });
}

export function friendlyApiError(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'Claude API key is invalid. Check ANTHROPIC_API_KEY on the server.';
  if (err instanceof Anthropic.RateLimitError) return 'Rate limited by the Claude API — re-run in a minute.';
  if (err instanceof Anthropic.APIError) return `Claude API error (${err.status}): ${err.message}`;
  return err.message || 'Unknown error';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function demoRun(label, userContent) {
  await sleep(2500 + Math.random() * 2500); // feel like real background work
  const preview = (userContent || '').replace(/\s+/g, ' ').slice(0, 140);
  const text = `> 🧪 **Demo output** — no provider key is set on the server, so this is a placeholder. Add \`ANTHROPIC_API_KEY\` (and optionally \`OPENAI_API_KEY\`/\`GOOGLE_API_KEY\`/\`XAI_API_KEY\`) and re-run for real results.

## What I'd deliver

A complete, ready-to-use response to your request:

> ${preview}…

In demo mode the whole loop — the panel, parallel runs, scoring, and the merged brief — behaves exactly as it will with live keys${label ? ` (this seat: ${label})` : ''}.`;
  return { text, tokensUsed: 0, modelUsed: 'demo' };
}
