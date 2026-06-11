// Server-side async task execution. Assigning a task creates a queued row;
// this in-process worker claims it, calls the model, and stores the result —
// independent of whether any browser tab is open. The browser only ever polls
// status. (Swapping this loop for Supabase Edge Functions / a hosted queue is
// the deploy-time change; the tasks table contract stays the same.)
import { db, now, uid } from './db.js';
import { runModel, friendlyApiError, demoMode } from './claude.js';
import { CEO_SYSTEM, recentWorkBlock, ceoUserContent, boardroomUserContent } from './synthesis.js';
import { addXp, evaluateUnlocks, hasUnlock, XP } from './progression.js';
import { ensurePeriod } from './plans.js';
import { sweepExpiredSessions } from './auth.js';

const CONCURRENCY = 2;
const TICK_MS = 1500;
const BOARDROOM_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const SWEEP_EVERY_MS = 10 * 60 * 1000;
// Retention: keep as little as possible. Raw inputs are purged shortly after
// the work is done (re-run stops being offered); finished outputs the user
// never acted on age out too. Acted-on outputs and boardroom reports stay
// until the user deletes them.
const INPUT_RETENTION_HOURS = Number(process.env.INPUT_RETENTION_HOURS || 24);
const UNSAVED_OUTPUT_RETENTION_DAYS = Number(process.env.UNSAVED_OUTPUT_RETENTION_DAYS || 30);
let active = 0;
let lastSweep = 0;

export function startWorker() {
  // Recover tasks stranded in 'running' by a previous server crash/restart.
  db.prepare(`UPDATE tasks SET status = 'queued', startedAt = NULL WHERE status = 'running'`).run();
  setInterval(tick, TICK_MS);
}

export function privacySweep() {
  const inputCutoff = new Date(Date.now() - INPUT_RETENTION_HOURS * 3600 * 1000).toISOString();
  db.prepare(
    `UPDATE tasks SET input = NULL
     WHERE input IS NOT NULL AND status IN ('done','failed') AND finishedAt < ?`
  ).run(inputCutoff);

  const outputCutoff = new Date(Date.now() - UNSAVED_OUTPUT_RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
  db.prepare(
    `DELETE FROM tasks
     WHERE status IN ('done','failed') AND actedAt IS NULL AND kind != 'boardroom' AND finishedAt < ?`
  ).run(outputCutoff);

  sweepExpiredSessions();
}

function tick() {
  if (Date.now() - lastSweep > SWEEP_EVERY_MS) {
    lastSweep = Date.now();
    privacySweep();
  }
  autoQueueBoardroom();
  while (active < CONCURRENCY) {
    const task = claimNext();
    if (!task) break;
    active += 1;
    runTask(task).finally(() => {
      active -= 1;
    });
  }
}

function claimNext() {
  return db
    .prepare(
      `UPDATE tasks SET status = 'running', startedAt = ?
       WHERE id = (SELECT id FROM tasks WHERE status = 'queued' ORDER BY createdAt LIMIT 1)
       RETURNING *`
    )
    .get(now());
}

async function runTask(task) {
  const agent = db.prepare(`SELECT * FROM agents WHERE id = ?`).get(task.agentId);
  try {
    if (!agent) throw new Error('Agent no longer exists.');

    let system, userContent;
    if (task.kind === 'boardroom' || agent.role === 'ceo') {
      const work = recentWorkBlock(task.ownerId);
      if (!work) throw new Error('The team has no completed work to synthesize yet.');
      system = CEO_SYSTEM;
      const input = task.input ? JSON.parse(task.input) : {};
      userContent = task.kind === 'boardroom' ? boardroomUserContent(work) : ceoUserContent(input.focus, work);
    } else {
      system = agent.systemPrompt;
      userContent = formatWorkerInput(agent, JSON.parse(task.input));
    }

    const { text, tokensUsed, modelUsed } = await runModel({ modelTier: agent.modelTier, system, userContent });

    db.prepare(`UPDATE tasks SET status = 'done', output = ?, tokensUsed = ?, modelUsed = ?, finishedAt = ? WHERE id = ?`).run(
      text, tokensUsed, modelUsed, now(), task.id
    );
    ensurePeriod(task.ownerId); // roll the month first so tokens land in the right period
    db.prepare(`UPDATE users SET usageThisPeriod = usageThisPeriod + ? WHERE id = ?`).run(tokensUsed, task.ownerId);
    addXp(agent.id, task.kind === 'boardroom' ? XP.boardroomDone : XP.taskDone);
    evaluateUnlocks(task.ownerId);
  } catch (err) {
    db.prepare(`UPDATE tasks SET status = 'failed', error = ?, finishedAt = ? WHERE id = ?`).run(
      friendlyApiError(err), now(), task.id
    );
  }
}

function formatWorkerInput(agent, input) {
  const fields = JSON.parse(agent.inputSchema);
  const parts = [];
  for (const field of fields) {
    const value = (input[field.key] ?? '').toString().trim();
    if (!value) continue;
    parts.push(value.includes('\n') ? `**${field.label}**\n${value}` : `**${field.label}:** ${value}`);
  }
  return parts.join('\n\n');
}

export function estimateSeconds(modelTier, inputChars = 0) {
  if (demoMode) return 9;
  if (modelTier === 'premium') return Math.min(240, 60 + Math.round(inputChars / 400));
  return Math.min(45, 10 + Math.round(inputChars / 400));
}

export function boardroomStatus(ownerId) {
  const unlocked = hasUnlock(ownerId, 'boardroom');
  const ceo = db.prepare(`SELECT * FROM agents WHERE ownerId = ? AND role = 'ceo'`).get(ownerId);
  const lastDone = db
    .prepare(`SELECT finishedAt FROM tasks WHERE ownerId = ? AND kind = 'boardroom' AND status = 'done' ORDER BY finishedAt DESC LIMIT 1`)
    .get(ownerId);
  const inFlight = !!db
    .prepare(`SELECT 1 FROM tasks WHERE ownerId = ? AND kind = 'boardroom' AND status IN ('queued','running')`)
    .get(ownerId);
  const sinceClause = lastDone ? `AND finishedAt > '${lastDone.finishedAt}'` : '';
  const completedSinceLast = db
    .prepare(`SELECT COUNT(*) AS n FROM tasks WHERE ownerId = ? AND status = 'done' AND kind = 'task' ${sinceClause}`)
    .get(ownerId).n;
  const dueAt = lastDone ? new Date(new Date(lastDone.finishedAt).getTime() + BOARDROOM_INTERVAL_MS).toISOString() : null;
  const cooldownOver = !dueAt || Date.now() >= new Date(dueAt).getTime();

  let blockedReason = null;
  if (!unlocked) blockedReason = 'locked';
  else if (!ceo) blockedReason = 'hire_ceo';
  else if (inFlight) blockedReason = 'in_flight';
  else if (!cooldownOver) blockedReason = 'cooldown';
  else if (completedSinceLast < 1) blockedReason = 'no_new_work';

  return {
    unlocked,
    canConvene: blockedReason === null,
    blockedReason,
    dueAt,
    completedSinceLast,
    ceoAgentId: ceo?.id ?? null,
  };
}

export function queueBoardroom(ownerId, ceoAgentId) {
  const task = {
    id: uid(),
    ownerId,
    agentId: ceoAgentId,
    kind: 'boardroom',
    title: `Boardroom — week of ${now().slice(0, 10)}`,
    input: null,
    estimatedSeconds: estimateSeconds('premium', 8000),
    createdAt: now(),
  };
  db.prepare(
    `INSERT INTO tasks (id, ownerId, agentId, kind, title, input, status, estimatedSeconds, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?)`
  ).run(task.id, task.ownerId, task.agentId, task.kind, task.title, task.input, task.estimatedSeconds, task.createdAt);
  return task.id;
}

// The scheduled ritual: once unlocked, a boardroom convenes weekly on the
// server whenever there's enough fresh work — even with no tab open.
function autoQueueBoardroom() {
  for (const { id } of db.prepare(`SELECT id FROM users`).all()) {
    const status = boardroomStatus(id);
    if (status.canConvene && status.completedSinceLast >= 3) queueBoardroom(id, status.ceoAgentId);
  }
}
