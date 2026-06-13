// Hand-rolled pixel art rendered to <canvas> at image-rendering: pixelated —
// no image assets. Warm, shaded, outlined "cozy office" look: every sprite has
// a dark outline and at least two tones per material so it reads as a place,
// not a diagram.

export type SpriteDef = { grid: string[]; palette: Record<string, string> };

const OUTLINE = '#2a1d12';

// --- characters ------------------------------------------------------------
// character(role, frame): frame 0 = idle (arms at sides), 1 = active (hands up,
// "typing") — the office alternates frames while an agent is working.
//  O outline · H hair · h hair-hi · S skin · d skin-shadow · E eye · R brow
//  B sweater · b sweater-shadow · c accent · W shirt-white · P pants · p pants-shadow
//  K shoes · G glasses · A headset
const HEAD = [
  '.....OOOOOO.....',
  '...OOHHHHHHOO...',
  '..OHHhhhHHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OHSSSSSSSSHO..',
  '..OSSSSSSSSSSO..',
  '..OSSRSSSSRSSO..',
  '..OSSESSSSESSO..',
  '..OSSSSSSSSSSO..',
  '..OSdSSooSSdSO..',
  '...OSSSSSSSSO...',
  '....OOSSSSOO....',
];
const COLLAR = '.....OcccO.....';
const TORSO_IDLE = [
  '...OOBBBBBBOO...',
  '..OBbBBBBBBbBO..',
  '.OBbBBBBBBBBbBO.',
  '.OBbBBBBBBBBbBO.',
  '.OBbBBBBBBBBbBO.',
  '.OSdBBBBBBBBdSO.',
  '.OSSOBBBBBBOSSO.',
  '..OOOBBBBBBOOO..',
];
const TORSO_TYPE = [
  '...OOBBBBBBOO...',
  '.OSdBBBBBBBBdSO.',
  '.OSSBBBBBBBBSSO.',
  '.OBbBBBBBBBBbBO.',
  '.OBbBBBBBBBBbBO.',
  '.OBbBBBBBBBBbBO.',
  '..OBBBBBBBBBBO..',
  '..OOOBBBBBBOOO..',
];
type Look = {
  H: string; h: string; B: string; b: string; c: string; P: string; p: string;
  glasses?: boolean; headset?: boolean; tie?: boolean; suit?: boolean;
};
const ROLE_LOOKS: Record<string, Look> = {
  sales:      { H: '#7a4a2b', h: '#9c6a3f', B: '#c8702f', b: '#a85a22', c: '#d8762f', P: '#3a567a', p: '#2c4360', headset: true },
  pm:         { H: '#2c2c33', h: '#45454f', B: '#4f8d63', b: '#3d7050', c: '#d24e4e', P: '#4a4a52', p: '#37373d', tie: true },
  researcher: { H: '#b9633a', h: '#d2855a', B: '#7d63b0', b: '#634d8e', c: '#7d63b0', P: '#5a4632', p: '#43341f', glasses: true },
  ceo:        { H: '#9aa0a6', h: '#bcc0c4', B: '#34343e', b: '#28282f', c: '#b23a3a', P: '#2c2c34', p: '#212127', suit: true },
};

// Walk cycle legs — used only by standing(), for the greeter who walks in.
const LEGS_A = [
  '....OPPPPPPO....',
  '....OPppppPO....',
  '....OPP..PPO....',
  '....OPP..PPO....',
  '...OKKKO.OKKKO..',
];
const LEGS_B = [
  '....OPPPPPPO....',
  '....OPppppPO....',
  '....OPP..PPO....',
  '...OPP....PPO...',
  '..OKKKO..OKKKO..',
];

// Standing, with legs and a two-frame walk — for the demo greeter who walks
// across the office to welcome the prospect. (Desks use the seated character.)
export function standing(role: string, frame: 0 | 1 = 0): SpriteDef {
  const r = ROLE_LOOKS[role] ?? ROLE_LOOKS.sales;
  const rows = [...HEAD, COLLAR, ...(frame ? TORSO_TYPE : TORSO_IDLE), ...(frame ? LEGS_B : LEGS_A)];
  const grid = applyLook(rows, r);
  return { grid, palette: facePalette(r) };
}

// Overlay role accessories (glasses, headset, tie, suit) onto a head+torso.
function applyLook(rows: string[], r: Look): string[] {
  return rows.map((row, y) => {
    let s = row;
    if (r.glasses && y === 7) s = '..OSSGSSSSGSSO..';
    if (r.headset && (y === 6 || y === 7)) s = '..A' + s.slice(3, 13) + 'A..';
    if (r.headset && y === 1) s = '...AAHHHHHHAA...';
    if (r.tie && y >= 13 && y <= 17) s = s.slice(0, 7) + 'cc' + s.slice(9);
    if (r.suit && y === 12) s = '.....OWWWO.....';
    if (r.suit && (y === 13 || y === 14)) s = s.slice(0, 7) + 'WW' + s.slice(9);
    if (r.suit && y >= 15 && y <= 17) s = s.slice(0, 7) + 'cc' + s.slice(9);
    return s;
  });
}
const facePalette = (r: Look): Record<string, string> => ({
  O: OUTLINE, H: r.H, h: r.h, S: '#f1c9a4', d: '#d6a079', E: '#3a2a1c', R: '#caa07c',
  o: '#c9926c', B: r.B, b: r.b, c: r.c, W: '#eef0f2', P: r.P, p: r.p,
  K: '#2f2218', G: '#46505a', A: '#34343b',
});

// Seated at a desk (no legs — the desk covers the lower body), matching a
// real office. Used both at desks and, small, as the modal/avatar bust.
export function character(role: string, frame: 0 | 1 = 0): SpriteDef {
  const r = ROLE_LOOKS[role] ?? ROLE_LOOKS.sales;
  const rows = [...HEAD, COLLAR, ...(frame ? TORSO_TYPE : TORSO_IDLE)];
  return { grid: applyLook(rows, r), palette: facePalette(r) };
}

// The back of a seated agent — the head is all hair, the torso is the sweater
// back. Used for the desks where the worker faces their screen (away from us),
// so the monitor's front is what the camera sees.
const HEAD_BACK = [
  '.....OOOOOO.....',
  '...OOHHHHHHOO...',
  '..OHHhhhhHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OHHHHHHHHHHO..',
  '...OHHHHHHHHO...',
  '....OOSSSSOO....',
];
const TORSO_BACK_IDLE = [
  '...OOBBBBBBOO...',
  '..OBbBBBBBBbBO..',
  '.OBbBBBBBBBBbBO.',
  '.OBbBBBBBBBBbBO.',
  '.OBbBBBBBBBBbBO.',
  '.OSdBBBBBBBBdSO.',
  '.OSSBBBBBBBBSSO.',
  '..OOOBBBBBBOOO..',
];
const TORSO_BACK_TYPE = [
  '...OOBBBBBBOO...',
  '.OSdBBBBBBBBdSO.',
  '.OSSBBBBBBBBSSO.',
  '.OBbBBBBBBBBbBO.',
  '.OBbBBBBBBBBbBO.',
  '.OBbBBBBBBBBbBO.',
  '..OBBBBBBBBBBO..',
  '..OOOBBBBBBOOO..',
];
export function characterBack(role: string, frame: 0 | 1 = 0): SpriteDef {
  const r = ROLE_LOOKS[role] ?? ROLE_LOOKS.sales;
  const rows = [...HEAD_BACK, COLLAR, ...(frame ? TORSO_BACK_TYPE : TORSO_BACK_IDLE)];
  // only the suit collar reads from behind; skip face-side accessories
  const grid = rows.map((row, y) => (r.suit && y === 12 ? '.....OWWWO.....' : row));
  return { grid, palette: facePalette(r) };
}

// --- desk: deep wood desk built programmatically (46x40) with an iMac, a
// keyboard/mouse, a mug, a notepad+pen, and a side drawer unit. The screen
// lights up cyan while the agent is working; the seated character sits behind.
export function desk(working: boolean): SpriteDef {
  const W = 46, H = 40;
  const g: string[][] = Array.from({ length: H }, () => Array(W).fill('.'));
  const put = (y: number, x: number, s: string) => { for (let i = 0; i < s.length; i++) if (s[i] !== ' ') g[y][x + i] = s[i]; };
  const fill = (y0: number, y1: number, x0: number, x1: number, ch: string) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch; };

  // iMac monitor
  const scr = (working ? 'S' : 's').repeat(14);
  put(1, 3, 'oMMMMMMMMMMMMMMMMo');
  for (let y = 2; y <= 8; y++) put(y, 3, 'oM' + scr + 'Mo');
  put(9, 3, 'oMmmmmmmmmmmmmmMo');
  put(10, 3, 'ooMMMMMMMMMMMMMMoo');
  put(11, 10, 'oNNo'); put(12, 9, 'oNNNNo'); put(13, 8, 'oNNNNNNo');

  // desk top
  put(14, 0, 'o' + 'e'.repeat(44) + 'o');
  for (let y = 15; y <= 23; y++) put(y, 0, 'o' + 'w'.repeat(44) + 'o');
  put(24, 0, 'o' + 't'.repeat(44) + 'o');
  for (const [y, x] of [[16, 8], [19, 14], [21, 6], [17, 33], [22, 39], [20, 25]]) put(y, x, 'gg');
  put(14, 7, 'NNNNNNNNNNNN');
  // keyboard + mouse
  put(17, 24, 'oooooooooooooo'); put(18, 24, 'okKkKkKkKkKkKo'); put(19, 24, 'oooooooooooooo');
  put(18, 40, 'PP'); put(19, 40, 'PP');
  // mug
  put(15, 40, 'oUUo'); put(16, 40, 'oUUoo'); put(17, 40, 'ouUo');
  // notepad + pen
  put(21, 25, 'ooooooo'); put(22, 25, 'oPPPPPo'); put(23, 25, 'ooooooo'); put(22, 34, 'pppp');

  // front face + drawer unit
  for (let y = 25; y <= 34; y++) put(y, 0, 'o' + 'v'.repeat(44) + 'o');
  put(25, 1, 'e'.repeat(44));
  fill(25, 25, 28, 44, 'o');
  for (let y = 26; y <= 37; y++) { g[y][28] = 'o'; g[y][44] = 'o'; }
  fill(26, 30, 29, 43, 'D'); put(28, 35, 'dd');
  fill(31, 31, 29, 43, 'o'); fill(32, 36, 29, 43, 'D'); put(34, 35, 'dd');
  fill(37, 37, 29, 43, 'o'); put(38, 29, 'oo'); put(38, 42, 'oo');
  for (let y = 35; y <= 38; y++) put(y, 4, 'ovvo'); put(38, 4, 'oooo');

  return {
    grid: g.map((r) => r.join('')),
    palette: {
      o: OUTLINE, M: '#cfd3d8', m: '#9aa0a8', s: '#3a4a52', S: '#8fe3ff', N: '#b9bdc4',
      e: '#d8ab72', w: '#c49058', t: '#a87a48', g: '#b08350',
      v: '#8a5f38', D: '#9a6b40', d: '#3a2c20',
      K: '#c9ccd1', k: '#7e8189', U: '#d7693f', u: '#b4502c', P: '#eef0f2', p: '#3f6fa8',
    },
  };
}

// Office chair — drawn behind the seated character.
export const CHAIR: SpriteDef = {
  grid: [
    '..oooooooooooooooo..',
    '.oCCccccccccccccCCo.',
    '.oCCCCCCCCCCCCCCCCo.',
    '.oCCCCCCCCCCCCCCCCo.',
    '.oCCCCCCCCCCCCCCCCo.',
    '.oCCCCCCCCCCCCCCCCo.',
    '.oCCCCCCCCCCCCCCCCo.',
    'ooCCCCCCCCCCCCCCCCoo',
    'oCCoCCCCCCCCCCCCoCCo',
    'oCCoCCCCCCCCCCCCoCCo',
    'ooooCCCCCCCCCCCCoooo',
    '...oCCCCCCCCCCCCo...',
  ],
  palette: { o: OUTLINE, C: '#41444b', c: '#5a5e66' },
};

// Accent armchair (cozy decor).
export const ARMCHAIR: SpriteDef = {
  grid: [
    '...oooooooooooo...',
    '..oAAaaaaaaaaAAo..',
    '..oAAAAAAAAAAAAo..',
    '..oAAAAAAAAAAAAo..',
    '..oAAAAAAAAAAAAo..',
    '.ooAAAAAAAAAAAAoo.',
    'oAAooaaaaaaaaooAAo',
    'oAAoAAAAAAAAAAoAAo',
    'oAAoAAAAAAAAAAoAAo',
    'oAAooooooooooooAAo',
    'oAAAAAAAAAAAAAAAAo',
    '.oooooooooooooooo.',
    '..oKKo........oKKo',
  ],
  palette: { o: OUTLINE, A: '#c98a3e', a: '#e0a655', K: '#5a3d24' },
};

// Cozy area rug.
export const RUG: SpriteDef = {
  grid: [
    'oRRRRRRRRRRRRRRRRo',
    'oRppppppppppppppRo',
    'oRpAAAAAAAAAAAApRo',
    'oRpAaaaaaaaaaAApRo',
    'oRpAaAAAAAAAaAApRo',
    'oRpAaAAAAAAAaAApRo',
    'oRpAaaaaaaaaaAApRo',
    'oRpAAAAAAAAAAAApRo',
    'oRppppppppppppppRo',
    'oRRRRRRRRRRRRRRRRo',
  ],
  palette: { o: '#7a3f3f', R: '#a85a5a', p: '#c47b6b', A: '#b86a55', a: '#cf9270' },
};

// --- props -----------------------------------------------------------------
// Big leafy monstera in a terracotta pot (the cozy corner plant).
export const PLANT: SpriteDef = {
  grid: [
    '....oo....oo....',
    '...oLLo..oLLo...',
    '..oLLDLooLDLLo..',
    '.oLLDLLllLLDLLo.',
    'oLLLDLLllLLDLLLo',
    'oLLLLDLllLDLLLLo',
    '.oLLLLDllDLLLLo.',
    '..oLLLDllDLLLo..',
    '...oLLDllDLLo...',
    '....ooDllDoo....',
    '......oLLo......',
    '......oLLo......',
    '.....oTTTTo.....',
    '....oTTTTTTo....',
    '....oTrrrrTo....',
    '....oTrrrrTo....',
    '....oTTTTTTo....',
    '.....ooooo.....',
  ],
  palette: { o: OUTLINE, L: '#4f9e57', l: '#67c06f', D: '#3a7a42', T: '#c06a3f', r: '#9a4f2c' },
};

// Small succulent in a terracotta pot — sits on a shelf/desk.
export const SUCCULENT: SpriteDef = {
  grid: [
    '..o..o..o..',
    '.oLooLooLo.',
    'oLLoLLoLLLo',
    'oLLLllLLLLo',
    '.oLLllLLLo.',
    '..ooTTToo..',
    '..oTTTTTo..',
    '..oTrrrTo..',
    '..oTTTTTo..',
    '...ooooo...',
  ],
  palette: { o: OUTLINE, L: '#5aa863', l: '#76c47e', T: '#c06a3f', r: '#9a4f2c' },
};

// Bookshelf with colorful books, on the back wall.
export const SHELF: SpriteDef = {
  grid: [
    'oooooooooooooo',
    'oWWWWWWWWWWWWo',
    'oaobocodoeofgo',
    'oaobocodoeofgo',
    'oWWWWWWWWWWWWo',
    'ohoiojokoaobo',
    'ohoiojokoaobo',
    'oWWWWWWWWWWWWo',
    'ocodopoqorobo',
    'ocodopoqorobo',
    'oWWWWWWWWWWWWo',
    'oBBBBBBBBBBBBo',
    'oBBBBBBBBBBBBo',
    'oooooooooooooo',
  ],
  palette: {
    o: OUTLINE, W: '#9a6b3f', B: '#5a3d24',
    a: '#c0573f', b: '#3f6fa8', c: '#d8a23d', d: '#4f8d63', e: '#7d63b0',
    f: '#c86fa0', g: '#5aa0a8', h: '#b8503f', i: '#d8853d', j: '#4f7d9e',
    k: '#6fa85a', p: '#a85a8f', q: '#3f8d8a', r: '#c0954f',
  },
};

// Warm floor lamp with a glowing shade.
export const LAMP: SpriteDef = {
  grid: [
    '...gggg...',
    '..gGGGGg..',
    '.gGGGGGGg.',
    '.gGGGGGGg.',
    '..oWWWWo..',
    '....oo....',
    '....SS....',
    '....SS....',
    '....SS....',
    '....SS....',
    '...oSSo...',
    '..oSSSSo..',
    '.oOOOOOOo.',
  ],
  palette: { o: OUTLINE, O: '#3a2c20', g: '#f6e6b8', G: '#ffd87a', W: '#e8c562', S: '#6b5236' },
};

// Coffee machine (cosmetic).
export const COFFEE: SpriteDef = {
  grid: [
    '.oooooooo.',
    'oBBBBBBBBo',
    'oBWWWWWWBo',
    'oBWrrrrWBo',
    'oBBBBBBBBo',
    'oBB.RR.BBo',
    'oBB.cc.BBo',
    'oBB.cc.BBo',
    'oBBBBBBBBo',
    '.oBBBBBBo.',
    '.oooooooo.',
  ],
  palette: { o: OUTLINE, B: '#3a3a42', W: '#cfd6dd', r: '#5a6b7a', R: '#e25555', c: '#caa06a' },
};

// Office dog (cosmetic).
export const DOG: SpriteDef = {
  grid: [
    '.oo......oo.',
    'oEEo....oEEo',
    'oEEooooooEEo',
    'oTTTTTTTTTTo',
    'oTNNTTTTNNTo',
    'oTTTTooTTTTo',
    'oTTToggoTTTo',
    '.oTTTTTTTTo.',
    '..oo....oo..',
    '..KK....KK..',
  ],
  palette: { o: OUTLINE, T: '#d3a05f', E: '#a8743c', N: '#2a1d12', g: '#2a1d12', K: '#b07f47' },
};
