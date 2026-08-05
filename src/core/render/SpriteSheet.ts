import { createPixelCanvas } from "./PixelArt";

export type SpriteSheetLayout = {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
};

const DEFAULT_CHROMA = "#FFFFFF";

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

function isChroma(r: number, g: number, b: number, cr: number, cg: number, cb: number): boolean {
  return r === cr && g === cg && b === cb;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/** Slice a grid spritesheet into individual frame canvases. */
export function sliceSpritesheet(
  source: CanvasImageSource,
  layout: SpriteSheetLayout,
  options?: { chromaKey?: string },
): HTMLCanvasElement[] {
  const { frameWidth, frameHeight, columns, rows } = layout;
  const chroma = options?.chromaKey ?? DEFAULT_CHROMA;
  const [cr, cg, cb] = parseHex(chroma);

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
      frames.push(canvas);
    }
  }
  return frames;
}

/** Mirror a sprite canvas horizontally (for left-facing walk). */
export function flipCanvasX(source: HTMLCanvasElement): HTMLCanvasElement {
  const { canvas, ctx } = createPixelCanvas(source.width, source.height);
  ctx.translate(source.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, 0, 0);
  return canvas;
}
