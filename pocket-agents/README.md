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

Open **http://localhost:5173**. The Vite dev server proxies `/api` to the backend on port 3001.

Without `ANTHROPIC_API_KEY` the app runs in **demo mode**: the entire loop works (hiring, background tasks, ready tray, XP, unlocks, Boardroom) but outputs are clearly-labeled placeholders.

**Production-style run** (one server, serves the built frontend):

```bash
npm run build
npm start          # http://localhost:3001
```

## What's built (master-prompt milestones 1–7)

- **Hire** — gallery of the four role templates; hiring places the agent at a desk.
- **Assign** — click an agent → task form generated from the agent's `inputSchema` (v1 input is copy-paste).
- **Work (async, server-side)** — assigning creates a `tasks` row (`queued → running → done/failed`); an in-process worker claims it, calls the Claude API, and stores the result — independent of the browser tab. The client polls `/api/state` and shows an estimated completion time, with idle → working → done states on the character and a completion "ding".
- **Deliver** — clean, professional results panel (Markdown, not pixelated) with **copy / save / re-run / rate**.
- **Progress** — XP and levels per agent; achievements and cosmetics (plant, coffee machine, rug, dog) tied to *valuable usage* — acting on outputs, hiring, boardrooms — never raw API volume.
- **CEO / Boardroom** — one synthesis capability surfaced two ways: the Chief of Staff gives on-demand strategic reads of stored task history, and the **Boardroom** (unlocked by acting on 5 outputs) convenes weekly — auto-queued server-side when due — and delivers a board presentation on the premium model.
- **Game layer is optional** — the 📋 toggle switches to a plain list view; everything works without cosmetics.
- **In-app ready tray** (📬) — the v1 notification baseline; web push is a possible later enhancement.

## Models & cost

| Tier | Used by | Default model | Override |
|---|---|---|---|
| `standard` | Sales, PM, Researcher | `claude-haiku-4-5` (cost-efficient) | `MODEL_STANDARD` |
| `premium` | Chief of Staff + Boardroom | `claude-fable-5` (weekly strategy showcase) | `MODEL_PREMIUM` |

Token usage (`input + output`) is recorded per task (`tasks.modelUsed`, `tasks.tokensUsed`) and metered per user (`users.usageThisPeriod`) from day one — the basis for pricing and limits. Boardrooms have a weekly cooldown; re-runs are deliberate user actions.

## Privacy posture (v1)

- Pasted inputs and outputs live only in the local SQLite database (`server/data/`, gitignored).
- **One-click export** (⚙️ → Export JSON) and **one-click delete** (⚙️ → Delete all my data).
- The Claude API key is server-side only; the browser never sees it.
- Request logging is method/path/status only — task payloads are never written to logs.
- No compliance claims; the UI tells users not to paste regulated data.

## Architecture

```
pocket-agents/
  server/            Node + Express (plain JS, ESM)
    src/db.js        node:sqlite schema: users, agents, tasks, unlocks
    src/templates.js the four agent templates (hiring gallery seed)
    src/claude.js    Claude API calls via official SDK; model tiers; demo mode
    src/synthesis.js the CEO/Boardroom capability, built once
    src/queue.js     async worker loop + boardroom scheduling
    src/progression.js  XP, levels, unlock definitions
    src/routes.js    REST API
  web/               React + TypeScript + Vite + Tailwind + Zustand
    src/pixel/       hand-rolled pixel sprites rendered to <canvas>
    src/components/  office, hire gallery, task form, results panel, boardroom…
```

An **agent** is a stored config (`displayName, avatar, role, systemPrompt, inputSchema, outputFormat, modelTier, level, xp, ownerId`); running it = Claude call with `systemPrompt` + formatted user input, rendered per `outputFormat`, XP on completion.

The schema matches the master prompt's data model, so swapping SQLite + in-process worker for Supabase (Postgres + auth + Edge Functions) at deploy time is contained to `db.js`/`queue.js` — the API contract stays the same.

## Remaining milestones

8. Real auth + plan-based usage limits + paywall gate (single local user is stubbed today).
9. Privacy policy copy + auto-purge options for raw inputs.
10. Onboarding polish, deploy, web push.
