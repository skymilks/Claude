# Pocket Agents

A web app where a business owner runs a small "executive team" of AI agents — Sales, Project Manager, Researcher, and a Chief of Staff — as pixel-art characters in a cozy top-down office. The agents do real work; the game layer is purely cosmetic and never gates it.

## Run it

Requires **Node.js ≥ 22.5** (uses the built-in `node:sqlite` — no native deps, no external database).

```bash
cd pocket-agents
npm install

# real outputs (recommended) — key stays server-side only
export ANTHROPIC_API_KEY=sk-ant-...

npm run dev
```

Open **http://localhost:5173**, create an account, and hire your first agent. The Vite dev server proxies `/api` to the backend on port 3001.

Without `ANTHROPIC_API_KEY` the app runs in **demo mode**: the entire loop works (accounts, background tasks, ready tray, XP, unlocks, Boardroom, paywall) but outputs are clearly-labeled placeholders.

**Production-style run** (one server, serves the built frontend):

```bash
npm run build
npm start          # http://localhost:3001
```

## What's built (master-prompt milestones 1–9, plus polish)

**The core loop**
- **Hire** — gallery of the four role templates; hiring places the agent at a desk.
- **Assign** — click an agent → task form generated from the agent's `inputSchema` (v1 input is copy-paste).
- **Work (async, server-side)** — assigning creates a `tasks` row (`queued → running → done/failed`); an in-process worker claims it, calls the Claude API, and stores the result — independent of the browser tab. The client polls `/api/state`, shows estimated completion, and plays a "ding" on delivery.
- **Deliver** — clean, professional results panel (Markdown, not pixelated) with **copy / save / re-run / rate**.
- **Progress** — XP and levels per agent; achievements and cosmetics (plant, coffee machine, rug, dog) tied to *valuable usage* — acting on outputs, hiring, boardrooms — never raw API volume.
- **CEO / Boardroom** — one synthesis capability surfaced two ways: on-demand strategic reads, and the weekly **Boardroom** (unlocked by acting on 5 outputs, auto-convenes server-side when due) on the premium model.
- **Game layer optional** — the 📋 toggle switches to a plain list view; everything works without cosmetics.

**Accounts & plans (milestone 8)**
- Built-in email+password auth: scrypt hashes, session tokens in SQLite, httpOnly `SameSite=Lax` cookie, login throttling. Set `SECURE_COOKIES=1` behind HTTPS.
- Workspaces are fully isolated per account. A database created before accounts existed is adopted by the first signup.
- Monthly token budgets per plan, reset on month rollover; when the budget is spent, new tasks/boardrooms return `402` and the UI offers the upgrade. The upgrade button is a **demo checkout** (instantly switches to Pro) until Stripe is wired in.

**Privacy (milestone 9)**
- Raw task **inputs are auto-purged ~24h** after a task finishes (re-run is offered only while the input exists).
- Done/failed outputs **never acted on are deleted after 30 days**; saved/copied/rated work and Boardroom reports stay until deleted.
- One-click **export** and **delete-everything** in the ⚙️ menu; plain-language data-handling copy in the app (no compliance overclaims; "don't paste regulated data yet").
- The API key never leaves the server; logs record method/path/status only — never task payloads.

**Onboarding & deploy (milestone 10)**
- Getting-started checklist for new accounts; Escape closes modals; click-outside closes menus.
- `Dockerfile` for a single-container deploy (see below).

## Prospect demo offices (the done-for-you closing tool)

The boutique pivot: before you've even met a prospect, build them a personalized
office and send a link. They click it and land in **their** office — no signup —
where the Chief of Staff walks up, greets them by name, and gives a first-day
tour of a team drafted specifically for their business. They can put an agent to
work for real (`DEMO_RUN_CAP` free runs, standard model) and then hit
**Claim your office** — your booking link.

How to use it:
1. Set `ADMIN_EMAILS=you@example.com` on the server and sign in with that
   account — a **🏗️ Prospects** button appears in the header.
2. Enter the prospect's name, company, and a plain-English description of their
   business. Claude (premium tier) drafts three tailored agents, a brief, and a
   personal welcome line; without an API key a sensible templated draft is used.
3. Tweak names/prompts if you like, click **Create demo link**, and send it.
4. The panel lists every sent office with runs used; delete one to kill its link.

Demo workspaces are isolated `users` rows (`kind='demo'`) reached only by an
unguessable token — prospects never see system prompts, and demo runs are
metered per office so you always know what a pitch cost.

## Models & cost

| Tier | Used by | Default model | Override |
|---|---|---|---|
| `standard` | Sales, PM, Researcher | `claude-haiku-4-5` (cost-efficient) | `MODEL_STANDARD` |
| `premium` | Chief of Staff + Boardroom | `claude-fable-5` (weekly strategy showcase) | `MODEL_PREMIUM` |

Token usage (`input + output`) is recorded per task (`tasks.modelUsed`, `tasks.tokensUsed`) and metered per user per month — the basis for pricing and limits.

| Env var | Default | Meaning |
|---|---|---|
| `FREE_TOKEN_CAP` | `300000` | Free plan tokens/month |
| `PRO_TOKEN_CAP` | `5000000` | Pro plan tokens/month |
| `INPUT_RETENTION_HOURS` | `24` | How long raw task inputs are kept after finish |
| `UNSAVED_OUTPUT_RETENTION_DAYS` | `30` | How long un-acted-on outputs are kept |
| `SECURE_COOKIES` | unset | Set `1` in HTTPS deployments |
| `DATA_DIR` | `server/data` | SQLite location |
| `PORT` | `3001` | Server port |
| `ADMIN_EMAILS` | unset | Comma-separated founder emails — unlocks the Prospects builder |
| `DEMO_RUN_CAP` | `3` | Free agent runs per prospect demo office |

## Deploy

Any host that runs a Node server or a container works. With Docker:

```bash
docker build -t pocket-agents .
docker run -p 3001:3001 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e SECURE_COOKIES=1 \
  -v pocket_agents_data:/data \
  pocket-agents
```

Notes:
- Mount a volume at `/data` — that's the SQLite database.
- Single container = API + frontend on one port; put your platform's HTTPS proxy in front (Fly.io, Railway, Render all do this automatically).
- The Supabase swap (Postgres + managed auth + Edge Functions) remains the scale-up path: the schema matches the master prompt's data model, so it's contained to `db.js`/`auth.js`/`queue.js` — the API contract stays the same.

## Architecture

```
pocket-agents/
  server/            Node + Express (plain JS, ESM)
    src/db.js        node:sqlite schema: users, sessions, agents, tasks, unlocks
    src/auth.js      email+password, sessions, login throttle, legacy adoption
    src/plans.js     plan caps + monthly usage periods
    src/templates.js the four agent templates (hiring gallery seed)
    src/claude.js    Claude API calls via official SDK; model tiers; demo mode
    src/synthesis.js the CEO/Boardroom capability, built once
    src/queue.js     async worker loop + boardroom scheduling + privacy sweeper
    src/progression.js  XP, levels, unlock definitions
    src/routes.js    REST API (auth-scoped per request)
  web/               React + TypeScript + Vite + Tailwind + Zustand
    src/pixel/       hand-rolled pixel sprites rendered to <canvas>
    src/components/  office, hire gallery, task form, results panel, boardroom,
                     auth screen, upgrade modal, privacy copy, onboarding…
```

An **agent** is a stored config (`displayName, avatar, role, systemPrompt, inputSchema, outputFormat, modelTier, level, xp, ownerId`); running it = Claude call with `systemPrompt` + formatted user input, rendered per `outputFormat`, XP on completion.

## What's next (v2 candidates)

- Real billing (Stripe) behind the existing 402 gate and upgrade modal.
- Integrations replacing copy-paste input (email, calendar, docs).
- True orchestration: the CEO triggers fresh agent runs before synthesizing.
- Web push for "ready" notifications (Service Worker + Push API; in-app tray is the baseline).
- Supabase/Postgres migration for multi-instance deploys.
