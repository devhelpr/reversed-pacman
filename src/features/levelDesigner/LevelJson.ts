import type { FloorDefinition, LevelDefinition, MazeChar } from "../../core/maze/LevelDefinition";
import { normalizeFloors, parseLevel, syncLayoutFromFloors } from "../../core/maze/LevelDefinition";

export const LEVEL_JSON_FORMAT = "reversed-pacman-level";
export const LEVELS_JSON_FORMAT = "reversed-pacman-levels";
export const LEVEL_JSON_VERSION = 1;

export const BUILTIN_LEVEL_IDS = new Set(["level-1", "level-2"]);

/** Default gameplay knobs for newly created custom levels. */
export function defaultLevelParams(): Omit<LevelDefinition, "id" | "name" | "layout" | "floors"> {
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

/** Bordered maze filled with dots — no spawns (for extra floors). */
export function createBlankFloorLayout(width: number, height: number): string[] {
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
  return rows;
}

export function createBlankLayout(width: number, height: number): string[] {
  const rows = createBlankFloorLayout(width, height);
  const w = rows[0]!.length;
  const h = rows.length;

  // Place defaults near bottom-center
  const mid = Math.floor(w / 2);
  const spawnRow = h - 3;
  setCell(rows, mid, spawnRow, "P");
  setCell(rows, w - 2, spawnRow, "E");
  setCell(rows, 2, 2, "G");
  return rows;
}

export function clearCharFromLayout(layout: string[], ch: MazeChar): void {
  for (let row = 0; row < layout.length; row++) {
    for (let col = 0; col < (layout[row]?.length ?? 0); col++) {
      if (getCell(layout, col, row) === ch) {
        setCell(layout, col, row, ".");
      }
    }
  }
}

export function createEmptyCustomLevel(name = "Custom Level"): LevelDefinition {
  const layout = createBlankLayout(21, 21);
  return {
    id: `custom-${crypto.randomUUID()}`,
    name,
    layout,
    floors: [{ id: "floor-0", name: "Floor 1", layout: [...layout] }],
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
    parseLevel(level);
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
  const floors = normalizeFloors(level).map((f) => ({
    ...f,
    layout: [...f.layout],
  }));
  return {
    ...level,
    layout: [...floors[0]!.layout],
    floors,
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

  let floors: FloorDefinition[] | undefined;
  if (Array.isArray(v.floors) && v.floors.length > 0) {
    floors = v.floors.map((raw, i) => coerceFloor(raw, `${label}.floors[${i}]`, i));
  }

  let layout: string[];
  if (floors) {
    layout = [...floors[0]!.layout];
  } else if (
    Array.isArray(v.layout) &&
    v.layout.length > 0 &&
    v.layout.every((row) => typeof row === "string")
  ) {
    layout = v.layout as string[];
  } else {
    throw new Error(`${label} needs layout or floors`);
  }

  const level: LevelDefinition = {
    id: v.id.trim(),
    name: v.name,
    layout,
    floors,
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

  syncLayoutFromFloors(level);

  const errors = validateLevel(level);
  if (errors.length > 0) {
    throw new Error(`${label}: ${errors.join("; ")}`);
  }
  return level;
}

function coerceFloor(value: unknown, label: string, index: number): FloorDefinition {
  if (!value || typeof value !== "object") {
    throw new Error(`${label} is not an object`);
  }
  const v = value as Record<string, unknown>;
  if (
    !Array.isArray(v.layout) ||
    v.layout.length === 0 ||
    !v.layout.every((r) => typeof r === "string")
  ) {
    throw new Error(`${label}.layout must be a non-empty string array`);
  }
  return {
    id: typeof v.id === "string" && v.id.trim() ? v.id.trim() : `floor-${index}`,
    name: typeof v.name === "string" && v.name.trim() ? v.name : `Floor ${index + 1}`,
    layout: v.layout as string[],
  };
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
