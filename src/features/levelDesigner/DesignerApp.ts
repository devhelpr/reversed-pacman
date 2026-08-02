import type { LevelDefinition } from "../levels";
import { isBuiltinLevel, listLevels, unregisterLevel, upsertLevel } from "../levels";
import { DesignerCanvas } from "./DesignerCanvas";
import {
  BUILTIN_LEVEL_IDS,
  cloneLevel,
  createBlankLayout,
  createEmptyCustomLevel,
  downloadJson,
  parseImportJson,
  pickJsonFile,
  toExportJson,
  validateLevel,
} from "./LevelJson";
import { levelStore } from "./LevelStore";
import { PALETTE } from "./Palette";
import type { MazeChar } from "../../core/maze/LevelDefinition";

export interface DesignerAppOptions {
  mount: HTMLElement;
  onPlayLevel: (level: LevelDefinition) => void;
  onBackToPlay: () => void;
}

/**
 * Visual maze editor with IndexedDB persistence and JSON import/export.
 */
export class DesignerApp {
  private readonly mount: HTMLElement;
  private readonly onPlayLevel: (level: LevelDefinition) => void;
  private readonly onBackToPlay: () => void;
  private painter: DesignerCanvas | null = null;
  private draft: LevelDefinition = createEmptyCustomLevel();
  private dirty = false;

  constructor(options: DesignerAppOptions) {
    this.mount = options.mount;
    this.onPlayLevel = options.onPlayLevel;
    this.onBackToPlay = options.onBackToPlay;
  }

  async start(): Promise<void> {
    await this.refreshRegistryFromStore();
    this.renderShell();
    this.bindPainter();
    await this.refreshLibrary();
    this.loadDraftIntoForm();
  }

  destroy(): void {
    this.painter?.destroy();
    this.painter = null;
    this.mount.replaceChildren();
  }

  private renderShell(): void {
    this.mount.innerHTML = `
      <div class="designer-shell">
        <header class="designer-top">
          <div>
            <h1>Level Designer</h1>
            <p class="tagline">Paint a maze, save it locally, export as JSON.</p>
          </div>
          <div class="designer-top-actions">
            <button type="button" data-action="back" class="btn">← Play</button>
          </div>
        </header>

        <div class="designer-layout">
          <section class="designer-library">
            <h2>Library</h2>
            <div class="designer-library-actions">
              <button type="button" data-action="new" class="btn btn-accent">New</button>
              <button type="button" data-action="import" class="btn">Import JSON</button>
              <button type="button" data-action="export-all" class="btn">Export all</button>
            </div>
            <ul data-el="library" class="designer-library-list"></ul>
          </section>

          <section class="designer-editor">
            <div class="designer-toolbar">
              <label class="field">
                <span>Name</span>
                <input data-el="name" type="text" maxlength="48" />
              </label>
              <label class="field field-narrow">
                <span>W</span>
                <input data-el="width" type="number" min="5" max="40" />
              </label>
              <label class="field field-narrow">
                <span>H</span>
                <input data-el="height" type="number" min="5" max="40" />
              </label>
              <button type="button" data-action="resize" class="btn">Resize</button>
              <button type="button" data-action="save" class="btn btn-accent">Save</button>
              <button type="button" data-action="export" class="btn">Export</button>
              <button type="button" data-action="play" class="btn btn-play">Play test</button>
            </div>

            <div data-el="palette" class="designer-palette"></div>
            <p class="designer-hint">Left-click paints · right-click paints dots · one P and one E required</p>
            <div class="designer-canvas-wrap">
              <canvas data-el="canvas" aria-label="Maze editor"></canvas>
            </div>
            <p data-el="status" class="designer-status"></p>

            <details class="designer-params">
              <summary>Gameplay parameters</summary>
              <div class="designer-params-grid">
                ${this.paramFields()}
              </div>
            </details>
          </section>
        </div>
      </div>
    `;

    this.mount.querySelector("[data-action='back']")!.addEventListener("click", () => {
      this.onBackToPlay();
    });
    this.mount.querySelector("[data-action='new']")!.addEventListener("click", () => {
      this.newLevel();
    });
    this.mount.querySelector("[data-action='import']")!.addEventListener("click", () => {
      void this.importJson();
    });
    this.mount.querySelector("[data-action='export-all']")!.addEventListener("click", () => {
      void this.exportAll();
    });
    this.mount.querySelector("[data-action='save']")!.addEventListener("click", () => {
      void this.saveDraft();
    });
    this.mount.querySelector("[data-action='export']")!.addEventListener("click", () => {
      this.exportDraft();
    });
    this.mount.querySelector("[data-action='play']")!.addEventListener("click", () => {
      void this.playDraft();
    });
    this.mount.querySelector("[data-action='resize']")!.addEventListener("click", () => {
      this.resizeDraft();
    });

    this.renderPalette();
    this.wireFormFields();
  }

  private paramFields(): string {
    const fields: Array<{ key: keyof LevelDefinition; label: string; step?: string }> = [
      { key: "playerSpeed", label: "Player speed", step: "0.1" },
      { key: "ghostSpeed", label: "Ghost speed", step: "0.1" },
      { key: "ghostEatIntervalSeconds", label: "Ghost eat interval", step: "0.05" },
      { key: "baitDurationSeconds", label: "Bait duration", step: "0.5" },
      { key: "huntSpeedMultiplier", label: "Hunt speed ×", step: "0.05" },
      { key: "trapdoorClosedMinSeconds", label: "Trap closed min", step: "0.5" },
      { key: "trapdoorClosedMaxSeconds", label: "Trap closed max", step: "0.5" },
      { key: "trapdoorOpenMinSeconds", label: "Trap open min", step: "0.1" },
      { key: "trapdoorOpenMaxSeconds", label: "Trap open max", step: "0.1" },
      { key: "shockCycleSeconds", label: "Shock cycle", step: "0.1" },
      { key: "slimeSpeedFactor", label: "Slime speed ×", step: "0.05" },
      { key: "timeBonusLimitSeconds", label: "Time bonus limit", step: "1" },
      { key: "pointsPerDot", label: "Points per dot", step: "1" },
      { key: "maxTimeBonus", label: "Max time bonus", step: "10" },
    ];
    return fields
      .map(
        (f) => `
      <label class="field">
        <span>${f.label}</span>
        <input data-param="${f.key}" type="number" step="${f.step ?? "1"}" />
      </label>`,
      )
      .join("");
  }

  private renderPalette(): void {
    const host = this.el("palette");
    host.innerHTML = PALETTE.map(
      (brush) => `
      <button type="button" class="palette-btn" data-brush="${brush.char}" title="${brush.hint}">
        <span class="palette-swatch" style="background:${brush.color}"></span>
        <span>${brush.label}</span>
      </button>`,
    ).join("");

    host.querySelectorAll<HTMLButtonElement>("[data-brush]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ch = btn.dataset.brush as MazeChar;
        this.painter?.setBrush(ch);
        host.querySelectorAll(".palette-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
    host.querySelector<HTMLButtonElement>('[data-brush="#"]')?.classList.add("active");
  }

  private bindPainter(): void {
    const canvas = this.mount.querySelector<HTMLCanvasElement>("[data-el='canvas']")!;
    this.painter?.destroy();
    this.painter = new DesignerCanvas(canvas);
    this.painter.setBrush("#");
    this.painter.setLayout(this.draft.layout);
    this.painter.setOnChange(() => {
      this.dirty = true;
      this.setStatus("Unsaved changes");
    });
  }

  private wireFormFields(): void {
    this.el<HTMLInputElement>("name").addEventListener("input", (e) => {
      this.draft.name = (e.target as HTMLInputElement).value;
      this.dirty = true;
    });

    this.mount.querySelectorAll<HTMLInputElement>("[data-param]").forEach((input) => {
      input.addEventListener("change", () => {
        const key = input.dataset.param as keyof LevelDefinition;
        const value = Number(input.value);
        if (!Number.isFinite(value)) return;
        (this.draft as unknown as Record<string, unknown>)[key] = value;
        this.dirty = true;
        this.setStatus("Unsaved changes");
      });
    });
  }

  private loadDraftIntoForm(): void {
    this.el<HTMLInputElement>("name").value = this.draft.name;
    this.el<HTMLInputElement>("width").value = String(this.draft.layout[0]?.length ?? 21);
    this.el<HTMLInputElement>("height").value = String(this.draft.layout.length);
    this.mount.querySelectorAll<HTMLInputElement>("[data-param]").forEach((input) => {
      const key = input.dataset.param as keyof LevelDefinition;
      const value = this.draft[key];
      if (typeof value === "number") input.value = String(value);
    });
    this.painter?.setLayout(this.draft.layout);
    this.highlightLibrarySelection();
  }

  private async refreshRegistryFromStore(): Promise<void> {
    const custom = await levelStore.list();
    for (const level of custom) {
      if (BUILTIN_LEVEL_IDS.has(level.id) || isBuiltinLevel(level.id)) continue;
      upsertLevel(level);
    }
  }

  private async refreshLibrary(): Promise<void> {
    const host = this.el("library");
    const custom = await levelStore.list();
    const builtin = listLevels().filter((l) => isBuiltinLevel(l.id));

    const renderItem = (level: LevelDefinition, kind: "builtin" | "custom") => `
      <li class="library-item ${this.draft.id === level.id ? "active" : ""}" data-id="${level.id}">
        <button type="button" class="library-open" data-open="${level.id}">
          <strong>${escapeHtml(level.name)}</strong>
          <span>${kind === "builtin" ? "built-in" : "custom"} · ${level.layout[0]?.length ?? 0}×${level.layout.length}</span>
        </button>
        <div class="library-item-actions">
          ${
            kind === "custom"
              ? `<button type="button" class="btn btn-tiny" data-delete="${level.id}">Delete</button>`
              : `<button type="button" class="btn btn-tiny" data-clone="${level.id}">Clone</button>`
          }
        </div>
      </li>`;

    host.innerHTML = [
      ...builtin.map((l) => renderItem(l, "builtin")),
      ...custom.map((l) => renderItem(l, "custom")),
    ].join("");

    host.querySelectorAll<HTMLButtonElement>("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => {
        void this.openLevel(btn.dataset.open!);
      });
    });
    host.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        void this.deleteLevel(btn.dataset.delete!);
      });
    });
    host.querySelectorAll<HTMLButtonElement>("[data-clone]").forEach((btn) => {
      btn.addEventListener("click", () => {
        void this.cloneBuiltin(btn.dataset.clone!);
      });
    });
  }

  private highlightLibrarySelection(): void {
    this.mount.querySelectorAll(".library-item").forEach((item) => {
      item.classList.toggle("active", item.getAttribute("data-id") === this.draft.id);
    });
  }

  private newLevel(): void {
    if (this.dirty && !confirm("Discard unsaved changes?")) return;
    this.draft = createEmptyCustomLevel(`Custom ${new Date().toLocaleString()}`);
    this.dirty = true;
    this.loadDraftIntoForm();
    this.setStatus("New draft — save to keep it");
    this.highlightLibrarySelection();
  }

  private async openLevel(id: string): Promise<void> {
    if (this.dirty && !confirm("Discard unsaved changes?")) return;

    if (isBuiltinLevel(id)) {
      const builtin = listLevels().find((l) => l.id === id);
      if (!builtin) return;
      // Edit a clone so we never mutate built-ins in IDB under the same id
      this.draft = {
        ...cloneLevel(builtin),
        id: `custom-${crypto.randomUUID()}`,
        name: `${builtin.name} (edit)`,
      };
      this.dirty = true;
      this.loadDraftIntoForm();
      this.setStatus("Editing a copy of a built-in level — save to store it");
      return;
    }

    const level = await levelStore.get(id);
    if (!level) {
      this.setStatus("Level not found in IndexedDB");
      return;
    }
    this.draft = cloneLevel(level);
    this.dirty = false;
    this.loadDraftIntoForm();
    this.setStatus(`Loaded “${level.name}”`);
    this.highlightLibrarySelection();
  }

  private async cloneBuiltin(id: string): Promise<void> {
    const builtin = listLevels().find((l) => l.id === id);
    if (!builtin) return;
    const copy = {
      ...cloneLevel(builtin),
      id: `custom-${crypto.randomUUID()}`,
      name: `${builtin.name} copy`,
    };
    await levelStore.save(copy);
    upsertLevel(copy);
    this.draft = cloneLevel(copy);
    this.dirty = false;
    this.loadDraftIntoForm();
    await this.refreshLibrary();
    this.setStatus(`Cloned “${copy.name}” into IndexedDB`);
  }

  private async deleteLevel(id: string): Promise<void> {
    if (isBuiltinLevel(id)) return;
    if (!confirm("Delete this custom level from IndexedDB?")) return;
    await levelStore.remove(id);
    try {
      unregisterLevel(id);
    } catch {
      // may not be registered
    }
    if (this.draft.id === id) {
      this.draft = createEmptyCustomLevel();
      this.dirty = false;
      this.loadDraftIntoForm();
    }
    await this.refreshLibrary();
    this.setStatus("Deleted");
  }

  private resizeDraft(): void {
    const width = Number(this.el<HTMLInputElement>("width").value);
    const height = Number(this.el<HTMLInputElement>("height").value);
    const next = createBlankLayout(width, height);
    // Preserve overlapping cells where possible
    const old = this.draft.layout;
    for (let row = 0; row < next.length; row++) {
      for (let col = 0; col < (next[0]?.length ?? 0); col++) {
        const prev = old[row]?.[col];
        if (
          prev &&
          prev !== "#" &&
          row > 0 &&
          row < next.length - 1 &&
          col > 0 &&
          col < next[0]!.length - 1
        ) {
          next[row] = next[row]!.slice(0, col) + prev + next[row]!.slice(col + 1);
        }
      }
    }
    this.draft.layout = next;
    this.dirty = true;
    this.painter?.setLayout(this.draft.layout);
    this.setStatus(`Resized to ${next[0]?.length ?? 0}×${next.length}`);
  }

  private syncDraftFromForm(): void {
    this.draft.name = this.el<HTMLInputElement>("name").value.trim() || "Untitled";
    this.mount.querySelectorAll<HTMLInputElement>("[data-param]").forEach((input) => {
      const key = input.dataset.param as keyof LevelDefinition;
      const value = Number(input.value);
      if (Number.isFinite(value)) {
        (this.draft as unknown as Record<string, unknown>)[key] = value;
      }
    });
  }

  private async saveDraft(): Promise<void> {
    this.syncDraftFromForm();
    if (BUILTIN_LEVEL_IDS.has(this.draft.id) || isBuiltinLevel(this.draft.id)) {
      this.draft.id = `custom-${crypto.randomUUID()}`;
    }
    const errors = validateLevel(this.draft);
    if (errors.length > 0) {
      this.setStatus(`Cannot save: ${errors[0]}`);
      return;
    }
    await levelStore.save(this.draft);
    upsertLevel(this.draft);
    this.dirty = false;
    await this.refreshLibrary();
    this.setStatus(`Saved “${this.draft.name}” to IndexedDB`);
  }

  private exportDraft(): void {
    this.syncDraftFromForm();
    const errors = validateLevel(this.draft);
    if (errors.length > 0) {
      this.setStatus(`Cannot export: ${errors[0]}`);
      return;
    }
    const slug = this.draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "level";
    downloadJson(`${slug}.json`, toExportJson(this.draft));
    this.setStatus("Exported JSON");
  }

  private async exportAll(): Promise<void> {
    const custom = await levelStore.list();
    const all = [...listLevels().filter((l) => isBuiltinLevel(l.id)), ...custom];
    downloadJson("reversed-pacman-levels.json", toExportJson(all));
    this.setStatus(`Exported ${all.length} levels`);
  }

  private async importJson(): Promise<void> {
    try {
      const raw = await pickJsonFile();
      const levels = parseImportJson(raw);
      const saved: LevelDefinition[] = [];
      for (const level of levels) {
        const copy = cloneLevel(level);
        if (BUILTIN_LEVEL_IDS.has(copy.id) || isBuiltinLevel(copy.id)) {
          copy.id = `custom-${crypto.randomUUID()}`;
          copy.name = `${copy.name} (imported)`;
        }
        // Avoid collisions with existing custom ids
        if (await levelStore.get(copy.id)) {
          copy.id = `custom-${crypto.randomUUID()}`;
        }
        await levelStore.save(copy);
        upsertLevel(copy);
        saved.push(copy);
      }
      await this.refreshLibrary();
      if (saved[0]) {
        this.draft = cloneLevel(saved[0]);
        this.dirty = false;
        this.loadDraftIntoForm();
      }
      this.setStatus(`Imported ${saved.length} level(s)`);
    } catch (err) {
      this.setStatus(err instanceof Error ? err.message : "Import failed");
    }
  }

  private async playDraft(): Promise<void> {
    this.syncDraftFromForm();
    const errors = validateLevel(this.draft);
    if (errors.length > 0) {
      this.setStatus(`Cannot play: ${errors[0]}`);
      return;
    }
    if (this.dirty) {
      await this.saveDraft();
    }
    upsertLevel(this.draft);
    this.onPlayLevel(cloneLevel(this.draft));
  }

  private setStatus(message: string): void {
    this.el("status").textContent = message;
  }

  private el<T extends HTMLElement = HTMLElement>(name: string): T {
    return this.mount.querySelector(`[data-el="${name}"]`) as T;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
