// XP and unlocks are tied to valuable usage — completing meaningful tasks,
// acting on outputs, running the Boardroom — never raw API volume.
import { db, uid, now, OWNER_ID } from './db.js';

export const XP = { taskDone: 10, boardroomDone: 25, actedOn: 15 };

// xp needed to *reach* each level (level = index + 1)
const LEVELS = [0, 50, 140, 280, 480, 750, 1100, 1550, 2100, 2800];

export function levelFromXp(xp) {
  let level = 1;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) level = i + 1;
  return level;
}

export function nextLevelXp(xp) {
  const next = LEVELS.find((threshold) => threshold > xp);
  return next ?? null;
}

export function companyXp() {
  return db.prepare(`SELECT COALESCE(SUM(xp), 0) AS xp FROM agents WHERE ownerId = ?`).get(OWNER_ID).xp;
}

export const UNLOCK_DEFS = [
  { type: 'achievement', key: 'first_hire', name: 'First Hire', desc: 'Hire your first agent', icon: '🤝' },
  { type: 'achievement', key: 'full_bench', name: 'Full Bench', desc: 'Hire all four executives', icon: '🏢' },
  { type: 'achievement', key: 'first_delivery', name: 'First Delivery', desc: 'An agent delivered its first result', icon: '📦' },
  { type: 'achievement', key: 'hands_on', name: 'Hands On', desc: 'Act on an output for the first time', icon: '✅' },
  { type: 'feature', key: 'boardroom', name: 'The Boardroom', desc: 'Act on 5 outputs to unlock the weekly Boardroom', icon: '🏛️' },
  { type: 'achievement', key: 'board_meeting', name: 'Board Meeting', desc: 'Hold your first Boardroom', icon: '📊' },
  { type: 'achievement', key: 'operator', name: 'Operator', desc: 'Act on 25 outputs', icon: '🚀' },
  { type: 'cosmetic', key: 'plant', name: 'Office Plant', desc: 'Reach company level 2', icon: '🪴' },
  { type: 'cosmetic', key: 'coffee', name: 'Coffee Machine', desc: 'Reach company level 3', icon: '☕' },
  { type: 'cosmetic', key: 'rug', name: 'Office Rug', desc: 'Reach company level 4', icon: '🟥' },
  { type: 'cosmetic', key: 'dog', name: 'Office Dog', desc: 'Reach company level 6', icon: '🐕' },
];

export function addXp(agentId, amount) {
  const agent = db.prepare(`SELECT xp FROM agents WHERE id = ?`).get(agentId);
  if (!agent) return;
  const xp = agent.xp + amount;
  db.prepare(`UPDATE agents SET xp = ?, level = ? WHERE id = ?`).run(xp, levelFromXp(xp), agentId);
}

// Checks every unlock condition against current state and inserts any newly
// earned rows. Cheap at this scale; runs after hires, completions, and acts.
export function evaluateUnlocks() {
  const owned = new Set(db.prepare(`SELECT key FROM unlocks WHERE ownerId = ?`).all(OWNER_ID).map((r) => r.key));
  const agentCount = db.prepare(`SELECT COUNT(*) AS n FROM agents WHERE ownerId = ?`).get(OWNER_ID).n;
  const roleCount = db.prepare(`SELECT COUNT(DISTINCT role) AS n FROM agents WHERE ownerId = ?`).get(OWNER_ID).n;
  const doneCount = db.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE ownerId = ? AND status = 'done'`).get(OWNER_ID).n;
  const actedCount = db.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE ownerId = ? AND actedAt IS NOT NULL`).get(OWNER_ID).n;
  const boardroomCount = db
    .prepare(`SELECT COUNT(*) AS n FROM tasks WHERE ownerId = ? AND kind = 'boardroom' AND status = 'done'`)
    .get(OWNER_ID).n;
  const level = levelFromXp(companyXp());

  const earned = {
    first_hire: agentCount >= 1,
    full_bench: roleCount >= 4,
    first_delivery: doneCount >= 1,
    hands_on: actedCount >= 1,
    boardroom: actedCount >= 5,
    board_meeting: boardroomCount >= 1,
    operator: actedCount >= 25,
    plant: level >= 2,
    coffee: level >= 3,
    rug: level >= 4,
    dog: level >= 6,
  };

  const fresh = [];
  for (const def of UNLOCK_DEFS) {
    if (earned[def.key] && !owned.has(def.key)) {
      db.prepare(`INSERT INTO unlocks (id, ownerId, type, key, unlockedAt) VALUES (?, ?, ?, ?, ?)`).run(
        uid(), OWNER_ID, def.type, def.key, now()
      );
      fresh.push(def);
    }
  }
  return fresh;
}

export function hasUnlock(key) {
  return !!db.prepare(`SELECT 1 FROM unlocks WHERE ownerId = ? AND key = ?`).get(OWNER_ID, key);
}
