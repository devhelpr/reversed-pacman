import { describe, expect, it } from "vite-plus/test";
import { parseLevel } from "./LevelDefinition";

const layout = ["#####", "#P.E#", "#..G#", "#####"];

describe("parseLevel", () => {
  it("parses spawns, dimensions, and dots", () => {
    const parsed = parseLevel({
      id: "test-level",
      name: "Test level",
      layout,
      timeBonusLimitSeconds: 90,
      pointsPerDot: 10,
      pointsPerBonus: 50,
      maxTimeBonus: 1000,
      playerSpeed: 5.8,
      ghostSpeed: 2.35,
      ghostEatIntervalSeconds: 1.15,
      baitDurationSeconds: 4,
      huntSpeedMultiplier: 1.15,
      trapdoorClosedMinSeconds: 8,
      trapdoorClosedMaxSeconds: 14,
      trapdoorOpenMinSeconds: 1,
      trapdoorOpenMaxSeconds: 1.8,
      trapdoorFallDurationSeconds: 0.65,
      shockCycleSeconds: 4.5,
      slimeSpeedFactor: 0.58,
    });

    expect(parsed.floors[0]).toMatchObject({ width: 5, height: 4, initialDotCount: 3 });
    expect(parsed.playerStart).toEqual({ floor: 0, col: 1, row: 1 });
    expect(parsed.exit).toEqual({ floor: 0, col: 3, row: 1 });
    expect(parsed.ghostStarts).toEqual([{ floor: 0, col: 3, row: 2 }]);
    expect(parsed.initialDotCount).toBe(3);
  });

  it("rejects rows with different widths", () => {
    expect(() =>
      parseLevel({
        id: "invalid-level",
        name: "Invalid level",
        layout: ["#####", "#P.E#", "####"],
        timeBonusLimitSeconds: 90,
        pointsPerDot: 10,
        pointsPerBonus: 50,
        maxTimeBonus: 1000,
        playerSpeed: 5.8,
        ghostSpeed: 2.35,
        ghostEatIntervalSeconds: 1.15,
        baitDurationSeconds: 4,
        huntSpeedMultiplier: 1.15,
        trapdoorClosedMinSeconds: 8,
        trapdoorClosedMaxSeconds: 14,
        trapdoorOpenMinSeconds: 1,
        trapdoorOpenMaxSeconds: 1.8,
        trapdoorFallDurationSeconds: 0.65,
        shockCycleSeconds: 4.5,
        slimeSpeedFactor: 0.58,
      }),
    ).toThrow("all rows must have the same length");
  });
});
