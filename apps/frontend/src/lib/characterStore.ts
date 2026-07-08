// IndexedDB persistence for the character creator. The whole CharacterConfig
// (including the face paint data URL) is stored under a single key and saved
// automatically whenever it changes.

import { type CharacterConfig, DEFAULT_CHARACTER, normalizeCharacter } from "./character";

const DB_NAME = "bombGame";
const DB_VERSION = 1;
const STORE_NAME = "character";
const KEY = "current";

const LEGACY_SKIN_KEY = "bombGame_skin";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readRaw(): Promise<unknown | undefined> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Loads the saved character. Falls back to the default character, seeding the
 * face paint from the legacy localStorage skin drawing if one exists.
 */
export async function loadCharacter(): Promise<CharacterConfig> {
  try {
    const raw = await readRaw();
    if (raw !== undefined) {
      return normalizeCharacter(raw);
    }
  } catch {
    // IndexedDB unavailable (private mode etc.) - fall through to defaults
  }

  const character = structuredClone(DEFAULT_CHARACTER);
  try {
    const legacySkin = localStorage.getItem(LEGACY_SKIN_KEY);
    if (legacySkin) {
      character.facePaint = legacySkin;
    }
  } catch {
    // localStorage unavailable
  }
  return character;
}

export async function saveCharacter(character: CharacterConfig): Promise<void> {
  try {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(character, KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  } catch {
    // Saving is best-effort; ignore storage failures
  }
}
