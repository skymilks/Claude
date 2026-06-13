// Regenerate web/src/pixel/pack/office-atlas.png from a licensed copy of
// LimeZu's "Modern Office" pack. We never commit the raw pack — only the small
// atlas of sprites the app renders. Point this at your unzipped pack root:
//   node web/scripts/gen-atlas.mjs /path/to/Modern_Office
// Requires Playwright's Chromium to compose with crisp pixels.
//
// Furniture comes from the pack's named singles (4_Modern_Office_singles,
// 32x32 set — each file is one sprite on a padded 64×96 canvas, which we
// auto-trim). Floors and walls are sliced from the Room Builder sheet.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PACK = process.argv[2];
if (!PACK) {
  console.error('usage: node gen-atlas.mjs /path/to/Modern_Office (the unzipped pack root)');
  process.exit(1);
}

// name → singles number (trimmed automatically)
const SINGLES = {
  ws1: 233,        // desk with tower PC + monitor + clutter (faces away → screen front)
  ws2: 235,        // desk set, second colorway
  ws3: 327,        // desk with white monitor + papers
  deskTop: 16,     // a plain desk-surface tile (tiled into a 2-wide desk)
  deskEdge: 14,    // the desk's front lip + legs
  monitorBack: 126,// monitor seen from behind (agents facing the camera)
  monitorFront: 136,// monitor screen + keyboard (agents facing away)
  keyboard: 124,
  dualMon: 311,    // dual screens on a stand (the Chief's)
  deskL: 249,      // L-shaped tan desk (the Chief's)
  clutter: 227,    // dual-monitor desktop set, overlays a bare desk
  chairBack: 101,  // black chair seen from behind (tucks under a south-facing desk)
  chairFront: 102, // black chair facing the camera
  chairOrange: 107,
  waterCooler: 173,
  vendingRed: 175,
  vendingDark: 176,
  whiteboard: 170, // blank presentation screen
  chart: 172,      // line-chart board
  poster: 164,     // pop-art four faces
  frame163: 163,   // framed abstract art (the Chief's wall)
  panel128: 128,   // light wall panel / schedule board
  certificate: 115,
  smallFrame: 162,
  plantA: 98,
  plantB: 100,
  lamp: 141,
  papers: 155,
  shelf: 156,
  copier: 225,
  sofa: 205,
  lobbyChair: 196,
  partitionPanel: 208, // glass partition panel (tiled between posts)
  partitionPost: 207,
  coffeeBar: 320,  // espresso setup on a table
  rug: 90,         // red carpet mat
  moneyPlant: 338,
};

// name → [sx, sy, sw, sh] slices from the Room Builder sheet (not trimmed)
const SLICES = {
  floor: [352, 160, 32, 32],      // light grey office tile
  floorWood: [416, 160, 32, 32],  // light plank (the Chief's office)
  brick: [704, 288, 32, 32],      // tan brick floor (the bottom rooms in the sample)
  wallWhite: [32, 352, 32, 64],   // white wall: cap + face
  wallVert: [96, 352, 16, 64],    // narrow vertical wall strip
};

const dataUrl = (p) => 'data:image/png;base64,' + readFileSync(p).toString('base64');
const inputs = {
  rb: dataUrl(`${PACK}/1_Room_Builder_Office/Room_Builder_Office_32x32.png`),
  singles: Object.fromEntries(
    Object.entries(SINGLES).map(([name, n]) => [
      name,
      dataUrl(`${PACK}/4_Modern_Office_singles/32x32/Modern_Office_Singles_32x32_${n}.png`),
    ]),
  ),
};

const b = await chromium.launch();
const p = await b.newPage();
await p.setContent('<canvas id=c></canvas>');
const out = await p.evaluate(
  async ({ inputs, SLICES }) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const scratch = document.createElement('canvas');
    const sg = scratch.getContext('2d', { willReadFrequently: true });

    // trim transparent padding → {img, sx, sy, w, h}
    const trim = (img) => {
      scratch.width = img.width; scratch.height = img.height;
      sg.clearRect(0, 0, img.width, img.height);
      sg.drawImage(img, 0, 0);
      const d = sg.getImageData(0, 0, img.width, img.height).data;
      let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
      for (let y = 0; y < img.height; y++)
        for (let x = 0; x < img.width; x++)
          if (d[(y * img.width + x) * 4 + 3] > 0) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
      return { img, sx: x0, sy: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    };

    const rb = await load(inputs.rb);
    const items = [];
    for (const [name, src] of Object.entries(inputs.singles)) items.push({ name, ...trim(await load(src)) });
    for (const [name, [sx, sy, sw, sh]] of Object.entries(SLICES)) items.push({ name, img: rb, sx, sy, w: sw, h: sh });

    // shelf-pack into a 512-wide atlas, tallest first
    items.sort((a, b2) => b2.h - a.h);
    const PAD = 1;
    let x = PAD, y = PAD, rowH = 0;
    const frames = {};
    for (const it of items) {
      if (x + it.w + PAD > 512) { x = PAD; y += rowH + PAD; rowH = 0; }
      frames[it.name] = [x, y, it.w, it.h];
      it.dx = x; it.dy = y;
      x += it.w + PAD; rowH = Math.max(rowH, it.h);
    }
    const H = y + rowH + PAD;
    const c = document.getElementById('c');
    c.width = 512; c.height = H;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (const it of items) g.drawImage(it.img, it.sx, it.sy, it.w, it.h, it.dx, it.dy, it.w, it.h);
    return { png: c.toDataURL('image/png'), frames, w: 512, h: H };
  },
  { inputs, SLICES },
);
await b.close();

const here = new URL('.', import.meta.url).pathname;
writeFileSync(`${here}../src/pixel/pack/office-atlas.png`, Buffer.from(out.png.split(',')[1], 'base64'));
writeFileSync(
  `${here}../src/pixel/pack/atlas.ts`,
  `// Generated atlas of LimeZu "Modern Office" sprites (only what we render).\n` +
    `// Art © LimeZu — commercial use OK, redistribution of the full pack is not,\n` +
    `// so we ship just these slices. Regenerate with web/scripts/gen-atlas.mjs.\n` +
    `export const ATLAS = { w: ${out.w}, h: ${out.h} };\n` +
    `export const FRAMES: Record<string, [number, number, number, number]> = ${JSON.stringify(out.frames, null, 2)};\n`,
);
console.log('wrote atlas', out.w + 'x' + out.h, Object.keys(out.frames).length, 'frames');
