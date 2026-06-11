import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(here, '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'pocket-agents.db'));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    email           TEXT,
    plan            TEXT NOT NULL DEFAULT 'free',
    usageThisPeriod INTEGER NOT NULL DEFAULT 0,
    createdAt       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agents (
    id           TEXT PRIMARY KEY,
    ownerId      TEXT NOT NULL,
    templateId   TEXT NOT NULL,
    displayName  TEXT NOT NULL,
    role         TEXT NOT NULL,
    avatar       TEXT NOT NULL,
    systemPrompt TEXT NOT NULL,
    inputSchema  TEXT NOT NULL,
    outputFormat TEXT NOT NULL DEFAULT 'markdown',
    modelTier    TEXT NOT NULL DEFAULT 'standard',
    level        INTEGER NOT NULL DEFAULT 1,
    xp           INTEGER NOT NULL DEFAULT 0,
    deskSlot     INTEGER NOT NULL,
    hiredAt      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id               TEXT PRIMARY KEY,
    ownerId          TEXT NOT NULL,
    agentId          TEXT NOT NULL,
    kind             TEXT NOT NULL DEFAULT 'task',
    title            TEXT NOT NULL,
    input            TEXT,
    output           TEXT,
    status           TEXT NOT NULL DEFAULT 'queued',
    error            TEXT,
    estimatedSeconds INTEGER NOT NULL DEFAULT 20,
    modelUsed        TEXT,
    tokensUsed       INTEGER NOT NULL DEFAULT 0,
    rating           INTEGER,
    actedAt          TEXT,
    seenAt           TEXT,
    createdAt        TEXT NOT NULL,
    startedAt        TEXT,
    finishedAt       TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status, createdAt);

  CREATE TABLE IF NOT EXISTS unlocks (
    id         TEXT PRIMARY KEY,
    ownerId    TEXT NOT NULL,
    type       TEXT NOT NULL,
    key        TEXT NOT NULL,
    unlockedAt TEXT NOT NULL,
    UNIQUE (ownerId, key)
  );
`);

// v1 runs single-user; auth (milestone 8) will replace this stub.
export const OWNER_ID = 'local';
db.prepare(
  `INSERT OR IGNORE INTO users (id, email, plan, usageThisPeriod, createdAt) VALUES (?, ?, 'free', 0, ?)`
).run(OWNER_ID, null, new Date().toISOString());

export const uid = () => randomUUID();
export const now = () => new Date().toISOString();
