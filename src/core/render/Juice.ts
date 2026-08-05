import type { LoseReason } from "../types";

/** One-shot feedback events emitted by the session each tick. */
export type JuiceEvent =
  | { type: "catch"; x: number; y: number; ghostIndex: number }
  | { type: "bonus"; x: number; y: number; points: number }
  | { type: "bait"; x: number; y: number }
  | { type: "fail"; reason: LoseReason; x: number; y: number }
  | { type: "win"; x: number; y: number }
  | { type: "lift"; dir: "up" | "down"; x: number; y: number }
  | { type: "rift"; x: number; y: number }
  | { type: "fall"; x: number; y: number }
  | { type: "start" };

export class ScreenShake {
  private trauma = 0;
  private time = 0;

  add(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number): void {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - dt * 2.4);
  }

  /** Pixel offset applied when blitting the camera view. */
  offset(): { x: number; y: number } {
    if (this.trauma <= 0.01) return { x: 0, y: 0 };
    const mag = this.trauma * this.trauma * 5;
    const x = Math.round(Math.sin(this.time * 67) * mag);
    const y = Math.round(Math.cos(this.time * 59) * mag);
    return { x, y };
  }

  reset(): void {
    this.trauma = 0;
  }
}

export const CATCH_COLORS = ["#F4EDE0", "#E24A4A", "#3DFFB5", "#F0B429", "#FFF6C8"] as const;
export const BAIT_COLORS = ["#4B8CFF", "#7AA8FF", "#B8CCFF", "#3DFFB5"] as const;
export const BONUS_COLORS = ["#F0B429", "#FFE08A", "#FFF6C8", "#E28A1A"] as const;
export const ZAP_COLORS = ["#F0B429", "#7AD4FF", "#FFF6C8", "#E24A4A"] as const;
export const WIN_COLORS = ["#3DFFB5", "#F0B429", "#FFF6C8", "#1ECF8A", "#7AA8FF"] as const;
export const FAIL_COLORS = ["#E24A4A", "#F0B429", "#6A7480", "#B0B8C0"] as const;
export const RIFT_COLORS = ["#C45AD8", "#E8A0F0", "#8A30A8"] as const;
