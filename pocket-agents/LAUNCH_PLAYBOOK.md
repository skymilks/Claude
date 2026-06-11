# Launch playbook — from this repo to your first paying client

The product is built. This is the path from here to revenue. Stop building;
start sending links.

## 1 · Put it on the internet (~30 minutes, ~$5/month)

Prospects will click your demo link from their phone. It has to load fast and
be HTTPS — a Codespace can't do that. Use **Railway** (simplest for
non-developers; Fly.io and Render also work — the Dockerfile is ready).

1. Go to **railway.app** → sign in with your GitHub account.
2. **New Project → Deploy from GitHub repo** → pick this repository.
3. In the service **Settings**, set **Root Directory** to `pocket-agents`
   (it will detect the Dockerfile automatically).
4. In **Variables**, add:
   | Variable | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | your key from console.anthropic.com |
   | `ADMIN_EMAILS` | the email YOU will sign up with |
   | `SECURE_COOKIES` | `1` |
   | `DATA_DIR` | `/data` |
5. Add a **Volume** mounted at `/data` (this is the database — without it,
   everything resets on redeploy).
6. **Settings → Networking → Generate Domain.** That URL is your product.

Smoke test: open the URL, sign up with your admin email, confirm you see the
**🏗️ Prospects** button, build a test office, open its link in a private
window, run one task for real.

> Costs: Railway ~$5/mo. Agent runs use the cheap model — a full demo
> (3 runs) costs roughly a cent. Your first ten pitches cost less than a coffee.

## 2 · Set up your booking link

Make a free **Calendly** (or similar) with a 20-minute "office tour" slot.
Paste it into the **"Claim your office" link** field every time you build a
prospect office. That's where the demo's green buttons send them.

## 3 · The pitch motion (your repeatable loop)

For each prospect, in order:

1. **Build their office** (5 min): Prospects panel → their name, company,
   **their website**, and 2-3 sentences about their business. We read the
   site, so the agents — and the ready-to-run ideas left on each desk —
   reference their real services and city. Review the draft, tweak names if
   you like, create the link.
2. **Walk through it yourself once.** You're about to send it; make sure the
   welcome line lands and the agents make sense for them.
3. **Send it personally.** Short message, no pitch deck:

   > Hey [Name] — I built something for [Company] and I'd rather show you
   > than explain it. Click this and look around, it takes 2 minutes:
   > [link]
   > It's a small team of AI staff I set up specifically for your business —
   > the first few tasks are on me. Tell me what you think.

4. **Follow up in 2-3 days** if quiet. You can see in the panel whether they
   used their runs — that's your opener: "Saw the office got a visitor — what
   did you think of [agent name]'s work?"
5. **They say yes → 🔑 Hand over.** In the Prospects panel, click **Hand
   over**, set their email + a temporary password, and send them their login.
   Their demo becomes their real account — same agents, same work history —
   which is your closing line: *"the office you tried is already yours."*

## 4 · Pricing (starting point — adjust after 3 conversations)

Done-for-you, invoice directly (e-transfer/invoice; Stripe comes later):

- **Setup: $500 one-time** — you build and tune their custom team.
- **$200–400/month** — the team, your tweaks, and you on call.

Anchor with the alternative: one part-time admin hire costs more per week
than this does per month. Don't price against ChatGPT ($20); you're not
selling software, you're selling a *configured team that already knows their
business*. If the first three prospects all say yes instantly, you priced
too low.

## 5 · Send three this week

Pick the three warmest contacts in your niche. Build all three offices in one
sitting (~20 min). Send personally. Everything you learn from those three
conversations is worth more than any feature we could build next.

## What we deliberately have NOT built yet (don't let it stop you)

- **Stripe billing** — invoice manually; wire Stripe after ~5 paying clients.
- **Email/calendar integrations** — copy-paste input is fine to sell with.
- **Client self-serve signup** — you don't want it; every client comes
  through you.

Track in a note: who you sent links to, did they click, did they run a task,
what they said. After 5 sends we'll know exactly what to improve.
