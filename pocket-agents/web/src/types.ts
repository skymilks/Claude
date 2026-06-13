export type Field = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

// A ready-to-run example task left on an agent's desk: one tap prefills the
// task form with realistic values tailored to the business.
export type StarterTask = { label: string; input: Record<string, string> };

// A standing weekly job the agent runs on its own.
export type Routine = { label: string; freq: 'weekly'; input: Record<string, string>; nextRunAt?: string };

export type Agent = {
  id: string;
  templateId: string;
  displayName: string;
  role: string;
  avatar: string;
  tagline: string | null;
  inputSchema: Field[];
  suggestions: StarterTask[];
  routine: Routine | null;
  outputFormat: string;
  modelTier: 'standard' | 'premium';
  level: number;
  xp: number;
  deskSlot: number;
  hiredAt: string;
};

export type TaskStatus = 'queued' | 'running' | 'done' | 'failed';

// A contestant model on the council panel.
export type ModelStats = { reasoning: number; knowledge: number; speed: number; creativity: number; rigor: number };
export type RosterSeat = {
  modelKey: string;
  brand: string;
  title: string;
  color: string;
  stats: ModelStats;
  provider: string;
  live: boolean; // a real vendor key is set (vs. a Claude stand-in)
};

// One advisor's report within a council run, with its 0–100 score.
export type CouncilDraft = {
  modelKey: string;
  brand: string;
  title: string;
  color: string;
  stats: ModelStats;
  model: string;
  text: string;
  tokensUsed: number;
  score: number | null;
  scoreNote: string | null;
  ok: boolean;
  error?: string;
};
export type CouncilResult = { drafts: CouncilDraft[]; winner: string; refinedBrief: string };

export type Task = {
  id: string;
  agentId: string;
  kind: 'task' | 'boardroom' | 'council';
  title: string;
  input: Record<string, string> | null; // council runs store { brief }
  output: string | null;
  drafts: CouncilResult | null; // council runs only
  status: TaskStatus;
  error: string | null;
  estimatedSeconds: number;
  modelUsed: string | null;
  tokensUsed: number;
  rating: number | null;
  actedAt: string | null;
  seenAt: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type Unlock = {
  id: string;
  type: 'achievement' | 'cosmetic' | 'feature';
  key: string;
  unlockedAt: string;
  name: string;
  desc: string;
  icon: string;
};

export type BoardroomStatus = {
  unlocked: boolean;
  canConvene: boolean;
  blockedReason: 'locked' | 'hire_ceo' | 'in_flight' | 'cooldown' | 'no_new_work' | null;
  dueAt: string | null;
  completedSinceLast: number;
  ceoAgentId: string | null;
};

export type UnlockDef = {
  type: 'achievement' | 'cosmetic' | 'feature';
  key: string;
  name: string;
  desc: string;
  icon: string;
};

export type Plan = { name: string; tokenCap: number };

export type ServerState = {
  user: {
    email: string | null; // null for client offices entered via link
    plan: 'free' | 'pro';
    usageThisPeriod: number;
    tokenCap: number;
    periodStart: string | null;
  };
  // Whose office this is. Client workspaces carry the business info the
  // founder preloaded; needsIntake drives the first-run team setup.
  workspace: {
    kind: 'user' | 'demo';
    name: string | null;
    company: string | null;
    brief: string | null;
    welcomeLine: string | null;
    business: string | null; // what the VP knows about the business
    needsBusiness: boolean; // capture it before the first ask
    needsIntake: boolean;
  };
  roster: RosterSeat[]; // the four contestant seats right now
  plans: { free: Plan; pro: Plan };
  agents: Agent[];
  tasks: Task[];
  unlocks: Unlock[];
  unlockDefs: UnlockDef[];
  company: { xp: number; level: number; nextLevelXp: number | null };
  boardroom: BoardroomStatus;
  models: { standard: string; premium: string };
  demoMode: boolean;
  isAdmin: boolean;
  now: string;
};

// --- Drafted agents (intake + empty-desk builder) and client offices ---

export type DraftAgent = {
  displayName: string;
  role: string;
  avatar: string;
  tagline: string;
  systemPrompt: string;
  inputSchema: Field[];
  starterTasks: StarterTask[];
  routine?: Routine | null;
};

// The intake's proposed team, reviewed and approved by the owner.
export type IntakeDraft = {
  brief: string;
  welcomeLine: string;
  agents: DraftAgent[];
};

export type ProspectListItem = {
  id: string;
  name: string;
  company: string;
  url: string;
  createdAt: string;
  agentCount: number;
  tasksDone: number;
  tokensUsed: number;
};
