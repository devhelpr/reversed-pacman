import { describe, expect, it } from "vite-plus/test";
import { defaultLevelParams, parseImportJson, toExportJson, validateLevel } from "./LevelJson";
import type { LevelDefinition } from "../../core/maze/LevelDefinition";

const level: LevelDefinition = {
  id: "custom-test",
  name: "Custom test",
  layout: ["#####", "#P.E#", "#..G#", "#####"],
  ...defaultLevelParams(),
};

describe("level JSON", () => {
  it("round-trips a level through the export envelope", () => {
    const imported = parseImportJson(toExportJson(level));

    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject({
      id: level.id,
      name: level.name,
      layout: level.layout,
      floors: [{ id: "floor-0", name: "Floor 1", layout: level.layout }],
    });
  });

  it("reports invalid trap-door ranges", () => {
    const invalid = {
      ...level,
      trapdoorClosedMinSeconds: 15,
      trapdoorClosedMaxSeconds: 10,
    };

    expect(validateLevel(invalid)).toContain("Trap door closed min must be ≤ max");
  });
});
