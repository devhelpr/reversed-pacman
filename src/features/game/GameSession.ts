import type { Direction, GamePhase, LoseReason } from "../../core/types";
import type { LevelDefinition } from "../levels";
import { parseLevel } from "../../core/maze/LevelDefinition";
import { Maze } from "../../core/maze/Maze";
import { computeScore, type ScoreBreakdown } from "../../core/scoring/Score";
import { Player } from "../player/Player";
import { Ghost } from "../ghosts/Ghost";
import type {
  RenderableActor,
  HudSnapshot,
  TrapVisualState,
} from "../../core/render/CanvasRenderer";
import { TrapSystem } from "../traps/TrapSystem";

export class GameSession {
  readonly level: LevelDefinition;
  maze: Maze;
  player: Player;
  ghosts: Ghost[];
  traps: TrapSystem;
  phase: GamePhase = "ready";
  elapsedSeconds = 0;
  bonusCollected = 0;
  finalScore: ScoreBreakdown | null = null;
  loseReason: LoseReason = null;

  constructor(level: LevelDefinition) {
    this.level = level;
    const parsed = parseLevel(level);
    this.maze = new Maze(parsed);
    this.traps = new TrapSystem(level, this.maze.allTrapdoorPositions());
    this.player = new Player(parsed.playerStart, level.playerSpeed);
    this.ghosts = parsed.ghostStarts.map(
      (start, i) => new Ghost(start, level.ghostSpeed, i, level.ghostEatIntervalSeconds),
    );
  }

  start(): void {
    this.phase = "playing";
    this.elapsedSeconds = 0;
    this.bonusCollected = 0;
    this.finalScore = null;
    this.loseReason = null;
  }

  restart(): void {
    const parsed = parseLevel(this.level);
    this.maze = new Maze(parsed);
    this.player = new Player(parsed.playerStart, this.level.playerSpeed);
    this.ghosts = parsed.ghostStarts.map(
      (start, i) => new Ghost(start, this.level.ghostSpeed, i, this.level.ghostEatIntervalSeconds),
    );
    this.traps = new TrapSystem(this.level, this.maze.allTrapdoorPositions());
    this.start();
  }

  update(dt: number, desiredDirection: Direction, startRequested = false): void {
    if (this.phase === "paused") return;
    if (this.phase !== "playing" && this.phase !== "ready") return;

    if (this.phase === "ready" && (startRequested || desiredDirection !== "none")) {
      this.start();
    }
    if (this.phase !== "playing") return;

    this.elapsedSeconds += dt;
    this.traps.tick(dt);

    if (this.player.isFalling) {
      this.player.tick(dt, this.maze);
      if (!this.player.alive) {
        this.fail("trapdoor");
      }
      return;
    }

    if (this.player.isLifting) {
      this.player.tick(dt, this.maze);
      return;
    }

    this.player.handleInput(desiredDirection);
    const arrived = this.player.tick(dt, this.maze);

    const hazard = this.traps.resolvePlayerTile(this.player, this.maze, arrived);
    if (this.maze.eatBonus(this.player.floor, this.player.col, this.player.row)) {
      this.bonusCollected += 1;
    }
    this.player.tryLift(this.maze, arrived);

    if (hazard === "trapdoor") {
      this.player.beginFall(this.level.trapdoorFallDurationSeconds);
      return;
    }
    if (hazard) {
      this.fail(hazard);
      return;
    }

    const huntTarget = this.player.isHunted
      ? { floor: this.player.floor, col: this.player.col, row: this.player.row }
      : null;

    for (const ghost of this.ghosts) {
      ghost.tick(dt, this.maze, huntTarget, this.level.huntSpeedMultiplier);
      if (!this.player.overlaps(ghost)) continue;

      if (this.player.isHunted) {
        this.fail("ghost");
        return;
      }
      ghost.catch();
    }

    if (this.maze.getDotsRemaining() === 0) {
      this.fail("dots");
      return;
    }

    const ghostsLeft = this.ghosts.filter((g) => g.alive).length;
    if (ghostsLeft === 0) {
      const atExit =
        this.player.floor === this.maze.exit.floor &&
        this.player.col === this.maze.exit.col &&
        this.player.row === this.maze.exit.row &&
        this.player.progress < 0.15;

      if (atExit) {
        this.phase = "won";
        this.finalScore = this.scoreNow();
      }
    }
  }

  togglePause(): void {
    if (this.phase === "playing") this.phase = "paused";
    else if (this.phase === "paused") this.phase = "playing";
  }

  getTrapVisuals(): TrapVisualState {
    return this.traps.getVisualState(this.getViewFloor());
  }

  getViewFloor(): number {
    if (this.player.isLifting && this.player.liftProgress < 0.5) {
      return this.player.liftFromFloor;
    }
    return this.player.floor;
  }

  getLiftTransition(): { progress: number; dir: "up" | "down" } | null {
    if (!this.player.isLifting || !this.player.liftDir) return null;
    return { progress: this.player.liftProgress, dir: this.player.liftDir };
  }

  getActors(): RenderableActor[] {
    const viewFloor = this.getViewFloor();
    const hunted = this.player.isHunted;
    const falling = this.player.isFalling;
    const lifting = this.player.isLifting;
    const actors: RenderableActor[] = [
      {
        kind: "player",
        worldPos: this.player.getWorldPos(),
        direction: this.player.direction === "none" ? "right" : this.player.direction,
        animFrame: this.player.animFrame,
        alive: this.player.alive || falling || lifting,
        hunted,
        fallProgress: falling ? this.player.fallProgress : undefined,
        liftProgress: lifting ? this.player.liftProgress : undefined,
        liftDir: lifting ? (this.player.liftDir ?? undefined) : undefined,
      },
    ];

    for (const ghost of this.ghosts) {
      if (ghost.floor !== viewFloor) continue;
      actors.push({
        kind: "ghost",
        ghostIndex: ghost.index,
        worldPos: ghost.getWorldPos(),
        direction: ghost.direction === "none" ? "left" : ghost.direction,
        animFrame: ghost.animFrame,
        alive: ghost.alive,
        hunting: ghost.mood === "hunt",
      });
    }

    return actors;
  }

  getHud(): HudSnapshot {
    const ghostsRemaining = this.ghosts.filter((g) => g.alive).length;
    const score = this.finalScore ?? this.scoreNow();

    return {
      phase: this.phase,
      dotsRemaining: this.maze.getDotsRemaining(),
      ghostsRemaining,
      elapsedSeconds: this.elapsedSeconds,
      score: score.total,
      timeBonus: score.timeBonus,
      bonusScore: score.bonusScore,
      bonusCollected: score.bonusCollected,
      levelName: this.level.name,
      allGhostsCaught: ghostsRemaining === 0,
      baitRemaining: this.player.baitRemaining,
      loseReason: this.loseReason,
      floorName: this.maze.getFloorName(this.player.floor),
      floorIndex: this.player.floor,
      floorCount: this.maze.floorCount,
    };
  }

  private scoreNow(): ScoreBreakdown {
    return computeScore(
      this.maze.getDotsRemaining(),
      this.elapsedSeconds,
      this.level,
      this.bonusCollected,
    );
  }

  private fail(reason: LoseReason): void {
    this.phase = "lost";
    this.loseReason = reason;
    this.player.kill();
    this.finalScore = this.scoreNow();
  }
}
