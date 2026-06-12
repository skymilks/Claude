// Isometric room geometry — the single source of truth shared by the PixiJS
// scene (sprites) and the React overlay (nameplates, bubbles, click targets),
// so both layers always agree on where things are.
//
// Classic 2:1 projection: a floor tile is a 64×32 diamond. Grid x runs toward
// the lower-right edge of the screen, grid y toward the lower-left.

export const TILE_W = 80;
export const TILE_H = 40;
export const COLS = 10;
export const ROWS = 8;
export const WALL_H = 116; // wall height in screen px above the floor line

// Project a (possibly fractional) grid coordinate to screen px. The returned
// point is the CENTER of that tile's diamond.
export function project(gx: number, gy: number): { x: number; y: number } {
  return {
    x: ((gx - gy) * TILE_W) / 2,
    y: ((gx + gy) * TILE_H) / 2,
  };
}

// Stage bounds for the whole room (used to size the canvas and position the
// origin so nothing clips).
const corners = [project(0, 0), project(COLS, 0), project(0, ROWS), project(COLS, ROWS)];
export const ORIGIN_X = -Math.min(...corners.map((c) => c.x)) + TILE_W / 2;
export const ORIGIN_Y = WALL_H + TILE_H; // room for the back walls
export const STAGE_W = Math.max(...corners.map((c) => c.x)) - Math.min(...corners.map((c) => c.x)) + TILE_W;
export const STAGE_H = Math.max(...corners.map((c) => c.y)) + ORIGIN_Y + TILE_H * 1.5;

// Screen position of a tile center, in stage px (origin applied).
export function tileAt(gx: number, gy: number): { x: number; y: number } {
  const p = project(gx, gy);
  return { x: p.x + ORIGIN_X, y: p.y + ORIGIN_Y };
}

// Painter's order: things lower on the screen draw on top. One zIndex per
// item, derived from its grid position — this is what makes lamps, plants,
// desks, and people overlap correctly with zero special cases.
export const depth = (gx: number, gy: number) => (gx + gy) * 10;

// --- Room layout -------------------------------------------------------------
// Desk tiles by server deskSlot: 0-2 the worker row, 3 the Chief of Staff by
// the window, 4 the open desk for custom hires. Every desk faces the camera
// (monitor backs to us), so seated characters look at their own screens.
// Desk rows run along constant gx+gy — that's a horizontal line on screen, so
// desks sit side by side (the Kairosoft look) instead of stacking into a
// staircase, and a whole row shares one depth.
export const DESK_TILES: Record<number, { gx: number; gy: number }> = {
  0: { gx: 1.4, gy: 3.8 },
  1: { gx: 2.6, gy: 2.6 },
  2: { gx: 3.8, gy: 1.4 },
  3: { gx: 6.6, gy: 2.2 }, // the Chief's bigger desk, off to the right
  4: { gx: 2.2, gy: 6.6 }, // the open desk, front-left
};
export const CEO_SLOT = 3;

// Where the Chief stands when she's beside a desk, hosting the wait while
// that agent works (screen-left of the desk, never overlapping it).
export const standBeside = (slot: number) => {
  const d = DESK_TILES[slot] ?? DESK_TILES[0];
  return { gx: d.gx - 1.2, gy: d.gy + 1.2 };
};

// Ambient anchors.
export const PROPS = {
  plant: { gx: 9.45, gy: 1.7 },
  lamp: { gx: 0.55, gy: 6.5 },
  shelf: { gx: 8.2, gy: 0.4 },
  coffee: { gx: 0.5, gy: 2.7 },
  rug: { gx: 5.4, gy: 5.4 },
  dog: { gx: 5.8, gy: 6.4 },
  succulent: { gx: 6.5, gy: 0.42 },
};
// The Chief's small idle loop: desk → coffee → desk.
export const COFFEE_STOP = { gx: 1.4, gy: 2.9 };
