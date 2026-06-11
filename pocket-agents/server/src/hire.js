// Inserting an agent row is needed in three places — template hires, the
// starter team seated at signup, and custom agents from the empty-desk
// builder — so it lives here, importable by both auth and routes.
import { db, uid, now } from './db.js';
import { TEMPLATES } from './templates.js';
import { CEO_SYSTEM } from './synthesis.js';

// Desk slots: 0-2 the worker row, 3 the CEO's spot by the window, 4 the
// open desk under the window for custom hires.
export const WORKER_SLOTS = [0, 1, 2, 4];

export function freeWorkerSlot(ownerId) {
  const taken = new Set(db.prepare(`SELECT deskSlot FROM agents WHERE ownerId = ?`).all(ownerId).map((r) => r.deskSlot));
  return WORKER_SLOTS.find((slot) => !taken.has(slot));
}

export function insertAgent(ownerId, config, deskSlot) {
  const id = uid();
  db.prepare(
    `INSERT INTO agents (id, ownerId, templateId, displayName, role, avatar, tagline, systemPrompt, inputSchema, outputFormat, modelTier, deskSlot, suggestions, hiredAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, ownerId, config.templateId, config.displayName, config.role, config.avatar, config.tagline,
    config.systemPrompt, JSON.stringify(config.inputSchema), config.outputFormat ?? 'markdown',
    config.modelTier ?? 'standard', deskSlot, JSON.stringify(config.suggestions ?? []), now()
  );
  return id;
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

// New accounts skip the hiring chore: the standard worker trio is already at
// their desks on first sign-in. (The Chief of Staff stays an explicit hire —
// they need team output to read.)
export function seatStarterTeam(ownerId) {
  TEMPLATES.filter((t) => t.role !== 'ceo').forEach((template, i) => hireFromTemplate(ownerId, template, null, i));
}
