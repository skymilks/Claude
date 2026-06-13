// Top-down office geometry — the single source of truth shared by the PixiJS
// scene and the React overlay (nameplates, bubbles, click targets), so the two
// layers always agree on where things sit. Straight orthographic grid: a tile
// is TILE source px drawn at scale S; depth is just screen-y (things lower on
// screen draw on top).
//
// Layout (after LimeZu's Office_Design_2 sample): a six-seat open-plan bullpen
// up top — two rows of three desks, back-to-back, the back row facing the
// camera and the front row facing their screens — and two rooms along the
// bottom: a lounge on the left and the Chief of Staff's private office on the
// right, behind a capped white wall with two doors onto a corridor.

export const TILE = 32;
export const S = 3; // on-screen scale → 96px tiles
export const COLS = 11;
export const ROWS = 10;
export const WALL_ROWS = 2; // back wall face height, in tiles, above the floor

export const FLOOR_W = COLS * TILE * S;
export const FLOOR_H = ROWS * TILE * S;
export const WALL_PX = WALL_ROWS * TILE * S;
export const STAGE_W = FLOOR_W;
export const STAGE_H = FLOOR_H + WALL_PX;

// Bottom rooms: the capped white wall starts at ROOM_TOP and its face runs 2
// tiles down; usable room floor is below that.
export const ROOM_TOP = 5.3;
export const ROOM_FACE_BOTTOM = ROOM_TOP + 2;
export const DIVIDER_X = 5.5; // vertical wall between lounge and office
// Door gaps in the rooms' north wall (tile-x ranges), one per room.
export const DOOR_LOUNGE: [number, number] = [4.0, 5.1];
export const DOOR_OFFICE: [number, number] = [5.9, 7.0];

// Center of a (fractional) tile cell in stage px. The floor starts below the
// back wall.
export function cellAt(cx: number, cy: number): { x: number; y: number } {
  return { x: cx * TILE * S, y: WALL_PX + cy * TILE * S };
}

// Painter's order: lower on screen = drawn on top.
export const depth = (cy: number) => cy * 100;

// Desk stations by server deskSlot. `face` says which way the seated agent
// looks: 'south' (toward the camera — we see their face and the monitor's
// back) or 'north' (toward their screen — we see their back and the screen).
//   0-2  back row of the bullpen, facing the camera
//   4-6  front row of the bullpen, facing their screens
//   3    the Chief of Staff, in his private office
export type Desk = { cx: number; cy: number; face: 'south' | 'north' };
export const DESK_CELLS: Record<number, Desk> = {
  0: { cx: 1.8, cy: 1.95, face: 'south' },
  1: { cx: 4.7, cy: 1.95, face: 'south' },
  2: { cx: 7.6, cy: 1.95, face: 'south' },
  4: { cx: 1.8, cy: 3.95, face: 'north' },
  5: { cx: 4.7, cy: 3.95, face: 'north' },
  6: { cx: 7.6, cy: 3.95, face: 'north' },
  3: { cx: 8.4, cy: 8.35, face: 'north' }, // the Chief, at his screens
};
export const CEO_SLOT = 3;
export const BULLPEN_COLS = [1.8, 4.7, 7.6];

// Where the Chief stands when he hosts the wait beside a working agent — in
// the corridor just in front of that desk.
export const standBeside = (slot: number) => {
  const d = DESK_CELLS[slot] ?? DESK_CELLS[0];
  return { cx: d.cx + 0.15, cy: CORRIDOR };
};

// The clear corridor that runs across the open plan, south of the desks.
export const CORRIDOR = 4.7;

// Break-activity spots (agents face the fixture to their north). The water
// cooler is in the open plan; vending + espresso are in the lounge.
export const COOLER_STAND = { cx: 9.7, cy: 3.9 };
export const VENDING_STAND = { cx: 1.5, cy: 8.2 };
export const COFFEE_STAND = { cx: 3.4, cy: 8.2 };
// Where a visitor stands to chat at a worker's cubicle (in the corridor).
export const chatSpot = (slot: number) => {
  const d = DESK_CELLS[slot] ?? DESK_CELLS[0];
  return { cx: d.cx, cy: CORRIDOR };
};

// Waypoints just inside / outside each room's door, for routing.
export const OFFICE_DOOR_IN = { cx: 6.45, cy: 7.6 };
export const OFFICE_DOOR_OUT = { cx: 6.45, cy: 4.9 };
export const LOUNGE_DOOR_IN = { cx: 4.55, cy: 7.6 };
export const LOUNGE_DOOR_OUT = { cx: 4.55, cy: 4.9 };

// Ambient prop anchors (bottom-center of the sprite, in tiles).
export const PROPS = {
  // open-plan back wall
  whiteboard: { cx: 0.7, cy: -0.15 },
  poster: { cx: 9.4, cy: -0.5 },
  chart: { cx: 10.3, cy: -0.1 },
  copier: { cx: 10.4, cy: 1.4 },
  // open plan, right side — the water cooler is a reachable wander spot
  waterCooler: { cx: 9.7, cy: 2.85 },
  plantMid: { cx: 10.5, cy: 4.4 },
  // the lounge (bottom-left room)
  vendingRed: { cx: 0.85, cy: 7.4 },
  vendingDark: { cx: 1.8, cy: 7.4 },
  sofa: { cx: 1.2, cy: 9.5 },
  loungePlant: { cx: 4.6, cy: 9.7 },
  lobbyChair: { cx: 3.2, cy: 9.4 },
  // the Chief's office (bottom-right room) — mirrors the sample
  offFrame: { cx: 7.4, cy: 5.95 }, // framed art on the brick wall
  offPanel: { cx: 9.1, cy: 5.95 }, // schedule board
  offShelfMon: { cx: 6.3, cy: 6.95 }, // a monitor on a low cabinet, left wall
  offCabinet: { cx: 6.3, cy: 7.3 },
  offPlant: { cx: 10.4, cy: 9.7 }, // tall plant, right
  offPlant2: { cx: 6.2, cy: 9.6 },
  // cosmetics
  rug: { cx: 2.3, cy: 9.0 },        // lounge floor
  coffee: { cx: 3.4, cy: 7.4 },     // espresso bar in the lounge
  plant: { cx: 8.9, cy: 4.5 },      // open-plan plant
  dog: { cx: 2.6, cy: 9.5 },        // lounge dog
};
// The Chief's idle stroll pauses at the lounge espresso bar.
export const COFFEE_STOP = COFFEE_STAND;
