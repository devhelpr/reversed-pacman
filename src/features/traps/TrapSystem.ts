import type { LevelDefinition, FloorPos } from "../../core/maze/LevelDefinition";
import type { Maze } from "../../core/maze/Maze";
import type { TrapdoorVisual, TrapVisualState } from "../../core/render/CanvasRenderer";
import type { GridPos, LoseReason } from "../../core/types";
import type { Player } from "../player/Player";

export type { TrapVisualState };

interface TrapdoorState {
  floor: number;
  col: number;
  row: number;
  open: boolean;
  timer: number;
  openAmount: number;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function posKey(floor: number, col: number, row: number): string {
  return `${floor}:${col},${row}`;
}

/**
 * Timed hazards + player interactions with bait, slime, rifts, lifts, etc.
 */
export class TrapSystem {
  private readonly level: LevelDefinition;
  private time = 0;
  private lastRiftKey: string | null = null;
  private readonly doors = new Map<string, TrapdoorState>();

  constructor(level: LevelDefinition, trapdoorPositions: FloorPos[]) {
    this.level = level;
    this.seedDoors(trapdoorPositions);
  }

  reset(trapdoorPositions: FloorPos[]): void {
    this.time = 0;
    this.lastRiftKey = null;
    this.doors.clear();
    this.seedDoors(trapdoorPositions);
  }

  private seedDoors(trapdoorPositions: FloorPos[]): void {
    for (const pos of trapdoorPositions) {
      this.doors.set(posKey(pos.floor, pos.col, pos.row), {
        floor: pos.floor,
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
    const openSpeed = 2.2;
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

  /** Visuals for a single visible floor. */
  getVisualState(floor: number): TrapVisualState {
    const trapdoors: TrapdoorVisual[] = [];
    for (const door of this.doors.values()) {
      if (door.floor !== floor) continue;
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

  isTrapdoorLethal(floor: number, col: number, row: number): boolean {
    const door = this.doors.get(posKey(floor, col, row));
    return !!door && door.openAmount >= 0.55;
  }

  areShocksLive(): boolean {
    const cycle = this.level.shockCycleSeconds * 2;
    return this.time % cycle >= this.level.shockCycleSeconds;
  }

  resolvePlayerTile(player: Player, maze: Maze, justArrived: boolean): LoseReason {
    if (player.isFalling) return null;

    const tile = maze.getTile(player.floor, player.col, player.row);

    if (tile === "slime") {
      player.speedMultiplier = this.level.slimeSpeedFactor;
    } else {
      player.speedMultiplier = 1;
    }

    if (tile === "bait" && maze.eatBait(player.floor, player.col, player.row)) {
      player.activateBait(this.level.baitDurationSeconds);
    }

    if (tile === "trapdoor" && this.isTrapdoorLethal(player.floor, player.col, player.row)) {
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
    const key = `${player.floor}:${player.col},${player.row}`;
    if (this.lastRiftKey === key) return;

    const dest = maze.pairedRift(player.floor, { col: player.col, row: player.row });
    if (!dest) return;

    player.col = dest.col;
    player.row = dest.row;
    player.progress = 0;
    player.direction = "none";
    this.lastRiftKey = `${player.floor}:${dest.col},${dest.row}`;
  }
}

export function manhattan(a: GridPos, b: GridPos): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}
