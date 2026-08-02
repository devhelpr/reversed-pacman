import type { MazeChar } from "../../core/maze/LevelDefinition";
import { getCell, setCell } from "./LevelJson";
import { brushColor } from "./Palette";

const CELL = 18;

/**
 * Click/drag maze painter for the level designer.
 */
export class DesignerCanvas {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private layout: string[] = [];
  private brush: MazeChar = "#";
  private painting = false;
  private onChange: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointerleave", this.onPointerUp);
  }

  setLayout(layout: string[]): void {
    this.layout = layout;
    this.redraw();
  }

  setBrush(brush: MazeChar): void {
    this.brush = brush;
  }

  setOnChange(fn: () => void): void {
    this.onChange = fn;
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.painting = true;
    this.canvas.setPointerCapture(event.pointerId);
    this.paintAtEvent(event);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.painting) return;
    this.paintAtEvent(event);
  };

  private onPointerUp = (): void => {
    this.painting = false;
  };

  private paintAtEvent(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const col = Math.floor(((event.clientX - rect.left) * scaleX) / CELL);
    const row = Math.floor(((event.clientY - rect.top) * scaleY) / CELL);
    this.paintCell(col, row, event.buttons === 2 ? "." : this.brush);
  }

  private paintCell(col: number, row: number, brush: MazeChar): void {
    if (row < 0 || row >= this.layout.length) return;
    const width = this.layout[0]?.length ?? 0;
    if (col < 0 || col >= width) return;
    if (getCell(this.layout, col, row) === brush) return;

    // Unique player / exit
    if (brush === "P" || brush === "E") {
      for (let r = 0; r < this.layout.length; r++) {
        for (let c = 0; c < width; c++) {
          if (getCell(this.layout, c, r) === brush) {
            setCell(this.layout, c, r, ".");
          }
        }
      }
    }

    setCell(this.layout, col, row, brush);
    this.redraw();
    this.onChange?.();
  }

  private redraw(): void {
    const height = this.layout.length;
    const width = this.layout[0]?.length ?? 0;
    this.canvas.width = width * CELL;
    this.canvas.height = height * CELL;

    const ctx = this.ctx;
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const ch = getCell(this.layout, col, row);
        const x = col * CELL;
        const y = row * CELL;
        ctx.fillStyle = "#0A0A1A";
        ctx.fillRect(x, y, CELL, CELL);
        ctx.fillStyle = brushColor(ch);
        if (ch === "." || ch === "o" || ch === "*") {
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, ch === "o" ? 5 : ch === "*" ? 5 : 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (ch === " ") {
          // empty path — leave dark
        } else if (ch === "#") {
          ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        } else {
          ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
          ctx.font = "10px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#fff";
          ctx.fillText(ch, x + CELL / 2, y + CELL / 2 + 0.5);
        }
        ctx.strokeStyle = "#1a1a30";
        ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      }
    }
  }
}
