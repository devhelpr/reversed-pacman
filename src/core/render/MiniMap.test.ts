import { describe, expect, it, vi } from "vite-plus/test";
import type { TileKind } from "../types";
import { drawMiniMap } from "./MiniMap";

function context(width = 640, height = 480) {
  const fills: { color: string; bounds: number[] }[] = [];
  const ctx = {
    canvas: { width, height },
    fillStyle: "",
    fillRect(...bounds: number[]) {
      fills.push({ color: this.fillStyle, bounds });
    },
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    strokeRect: vi.fn(),
  };
  return { ctx, fills, canvasContext: ctx as unknown as CanvasRenderingContext2D };
}

const tiles = (width = 40, height = 30): TileKind[][] =>
  Array.from({ length: height }, () => Array<TileKind>(width).fill("path"));

describe("drawMiniMap", () => {
  it("shows a wider local crop in the bottom-right corner on desktop and mobile", () => {
    for (const [width, height] of [
      [640, 480],
      [320, 560],
    ]) {
      const { ctx, fills, canvasContext } = context(width, height);
      drawMiniMap(canvasContext, tiles(), { x: 10, y: 10, width: 8, height: 6 }, undefined);
      const [x, y, w, h] = ctx.rect.mock.calls[0] as number[];
      expect(x! + w!).toBeCloseTo(width! - 10);
      expect(y! + h!).toBeCloseTo(height! - 10);
      expect(w).toBeLessThanOrEqual(180);
      expect(w! / h!).toBeCloseTo(8 / 6);
      // 12 columns by 9 tile units (10 partially visible rows), not the entire 40x30 map.
      expect(fills.filter((fill) => fill.color === "#242c32")).toHaveLength(120);
      expect(ctx.clip).toHaveBeenCalledOnce();
    }
  });

  it("renders dots and every special cell exactly like an ordinary corridor", () => {
    const map = tiles();
    const kinds: TileKind[] = [
      "path",
      "dot",
      "exit",
      "bait",
      "trapdoor",
      "slime",
      "shock",
      "rift",
      "bonus",
      "liftUp",
      "liftDown",
    ];
    map[0]!.splice(0, kinds.length, ...kinds);
    map[1]![0] = "wall";
    const { fills, canvasContext } = context();
    drawMiniMap(canvasContext, map, { x: 0, y: 0, width: 8, height: 6 }, undefined);
    expect(fills.slice(1, 12).map((fill) => fill.color)).toEqual(kinds.map(() => "#242c32"));
    expect(fills.filter((fill) => fill.color === "#6a5a48")).toHaveLength(1);
  });

  it("follows the camera to the map edge and keeps the player marker within the crop", () => {
    const map = tiles();
    map[29]![39] = "wall";
    const { ctx, fills, canvasContext } = context();
    drawMiniMap(canvasContext, map, { x: 32, y: 24, width: 8, height: 6 }, { x: 39.5, y: 29.5 });
    expect(fills.filter((fill) => fill.color === "#6a5a48")).toHaveLength(1);
    const marker = fills.find((fill) => fill.color === "#3DFFB5")!;
    const [x, y, w, h] = ctx.rect.mock.calls[0] as number[];
    expect(marker.bounds[0]).toBeGreaterThan(x!);
    expect(marker.bounds[1]).toBeGreaterThan(y!);
    expect(marker.bounds[0]! + marker.bounds[2]!).toBeLessThan(x! + w!);
    expect(marker.bounds[1]! + marker.bounds[3]!).toBeLessThan(y! + h!);
  });

  it("does not reveal an entire small map or add a map when the main view already fits it", () => {
    const { fills, canvasContext } = context();
    drawMiniMap(canvasContext, tiles(10, 8), { x: 0, y: 0, width: 8, height: 6 }, undefined);
    expect(fills.length).toBeLessThan(1 + 10 * 8);
    const full = context();
    drawMiniMap(full.canvasContext, tiles(8, 6), { x: 0, y: 0, width: 8, height: 6 }, undefined);
    expect(full.fills).toHaveLength(0);
  });
});
