import { useEffect, useRef } from 'react';
import { Application, Container, Sprite as PixiSprite } from 'pixi.js';
import { character, standing, CHAIR, PLANT, SHELF, LAMP, COFFEE, DOG, SUCCULENT } from '../pixel/sprites';
import { texture, glowTexture, floorDef, wallDef, deskDef, rugDef } from '../pixel/isoArt';
import {
  STAGE_W, STAGE_H, TILE_W, TILE_H, WALL_H, ROWS,
  tileAt, depth, DESK_TILES, CEO_SLOT, standBeside, PROPS, COFFEE_STOP,
} from '../pixel/iso';

// The canvas half of the office: PixiJS renders the isometric room and every
// animated thing in it; all interactivity (clicks, nameplates, bubbles) lives
// in the DOM overlay that Office.tsx projects onto the same grid. Depth is one
// rule — zIndex = grid x+y — which is what keeps lamps, plants, desks, and
// people overlapping correctly from every angle.

export type SceneAgent = { id: string; slot: number; avatar: string; working: boolean };
export type SceneCosmetics = { rug: boolean; plant: boolean; coffee: boolean; dog: boolean };

type DeskGroup = {
  desk: PixiSprite;
  chair: PixiSprite;
  char: PixiSprite;
  glow: PixiSprite;
  avatar: string;
  working: boolean;
  chief: boolean;
};

type Walker = {
  sprite: PixiSprite;
  gx: number;
  gy: number;
  out: boolean; // away from her desk (standing/walking) vs seated
  strolling: boolean; // on the coffee run
  pauseUntil: number; // ticker-time she stops lingering at the machine
  nextStroll: number; // ticker-time of the next coffee run
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

const WALK_TILES_PER_S = 2.6;

export function OfficeScene({
  agents,
  cosmetics,
  hostSlot,
}: {
  agents: SceneAgent[];
  cosmetics: SceneCosmetics;
  hostSlot: number | null;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const scene = useRef<Scene | null>(null);
  const latest = useRef({ agents, cosmetics, hostSlot });
  latest.current = { agents, cosmetics, hostSlot };

  useEffect(() => {
    let dead = false;
    const app = new Application();
    app
      .init({ width: STAGE_W, height: STAGE_H, backgroundAlpha: 0, antialias: false })
      .then(() => {
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
          app, layer,
          desks: new Map(),
          walker: null,
          dog: null,
          cosmeticSprites: new Map(),
          hostSlot: null,
          hasChief: false,
          hasCoffee: false,
        };
        reconcile(scene.current, latest.current.agents, latest.current.cosmetics, latest.current.hostSlot);
        app.ticker.add(() => tick(scene.current!, app.ticker.lastTime));
      })
      .catch(() => {});
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
    if (scene.current) reconcile(scene.current, agents, cosmetics, hostSlot);
  }, [agents, cosmetics, hostSlot]);

  return <div ref={holder} style={{ width: STAGE_W, height: STAGE_H }} />;
}

// --- static room -------------------------------------------------------------

function buildRoom(layer: Container) {
  const corner = tileAt(0, 0); // the room's far corner, where the walls meet
  // floorDef draws tile (0,0) centered at texture px (ROWS*TILE_W/2, TILE_H/2)
  const floor = new PixiSprite(texture('floor', floorDef));
  floor.position.set(corner.x - (ROWS * TILE_W) / 2, corner.y - TILE_H / 2);
  floor.zIndex = -10_000;
  layer.addChild(floor);

  const wallR = new PixiSprite(texture('wallR', () => wallDef('R')));
  wallR.position.set(corner.x, corner.y - TILE_H / 2 - WALL_H);
  wallR.zIndex = -9_000;
  layer.addChild(wallR);

  // wallDef('L') has its room-corner end at its right edge
  const wallL = new PixiSprite(texture('wallL', () => wallDef('L')));
  wallL.position.set(corner.x - (ROWS * TILE_W) / 2, corner.y - TILE_H / 2 - WALL_H);
  wallL.zIndex = -9_000;
  layer.addChild(wallL);

  // sunlight pools under the windows on the right wall
  const sun = new PixiSprite(glowTexture('sun', 'rgba(255,236,170,0.34)', 220));
  const sunAt = tileAt(3.2, 1.4);
  sun.anchor.set(0.5);
  sun.scale.set(2.3, 1.1);
  sun.position.set(sunAt.x, sunAt.y);
  sun.zIndex = -8_000;
  layer.addChild(sun);

  addProp(layer, texture('plant', () => PLANT), PROPS.plant, 6, 0.94);
  addProp(layer, texture('shelf', () => SHELF), PROPS.shelf, 5, 0.96);
  const lamp = addProp(layer, texture('lamp', () => LAMP), PROPS.lamp, 5, 0.96);
  lamp.zIndex += 2;
  const lampGlow = new PixiSprite(glowTexture('lampglow', 'rgba(255,210,110,0.30)', 260));
  const lp = tileAt(PROPS.lamp.gx, PROPS.lamp.gy);
  lampGlow.anchor.set(0.5);
  lampGlow.scale.set(1.5, 0.85);
  lampGlow.position.set(lp.x, lp.y - 8);
  lampGlow.zIndex = -7_999;
  layer.addChild(lampGlow);
}

function addProp(
  layer: Container,
  tex: ReturnType<typeof texture>,
  at: { gx: number; gy: number },
  scale: number,
  anchorY = 0.95
) {
  const s = new PixiSprite(tex);
  const p = tileAt(at.gx, at.gy);
  s.anchor.set(0.5, anchorY);
  s.scale.set(scale);
  s.position.set(p.x, p.y);
  s.zIndex = depth(at.gx, at.gy);
  layer.addChild(s);
  return s;
}

// --- live state → scene graph ---------------------------------------------------

function reconcile(s: Scene, agents: SceneAgent[], cosmetics: SceneCosmetics, hostSlot: number | null) {
  s.hostSlot = hostSlot;
  s.hasCoffee = cosmetics.coffee;
  const bySlot = new Map(agents.map((a) => [a.slot, a]));
  s.hasChief = bySlot.has(CEO_SLOT);

  // desks come and go with hires
  for (const [slot, group] of s.desks) {
    if (!bySlot.has(slot)) {
      for (const sp of [group.desk, group.chair, group.char, group.glow]) sp.destroy();
      s.desks.delete(slot);
    }
  }
  for (const [slot, agent] of bySlot) {
    const tile = DESK_TILES[slot];
    if (!tile) continue;
    let group = s.desks.get(slot);
    if (!group) {
      group = createDeskGroup(s.layer, slot, agent);
      s.desks.set(slot, group);
    }
    if (group.working !== agent.working || group.avatar !== agent.avatar) {
      group.working = agent.working;
      group.avatar = agent.avatar;
      group.desk.texture = texture(`desk-${group.chief}-${agent.working}`, () => deskDef(agent.working, group!.chief));
      group.char.texture = texture(`char-${agent.avatar}-0`, () => character(agent.avatar, 0));
    }
    group.glow.visible = agent.working;
  }

  // the chief's walking self exists only while she's hired
  if (s.hasChief && !s.walker) {
    const seat = DESK_TILES[CEO_SLOT];
    const sprite = new PixiSprite(texture('stand-ceo-0', () => standing('ceo', 0)));
    sprite.anchor.set(0.5, 0.97);
    sprite.scale.set(4);
    sprite.visible = false;
    s.layer.addChild(sprite);
    s.walker = { sprite, gx: seat.gx, gy: seat.gy, out: false, strolling: false, pauseUntil: 0, nextStroll: 22_000 };
  }
  if (!s.hasChief && s.walker) {
    s.walker.sprite.destroy();
    s.walker = null;
  }

  // cosmetics
  syncCosmetic(s, 'rug', cosmetics.rug, () => {
    const sp = new PixiSprite(texture('rug', rugDef));
    const p = tileAt(PROPS.rug.gx, PROPS.rug.gy);
    sp.anchor.set(0.5);
    sp.position.set(p.x, p.y);
    sp.zIndex = -8_500;
    return sp;
  });
  syncCosmetic(s, 'coffee', cosmetics.coffee, () => {
    const sp = new PixiSprite(texture('coffee', () => COFFEE));
    const p = tileAt(PROPS.coffee.gx, PROPS.coffee.gy);
    sp.anchor.set(0.5, 0.95);
    sp.scale.set(4);
    sp.position.set(p.x, p.y);
    sp.zIndex = depth(PROPS.coffee.gx, PROPS.coffee.gy);
    return sp;
  });
  syncCosmetic(s, 'plant', cosmetics.plant, () => {
    const sp = new PixiSprite(texture('succulent', () => SUCCULENT));
    const p = tileAt(PROPS.succulent.gx, PROPS.succulent.gy);
    sp.anchor.set(0.5, 0.95);
    sp.scale.set(4);
    sp.position.set(p.x, p.y - 52); // up on the shelf
    sp.zIndex = depth(PROPS.succulent.gx, PROPS.succulent.gy) + 1;
    return sp;
  });
  syncCosmetic(s, 'dog', cosmetics.dog, () => {
    const sp = new PixiSprite(texture('dog', () => DOG));
    const p = tileAt(PROPS.dog.gx, PROPS.dog.gy);
    sp.anchor.set(0.5, 0.95);
    sp.scale.set(4);
    sp.position.set(p.x, p.y);
    sp.zIndex = depth(PROPS.dog.gx, PROPS.dog.gy);
    s.dog = sp;
    return sp;
  });
  if (!cosmetics.dog) s.dog = null;
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

function createDeskGroup(layer: Container, slot: number, agent: SceneAgent): DeskGroup {
  const chief = slot === CEO_SLOT;
  const tile = DESK_TILES[slot];
  const p = tileAt(tile.gx, tile.gy);
  const z = depth(tile.gx, tile.gy);

  const glow = new PixiSprite(glowTexture('screenglow', 'rgba(143,227,255,0.55)', 96));
  glow.anchor.set(0.5);
  glow.scale.set(1.4, 1.0);
  glow.position.set(p.x + 2, p.y - 38);
  glow.zIndex = z + 1; // in front of the desk: the halo hugs the monitor
  glow.visible = agent.working;

  const chair = new PixiSprite(texture('chair', () => CHAIR));
  chair.anchor.set(0.5, 1);
  chair.scale.set(4);
  chair.position.set(p.x - 2, p.y - 44);
  chair.zIndex = z - 5;

  const char = new PixiSprite(texture(`char-${agent.avatar}-0`, () => character(agent.avatar, 0)));
  char.anchor.set(0.5, 1);
  char.scale.set(4);
  char.position.set(p.x - 2, p.y - 14);
  char.zIndex = z - 3;

  const desk = new PixiSprite(texture(`desk-${chief}-${agent.working}`, () => deskDef(agent.working, chief)));
  desk.anchor.set(0.5, 1);
  desk.position.set(p.x, p.y + 61);
  desk.zIndex = z;

  layer.addChild(glow, chair, char, desk);
  return { desk, chair, char, glow, avatar: agent.avatar, working: agent.working, chief };
}

// --- the living layer (runs every frame) ----------------------------------------

function tick(s: Scene, timeMs: number) {
  const t = timeMs;
  const frame = Math.floor(t / 300) % 2 === 0 ? 0 : 1;

  for (const [slot, group] of s.desks) {
    // typing animation while working; gentle idle breathing otherwise
    const f = group.working ? frame : 0;
    group.char.texture = texture(`char-${group.avatar}-${f}`, () => character(group.avatar, f as 0 | 1));
    const tile = DESK_TILES[slot];
    const base = tileAt(tile.gx, tile.gy);
    const bob = group.working ? 0 : Math.round(Math.sin(t / 900 + slot * 1.7) * 1.5);
    group.char.position.y = base.y - 14 + bob;
    if (group.working) group.glow.alpha = 0.8 + Math.sin(t / 260) * 0.2;
    // the chief's seated self steps out while her walking self is away
    if (slot === CEO_SLOT && s.walker) {
      group.char.visible = !s.walker.out;
      group.chair.visible = true;
    }
  }

  if (s.dog) s.dog.position.y = tileAt(PROPS.dog.gx, PROPS.dog.gy).y - Math.abs(Math.sin(t / 420)) * 6;

  if (s.walker) walkChief(s, t);
}

function walkChief(s: Scene, t: number) {
  const w = s.walker!;
  const seat = DESK_TILES[CEO_SLOT];
  const chiefBusy = s.desks.get(CEO_SLOT)?.working ?? false;

  // Where should she be? Hosting beside a working desk beats everything;
  // otherwise the occasional coffee run; otherwise her own seat.
  if (s.hostSlot !== null || chiefBusy) w.strolling = false;
  else if (!w.out && t > w.nextStroll && s.hasCoffee) {
    w.strolling = true;
    w.pauseUntil = 0;
  }
  const goal = s.hostSlot !== null && !chiefBusy ? standBeside(s.hostSlot) : w.strolling ? COFFEE_STOP : seat;
  const dx = goal.gx - w.gx;
  const dy = goal.gy - w.gy;
  const arrived = Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05;

  if (!arrived) {
    // L-shaped path: align y first, then x — reads like hallway walking.
    const leg = Math.abs(dy) > 0.05 ? { gx: 0, gy: Math.sign(dy) } : { gx: Math.sign(dx), gy: 0 };
    const step = (WALK_TILES_PER_S * s.app.ticker.deltaMS) / 1000;
    w.gx += leg.gx * Math.min(step, Math.abs(dx));
    w.gy += leg.gy * Math.min(step, Math.abs(dy));
    w.out = true;
    const f = Math.floor(t / 150) % 2 === 0 ? 0 : 1;
    w.sprite.texture = texture(`stand-ceo-${f}`, () => standing('ceo', f as 0 | 1));
    // face the way she's moving on screen: +gx and -gy both head right
    const screenDx = leg.gx - leg.gy;
    if (screenDx !== 0) w.sprite.scale.x = 4 * Math.sign(screenDx);
  } else if (w.strolling) {
    // lingering at the coffee machine
    if (w.pauseUntil === 0) w.pauseUntil = t + 2600;
    w.sprite.texture = texture('stand-ceo-0', () => standing('ceo', 0));
    if (t >= w.pauseUntil) {
      w.strolling = false;
      w.nextStroll = t + 34_000 + Math.random() * 30_000;
    }
  } else if (goal === seat) {
    // home again: sit back down
    w.out = false;
  } else {
    // standing beside the working desk, watching the screen with them
    w.sprite.texture = texture('stand-ceo-0', () => standing('ceo', 0));
    w.sprite.scale.x = 4;
  }

  const p = tileAt(w.gx, w.gy);
  w.sprite.position.set(p.x, p.y + 6);
  w.sprite.zIndex = depth(w.gx, w.gy) + 4;
  w.sprite.visible = w.out;
}
