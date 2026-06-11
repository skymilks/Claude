import { Router } from 'express';
import { db, uid, now } from './db.js';
import { TEMPLATES, templateById } from './templates.js';
import { CEO_SYSTEM } from './synthesis.js';
import { demoMode, MODELS } from './claude.js';
import { estimateSeconds, boardroomStatus, queueBoardroom } from './queue.js';
import { addXp, evaluateUnlocks, UNLOCK_DEFS, levelFromXp, nextLevelXp, companyXp, XP } from './progression.js';
import { requireAuth } from './auth.js';
import { PLANS, planOf, ensurePeriod, overCap } from './plans.js';

export const routes = Router();

const getAgent = (id, ownerId) => db.prepare(`SELECT * FROM agents WHERE id = ? AND ownerId = ?`).get(id, ownerId);
const getTask = (id, ownerId) => db.prepare(`SELECT * FROM tasks WHERE id = ? AND ownerId = ?`).get(id, ownerId);

const agentToJson = (a) => ({ ...a, inputSchema: JSON.parse(a.inputSchema), systemPrompt: undefined });
const taskToJson = (t) => ({ ...t, input: t.input ? JSON.parse(t.input) : null });

// The hiring gallery is static product copy — fine to serve pre-auth.
routes.get('/api/templates', (_req, res) => {
  res.json(TEMPLATES.map(({ systemPrompt, ...t }) => t));
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
    plans: { free: PLANS.free, pro: PLANS.pro },
    agents: agents.map(agentToJson),
    tasks: tasks.map(taskToJson),
    unlocks: unlocks.map((u) => ({ ...u, ...UNLOCK_DEFS.find((d) => d.key === u.key) })),
    unlockDefs: UNLOCK_DEFS,
    company: { xp, level: levelFromXp(xp), nextLevelXp: nextLevelXp(xp) },
    boardroom: boardroomStatus(req.userId),
    models: MODELS,
    demoMode,
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

  // Desk slots 0-2 are the worker row; slot 3 is the CEO's spot by the window.
  const taken = new Set(db.prepare(`SELECT deskSlot FROM agents WHERE ownerId = ?`).all(req.userId).map((r) => r.deskSlot));
  const deskSlot = template.role === 'ceo' ? 3 : [0, 1, 2].find((slot) => !taken.has(slot)) ?? 0;

  const agent = {
    id: uid(),
    ownerId: req.userId,
    templateId: template.id,
    displayName: (displayName || '').trim().slice(0, 24) || template.name,
    role: template.role,
    avatar: template.avatar,
    systemPrompt: template.role === 'ceo' ? CEO_SYSTEM : template.systemPrompt,
    inputSchema: JSON.stringify(template.inputSchema),
    outputFormat: template.outputFormat,
    modelTier: template.modelTier,
    deskSlot,
    hiredAt: now(),
  };
  db.prepare(
    `INSERT INTO agents (id, ownerId, templateId, displayName, role, avatar, systemPrompt, inputSchema, outputFormat, modelTier, deskSlot, hiredAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    agent.id, agent.ownerId, agent.templateId, agent.displayName, agent.role, agent.avatar,
    agent.systemPrompt, agent.inputSchema, agent.outputFormat, agent.modelTier, agent.deskSlot, agent.hiredAt
  );
  evaluateUnlocks(req.userId);
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

  const fields = JSON.parse(agent.inputSchema);
  const values = {};
  for (const field of fields) {
    const value = (input?.[field.key] ?? '').toString().trim();
    if (field.required && !value) return res.status(400).json({ error: `"${field.label}" is required` });
    if (value) values[field.key] = value.slice(0, 40_000);
  }

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
  res.json({ ok: true });
});
