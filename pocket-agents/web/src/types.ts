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

export type Agent = {
  id: string;
  templateId: string;
  displayName: string;
  role: string;
  avatar: string;
  tagline: string | null;
  inputSchema: Field[];
  suggestions: StarterTask[];
  outputFormat: string;
  modelTier: 'standard' | 'premium';
  level: number;
  xp: number;
  deskSlot: number;
  hiredAt: string;
};

export type TaskStatus = 'queued' | 'running' | 'done' | 'failed';

export type Task = {
  id: string;
  agentId: string;
  kind: 'task' | 'boardroom';
  title: string;
  input: Record<string, string> | null;
  output: string | null;
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
    email: string;
    plan: 'free' | 'pro';
    usageThisPeriod: number;
    tokenCap: number;
    periodStart: string | null;
  };
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

// --- Prospect demo offices (the founder's done-for-you closing tool) ---

export type DraftAgent = {
  displayName: string;
  role: string;
  avatar: string;
  tagline: string;
  systemPrompt: string;
  inputSchema: Field[];
  starterTasks: StarterTask[];
};

export type ProspectDraft = {
  brief: string;
  welcomeLine: string;
  agents: DraftAgent[];
};

export type ProspectListItem = {
  id: string;
  name: string;
  company: string;
  url: string;
  runsUsed: number;
  runCap: number;
  createdAt: string;
};

export type DemoState = {
  prospect: {
    name: string;
    company: string;
    brief: string | null;
    welcomeLine: string | null;
    ctaUrl: string | null;
  };
  agents: Agent[];
  tasks: Task[];
  demoRunsUsed: number;
  demoRunCap: number;
  demoMode: boolean;
  now: string;
};
