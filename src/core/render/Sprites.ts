import type { Direction } from "../types";
import { bakeSprite, flipGridX, type Pixel, type PixelGrid } from "./PixelArt";

const Y = "#FFE14A"; // player yellow
const O = "#1A1A1A"; // outline / mouth
const W = "#FFFFFF"; // eye white
const B = "#1B2A6B"; // eye pupil
const P = "#FF6B9D"; // pink blush

/** 14×14 player frames — mouth open / closed for each facing. */
function playerFrame(mouthOpen: boolean, facing: "right" | "up"): PixelGrid {
  // Base facing right
  const closed: PixelGrid = [
    [null, null, null, Y, Y, Y, Y, Y, Y, null, null, null, null, null],
    [null, null, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null, null],
    [null, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null],
    [null, Y, Y, Y, W, B, Y, Y, Y, Y, Y, Y, null, null],
    [Y, Y, Y, Y, W, B, Y, Y, Y, Y, Y, Y, Y, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, P, Y, Y, null],
    [null, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null, null],
    [null, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null],
    [null, null, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null, null],
    [null, null, null, Y, Y, Y, Y, Y, Y, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  ];

  const open: PixelGrid = [
    [null, null, null, Y, Y, Y, Y, Y, Y, null, null, null, null, null],
    [null, null, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null, null],
    [null, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null],
    [null, Y, Y, Y, W, B, Y, Y, Y, Y, null, null, null, null],
    [Y, Y, Y, Y, W, B, Y, Y, Y, null, null, null, null, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, null, null, null, null, null, null],
    [Y, Y, Y, Y, Y, Y, Y, null, null, null, null, null, null, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, null, O, null, null, null, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null, null, null],
    [null, Y, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null, null],
    [null, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null],
    [null, null, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null, null],
    [null, null, null, Y, Y, Y, Y, Y, Y, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  ];

  let grid = mouthOpen ? open : closed;

  if (facing === "up") {
    // Approximate up-facing by rotating body cues (eyes near top)
    grid = mouthOpen ? playerUpOpen() : playerUpClosed();
  }

  return grid;
}

function playerUpClosed(): PixelGrid {
  return [
    [null, null, null, Y, Y, Y, Y, Y, Y, null, null, null, null, null],
    [null, null, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null, null],
    [null, Y, Y, W, B, Y, Y, W, B, Y, Y, null, null, null],
    [null, Y, Y, W, B, Y, Y, W, B, Y, Y, Y, null, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null],
    [null, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null, null],
    [null, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null],
    [null, null, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null, null],
    [null, null, null, Y, Y, Y, Y, Y, Y, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  ];
}

function playerUpOpen(): PixelGrid {
  return [
    [null, null, null, null, null, O, O, null, null, null, null, null, null, null],
    [null, null, null, Y, Y, null, null, Y, Y, null, null, null, null, null],
    [null, null, Y, Y, Y, null, null, Y, Y, Y, null, null, null, null],
    [null, Y, Y, W, B, Y, Y, W, B, Y, Y, null, null, null],
    [null, Y, Y, W, B, Y, Y, W, B, Y, Y, Y, null, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null],
    [null, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null, null],
    [null, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null],
    [null, null, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null, null],
    [null, null, null, Y, Y, Y, Y, Y, Y, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  ];
}

export type PlayerSpriteSet = {
  right: HTMLCanvasElement[];
  left: HTMLCanvasElement[];
  up: HTMLCanvasElement[];
  down: HTMLCanvasElement[];
};

export function createPlayerSprites(): PlayerSpriteSet {
  const right = [bakeSprite(playerFrame(true, "right")), bakeSprite(playerFrame(false, "right"))];
  const left = [
    bakeSprite(flipGridX(playerFrame(true, "right"))),
    bakeSprite(flipGridX(playerFrame(false, "right"))),
  ];
  const up = [bakeSprite(playerFrame(true, "up")), bakeSprite(playerFrame(false, "up"))];
  const down = [
    bakeSprite(flipGridX(flipGridX(playerUpOpen()))), // reuse closed-ish down
    bakeSprite(playerUpClosed()),
  ];
  // Better down frames: mouth toward bottom
  const downOpen: PixelGrid = [
    [null, null, null, Y, Y, Y, Y, Y, Y, null, null, null, null, null],
    [null, null, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null, null],
    [null, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null, null, null],
    [null, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null],
    [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, null],
    [Y, Y, Y, W, B, Y, Y, W, B, Y, Y, Y, Y, null],
    [Y, Y, Y, W, B, Y, Y, W, B, Y, Y, Y, Y, null],
    [null, Y, Y, Y, Y, null, null, Y, Y, Y, Y, Y, null, null],
    [null, Y, Y, Y, null, null, null, null, Y, Y, Y, null, null, null],
    [null, null, Y, null, null, null, null, null, null, Y, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  ];
  down[0] = bakeSprite(downOpen);
  down[1] = bakeSprite(playerUpClosed());

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

// --- Ghosts ---

export type GhostPalette = {
  body: string;
  skirt: string;
  eyeWhite?: string;
  pupil?: string;
};

function ghostFrame(palette: GhostPalette, skirtAlt: boolean, lookX: number): PixelGrid {
  const C = palette.body;
  const S = palette.skirt;
  const EW = palette.eyeWhite ?? "#FFFFFF";
  const PU = palette.pupil ?? "#1B2A6B";

  // lookX: -1 left, 0 center, 1 right — shifts pupils
  const eyeRow = (base: Pixel[]): Pixel[] => {
    const row = [...base];
    // pupils at indices depending on look
    const leftPupil = 4 + lookX;
    const rightPupil = 9 + lookX;
    for (let i = 3; i <= 5; i++) if (row[i]) row[i] = EW;
    for (let i = 8; i <= 10; i++) if (row[i]) row[i] = EW;
    if (leftPupil >= 3 && leftPupil <= 5) row[leftPupil] = PU;
    if (rightPupil >= 8 && rightPupil <= 10) row[rightPupil] = PU;
    return row;
  };

  const skirtA: Pixel[] = [null, C, null, C, null, C, null, C, null, C, null, C, null, null];
  const skirtB: Pixel[] = [null, null, C, null, C, null, C, null, C, null, C, null, null, null];
  const skirt = skirtAlt ? skirtB : skirtA;
  // tint skirt tips
  const skirtColored = skirt.map((p) => (p === C ? S : p));

  return [
    [null, null, null, null, C, C, C, C, null, null, null, null, null, null],
    [null, null, null, C, C, C, C, C, C, null, null, null, null, null],
    [null, null, C, C, C, C, C, C, C, C, null, null, null, null],
    [null, C, C, C, C, C, C, C, C, C, C, null, null, null],
    eyeRow([null, C, C, EW, EW, EW, C, C, EW, EW, EW, C, null, null]),
    eyeRow([null, C, C, EW, PU, EW, C, C, EW, PU, EW, C, null, null]),
    [null, C, C, C, C, C, C, C, C, C, C, null, null, null],
    [null, C, C, C, C, C, C, C, C, C, C, null, null, null],
    [null, C, C, C, C, C, C, C, C, C, C, null, null, null],
    [null, C, C, C, C, C, C, C, C, C, C, null, null, null],
    [null, C, C, C, C, C, C, C, C, C, C, null, null, null],
    skirtColored,
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  ];
}

export const GHOST_PALETTES: GhostPalette[] = [
  { body: "#FF4B5C", skirt: "#FF7A86" }, // red
  { body: "#FF9E4A", skirt: "#FFC07A" }, // orange
  { body: "#4AD4FF", skirt: "#7AE4FF" }, // cyan
  { body: "#FF6AD5", skirt: "#FF9AE4" }, // pink
];

export function createGhostSprites(palette: GhostPalette): HTMLCanvasElement[] {
  // 2 skirt frames × we'll bake look variants at draw time via separate sets
  return [
    bakeSprite(ghostFrame(palette, false, 0)),
    bakeSprite(ghostFrame(palette, true, 0)),
    bakeSprite(ghostFrame(palette, false, -1)),
    bakeSprite(ghostFrame(palette, true, -1)),
    bakeSprite(ghostFrame(palette, false, 1)),
    bakeSprite(ghostFrame(palette, true, 1)),
  ];
}

export function ghostSpriteFor(
  frames: HTMLCanvasElement[],
  animFrame: number,
  direction: Direction,
): HTMLCanvasElement {
  const skirt = animFrame % 2;
  const look = direction === "left" ? 1 : direction === "right" ? 2 : 0; // index group
  // frames: 0-1 center, 2-3 left, 4-5 right
  const base = look * 2;
  return frames[base + skirt]!;
}

export function createDotSprite(): HTMLCanvasElement {
  const D = "#F5E6A3";
  const grid: PixelGrid = [
    [null, null, D, D, null, null],
    [null, D, D, D, D, null],
    [D, D, D, D, D, D],
    [D, D, D, D, D, D],
    [null, D, D, D, D, null],
    [null, null, D, D, null, null],
  ];
  return bakeSprite(grid);
}

export function createExitSprite(frame: number): HTMLCanvasElement {
  const A = frame % 2 === 0 ? "#5CFF8A" : "#2AD66A";
  const B = frame % 2 === 0 ? "#2AD66A" : "#5CFF8A";
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

export function createWallPattern(): HTMLCanvasElement {
  const C = "#2E5BFF";
  const D = "#1A3FCC";
  const grid: PixelGrid = [
    [C, C, C, C],
    [C, D, D, C],
    [C, D, D, C],
    [C, C, C, C],
  ];
  return bakeSprite(grid);
}

export function createBaitSprite(frame: number): HTMLCanvasElement {
  const A = frame % 2 === 0 ? "#4B7BFF" : "#7AA0FF";
  const B = frame % 2 === 0 ? "#7AA0FF" : "#B8CCFF";
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
    // Danger pit: loud red/amber hazard rim + purple void (never plain black path)
    const R = "#FF3B4A";
    const A = "#FFB020";
    const V = "#3A1060";
    const D = "#1A0530";
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

  // Safe hatch: warm amber metal plate with rivets + clear "safe floor" X
  const L = "#E8C060";
  const M = "#C49830";
  const K = "#7A5A18";
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
  const A = frame % 2 === 0 ? "#3DCF5A" : "#2AAE48";
  const B = frame % 2 === 0 ? "#7CFF95" : "#3DCF5A";
  const grid: PixelGrid = [
    [null, null, A, A, A, A, null, null, null, null, null, null, null, null, null, null],
    [null, A, B, B, B, B, A, null, null, null, null, null, null, null, null, null],
    [A, B, B, A, A, B, B, A, null, A, A, null, null, null, null, null],
    [A, B, A, B, B, A, B, A, A, B, B, A, null, null, null, null],
    [A, B, A, B, B, A, B, B, B, B, A, B, A, null, null, null],
    [null, A, B, A, A, B, B, A, A, B, B, B, A, null, null, null],
    [null, null, A, B, B, B, A, null, null, A, B, A, null, null, null, null],
    [null, null, null, A, A, A, null, null, null, null, A, null, null, null, null, null],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
  ];
  return bakeSprite(grid);
}

export function createShockSprite(live: boolean): HTMLCanvasElement {
  if (!live) {
    const G = "#3A3A4A";
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

  const Y = "#FFE14A";
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
  const A = frame % 2 === 0 ? "#B14BFF" : "#7A2AD6";
  const B = frame % 2 === 0 ? "#E0A0FF" : "#B14BFF";
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

/** Angry hunter look used while bait is active. */
export const HUNTER_GHOST_PALETTE: GhostPalette = {
  body: "#E8E8FF",
  skirt: "#FF4B5C",
  eyeWhite: "#FF4B5C",
  pupil: "#1A1A1A",
};
