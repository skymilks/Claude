import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Sprite as PixiSprite, TilingSprite } from 'pixi.js';
import { character, characterBack, standing, DOG } from '../pixel/sprites';
import { loadAtlas, frame, spriteTexture, glowTexture } from '../pixel/pack/tex';
import {
  STAGE_W, STAGE_H, FLOOR_W, WALL_PX, TILE, S, COLS, ROWS,
  ROOM_TOP, DIVIDER_X, DOOR_LOUNGE, DOOR_OFFICE, CORRIDOR, BULLPEN_COLS,
  cellAt, depth, DESK_CELLS, CEO_SLOT, standBeside, chatSpot, PROPS, COFFEE_STOP,
  COOLER_STAND, VENDING_STAND, COFFEE_STAND,
  OFFICE_DOOR_IN, OFFICE_DOOR_OUT, LOUNGE_DOOR_IN, LOUNGE_DOOR_OUT,
  type Desk,
} from '../pixel/grid';

// The canvas half of the office: PixiJS renders the top-down room (LimeZu
// "Modern Office" art, layout after the pack's Office_Design_2 sample) and
// everything that moves in it; all interactivity (clicks, nameplates,
// bubbles) lives in the DOM overlay Office.tsx projects onto the same grid.
// Depth is one rule — zIndex by screen-row — so desks, walls, people, and
// props overlap correctly.

export type SceneAgent = { id: string; slot: number; avatar: string; working: boolean };
export type SceneCosmetics = { rug: boolean; plant: boolean; coffee: boolean; dog: boolean };

type Pt = { cx: number; cy: number };

// A wandering worker: a hidden standing sprite that takes over from the seated
// bust when they get up to do something, then sits back down.
type Wander = {
  stand: PixiSprite;
  state: 'seated' | 'out';
  phase: 'going' | 'dwell' | 'returning';
  cx: number; cy: number;
  queue: Pt[];
  dwellUntil: number;
  nextLeave: number;
  facing: 1 | -1;
};

type DeskGroup = {
  sprites: PixiSprite[];
  char: PixiSprite; // seated bust
  glow: PixiSprite;
  avatar: string;
  working: boolean;
  base: Desk;
  charY: number; // seated bust's resting screen-y
  wander: Wander | null; // null for the Chief (he hosts instead)
};

// The seated bust faces the camera (south) or shows its back (north).
const seatedTex = (avatar: string, face: 'south' | 'north', f: 0 | 1) =>
  face === 'south'
    ? spriteTexture(`char-${avatar}-${f}`, () => character(avatar, f))
    : spriteTexture(`charb-${avatar}-${f}`, () => characterBack(avatar, f));

type Walker = {
  sprite: PixiSprite;
  cx: number; cy: number;
  out: boolean;
  strolling: boolean;
  pauseUntil: number;
  nextStroll: number;
  goalKey: string;
  queue: Pt[];
};

type Scene = {
  app: Application;
  layer: Container;
  desks: Map<number, DeskGroup>;
  walker: Walker | null;
  dog: PixiSprite | null;
  cosmeticSprites: Map<string, PixiSprite>;
  hostSlot: number | null;
  hasChief: boolean;
  hasCoffee: boolean;
};

const WALK_TILES_PER_S = 3.4;
const WORKER_TILES_PER_S = 2.7;
const PX = TILE * S; // one tile in stage px

export function OfficeScene({ agents, cosmetics, hostSlot }: { agents: SceneAgent[]; cosmetics: SceneCosmetics; hostSlot: number | null }) {
  const holder = useRef<HTMLDivElement>(null);
  const scene = useRef<Scene | null>(null);
  const [ready, setReady] = useState(false);
  const latest = useRef({ agents, cosmetics, hostSlot });
  latest.current = { agents, cosmetics, hostSlot };

  useEffect(() => {
    let dead = false;
    const app = new Application();
    (async () => {
      await loadAtlas();
      await app.init({ width: STAGE_W, height: STAGE_H, backgroundAlpha: 0, antialias: false });
      if (dead || !holder.current) {
        app.destroy(true);
        return;
      }
      app.canvas.className = 'pixelated';
      holder.current.appendChild(app.canvas);
      const layer = new Container();
      layer.sortableChildren = true;
      app.stage.addChild(layer);
      buildRoom(layer);
      scene.current = {
        app, layer, desks: new Map(), walker: null, dog: null,
        cosmeticSprites: new Map(), hostSlot: null, hasChief: false, hasCoffee: false,
      };
      reconcile(scene.current, latest.current.agents, latest.current.cosmetics, latest.current.hostSlot);
      app.ticker.add(() => tick(scene.current!, app.ticker.lastTime, app.ticker.deltaMS));
      setReady(true);
    })().catch(() => {});
    return () => {
      dead = true;
      scene.current = null;
      try {
        app.destroy(true, { children: true });
      } catch {
        /* double-destroy in StrictMode is harmless */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready && scene.current) reconcile(scene.current, agents, cosmetics, hostSlot);
  }, [agents, cosmetics, hostSlot, ready]);

  return <div ref={holder} style={{ width: STAGE_W, height: STAGE_H }} />;
}

// --- static room -------------------------------------------------------------

function buildRoom(layer: Container) {
  // open-plan floor (grey tile), down to the rooms' wall band
  addTiling(layer, 'floor', 0, 0, COLS, ROOM_TOP + 0.4, -10_000);
  // room floors (light plank), under everything below the band
  addTiling(layer, 'floorWood', 0, ROOM_TOP + 0.3, COLS, ROWS - ROOM_TOP - 0.3, -9_990);

  // back wall across the top (slice already includes its white cap)
  const wall = new TilingSprite({ texture: frame('wallWhite'), width: FLOOR_W / S, height: WALL_PX / S });
  wall.scale.set(S);
  wall.position.set(0, 0);
  wall.zIndex = -9_500;
  layer.addChild(wall);

  // the rooms' north wall: same capped wall, with two door gaps
  wallRun(layer, 0, DOOR_LOUNGE[0], ROOM_TOP);
  wallRun(layer, DOOR_LOUNGE[1], DOOR_OFFICE[0], ROOM_TOP);
  wallRun(layer, DOOR_OFFICE[1], COLS, ROOM_TOP);

  // vertical divider between lounge and office
  const div = new TilingSprite({ texture: frame('wallVert'), width: 16, height: (ROWS - ROOM_TOP) * TILE });
  div.scale.set(S);
  const dp = cellAt(DIVIDER_X, ROOM_TOP);
  div.position.set(dp.x - 8 * S, dp.y);
  div.zIndex = depth(ROWS) + 50;
  layer.addChild(div);

  // the bullpen: glass partitions framing the two back-to-back desk rows
  buildBullpen(layer);

  // open-plan back wall + right-side fixtures
  prop(layer, 'whiteboard', PROPS.whiteboard);
  prop(layer, 'poster', PROPS.poster);
  prop(layer, 'chart', PROPS.chart);
  prop(layer, 'copier', PROPS.copier);
  prop(layer, 'waterCooler', PROPS.waterCooler);
  prop(layer, 'plantB', PROPS.plantMid);
  // the lounge
  prop(layer, 'vendingRed', PROPS.vendingRed);
  prop(layer, 'vendingDark', PROPS.vendingDark);
  prop(layer, 'sofa', PROPS.sofa);
  prop(layer, 'plantA', PROPS.loungePlant);
  prop(layer, 'lobbyChair', PROPS.lobbyChair);
  // the Chief's office (mirrors the sample): wall art, a monitor on a cabinet,
  // and plants — the desk itself is built with the Chief's station
  prop(layer, 'frame163', PROPS.offFrame);
  prop(layer, 'panel128', PROPS.offPanel);
  prop(layer, 'copier', PROPS.offCabinet);
  prop(layer, 'monitorBack', PROPS.offShelfMon);
  prop(layer, 'plantA', PROPS.offPlant);
  prop(layer, 'plantB', PROPS.offPlant2);

  // white outer trim around the whole map, like the sample's outer walls
  const trim = new Graphics();
  const T2 = 12;
  trim.rect(0, 0, STAGE_W, STAGE_H).stroke({ width: T2, color: 0xefecf4, alignment: 1 });
  trim.rect(T2 / 2, T2 / 2, STAGE_W - T2, STAGE_H - T2).stroke({ width: 3, color: 0x3b3b4d, alignment: 1 });
  trim.zIndex = 1_000_000;
  layer.addChild(trim);
}

function addTiling(layer: Container, name: string, cx: number, cy: number, wTiles: number, hTiles: number, z: number) {
  const t = new TilingSprite({ texture: frame(name), width: wTiles * TILE, height: hTiles * TILE });
  t.scale.set(S);
  const p = cellAt(cx, cy);
  t.position.set(p.x, p.y);
  t.zIndex = z;
  layer.addChild(t);
  return t;
}

function wallRun(layer: Container, fromX: number, toX: number, topY: number) {
  if (toX - fromX < 0.05) return;
  const t = addTiling(layer, 'wallWhite', fromX, topY, toX - fromX, 2, 0);
  t.zIndex = depth(topY + 2);
}

// Glass partitions framing the six-seat bullpen: a back panel behind the back
// row, a low panel along the back-to-back seam, and vertical posts dividing
// the three columns.
function buildBullpen(layer: Container) {
  const leftX = BULLPEN_COLS[0] - 1.05;
  const rightX = BULLPEN_COLS[BULLPEN_COLS.length - 1] + 1.05;
  const panelTex = frame('partitionPanel');

  const hPanel = (cyBottom: number, z: number) => {
    const panel = new TilingSprite({ texture: panelTex, width: ((rightX - leftX) * PX) / S, height: panelTex.height });
    panel.anchor.set(0, 1);
    panel.scale.set(S);
    const bp = cellAt(leftX, cyBottom);
    panel.position.set(bp.x, bp.y);
    panel.zIndex = z;
    layer.addChild(panel);
  };
  hPanel(0.85, -9_400); // behind the back row

  // vertical posts on each column edge, spanning both rows
  const edges = [leftX];
  for (let i = 0; i < BULLPEN_COLS.length - 1; i++) edges.push((BULLPEN_COLS[i] + BULLPEN_COLS[i + 1]) / 2);
  edges.push(rightX);
  const postTex = frame('partitionPost');
  for (const x of edges) {
    const post = new PixiSprite(postTex);
    post.anchor.set(0.5, 1);
    post.scale.set(S, S * 1.7); // tall enough to span the two rows
    const pp = cellAt(x, 4.5);
    post.position.set(pp.x, pp.y);
    post.zIndex = depth(0.6); // behind the desks/people
    layer.addChild(post);
  }
}

// A 2-tile-wide desk; `nearCy` is the row of its near (camera-side) edge. The
// surface tiles sit above a front lip with legs. Returns nothing — callers
// place the monitor/keyboard/agent relative to known rows.
function deskBlock(layer: Container, cx: number, nearCy: number, z: number): PixiSprite[] {
  const top = frame('deskTop');
  const edge = frame('deskEdge');
  const lipH = edge.height * S;
  const made: PixiSprite[] = [];
  for (const dx of [-0.5, 0.5]) {
    const surf = new PixiSprite(top);
    surf.anchor.set(0.5, 1);
    surf.scale.set(S);
    const ps = cellAt(cx + dx, nearCy);
    surf.position.set(ps.x, ps.y - lipH * 0.55);
    surf.zIndex = z;
    const e = new PixiSprite(edge);
    e.anchor.set(0.5, 1);
    e.scale.set(S);
    const pe = cellAt(cx + dx, nearCy);
    e.position.set(pe.x, pe.y);
    e.zIndex = z + 0.5;
    layer.addChild(surf, e);
    made.push(surf, e);
  }
  return made;
}

function prop(layer: Container, name: string, at: Pt) {
  const sp = new PixiSprite(frame(name));
  const p = cellAt(at.cx, at.cy);
  sp.anchor.set(0.5, 1);
  sp.scale.set(S);
  sp.position.set(p.x, p.y);
  sp.zIndex = depth(at.cy);
  layer.addChild(sp);
  return sp;
}

// --- live state → scene graph ---------------------------------------------------

function reconcile(s: Scene, agents: SceneAgent[], cosmetics: SceneCosmetics, hostSlot: number | null) {
  s.hostSlot = hostSlot;
  s.hasCoffee = cosmetics.coffee;
  const bySlot = new Map(agents.map((a) => [a.slot, a]));
  s.hasChief = bySlot.has(CEO_SLOT);

  for (const [slot, group] of s.desks) {
    if (!bySlot.has(slot)) {
      for (const sp of [...group.sprites, group.char, group.glow]) sp.destroy();
      group.wander?.stand.destroy();
      s.desks.delete(slot);
    }
  }
  for (const [slot, agent] of bySlot) {
    if (!DESK_CELLS[slot]) continue;
    let group = s.desks.get(slot);
    if (!group) {
      group = createDesk(s.layer, slot, agent);
      s.desks.set(slot, group);
    }
    if (group.avatar !== agent.avatar) {
      group.avatar = agent.avatar;
      group.char.texture = seatedTex(agent.avatar, group.base.face, 0);
    }
    group.working = agent.working;
  }

  if (s.hasChief && !s.walker) {
    const seat = DESK_CELLS[CEO_SLOT];
    const sprite = new PixiSprite(spriteTexture('stand-ceo-0', () => standing('ceo', 0)));
    sprite.anchor.set(0.5, 0.95);
    sprite.scale.set(4);
    sprite.visible = false;
    s.layer.addChild(sprite);
    s.walker = {
      sprite, cx: seat.cx, cy: seat.cy, out: false, strolling: false,
      pauseUntil: 0, nextStroll: 22_000, goalKey: 'seat', queue: [],
    };
  }
  if (!s.hasChief && s.walker) {
    s.walker.sprite.destroy();
    s.walker = null;
  }

  syncCosmetic(s, 'rug', cosmetics.rug, () => prop(s.layer, 'rug', PROPS.rug));
  syncCosmetic(s, 'coffee', cosmetics.coffee, () => prop(s.layer, 'coffeeBar', PROPS.coffee));
  syncCosmetic(s, 'plant', cosmetics.plant, () => prop(s.layer, 'plantA', PROPS.plant));
  syncCosmetic(s, 'dog', cosmetics.dog, () => {
    const sp = new PixiSprite(spriteTexture('dog', () => DOG));
    sp.anchor.set(0.5, 1);
    sp.scale.set(4);
    const p = cellAt(PROPS.dog.cx, PROPS.dog.cy);
    sp.position.set(p.x, p.y);
    sp.zIndex = depth(PROPS.dog.cy);
    s.layer.addChild(sp);
    s.dog = sp;
    return sp;
  });
  if (!cosmetics.dog) s.dog = null;
}

function syncCosmetic(s: Scene, key: string, on: boolean, make: () => PixiSprite) {
  const existing = s.cosmeticSprites.get(key);
  if (on && !existing) s.cosmeticSprites.set(key, make());
  if (!on && existing) {
    existing.destroy();
    s.cosmeticSprites.delete(key);
  }
}

// Place an atlas prop at a cell, bottom-anchored, depth by its own row.
function placeAt(layer: Container, name: string, cx: number, cy: number, scale = S, zoff = 0): PixiSprite {
  const sp = new PixiSprite(frame(name));
  const p = cellAt(cx, cy);
  sp.anchor.set(0.5, 1);
  sp.scale.set(scale);
  sp.position.set(p.x, p.y);
  sp.zIndex = depth(cy) + zoff;
  layer.addChild(sp);
  return sp;
}

// A worker desk. The two rows are composed so the monitor is physically
// correct: the back row faces the camera (we see faces + the monitor's BACK,
// which sits between them and us), the front row faces their screens (we see
// their backs + the monitor's FRONT).
function createDesk(layer: Container, slot: number, agent: SceneAgent): DeskGroup {
  if (slot === CEO_SLOT) return createCeoStation(layer, agent);
  const cell = DESK_CELLS[slot];
  const { cx, cy, face } = cell;
  const base = cellAt(cx, cy);
  const sprites: PixiSprite[] = [];
  let charY: number;
  let glowCy: number;

  if (face === 'south') {
    sprites.push(placeAt(layer, 'chairBack', cx, cy - 0.05, S * 0.86, -2));
    sprites.push(...deskBlock(layer, cx, cy + 1.0, depth(cy + 0.9)));
    sprites.push(placeAt(layer, 'keyboard', cx, cy + 0.62, S, 1));
    sprites.push(placeAt(layer, 'monitorBack', cx, cy + 0.95, S, 2));
    charY = base.y + 0.18 * PX;
    glowCy = cy + 0.8;
  } else {
    // faces away: desk + screen are to the north, in front of them
    sprites.push(...deskBlock(layer, cx, cy - 0.12, depth(cy - 0.5)));
    sprites.push(placeAt(layer, 'monitorFront', cx, cy - 0.78, S, 0));
    sprites.push(placeAt(layer, 'keyboard', cx, cy - 0.3, S, 0));
    sprites.push(placeAt(layer, 'chairBack', cx, cy + 0.42, S * 0.86, 5));
    charY = base.y + 0.12 * PX;
    glowCy = cy - 0.78;
  }

  const char = new PixiSprite(seatedTex(agent.avatar, face, 0));
  char.anchor.set(0.5, 1);
  char.scale.set(4.5);
  char.position.set(base.x, charY);
  char.zIndex = depth(cy) + (face === 'south' ? 0.5 : 1.5);
  layer.addChild(char);

  const glowP = cellAt(cx, glowCy);
  const glow = new PixiSprite(glowTexture('screenglow', 'rgba(150,220,255,0.55)', 96));
  glow.anchor.set(0.5);
  glow.scale.set(0.95, 0.65);
  glow.position.set(glowP.x, glowP.y - 0.2 * PX);
  glow.zIndex = depth(glowCy) + 3;
  glow.visible = agent.working;
  layer.addChild(glow);

  const stand = new PixiSprite(spriteTexture(`stand-${agent.avatar}-0`, () => standing(agent.avatar, 0)));
  stand.anchor.set(0.5, 1);
  stand.scale.set(4.4);
  stand.visible = false;
  layer.addChild(stand);
  const wander: Wander = {
    stand, state: 'seated', phase: 'going', cx, cy,
    queue: [], dwellUntil: 0, nextLeave: performance.now() + 8_000 + Math.random() * 16_000, facing: 1,
  };

  return { sprites, char, glow, avatar: agent.avatar, working: agent.working, base: cell, charY, wander };
}

// The Chief's private office: an L-desk with dual screens, a desk lamp, and an
// orange chair — he faces his screens, so we see his back and the screen
// fronts (mirroring the sample).
function createCeoStation(layer: Container, agent: SceneAgent): DeskGroup {
  const cell = DESK_CELLS[CEO_SLOT];
  const { cx, cy } = cell;
  const base = cellAt(cx, cy);
  const sprites: PixiSprite[] = [];

  const desk = placeAt(layer, 'deskL', cx, cy + 0.95, S * 1.05, -3);
  sprites.push(desk);
  sprites.push(placeAt(layer, 'dualMon', cx - 0.15, cy - 0.7, S, 0));
  sprites.push(placeAt(layer, 'lamp', cx + 0.85, cy - 0.35, S, 1));
  sprites.push(placeAt(layer, 'keyboard', cx, cy - 0.15, S, 1));
  sprites.push(placeAt(layer, 'chairOrange', cx, cy + 0.5, S, 5));

  const char = new PixiSprite(seatedTex(agent.avatar, 'north', 0));
  char.anchor.set(0.5, 1);
  char.scale.set(4.7);
  char.position.set(base.x, base.y + 0.12 * PX);
  char.zIndex = depth(cy) + 1.5;
  layer.addChild(char);

  const glowP = cellAt(cx, cy - 0.7);
  const glow = new PixiSprite(glowTexture('screenglow', 'rgba(150,220,255,0.55)', 96));
  glow.anchor.set(0.5);
  glow.scale.set(1.1, 0.7);
  glow.position.set(glowP.x, glowP.y - 0.2 * PX);
  glow.zIndex = depth(cy - 0.7) + 3;
  glow.visible = agent.working;
  layer.addChild(glow);

  return { sprites, char, glow, avatar: agent.avatar, working: agent.working, base: cell, charY: base.y + 0.12 * PX, wander: null };
}

// --- routing (shared) -----------------------------------------------------------

// Doors are the only way between regions; open-plan crossings travel the
// corridor, so nobody cuts through desks or walls.
function route(fromCx: number, fromCy: number, goal: Pt): Pt[] {
  const region = (cx: number, cy: number) => (cy <= ROOM_TOP ? 'open' : cx < DIVIDER_X ? 'lounge' : 'office');
  const from = region(fromCx, fromCy);
  const to = region(goal.cx, goal.cy);
  const out: Pt[] = [];
  if (from === 'office') out.push(OFFICE_DOOR_IN, OFFICE_DOOR_OUT);
  if (from === 'lounge') out.push(LOUNGE_DOOR_IN, LOUNGE_DOOR_OUT);
  const enter =
    to !== from
      ? to === 'office'
        ? [OFFICE_DOOR_OUT, OFFICE_DOOR_IN]
        : to === 'lounge'
          ? [LOUNGE_DOOR_OUT, LOUNGE_DOOR_IN]
          : []
      : [];
  const laneX = enter.length ? enter[0].cx : goal.cx;
  const last = out.length ? out[out.length - 1] : { cx: fromCx, cy: fromCy };
  // get onto the corridor before travelling sideways
  if (Math.abs(laneX - last.cx) > 0.6 || Math.abs(last.cy - CORRIDOR) > 0.6)
    out.push({ cx: last.cx, cy: CORRIDOR }, { cx: laneX, cy: CORRIDOR });
  out.push(...enter, goal);
  return out;
}

// Advance an actor one step along its queue; returns false when the queue is
// exhausted. Moves one axis at a time so paths read as clean right-angles.
function stepAlong(a: { cx: number; cy: number; facing: 1 | -1 }, queue: Pt[], speed: number, dtMS: number): boolean {
  let next = queue[0];
  while (next && Math.abs(next.cx - a.cx) < 0.04 && Math.abs(next.cy - a.cy) < 0.04) {
    queue.shift();
    next = queue[0];
  }
  if (!next) return false;
  const dx = next.cx - a.cx;
  const dy = next.cy - a.cy;
  const leg = Math.abs(dy) > 0.04 ? { cx: 0, cy: Math.sign(dy) } : { cx: Math.sign(dx), cy: 0 };
  const stp = (speed * dtMS) / 1000;
  a.cx += leg.cx * Math.min(stp, Math.abs(dx));
  a.cy += leg.cy * Math.min(stp, Math.abs(dy));
  if (leg.cx !== 0) a.facing = Math.sign(leg.cx) as 1 | -1;
  return true;
}

// --- the living layer (every frame) ---------------------------------------------

function tick(s: Scene, t: number, dtMS: number) {
  const frameN = Math.floor(t / 280) % 2 === 0 ? 0 : 1;
  for (const [slot, group] of s.desks) {
    const seated = !group.wander || group.wander.state === 'seated';
    if (seated) {
      const f: 0 | 1 = group.working ? (frameN as 0 | 1) : 0;
      group.char.texture = seatedTex(group.avatar, group.base.face, f);
      const bob = group.working ? 0 : Math.round(Math.sin(t / 900 + slot * 1.7) * 1.5);
      group.char.position.y = group.charY + bob;
    }
    group.glow.visible = group.working && seated;
    if (group.working && seated) group.glow.alpha = 0.7 + Math.sin(t / 240) * 0.25;
    if (slot === CEO_SLOT && s.walker) group.char.visible = !s.walker.out;
    if (group.wander) wanderWorker(s, group, slot, t, dtMS);
  }
  if (s.dog) {
    const d = cellAt(PROPS.dog.cx, PROPS.dog.cy);
    s.dog.position.y = d.y - Math.abs(Math.sin(t / 420)) * 7;
  }
  if (s.walker) walkChief(s, t);
}

// Pick a break destination: the water cooler, the lounge vending/coffee, or a
// chat at a peer's cubicle.
function chooseActivity(s: Scene, slot: number): Pt {
  const opts: Pt[] = [COOLER_STAND, VENDING_STAND];
  if (s.hasCoffee) opts.push(COFFEE_STAND);
  const peers = [0, 1, 2, 4, 5, 6].filter((x) => x !== slot && s.desks.has(x));
  if (peers.length) opts.push(chatSpot(peers[Math.floor(Math.random() * peers.length)]));
  return opts[Math.floor(Math.random() * opts.length)];
}

function wanderWorker(s: Scene, group: DeskGroup, slot: number, t: number, dtMS: number) {
  const w = group.wander!;
  const home = group.base;

  if (w.state === 'seated') {
    w.stand.visible = false;
    group.char.visible = true;
    // get up now and then — but only when idle (not mid-task)
    if (!group.working && t > w.nextLeave) {
      w.state = 'out';
      w.phase = 'going';
      w.cx = home.cx;
      w.cy = home.cy;
      w.queue = route(home.cx, home.cy, chooseActivity(s, slot));
    }
    return;
  }

  // out of the chair
  group.char.visible = false; // the chair sits empty while they're away
  w.stand.visible = true;
  const moving = stepAlong(w, w.queue, WORKER_TILES_PER_S, dtMS);

  if (moving) {
    const f = Math.floor(t / 150) % 2 === 0 ? 0 : 1;
    w.stand.texture = spriteTexture(`stand-${group.avatar}-${f}`, () => standing(group.avatar, f as 0 | 1));
    w.stand.scale.x = 4.4 * w.facing;
    // a summoned worker heads back the moment their agent starts a task
    if (group.working && w.phase !== 'returning') {
      w.phase = 'returning';
      w.queue = route(w.cx, w.cy, home);
    }
  } else if (w.phase === 'going') {
    w.phase = 'dwell';
    w.dwellUntil = t + 2600 + Math.random() * 2600;
    w.stand.texture = spriteTexture(`stand-${group.avatar}-0`, () => standing(group.avatar, 0));
  } else if (w.phase === 'dwell') {
    if (t > w.dwellUntil || group.working) {
      w.phase = 'returning';
      w.queue = route(w.cx, w.cy, home);
    }
  } else {
    // arrived home — sit back down
    w.state = 'seated';
    w.nextLeave = t + 26_000 + Math.random() * 34_000;
  }

  const p = cellAt(w.cx, w.cy);
  w.stand.position.set(p.x, p.y + 18);
  w.stand.zIndex = depth(w.cy) + 60; // walk in front of desks/partitions
}

function walkChief(s: Scene, t: number) {
  const w = s.walker!;
  const seat = DESK_CELLS[CEO_SLOT];
  const chiefBusy = s.desks.get(CEO_SLOT)?.working ?? false;

  if (s.hostSlot !== null || chiefBusy) w.strolling = false;
  else if (!w.out && t > w.nextStroll && s.hasCoffee) {
    w.strolling = true;
    w.pauseUntil = 0;
  }

  const goal = s.hostSlot !== null && !chiefBusy ? standBeside(s.hostSlot) : w.strolling ? COFFEE_STOP : seat;
  const goalKey = `${goal.cx},${goal.cy}`;
  if (goalKey !== w.goalKey) {
    w.goalKey = goalKey;
    w.queue = route(w.cx, w.cy, goal);
  }

  const wf = { cx: w.cx, cy: w.cy, facing: 1 as 1 | -1 };
  const moving = stepAlong(wf, w.queue, WALK_TILES_PER_S, s.app.ticker.deltaMS);
  w.cx = wf.cx;
  w.cy = wf.cy;

  if (moving) {
    w.out = true;
    const f = Math.floor(t / 150) % 2 === 0 ? 0 : 1;
    w.sprite.texture = spriteTexture(`stand-ceo-${f}`, () => standing('ceo', f as 0 | 1));
    w.sprite.scale.x = 4 * wf.facing;
  } else if (w.strolling) {
    if (w.pauseUntil === 0) w.pauseUntil = t + 2600;
    w.sprite.texture = spriteTexture('stand-ceo-0', () => standing('ceo', 0));
    w.sprite.scale.x = 4;
    if (t >= w.pauseUntil) {
      w.strolling = false;
      w.nextStroll = t + 34_000 + Math.random() * 30_000;
    }
  } else if (Math.abs(w.cx - seat.cx) < 0.1 && Math.abs(w.cy - seat.cy) < 0.1) {
    w.out = false;
  } else {
    w.sprite.texture = spriteTexture('stand-ceo-0', () => standing('ceo', 0));
    w.sprite.scale.x = 4;
  }

  const p = cellAt(w.cx, w.cy);
  w.sprite.position.set(p.x, p.y + 18);
  w.sprite.zIndex = depth(w.cy) + 60;
  w.sprite.visible = w.out;
}
