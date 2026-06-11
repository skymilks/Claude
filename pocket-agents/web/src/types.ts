export type Field = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

export type Template = {
  id: string;
  role: string;
  name: string;
  tagline: string;
  description: string;
  avatar: string;
  modelTier: 'standard' | 'premium';
  inputSchema: Field[];
};

export type Agent = {
  id: string;
  templateId: string;
  displayName: string;
  role: string;
  avatar: string;
  inputSchema: Field[];
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
  now: string;
};
