// Procedural isometric pixel art for the office scene, compiled to PixiJS
// textures at load. Everything is generated — no binary assets — but it's all
// funneled through one texture map, so swapping in a drawn asset pack later
// means replacing this module, not the scene.
import { Texture } from 'pixi.js';
import type { SpriteDef } from './sprites';
import { TILE_W, TILE_H, COLS, ROWS, WALL_H } from './iso';

const OUTLINE = '#2a1d12';

// --- low-level helpers -------------------------------------------------------

type Grid = string[][];
const makeGrid = (w: number, h: number): Grid => Array.from({ length: h }, () => Array(w).fill('.'));

// Scanline polygon fill onto a char grid (points in px, clockwise-ish).
function fillPoly(g: Grid, pts: [number, number][], ch: string) {
  const ys = pts.map((p) => p[1]);
  const y0 = Math.max(0, Math.ceil(Math.min(...ys)));
  const y1 = Math.min(g.length - 1, Math.floor(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if (ay === by) continue;
      if ((y >= Math.min(ay, by) && y < Math.max(ay, by)) || (y === y1 && y === Math.max(ay, by))) {
        xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const xa = Math.max(0, Math.round(xs[i]));
      const xb = Math.min(g[0].length - 1, Math.round(xs[i + 1]));
      for (let x = xa; x <= xb; x++) g[y][x] = ch;
    }
  }
}

function rect(g: Grid, x0: number, y0: number, w: number, h: number, ch: string) {
  for (let y = Math.max(0, y0); y < Math.min(g.length, y0 + h); y++)
    for (let x = Math.max(0, x0); x < Math.min(g[0].length, x0 + w); x++) g[y][x] = ch;
}

const toDef = (g: Grid, palette: Record<string, string>): SpriteDef => ({ grid: g.map((r) => r.join('')), palette });

// SpriteDef → crisp canvas → Pixi texture (cached by key).
const cache = new Map<string, Texture>();
export function texture(key: string, make: () => SpriteDef): Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const def = make();
  const w = def.grid[0].length;
  const h = def.grid.length;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = def.grid[y][x];
      // ragged rows in hand-drawn defs read as undefined — treat as empty
      if (!k || k === '.' || k === ' ' || !def.palette[k]) continue;
      ctx.fillStyle = def.palette[k];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const tex = Texture.from(canvas);
  tex.source.scaleMode = 'nearest';
  cache.set(key, tex);
  return tex;
}

// A soft radial glow (the one anti-pixel element — light is allowed to be
// smooth). Used for the lamp pool, monitor halos, and window light.
export function glowTexture(key: string, color: string, size = 128): Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = Texture.from(canvas);
  cache.set(key, tex);
  return tex;
}

// --- the floor (one texture for the whole room) -------------------------------

export function floorDef(): SpriteDef {
  const w = COLS * TILE_W; // generous; the diamond fits inside
  const h = ((COLS + ROWS) * TILE_H) / 2 + TILE_H;
  const g = makeGrid(w, h);
  const cxOf = (gx: number, gy: number) => ((gx - gy) * TILE_W) / 2 + (ROWS * TILE_W) / 2;
  const cyOf = (gx: number, gy: number) => ((gx + gy) * TILE_H) / 2 + TILE_H / 2;
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const cx = cxOf(tx, ty);
      const cy = cyOf(tx, ty);
      const base = (tx + ty) % 2 === 0 ? 'a' : 'b';
      for (let dy = -TILE_H / 2; dy < TILE_H / 2; dy++) {
        const half = (TILE_W / 2) * (1 - Math.abs(dy + 0.5) / (TILE_H / 2));
        for (let dx = Math.round(-half); dx < Math.round(half); dx++) {
          const x = cx + dx;
          const y = Math.round(cy + dy);
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          // plank seams along the iso x direction + sparse wood grain
          const seam = (dx + dy * 2 + TILE_W) % 16 === 0;
          const knot = ((tx * 7 + ty * 13 + dx + dy * 3) % 53 === 0);
          g[y][x] = seam ? 's' : knot ? 'k' : base;
        }
      }
    }
  }
  return toDef(g, { a: '#dcae77', b: '#d2a169', s: '#bb8c58', k: '#c79862' });
}

// --- the two back walls --------------------------------------------------------
// side 'L': stands on the x=0 edge, face slopes down-left.  side 'R': on the
// y=0 edge, slopes down-right. Windows sit on the R wall (the sunny side), a
// door on the L wall.

export function wallDef(side: 'L' | 'R'): SpriteDef {
  const len = side === 'L' ? ROWS : COLS; // in tiles
  const w = (len * TILE_W) / 2;
  const h = WALL_H + (len * TILE_H) / 2 + 4;
  const g = makeGrid(w, h);
  for (let x = 0; x < w; x++) {
    const along = side === 'R' ? x : w - 1 - x; // distance along the wall
    const topY = Math.round(along * 0.5);
    for (let y = topY; y < topY + WALL_H; y++) {
      const v = y - topY;
      let ch = 'w';
      if (v < 3) ch = 'c'; // crown
      else if (v >= WALL_H - 10 && v < WALL_H - 4) ch = 'p'; // wainscot band
      else if (v >= WALL_H - 4) ch = 'd'; // baseboard
      else if ((along + v * 2) % 26 === 0) ch = 'l'; // faint panel lines
      g[y][x] = ch;
    }
  }
  // windows on the right wall: three sky panels with frames and a sill
  if (side === 'R') {
    for (const start of [TILE_W * 0.7, TILE_W * 2.2, TILE_W * 3.7]) {
      for (let dx = 0; dx < 54; dx++) {
        const x = Math.round(start + dx);
        if (x >= w) continue;
        const topY = Math.round(x * 0.5) + 30;
        for (let dy = 0; dy < 54; dy++) {
          const y = topY + dy;
          if (y >= h) continue;
          const frame = dx < 3 || dx >= 51 || dy < 3 || dy >= 51 || (dx >= 25 && dx < 29) || (dy >= 24 && dy < 28);
          g[y][x] = frame ? 'f' : dy < 18 ? 'S' : dy < 34 ? 'T' : 'U';
        }
        const sy = topY + 54;
        if (sy < h && dx >= 1 && dx < 53) {
          g[sy][x] = 'f';
          if (sy + 1 < h) g[sy + 1][x] = 'd';
        }
      }
    }
  }
  // door on the left wall
  if (side === 'L') {
    const start = w - TILE_W * 1.9;
    for (let dx = 0; dx < 40; dx++) {
      const x = Math.round(start + dx);
      if (x < 0 || x >= w) continue;
      const along = w - 1 - x;
      const topY = Math.round(along * 0.5) + 24;
      for (let dy = 0; dy < WALL_H - 28; dy++) {
        const y = topY + dy;
        if (y >= h) continue;
        const frame = dx < 3 || dx >= 37 || dy < 3;
        const panel = !frame && dx >= 8 && dx < 32 && ((dy >= 10 && dy < 30) || (dy >= 38 && dy < 58));
        g[y][x] = frame ? 'f' : panel ? 'D' : 'E';
      }
      // handle
      const hy = topY + 34;
      if (dx >= 31 && dx < 35 && hy < h) {
        g[hy][x] = 'H';
        g[hy + 1][x] = 'H';
      }
    }
  }
  // the L wall sits in shadow, a few steps darker than the sunny R wall
  return toDef(g, {
    w: side === 'L' ? '#d9c5a0' : '#ecdcbb', l: side === 'L' ? '#cdb892' : '#e0cea9',
    c: side === 'L' ? '#bba274' : '#cdb488', p: side === 'L' ? '#ac8d60' : '#bd9e72', d: '#8a6a44',
    f: '#7a5a38', S: '#aee3f2', T: '#8fd2ea', U: '#c6ecf6',
    D: '#9a6b40', E: '#8a5f38', H: '#e2c45f',
  });
}

// --- desks ---------------------------------------------------------------------
// An iso desk facing the camera: wood slab (top + two faces), the monitor's
// BACK toward us (the agent looks at their own screen), papers and a mug.
// `working` swaps in a visible power light; the scene adds a glow halo.

export function deskDef(working: boolean, chief = false): SpriteDef {
  const L = chief ? 150 : 112; // length along iso-x (down-right)
  const D = 42; // depth along iso-y
  const H = 30; // leg height
  const w = L + D + 2;
  const h = (L + D) / 2 + H + 27;
  const g = makeGrid(w, h);
  const top = 26; // y of the slab's back corner
  // top face corners in iso: back, right (+L along x), front (+depth), left
  const back: [number, number] = [D, top];
  const right: [number, number] = [D + L, top + L / 2];
  const front: [number, number] = [L, top + L / 2 + D / 2];
  const left: [number, number] = [0, top + D / 2];
  fillPoly(g, [back, right, front, left], 't');
  // front-left face (under edge left→front) and front-right face (front→right)
  fillPoly(g, [left, front, [front[0], front[1] + H], [left[0], left[1] + H]], 'v');
  fillPoly(g, [front, right, [right[0], right[1] + H], [front[0], front[1] + H]], 'u');
  // outline the silhouette (cheap: trace edges)
  traceLine(g, back, right, 'o');
  traceLine(g, right, front, 'o');
  traceLine(g, back, left, 'o');
  traceLine(g, left, [left[0], left[1] + H], 'o');
  traceLine(g, [left[0], left[1] + H], [front[0], front[1] + H], 'o');
  traceLine(g, front, [front[0], front[1] + H], 'o');
  traceLine(g, [front[0], front[1] + H], [right[0], right[1] + H], 'o');
  traceLine(g, right, [right[0], right[1] + H], 'o');

  // The monitor's BACK, standing on the slab so it overlaps the seated
  // agent's chest (they look at the screen; we see its back panel).
  const MW = chief ? 44 : 38;
  const MH = 28;
  const cx = Math.round((L + D) / 2 - MW / 2 + 2); // desk center
  const cy = top + 8;
  rect(g, cx, cy, MW, MH, 'M');
  rect(g, cx + 3, cy + 3, MW - 6, MH - 6, 'm');
  rect(g, cx + 3, cy + 3, MW - 6, 3, 'h'); // top sheen
  rect(g, cx - 1, cy, 1, MH, 'o');
  rect(g, cx + MW, cy, 1, MH, 'o');
  rect(g, cx, cy - 1, MW, 1, 'o');
  rect(g, cx, cy + MH, MW, 1, 'o');
  rect(g, cx + MW / 2 - 3, cy + MH + 1, 6, 6, 'M'); // stand
  rect(g, cx + MW / 2 - 9, cy + MH + 7, 18, 3, 'o'); // foot
  if (working) {
    rect(g, cx + MW - 7, cy + MH - 6, 3, 3, 'g'); // power light
    rect(g, cx - 4, cy + 4, 3, MH - 10, 'G'); // light bleeding around the edges
    rect(g, cx + MW + 1, cy + 4, 3, MH - 10, 'G');
    rect(g, cx + 2, cy - 4, MW - 4, 3, 'G');
  }

  // papers + mug on the top face
  const px = Math.round(D / 2 + L * 0.22);
  const py = top + Math.round(L * 0.3);
  rect(g, px, py, 16, 9, 'P');
  rect(g, px + 2, py + 2, 12, 1, 'n');
  rect(g, px + 2, py + 5, 9, 1, 'n');
  const qx = D + L - 44;
  const qy = top + Math.round(L * 0.4);
  rect(g, qx, qy, 8, 7, 'U');
  rect(g, qx + 8, qy + 2, 3, 3, 'U');
  if (chief) {
    // a tiny desk plant for the boss
    const fx = D + L - 24;
    const fy = top + Math.round(L * 0.3);
    rect(g, fx + 1, fy - 5, 6, 5, 'L');
    rect(g, fx, fy, 8, 5, 'T');
  }
  // Walnut for the workers, espresso for the chief — clearly NOT the floor.
  return toDef(g, {
    o: OUTLINE,
    t: chief ? '#8d6038' : '#b97e48',
    v: chief ? '#71492a' : '#996540',
    u: chief ? '#5a3920' : '#7d5232',
    M: '#4a4a58', m: '#383844', h: '#5c5c6c', g: '#7fe07f', G: '#bdeaff',
    P: '#eef0f2', n: '#b9bdc4', U: '#d7693f', L: '#4f9e57', T: '#c06a3f',
  });
}

function traceLine(g: Grid, a: [number, number], b: [number, number], ch: string) {
  const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(a[0] + ((b[0] - a[0]) * i) / steps);
    const y = Math.round(a[1] + ((b[1] - a[1]) * i) / steps);
    if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = ch;
  }
}

// --- iso rug --------------------------------------------------------------------
export function rugDef(): SpriteDef {
  const w = TILE_W * 3;
  const h = TILE_H * 3;
  const g = makeGrid(w, h);
  const cx = w / 2;
  const cy = h / 2;
  for (let dy = -h / 2; dy < h / 2; dy++) {
    const half = (w / 2) * (1 - Math.abs(dy + 0.5) / (h / 2));
    for (let dx = Math.round(-half); dx < Math.round(half); dx++) {
      const x = cx + dx;
      const y = Math.round(cy + dy);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const edge = Math.abs(dx) > half - 7;
      const inner = Math.abs(dx) < half * 0.55 && Math.abs(dy) < (h / 2) * 0.55;
      g[y][x] = edge ? 'e' : inner ? ((dx + dy) % 9 === 0 ? 'p' : 'i') : 'r';
    }
  }
  return toDef(g, { e: '#7a3f3f', r: '#a85a5a', i: '#b86a55', p: '#cf9270' });
}
