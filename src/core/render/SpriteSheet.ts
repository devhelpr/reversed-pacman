import { createPixelCanvas } from "./PixelArt";

export type SpriteSheetLayout = {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
};

export type SliceSpritesheetOptions = {
  /** Background color(s) to punch to alpha. Defaults to white (legacy mattes). */
  chromaKey?: string | string[];
  /** Output frame size (square). Matches TILE actor sprites. */
  targetSize?: number;
  /**
   * Trim transparent/chroma padding from the whole sheet before dividing into a grid.
   * Needed when sprites sit in a large empty margin (e.g. 1536×1024 with a 4×3 walk cycle).
   */
  trimSheet?: boolean;
  /**
   * After slicing each cell, trim empty padding and fit the content inside targetSize
   * (aspect preserved, centered). Avoids squashing tall walk sprites into the tile.
   */
  trimFrames?: boolean;
};

/** Legacy tight sheets used a solid white matte; new sheets use real alpha. */
const DEFAULT_CHROMA = ["#FFFFFF"];
/** Target in-game frame size (matches TILE actor sprites). */
export const TARGET_FRAME = 28;

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function resolveChromas(chromaKey?: string | string[]): [number, number, number][] {
  const keys =
    chromaKey == null ? DEFAULT_CHROMA : Array.isArray(chromaKey) ? chromaKey : [chromaKey];
  return keys.map(parseHex);
}

function isChroma(
  r: number,
  g: number,
  b: number,
  cr: number,
  cg: number,
  cb: number,
  tolerance = 12,
): boolean {
  return (
    Math.abs(r - cr) <= tolerance && Math.abs(g - cg) <= tolerance && Math.abs(b - cb) <= tolerance
  );
}

function isEmptyPixel(
  r: number,
  g: number,
  b: number,
  a: number,
  chromas: [number, number, number][],
  alphaThresh = 10,
): boolean {
  if (a < alphaThresh) return true;
  return chromas.some(([cr, cg, cb]) => isChroma(r, g, b, cr, cg, cb));
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function sourceSize(source: CanvasImageSource): { w: number; h: number } {
  if (source instanceof HTMLImageElement) {
    return { w: source.naturalWidth || source.width, h: source.naturalHeight || source.height };
  }
  if (source instanceof HTMLCanvasElement) {
    return { w: source.width, h: source.height };
  }
  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
    return { w: source.width, h: source.height };
  }
  return { w: 0, h: 0 };
}

/** Infer frame size from sheet pixel size for a fixed column/row grid. */
export function layoutFromImage(
  source: CanvasImageSource,
  columns: number,
  rows: number,
): SpriteSheetLayout {
  const { w, h } = sourceSize(source);
  if (w <= 0 || h <= 0) {
    return {
      frameWidth: TARGET_FRAME,
      frameHeight: TARGET_FRAME,
      columns,
      rows,
    };
  }
  // Prefer exact division; otherwise use floor so oversized / padded sheets still slice.
  return {
    frameWidth: Math.max(1, Math.floor(w / columns)),
    frameHeight: Math.max(1, Math.floor(h / rows)),
    columns,
    rows,
  };
}

type Bounds = { x: number; y: number; w: number; h: number };

function contentBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  chromas: [number, number, number][],
): Bounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (isEmptyPixel(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!, chromas)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function applyChromaKey(data: Uint8ClampedArray, chromas: [number, number, number][]): void {
  for (let i = 0; i < data.length; i += 4) {
    if (isEmptyPixel(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!, chromas)) {
      data[i + 3] = 0;
    }
  }
}

function scaleNearest(source: HTMLCanvasElement, tw: number, th: number): HTMLCanvasElement {
  if (source.width === tw && source.height === th) return source;
  const { canvas, ctx } = createPixelCanvas(tw, th);
  ctx.drawImage(source, 0, 0, tw, th);
  return canvas;
}

/**
 * Trim empty padding from a frame and fit the content inside a square target
 * (uniform scale, centered). Falls back to a stretch fill when the frame is empty.
 */
export function trimAndFitFrame(
  source: HTMLCanvasElement,
  targetSize: number,
  chromas: [number, number, number][] = resolveChromas(),
): HTMLCanvasElement {
  const ctx = source.getContext("2d")!;
  const image = ctx.getImageData(0, 0, source.width, source.height);
  applyChromaKey(image.data, chromas);
  ctx.putImageData(image, 0, 0);

  const bounds = contentBounds(image.data, source.width, source.height, chromas);
  if (!bounds) {
    return scaleNearest(source, targetSize, targetSize);
  }

  const scale = Math.min(targetSize / bounds.w, targetSize / bounds.h);
  const dw = Math.max(1, Math.round(bounds.w * scale));
  const dh = Math.max(1, Math.round(bounds.h * scale));
  const { canvas, ctx: octx } = createPixelCanvas(targetSize, targetSize);
  octx.drawImage(
    source,
    bounds.x,
    bounds.y,
    bounds.w,
    bounds.h,
    Math.floor((targetSize - dw) / 2),
    Math.floor((targetSize - dh) / 2),
    dw,
    dh,
  );
  return canvas;
}

/** Slice a grid spritesheet into individual frame canvases (optionally scaled). */
export function sliceSpritesheet(
  source: CanvasImageSource,
  layout: SpriteSheetLayout,
  options?: SliceSpritesheetOptions,
): HTMLCanvasElement[] {
  const { columns, rows } = layout;
  const chromas = resolveChromas(options?.chromaKey);
  const target = options?.targetSize ?? TARGET_FRAME;
  const trimSheet = options?.trimSheet ?? false;
  const trimFrames = options?.trimFrames ?? false;

  const { w: srcW, h: srcH } = sourceSize(source);
  const sheet = document.createElement("canvas");
  sheet.width = Math.max(1, srcW);
  sheet.height = Math.max(1, srcH);
  const sctx = sheet.getContext("2d")!;
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(source, 0, 0);

  const full = sctx.getImageData(0, 0, sheet.width, sheet.height);
  applyChromaKey(full.data, chromas);
  sctx.putImageData(full, 0, 0);

  let originX = 0;
  let originY = 0;
  let gridW = sheet.width;
  let gridH = sheet.height;

  if (trimSheet) {
    const bounds = contentBounds(full.data, sheet.width, sheet.height, chromas);
    if (bounds) {
      // Small pad so tight content edges don't clip antialiased fringes.
      const pad = 2;
      originX = Math.max(0, bounds.x - pad);
      originY = Math.max(0, bounds.y - pad);
      const right = Math.min(sheet.width, bounds.x + bounds.w + pad);
      const bottom = Math.min(sheet.height, bounds.y + bounds.h + pad);
      gridW = Math.max(1, right - originX);
      gridH = Math.max(1, bottom - originY);
    }
  } else if (srcW % columns === 0 && srcH % rows === 0) {
    // Tight classic sheets (e.g. 112×84): use exact cell size from layout.
    gridW = layout.frameWidth * columns;
    gridH = layout.frameHeight * rows;
  }

  const frames: HTMLCanvasElement[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      // Float edges so sheets whose content size is not divisible by the grid still work.
      const x0 = originX + Math.floor((col * gridW) / columns);
      const x1 = originX + Math.floor(((col + 1) * gridW) / columns);
      const y0 = originY + Math.floor((row * gridH) / rows);
      const y1 = originY + Math.floor(((row + 1) * gridH) / rows);
      const fw = Math.max(1, x1 - x0);
      const fh = Math.max(1, y1 - y0);

      const { canvas, ctx } = createPixelCanvas(fw, fh);
      ctx.drawImage(sheet, x0, y0, fw, fh, 0, 0, fw, fh);

      if (trimFrames) {
        frames.push(trimAndFitFrame(canvas, target, chromas));
      } else {
        frames.push(scaleNearest(canvas, target, target));
      }
    }
  }
  return frames;
}

/**
 * Keep only unique frames (by pixel digest), preserving order.
 * Useful when a sheet repeats A-B-A-B across columns/rows.
 */
export function uniqueFrames(frames: HTMLCanvasElement[]): HTMLCanvasElement[] {
  const seen = new Set<string>();
  const out: HTMLCanvasElement[] = [];
  for (const frame of frames) {
    const ctx = frame.getContext("2d")!;
    const dig = ctx.getImageData(0, 0, frame.width, frame.height).data.join(",");
    if (seen.has(dig)) continue;
    seen.add(dig);
    out.push(frame);
  }
  return out.length > 0 ? out : frames;
}

/** Mirror a sprite canvas horizontally (for left-facing walk). */
export function flipCanvasX(source: HTMLCanvasElement): HTMLCanvasElement {
  const { canvas, ctx } = createPixelCanvas(source.width, source.height);
  ctx.translate(source.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, 0, 0);
  return canvas;
}
