import { Router } from 'express';
import { db, uid, now, OWNER_ID } from './db.js';
import { TEMPLATES, templateById } from './templates.js';
import { CEO_SYSTEM } from './synthesis.js';
import { demoMode, MODELS } from './claude.js';
import { estimateSeconds, boardroomStatus, queueBoardroom } from './queue.js';
import { addXp, evaluateUnlocks, UNLOCK_DEFS, levelFromXp, nextLevelXp, companyXp, XP } from './progression.js';

export const routes = Router();

const getUser = () => db.prepare(`SELECT * FROM users WHERE id = ?`).get(OWNER_ID);
const getAgent = (id) => db.prepare(`SELECT * FROM agents WHERE id = ? AND ownerId = ?`).get(id, OWNER_ID);
const getTask = (id) => db.prepare(`SELECT * FROM tasks WHERE id = ? AND ownerId = ?`).get(id, OWNER_ID);

const agentToJson = (a) => ({ ...a, inputSchema: JSON.parse(a.inputSchema), systemPrompt: undefined });
const taskToJson = (t) => ({ ...t, input: t.input ? JSON.parse(t.input) : null });

routes.get('/api/templates', (_req, res) => {
  res.json(TEMPLATES.map(({ systemPrompt, ...t }) => t));
});

routes.get('/api/state', (_req, res) => {
  const user = getUser();
  const agents = db.prepare(`SELECT * FROM agents WHERE ownerId = ? ORDER BY hiredAt`).all(OWNER_ID);
  const tasks = db.prepare(`SELECT * FROM tasks WHERE ownerId = ? ORDER BY createdAt DESC LIMIT 60`).all(OWNER_ID);
  const unlocks = db.prepare(`SELECT * FROM unlocks WHERE ownerId = ?`).all(OWNER_ID);
  const xp = companyXp();
  res.json({
    user: { plan: user.plan, usageThisPeriod: user.usageThisPeriod },
    agents: agents.map(agentToJson),
    tasks: tasks.map(taskToJson),
    unlocks: unlocks.map((u) => ({ ...u, ...UNLOCK_DEFS.find((d) => d.key === u.key) })),
    unlockDefs: UNLOCK_DEFS,
    company: { xp, level: levelFromXp(xp), nextLevelXp: nextLevelXp(xp) },
    boardroom: boardroomStatus(),
    models: MODELS,
    demoMode,
    now: now(),
  });
});

routes.post('/api/agents', (req, res) => {
  const { templateId, displayName } = req.body ?? {};
  const template = templateById(templateId);
  if (!template) return res.status(400).json({ error: 'Unknown template' });
  if (db.prepare(`SELECT 1 FROM agents WHERE ownerId = ? AND role = ?`).get(OWNER_ID, template.role)) {
    return res.status(409).json({ error: `You already have a ${template.name} on the team` });
  }

  // Desk slots 0-2 are the worker row; slot 3 is the CEO's spot by the window.
  const taken = new Set(db.prepare(`SELECT deskSlot FROM agents WHERE ownerId = ?`).all(OWNER_ID).map((r) => r.deskSlot));
  const deskSlot = template.role === 'ceo' ? 3 : [0, 1, 2].find((slot) => !taken.has(slot)) ?? 0;

  const agent = {
    id: uid(),
    ownerId: OWNER_ID,
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
  evaluateUnlocks();
  res.json(agentToJson(db.prepare(`SELECT * FROM agents WHERE id = ?`).get(agent.id)));
});

routes.post('/api/tasks', (req, res) => {
  const { agentId, input } = req.body ?? {};
  const agent = getAgent(agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  if (db.prepare(`SELECT 1 FROM tasks WHERE agentId = ? AND status IN ('queued','running')`).get(agentId)) {
    return res.status(409).json({ error: `${agent.displayName} is already working on something` });
  }

  const fields = JSON.parse(agent.inputSchema);
  const values = {};
  for (const field of fields) {
    const value = (input?.[field.key] ?? '').toString().trim();
    if (field.required && !value) return res.status(400).json({ error: `"${field.label}" is required` });
    if (value) values[field.key] = value.slice(0, 40_000);
  }

  if (agent.role === 'ceo') {
    const done = db.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE ownerId = ? AND status = 'done' AND kind = 'task'`).get(OWNER_ID).n;
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
  ).run(task.id, OWNER_ID, task.agentId, task.title, task.input, task.estimatedSeconds, task.createdAt);
  res.json(taskToJson(getTask(task.id)));
});

routes.get('/api/tasks/:id', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(taskToJson(task));
});

// Acting on an output (copy / save / re-run / a strong rating) is what counts
// as valuable usage — it drives bonus XP and unlock progress.
routes.post('/api/tasks/:id/act', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const { action, rating } = req.body ?? {};

  let rerunTask = null;
  if (action === 'rate') {
    const value = Number(rating);
    if (!Number.isInteger(value) || value < 1 || value > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    db.prepare(`UPDATE tasks SET rating = ? WHERE id = ?`).run(value, task.id);
  } else if (action === 'rerun') {
    if (task.kind === 'boardroom') return res.status(400).json({ error: 'Boardrooms convene on schedule — they can’t be re-run.' });
    if (db.prepare(`SELECT 1 FROM tasks WHERE agentId = ? AND status IN ('queued','running')`).get(task.agentId)) {
      return res.status(409).json({ error: 'That agent is already working on something' });
    }
    const agent = getAgent(task.agentId);
    const id = uid();
    db.prepare(
      `INSERT INTO tasks (id, ownerId, agentId, kind, title, input, status, estimatedSeconds, createdAt)
       VALUES (?, ?, ?, 'task', ?, ?, 'queued', ?, ?)`
    ).run(id, OWNER_ID, task.agentId, task.title, task.input, estimateSeconds(agent.modelTier, (task.input ?? '').length), now());
    rerunTask = taskToJson(getTask(id));
  } else if (action !== 'copy' && action !== 'save') {
    return res.status(400).json({ error: 'Unknown action' });
  }

  const counts = action === 'copy' || action === 'save' || action === 'rerun' || (action === 'rate' && Number(rating) >= 4);
  if (counts && !task.actedAt && task.status === 'done') {
    db.prepare(`UPDATE tasks SET actedAt = ? WHERE id = ?`).run(now(), task.id);
    addXp(task.agentId, XP.actedOn);
    evaluateUnlocks();
  }

  res.json({ task: taskToJson(getTask(task.id)), rerunTask });
});

routes.post('/api/tasks/:id/seen', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!task.seenAt) db.prepare(`UPDATE tasks SET seenAt = ? WHERE id = ?`).run(now(), task.id);
  res.json({ ok: true });
});

routes.delete('/api/tasks/:id', (req, res) => {
  db.prepare(`DELETE FROM tasks WHERE id = ? AND ownerId = ? AND status NOT IN ('queued','running')`).run(
    req.params.id, OWNER_ID
  );
  res.json({ ok: true });
});

routes.post('/api/boardroom/convene', (_req, res) => {
  const status = boardroomStatus();
  if (!status.canConvene) return res.status(400).json({ error: 'Boardroom unavailable', blockedReason: status.blockedReason });
  const taskId = queueBoardroom(status.ceoAgentId);
  res.json(taskToJson(getTask(taskId)));
});

// Privacy: one-click export and delete.
routes.get('/api/account/export', (_req, res) => {
  const data = {
    exportedAt: now(),
    user: getUser(),
    agents: db.prepare(`SELECT * FROM agents WHERE ownerId = ?`).all(OWNER_ID).map(agentToJson),
    tasks: db.prepare(`SELECT * FROM tasks WHERE ownerId = ?`).all(OWNER_ID).map(taskToJson),
    unlocks: db.prepare(`SELECT * FROM unlocks WHERE ownerId = ?`).all(OWNER_ID),
  };
  res.setHeader('Content-Disposition', 'attachment; filename="pocket-agents-export.json"');
  res.json(data);
});

routes.delete('/api/account', (_req, res) => {
  db.prepare(`DELETE FROM tasks WHERE ownerId = ?`).run(OWNER_ID);
  db.prepare(`DELETE FROM agents WHERE ownerId = ?`).run(OWNER_ID);
  db.prepare(`DELETE FROM unlocks WHERE ownerId = ?`).run(OWNER_ID);
  db.prepare(`UPDATE users SET usageThisPeriod = 0 WHERE id = ?`).run(OWNER_ID);
  res.json({ ok: true });
});
