import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Sprite as PixiSprite, TilingSprite } from 'pixi.js';
import { character, standing, DOG } from '../pixel/sprites';
import { loadAtlas, frame, spriteTexture, glowTexture } from '../pixel/pack/tex';
import {
  STAGE_W, STAGE_H, FLOOR_W, WALL_PX, TILE, S, COLS, ROWS,
  ROOM_TOP, DIVIDER_X, DOOR_LOUNGE, DOOR_OFFICE, CORRIDOR,
  cellAt, depth, DESK_CELLS, CEO_SLOT, standBeside, chatSpot, PROPS, COFFEE_STOP,
  COOLER_STAND, VENDING_STAND, COFFEE_STAND,
  OFFICE_DOOR_IN, OFFICE_DOOR_OUT, LOUNGE_DOOR_IN, LOUNGE_DOOR_OUT,
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
  base: Pt;
  wander: Wander | null; // null for the Chief (he hosts instead)
};

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
const DESK_VARIANTS = ['ws1', 'ws2', 'ws3'];
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

  // the worker cubicles: a shared back panel with vertical dividers between
  // the three bays, so each worker sits in their own partitioned space
  buildCubicles(layer);

  // back-wall décor and fixtures
  prop(layer, 'shelf', PROPS.shelf);
  prop(layer, 'whiteboard', PROPS.whiteboard);
  prop(layer, 'certificate', PROPS.certificate);
  prop(layer, 'poster', PROPS.poster);
  prop(layer, 'chart', PROPS.chart);
  prop(layer, 'plantA', PROPS.plantBack);
  prop(layer, 'copier', PROPS.copier);
  prop(layer, 'copier', PROPS.copier2);
  // open plan, right side
  prop(layer, 'waterCooler', PROPS.waterCooler);
  prop(layer, 'papers', PROPS.printerTable);
  prop(layer, 'plantB', PROPS.plantMid);
  // the lounge
  prop(layer, 'vendingRed', PROPS.vendingRed);
  prop(layer, 'vendingDark', PROPS.vendingDark);
  prop(layer, 'sofa', PROPS.sofa);
  prop(layer, 'moneyPlant', PROPS.moneyPlant);
  prop(layer, 'lobbyChair', PROPS.lobbyChair);
  // the Chief's office
  prop(layer, 'certificate', PROPS.offCert);
  prop(layer, 'smallFrame', PROPS.offFrame);
  prop(layer, 'chart', PROPS.offChart);
  prop(layer, 'plantA', PROPS.offPlant);
  prop(layer, 'plantB', PROPS.offPlant2);
  prop(layer, 'chairOrange', PROPS.guestChair);

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

// Cubicle walls for the worker row: one horizontal glass back-panel that the
// desks butt up against, plus a vertical post on each bay edge.
function buildCubicles(layer: Container) {
  const slots = [0, 1, 2].map((s) => DESK_CELLS[s]).filter(Boolean);
  if (!slots.length) return;
  const leftX = slots[0].cx - 1.0;
  const rightX = slots[slots.length - 1].cx + 1.0;
  const backBottom = 2.55; // where the panel's base sits (desks meet it here)

  // back panel
  const panelTex = frame('partitionPanel');
  const panel = new TilingSprite({ texture: panelTex, width: ((rightX - leftX) * PX) / S, height: panelTex.height });
  panel.anchor.set(0, 1);
  panel.scale.set(S);
  const bp = cellAt(leftX, backBottom);
  panel.position.set(bp.x, bp.y);
  panel.zIndex = depth(backBottom) - 30; // behind the desks
  layer.addChild(panel);

  // vertical dividers between and around the bays
  const edges = [leftX];
  for (let i = 0; i < slots.length - 1; i++) edges.push((slots[i].cx + slots[i + 1].cx) / 2);
  edges.push(rightX);
  const postTex = frame('partitionPost');
  const postBottom = 3.95;
  for (const x of edges) {
    const post = new PixiSprite(postTex);
    post.anchor.set(0.5, 1);
    post.scale.set(S);
    const pp = cellAt(x, postBottom);
    post.position.set(pp.x, pp.y);
    post.zIndex = depth(postBottom) + 4;
    layer.addChild(post);
  }
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
      group.char.texture = spriteTexture(`char-${agent.avatar}-0`, () => character(agent.avatar, 0));
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

// A desk station composed to read as a person SITTING IN their chair: the
// chair's tall back rises behind them, the agent faces the camera, and the
// desk + monitor sit in front, hiding their lower body (after the sample).
function createDesk(layer: Container, slot: number, agent: SceneAgent): DeskGroup {
  const chief = slot === CEO_SLOT;
  const cell = DESK_CELLS[slot];
  const base = cellAt(cell.cx, cell.cy);
  const z = depth(cell.cy);

  // chair (tall back), behind the agent
  const chair = new PixiSprite(frame('chairBack'));
  chair.anchor.set(0.5, 1);
  chair.scale.set(S * 0.86);
  chair.position.set(base.x, base.y + 16);
  chair.zIndex = z + 1;

  // the agent, seated, facing the camera
  const char = new PixiSprite(spriteTexture(`char-${agent.avatar}-0`, () => character(agent.avatar, 0)));
  char.anchor.set(0.5, 1);
  char.scale.set(chief ? 4.9 : 4.6);
  char.position.set(base.x, base.y + 10);
  char.zIndex = z + 2;

  // the desk + monitor in front of them
  const desk = new PixiSprite(frame(chief ? 'deskL' : DESK_VARIANTS[slot % DESK_VARIANTS.length]));
  desk.anchor.set(0.5, 0);
  desk.scale.set(chief ? S * 1.05 : S);
  desk.position.set(base.x, base.y - (chief ? 30 : 38));
  desk.zIndex = z + 3;

  const sprites: PixiSprite[] = [chair, desk];
  if (chief) {
    // the L-desk is bare — sit a dual-monitor desktop set on it
    const clutter = new PixiSprite(frame('clutter'));
    clutter.anchor.set(0.5, 1);
    clutter.scale.set(S);
    clutter.position.set(base.x, base.y + 0.55 * PX);
    clutter.zIndex = z + 4;
    sprites.push(clutter);
  }

  const glow = new PixiSprite(glowTexture('screenglow', 'rgba(150,220,255,0.55)', 96));
  glow.anchor.set(0.5);
  glow.scale.set(1.0, 0.7);
  glow.position.set(base.x, base.y - 6);
  glow.zIndex = z + 5;
  glow.visible = agent.working;

  // a walking sprite for break-time wandering (workers only)
  let wander: Wander | null = null;
  if (!chief) {
    const stand = new PixiSprite(spriteTexture(`stand-${agent.avatar}-0`, () => standing(agent.avatar, 0)));
    stand.anchor.set(0.5, 1);
    stand.scale.set(4.4);
    stand.visible = false;
    layer.addChild(stand);
    wander = {
      stand, state: 'seated', phase: 'going', cx: cell.cx, cy: cell.cy,
      queue: [], dwellUntil: 0, nextLeave: performance.now() + 8_000 + Math.random() * 16_000, facing: 1,
    };
  }

  layer.addChild(char, glow, ...sprites);
  return { sprites, char, glow, avatar: agent.avatar, working: agent.working, base: cell, wander };
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
      const f = group.working ? frameN : 0;
      group.char.texture = spriteTexture(`char-${group.avatar}-${f}`, () => character(group.avatar, f as 0 | 1));
      const bob = group.working ? 0 : Math.round(Math.sin(t / 900 + slot * 1.7) * 1.5);
      group.char.position.y = cellAt(group.base.cx, group.base.cy).y + 10 + bob;
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
  const peers = [0, 1, 2, 4].filter((x) => x !== slot && s.desks.has(x));
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
