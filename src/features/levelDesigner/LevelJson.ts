import type { LevelDefinition, MazeChar } from "../../core/maze/LevelDefinition";
import { parseMaze } from "../../core/maze/LevelDefinition";

export const LEVEL_JSON_FORMAT = "reversed-pacman-level";
export const LEVELS_JSON_FORMAT = "reversed-pacman-levels";
export const LEVEL_JSON_VERSION = 1;

export const BUILTIN_LEVEL_IDS = new Set(["level-1"]);

/** Default gameplay knobs for newly created custom levels. */
export function defaultLevelParams(): Omit<LevelDefinition, "id" | "name" | "layout"> {
  return {
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
    trapdoorOpenMinSeconds: 1.0,
    trapdoorOpenMaxSeconds: 1.8,
    trapdoorFallDurationSeconds: 0.65,
    shockCycleSeconds: 4.5,
    slimeSpeedFactor: 0.58,
  };
}

export function createBlankLayout(width: number, height: number): string[] {
  const w = Math.max(5, Math.min(40, Math.floor(width)));
  const h = Math.max(5, Math.min(40, Math.floor(height)));
  const rows: string[] = [];
  for (let row = 0; row < h; row++) {
    if (row === 0 || row === h - 1) {
      rows.push("#".repeat(w));
      continue;
    }
    const cells = Array.from({ length: w }, (_, col) => (col === 0 || col === w - 1 ? "#" : "."));
    rows.push(cells.join(""));
  }

  // Place defaults near bottom-center
  const mid = Math.floor(w / 2);
  const spawnRow = h - 3;
  setCell(rows, mid, spawnRow, "P");
  setCell(rows, w - 2, spawnRow, "E");
  setCell(rows, 2, 2, "G");
  return rows;
}

export function createEmptyCustomLevel(name = "Custom Level"): LevelDefinition {
  return {
    id: `custom-${crypto.randomUUID()}`,
    name,
    layout: createBlankLayout(21, 21),
    ...defaultLevelParams(),
  };
}

export function setCell(layout: string[], col: number, row: number, ch: MazeChar): void {
  const line = layout[row];
  if (!line || col < 0 || col >= line.length) return;
  layout[row] = line.slice(0, col) + ch + line.slice(col + 1);
}

export function getCell(layout: string[], col: number, row: number): MazeChar {
  return (layout[row]?.[col] ?? "#") as MazeChar;
}

/** Soft validation used by the designer before save / play. */
export function validateLevel(level: LevelDefinition): string[] {
  const errors: string[] = [];
  try {
    parseMaze(level.layout);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }
  if (!level.name.trim()) errors.push("Level needs a name");
  if (!level.id.trim()) errors.push("Level needs an id");
  if (level.trapdoorClosedMinSeconds > level.trapdoorClosedMaxSeconds) {
    errors.push("Trap door closed min must be ≤ max");
  }
  if (level.trapdoorOpenMinSeconds > level.trapdoorOpenMaxSeconds) {
    errors.push("Trap door open min must be ≤ max");
  }
  return errors;
}

export function cloneLevel(level: LevelDefinition): LevelDefinition {
  return {
    ...level,
    layout: [...level.layout],
  };
}

export interface LevelExportEnvelope {
  format: typeof LEVEL_JSON_FORMAT | typeof LEVELS_JSON_FORMAT;
  version: number;
  exportedAt: string;
  levels: LevelDefinition[];
}

export function toExportJson(levels: LevelDefinition | LevelDefinition[]): string {
  const list = Array.isArray(levels) ? levels : [levels];
  const envelope: LevelExportEnvelope = {
    format: list.length === 1 ? LEVEL_JSON_FORMAT : LEVELS_JSON_FORMAT,
    version: LEVEL_JSON_VERSION,
    exportedAt: new Date().toISOString(),
    levels: list.map(cloneLevel),
  };
  return JSON.stringify(envelope, null, 2);
}

export function parseImportJson(raw: string): LevelDefinition[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }

  if (Array.isArray(data)) {
    return data.map((item, i) => coerceLevel(item, `levels[${i}]`));
  }

  if (!data || typeof data !== "object") {
    throw new Error("JSON must be a level object or export envelope");
  }

  const obj = data as Record<string, unknown>;

  if (obj.format === LEVEL_JSON_FORMAT || obj.format === LEVELS_JSON_FORMAT) {
    const levels = obj.levels;
    if (!Array.isArray(levels) || levels.length === 0) {
      // Single-level shorthand: { format, level: {...} }
      if (obj.level && typeof obj.level === "object") {
        return [coerceLevel(obj.level, "level")];
      }
      throw new Error("Export file has no levels");
    }
    return levels.map((item, i) => coerceLevel(item, `levels[${i}]`));
  }

  // Bare LevelDefinition
  return [coerceLevel(obj, "level")];
}

function coerceLevel(value: unknown, label: string): LevelDefinition {
  if (!value || typeof value !== "object") {
    throw new Error(`${label} is not an object`);
  }
  const v = value as Record<string, unknown>;
  const defaults = defaultLevelParams();

  if (typeof v.id !== "string" || !v.id.trim()) {
    throw new Error(`${label}.id must be a non-empty string`);
  }
  if (typeof v.name !== "string") {
    throw new Error(`${label}.name must be a string`);
  }
  if (!Array.isArray(v.layout) || v.layout.length === 0) {
    throw new Error(`${label}.layout must be a non-empty string array`);
  }
  if (!v.layout.every((row) => typeof row === "string")) {
    throw new Error(`${label}.layout rows must be strings`);
  }

  const level: LevelDefinition = {
    id: v.id.trim(),
    name: v.name,
    layout: v.layout as string[],
    timeBonusLimitSeconds: num(v.timeBonusLimitSeconds, defaults.timeBonusLimitSeconds),
    pointsPerDot: num(v.pointsPerDot, defaults.pointsPerDot),
    pointsPerBonus: num(v.pointsPerBonus, defaults.pointsPerBonus),
    maxTimeBonus: num(v.maxTimeBonus, defaults.maxTimeBonus),
    playerSpeed: num(v.playerSpeed, defaults.playerSpeed),
    ghostSpeed: num(v.ghostSpeed, defaults.ghostSpeed),
    ghostEatIntervalSeconds: num(v.ghostEatIntervalSeconds, defaults.ghostEatIntervalSeconds),
    baitDurationSeconds: num(v.baitDurationSeconds, defaults.baitDurationSeconds),
    huntSpeedMultiplier: num(v.huntSpeedMultiplier, defaults.huntSpeedMultiplier),
    trapdoorClosedMinSeconds: num(v.trapdoorClosedMinSeconds, defaults.trapdoorClosedMinSeconds),
    trapdoorClosedMaxSeconds: num(v.trapdoorClosedMaxSeconds, defaults.trapdoorClosedMaxSeconds),
    trapdoorOpenMinSeconds: num(v.trapdoorOpenMinSeconds, defaults.trapdoorOpenMinSeconds),
    trapdoorOpenMaxSeconds: num(v.trapdoorOpenMaxSeconds, defaults.trapdoorOpenMaxSeconds),
    trapdoorFallDurationSeconds: num(
      v.trapdoorFallDurationSeconds,
      defaults.trapdoorFallDurationSeconds,
    ),
    shockCycleSeconds: num(v.shockCycleSeconds, defaults.shockCycleSeconds),
    slimeSpeedFactor: num(v.slimeSpeedFactor, defaults.slimeSpeedFactor),
  };

  const errors = validateLevel(level);
  if (errors.length > 0) {
    throw new Error(`${label}: ${errors.join("; ")}`);
  }
  return level;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function downloadJson(filename: string, json: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function pickJsonFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }
      try {
        resolve(await file.text());
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}
