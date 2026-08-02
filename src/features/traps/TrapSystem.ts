import type { LevelDefinition } from "../../core/maze/LevelDefinition";
import type { Maze } from "../../core/maze/Maze";
import type { TrapdoorVisual, TrapVisualState } from "../../core/render/CanvasRenderer";
import type { GridPos, LoseReason } from "../../core/types";
import type { Player } from "../player/Player";

export type { TrapVisualState };

interface TrapdoorState {
  col: number;
  row: number;
  open: boolean;
  /** Seconds until the next open/close toggle. */
  timer: number;
  /** 0 closed → 1 fully open (animated hatch). */
  openAmount: number;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function posKey(col: number, row: number): string {
  return `${col},${row}`;
}

/**
 * Timed hazards + player interactions with bait, slime, rifts, etc.
 * Trap doors are independent, randomized, and open more slowly than they close.
 */
export class TrapSystem {
  private readonly level: LevelDefinition;
  private time = 0;
  private lastRiftKey: string | null = null;
  private readonly doors = new Map<string, TrapdoorState>();

  constructor(level: LevelDefinition, trapdoorPositions: GridPos[]) {
    this.level = level;
    for (const pos of trapdoorPositions) {
      this.doors.set(posKey(pos.col, pos.row), {
        col: pos.col,
        row: pos.row,
        open: false,
        // Stagger first openings so they don't all pop at once
        timer: randomBetween(level.trapdoorClosedMinSeconds * 0.6, level.trapdoorClosedMaxSeconds),
        openAmount: 0,
      });
    }
  }

  reset(trapdoorPositions: GridPos[]): void {
    this.time = 0;
    this.lastRiftKey = null;
    this.doors.clear();
    for (const pos of trapdoorPositions) {
      this.doors.set(posKey(pos.col, pos.row), {
        col: pos.col,
        row: pos.row,
        open: false,
        timer: randomBetween(
          this.level.trapdoorClosedMinSeconds * 0.6,
          this.level.trapdoorClosedMaxSeconds,
        ),
        openAmount: 0,
      });
    }
  }

  tick(dt: number): void {
    this.time += dt;
    const openSpeed = 2.2; // hatch open lerp per second
    const closeSpeed = 3.4;

    for (const door of this.doors.values()) {
      door.timer -= dt;
      if (door.timer <= 0) {
        door.open = !door.open;
        door.timer = door.open
          ? randomBetween(this.level.trapdoorOpenMinSeconds, this.level.trapdoorOpenMaxSeconds)
          : randomBetween(this.level.trapdoorClosedMinSeconds, this.level.trapdoorClosedMaxSeconds);
      }

      const target = door.open ? 1 : 0;
      const speed = door.open ? openSpeed : closeSpeed;
      if (door.openAmount < target) {
        door.openAmount = Math.min(1, door.openAmount + speed * dt);
      } else if (door.openAmount > target) {
        door.openAmount = Math.max(0, door.openAmount - speed * dt);
      }
    }
  }

  getVisualState(): TrapVisualState {
    const trapdoors: TrapdoorVisual[] = [];
    for (const door of this.doors.values()) {
      trapdoors.push({
        col: door.col,
        row: door.row,
        openAmount: door.openAmount,
      });
    }
    return {
      trapdoors,
      shocksLive: this.areShocksLive(),
      animPhase: this.time,
    };
  }

  isTrapdoorLethal(col: number, row: number): boolean {
    const door = this.doors.get(posKey(col, row));
    // Only deadly once the hatch has mostly dropped open
    return !!door && door.openAmount >= 0.55;
  }

  areShocksLive(): boolean {
    const cycle = this.level.shockCycleSeconds * 2;
    return this.time % cycle >= this.level.shockCycleSeconds;
  }

  /**
   * Apply tile interactions for the player's current cell.
   * Returns a lose reason if a hazard kills the player instantly.
   * Trap doors return "trapdoor" so the session can play a fall animation.
   */
  resolvePlayerTile(player: Player, maze: Maze, justArrived: boolean): LoseReason {
    if (player.isFalling) return null;

    const tile = maze.getTile(player.col, player.row);

    if (tile === "slime") {
      player.speedMultiplier = this.level.slimeSpeedFactor;
    } else {
      player.speedMultiplier = 1;
    }

    if (tile === "bait" && maze.eatBait(player.col, player.row)) {
      player.activateBait(this.level.baitDurationSeconds);
    }

    if (tile === "trapdoor" && this.isTrapdoorLethal(player.col, player.row)) {
      return "trapdoor";
    }

    if (tile === "shock" && this.areShocksLive()) {
      return "shock";
    }

    if (tile === "rift" && justArrived) {
      this.tryTeleport(player, maze);
    } else if (tile !== "rift") {
      this.lastRiftKey = null;
    }

    return null;
  }

  private tryTeleport(player: Player, maze: Maze): void {
    const key = `${player.col},${player.row}`;
    if (this.lastRiftKey === key) return;

    const dest = maze.pairedRift({ col: player.col, row: player.row });
    if (!dest) return;

    player.col = dest.col;
    player.row = dest.row;
    player.progress = 0;
    player.direction = "none";
    this.lastRiftKey = `${dest.col},${dest.row}`;
  }
}

export function manhattan(a: GridPos, b: GridPos): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}
