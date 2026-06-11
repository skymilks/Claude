import Anthropic from '@anthropic-ai/sdk';

// Worker agents run on a cost-efficient model; the premium tier is reserved
// for the CEO/Boardroom synthesis (the paid-tier showcase). Token usage is
// tracked per task from day one — it's the basis for pricing and limits.
export const MODELS = {
  standard: process.env.MODEL_STANDARD || 'claude-haiku-4-5',
  premium: process.env.MODEL_PREMIUM || 'claude-fable-5',
};

// Without an API key the app runs in demo mode: tasks complete with clearly
// labeled sample output so the whole loop stays testable. The key only ever
// lives server-side.
export const demoMode = !process.env.ANTHROPIC_API_KEY;
const client = demoMode ? null : new Anthropic();

export async function runModel({ modelTier, system, userContent }) {
  if (demoMode) return demoRun(modelTier, userContent);

  const model = MODELS[modelTier] ?? MODELS.standard;
  const response = await client.messages.create({
    model,
    // Premium (Fable) thinking is always on — no thinking param. Workers on
    // Haiku take plain calls. Outputs here are documents, well under limits.
    max_tokens: modelTier === 'premium' ? 8000 : 4096,
    system,
    messages: [{ role: 'user', content: userContent }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('The model declined this request. Try rephrasing the task.');
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
  if (!text) throw new Error('The model returned no text output.');
  if (response.stop_reason === 'max_tokens') {
    return { text: text + '\n\n*(Output hit the length limit — re-run with a narrower ask for the rest.)*', ...usageOf(response) };
  }
  return { text, ...usageOf(response) };
}

function usageOf(response) {
  const u = response.usage;
  return {
    tokensUsed: (u?.input_tokens ?? 0) + (u?.output_tokens ?? 0),
    modelUsed: response.model,
  };
}

export function friendlyApiError(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'Claude API key is invalid. Check ANTHROPIC_API_KEY on the server.';
  if (err instanceof Anthropic.RateLimitError) return 'Rate limited by the Claude API — the task will work if you re-run it in a minute.';
  if (err instanceof Anthropic.APIError) return `Claude API error (${err.status}): ${err.message}`;
  return err.message || 'Unknown error';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function demoRun(modelTier, userContent) {
  await sleep(5000 + Math.random() * 4000); // feel like real background work
  const preview = userContent.replace(/\s+/g, ' ').slice(0, 140);
  const text = `> 🧪 **Demo output** — no \`ANTHROPIC_API_KEY\` is set on the server, so this is a placeholder. Add a key to \`server/.env\` or the environment and re-run for real results.

## What I would deliver

A complete, ready-to-use response to your request:

> ${preview}…

In demo mode I can't do the real work, but the full loop — assigning, background execution, the ready tray, XP, and unlocks — behaves exactly as it will with a live key${modelTier === 'premium' ? ', and this task would run on the premium model' : ''}.`;
  return { text, tokensUsed: 0, modelUsed: 'demo' };
}
