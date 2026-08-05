import type { Direction } from "../types";
import { bakeSprite, flipGridX, scaleGrid2x, type PixelGrid } from "./PixelArt";

// Robot palette
const K = "#6A7480";
const B = "#B0B8C0";
const M = "#D0D6DC";
const D = "#0A0810";
const L = "#3DFFB5";
const A = "#F0B429";
const V = "#152028";
const G = "#1ECF8A";

/** Parse fixed-width art (`.` = empty). Every row must be the same length. */
function art(rows: string[], map: Record<string, string>): PixelGrid {
  const w = rows[0]?.length ?? 0;
  return rows.map((row) => {
    if (row.length !== w) {
      throw new Error(`Art row length ${row.length} !== ${w}: ${row}`);
    }
    return Array.from(row, (ch) => (ch === "." ? null : (map[ch] ?? null)));
  });
}

const RMAP: Record<string, string> = { K, B, M, D, L, A, V, G };

function robotLegs(step: 0 | 1): string[] {
  return step === 0
    ? [
        "..........KKKK......KKKK......",
        "..........KKKK......KKKK......",
        "..........DDDD......DDDD......",
        "..........DDDD......DDDD......",
      ]
    : [
        "......KKKK..............KKKK..",
        "......KKKK..............KKKK..",
        "......DDDD..............DDDD..",
        "......DDDD..............DDDD..",
      ];
}

function trim28(rows: string[]): string[] {
  return rows.map((r) => r.slice(0, 28));
}

function robotRight(step: 0 | 1): PixelGrid {
  return art(
    trim28([
      "..............AA..............",
      "..............AA..............",
      "............KKMMKK............",
      "............KMMMMK............",
      "............KVLLVK............",
      "............KVLLVK............",
      "............KMMMMK............",
      "............KMMMMK............",
      ".............KKKK.............",
      ".............KKKK.............",
      "..........KKMBBBBMKK..........",
      "..........KMBBBBBBMK..........",
      "..........KMBBAABBMK..........",
      "..........KMBBAABBMK..........",
      "..........KMBBBBBBMK..........",
      "..........KKMBBBBMKK..........",
      "...........KKBBBBKK...........",
      "...........KKBBBBKK...........",
      "...........KKBBBBKK...........",
      "...........KKBBBBKK...........",
      "..........KKKK..KKKK..........",
      "..........KKKK..KKKK..........",
      ...robotLegs(step),
      "..............................",
      "..............................",
    ]),
    RMAP,
  );
}

function robotUp(step: 0 | 1): PixelGrid {
  return art(
    trim28([
      "..............AA..............",
      "..............AA..............",
      "............KKMMKK............",
      "............KMMMMK............",
      "............KVVVVK............",
      "............KVVVVK............",
      "............KMMMMK............",
      "............KMMMMK............",
      ".............KKKK.............",
      ".............KKKK.............",
      "..........KKMBBBBMKK..........",
      "..........KMBBBBBBMK..........",
      "..........KMBBAABBMK..........",
      "..........KMBBAABBMK..........",
      "..........KMBBBBBBMK..........",
      "..........KKMBBBBMKK..........",
      "...........KKBBBBKK...........",
      "...........KKBBBBKK...........",
      "...........KKBBBBKK...........",
      "...........KKBBBBKK...........",
      "..........KKKK..KKKK..........",
      "..........KKKK..KKKK..........",
      ...robotLegs(step),
      "..............................",
      "..............................",
    ]),
    RMAP,
  );
}

function robotDown(step: 0 | 1): PixelGrid {
  return art(
    trim28([
      "..............AA..............",
      "..............AA..............",
      "............KKMMKK............",
      "............KMMMMK............",
      "............KMLDLMK...........",
      "............KMGLGLK...........",
      "............KMMMMK............",
      "............KMMMMK............",
      ".............KKKK.............",
      ".............KKKK.............",
      "..........KKMBBBBMKK..........",
      "..........KMBBBBBBMK..........",
      "..........KMBBAABBMK..........",
      "..........KMBBAABBMK..........",
      "..........KMBBBBBBMK..........",
      "..........KKMBBBBMKK..........",
      "...........KKBBBBKK...........",
      "...........KKBBBBKK...........",
      "...........KKBBBBKK...........",
      "...........KKBBBBKK...........",
      "..........KKKK..KKKK..........",
      "..........KKKK..KKKK..........",
      ...robotLegs(step),
      "..............................",
      "..............................",
    ]),
    RMAP,
  );
}

export type PlayerSpriteSet = {
  right: HTMLCanvasElement[];
  left: HTMLCanvasElement[];
  up: HTMLCanvasElement[];
  down: HTMLCanvasElement[];
};

export function createPlayerSprites(): PlayerSpriteSet {
  const right = [bakeSprite(robotRight(0)), bakeSprite(robotRight(1))];
  const left = [bakeSprite(flipGridX(robotRight(0))), bakeSprite(flipGridX(robotRight(1)))];
  const up = [bakeSprite(robotUp(0)), bakeSprite(robotUp(1))];
  const down = [bakeSprite(robotDown(0)), bakeSprite(robotDown(1))];
  return { right, left, up, down };
}

export function playerSpriteFor(
  sprites: PlayerSpriteSet,
  direction: Direction,
  frameIndex: number,
): HTMLCanvasElement {
  const frames =
    direction === "left"
      ? sprites.left
      : direction === "up"
        ? sprites.up
        : direction === "down"
          ? sprites.down
          : sprites.right;
  return frames[frameIndex % frames.length]!;
}

// --- Humans (28×28) ---

export type GhostPalette = {
  body: string;
  skirt: string;
  eyeWhite?: string;
  pupil?: string;
  hair?: string;
  skin?: string;
};

const SKIN = "#E8B896";
const SKIN_D = "#C48A62";
const EYE_W = "#FFF8F0";
const PUPIL = "#0A0810";

function humanFrame(palette: GhostPalette, stepAlt: boolean, lookX: number): PixelGrid {
  const C = palette.body;
  const H = palette.hair ?? palette.skirt;
  const SK = palette.skin ?? SKIN;
  const SD = SKIN_D;
  const EW = palette.eyeWhite ?? EYE_W;
  const PU = palette.pupil ?? PUPIL;
  const Cd = palette.skirt;

  const map: Record<string, string> = {
    H,
    S: SK,
    d: SD,
    C,
    c: Cd,
    E: EW,
    P: PU,
    X: D,
  };

  const pupils = lookX < 0 ? "PEEE" : lookX > 0 ? "EEEP" : "EPEP";

  const legs = stepAlt
    ? [
        "......CCCC..........CCCC......",
        "......CCCC..........CCCC......",
        "......XXXX..........XXXX......",
        "......XXXX..........XXXX......",
      ]
    : [
        "..........CCCC..CCCC..........",
        "..........CCCC..CCCC..........",
        "..........XXXX..XXXX..........",
        "..........XXXX..XXXX..........",
      ];

  return art(
    trim28([
      "............HHHHHH............",
      "...........HHHHHHHH...........",
      "..........HHHHHHHHHH..........",
      "..........SSSSSSSSSS..........",
      "..........SSSSSSSSSS..........",
      "..........SSEEEESS..........",
      "..........SS" + pupils + "SS..........",
      "..........SSddddSS..........",
      "..........SSSSSSSSSS..........",
      "...........SSSSSSSS...........",
      "...........SSSSSSSS...........",
      "..........CCCCCCCCCC..........",
      ".........CCCCCCCCCCCC.........",
      ".........CCCCccccCCCC.........",
      ".........CCCCCCCCCCCC.........",
      "..........CCCCCCCCCC..........",
      "..........CCCCCCCCCC..........",
      "...........CCCCCCCC...........",
      "...........CCCCCCCC...........",
      "............CCCCCC............",
      "............CCCCCC............",
      ...legs,
      "..............................",
      "..............................",
      "..............................",
    ]),
    map,
  );
}

export const GHOST_PALETTES: GhostPalette[] = [
  { body: "#E24A4A", skirt: "#8B3A2A", hair: "#3A2218" },
  { body: "#E28A3A", skirt: "#C45A20", hair: "#5A3A18" },
  { body: "#3A9EBF", skirt: "#1E6A88", hair: "#1A2830" },
  { body: "#D45A9A", skirt: "#8A3068", hair: "#4A2038" },
];

export function createGhostSprites(palette: GhostPalette): HTMLCanvasElement[] {
  return [
    bakeSprite(humanFrame(palette, false, 0)),
    bakeSprite(humanFrame(palette, true, 0)),
    bakeSprite(humanFrame(palette, false, -1)),
    bakeSprite(humanFrame(palette, true, -1)),
    bakeSprite(humanFrame(palette, false, 1)),
    bakeSprite(humanFrame(palette, true, 1)),
  ];
}

export function ghostSpriteFor(
  frames: HTMLCanvasElement[],
  animFrame: number,
  direction: Direction,
): HTMLCanvasElement {
  const step = animFrame % 2;
  const look = direction === "left" ? 1 : direction === "right" ? 2 : 0;
  const base = look * 2;
  return frames[base + step]!;
}

function bake2x(grid: PixelGrid): HTMLCanvasElement {
  return bakeSprite(scaleGrid2x(grid));
}

export function createDotSprite(): HTMLCanvasElement {
  const A = "#F0D878";
  const B = "#FFF6C8";
  return bake2x([
    [null, A, A, null],
    [A, B, A, A],
    [A, A, A, A],
    [null, A, A, null],
  ]);
}

/** Wall fill — matches mid pipe shade so tile seams vanish. */
export const WALL_FILL = "#6A8AB0";
export const FLOOR_VOID = "#0A0C12";

/** Industrial plating: dark deck with rivets and a faint inner frame. */
export function createFloorPattern(): HTMLCanvasElement {
  const F = FLOOR_VOID;
  const A = "#0E1218";
  const B = "#12161E";
  const R = "#1A2230";
  const grid: PixelGrid = Array.from({ length: 32 }, (_, y) =>
    Array.from({ length: 32 }, (_, x) => {
      // Soft checker underlay
      let c = (x + y) % 2 === 0 ? F : A;
      // Inner plate frame
      if (x === 1 || y === 1 || x === 30 || y === 30) c = B;
      if (x === 0 || y === 0 || x === 31 || y === 31) c = F;
      // Corner rivets
      if (
        (x === 3 && y === 3) ||
        (x === 28 && y === 3) ||
        (x === 3 && y === 28) ||
        (x === 28 && y === 28)
      ) {
        c = R;
      }
      return c;
    }),
  );
  return bakeSprite(grid);
}

/** Wall mass with faint rivet texture so pipes sit on metal, not flat paint. */
export function createWallPattern(): HTMLCanvasElement {
  const W = WALL_FILL;
  const D = "#5A7A9E";
  const L = "#7A9AC0";
  const grid: PixelGrid = Array.from({ length: 32 }, (_, y) =>
    Array.from({ length: 32 }, (_, x) => {
      let c = W;
      if ((x + y * 3) % 11 === 0) c = D;
      if (x % 8 === 4 && y % 8 === 4) c = L;
      return c;
    }),
  );
  return bakeSprite(grid);
}

export function createExitSprite(frame: number): HTMLCanvasElement {
  const A = frame % 2 === 0 ? "#3DFFB5" : "#1ECF8A";
  const B = frame % 2 === 0 ? "#1ECF8A" : "#3DFFB5";
  return bake2x([
    [null, A, A, A, A, A, A, null],
    [A, B, B, B, B, B, B, A],
    [A, B, A, A, A, A, B, A],
    [A, B, A, null, null, A, B, A],
    [A, B, A, null, null, A, B, A],
    [A, B, A, A, A, A, B, A],
    [A, B, B, B, B, B, B, A],
    [null, A, A, A, A, A, A, null],
  ]);
}

export function createBaitSprite(frame: number): HTMLCanvasElement {
  const A = frame % 2 === 0 ? "#4B8CFF" : "#7AA8FF";
  const B = frame % 2 === 0 ? "#7AA8FF" : "#B8CCFF";
  const C = frame % 2 === 0 ? "#B8CCFF" : "#E8F0FF";
  const S = "#1A2848";
  return bake2x([
    [null, null, null, A, A, null, null, null],
    [null, null, A, B, B, A, null, null],
    [null, A, B, C, C, B, A, null],
    [A, B, C, C, C, C, B, A],
    [A, B, C, C, C, C, B, A],
    [null, A, B, C, C, B, A, null],
    [null, null, A, B, B, A, null, null],
    [null, null, null, A, A, null, null, null],
    [null, null, null, S, S, null, null, null],
    [null, null, null, null, null, null, null, null],
  ]);
}

/** Pixel ring used as the bait “hunted” aura (no soft circles). */
export function createAuraRing(frame: number): HTMLCanvasElement {
  const A = frame % 2 === 0 ? "#4B8CFF" : "#7AA8FF";
  const C = frame % 2 === 0 ? "#3A6AD0" : "#5A88E0";
  const _ = null;
  return bake2x([
    [_, _, _, A, A, A, A, _, _, _],
    [_, _, A, C, C, C, C, A, _, _],
    [_, A, C, _, _, _, _, C, A, _],
    [A, C, _, _, _, _, _, _, C, A],
    [A, C, _, _, _, _, _, _, C, A],
    [A, C, _, _, _, _, _, _, C, A],
    [A, C, _, _, _, _, _, _, C, A],
    [_, A, C, _, _, _, _, C, A, _],
    [_, _, A, C, C, C, C, A, _, _],
    [_, _, _, A, A, A, A, _, _, _],
  ]);
}

export function createTrapdoorSprite(open: boolean): HTMLCanvasElement {
  if (open) {
    const R = "#E24A4A";
    const A = "#F0B429";
    const V = "#2A1830";
    const Dd = "#140C18";
    const grid: PixelGrid = [
      [A, R, A, R, A, R, A, R, A, R, A, R, A, R, A, R],
      [R, V, V, V, V, V, V, V, V, V, V, V, V, V, V, A],
      [A, V, Dd, Dd, Dd, Dd, Dd, Dd, Dd, Dd, Dd, Dd, Dd, Dd, V, R],
      [R, V, Dd, V, Dd, Dd, Dd, Dd, Dd, Dd, Dd, Dd, V, Dd, V, A],
      [A, V, Dd, Dd, V, Dd, Dd, Dd, Dd, Dd, Dd, V, Dd, Dd, V, R],
      [R, V, Dd, Dd, Dd, V, Dd, Dd, Dd, Dd, V, Dd, Dd, Dd, V, A],
      [A, V, Dd, Dd, Dd, Dd, V, Dd, Dd, V, Dd, Dd, Dd, Dd, V, R],
      [R, V, Dd, Dd, Dd, Dd, Dd, V, V, Dd, Dd, Dd, Dd, Dd, V, A],
      [A, V, Dd, Dd, Dd, Dd, Dd, V, V, Dd, Dd, Dd, Dd, Dd, V, R],
      [R, V, Dd, Dd, Dd, Dd, V, Dd, Dd, V, Dd, Dd, Dd, Dd, V, A],
      [A, V, Dd, Dd, Dd, V, Dd, Dd, Dd, Dd, V, Dd, Dd, Dd, V, R],
      [R, V, Dd, Dd, V, Dd, Dd, Dd, Dd, Dd, Dd, V, Dd, Dd, V, A],
      [A, V, Dd, V, Dd, Dd, Dd, Dd, Dd, Dd, Dd, Dd, V, Dd, V, R],
      [R, V, Dd, Dd, Dd, Dd, Dd, Dd, Dd, Dd, Dd, Dd, Dd, Dd, V, A],
      [A, V, V, V, V, V, V, V, V, V, V, V, V, V, V, R],
      [R, A, R, A, R, A, R, A, R, A, R, A, R, A, R, A],
    ];
    return bake2x(grid);
  }

  const L2 = "#E0B860";
  const M2 = "#B88830";
  const K2 = "#6A4A18";
  const grid: PixelGrid = [
    [K2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, K2],
    [L2, M2, M2, M2, M2, M2, M2, M2, M2, M2, M2, M2, M2, M2, M2, L2],
    [L2, M2, L2, M2, M2, M2, M2, M2, M2, M2, M2, M2, M2, L2, M2, L2],
    [L2, M2, M2, K2, M2, M2, M2, M2, M2, M2, M2, M2, K2, M2, M2, L2],
    [L2, M2, M2, M2, K2, M2, M2, L2, L2, M2, M2, K2, M2, M2, M2, L2],
    [L2, M2, M2, M2, M2, K2, M2, L2, L2, M2, K2, M2, M2, M2, M2, L2],
    [L2, M2, M2, M2, M2, M2, K2, M2, M2, K2, M2, M2, M2, M2, M2, L2],
    [L2, M2, M2, M2, L2, L2, M2, K2, K2, M2, L2, L2, M2, M2, M2, L2],
    [L2, M2, M2, M2, L2, L2, M2, K2, K2, M2, L2, L2, M2, M2, M2, L2],
    [L2, M2, M2, M2, M2, M2, K2, M2, M2, K2, M2, M2, M2, M2, M2, L2],
    [L2, M2, M2, M2, M2, K2, M2, L2, L2, M2, K2, M2, M2, M2, M2, L2],
    [L2, M2, M2, M2, K2, M2, M2, L2, L2, M2, M2, K2, M2, M2, M2, L2],
    [L2, M2, M2, K2, M2, M2, M2, M2, M2, M2, M2, M2, K2, M2, M2, L2],
    [L2, M2, L2, M2, M2, M2, M2, M2, M2, M2, M2, M2, M2, L2, M2, L2],
    [L2, M2, M2, M2, M2, M2, M2, M2, M2, M2, M2, M2, M2, M2, M2, L2],
    [K2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, L2, K2],
  ];
  return bake2x(grid);
}

export function createSlimeSprite(frame: number): HTMLCanvasElement {
  const Dd = "#145228";
  const A = frame % 2 === 0 ? "#2AAE48" : "#249A40";
  const B = frame % 2 === 0 ? "#3DCF5A" : "#36BE52";
  const C = frame % 2 === 0 ? "#7CFF95" : "#6AE888";
  const H = "#C8FFD4";
  const _ = null;

  const grid: PixelGrid =
    frame % 2 === 0
      ? [
          [_, _, _, _, Dd, Dd, Dd, Dd, Dd, Dd, _, _, _, _, _, _],
          [_, _, _, Dd, A, B, B, B, B, A, Dd, _, _, _, _, _],
          [_, _, Dd, A, B, C, C, B, B, B, A, Dd, Dd, _, _, _],
          [_, Dd, A, B, C, H, C, B, B, B, B, A, A, Dd, _, _],
          [_, Dd, A, B, C, C, B, B, B, B, B, B, A, Dd, _, _],
          [Dd, A, B, B, B, B, B, B, B, B, B, B, B, A, Dd, _],
          [Dd, A, B, B, B, B, B, B, B, B, C, B, B, A, Dd, _],
          [Dd, A, B, B, B, B, B, B, B, B, B, B, B, A, Dd, _],
          [Dd, A, A, B, B, B, B, B, B, B, B, B, A, A, Dd, _],
          [_, Dd, A, A, B, B, B, B, B, B, B, A, A, Dd, _, _],
          [_, Dd, A, A, A, B, B, B, B, A, A, A, Dd, _, _, _],
          [_, _, Dd, A, A, A, A, A, A, A, A, Dd, _, _, _, _],
          [_, _, _, Dd, Dd, A, A, A, A, Dd, Dd, _, _, Dd, _, _],
          [_, _, _, _, _, Dd, Dd, Dd, Dd, _, _, _, Dd, A, Dd, _],
          [_, _, _, _, _, _, _, _, _, _, _, _, _, Dd, _, _],
          [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        ]
      : [
          [_, _, _, _, _, Dd, Dd, Dd, Dd, Dd, _, _, _, _, _, _],
          [_, _, _, Dd, Dd, A, B, B, B, A, Dd, _, _, _, _, _],
          [_, _, Dd, A, B, B, C, C, B, B, A, Dd, _, _, _, _],
          [_, Dd, A, B, B, C, H, C, B, B, B, A, Dd, Dd, _, _],
          [_, Dd, A, B, B, C, C, B, B, B, B, B, A, Dd, _, _],
          [Dd, A, B, B, B, B, B, B, B, B, B, B, B, A, Dd, _],
          [Dd, A, B, B, B, B, B, B, B, C, B, B, B, A, Dd, _],
          [Dd, A, B, B, B, B, B, B, B, B, B, B, B, A, Dd, _],
          [Dd, A, A, B, B, B, B, B, B, B, B, B, A, A, Dd, _],
          [_, Dd, A, A, B, B, B, B, B, B, B, A, A, Dd, _, _],
          [_, _, Dd, A, A, B, B, B, B, A, A, A, Dd, _, _, _],
          [_, _, Dd, A, A, A, A, A, A, A, A, Dd, _, _, _, _],
          [_, _, _, Dd, A, A, A, A, A, Dd, Dd, _, _, _, Dd, _],
          [_, _, _, _, Dd, Dd, Dd, Dd, Dd, _, _, _, _, Dd, A, Dd],
          [_, _, _, _, _, _, _, _, _, _, _, _, _, _, Dd, _],
          [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        ];
  return bake2x(grid);
}

export function createShockSprite(live: boolean): HTMLCanvasElement {
  if (!live) {
    const Gg = "#3A3A3A";
    return bake2x([
      [Gg, null, Gg, null, Gg, null, Gg, null],
      [null, Gg, null, Gg, null, Gg, null, Gg],
      [Gg, null, Gg, null, Gg, null, Gg, null],
      [null, Gg, null, Gg, null, Gg, null, Gg],
      [Gg, null, Gg, null, Gg, null, Gg, null],
      [null, Gg, null, Gg, null, Gg, null, Gg],
      [Gg, null, Gg, null, Gg, null, Gg, null],
      [null, Gg, null, Gg, null, Gg, null, Gg],
    ]);
  }

  const Y = "#F0B429";
  const C = "#7AD4FF";
  return bake2x([
    [null, Y, null, C, null, Y, null, C],
    [Y, C, Y, null, C, Y, C, null],
    [null, Y, C, Y, null, C, null, Y],
    [C, null, Y, C, Y, null, Y, C],
    [null, C, null, Y, C, Y, null, Y],
    [Y, null, C, null, Y, C, Y, null],
    [null, Y, null, C, null, Y, C, Y],
    [C, null, Y, null, C, null, Y, null],
  ]);
}

export function createRiftSprite(frame: number): HTMLCanvasElement {
  const A = frame % 2 === 0 ? "#C45AD8" : "#8A30A8";
  const B = frame % 2 === 0 ? "#E8A0F0" : "#C45AD8";
  return bake2x([
    [null, null, A, A, A, A, null, null],
    [null, A, B, B, B, B, A, null],
    [A, B, null, B, B, null, B, A],
    [A, B, B, null, null, B, B, A],
    [A, B, B, null, null, B, B, A],
    [A, B, null, B, B, null, B, A],
    [null, A, B, B, B, B, A, null],
    [null, null, A, A, A, A, null, null],
  ]);
}

export function createBonusSprite(frame: number): HTMLCanvasElement {
  const A = frame % 2 === 0 ? "#F0B429" : "#FFE08A";
  const B = frame % 2 === 0 ? "#E28A1A" : "#F0B429";
  const C = "#FFF6C8";
  return bake2x([
    [null, null, null, A, A, null, null, null],
    [null, null, A, C, C, A, null, null],
    [null, A, C, A, A, C, A, null],
    [A, C, A, B, B, A, C, A],
    [A, C, A, B, B, A, C, A],
    [null, A, C, A, A, C, A, null],
    [null, null, A, C, C, A, null, null],
    [null, null, null, A, A, null, null, null],
  ]);
}

export function createLiftSprite(dir: "up" | "down", frame: number): HTMLCanvasElement {
  const A = dir === "up" ? "#3DFFB5" : "#F0B429";
  const B = dir === "up" ? "#1ECF8A" : "#E28A1A";
  const C = frame % 2 === 0 ? A : B;
  const arrow =
    dir === "up"
      ? [
          [null, null, null, C, C, null, null, null],
          [null, null, C, C, C, C, null, null],
          [null, C, C, B, B, C, C, null],
          [C, C, null, B, B, null, C, C],
          [null, null, null, B, B, null, null, null],
          [null, null, null, B, B, null, null, null],
          [A, A, A, A, A, A, A, A],
          [A, B, B, B, B, B, B, A],
        ]
      : [
          [A, B, B, B, B, B, B, A],
          [A, A, A, A, A, A, A, A],
          [null, null, null, B, B, null, null, null],
          [null, null, null, B, B, null, null, null],
          [C, C, null, B, B, null, C, C],
          [null, C, C, B, B, C, C, null],
          [null, null, C, C, C, C, null, null],
          [null, null, null, C, C, null, null, null],
        ];
  return bake2x(arrow as PixelGrid);
}

export const HUNTER_GHOST_PALETTE: GhostPalette = {
  body: "#F4EDE0",
  skirt: "#E24A4A",
  hair: "#1A1510",
  eyeWhite: "#E24A4A",
  pupil: "#1A1510",
  skin: "#E8B896",
};
