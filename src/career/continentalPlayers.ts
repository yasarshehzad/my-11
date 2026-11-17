import { SupplementalPlayerDef } from './types';

export const CONTINENTAL_PLAYERS_2024_25: SupplementalPlayerDef[] = [];
export const CONTINENTAL_PLAYERS_2025_26: SupplementalPlayerDef[] = [];
export const CONTINENTAL_PLAYERS_2026_27: SupplementalPlayerDef[] = [];

let loaded2026 = false;
let loadedArchive = false;
let promise2026: Promise<void> | null = null;
let promiseArchive: Promise<void> | null = null;

function isNodeRuntime(): boolean {
  return typeof process !== 'undefined' && Boolean(process.versions && process.versions.node);
}

function readJsonInNode<T>(filename: string): T | null {
  if (!isNodeRuntime()) return null;
  try {
    const nodeRequire = eval('require') as (id: string) => unknown;
    const fs = nodeRequire('fs') as { existsSync: (p: string) => boolean; readFileSync: (p: string, enc: string) => string };
    const path = nodeRequire('path') as { resolve: (...parts: string[]) => string };
    const jsonPath = path.resolve(process.cwd(), 'public', 'data', filename);
    if (!fs.existsSync(jsonPath)) return null;
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as T;
  } catch (err) {
    console.warn(`Could not read ${filename} synchronously in Node:`, err);
    return null;
  }
}

export function hydrateContinental2026FromPayload(continental: SupplementalPlayerDef[]): void {
  if (loaded2026) return;
  if (Array.isArray(continental) && continental.length > 0) {
    CONTINENTAL_PLAYERS_2026_27.push(...continental);
    loaded2026 = true;
  }
}

export function hydrateContinentalArchiveFromPayload(
  c2024: SupplementalPlayerDef[],
  c2025: SupplementalPlayerDef[]
): void {
  if (loadedArchive) return;
  if (Array.isArray(c2024) && c2024.length > 0) {
    CONTINENTAL_PLAYERS_2024_25.push(...c2024);
  }
  if (Array.isArray(c2025) && c2025.length > 0) {
    CONTINENTAL_PLAYERS_2025_26.push(...c2025);
  }
  if ((c2024 && c2024.length > 0) || (c2025 && c2025.length > 0)) {
    loadedArchive = true;
  }
}

function hydrateAllInNodeSync(): void {
  if (!isNodeRuntime()) return;
  if (!loaded2026) {
    const data26 = readJsonInNode<{ continental?: SupplementalPlayerDef[] }>('supplemental-2026-27.json');
    if (data26?.continental) hydrateContinental2026FromPayload(data26.continental);
  }
  if (!loadedArchive) {
    const arch = readJsonInNode<{
      continental2024_25?: SupplementalPlayerDef[];
      continental2025_26?: SupplementalPlayerDef[];
    }>('supplemental-archive.json');
    if (arch) {
      hydrateContinentalArchiveFromPayload(arch.continental2024_25 || [], arch.continental2025_26 || []);
    }
  }
}

hydrateAllInNodeSync();

export async function ensureContinentalPlayersLoaded(includeArchive = false): Promise<void> {
  if (isNodeRuntime()) {
    hydrateAllInNodeSync();
    return;
  }
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return;

  if (!loaded2026) {
    if (!promise2026) {
      promise2026 = fetch('/data/supplemental-2026-27.json')
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = (await res.json()) as { continental?: SupplementalPlayerDef[] };
          hydrateContinental2026FromPayload(json.continental || []);
        })
        .catch((err) => console.warn('Failed loading continental 26/27:', err))
        .finally(() => {
          promise2026 = null;
        });
    }
    await promise2026;
  }

  if (includeArchive && !loadedArchive) {
    if (!promiseArchive) {
      promiseArchive = fetch('/data/supplemental-archive.json')
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = (await res.json()) as {
            continental2024_25?: SupplementalPlayerDef[];
            continental2025_26?: SupplementalPlayerDef[];
          };
          hydrateContinentalArchiveFromPayload(json.continental2024_25 || [], json.continental2025_26 || []);
        })
        .catch((err) => console.warn('Failed loading continental archive:', err))
        .finally(() => {
          promiseArchive = null;
        });
    }
    await promiseArchive;
  }
}
