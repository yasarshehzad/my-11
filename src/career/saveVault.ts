import { CareerSaveFile, SaveSlotMeta } from './types';
import { getEffectiveClubName } from './clubs';
import { validateSettings } from './settings';

export const VALID_SLOT_IDS = ['slot_1', 'slot_2', 'slot_3'] as const;
export type ValidSlotId = (typeof VALID_SLOT_IDS)[number];

export const CURRENT_CAREER_SAVE_VERSION = 1;

const IDB_NAME = 'my11_career_db';
const IDB_VERSION = 1;
const IDB_STORE = 'saves';
const SLOT_META_STORAGE_KEY = 'my11_career_slot_meta_v1';

const memorySaveCache = new Map<ValidSlotId, CareerSaveFile>();
const slotWriteSeq = new Map<ValidSlotId, number>();
let idbHydrationPromise: Promise<void> | null = null;
let idbHydrated = false;

function nextSlotSeq(slotId: ValidSlotId): number {
  const next = (slotWriteSeq.get(slotId) || 0) + 1;
  slotWriteSeq.set(slotId, next);
  return next;
}

export function getSlotStorageKey(slotId: string): string {
  return `my11_career_save_${slotId}`;
}

export function isValidSlotId(slotId: string): slotId is ValidSlotId {
  return VALID_SLOT_IDS.includes(slotId as ValidSlotId);
}

function hasIndexedDb(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openCareerDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

function idbPutSave(save: CareerSaveFile): Promise<boolean> {
  if (!hasIndexedDb()) return Promise.resolve(false);
  return openCareerDb()
    .then(
      (db) =>
        new Promise<boolean>((resolve, reject) => {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(save);
          tx.oncomplete = () => {
            db.close();
            resolve(true);
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error || new Error('IndexedDB write failed'));
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error || new Error('IndexedDB write aborted'));
          };
        })
    )
    .catch((err) => {
      console.warn('IndexedDB write skipped, falling back to localStorage:', err);
      return false;
    });
}

function idbDeleteSave(slotId: ValidSlotId): Promise<void> {
  if (!hasIndexedDb()) return Promise.resolve();
  return openCareerDb()
    .then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).delete(slotId);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error || new Error('IndexedDB delete failed'));
          };
        })
    )
    .catch((err) => {
      console.warn('IndexedDB delete skipped:', err);
    });
}

function idbReadAllSaves(): Promise<CareerSaveFile[]> {
  if (!hasIndexedDb()) return Promise.resolve([]);
  return openCareerDb()
    .then(
      (db) =>
        new Promise<CareerSaveFile[]>((resolve, reject) => {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const req = tx.objectStore(IDB_STORE).getAll();
          req.onsuccess = () => {
            db.close();
            resolve((req.result || []) as CareerSaveFile[]);
          };
          req.onerror = () => {
            db.close();
            reject(req.error || new Error('IndexedDB read failed'));
          };
        })
    )
    .catch(() => []);
}

export function buildSlotMetaFromSave(slotId: ValidSlotId, save: CareerSaveFile): SaveSlotMeta {
  return {
    slotId,
    isEmpty: false,
    save: {
      managerName: save.manager.name,
      clubName: getEffectiveClubName(save.club),
      clubPrimaryColor: save.club.primaryColor,
      clubSecondaryColor: save.club.secondaryColor,
      seasonNumber: save.season.seasonNumber,
      currentDate: save.season.currentDate,
      lastSavedAt: save.lastSavedAt,
      preset: save.settings.preset,
      isLocked: save.settings.locked,
      squadSize: save.squad?.length || 0,
      budget: save.finances?.transferBudget || save.club.startingBudget,
    },
  };
}

function readCachedSlotMetaMap(): Partial<Record<ValidSlotId, SaveSlotMeta>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SLOT_META_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCachedSlotMeta(slotId: ValidSlotId, meta: SaveSlotMeta | null): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readCachedSlotMetaMap();
    if (!meta || meta.isEmpty) {
      delete current[slotId];
    } else {
      current[slotId] = meta;
    }
    localStorage.setItem(SLOT_META_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage quota issues for lightweight metadata cache
  }
}

function readLegacyLocalStorageSave(slotId: ValidSlotId): CareerSaveFile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getSlotStorageKey(slotId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.id || !parsed.manager || !parsed.club || !parsed.settings) return null;
    return parsed as CareerSaveFile;
  } catch {
    return null;
  }
}

/**
 * Hydrates in-memory save cache from IndexedDB and performs one-time migration
 * of legacy localStorage career blobs into IndexedDB.
 */
export async function hydrateCareerSaveVault(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (idbHydrated) return;
  if (idbHydrationPromise) return idbHydrationPromise;

  idbHydrationPromise = (async () => {
    try {
      const idbSaves = await idbReadAllSaves();
      for (const s of idbSaves) {
        if (s && isValidSlotId(s.id)) {
          memorySaveCache.set(s.id, s);
          writeCachedSlotMeta(s.id, buildSlotMetaFromSave(s.id, s));
        }
      }

      // Migrate any legacy localStorage save blobs into IndexedDB
      for (const slotId of VALID_SLOT_IDS) {
        const legacy = readLegacyLocalStorageSave(slotId);
        if (!legacy) continue;

        const existing = memorySaveCache.get(slotId);
        const legacyTs = Date.parse(legacy.lastSavedAt || '') || 0;
        const existingTs = Date.parse(existing?.lastSavedAt || '') || 0;

        if (!existing || legacyTs >= existingTs) {
          memorySaveCache.set(slotId, legacy);
          writeCachedSlotMeta(slotId, buildSlotMetaFromSave(slotId, legacy));
          if (hasIndexedDb()) {
            const migratedOk = await idbPutSave(legacy);
            if (migratedOk) {
              try {
                localStorage.removeItem(getSlotStorageKey(slotId));
              } catch {
                // ignore
              }
            }
          }
        } else if (hasIndexedDb()) {
          // Existing IndexedDB save is newer than legacy localStorage blob
          try {
            localStorage.removeItem(getSlotStorageKey(slotId));
          } catch {
            // ignore
          }
        }
      }

      idbHydrated = true;
    } catch (err) {
      console.warn('Career save vault hydration warning:', err);
      idbHydrated = true;
    } finally {
      idbHydrationPromise = null;
    }
  })();

  return idbHydrationPromise;
}

export function readRawCareerSave(slotId: string): CareerSaveFile | null {
  if (typeof window === 'undefined') return null;
  if (!isValidSlotId(slotId)) return null;

  const fromLocal = readLegacyLocalStorageSave(slotId);
  if (!hasIndexedDb()) {
    return fromLocal || memorySaveCache.get(slotId) || null;
  }

  const fromMem = memorySaveCache.get(slotId) || null;
  if (fromLocal && fromMem) {
    const localTs = Date.parse(fromLocal.lastSavedAt || '') || 0;
    const memTs = Date.parse(fromMem.lastSavedAt || '') || 0;
    return localTs >= memTs ? fromLocal : fromMem;
  }

  return fromMem || fromLocal;
}

export function writeCareerSaveRecord(save: CareerSaveFile): boolean {
  if (typeof window === 'undefined') return false;
  if (!isValidSlotId(save.id)) return false;

  const slotId: ValidSlotId = save.id;

  try {
    const seq = nextSlotSeq(slotId);
    const updatedSave: CareerSaveFile = {
      ...save,
      version: CURRENT_CAREER_SAVE_VERSION,
      lastSavedAt: new Date().toISOString(),
      settings: validateSettings(save.settings),
    };

    memorySaveCache.set(slotId, updatedSave);
    writeCachedSlotMeta(slotId, buildSlotMetaFromSave(slotId, updatedSave));

    const storageKey = getSlotStorageKey(slotId);
    const serialized = JSON.stringify(updatedSave);

    if (hasIndexedDb()) {
      // Stage synchronously in localStorage in case user reloads before IDB tx commits or IDB fails
      try {
        localStorage.setItem(storageKey, serialized);
      } catch {
        // Ignore localStorage quota exceeded when IndexedDB is primary store
      }

      void idbPutSave(updatedSave).then((ok) => {
        if (ok && slotWriteSeq.get(slotId) === seq) {
          try {
            localStorage.removeItem(storageKey);
          } catch {
            // ignore
          }
        }
      });
    } else {
      localStorage.setItem(storageKey, serialized);
    }

    return true;
  } catch (err) {
    console.error(`Failed to write career save for slot ${save.id}:`, err);
    return false;
  }
}

export function deleteCareerSave(slotId: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!isValidSlotId(slotId)) return false;

  try {
    nextSlotSeq(slotId);
    memorySaveCache.delete(slotId);
    writeCachedSlotMeta(slotId, null);
    localStorage.removeItem(getSlotStorageKey(slotId));
    if (hasIndexedDb()) {
      void idbDeleteSave(slotId);
    }
    return true;
  } catch (err) {
    console.error(`Failed to delete career save for slot ${slotId}:`, err);
    return false;
  }
}

export function listSaveSlots(): SaveSlotMeta[] {
  const cachedMeta = readCachedSlotMetaMap();
  return VALID_SLOT_IDS.map((slotId) => {
    const rawSave = readRawCareerSave(slotId);
    if (rawSave) {
      return buildSlotMetaFromSave(slotId, rawSave);
    }
    if (hasIndexedDb()) {
      const meta = cachedMeta[slotId];
      if (meta && !meta.isEmpty && meta.save) {
        return meta;
      }
    }
    return {
      slotId,
      isEmpty: true,
    };
  });
}

export function exportCareerSaveAsJson(slotId: string): string | null {
  const save = readRawCareerSave(slotId);
  if (!save) return null;
  return JSON.stringify(save, null, 2);
}

export function importCareerSaveFromJson(
  targetSlotId: ValidSlotId,
  jsonText: string
): { success: boolean; save?: CareerSaveFile; error?: string } {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid JSON file format.' };
    }
    if (!parsed.manager?.name || !parsed.club?.id) {
      return {
        success: false,
        error: 'JSON is missing required career manager or club properties.',
      };
    }

    const migrated: CareerSaveFile = {
      ...(parsed as CareerSaveFile),
      id: targetSlotId,
      version: CURRENT_CAREER_SAVE_VERSION,
      lastSavedAt: new Date().toISOString(),
      settings: validateSettings(parsed.settings),
    };

    const ok = writeCareerSaveRecord(migrated);
    if (!ok) {
      return { success: false, error: 'Browser storage could not save the imported career.' };
    }
    return { success: true, save: migrated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to parse JSON string.',
    };
  }
}

