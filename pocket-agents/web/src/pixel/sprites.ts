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
const LEGS = [
  '....OPPPPPPO....',
  '....OPppppPO....',
  '....OPP..PPO....',
  '....OPP..PPO....',
  '...OKKKO.OKKKO..',
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

export function character(role: string, frame: 0 | 1 = 0): SpriteDef {
  const r = ROLE_LOOKS[role] ?? ROLE_LOOKS.sales;
  const rows = [...HEAD, COLLAR, ...(frame ? TORSO_TYPE : TORSO_IDLE), ...LEGS];
  const grid = rows.map((row, y) => {
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
  return {
    grid,
    palette: {
      O: OUTLINE, H: r.H, h: r.h, S: '#f1c9a4', d: '#d6a079', E: '#3a2a1c', R: '#caa07c',
      o: '#c9926c', B: r.B, b: r.b, c: r.c, W: '#eef0f2', P: r.P, p: r.p,
      K: '#2f2218', G: '#46505a', A: '#34343b',
    },
  };
}

// --- desk: wood table with an iMac-style monitor, keyboard, mug, drawer ------
// The screen lights up cyan while the agent is working.
export function desk(working: boolean): SpriteDef {
  const sc = working ? 'S' : 's';
  return {
    grid: [
      '..............oooooooo..............',
      '............ooMMMMMMMMoo............',
      '...........oM' + sc.repeat(8) + 'Mo...........',
      '...........oM' + sc.repeat(8) + 'Mo...........',
      '...........oM' + sc.repeat(8) + 'Mo...........',
      '...........oM' + sc.repeat(8) + 'Mo...........',
      '...........oMmmmmmmmMo...........',
      '............ooMMMMoo............',
      '..............oNNo..............',
      '.............oNNNNo.............',
      '............ooooooooo...........',
      '......oo...PPPP....UU...oo......',
      '....ooKKKKKKKKKo..oUUUo..oo.....',
      '...oKkKkKkKkKkKo..oUUUo.oPPo....',
      '..owwwwwwwwwwwwwwwwwwwwwwwwwwo..',
      '.oweeeeeeeeeeeeeeeeeeeeeeeeeewo.',
      '.ovvvvvvvvvvvvvvvvvvvvvvvvvvvvo.',
      '.ovvggvvvvvvggvvvvvvvvggvvvvvvo.',
      '.ovvvvvvvvvvvvvvvvvvDDvvvvvvvvo.',
      '.ovvvvvvvvvvvvvvvvvvDDvvvvvvvvo.',
      '.ovvvvvvvvvvvvvvvvvvvvvvvvvvvvo.',
      '.oovvvvvvoovvvvvvvvoovvvvvvvoo.',
      '..oo....oo........oo......oo...',
      '..........................oo..',
    ],
    palette: {
      o: OUTLINE, M: '#cfd3d8', m: '#9aa0a8', s: '#3a4a52', S: '#8fe3ff',
      N: '#b9bdc4', w: '#b07f4e', e: '#caa06a', v: '#8a5f38', g: '#7a5230',
      K: '#c9ccd1', k: '#7e8189', U: '#d7693f', u: '#b4502c', P: '#eef0f2', D: '#3a2c20',
    },
  };
}

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
