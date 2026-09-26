import { describe, expect, it } from "vite-plus/test";
import { parseLevel } from "../../core/maze/LevelDefinition";
import { GameSession } from "../game/GameSession";
import { level3 } from "./level3";

describe("Foundry Depths", () => {
  it("has three connected floors and aggressive alien spawns", () => {
    const parsed = parseLevel(level3);

    expect(parsed.floors).toHaveLength(3);
    expect(parsed.aggressiveAlienStarts.length).toBeGreaterThan(0);
    expect(parsed.aggressiveAlienStarts.map(({ floor }) => floor)).toEqual([0, 1, 1, 2]);
  });

  it("creates aggressive aliens that make contact lethal", () => {
    const session = new GameSession(level3);
    const alien = session.ghosts.find((enemy) => enemy.aggressive)!;

    expect(alien).toBeDefined();
    session.player.floor = alien.floor;
    session.player.col = alien.col;
    session.player.row = alien.row;
    session.start();
    session.update(0, "none");

    expect(session.phase).toBe("lost");
    expect(session.loseReason).toBe("ghost");
  });
});
