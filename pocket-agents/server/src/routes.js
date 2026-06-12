import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { db, uid, now } from './db.js';
import { templateById } from './templates.js';
import { demoMode, MODELS, friendlyApiError } from './claude.js';
import { estimateSeconds, boardroomStatus, queueBoardroom } from './queue.js';
import { addXp, evaluateUnlocks, UNLOCK_DEFS, levelFromXp, nextLevelXp, companyXp, XP } from './progression.js';
import { requireAuth, requireAdmin, isAdminUserId, hashPassword, startSession } from './auth.js';
import { PLANS, planOf, ensurePeriod, overCap } from './plans.js';
import { draftTeam, draftCustomAgent, sanitizeAgentConfigs, validateRoutine } from './prospects.js';
import { fetchSiteText } from './fetchsite.js';
import { insertAgent, hireFromTemplate, freeWorkerSlot, WORKER_SLOTS } from './hire.js';

export const routes = Router();

const getAgent = (id, ownerId) => db.prepare(`SELECT * FROM agents WHERE id = ? AND ownerId = ?`).get(id, ownerId);
const getTask = (id, ownerId) => db.prepare(`SELECT * FROM tasks WHERE id = ? AND ownerId = ?`).get(id, ownerId);

const agentToJson = (a) => ({
  ...a,
  inputSchema: JSON.parse(a.inputSchema),
  suggestions: a.suggestions ? JSON.parse(a.suggestions) : [],
  routine: a.routine ? JSON.parse(a.routine) : null,
  systemPrompt: undefined,
});
const taskToJson = (t) => ({ ...t, input: t.input ? JSON.parse(t.input) : null });

// Validate a task's input values against the agent's form schema. Shared by
// the account task route and the prospect-demo try route.
function collectTaskInput(agent, input) {
  const values = {};
  for (const field of JSON.parse(agent.inputSchema)) {
    const value = (input?.[field.key] ?? '').toString().trim();
    if (field.required && !value) return { error: `"${field.label}" is required` };
    if (value) values[field.key] = value.slice(0, 40_000);
  }
  return { values };
}

// ---------------------------------------------------------------------------
// Client office links (no auth — reached via an unguessable token). The link
// IS the sign-in: visiting it starts a normal session for that workspace, so
// the client gets the full product. No run caps, no claim CTAs — if it
// doesn't work out, the founder revokes the workspace.
routes.post('/api/office/:token/enter', (req, res) => {
  const workspace = db.prepare(`SELECT * FROM users WHERE demoToken = ? AND kind = 'demo'`).get(req.params.token);
  if (!workspace) return res.status(404).json({ error: 'This office link is no longer active.' });
  startSession(res, workspace.id);
  res.json({ ok: true });
});

// Everything below is per-account.
routes.use('/api', requireAuth);

routes.get('/api/state', (req, res) => {
  const user = ensurePeriod(req.userId);
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  const agents = db.prepare(`SELECT * FROM agents WHERE ownerId = ? ORDER BY hiredAt`).all(req.userId);
  const tasks = db.prepare(`SELECT * FROM tasks WHERE ownerId = ? ORDER BY createdAt DESC LIMIT 60`).all(req.userId);
  const unlocks = db.prepare(`SELECT * FROM unlocks WHERE ownerId = ?`).all(req.userId);
  const xp = companyXp(req.userId);
  res.json({
    user: {
      email: user.email,
      plan: user.plan,
      usageThisPeriod: user.usageThisPeriod,
      tokenCap: planOf(user).tokenCap,
      periodStart: user.periodStart,
    },
    // Who this office belongs to. Client workspaces carry the business info
    // the founder preloaded; needsIntake drives the first-run team setup.
    workspace: {
      kind: user.kind ?? 'user',
      name: user.prospectName ?? null,
      company: user.prospectCompany ?? null,
      brief: user.prospectBrief ?? null,
      welcomeLine: user.welcomeLine ?? null,
      needsIntake: agents.length === 0,
    },
    plans: { free: PLANS.free, pro: PLANS.pro },
    agents: agents.map(agentToJson),
    tasks: tasks.map(taskToJson),
    unlocks: unlocks.map((u) => ({ ...u, ...UNLOCK_DEFS.find((d) => d.key === u.key) })),
    unlockDefs: UNLOCK_DEFS,
    company: { xp, level: levelFromXp(xp), nextLevelXp: nextLevelXp(xp) },
    boardroom: boardroomStatus(req.userId),
    models: MODELS,
    demoMode,
    isAdmin: isAdminUserId(req.userId),
    now: now(),
  });
});

routes.post('/api/agents', (req, res) => {
  const { templateId, displayName } = req.body ?? {};
  const template = templateById(templateId);
  if (!template) return res.status(400).json({ error: 'Unknown template' });
  if (db.prepare(`SELECT 1 FROM agents WHERE ownerId = ? AND role = ?`).get(req.userId, template.role)) {
    return res.status(409).json({ error: `You already have a ${template.name} on the team` });
  }
  const deskSlot = template.role === 'ceo' ? 3 : freeWorkerSlot(req.userId);
  if (deskSlot === undefined) return res.status(409).json({ error: 'Every desk is taken' });

  const id = hireFromTemplate(req.userId, template, displayName, deskSlot);
  evaluateUnlocks(req.userId);
  res.json(agentToJson(db.prepare(`SELECT * FROM agents WHERE id = ?`).get(id)));
});

// The empty-desk builder, step 1: plain-English answers in, a reviewable
// drafted agent out (nothing persists until step 2).
routes.post('/api/agents/draft', async (req, res) => {
  const job = (req.body?.job ?? '').trim().slice(0, 200);
  const handoff = (req.body?.handoff ?? '').trim().slice(0, 2000);
  const business = (req.body?.business ?? '').trim().slice(0, 2000);
  if (!job || !handoff) return res.status(400).json({ error: 'Describe the job and what they should hand you' });
  if (!capGate(req, res)) return;
  try {
    res.json(await draftCustomAgent({ job, handoff, business }));
  } catch (err) {
    res.status(502).json({ error: friendlyApiError(err) });
  }
});

// Step 2: seat the (possibly edited) drafted agent at a free desk.
routes.post('/api/agents/custom', (req, res) => {
  const [config] = sanitizeAgentConfigs([req.body?.agent]);
  if (!config) return res.status(400).json({ error: 'The agent config is incomplete' });
  const deskSlot = freeWorkerSlot(req.userId);
  if (deskSlot === undefined) return res.status(409).json({ error: 'Every desk is taken' });

  const id = insertAgent(req.userId, { ...config, templateId: 'custom', suggestions: config.starterTasks }, deskSlot);
  evaluateUnlocks(req.userId);
  res.json(agentToJson(db.prepare(`SELECT * FROM agents WHERE id = ?`).get(id)));
});

// ---------------------------------------------------------------------------
// The intake: a new office's first run. The Chief of Staff asks the owner
// what's eating their week; the answers (plus any business info the founder
// preloaded) drive a drafted team the owner reviews and approves — nobody is
// handed agents they didn't choose.

routes.post('/api/intake/draft', async (req, res) => {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.userId);
  const pains = (req.body?.pains ?? '').toString().trim().slice(0, 2000);
  const handoff = (req.body?.handoff ?? '').toString().trim().slice(0, 2000);
  const business = (req.body?.business ?? '').toString().trim().slice(0, 4000);
  const description = user.prospectBrief || business;
  if (!pains) return res.status(400).json({ error: 'Tell us at least one thing that eats your week' });
  if (!description) return res.status(400).json({ error: 'Tell us a little about the business first' });
  if (!capGate(req, res)) return;
  try {
    res.json(
      await draftTeam({
        name: user.prospectName || (user.email ?? '').split('@')[0] || 'there',
        company: user.prospectCompany || 'your company',
        description,
        siteText: user.prospectSite || '',
        pains,
        handoff,
      })
    );
  } catch (err) {
    res.status(502).json({ error: friendlyApiError(err) });
  }
});

// Seat the approved (possibly edited) team. Only valid while the office is
// still empty — after that, hiring goes through the empty-desk builder.
routes.post('/api/intake/accept', (req, res) => {
  if (db.prepare(`SELECT 1 FROM agents WHERE ownerId = ?`).get(req.userId)) {
    return res.status(409).json({ error: 'Your team is already seated' });
  }
  const agents = sanitizeAgentConfigs(req.body?.agents);
  if (agents.length === 0) return res.status(400).json({ error: 'Approve at least one hire' });
  agents.forEach((config, i) => {
    insertAgent(
      req.userId,
      {
        ...config,
        templateId: 'custom',
        suggestions: config.starterTasks,
        // Approved routines start their weekly cadence now; the first
        // scheduled run lands a week out (starter tasks cover today).
        routine: config.routine
          ? { ...config.routine, nextRunAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() }
          : null,
      },
      WORKER_SLOTS[i]
    );
  });
  evaluateUnlocks(req.userId);
  res.json({ ok: true });
});

// Standing weekly routines on an agent: set (or replace) and clear. The
// owner can turn any task they liked into "do this every week".
routes.put('/api/agents/:id/routine', (req, res) => {
  const agent = getAgent(req.params.id, req.userId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const routine = validateRoutine(req.body?.routine, JSON.parse(agent.inputSchema));
  if (!routine) return res.status(400).json({ error: 'The routine needs a label and every required field filled' });
  const stored = { ...routine, nextRunAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() };
  db.prepare(`UPDATE agents SET routine = ? WHERE id = ?`).run(JSON.stringify(stored), agent.id);
  res.json(agentToJson(db.prepare(`SELECT * FROM agents WHERE id = ?`).get(agent.id)));
});

routes.delete('/api/agents/:id/routine', (req, res) => {
  const agent = getAgent(req.params.id, req.userId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  db.prepare(`UPDATE agents SET routine = NULL WHERE id = ?`).run(agent.id);
  res.json(agentToJson(db.prepare(`SELECT * FROM agents WHERE id = ?`).get(agent.id)));
});

// The paywall gate: new model work is blocked once the plan's monthly token
// budget is spent. Returns 402 with code 'over_cap' so the UI can offer the
// upgrade.
function capGate(req, res) {
  const user = ensurePeriod(req.userId);
  if (overCap(user)) {
    res.status(402).json({
      error: `You've used the ${planOf(user).name} plan's ${planOf(user).tokenCap.toLocaleString()} tokens for this month.`,
      code: 'over_cap',
    });
    return false;
  }
  return true;
}

routes.post('/api/tasks', (req, res) => {
  const { agentId, input } = req.body ?? {};
  const agent = getAgent(agentId, req.userId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (db.prepare(`SELECT 1 FROM tasks WHERE agentId = ? AND status IN ('queued','running')`).get(agentId)) {
    return res.status(409).json({ error: `${agent.displayName} is already working on something` });
  }
  if (!capGate(req, res)) return;

  const { values, error } = collectTaskInput(agent, input);
  if (error) return res.status(400).json({ error });

  if (agent.role === 'ceo') {
    const done = db.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE ownerId = ? AND status = 'done' AND kind = 'task'`).get(req.userId).n;
    if (done < 1) return res.status(400).json({ error: 'The Chief of Staff needs completed work from the team to read first.' });
  }

  const title = (values.taskType || values.goal || values.question || values.focus || 'Strategic read').slice(0, 80);
  const inputChars = Object.values(values).join('').length;
  const task = {
    id: uid(),
    agentId,
    title,
    input: JSON.stringify(values),
    estimatedSeconds: estimateSeconds(agent.modelTier, inputChars),
    createdAt: now(),
  };
  db.prepare(
    `INSERT INTO tasks (id, ownerId, agentId, kind, title, input, status, estimatedSeconds, createdAt)
     VALUES (?, ?, ?, 'task', ?, ?, 'queued', ?, ?)`
  ).run(task.id, req.userId, task.agentId, task.title, task.input, task.estimatedSeconds, task.createdAt);
  res.json(taskToJson(getTask(task.id, req.userId)));
});

routes.get('/api/tasks/:id', (req, res) => {
  const task = getTask(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(taskToJson(task));
});

// Acting on an output (copy / save / re-run / a strong rating) is what counts
// as valuable usage — it drives bonus XP and unlock progress.
routes.post('/api/tasks/:id/act', (req, res) => {
  const task = getTask(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const { action, rating } = req.body ?? {};

  let rerunTask = null;
  if (action === 'rate') {
    const value = Number(rating);
    if (!Number.isInteger(value) || value < 1 || value > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    db.prepare(`UPDATE tasks SET rating = ? WHERE id = ?`).run(value, task.id);
  } else if (action === 'rerun') {
    if (task.kind === 'boardroom') return res.status(400).json({ error: 'Boardrooms convene on schedule — they can’t be re-run.' });
    if (!task.input) return res.status(400).json({ error: 'The original input was purged for privacy, so this task can’t be re-run.' });
    if (db.prepare(`SELECT 1 FROM tasks WHERE agentId = ? AND status IN ('queued','running')`).get(task.agentId)) {
      return res.status(409).json({ error: 'That agent is already working on something' });
    }
    if (!capGate(req, res)) return;
    const agent = getAgent(task.agentId, req.userId);
    const id = uid();
    db.prepare(
      `INSERT INTO tasks (id, ownerId, agentId, kind, title, input, status, estimatedSeconds, createdAt)
       VALUES (?, ?, ?, 'task', ?, ?, 'queued', ?, ?)`
    ).run(id, req.userId, task.agentId, task.title, task.input, estimateSeconds(agent.modelTier, task.input.length), now());
    rerunTask = taskToJson(getTask(id, req.userId));
  } else if (action !== 'copy' && action !== 'save') {
    return res.status(400).json({ error: 'Unknown action' });
  }

  const counts = action === 'copy' || action === 'save' || action === 'rerun' || (action === 'rate' && Number(rating) >= 4);
  if (counts && !task.actedAt && task.status === 'done') {
    db.prepare(`UPDATE tasks SET actedAt = ? WHERE id = ?`).run(now(), task.id);
    addXp(task.agentId, XP.actedOn);
    evaluateUnlocks(req.userId);
  }

  res.json({ task: taskToJson(getTask(task.id, req.userId)), rerunTask });
});

routes.post('/api/tasks/:id/seen', (req, res) => {
  const task = getTask(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!task.seenAt) db.prepare(`UPDATE tasks SET seenAt = ? WHERE id = ?`).run(now(), task.id);
  res.json({ ok: true });
});

routes.delete('/api/tasks/:id', (req, res) => {
  db.prepare(`DELETE FROM tasks WHERE id = ? AND ownerId = ? AND status NOT IN ('queued','running')`).run(
    req.params.id, req.userId
  );
  res.json({ ok: true });
});

routes.post('/api/boardroom/convene', (req, res) => {
  const status = boardroomStatus(req.userId);
  if (!status.canConvene) return res.status(400).json({ error: 'Boardroom unavailable', blockedReason: status.blockedReason });
  if (!capGate(req, res)) return;
  const taskId = queueBoardroom(req.userId, status.ceoAgentId);
  res.json(taskToJson(getTask(taskId, req.userId)));
});

// Demo checkout: flips the plan so the gate and Pro experience are testable.
// Real billing (Stripe) replaces this endpoint before launch.
routes.post('/api/billing/upgrade', (req, res) => {
  db.prepare(`UPDATE users SET plan = 'pro' WHERE id = ?`).run(req.userId);
  res.json({ ok: true });
});

// Privacy: one-click export and delete.
routes.get('/api/account/export', (req, res) => {
  const user = db.prepare(`SELECT id, email, plan, usageThisPeriod, periodStart, createdAt FROM users WHERE id = ?`).get(req.userId);
  const data = {
    exportedAt: now(),
    user,
    agents: db.prepare(`SELECT * FROM agents WHERE ownerId = ?`).all(req.userId).map(agentToJson),
    tasks: db.prepare(`SELECT * FROM tasks WHERE ownerId = ?`).all(req.userId).map(taskToJson),
    unlocks: db.prepare(`SELECT * FROM unlocks WHERE ownerId = ?`).all(req.userId),
  };
  res.setHeader('Content-Disposition', 'attachment; filename="pocket-agents-export.json"');
  res.json(data);
});

routes.delete('/api/account', (req, res) => {
  db.prepare(`DELETE FROM tasks WHERE ownerId = ?`).run(req.userId);
  db.prepare(`DELETE FROM agents WHERE ownerId = ?`).run(req.userId);
  db.prepare(`DELETE FROM unlocks WHERE ownerId = ?`).run(req.userId);
  db.prepare(`UPDATE users SET usageThisPeriod = 0 WHERE id = ?`).run(req.userId);
  // A reset office starts the way a new one does: the intake runs again.
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Founder tools (ADMIN_EMAILS accounts only): set up a client's office before
// you've met them. You preload who they are and what the business does (their
// website is read for grounding); the client's own intake builds the team.

routes.post('/api/admin/prospects', requireAdmin, async (req, res) => {
  const name = (req.body?.name ?? '').trim();
  const company = (req.body?.company ?? '').trim();
  const description = (req.body?.description ?? '').trim();
  const websiteUrl = (req.body?.websiteUrl ?? '').trim();
  if (!name || !company || !description) {
    return res.status(400).json({ error: 'Name, company, and a business description are all required' });
  }

  // Their public website grounds the intake-time team draft in real services,
  // city, and customers.
  let siteText = '';
  if (websiteUrl) {
    try {
      siteText = await fetchSiteText(websiteUrl);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  const workspaceId = uid();
  const token = randomBytes(24).toString('base64url');
  // Full product from day one: client offices live on the Pro plan — its
  // monthly token budget is the only ceiling (cost protection, not a teaser).
  db.prepare(
    `INSERT INTO users (id, email, plan, usageThisPeriod, createdAt, periodStart, kind, demoToken,
                        prospectName, prospectCompany, prospectBrief, prospectSite, createdBy)
     VALUES (?, NULL, 'pro', 0, ?, ?, 'demo', ?, ?, ?, ?, ?, ?)`
  ).run(
    workspaceId, now(), now(), token,
    name.slice(0, 80), company.slice(0, 80), description.slice(0, 4000), siteText || null, req.userId
  );
  res.json({ id: workspaceId, token, url: `/office/${token}` });
});

routes.get('/api/admin/prospects', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(`SELECT id, prospectName, prospectCompany, demoToken, usageThisPeriod, createdAt FROM users WHERE kind = 'demo' ORDER BY createdAt DESC`)
    .all();
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.prospectName,
      company: r.prospectCompany,
      url: `/office/${r.demoToken}`,
      createdAt: r.createdAt,
      agentCount: db.prepare(`SELECT COUNT(*) AS n FROM agents WHERE ownerId = ?`).get(r.id).n,
      tasksDone: db.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE ownerId = ? AND status = 'done'`).get(r.id).n,
      tokensUsed: r.usageThisPeriod,
    }))
  );
});

// When a client starts paying, their workspace gets a proper login: same
// agents, same work history. The office link keeps working until you revoke.
routes.post('/api/admin/prospects/:id/convert', requireAdmin, (req, res) => {
  const workspace = db.prepare(`SELECT id FROM users WHERE id = ? AND kind = 'demo'`).get(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  const email = (req.body?.email ?? '').trim().toLowerCase();
  const password = req.body?.password ?? '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (db.prepare(`SELECT 1 FROM users WHERE email = ?`).get(email)) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }
  db.prepare(
    `UPDATE users SET kind = 'user', email = ?, passwordHash = ?, plan = 'pro', demoToken = NULL, periodStart = ? WHERE id = ?`
  ).run(email, hashPassword(password), now(), workspace.id);
  res.json({ ok: true });
});

// Revoking access: the workspace, its sessions, and everything in it go away.
routes.delete('/api/admin/prospects/:id', requireAdmin, (req, res) => {
  const workspace = db.prepare(`SELECT id FROM users WHERE id = ? AND kind = 'demo'`).get(req.params.id);
  if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
  db.prepare(`DELETE FROM sessions WHERE userId = ?`).run(workspace.id);
  db.prepare(`DELETE FROM tasks WHERE ownerId = ?`).run(workspace.id);
  db.prepare(`DELETE FROM agents WHERE ownerId = ?`).run(workspace.id);
  db.prepare(`DELETE FROM unlocks WHERE ownerId = ?`).run(workspace.id);
  db.prepare(`DELETE FROM users WHERE id = ?`).run(workspace.id);
  res.json({ ok: true });
});
