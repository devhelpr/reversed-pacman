/** Side-effect imports register levels into the registry. */
import "./level1";
import "./level2";

export {
  getFirstLevel,
  getLevel,
  isBuiltinLevel,
  listLevels,
  registerLevel,
  unregisterLevel,
  upsertLevel,
  type LevelDefinition,
} from "./LevelRegistry";

export {
  normalizeFloors,
  parseLevel,
  syncLayoutFromFloors,
  type FloorDefinition,
} from "../../core/maze/LevelDefinition";
