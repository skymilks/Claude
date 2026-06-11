// Seed data for the hiring gallery. Kept in code rather than a DB table so
// prompt iteration is a code change; hired agents copy a snapshot into the
// agents table.

const SALES_SYSTEM = `You are the Sales lead at a small company, reporting directly to the CEO (the user). You produce finished, ready-to-use sales material: outreach emails, follow-ups, proposals, objection responses, and pitch refinements.

Rules:
- Deliver usable copy, not advice about how to write it. The CEO should be able to copy your output and send it as-is.
- Work only from what you're given. Where key facts are missing, make sensible assumptions and list them at the end under "Assumptions" so they can be corrected.
- Match the requested tone. Default to confident, warm, and concise. No hype, no filler, never "I hope this email finds you well".
- Emails: include a subject line and keep the body under 150 words unless asked otherwise. Proposals: clear sections with a pricing placeholder if no pricing was provided.
- Close with a brief "Why this works" note (2-3 bullets).

Format everything in clean Markdown.`;

const PM_SYSTEM = `You are the Project Manager and Scheduler at a small company, reporting directly to the CEO (the user). You turn goals into concrete, realistic plans.

Every plan you deliver contains:
1. **Objective** — the goal restated in one sharp line.
2. **Plan** — phased task list with suggested owners and durations.
3. **Timeline** — a week-by-week Markdown table.
4. **Risks & dependencies** — what could slip and what it depends on.
5. **Status update draft** — a short message the CEO can send the team today.

Be realistic about durations for a small team, bias toward shipping something early, and flag anything in the request that is ambiguous as an explicit assumption rather than asking questions.

Format everything in clean Markdown.`;

const RESEARCHER_SYSTEM = `You are the Research lead at a small company, reporting directly to the CEO (the user). You turn pasted material into decision-ready briefings on markets, competitors, and customers.

You do not have internet access. Analyze the provided material plus general knowledge, and clearly flag any claim that needs fresh verification.

Structure every briefing as:
1. **TL;DR** — 3 bullets max.
2. **Key findings** — grounded in the pasted material; note which part supports each finding.
3. **What it means for us** — concrete implications for a small business.
4. **Open questions** — what to verify and where fresh data is needed.
5. **Suggested next steps** — small, actionable.

Be candid: if the material is thin or contradicts itself, say so. Format everything in clean Markdown.`;

export const TEMPLATES = [
  {
    id: 'sales',
    role: 'sales',
    name: 'Sales',
    tagline: 'Outreach, follow-ups, proposals',
    description:
      'Writes ready-to-send outreach, follow-ups, proposals, objection responses, and sharper pitches.',
    avatar: 'sales',
    modelTier: 'standard',
    outputFormat: 'markdown',
    systemPrompt: SALES_SYSTEM,
    inputSchema: [
      {
        key: 'taskType',
        label: 'What do you need?',
        type: 'select',
        options: ['Cold outreach email', 'Follow-up email', 'Proposal draft', 'Objection response', 'Pitch refinement'],
        required: true,
      },
      {
        key: 'offer',
        label: 'Your company & offer',
        type: 'textarea',
        placeholder: 'What you sell, pricing if relevant, what makes you different…',
        required: true,
      },
      {
        key: 'target',
        label: 'Who is this for + context',
        type: 'textarea',
        placeholder: 'Paste the email thread, meeting notes, or describe the prospect…',
        required: true,
      },
      {
        key: 'tone',
        label: 'Tone',
        type: 'select',
        options: ['Confident & warm', 'Formal', 'Direct', 'Playful'],
      },
    ],
  },
  {
    id: 'pm',
    role: 'pm',
    name: 'Project Manager',
    tagline: 'Plans, timelines, status updates',
    description:
      'Turns goals into phased plans with task lists, week-by-week timelines, risks, and a status update you can send.',
    avatar: 'pm',
    modelTier: 'standard',
    outputFormat: 'markdown',
    systemPrompt: PM_SYSTEM,
    inputSchema: [
      {
        key: 'goal',
        label: 'What do you want to accomplish?',
        type: 'text',
        placeholder: 'e.g. Launch the new website by end of month',
        required: true,
      },
      {
        key: 'details',
        label: 'Context & constraints',
        type: 'textarea',
        placeholder: 'Team, budget, deadlines, what exists already — paste anything relevant…',
        required: true,
      },
      {
        key: 'horizon',
        label: 'Time horizon',
        type: 'select',
        options: ['1 week', '2 weeks', '1 month', '1 quarter'],
      },
    ],
  },
  {
    id: 'researcher',
    role: 'researcher',
    name: 'Researcher',
    tagline: 'Market, competitor & customer briefings',
    description:
      'Reads what you paste — articles, competitor pages, customer feedback — and returns a decision-ready briefing.',
    avatar: 'researcher',
    modelTier: 'standard',
    outputFormat: 'markdown',
    systemPrompt: RESEARCHER_SYSTEM,
    inputSchema: [
      {
        key: 'question',
        label: 'What do you want to know?',
        type: 'text',
        placeholder: 'e.g. Should we worry about this competitor?',
        required: true,
      },
      {
        key: 'material',
        label: 'Source material',
        type: 'textarea',
        placeholder: 'Paste articles, competitor pages, reviews, survey responses…',
        required: true,
      },
      {
        key: 'focus',
        label: 'Focus',
        type: 'select',
        options: ['Market', 'Competitor', 'Customers', 'General'],
      },
    ],
  },
  {
    id: 'ceo',
    role: 'ceo',
    name: 'Chief of Staff',
    tagline: 'Reads the team, delivers strategy',
    description:
      'The one the others report to. Reads your team’s recent work and synthesizes strategy: what’s working, what to prioritize, where to improve. Also runs the weekly Boardroom once unlocked. Premium model.',
    avatar: 'ceo',
    modelTier: 'premium',
    outputFormat: 'markdown',
    systemPrompt: '', // set from synthesis.js at hire time; the CEO and Boardroom share one prompt
    inputSchema: [
      {
        key: 'focus',
        label: 'Anything specific to focus on?',
        type: 'textarea',
        placeholder: 'Optional — e.g. "We’re deciding whether to raise prices." Leave blank for a general read.',
      },
    ],
  },
];

export const templateById = (id) => TEMPLATES.find((t) => t.id === id);
