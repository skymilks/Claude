// Inserting an agent row is needed in three places — template hires, the
// intake-approved team, and custom agents from the empty-desk builder — so it
// lives here, importable by both auth and routes.
import { db, uid, now } from './db.js';
import { CEO_SYSTEM } from './synthesis.js';

// Desk slots: a six-seat open-plan bullpen (0-2 back row, 4-6 front row) plus
// slot 3, the Chief of Staff's private office. Workers fill the bullpen; 3 is
// hired separately.
export const WORKER_SLOTS = [0, 1, 2, 4, 5, 6];

export function freeWorkerSlot(ownerId) {
  const taken = new Set(db.prepare(`SELECT deskSlot FROM agents WHERE ownerId = ?`).all(ownerId).map((r) => r.deskSlot));
  return WORKER_SLOTS.find((slot) => !taken.has(slot));
}

export function insertAgent(ownerId, config, deskSlot) {
  const id = uid();
  db.prepare(
    `INSERT INTO agents (id, ownerId, templateId, displayName, role, avatar, tagline, systemPrompt, inputSchema, outputFormat, modelTier, deskSlot, suggestions, routine, hiredAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, ownerId, config.templateId, config.displayName, config.role, config.avatar, config.tagline,
    config.systemPrompt, JSON.stringify(config.inputSchema), config.outputFormat ?? 'markdown',
    config.modelTier ?? 'standard', deskSlot, JSON.stringify(config.suggestions ?? []),
    config.routine ? JSON.stringify(config.routine) : null, now()
  );
  return id;
}

// Every workspace has exactly one VP — the single entry point the CEO talks
// to. It owns the council tasks (so they have an agentId, XP, history) but runs
// no system prompt of its own; the council orchestrator drives the models.
export function provisionVp(ownerId) {
  const existing = db.prepare(`SELECT * FROM agents WHERE ownerId = ? AND role = 'vp'`).get(ownerId);
  if (existing) return existing;
  const id = uid();
  db.prepare(
    `INSERT INTO agents (id, ownerId, templateId, displayName, role, avatar, tagline, systemPrompt, inputSchema, outputFormat, modelTier, deskSlot, hiredAt)
     VALUES (?, ?, 'vp', 'Your VP', 'vp', 'ceo', 'Puts your question to the model panel', ?, '[]', 'markdown', 'premium', 3, ?)`
  ).run(id, ownerId, 'You are the VP / Chief of Staff to the CEO.', now());
  return db.prepare(`SELECT * FROM agents WHERE id = ?`).get(id);
}

export function hireFromTemplate(ownerId, template, displayName, deskSlot) {
  return insertAgent(
    ownerId,
    {
      templateId: template.id,
      displayName: (displayName || '').trim().slice(0, 24) || template.name,
      role: template.role,
      avatar: template.avatar,
      tagline: template.tagline,
      systemPrompt: template.role === 'ceo' ? CEO_SYSTEM : template.systemPrompt,
      inputSchema: template.inputSchema,
      outputFormat: template.outputFormat,
      modelTier: template.modelTier,
    },
    deskSlot
  );
}

