import { describe, expect, it } from "vite-plus/test";
import { defaultLevelParams } from "../../features/levelDesigner/LevelJson";
import type { LevelDefinition } from "../maze/LevelDefinition";
import { computeScore } from "./Score";

const level: LevelDefinition = {
  id: "test-level",
  name: "Test level",
  layout: ["#####", "#P.E#", "#####"],
  ...defaultLevelParams(),
};

describe("computeScore", () => {
  it("combines dot, bonus, and time scores", () => {
    const result = computeScore(12, 30, level, 2);

    expect(result.dotScore).toBe(120);
    expect(result.bonusScore).toBe(100);
    expect(result.timeBonus).toBe(667);
    expect(result.total).toBe(887);
  });

  it("does not award a time bonus after the limit", () => {
    const result = computeScore(3, level.timeBonusLimitSeconds + 1, level);

    expect(result.timeBonus).toBe(0);
    expect(result.total).toBe(30);
  });
});
