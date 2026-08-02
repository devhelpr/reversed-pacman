import { GameApp } from "../game/GameApp";
import { DesignerApp } from "../levelDesigner/DesignerApp";
import { levelStore } from "../levelDesigner/LevelStore";
import { BUILTIN_LEVEL_IDS } from "../levelDesigner/LevelJson";
import { isBuiltinLevel, upsertLevel, type LevelDefinition } from "../levels";

/**
 * Root shell that switches between gameplay and the level designer.
 */
export class AppShell {
  private readonly mount: HTMLElement;
  private game: GameApp | null = null;
  private designer: DesignerApp | null = null;
  private pendingPlayLevel: LevelDefinition | null = null;

  constructor(mount: HTMLElement) {
    this.mount = mount;
  }

  async start(): Promise<void> {
    await this.loadCustomLevels();
    this.showPlay(this.pendingPlayLevel ?? undefined);
  }

  private async loadCustomLevels(): Promise<void> {
    const custom = await levelStore.list();
    for (const level of custom) {
      if (BUILTIN_LEVEL_IDS.has(level.id) || isBuiltinLevel(level.id)) continue;
      upsertLevel(level);
    }
  }

  private showPlay(level?: LevelDefinition): void {
    this.teardown();
    this.game = new GameApp({
      mount: this.mount,
      level,
      onOpenDesigner: () => {
        void this.showDesigner();
      },
    });
    this.game.start();
  }

  private async showDesigner(): Promise<void> {
    this.teardown();
    this.designer = new DesignerApp({
      mount: this.mount,
      onBackToPlay: () => {
        this.showPlay();
      },
      onPlayLevel: (level) => {
        this.pendingPlayLevel = level;
        this.showPlay(level);
      },
    });
    await this.designer.start();
  }

  private teardown(): void {
    this.game?.destroy();
    this.game = null;
    this.designer?.destroy();
    this.designer = null;
  }
}
