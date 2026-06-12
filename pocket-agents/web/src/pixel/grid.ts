// Top-down office geometry — the single source of truth shared by the PixiJS
// scene and the React overlay (nameplates, bubbles, click targets), so the two
// layers always agree on where things sit. Straight orthographic grid: a tile
// is TILE source px drawn at scale S; depth is just screen-y (things lower on
// screen draw on top).
//
// The map follows LimeZu's Office_Design_2 sample: an open plan up top with
// partitioned desk rows, and two rooms along the bottom — a lounge on the
// left, the Chief's private office on the right — separated from the open
// area by a capped white wall with two door gaps onto a central corridor.

export const TILE = 32;
export const S = 3; // on-screen scale → 96px tiles
export const COLS = 12;
export const ROWS = 10;
export const WALL_ROWS = 2; // back wall face height, in tiles, above the floor

export const FLOOR_W = COLS * TILE * S;
export const FLOOR_H = ROWS * TILE * S;
export const WALL_PX = WALL_ROWS * TILE * S;
export const STAGE_W = FLOOR_W;
export const STAGE_H = FLOOR_H + WALL_PX;

// Bottom rooms: the capped white wall starts at ROOM_TOP and its face runs 2
// tiles down to ROOM_FACE_BOTTOM; usable room floor is below that.
export const ROOM_TOP = 5.2;
export const ROOM_FACE_BOTTOM = ROOM_TOP + 2;
export const DIVIDER_X = 6; // vertical wall between lounge and office
// Door gaps in the rooms' north wall (tile-x ranges), one per room, facing a
// shared corridor around the divider.
export const DOOR_LOUNGE: [number, number] = [4.6, 5.7];
export const DOOR_OFFICE: [number, number] = [6.3, 7.4];

// Center of a (fractional) tile cell in stage px. The floor starts below the
// back wall.
export function cellAt(cx: number, cy: number): { x: number; y: number } {
  return { x: cx * TILE * S, y: WALL_PX + cy * TILE * S };
}

// Painter's order: lower on screen = drawn on top.
export const depth = (cy: number) => cy * 100;

// Desk stations by server deskSlot — the CENTER of the desk sprite. Agents
// sit behind the desk (north side) facing the camera. Slots 0–2 are the
// partitioned worker row, slot 4 is the open "create your own" desk on the
// second row, and slot 3 is the Chief, inside his office.
export const DESK_CELLS: Record<number, { cx: number; cy: number }> = {
  0: { cx: 1.7, cy: 2.95 },
  1: { cx: 4.4, cy: 2.95 },
  2: { cx: 7.1, cy: 2.95 },
  3: { cx: 8.8, cy: 8.45 }, // the Chief, in his own office
  4: { cx: 3.1, cy: 4.35 }, // the open desk, second row
};
export const CEO_SLOT = 3;

// Where the Chief stands when he hosts the wait beside a working agent —
// on whichever side of the desk has room.
export const standBeside = (slot: number) => {
  const d = DESK_CELLS[slot] ?? DESK_CELLS[0];
  return { cx: d.cx < 2 ? d.cx + 1.45 : d.cx - 1.45, cy: d.cy + 0.3 };
};

// The clear horizontal lane the Chief walks along in the open plan, between
// the desk chairs and the rooms' wall band.
export const WALK_LANE = 4.6;

// Waypoints just inside / outside each room's door, for routing the Chief.
export const OFFICE_DOOR_IN = { cx: 6.85, cy: 7.5 };
export const OFFICE_DOOR_OUT = { cx: 6.85, cy: 4.6 };
export const LOUNGE_DOOR_IN = { cx: 5.15, cy: 7.5 };
export const LOUNGE_DOOR_OUT = { cx: 5.15, cy: 4.6 };

// Ambient prop anchors (bottom-center of the sprite, in tiles).
export const PROPS = {
  // back wall of the open plan
  shelf: { cx: 0.85, cy: 0.05 },
  whiteboard: { cx: 2.9, cy: -0.1 },
  certificate: { cx: 4.35, cy: -0.55 },
  poster: { cx: 5.5, cy: -0.5 },
  chart: { cx: 7.3, cy: -0.1 },
  plantBack: { cx: 8.6, cy: 0.3 },
  waterCooler: { cx: 10.0, cy: 0.25 },
  copier: { cx: 11.05, cy: 0.3 },
  // open plan, right side
  printerTable: { cx: 11.2, cy: 3.6 },
  plantMid: { cx: 11.5, cy: 5.0 },
  // the lounge (bottom-left room); floor-standing items clear the wall face,
  // which reaches down to ROOM_FACE_BOTTOM
  vendingRed: { cx: 1.0, cy: 7.3 },
  vendingDark: { cx: 1.95, cy: 7.3 },
  sofa: { cx: 1.3, cy: 9.3 },
  moneyPlant: { cx: 5.5, cy: 9.75 },
  lobbyChair: { cx: 5.35, cy: 8.4 },
  // the Chief's office (bottom-right room)
  offCert: { cx: 7.7, cy: 6.65 },
  offFrame: { cx: 10.8, cy: 6.6 },
  offChart: { cx: 11.25, cy: 7.6 },
  offPlant: { cx: 6.6, cy: 9.75 },
  offPlant2: { cx: 11.55, cy: 9.75 },
  guestChair: { cx: 10.4, cy: 8.7 },
  // cosmetics
  rug: { cx: 3.5, cy: 9.0 },       // lounge floor
  coffee: { cx: 4.0, cy: 7.4 },    // espresso bar in the lounge, by the vending machines
  plant: { cx: 9.3, cy: 4.9 },     // open-plan plant
  dog: { cx: 2.9, cy: 9.4 },       // lounge dog
};
// The Chief's idle stroll pauses at the lounge espresso bar.
export const COFFEE_STOP = { cx: 4.0, cy: 8.3 };
