// Texture helpers shared by the office scene: LimeZu atlas frames, our
// procedural character sprites, and soft light glows — all cached by key and
// nearest-filtered so the pixels stay crisp.
import { Assets, Texture, Rectangle } from 'pixi.js';
import type { SpriteDef } from '../sprites';
import { FRAMES } from './atlas';
import atlasUrl from './office-atlas.png';

let atlasSource: Texture['source'] | null = null;
const cache = new Map<string, Texture>();

// Load the atlas once before the scene builds.
export async function loadAtlas(): Promise<void> {
  if (atlasSource) return;
  const tex = (await Assets.load(atlasUrl)) as Texture;
  tex.source.scaleMode = 'nearest';
  atlasSource = tex.source;
}

// A sub-texture for one named atlas frame.
export function frame(name: string): Texture {
  const hit = cache.get(`f:${name}`);
  if (hit) return hit;
  const f = FRAMES[name];
  if (!f || !atlasSource) return Texture.EMPTY;
  const tex = new Texture({ source: atlasSource, frame: new Rectangle(f[0], f[1], f[2], f[3]) });
  cache.set(`f:${name}`, tex);
  return tex;
}

export const frameSize = (name: string): [number, number] => {
  const f = FRAMES[name];
  return f ? [f[2], f[3]] : [32, 32];
};

// Our hand-drawn SpriteDefs (characters) → crisp Pixi texture, cached by key.
export function spriteTexture(key: string, make: () => SpriteDef): Texture {
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

// A soft radial glow (lamp pools, monitor halos) — light is allowed to be smooth.
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
