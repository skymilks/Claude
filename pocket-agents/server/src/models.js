// The roster of named "contestant" models for the council bake-off. Each seat
// is a real model with an honest brand label, a flavor role title, and "house"
// positioning stats (NOT benchmark claims — just at-a-glance personality, all
// env-overridable). The panel is computed from whichever providers actually
// have a platform key: one marquee seat per outside vendor, then filled from
// the Claude bench up to four. A seat is always labeled by the model that
// truly ran — a Claude model never masquerades as GPT.
import { providerAvailable } from './providers.js';

// stats: reasoning / knowledge / speed / creativity / rigor, each 1–10.
export const MODEL_REGISTRY = {
  opus:   { provider: 'anthropic', modelId: process.env.MODEL_OPUS   || 'claude-opus-4-8',   brand: 'Claude Opus',   title: 'The Strategist', color: '#c8702f', stats: { reasoning: 9, knowledge: 8, speed: 5, creativity: 7, rigor: 9 } },
  sonnet: { provider: 'anthropic', modelId: process.env.MODEL_SONNET || 'claude-sonnet-4-6', brand: 'Claude Sonnet', title: 'The Analyst',    color: '#4f8d63', stats: { reasoning: 8, knowledge: 7, speed: 7, creativity: 6, rigor: 8 } },
  haiku:  { provider: 'anthropic', modelId: process.env.MODEL_HAIKU  || 'claude-haiku-4-5',  brand: 'Claude Haiku',  title: 'The Sprinter',   color: '#7d63b0', stats: { reasoning: 6, knowledge: 6, speed: 10, creativity: 5, rigor: 6 } },
  fable:  { provider: 'anthropic', modelId: process.env.MODEL_FABLE  || 'claude-fable-5',    brand: 'Claude Fable',  title: 'The Creative',   color: '#d24e7a', stats: { reasoning: 7, knowledge: 7, speed: 6, creativity: 9, rigor: 6 } },
  gpt:    { provider: 'openai',    modelId: process.env.MODEL_OPENAI || 'gpt-5',             brand: 'GPT',           title: 'The Generalist', color: '#10a37f', stats: { reasoning: 8, knowledge: 9, speed: 7, creativity: 8, rigor: 7 } },
  gemini: { provider: 'google',    modelId: process.env.MODEL_GEMINI || 'gemini-2.5-pro',    brand: 'Gemini',        title: 'The Polymath',   color: '#4285f4', stats: { reasoning: 7, knowledge: 8, speed: 9, creativity: 7, rigor: 7 } },
  grok:   { provider: 'xai',       modelId: process.env.MODEL_XAI    || 'grok-4',            brand: 'Grok',          title: 'The Maverick',   color: '#111827', stats: { reasoning: 7, knowledge: 7, speed: 8, creativity: 9, rigor: 6 } },
};

export const resolveModelKey = (key) => MODEL_REGISTRY[key] ?? MODEL_REGISTRY.haiku;

// Preferred marquee seat per outside vendor (opus is the Anthropic marquee),
// then the Claude bench used to fill to four when an outside key is missing.
const MARQUEE = ['opus', 'gpt', 'gemini', 'grok'];
const BENCH = ['sonnet', 'haiku', 'fable', 'opus'];
export const PANEL_SIZE = 4;

// The four seats for this run, given which providers have keys. Outside vendors
// only take a seat when their key is present; the rest is Claude, always honest.
export function pickRoster() {
  const seats = [];
  for (const key of MARQUEE) {
    if (seats.length >= PANEL_SIZE) break;
    if (providerAvailable(MODEL_REGISTRY[key].provider)) seats.push(key);
  }
  for (const key of BENCH) {
    if (seats.length >= PANEL_SIZE) break;
    if (!seats.includes(key)) seats.push(key);
  }
  return seats.slice(0, PANEL_SIZE);
}

// Public card data for a model key (no internal modelId leak needed, but it's
// harmless and useful for debugging).
export function modelCard(key) {
  const m = resolveModelKey(key);
  return {
    modelKey: key,
    brand: m.brand,
    title: m.title,
    color: m.color,
    stats: m.stats,
    provider: m.provider,
    live: providerAvailable(m.provider), // a real vendor key is present
  };
}

// The model that adjudicates + scores. Strong by default; env-overridable.
export const SYNTH_MODEL_KEY = process.env.COUNCIL_SYNTH_MODEL || 'opus';
export const VP_FRAME_MODEL_KEY = process.env.COUNCIL_VP_MODEL || 'haiku';
