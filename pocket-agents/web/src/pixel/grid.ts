// Top-down office geometry — the single source of truth shared by the PixiJS
// scene and the React overlay (nameplates, bubbles, click targets), so the two
// layers always agree on where things sit. Straight orthographic grid: a tile
// is TILE source px drawn at scale S; depth is just screen-y (things lower on
// screen draw on top).

export const TILE = 32;
export const S = 3; // on-screen scale → 96px tiles
export const COLS = 11;
export const ROWS = 8;
export const WALL_ROWS = 1.5; // back wall height, in tiles, above the floor

export const FLOOR_W = COLS * TILE * S;
export const FLOOR_H = ROWS * TILE * S;
export const WALL_PX = WALL_ROWS * TILE * S;
export const STAGE_W = FLOOR_W;
export const STAGE_H = FLOOR_H + WALL_PX;

// Center of a (fractional) tile cell in stage px. The floor starts below the
// back wall.
export function cellAt(cx: number, cy: number): { x: number; y: number } {
  return { x: cx * TILE * S, y: WALL_PX + cy * TILE * S };
}

// Painter's order: lower on screen = drawn on top.
export const depth = (cy: number) => cy * 100;

// Desk stations by server deskSlot. Each is the CENTER tile of the station;
// the agent sits behind a desk that faces the camera, so we see their face and
// the lit monitor. Two rows: workers along the back, the open desk + the
// Chief's larger desk up front.
export const DESK_CELLS: Record<number, { cx: number; cy: number }> = {
  0: { cx: 2.0, cy: 2.0 },
  1: { cx: 5.0, cy: 2.0 },
  2: { cx: 8.0, cy: 2.0 },
  3: { cx: 8.2, cy: 5.4 }, // the Chief's desk, front-right
  4: { cx: 2.0, cy: 5.2 }, // the open desk, front-left
};
export const CEO_SLOT = 3;

// Where the Chief stands when she hosts the wait beside a working agent
// (just to the left of their desk).
export const standBeside = (slot: number) => {
  const d = DESK_CELLS[slot] ?? DESK_CELLS[0];
  return { cx: d.cx - 1.15, cy: d.cy + 0.15 };
};

// Ambient prop anchors (center tile).
export const PROPS = {
  posterWall: { cx: 3.5, cy: -0.4 }, // on the back wall
  chartWall: { cx: 6.4, cy: -0.4 },
  plantBackL: { cx: 0.5, cy: 0.5 },
  plantBackR: { cx: 10.4, cy: 0.6 },
  sofa: { cx: 5.2, cy: 6.8 },
  vending: { cx: 10.3, cy: 3.0 },
  bookshelf: { cx: 0.5, cy: 2.6 },
  printer: { cx: 10.3, cy: 5.0 },
  coffee: { cx: 0.5, cy: 4.2 },
  plantFront: { cx: 4.0, cy: 4.4 },
  dog: { cx: 6.0, cy: 6.6 },
  rug: { cx: 5.2, cy: 3.6 },
};
// The Chief's idle loop pauses by the coffee machine.
export const COFFEE_STOP = { cx: 1.4, cy: 4.0 };
