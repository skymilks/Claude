// The personalization engine behind the "done-for-you" pitch: the founder
// describes a prospect's business in plain English (optionally backed by the
// text of their public website) and Claude drafts a tailored office — three
// custom agents (names, system prompts, task forms), ready-to-run starter
// tasks left on each desk, a one-paragraph brief, and a personal welcome
// line. The founder reviews and tweaks the draft before it becomes a
// shareable demo workspace.
//
// The same engine drafts single agents for the in-app "empty desk" builder.
import { runModel, demoMode } from './claude.js';

const AVATARS = ['sales', 'pm', 'researcher', 'ceo'];
const FIELD_TYPES = ['text', 'textarea', 'select'];

const AGENT_SHAPE = `{
  "displayName": "string (max 24 chars)",
  "role": "short-slug",
  "avatar": "sales|pm|researcher",
  "tagline": "string",
  "systemPrompt": "string",
  "inputSchema": [
    { "key": "string", "label": "string", "type": "text|textarea|select", "placeholder": "string (optional)", "options": ["only for select"], "required": true }
  ],
  "starterTasks": [
    { "label": "string", "input": { "fieldKey": "prefilled value for that field" } }
  ]
}`;

const AGENT_RULES = `Rules for each agent:
- Genuinely tailored: role names, system prompts, and form fields must reference the company's industry, customers, and likely day-to-day work — never generic.
- systemPrompt is complete and self-contained: it states who the agent is at THIS company, what finished work products it delivers, concrete formatting rules, and that it should make sensible assumptions (listed at the end of its output) rather than asking questions. Outputs are clean Markdown the owner can use as-is.
- inputSchema has 2-4 fields. Field types: "text" (short), "textarea" (paste-in context), or "select" (with an "options" array). Mark truly necessary fields "required": true. Placeholders show realistic examples for this business.
- avatar must be one of: "sales", "pm", "researcher".
- tagline is one short line (under 60 chars) describing what the agent does for this company.
- starterTasks: exactly 2 ready-to-run example tasks, the agent's best first impressions. Each has a short imperative label (under 60 chars) and an input object that fills the agent's OWN inputSchema fields (every required field) with realistic, fully-written sample values for this specific business — name plausible customers, jobs, amounts, and dates so the task runs to a great result with zero typing. Use details from the provided material wherever possible; invent only typical specifics.`;

const DRAFT_SYSTEM = `You design small AI teams for specific businesses. Given a prospect's name, company, and material about what the company does, you produce a JSON spec for three AI agents tailored to that exact business, plus a short brief and a personal welcome line.

${AGENT_RULES}

Respond with ONLY a JSON object, no markdown fences, in exactly this shape:
{
  "brief": "one paragraph on the business and what this team is set up to do for it",
  "welcomeLine": "a warm 1-2 sentence greeting addressed to the prospect by first name, from their new Chief of Staff, welcoming them to their company's office",
  "agents": [${AGENT_SHAPE}]
}`;

const SINGLE_SYSTEM = `You design AI agents for small businesses. The business owner will tell you, in plain English, what job they want done and what the agent should hand them. You produce a JSON spec for ONE agent that does exactly that job for their business.

${AGENT_RULES}

Respond with ONLY a JSON object, no markdown fences, in exactly this shape:
${AGENT_SHAPE}`;

export async function draftProspectOffice({ name, company, description, siteText }) {
  if (demoMode) return fallbackDraft({ name, company, description });

  const userContent =
    `Prospect: ${name}\nCompany: ${company}\n\nWhat the company does:\n${description}` +
    (siteText ? `\n\nText from their public website:\n${siteText}` : '');
  const { text } = await runModel({ modelTier: 'premium', system: DRAFT_SYSTEM, userContent });
  return validateDraft(parseJson(text), { name, company, description });
}

// The in-app "empty desk" builder: a few plain-English answers in, one
// tailored agent out.
export async function draftCustomAgent({ job, handoff, business }) {
  const fallback = fallbackCustomAgent({ job, handoff, business });
  if (demoMode) return fallback;

  const userContent =
    `The job I want done: ${job}\n\nWhat they should hand me, and what great looks like:\n${handoff}` +
    (business ? `\n\nAbout my business:\n${business}` : '');
  const { text } = await runModel({ modelTier: 'premium', system: SINGLE_SYSTEM, userContent });
  const [agent] = sanitizeAgentConfigs([parseJson(text)]);
  if (!agent) throw new Error('The draft came back incomplete — try again.');
  return agent;
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
    .map((a, i) => {
      const inputSchema = validateSchema(a?.inputSchema);
      return {
        displayName: str(a?.displayName, 24) || `Agent ${i + 1}`,
        role: (str(a?.role, 32) || `agent-${i + 1}`).toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
        avatar: AVATARS.includes(a?.avatar) && a?.avatar !== 'ceo' ? a.avatar : ['sales', 'pm', 'researcher'][i % 3],
        tagline: str(a?.tagline, 80) || 'Tailored to your business',
        systemPrompt: str(a?.systemPrompt, 8000),
        inputSchema,
        starterTasks: validateStarterTasks(a?.starterTasks, inputSchema),
      };
    })
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

// A starter task is only kept if it actually runs: known field keys, every
// required field filled.
function validateStarterTasks(tasks, schema) {
  const keys = new Set(schema.map((f) => f.key));
  const required = schema.filter((f) => f.required).map((f) => f.key);
  return (Array.isArray(tasks) ? tasks : [])
    .slice(0, 3)
    .map((t) => ({
      label: str(t?.label, 60),
      input: Object.fromEntries(
        Object.entries(t?.input && typeof t.input === 'object' ? t.input : {})
          .filter(([k]) => keys.has(k))
          .map(([k, v]) => [k, str(v, 4000)])
          .filter(([, v]) => v)
      ),
    }))
    .filter((t) => t.label && required.every((k) => t.input[k]));
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
        starterTasks: [
          {
            label: 'Follow up on an outstanding quote',
            input: {
              ask: 'A friendly follow-up email for a quote we sent last week',
              context: `We quoted a customer last Tuesday and haven't heard back. They seemed keen on the phone but mentioned comparing a couple of options. Business: ${about}`,
            },
          },
          {
            label: 'Ask a happy customer for a review',
            input: {
              ask: 'A short email asking a happy customer to leave us a Google review',
              context: `We finished a job for them yesterday and they were thrilled with the result. Business: ${about}`,
            },
          },
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
        starterTasks: [
          {
            label: 'Plan next week for the team',
            input: {
              goal: 'A simple plan for next week that keeps every job on track',
              details: `Small team, a mix of booked jobs and new enquiries coming in. Business: ${about}`,
            },
          },
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
        starterTasks: [
          {
            label: 'Find quick wins to stand out locally',
            input: {
              question: 'What are 3 quick ways we could stand out from similar local businesses?',
              material: `What we know about the business: ${about}. Typical competitors are similar-sized local firms competing on response time, reviews, and referrals.`,
            },
          },
        ],
      },
    ],
  };
}

function fallbackCustomAgent({ job, handoff, business }) {
  const about = business ? ` About the business: ${business.slice(0, 400)}` : '';
  return sanitizeAgentConfigs([
    {
      displayName: (job ?? 'Specialist').slice(0, 24),
      role: 'custom',
      avatar: 'pm',
      tagline: (job ?? 'Your custom hire').slice(0, 80),
      systemPrompt: `You are a specialist hired for one job: ${job}. What you hand the owner, and what great looks like: ${handoff}.${about}\n\nDeliver finished, ready-to-use work — never advice about how to do it. Where key facts are missing, make sensible assumptions and list them at the end under "Assumptions". Format everything in clean Markdown.`,
      inputSchema: [
        { key: 'ask', label: 'What do you need this time?', type: 'text', placeholder: job, required: true },
        { key: 'context', label: 'Context & material', type: 'textarea', placeholder: 'Paste anything relevant — notes, threads, lists…', required: true },
      ],
      starterTasks: [
        {
          label: `First pass: ${(job ?? 'the job').slice(0, 44)}`,
          input: { ask: job, context: `${handoff}${about}` },
        },
      ],
    },
  ])[0];
}
