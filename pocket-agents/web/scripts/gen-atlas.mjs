// Regenerate web/src/pixel/pack/office-atlas.png from a licensed copy of
// LimeZu's "Modern Office" pack. We never commit the raw pack — only the small
// atlas of slices the app renders. Point SHEETS at your own pack, then:
//   node web/scripts/gen-atlas.mjs /path/to/Modern_Office
// Requires a headless Chromium (Playwright) to crop + repack with crisp pixels.
//
// FRAMES below are [sheet, sx, sy, sw, sh] in source px (32px tiles):
//   mo = Modern_Office_32x32.png,  rb = 1_Room_Builder_Office/Room_Builder_Office_32x32.png
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PACK = process.argv[2];
if (!PACK) {
  console.error('usage: node gen-atlas.mjs /path/to/Modern_Office (the unzipped pack root)');
  process.exit(1);
}

const FRAMES = [
  { name: 'floor',      rect: ['rb', 320, 224, 32, 32] },
  { name: 'floorWood',  rect: ['rb', 416, 160, 32, 32] },
  { name: 'wall',       rect: ['rb', 32, 224, 32, 64] },
  { name: 'ws1',        rect: ['mo', 256, 1216, 64, 64] },
  { name: 'ws2',        rect: ['mo', 320, 1216, 64, 64] },
  { name: 'ws3',        rect: ['mo', 384, 1216, 64, 64] },
  { name: 'deskTan',    rect: ['mo', 224, 896, 64, 64] },
  { name: 'monitor',    rect: ['mo', 352, 256, 32, 32] },
  { name: 'chair',      rect: ['mo', 0, 256, 32, 32] },
  { name: 'chairOrange',rect: ['mo', 0, 320, 32, 32] },
  { name: 'plantTall',  rect: ['mo', 160, 224, 32, 64] },
  { name: 'plantSmall', rect: ['mo', 160, 320, 32, 64] },
  { name: 'sofa',       rect: ['mo', 0, 544, 64, 64] },
  { name: 'vending',    rect: ['mo', 0, 736, 32, 64] },
  { name: 'bookshelf',  rect: ['mo', 192, 384, 32, 64] },
  { name: 'poster',     rect: ['mo', 0, 384, 64, 64] },
  { name: 'chart',      rect: ['mo', 192, 448, 64, 64] },
  { name: 'printer',    rect: ['mo', 256, 576, 32, 64] },
];

const dataUrl = (p) => 'data:image/png;base64,' + readFileSync(p).toString('base64');
const MO = dataUrl(`${PACK}/Modern_Office_32x32.png`);
const RB = dataUrl(`${PACK}/1_Room_Builder_Office/Room_Builder_Office_32x32.png`);

const html = `<!doctype html><canvas id=c></canvas><script>
function load(s){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=s;});}
(async()=>{const mo=await load(window.__MO),rb=await load(window.__RB),sheets={mo,rb},FR=window.__FRAMES,PAD=1;
let x=PAD,y=PAD,rowH=0;const placed={};
for(const f of FR){const[,,,sw,sh]=f.rect;if(x+sw+PAD>512){x=PAD;y+=rowH+PAD;rowH=0;}placed[f.name]={x,y,w:sw,h:sh};x+=sw+PAD;rowH=Math.max(rowH,sh);}
const H=y+rowH+PAD,c=document.getElementById('c');c.width=512;c.height=H;
const g=c.getContext('2d');g.imageSmoothingEnabled=false;
for(const f of FR){const[s,sx,sy,sw,sh]=f.rect;const p=placed[f.name];g.drawImage(sheets[s],sx,sy,sw,sh,p.x,p.y,sw,sh);}
window.__OUT={png:c.toDataURL('image/png'),frames:placed,w:512,h:H};})();
</script>`;

const b = await chromium.launch();
const p = await b.newPage();
await p.addInitScript((d) => { window.__FRAMES = d.fr; window.__MO = d.mo; window.__RB = d.rb; }, { fr: FRAMES, mo: MO, rb: RB });
await p.setContent(html);
await p.waitForFunction('window.__OUT');
const out = await p.evaluate(() => window.__OUT);
await b.close();

const here = new URL('.', import.meta.url).pathname;
writeFileSync(`${here}../src/pixel/pack/office-atlas.png`, Buffer.from(out.png.split(',')[1], 'base64'));
const frames = Object.fromEntries(Object.entries(out.frames).map(([k, v]) => [k, [v.x, v.y, v.w, v.h]]));
writeFileSync(`${here}../src/pixel/pack/atlas.ts`,
  `// Generated atlas of LimeZu "Modern Office" tiles (only what we render).\n` +
  `// Art © LimeZu — commercial use OK, redistribution of the full pack is not,\n` +
  `// so we ship just these slices. Regenerate with web/scripts/gen-atlas.mjs.\n` +
  `export const ATLAS = { w: ${out.w}, h: ${out.h} };\n` +
  `export const FRAMES: Record<string, [number, number, number, number]> = ${JSON.stringify(frames, null, 2)};\n`);
console.log('wrote atlas', out.w + 'x' + out.h, Object.keys(frames).length, 'frames');
