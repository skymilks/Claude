// Hand-rolled pixel art: each sprite is a grid of palette keys ('.' = clear).
// Rendered to <canvas> and scaled with image-rendering: pixelated — no image
// assets, Kairosoft-ish on purpose.

export type SpriteDef = { grid: string[]; palette: Record<string, string> };

const SHARED = {
  S: '#f0c8a0', // skin
  E: '#26262c', // eyes
  L: '#5b6770', // legs
  K: '#3a2c20', // shoes
  G: '#2b2b31', // glasses
  W: '#f4f4f0', // white
};

type PersonOpts = {
  hair: string;
  shirt: string;
  accent: string;
  glasses?: boolean;
  headset?: boolean;
  tie?: boolean;
  suit?: boolean;
};

const ROLE_LOOKS: Record<string, PersonOpts> = {
  sales: { hair: '#8a4b2d', shirt: '#3f7fc1', accent: '#e8b13c', headset: true },
  pm: { hair: '#33333b', shirt: '#4caf6e', accent: '#d95252', tie: true },
  researcher: { hair: '#c4683f', shirt: '#9b6dc7', accent: '#7a5230', glasses: true },
  ceo: { hair: '#9aa0a6', shirt: '#34343c', accent: '#b03a3a', suit: true },
};

function personFrames(opts: PersonOpts): [string[], string[]] {
  const eyeRow = opts.glasses ? '..GEGSSGEG..' : '..SESSSSES..';
  const head = [
    '....HHHH....',
    '..HHHHHHHH..',
    '..HHHHHHHH..',
    '..HSSSSSSH..',
    opts.headset ? '.ASSSSSSSSA.' : '..SSSSSSSS..',
    opts.headset ? '.A' + eyeRow.slice(2, 10) + 'A.' : eyeRow,
    opts.headset ? '.ASSSSSSSS..' : '..SSSSSSSS..',
    '...SSSSSS...',
  ];
  const dressed = opts.tie || opts.suit;
  const collar = opts.suit ? '....BWWB....' : '....BBBB....';
  const chest = dressed ? '..BBBAABBB..' : '..BBBBBBBB..';
  const armsDown = [collar, chest, dressed ? '.SBBBAABBBS.' : '.SBBBBBBBBS.', '.SBBBBBBBBS.', '..BBBBBBBB..'];
  const armsUp = [collar, '.S' + chest.slice(2, 10) + 'S.', '..BBBBBBBB..', '..BBBBBBBB..', '..BBBBBBBB..'];
  const legs = ['...LL..LL...', '...LL..LL...', '..KK....KK..'];

  return [
    [...head, ...armsDown, ...legs],
    [...head, ...armsUp, ...legs],
  ];
}

export function character(role: string, frame: 0 | 1): SpriteDef {
  const opts = ROLE_LOOKS[role] ?? ROLE_LOOKS.sales;
  return {
    grid: personFrames(opts)[frame],
    palette: { ...SHARED, H: opts.hair, B: opts.shirt, A: opts.accent },
  };
}

export function desk(working: boolean): SpriteDef {
  return {
    grid: [
      '........MMMMMMMM........',
      '........MCCCCCCM........',
      '........MCCCCCCM........',
      '........MMMMMMMM........',
      '...........MM..........',
      'TTTTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTT',
      'FFFFFFFFFFFFFFFFFFFFFFFF',
      'FFFFFFFFFFFFFFFFFFFFFFFF',
      'FFF..................FFF',
      'FFF..................FFF',
    ],
    palette: {
      M: '#2b2b31',
      C: working ? '#7fd4ff' : '#3a4350',
      T: '#c09a6b',
      F: '#8a653f',
    },
  };
}

export const PLANT: SpriteDef = {
  grid: [
    '...GG.GG..',
    '..GGGGGG..',
    '.GGGGGGGG.',
    '.GGGGGGGG.',
    '..GGGGGG..',
    '....GG....',
    '...PPPP...',
    '..PPPPPP..',
    '..PPPPPP..',
    '...PPPP...',
  ],
  palette: { G: '#4e9e58', P: '#b06a43' },
};

export const COFFEE: SpriteDef = {
  grid: [
    '.BBBBBBBBB..',
    '.BWWWWWWWB..',
    '.BBBBBBBBB..',
    '.BBRBBBBBB..',
    '.BBBBBBBBB..',
    '.BB.....BB..',
    '.BB.CCC.BB..',
    '.BB.CCC.BB..',
    '.BBBBBBBBB..',
    '.BBBBBBBBB..',
  ],
  palette: { B: '#3a3a42', W: '#cfd6dd', R: '#e25555', C: '#f4f4f0' },
};

export const DOG: SpriteDef = {
  grid: [
    '.TT......TT.',
    '.TTTTTTTTTT.',
    '.TTECCCCETT.',
    '.TCCCNNCCCT.',
    '.TCCCCCCCCT.',
    '..CC....CC..',
    '..KK....KK..',
  ],
  palette: { T: '#d49a5a', C: '#f3e3c8', E: '#26262c', N: '#26262c', K: '#b07f47' },
};
