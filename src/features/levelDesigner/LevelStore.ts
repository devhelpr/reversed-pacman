import type { LevelDefinition } from "../../core/maze/LevelDefinition";
import { cloneLevel } from "./LevelJson";

const DB_NAME = "reversed-pacman";
const DB_VERSION = 1;
const STORE = "levels";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

/**
 * Persist custom levels in IndexedDB.
 * Built-in levels stay in the code registry; only custom ones live here.
 */
export class LevelStore {
  async list(): Promise<LevelDefinition[]> {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const rows = await reqToPromise(store.getAll());
      return (rows as LevelDefinition[]).map(cloneLevel);
    } finally {
      db.close();
    }
  }

  async get(id: string): Promise<LevelDefinition | null> {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readonly");
      const row = await reqToPromise(tx.objectStore(STORE).get(id));
      return row ? cloneLevel(row as LevelDefinition) : null;
    } finally {
      db.close();
    }
  }

  async save(level: LevelDefinition): Promise<void> {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readwrite");
      await reqToPromise(tx.objectStore(STORE).put(cloneLevel(level)));
      await txDone(tx);
    } finally {
      db.close();
    }
  }

  async saveMany(levels: LevelDefinition[]): Promise<void> {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const level of levels) {
        store.put(cloneLevel(level));
      }
      await txDone(tx);
    } finally {
      db.close();
    }
  }

  async remove(id: string): Promise<void> {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readwrite");
      await reqToPromise(tx.objectStore(STORE).delete(id));
      await txDone(tx);
    } finally {
      db.close();
    }
  }
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export const levelStore = new LevelStore();
