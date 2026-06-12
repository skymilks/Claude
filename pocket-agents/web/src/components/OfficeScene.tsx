import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Sprite as PixiSprite, TilingSprite } from 'pixi.js';
import { character, standing, DOG } from '../pixel/sprites';
import { loadAtlas, frame, spriteTexture, glowTexture } from '../pixel/pack/tex';
import {
  STAGE_W, STAGE_H, FLOOR_W, WALL_PX, TILE, S, COLS, ROWS,
  ROOM_TOP, DIVIDER_X, DOOR_LOUNGE, DOOR_OFFICE, WALK_LANE,
  cellAt, depth, DESK_CELLS, CEO_SLOT, standBeside, PROPS, COFFEE_STOP,
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

type DeskGroup = { sprites: PixiSprite[]; char: PixiSprite; glow: PixiSprite; avatar: string; working: boolean; baseY: number };
type Walker = {
  sprite: PixiSprite;
  cx: number; cy: number;
  out: boolean;
  strolling: boolean;
  pauseUntil: number;
  nextStroll: number;
  goalKey: string;     // identity of the current goal, to know when to re-route
  queue: { cx: number; cy: number }[];
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
const DESK_VARIANTS = ['ws1', 'ws2', 'ws3'];

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
      app.ticker.add(() => tick(scene.current!, app.ticker.lastTime));
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

const PX = TILE * S; // one tile in stage px

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
  const div = new TilingSprite({ texture: frame('wallVert'), width: 16, height: ((ROWS - ROOM_TOP) * TILE) });
  div.scale.set(S);
  const dp = cellAt(DIVIDER_X, ROOM_TOP);
  div.position.set(dp.x - 8 * S, dp.y);
  div.zIndex = depth(ROWS) + 50; // a thin cap seen from above: always over room contents near it
  layer.addChild(div);

  // the cubicle partition behind the worker desk row
  partitionRun(layer, 0.45, 8.35, 1.5);

  // back-wall décor and fixtures
  prop(layer, 'shelf', PROPS.shelf);
  prop(layer, 'whiteboard', PROPS.whiteboard);
  prop(layer, 'certificate', PROPS.certificate);
  prop(layer, 'poster', PROPS.poster);
  prop(layer, 'chart', PROPS.chart);
  prop(layer, 'plantA', PROPS.plantBack);
  prop(layer, 'waterCooler', PROPS.waterCooler);
  prop(layer, 'copier', PROPS.copier);
  // open plan, right side
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

// A horizontal stretch of capped white wall whose face lands at row `topY`,
// standing 2 tiles tall; its depth is where it meets the floor.
function wallRun(layer: Container, fromX: number, toX: number, topY: number) {
  if (toX - fromX < 0.05) return;
  const t = addTiling(layer, 'wallWhite', fromX, topY, toX - fromX, 2, 0);
  t.zIndex = depth(topY + 2);
}

// A cubicle divider like the sample's: a continuous glass panel with a post
// at each end and every few tiles along the run.
function partitionRun(layer: Container, fromX: number, toX: number, floorY: number) {
  const p0 = cellAt(fromX, floorY);
  const panelTex = frame('partitionPanel');
  const panel = new TilingSprite({ texture: panelTex, width: ((toX - fromX) * PX) / S, height: panelTex.height });
  panel.anchor.set(0, 1);
  panel.scale.set(S);
  panel.position.set(p0.x, p0.y);
  panel.zIndex = depth(floorY);
  layer.addChild(panel);
  const postTex = frame('partitionPost');
  const n = Math.max(1, Math.round((toX - fromX) / 2.7));
  for (let i = 0; i <= n; i++) {
    const x = fromX + ((toX - fromX) * i) / n;
    const post = new PixiSprite(postTex);
    post.anchor.set(0.5, 1);
    post.scale.set(S);
    const pp = cellAt(x, floorY + 0.05);
    post.position.set(pp.x, pp.y);
    post.zIndex = depth(floorY) + 1;
    layer.addChild(post);
  }
}

function prop(layer: Container, name: string, at: { cx: number; cy: number }) {
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
    group.glow.visible = agent.working;
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

// A desk station: the composed workstation sprite (varies by slot), the agent
// behind it facing the camera, a chair tucked on the near side, and a screen
// glow that breathes while they work.
function createDesk(layer: Container, slot: number, agent: SceneAgent): DeskGroup {
  const chief = slot === CEO_SLOT;
  const cell = DESK_CELLS[slot];
  const p = cellAt(cell.cx, cell.cy);
  const deskZ = depth(cell.cy + 0.65);

  const deskBottom = p.y + 0.65 * PX;
  const desk = new PixiSprite(frame(chief ? 'deskL' : DESK_VARIANTS[slot % DESK_VARIANTS.length]));
  desk.anchor.set(0.5, 1);
  desk.scale.set(S);
  desk.position.set(p.x, deskBottom);
  desk.zIndex = deskZ;
  const deskTop = deskBottom - desk.height; // stage px of the desk sprite's top edge

  // the agent behind the desk, head poking over its top edge
  const charY = deskTop + 0.55 * PX;
  const char = new PixiSprite(spriteTexture(`char-${agent.avatar}-0`, () => character(agent.avatar, 0)));
  char.anchor.set(0.5, 1);
  char.scale.set(chief ? 4.6 : 4.3);
  char.position.set(p.x, charY);
  char.zIndex = deskZ - 2;

  const sprites: PixiSprite[] = [desk];
  if (chief) {
    // the L-desk is bare — give it the dual-monitor desktop set
    const clutter = new PixiSprite(frame('clutter'));
    clutter.anchor.set(0.5, 1);
    clutter.scale.set(S);
    clutter.position.set(p.x - 6, deskTop + 0.9 * PX);
    clutter.zIndex = deskZ + 1;
    sprites.push(clutter);
  } else {
    // an empty chair tucked at the desk's near side, like the sample
    const chair = new PixiSprite(frame('chairBack'));
    chair.anchor.set(0.5, 1);
    chair.scale.set(S);
    chair.position.set(p.x, deskBottom + 0.35 * PX);
    chair.zIndex = deskZ + 3;
    sprites.push(chair);
  }

  const glow = new PixiSprite(glowTexture('screenglow', 'rgba(150,220,255,0.55)', 96));
  glow.anchor.set(0.5);
  glow.scale.set(1.0, 0.7);
  glow.position.set(p.x, deskTop + 0.5 * PX);
  glow.zIndex = deskZ + 2;
  glow.visible = agent.working;

  layer.addChild(char, glow, ...sprites);
  return { sprites, char, glow, avatar: agent.avatar, working: agent.working, baseY: charY };
}

// --- the living layer (every frame) ---------------------------------------------

function tick(s: Scene, t: number) {
  const frameN = Math.floor(t / 280) % 2 === 0 ? 0 : 1;
  for (const [slot, group] of s.desks) {
    const f = group.working ? frameN : 0;
    group.char.texture = spriteTexture(`char-${group.avatar}-${f}`, () => character(group.avatar, f as 0 | 1));
    const bob = group.working ? 0 : Math.round(Math.sin(t / 900 + slot * 1.7) * 1.5);
    group.char.position.y = group.baseY + bob;
    if (group.working) group.glow.alpha = 0.7 + Math.sin(t / 240) * 0.25;
    if (slot === CEO_SLOT && s.walker) group.char.visible = !s.walker.out;
  }
  if (s.dog) {
    const d = cellAt(PROPS.dog.cx, PROPS.dog.cy);
    s.dog.position.y = d.y - Math.abs(Math.sin(t / 420)) * 7;
  }
  if (s.walker) walkChief(s, t);
}

// Doors are the only way between regions, and open-plan crossings travel the
// walk lane (between the chairs and the rooms) so he never cuts through desks.
function routeTo(w: Walker, goal: { cx: number; cy: number }): { cx: number; cy: number }[] {
  const region = (cx: number, cy: number) => (cy <= ROOM_TOP ? 'open' : cx < DIVIDER_X ? 'lounge' : 'office');
  const from = region(w.cx, w.cy);
  const to = region(goal.cx, goal.cy);
  const out: { cx: number; cy: number }[] = [];
  if (from === 'office') out.push(OFFICE_DOOR_IN, OFFICE_DOOR_OUT);
  if (from === 'lounge') out.push(LOUNGE_DOOR_IN, LOUNGE_DOOR_OUT);
  // cross the open plan along the lane, aiming at the target room's door if any
  const enter = to !== from ? (to === 'office' ? [OFFICE_DOOR_OUT, OFFICE_DOOR_IN] : to === 'lounge' ? [LOUNGE_DOOR_OUT, LOUNGE_DOOR_IN] : []) : [];
  const laneX = enter.length ? enter[0].cx : goal.cx;
  const last = out.length ? out[out.length - 1] : { cx: w.cx, cy: w.cy };
  if (Math.abs(laneX - last.cx) > 1.0) out.push({ cx: last.cx, cy: WALK_LANE }, { cx: laneX, cy: WALK_LANE });
  out.push(...enter, goal);
  return out;
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
    w.queue = routeTo(w, goal);
  }

  // advance along the waypoint queue, one axis at a time
  let next = w.queue[0];
  while (next && Math.abs(next.cx - w.cx) < 0.05 && Math.abs(next.cy - w.cy) < 0.05) {
    w.queue.shift();
    next = w.queue[0];
  }

  if (next) {
    const dx = next.cx - w.cx;
    const dy = next.cy - w.cy;
    const leg = Math.abs(dy) > 0.05 ? { cx: 0, cy: Math.sign(dy) } : { cx: Math.sign(dx), cy: 0 };
    const step = (WALK_TILES_PER_S * s.app.ticker.deltaMS) / 1000;
    w.cx += leg.cx * Math.min(step, Math.abs(dx));
    w.cy += leg.cy * Math.min(step, Math.abs(dy));
    w.out = true;
    const f = Math.floor(t / 150) % 2 === 0 ? 0 : 1;
    w.sprite.texture = spriteTexture(`stand-ceo-${f}`, () => standing('ceo', f as 0 | 1));
    if (leg.cx !== 0) w.sprite.scale.x = 4 * Math.sign(leg.cx);
  } else if (w.strolling) {
    // arrived at the espresso bar: linger, then head home
    if (w.pauseUntil === 0) w.pauseUntil = t + 2600;
    w.sprite.texture = spriteTexture('stand-ceo-0', () => standing('ceo', 0));
    w.sprite.scale.x = 4;
    if (t >= w.pauseUntil) {
      w.strolling = false;
      w.nextStroll = t + 34_000 + Math.random() * 30_000;
    }
  } else if (Math.abs(w.cx - seat.cx) < 0.1 && Math.abs(w.cy - seat.cy) < 0.1) {
    w.out = false; // back in his chair
  } else {
    w.sprite.texture = spriteTexture('stand-ceo-0', () => standing('ceo', 0));
    w.sprite.scale.x = 4;
  }

  const p = cellAt(w.cx, w.cy);
  w.sprite.position.set(p.x, p.y + 18);
  w.sprite.zIndex = depth(w.cy) + 3;
  w.sprite.visible = w.out;
}
