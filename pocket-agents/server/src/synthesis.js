// The CEO agent and the Boardroom are the same capability — "read the other
// agents' recent work, then synthesize strategy" — surfaced two ways. Both
// build their prompt here. v1 reads stored task history; v2 (orchestration)
// will let the CEO trigger fresh agent runs before synthesizing.
import { db } from './db.js';

export const CEO_SYSTEM = `You are the Chief of Staff at a small company. The other AI agents — Sales, Project Manager, Researcher — report to you; the human CEO is your boss.

You will be given the team's recent work products. Read them and deliver strategic guidance:
- Ground every observation in the actual work provided — reference which item you're drawing on.
- Be candid. If the work reveals a problem (scattered focus, weak positioning, missing data), say so plainly.
- Prioritize ruthlessly: never more than 3 priorities.
- Distinguish "do now" from "watch".
- Keep it tight enough to read in five minutes; this is for a busy founder.

Format everything in clean Markdown.`;

// Recent completed work from the worker agents, formatted for the CEO's context.
export function recentWorkBlock(ownerId, { limit = 12, maxCharsPerItem = 2200 } = {}) {
  const rows = db
    .prepare(
      `SELECT t.title, t.output, t.finishedAt, t.rating, a.role, a.displayName
       FROM tasks t JOIN agents a ON a.id = t.agentId
       WHERE t.ownerId = ? AND t.status = 'done' AND t.kind = 'task' AND a.role != 'ceo'
       ORDER BY t.finishedAt DESC LIMIT ?`
    )
    .all(ownerId, limit);

  if (rows.length === 0) return null;

  const items = rows.map((r, i) => {
    const output =
      r.output.length > maxCharsPerItem ? r.output.slice(0, maxCharsPerItem) + '\n…(truncated)' : r.output;
    const rated = r.rating ? ` | CEO rated it ${r.rating}/5` : '';
    return `### Work item ${i + 1} — ${r.displayName} (${r.role}), ${r.finishedAt.slice(0, 10)}${rated}
Task: ${r.title}

${output}`;
  });

  return `Here is the team's recent completed work, newest first:\n\n${items.join('\n\n---\n\n')}`;
}

// On-demand strategic read (the CEO agent's task form).
export function ceoUserContent(focus, workBlock) {
  const focusLine = focus?.trim()
    ? `The CEO asked you to focus on: ${focus.trim()}\n\n`
    : '';
  return `${focusLine}${workBlock}

Deliver a strategic read for the CEO:
1. **What's working** — backed by specific work items.
2. **What needs attention** — gaps, risks, or weak spots you see in the work.
3. **Priorities** — at most 3, each with a concrete next step and who on the team should do it.
4. **Watch list** — things to keep an eye on but not act on yet.`;
}

// The weekly Boardroom ritual: same capability, presentation framing.
export function boardroomUserContent(workBlock) {
  return `${workBlock}

The team has convened in the boardroom. Deliver this week's board presentation to the CEO:
1. **Executive summary** — 3 sentences on the state of the business as reflected in the team's work.
2. **What's working** — backed by specific work items.
3. **What needs attention** — be candid.
4. **Top 3 priorities for next week** — each with a concrete next step and which agent should take it.
5. **One bold suggestion** — something the team hasn't tried that could move the business forward.`;
}
