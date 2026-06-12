import { useEffect, useRef, useState } from 'react';
import { Application, Container, Sprite as PixiSprite, TilingSprite } from 'pixi.js';
import { character, standing } from '../pixel/sprites';
import { loadAtlas, frame, spriteTexture, glowTexture } from '../pixel/pack/tex';
import {
  STAGE_W, STAGE_H, FLOOR_W, FLOOR_H, WALL_PX, TILE, S,
  cellAt, depth, DESK_CELLS, CEO_SLOT, standBeside, PROPS, COFFEE_STOP,
} from '../pixel/grid';

// The canvas half of the office: PixiJS renders the top-down room (LimeZu
// "Modern Office" art) and everything that moves in it; all interactivity
// (clicks, nameplates, bubbles) lives in the DOM overlay Office.tsx projects
// onto the same grid. Depth is one rule — zIndex by screen-row — so desks,
// people, and props overlap correctly.

export type SceneAgent = { id: string; slot: number; avatar: string; working: boolean };
export type SceneCosmetics = { rug: boolean; plant: boolean; coffee: boolean; dog: boolean };

type DeskGroup = { desk: PixiSprite; char: PixiSprite; monitor: PixiSprite; glow: PixiSprite; avatar: string; working: boolean };
type Walker = { sprite: PixiSprite; cx: number; cy: number; out: boolean; strolling: boolean; pauseUntil: number; nextStroll: number };
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

const WALK_TILES_PER_S = 3.2;

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

function buildRoom(layer: Container) {
  // floor fill
  const floor = new TilingSprite({ texture: frame('floor'), width: FLOOR_W / S, height: FLOOR_H / S });
  floor.scale.set(S);
  floor.position.set(0, WALL_PX);
  floor.zIndex = -10_000;
  layer.addChild(floor);

  // back wall (tiles the 32×64 wall slice across the top)
  const wall = new TilingSprite({ texture: frame('wall'), width: FLOOR_W / S, height: (WALL_PX + TILE * S) / S });
  wall.scale.set(S);
  wall.position.set(0, 0);
  wall.zIndex = -9_500;
  layer.addChild(wall);
  // a soft shadow where the wall meets the floor
  const shade = new PixiSprite(glowTexture('wallshade', 'rgba(0,0,0,0.22)', 64));
  shade.anchor.set(0.5, 0);
  shade.width = FLOOR_W;
  shade.height = TILE * S * 0.7;
  shade.position.set(FLOOR_W / 2, WALL_PX - 6);
  shade.zIndex = -9_400;
  layer.addChild(shade);

  // wall décor + back-corner plants
  prop(layer, frame('poster'), PROPS.posterWall, 0.5);
  prop(layer, frame('bookshelf'), PROPS.chartWall, 0.7);
  prop(layer, frame('plantTall'), PROPS.plantBackL, 1);
  prop(layer, frame('plantTall'), PROPS.plantBackR, 1);
  prop(layer, frame('bookshelf'), PROPS.bookshelf, 1);
  prop(layer, frame('vending'), PROPS.vending, 1);
  prop(layer, frame('printer'), PROPS.printer, 1);
  prop(layer, frame('sofa'), PROPS.sofa, 1);
}

function prop(layer: Container, tex: ReturnType<typeof frame>, at: { cx: number; cy: number }, anchorY = 1) {
  const sp = new PixiSprite(tex);
  const p = cellAt(at.cx, at.cy);
  sp.anchor.set(0.5, anchorY);
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
      for (const sp of [group.desk, group.char, group.monitor, group.glow]) sp.destroy();
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
    group.monitor.tint = agent.working ? 0xffffff : 0x9fb0bd;
  }

  if (s.hasChief && !s.walker) {
    const seat = DESK_CELLS[CEO_SLOT];
    const sprite = new PixiSprite(spriteTexture('stand-ceo-0', () => standing('ceo', 0)));
    sprite.anchor.set(0.5, 0.95);
    sprite.scale.set(4);
    sprite.visible = false;
    s.layer.addChild(sprite);
    s.walker = { sprite, cx: seat.cx, cy: seat.cy, out: false, strolling: false, pauseUntil: 0, nextStroll: 22_000 };
  }
  if (!s.hasChief && s.walker) {
    s.walker.sprite.destroy();
    s.walker = null;
  }

  syncCosmetic(s, 'rug', cosmetics.rug, () => propSprite('rug', frame('floor'), PROPS.rug, 0.5, -8_800, 2.4, 1.4));
  syncCosmetic(s, 'coffee', cosmetics.coffee, () => propSprite('coffee', frame('printer'), PROPS.coffee, 1, undefined, 1, 1));
  syncCosmetic(s, 'plant', cosmetics.plant, () => propSprite('plant', frame('plantSmall'), PROPS.plantFront, 1, undefined, 1, 1));
  syncCosmetic(s, 'dog', cosmetics.dog, () => {
    const sp = propSprite('dog', frame('plantSmall'), PROPS.dog, 1, undefined, 1, 1);
    s.dog = sp;
    return sp;
  });
  if (!cosmetics.dog) s.dog = null;
}

function propSprite(
  _key: string, tex: ReturnType<typeof frame>, at: { cx: number; cy: number },
  anchorY: number, zOverride?: number, sx = 1, sy = 1
) {
  const sp = new PixiSprite(tex);
  const p = cellAt(at.cx, at.cy);
  sp.anchor.set(0.5, anchorY);
  sp.scale.set(S * sx, S * sy);
  sp.position.set(p.x, p.y);
  sp.zIndex = zOverride ?? depth(at.cy);
  return sp;
}

function syncCosmetic(s: Scene, key: string, on: boolean, make: () => PixiSprite) {
  const existing = s.cosmeticSprites.get(key);
  if (on && !existing) {
    const sp = make();
    s.layer.addChild(sp);
    s.cosmeticSprites.set(key, sp);
  }
  if (!on && existing) {
    existing.destroy();
    s.cosmeticSprites.delete(key);
  }
}

function createDesk(layer: Container, slot: number, agent: SceneAgent): DeskGroup {
  const chief = slot === CEO_SLOT;
  const cell = DESK_CELLS[slot];
  const p = cellAt(cell.cx, cell.cy);
  const z = depth(cell.cy);

  // the agent, behind the desk, facing the camera
  const char = new PixiSprite(spriteTexture(`char-${agent.avatar}-0`, () => character(agent.avatar, 0)));
  char.anchor.set(0.5, 1);
  char.scale.set(chief ? 4.8 : 4.4);
  char.position.set(p.x, p.y + 8);
  char.zIndex = z - 2;

  // the desk in front, covering their lower half
  const desk = new PixiSprite(frame('deskTan'));
  desk.anchor.set(0.5, 0.4);
  desk.scale.set(chief ? S * 1.14 : S);
  desk.position.set(p.x, p.y + 34);
  desk.zIndex = z;

  // a monitor sitting low on the desk's near edge; lit while working
  const monitor = new PixiSprite(frame('monitor'));
  monitor.anchor.set(0.5, 1);
  monitor.scale.set(S * 0.62);
  monitor.position.set(p.x + (chief ? 16 : 11), p.y + 44);
  monitor.zIndex = z + 1;
  monitor.tint = agent.working ? 0xffffff : 0xaebac4;

  const glow = new PixiSprite(glowTexture('screenglow', 'rgba(150,220,255,0.6)', 96));
  glow.anchor.set(0.5);
  glow.scale.set(1.0, 0.7);
  glow.position.set(monitor.x, p.y + 24);
  glow.zIndex = z + 2;
  glow.visible = agent.working;

  layer.addChild(char, desk, monitor, glow);
  return { desk, char, monitor, glow, avatar: agent.avatar, working: agent.working };
}

// --- the living layer (every frame) ---------------------------------------------

function tick(s: Scene, t: number) {
  const frameN = Math.floor(t / 280) % 2 === 0 ? 0 : 1;
  for (const [slot, group] of s.desks) {
    const cell = DESK_CELLS[slot];
    const base = cellAt(cell.cx, cell.cy);
    const f = group.working ? frameN : 0;
    group.char.texture = spriteTexture(`char-${group.avatar}-${f}`, () => character(group.avatar, f as 0 | 1));
    const bob = group.working ? 0 : Math.round(Math.sin(t / 900 + slot * 1.7) * 1.5);
    group.char.position.y = base.y + 8 + bob;
    if (group.working) group.glow.alpha = 0.7 + Math.sin(t / 240) * 0.25;
    if (slot === CEO_SLOT && s.walker) group.char.visible = !s.walker.out;
  }
  if (s.dog) {
    const d = cellAt(PROPS.dog.cx, PROPS.dog.cy);
    s.dog.position.y = d.y - Math.abs(Math.sin(t / 420)) * 7;
  }
  if (s.walker) walkChief(s, t);
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
  const dx = goal.cx - w.cx;
  const dy = goal.cy - w.cy;
  const arrived = Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05;

  if (!arrived) {
    const leg = Math.abs(dy) > 0.05 ? { cx: 0, cy: Math.sign(dy) } : { cx: Math.sign(dx), cy: 0 };
    const step = (WALK_TILES_PER_S * s.app.ticker.deltaMS) / 1000;
    w.cx += leg.cx * Math.min(step, Math.abs(dx));
    w.cy += leg.cy * Math.min(step, Math.abs(dy));
    w.out = true;
    const f = Math.floor(t / 150) % 2 === 0 ? 0 : 1;
    w.sprite.texture = spriteTexture(`stand-ceo-${f}`, () => standing('ceo', f as 0 | 1));
    if (leg.cx !== 0) w.sprite.scale.x = 4 * Math.sign(leg.cx);
  } else if (w.strolling) {
    if (w.pauseUntil === 0) w.pauseUntil = t + 2600;
    w.sprite.texture = spriteTexture('stand-ceo-0', () => standing('ceo', 0));
    if (t >= w.pauseUntil) {
      w.strolling = false;
      w.nextStroll = t + 34_000 + Math.random() * 30_000;
    }
  } else if (goal === seat) {
    w.out = false;
  } else {
    w.sprite.texture = spriteTexture('stand-ceo-0', () => standing('ceo', 0));
    w.sprite.scale.x = 4;
  }

  const p = cellAt(w.cx, w.cy);
  w.sprite.position.set(p.x, p.y + 18);
  w.sprite.zIndex = depth(w.cy) + 3;
  w.sprite.visible = w.out;
}
