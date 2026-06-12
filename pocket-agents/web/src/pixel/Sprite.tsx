import { useEffect, useRef } from 'react';
import type { SpriteDef } from './sprites';

export function Sprite({ def, scale = 4, className }: { def: SpriteDef; scale?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const width = def.grid[0].length;
  const height = def.grid.length;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = def.grid[y][x];
        if (!key || key === '.' || key === ' ' || !def.palette[key]) continue;
        ctx.fillStyle = def.palette[key];
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [def, width, height]);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      className={`pixelated ${className ?? ''}`}
      style={{ width: width * scale, height: height * scale }}
    />
  );
}
