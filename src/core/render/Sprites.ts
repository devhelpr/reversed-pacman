import type { Direction } from "../types";
import { bakeSprite, flipGridX, type Pixel, type PixelGrid } from "./PixelArt";

// Robot — lean C64-style chassis (limited palette, crisp silhouette)
const K = "#7A8490"; // metal shade
const B = "#A8B0B8"; // metal mid
const D = "#0A0810"; // outline
const L = "#3DFFB5"; // LED
const A = "#F0B429"; // amber
const V = "#1A2430"; // visor

const _ = null;

/** Slim 14×14 robot — narrow torso, clear head/legs (no pear shape). */
function robotRight(step: 0 | 1): PixelGrid {
  const legs: Pixel[] =
    step === 0
      ? [_, _, _, K, K, _, _, _, _, _, K, K, _, _]
      : [_, _, K, K, _, _, _, _, _, K, K, _, _, _];
  const shoes: Pixel[] =
    step === 0
      ? [_, _, _, D, D, _, _, _, _, _, D, D, _, _]
      : [_, _, D, D, _, _, _, _, _, D, D, _, _, _];

  return [
    [_, _, _, _, _, _, A, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, B, B, K, _, _, _, _, _],
    [_, _, _, _, _, K, V, L, K, _, _, _, _, _],
    [_, _, _, _, _, K, B, B, K, _, _, _, _, _],
    [_, _, _, _, _, _, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, B, B, B, B, K, _, _, _, _],
    [_, _, _, _, K, B, A, A, B, K, _, _, _, _],
    [_, _, _, _, K, B, B, B, B, K, _, _, _, _],
    [_, _, _, _, _, K, B, B, K, _, _, _, _, _],
    [_, _, _, _, _, K, B, B, K, _, _, _, _, _],
    [_, _, _, _, K, K, _, _, K, K, _, _, _, _],
    legs,
    shoes,
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
  ];
}

function robotUp(step: 0 | 1): PixelGrid {
  const legs: Pixel[] =
    step === 0
      ? [_, _, _, K, K, _, _, _, _, _, K, K, _, _]
      : [_, _, K, K, _, _, _, _, _, K, K, _, _, _];
  const shoes: Pixel[] =
    step === 0
      ? [_, _, _, D, D, _, _, _, _, _, D, D, _, _]
      : [_, _, D, D, _, _, _, _, _, D, D, _, _, _];

  return [
    [_, _, _, _, _, _, A, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, B, B, K, _, _, _, _, _],
    [_, _, _, _, _, K, V, V, K, _, _, _, _, _],
    [_, _, _, _, _, K, B, B, K, _, _, _, _, _],
    [_, _, _, _, _, _, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, B, B, B, B, K, _, _, _, _],
    [_, _, _, _, K, B, A, A, B, K, _, _, _, _],
    [_, _, _, _, K, B, B, B, B, K, _, _, _, _],
    [_, _, _, _, _, K, B, B, K, _, _, _, _, _],
    [_, _, _, _, _, K, B, B, K, _, _, _, _, _],
    [_, _, _, _, K, K, _, _, K, K, _, _, _, _],
    legs,
    shoes,
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
  ];
}

function robotDown(step: 0 | 1): PixelGrid {
  const legs: Pixel[] =
    step === 0
      ? [_, _, _, K, K, _, _, _, _, _, K, K, _, _]
      : [_, _, K, K, _, _, _, _, _, K, K, _, _, _];
  const shoes: Pixel[] =
    step === 0
      ? [_, _, _, D, D, _, _, _, _, _, D, D, _, _]
      : [_, _, D, D, _, _, _, _, _, D, D, _, _, _];

  return [
    [_, _, _, _, _, _, A, _, _, _, _, _, _, _],
    [_, _, _, _, _, K, B, B, K, _, _, _, _, _],
    [_, _, _, _, _, K, L, D, L, K, _, _, _, _],
    [_, _, _, _, _, K, B, B, K, _, _, _, _, _],
    [_, _, _, _, _, _, K, K, _, _, _, _, _, _],
    [_, _, _, _, K, B, B, B, B, K, _, _, _, _],
    [_, _, _, _, K, B, A, A, B, K, _, _, _, _],
    [_, _, _, _, K, B, B, B, B, K, _, _, _, _],
    [_, _, _, _, _, K, B, B, K, _, _, _, _, _],
    [_, _, _, _, _, K, B, B, K, _, _, _, _, _],
    [_, _, _, _, K, K, _, _, K, K, _, _, _, _],
    legs,
    shoes,
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
  ];
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

// --- Humans (maze runners) — slim C64-style figures ---

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

  // Pupils shift with facing; eyes stay compact (cols 5–8)
  const eyeRow = (y: 0 | 1): Pixel[] => {
    const row: Pixel[] = [_, _, _, _, SK, SK, SK, SK, SK, SK, _, _, _, _];
    row[5] = EW;
    row[6] = EW;
    row[7] = EW;
    row[8] = EW;
    if (y === 1) {
      const lp = lookX < 0 ? 5 : lookX > 0 ? 6 : 5;
      const rp = lookX < 0 ? 7 : lookX > 0 ? 8 : 8;
      row[lp] = PU;
      row[rp] = PU;
    }
    return row;
  };

  const legs: Pixel[] = stepAlt
    ? [_, _, C, C, _, _, _, _, _, C, C, _, _, _]
    : [_, _, _, C, C, _, _, _, C, C, _, _, _, _];
  const shoes: Pixel[] = stepAlt
    ? [_, _, D, D, _, _, _, _, _, D, D, _, _, _]
    : [_, _, _, D, D, _, _, _, D, D, _, _, _, _];

  return [
    [_, _, _, _, _, H, H, H, H, _, _, _, _, _],
    [_, _, _, _, H, H, H, H, H, H, _, _, _, _],
    [_, _, _, _, SK, SK, SK, SK, SK, SK, _, _, _, _],
    eyeRow(0),
    eyeRow(1),
    [_, _, _, _, SK, SK, SD, SD, SK, SK, _, _, _, _],
    [_, _, _, _, _, SK, SK, SK, SK, _, _, _, _, _],
    [_, _, _, _, C, C, C, C, C, C, _, _, _, _],
    [_, _, _, C, C, C, C, C, C, C, C, _, _, _],
    [_, _, _, _, C, C, C, C, C, C, _, _, _, _],
    [_, _, _, _, _, C, C, C, C, _, _, _, _, _],
    legs,
    shoes,
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
  ];
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

export function createDotSprite(): HTMLCanvasElement {
  // Classic pellet — small, round, bright
  const A = "#F0D878";
  const B = "#FFF6C8";
  const grid: PixelGrid = [
    [_, A, A, _],
    [A, B, A, A],
    [A, A, A, A],
    [_, A, A, _],
  ];
  return bakeSprite(grid);
}

export function createFloorPattern(): HTMLCanvasElement {
  // Dark corridor void — keeps metal walls readable
  const F = "#0A0C12";
  const S = "#12151E";
  const grid: PixelGrid = Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => (x === 0 || y === 0 ? S : F)),
  );
  return bakeSprite(grid);
}

export function createWallPattern(): HTMLCanvasElement {
  // Smooth filled steel core — lighter mid-tones so pipes sit on metal, not a dark void
  const H = "#6A8AB0";
  const M = "#5A7A9E";
  const L = "#4E6E92";
  const grid: PixelGrid = Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => {
      // Soft vertical bevel, no speckles
      if (y <= 1) return H;
      if (y >= 14) return L;
      if (x <= 1) return H;
      if (x >= 14) return L;
      return M;
    }),
  );
  return bakeSprite(grid);
}

export function createExitSprite(frame: number): HTMLCanvasElement {
  const A = frame % 2 === 0 ? "#3DFFB5" : "#1ECF8A";
  const B = frame % 2 === 0 ? "#1ECF8A" : "#3DFFB5";
  const grid: PixelGrid = [
    [null, A, A, A, A, A, A, null],
    [A, B, B, B, B, B, B, A],
    [A, B, A, A, A, A, B, A],
    [A, B, A, null, null, A, B, A],
    [A, B, A, null, null, A, B, A],
    [A, B, A, A, A, A, B, A],
    [A, B, B, B, B, B, B, A],
    [null, A, A, A, A, A, A, null],
  ];
  return bakeSprite(grid);
}

export function createBaitSprite(frame: number): HTMLCanvasElement {
  const A = frame % 2 === 0 ? "#4B8CFF" : "#7AA8FF";
  const B = frame % 2 === 0 ? "#7AA8FF" : "#B8CCFF";
  const grid: PixelGrid = [
    [null, null, A, A, null, null, null, null],
    [null, A, B, B, A, null, null, null],
    [A, B, B, B, B, A, null, null],
    [A, B, B, B, B, A, null, null],
    [null, A, B, B, A, null, null, null],
    [null, null, A, A, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
  ];
  return bakeSprite(grid);
}

export function createTrapdoorSprite(open: boolean): HTMLCanvasElement {
  if (open) {
    const R = "#E24A4A";
    const A = "#F0B429";
    const V = "#2A1830";
    const D = "#140C18";
    const grid: PixelGrid = [
      [A, R, A, R, A, R, A, R, A, R, A, R, A, R, A, R],
      [R, V, V, V, V, V, V, V, V, V, V, V, V, V, V, A],
      [A, V, D, D, D, D, D, D, D, D, D, D, D, D, V, R],
      [R, V, D, V, D, D, D, D, D, D, D, D, V, D, V, A],
      [A, V, D, D, V, D, D, D, D, D, D, V, D, D, V, R],
      [R, V, D, D, D, V, D, D, D, D, V, D, D, D, V, A],
      [A, V, D, D, D, D, V, D, D, V, D, D, D, D, V, R],
      [R, V, D, D, D, D, D, V, V, D, D, D, D, D, V, A],
      [A, V, D, D, D, D, D, V, V, D, D, D, D, D, V, R],
      [R, V, D, D, D, D, V, D, D, V, D, D, D, D, V, A],
      [A, V, D, D, D, V, D, D, D, D, V, D, D, D, V, R],
      [R, V, D, D, V, D, D, D, D, D, D, V, D, D, V, A],
      [A, V, D, V, D, D, D, D, D, D, D, D, V, D, V, R],
      [R, V, D, D, D, D, D, D, D, D, D, D, D, D, V, A],
      [A, V, V, V, V, V, V, V, V, V, V, V, V, V, V, R],
      [R, A, R, A, R, A, R, A, R, A, R, A, R, A, R, A],
    ];
    return bakeSprite(grid);
  }

  const L = "#E0B860";
  const M = "#B88830";
  const K = "#6A4A18";
  const grid: PixelGrid = [
    [K, L, L, L, L, L, L, L, L, L, L, L, L, L, L, K],
    [L, M, M, M, M, M, M, M, M, M, M, M, M, M, M, L],
    [L, M, L, M, M, M, M, M, M, M, M, M, M, L, M, L],
    [L, M, M, K, M, M, M, M, M, M, M, M, K, M, M, L],
    [L, M, M, M, K, M, M, L, L, M, M, K, M, M, M, L],
    [L, M, M, M, M, K, M, L, L, M, K, M, M, M, M, L],
    [L, M, M, M, M, M, K, M, M, K, M, M, M, M, M, L],
    [L, M, M, M, L, L, M, K, K, M, L, L, M, M, M, L],
    [L, M, M, M, L, L, M, K, K, M, L, L, M, M, M, L],
    [L, M, M, M, M, M, K, M, M, K, M, M, M, M, M, L],
    [L, M, M, M, M, K, M, L, L, M, K, M, M, M, M, L],
    [L, M, M, M, K, M, M, L, L, M, M, K, M, M, M, L],
    [L, M, M, K, M, M, M, M, M, M, M, M, K, M, M, L],
    [L, M, L, M, M, M, M, M, M, M, M, M, M, L, M, L],
    [L, M, M, M, M, M, M, M, M, M, M, M, M, M, M, L],
    [K, L, L, L, L, L, L, L, L, L, L, L, L, L, L, K],
  ];
  return bakeSprite(grid);
}

export function createSlimeSprite(frame: number): HTMLCanvasElement {
  // Goo puddle: deep rim, mid body, glossy highlight + bubble (wobbles by frame)
  const D = "#145228"; // deep rim
  const A = frame % 2 === 0 ? "#2AAE48" : "#249A40"; // body
  const B = frame % 2 === 0 ? "#3DCF5A" : "#36BE52"; // mid
  const C = frame % 2 === 0 ? "#7CFF95" : "#6AE888"; // gloss
  const H = "#C8FFD4"; // bright highlight
  const _ = null;

  const grid: PixelGrid =
    frame % 2 === 0
      ? [
          [_, _, _, _, D, D, D, D, D, D, _, _, _, _, _, _],
          [_, _, _, D, A, B, B, B, B, A, D, _, _, _, _, _],
          [_, _, D, A, B, C, C, B, B, B, A, D, D, _, _, _],
          [_, D, A, B, C, H, C, B, B, B, B, A, A, D, _, _],
          [_, D, A, B, C, C, B, B, B, B, B, B, A, D, _, _],
          [D, A, B, B, B, B, B, B, B, B, B, B, B, A, D, _],
          [D, A, B, B, B, B, B, B, B, B, C, B, B, A, D, _],
          [D, A, B, B, B, B, B, B, B, B, B, B, B, A, D, _],
          [D, A, A, B, B, B, B, B, B, B, B, B, A, A, D, _],
          [_, D, A, A, B, B, B, B, B, B, B, A, A, D, _, _],
          [_, D, A, A, A, B, B, B, B, A, A, A, D, _, _, _],
          [_, _, D, A, A, A, A, A, A, A, A, D, _, _, _, _],
          [_, _, _, D, D, A, A, A, A, D, D, _, _, D, _, _],
          [_, _, _, _, _, D, D, D, D, _, _, _, D, A, D, _],
          [_, _, _, _, _, _, _, _, _, _, _, _, _, D, _, _],
          [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        ]
      : [
          [_, _, _, _, _, D, D, D, D, D, _, _, _, _, _, _],
          [_, _, _, D, D, A, B, B, B, A, D, _, _, _, _, _],
          [_, _, D, A, B, B, C, C, B, B, A, D, _, _, _, _],
          [_, D, A, B, B, C, H, C, B, B, B, A, D, D, _, _],
          [_, D, A, B, B, C, C, B, B, B, B, B, A, D, _, _],
          [D, A, B, B, B, B, B, B, B, B, B, B, B, A, D, _],
          [D, A, B, B, B, B, B, B, B, C, B, B, B, A, D, _],
          [D, A, B, B, B, B, B, B, B, B, B, B, B, A, D, _],
          [D, A, A, B, B, B, B, B, B, B, B, B, A, A, D, _],
          [_, D, A, A, B, B, B, B, B, B, B, A, A, D, _, _],
          [_, _, D, A, A, B, B, B, B, A, A, A, D, _, _, _],
          [_, _, D, A, A, A, A, A, A, A, A, D, _, _, _, _],
          [_, _, _, D, A, A, A, A, A, D, D, _, _, _, D, _],
          [_, _, _, _, D, D, D, D, D, _, _, _, _, D, A, D],
          [_, _, _, _, _, _, _, _, _, _, _, _, _, _, D, _],
          [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        ];
  return bakeSprite(grid);
}

export function createShockSprite(live: boolean): HTMLCanvasElement {
  if (!live) {
    const G = "#3A3A3A";
    const grid: PixelGrid = [
      [G, null, G, null, G, null, G, null],
      [null, G, null, G, null, G, null, G],
      [G, null, G, null, G, null, G, null],
      [null, G, null, G, null, G, null, G],
      [G, null, G, null, G, null, G, null],
      [null, G, null, G, null, G, null, G],
      [G, null, G, null, G, null, G, null],
      [null, G, null, G, null, G, null, G],
    ];
    return bakeSprite(grid);
  }

  const Y = "#F0B429";
  const C = "#7AD4FF";
  const grid: PixelGrid = [
    [null, Y, null, C, null, Y, null, C],
    [Y, C, Y, null, C, Y, C, null],
    [null, Y, C, Y, null, C, null, Y],
    [C, null, Y, C, Y, null, Y, C],
    [null, C, null, Y, C, Y, null, Y],
    [Y, null, C, null, Y, C, Y, null],
    [null, Y, null, C, null, Y, C, Y],
    [C, null, Y, null, C, null, Y, null],
  ];
  return bakeSprite(grid);
}

export function createRiftSprite(frame: number): HTMLCanvasElement {
  const A = frame % 2 === 0 ? "#C45AD8" : "#8A30A8";
  const B = frame % 2 === 0 ? "#E8A0F0" : "#C45AD8";
  const grid: PixelGrid = [
    [null, null, A, A, A, A, null, null],
    [null, A, B, B, B, B, A, null],
    [A, B, null, B, B, null, B, A],
    [A, B, B, null, null, B, B, A],
    [A, B, B, null, null, B, B, A],
    [A, B, null, B, B, null, B, A],
    [null, A, B, B, B, B, A, null],
    [null, null, A, A, A, A, null, null],
  ];
  return bakeSprite(grid);
}

export function createBonusSprite(frame: number): HTMLCanvasElement {
  const A = frame % 2 === 0 ? "#F0B429" : "#FFE08A";
  const B = frame % 2 === 0 ? "#E28A1A" : "#F0B429";
  const C = "#FFF6C8";
  const grid: PixelGrid = [
    [null, null, null, A, A, null, null, null],
    [null, null, A, C, C, A, null, null],
    [null, A, C, A, A, C, A, null],
    [A, C, A, B, B, A, C, A],
    [A, C, A, B, B, A, C, A],
    [null, A, C, A, A, C, A, null],
    [null, null, A, C, C, A, null, null],
    [null, null, null, A, A, null, null, null],
  ];
  return bakeSprite(grid);
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
  return bakeSprite(arrow as PixelGrid);
}

/** Angry hunter look used while bait is active. */
export const HUNTER_GHOST_PALETTE: GhostPalette = {
  body: "#F4EDE0",
  skirt: "#E24A4A",
  hair: "#1A1510",
  eyeWhite: "#E24A4A",
  pupil: "#1A1510",
  skin: "#E8B896",
};
