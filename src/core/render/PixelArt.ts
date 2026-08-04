/**
 * Tiny pixel-art helpers: draw sprites from color grids onto a canvas.
 * Transparent pixels use null / empty string.
 */

export type Pixel = string | null;
export type PixelGrid = Pixel[][];

export function createPixelCanvas(
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

export function drawPixelGrid(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  originX = 0,
  originY = 0,
): void {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y]!;
    for (let x = 0; x < row.length; x++) {
      const color = row[x];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(originX + x, originY + y, 1, 1);
    }
  }
}

export function bakeSprite(grid: PixelGrid): HTMLCanvasElement {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const { canvas, ctx } = createPixelCanvas(w, h);
  drawPixelGrid(ctx, grid);
  return canvas;
}

/** Nearest-neighbor 2× scale for bumping sprite resolution. */
export function scaleGrid2x(grid: PixelGrid): PixelGrid {
  const out: PixelGrid = [];
  for (const row of grid) {
    const a: Pixel[] = [];
    const b: Pixel[] = [];
    for (const p of row) {
      a.push(p, p);
      b.push(p, p);
    }
    out.push(a, b);
  }
  return out;
}

/** Flip a grid horizontally for left-facing frames. */
export function flipGridX(grid: PixelGrid): PixelGrid {
  return grid.map((row) => [...row].reverse());
}

/** Rotate 90° clockwise — useful for directional variants. */
export function rotateGridCW(grid: PixelGrid): PixelGrid {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const out: PixelGrid = Array.from({ length: w }, () => Array.from({ length: h }, () => null));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[x]![h - 1 - y] = grid[y]![x]!;
    }
  }
  return out;
}
