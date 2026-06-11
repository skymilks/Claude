// The personalization engine behind the "done-for-you" pitch: the founder
// describes a prospect's business in plain English and Claude drafts a
// tailored office — three custom agents (names, system prompts, task forms),
// a one-paragraph brief, and a personal welcome line. The founder reviews and
// tweaks the draft before it becomes a shareable demo workspace.
import { runModel, demoMode } from './claude.js';

const AVATARS = ['sales', 'pm', 'researcher', 'ceo'];
const FIELD_TYPES = ['text', 'textarea', 'select'];

const DRAFT_SYSTEM = `You design small AI teams for specific businesses. Given a prospect's name, company, and a description of what the company does, you produce a JSON spec for three AI agents tailored to that exact business, plus a short brief and a personal welcome line.

Rules for the agents:
- Each agent must be genuinely tailored: role names, system prompts, and form fields should reference the company's industry, customers, and likely day-to-day work — never generic.
- Each systemPrompt is complete and self-contained: it states who the agent is at THIS company, what finished work products it delivers, concrete formatting rules, and that it should make sensible assumptions (listed at the end of its output) rather than asking questions. Outputs are clean Markdown the owner can use as-is.
- Each inputSchema has 2-4 fields. Field types: "text" (short), "textarea" (paste-in context), or "select" (with an "options" array). Mark truly necessary fields "required": true. Placeholders should show realistic examples for this business.
- avatar must be one of: "sales", "pm", "researcher".
- tagline is one short line (under 60 chars) describing what the agent does for this company.

Respond with ONLY a JSON object, no markdown fences, in exactly this shape:
{
  "brief": "one paragraph on the business and what this team is set up to do for it",
  "welcomeLine": "a warm 1-2 sentence greeting addressed to the prospect by first name, from their new Chief of Staff, welcoming them to their company's office",
  "agents": [
    {
      "displayName": "string (max 24 chars)",
      "role": "short-slug",
      "avatar": "sales|pm|researcher",
      "tagline": "string",
      "systemPrompt": "string",
      "inputSchema": [
        { "key": "string", "label": "string", "type": "text|textarea|select", "placeholder": "string (optional)", "options": ["only for select"], "required": true }
      ]
    }
  ]
}`;

export async function draftProspectOffice({ name, company, description }) {
  if (demoMode) return fallbackDraft({ name, company, description });

  const userContent = `Prospect: ${name}\nCompany: ${company}\n\nWhat the company does:\n${description}`;
  const { text } = await runModel({ modelTier: 'premium', system: DRAFT_SYSTEM, userContent });
  return validateDraft(parseJson(text), { name, company, description });
}

function parseJson(text) {
  // Models occasionally wrap JSON in fences or prose despite instructions.
  const cleaned = text.replace(/```(?:json)?/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('The draft came back malformed — try again.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function validateDraft(draft, { name, company, description }) {
  const fallback = fallbackDraft({ name, company, description });
  const agents = sanitizeAgentConfigs(draft.agents);
  if (agents.length < 3) throw new Error('The draft came back incomplete — try again.');
  return {
    brief: str(draft.brief, 1200) || fallback.brief,
    welcomeLine: str(draft.welcomeLine, 300) || fallback.welcomeLine,
    agents,
  };
}

// Also applied to founder-edited configs at create time — never trust the
// browser to keep avatars/types/lengths in range.
export function sanitizeAgentConfigs(list) {
  return (Array.isArray(list) ? list : [])
    .slice(0, 3)
    .map((a, i) => ({
      displayName: str(a?.displayName, 24) || `Agent ${i + 1}`,
      role: (str(a?.role, 32) || `agent-${i + 1}`).toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
      avatar: AVATARS.includes(a?.avatar) && a?.avatar !== 'ceo' ? a.avatar : ['sales', 'pm', 'researcher'][i % 3],
      tagline: str(a?.tagline, 80) || 'Tailored to your business',
      systemPrompt: str(a?.systemPrompt, 8000),
      inputSchema: validateSchema(a?.inputSchema),
    }))
    .filter((a) => a.systemPrompt && a.inputSchema.length > 0);
}

function validateSchema(fields) {
  return (Array.isArray(fields) ? fields : [])
    .slice(0, 4)
    .filter((f) => f && typeof f.key === 'string' && typeof f.label === 'string')
    .map((f) => ({
      key: f.key.slice(0, 32),
      label: str(f.label, 80),
      type: FIELD_TYPES.includes(f.type) ? f.type : 'textarea',
      ...(f.placeholder ? { placeholder: str(f.placeholder, 200) } : {}),
      ...(f.type === 'select' && Array.isArray(f.options)
        ? { options: f.options.slice(0, 8).map((o) => str(o, 60)).filter(Boolean) }
        : {}),
      ...(f.required ? { required: true } : {}),
    }));
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Without an API key the whole flow still demos: a sensible templated office
// personalized with the prospect's details.
function fallbackDraft({ name, company, description }) {
  const firstName = (name ?? '').trim().split(/\s+/)[0] || 'there';
  const about = `${company}: ${description}`.slice(0, 600);
  const base = (role, delivers) =>
    `You are the ${role} at ${company}, reporting directly to the owner. About the business: ${about}\n\nYou deliver finished, ready-to-use ${delivers} tailored to this business. Work only from what you're given; where key facts are missing, make sensible assumptions and list them at the end under "Assumptions". Format everything in clean Markdown.`;
  return {
    brief: `${company} — ${description}`.slice(0, 1200),
    welcomeLine: `Hey ${firstName}, welcome to ${company}'s office! I'm your Chief of Staff — let me show you around your new team.`,
    agents: [
      {
        displayName: 'Sales', role: 'sales', avatar: 'sales',
        tagline: `Outreach and proposals for ${company}`.slice(0, 80),
        systemPrompt: base('Sales lead', 'outreach emails, follow-ups, and proposals'),
        inputSchema: [
          { key: 'ask', label: 'What do you need?', type: 'text', placeholder: 'e.g. A follow-up email to a quote we sent', required: true },
          { key: 'context', label: 'Context', type: 'textarea', placeholder: 'Paste the thread, notes, or describe the customer…', required: true },
        ],
      },
      {
        displayName: 'Operations', role: 'ops', avatar: 'pm',
        tagline: `Plans and schedules for ${company}`.slice(0, 80),
        systemPrompt: base('Operations manager', 'plans, schedules, and status updates'),
        inputSchema: [
          { key: 'goal', label: 'What do you want to get done?', type: 'text', required: true },
          { key: 'details', label: 'Details & constraints', type: 'textarea', placeholder: 'Team, deadlines, what exists already…', required: true },
        ],
      },
      {
        displayName: 'Researcher', role: 'researcher', avatar: 'researcher',
        tagline: `Market and customer insight for ${company}`.slice(0, 80),
        systemPrompt: base('Research lead', 'decision-ready briefings on your market, competitors, and customers'),
        inputSchema: [
          { key: 'question', label: 'What do you want to know?', type: 'text', required: true },
          { key: 'material', label: 'Source material', type: 'textarea', placeholder: 'Paste articles, competitor pages, reviews…', required: true },
        ],
      },
    ],
  };
}
