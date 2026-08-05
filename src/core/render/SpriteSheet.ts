import { createPixelCanvas } from "./PixelArt";

export type SpriteSheetLayout = {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
};

const DEFAULT_CHROMA = "#FFFFFF";
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
  if (w <= 0 || h <= 0 || w % columns !== 0 || h % rows !== 0) {
    return {
      frameWidth: TARGET_FRAME,
      frameHeight: TARGET_FRAME,
      columns,
      rows,
    };
  }
  return {
    frameWidth: w / columns,
    frameHeight: h / rows,
    columns,
    rows,
  };
}

function scaleNearest(source: HTMLCanvasElement, tw: number, th: number): HTMLCanvasElement {
  if (source.width === tw && source.height === th) return source;
  const { canvas, ctx } = createPixelCanvas(tw, th);
  ctx.drawImage(source, 0, 0, tw, th);
  return canvas;
}

/** Slice a grid spritesheet into individual frame canvases (optionally scaled). */
export function sliceSpritesheet(
  source: CanvasImageSource,
  layout: SpriteSheetLayout,
  options?: { chromaKey?: string; targetSize?: number },
): HTMLCanvasElement[] {
  const { frameWidth, frameHeight, columns, rows } = layout;
  const chroma = options?.chromaKey ?? DEFAULT_CHROMA;
  const [cr, cg, cb] = parseHex(chroma);
  const target = options?.targetSize ?? TARGET_FRAME;

  const sheet = document.createElement("canvas");
  sheet.width = frameWidth * columns;
  sheet.height = frameHeight * rows;
  const sctx = sheet.getContext("2d")!;
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(source, 0, 0, sheet.width, sheet.height);

  const frames: HTMLCanvasElement[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const { canvas, ctx } = createPixelCanvas(frameWidth, frameHeight);
      const imageData = sctx.getImageData(
        col * frameWidth,
        row * frameHeight,
        frameWidth,
        frameHeight,
      );
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (isChroma(data[i]!, data[i + 1]!, data[i + 2]!, cr, cg, cb)) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      frames.push(scaleNearest(canvas, target, target));
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
