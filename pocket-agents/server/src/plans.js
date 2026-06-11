// Plan definitions and usage-period bookkeeping. Token caps are the pricing
// basis (tokensUsed is metered per task); numbers are launch-tunable and
// env-overridable. The upgrade flow is a demo checkout until Stripe lands.
import { db, now } from './db.js';

export const PLANS = {
  free: { name: 'Free', tokenCap: Number(process.env.FREE_TOKEN_CAP || 300_000) },
  pro: { name: 'Pro', tokenCap: Number(process.env.PRO_TOKEN_CAP || 5_000_000) },
};

export const planOf = (user) => PLANS[user.plan] ?? PLANS.free;

// Monthly periods, reset lazily whenever the user is touched in a new month.
export function ensurePeriod(userId) {
  let user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  if (!user) return null;
  const month = (iso) => (iso ?? '').slice(0, 7);
  if (month(user.periodStart) !== month(now())) {
    db.prepare(`UPDATE users SET usageThisPeriod = 0, periodStart = ? WHERE id = ?`).run(now(), userId);
    user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  }
  return user;
}

export const overCap = (user) => user.usageThisPeriod >= planOf(user).tokenCap;
