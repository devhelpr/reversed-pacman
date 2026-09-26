import type { TileKind, Vec2 } from "../types";
import { FLOOR_VOID, WALL_FILL } from "./Sprites";

/** Draw only local wall geometry and the player, using tile-space camera bounds. */
export function drawMiniMap(
  ctx: CanvasRenderingContext2D,
  tiles: readonly (readonly TileKind[])[],
  view: { x: number; y: number; width: number; height: number },
  player: Vec2 | undefined,
): void {
  const rows = tiles.length;
  const cols = tiles[0]?.length ?? 0;
  if (!rows || !cols) return;

  // Keep a local crop even when a small level nearly fits the main view.
  const zoom = Math.min(1.5, Math.max((cols - 1) / view.width, (rows - 1) / view.height));
  if (zoom <= 1) return;
  const worldW = view.width * zoom;
  const worldH = view.height * zoom;
  const originX = Math.max(0, Math.min(view.x - (worldW - view.width) / 2, cols - worldW));
  const originY = Math.max(0, Math.min(view.y - (worldH - view.height) / 2, rows - worldH));
  const size = Math.min(180, Math.min(ctx.canvas.width, ctx.canvas.height) * 0.28);
  const scale = size / Math.max(worldW, worldH);
  const width = worldW * scale;
  const height = worldH * scale;
  const x = ctx.canvas.width - width - 10;
  const y = ctx.canvas.height - height - 10;

  ctx.save();
  ctx.fillStyle = FLOOR_VOID;
  ctx.fillRect(x, y, width, height);
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  for (let row = Math.floor(originY); row < Math.min(rows, originY + worldH); row++) {
    for (let col = Math.floor(originX); col < Math.min(cols, originX + worldW); col++) {
      ctx.fillStyle = tiles[row]![col] === "wall" ? WALL_FILL : FLOOR_VOID;
      const left = x + Math.round((col - originX) * scale);
      const top = y + Math.round((row - originY) * scale);
      ctx.fillRect(
        left,
        top,
        x + Math.round((col + 1 - originX) * scale) - left,
        y + Math.round((row + 1 - originY) * scale) - top,
      );
    }
  }
  if (player) {
    ctx.fillStyle = "#3DFFB5";
    const marker = Math.max(3, scale * 0.5);
    ctx.fillRect(
      x + (player.x - originX) * scale - marker / 2,
      y + (player.y - originY) * scale - marker / 2,
      marker,
      marker,
    );
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = WALL_FILL;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.restore();
}
