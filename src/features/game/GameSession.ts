import type { Direction, GamePhase } from "../../core/types";
import type { LevelDefinition } from "../levels";
import { parseMaze } from "../../core/maze/LevelDefinition";
import { Maze } from "../../core/maze/Maze";
import { computeScore, type ScoreBreakdown } from "../../core/scoring/Score";
import { Player } from "../player/Player";
import { Ghost } from "../ghosts/Ghost";
import type { RenderableActor, HudSnapshot } from "../../core/render/CanvasRenderer";

export class GameSession {
  readonly level: LevelDefinition;
  maze: Maze;
  player: Player;
  ghosts: Ghost[];
  phase: GamePhase = "ready";
  elapsedSeconds = 0;
  finalScore: ScoreBreakdown | null = null;

  constructor(level: LevelDefinition) {
    this.level = level;
    const parsed = parseMaze(level.layout);
    this.maze = new Maze(parsed);
    this.player = new Player(parsed.playerStart, level.playerSpeed);
    this.ghosts = parsed.ghostStarts.map(
      (start, i) => new Ghost(start, level.ghostSpeed, i, level.ghostEatIntervalSeconds),
    );
  }

  start(): void {
    this.phase = "playing";
    this.elapsedSeconds = 0;
    this.finalScore = null;
  }

  restart(): void {
    const parsed = parseMaze(this.level.layout);
    this.maze = new Maze(parsed);
    this.player = new Player(parsed.playerStart, this.level.playerSpeed);
    this.ghosts = parsed.ghostStarts.map(
      (start, i) => new Ghost(start, this.level.ghostSpeed, i, this.level.ghostEatIntervalSeconds),
    );
    this.phase = "ready";
    this.elapsedSeconds = 0;
    this.finalScore = null;
  }

  update(dt: number, desiredDirection: Direction): void {
    if (this.phase === "paused") return;
    if (this.phase !== "playing" && this.phase !== "ready") return;

    if (this.phase === "ready" && desiredDirection !== "none") {
      this.start();
    }
    if (this.phase !== "playing") return;

    this.elapsedSeconds += dt;
    this.player.handleInput(desiredDirection);
    this.player.tick(dt, this.maze);

    for (const ghost of this.ghosts) {
      ghost.tick(dt, this.maze);
      if (this.player.overlaps(ghost)) {
        ghost.catch();
      }
    }

    if (this.maze.getDotsRemaining() === 0) {
      this.phase = "lost";
      this.finalScore = computeScore(0, this.elapsedSeconds, this.level);
      return;
    }

    const ghostsLeft = this.ghosts.filter((g) => g.alive).length;
    if (ghostsLeft === 0) {
      const atExit =
        this.player.col === this.maze.exit.col &&
        this.player.row === this.maze.exit.row &&
        this.player.progress < 0.15;

      if (atExit) {
        this.phase = "won";
        this.finalScore = computeScore(
          this.maze.getDotsRemaining(),
          this.elapsedSeconds,
          this.level,
        );
      }
    }
  }

  togglePause(): void {
    if (this.phase === "playing") this.phase = "paused";
    else if (this.phase === "paused") this.phase = "playing";
  }

  getActors(): RenderableActor[] {
    const actors: RenderableActor[] = [
      {
        kind: "player",
        worldPos: this.player.getWorldPos(),
        direction: this.player.direction === "none" ? "right" : this.player.direction,
        animFrame: this.player.animFrame,
        alive: this.player.alive,
      },
    ];

    for (const ghost of this.ghosts) {
      actors.push({
        kind: "ghost",
        ghostIndex: ghost.index,
        worldPos: ghost.getWorldPos(),
        direction: ghost.direction === "none" ? "left" : ghost.direction,
        animFrame: ghost.animFrame,
        alive: ghost.alive,
      });
    }

    return actors;
  }

  getHud(): HudSnapshot {
    const ghostsRemaining = this.ghosts.filter((g) => g.alive).length;
    const preview = computeScore(this.maze.getDotsRemaining(), this.elapsedSeconds, this.level);
    const score = this.finalScore ?? preview;

    return {
      phase: this.phase,
      dotsRemaining: this.maze.getDotsRemaining(),
      ghostsRemaining,
      elapsedSeconds: this.elapsedSeconds,
      score: score.total,
      timeBonus: score.timeBonus,
      levelName: this.level.name,
      allGhostsCaught: ghostsRemaining === 0,
    };
  }
}
