/** Side-effect imports register levels into the registry. */
import "./level1";

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
