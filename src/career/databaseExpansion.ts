import {
  CONTINENTAL_PLAYERS_2024_25,
  CONTINENTAL_PLAYERS_2025_26,
  CONTINENTAL_PLAYERS_2026_27,
  hydrateContinental2026FromPayload,
  hydrateContinentalArchiveFromPayload,
} from './continentalPlayers';
import { CareerPlayer, DatabaseSeason, SupplementalPlayerDef } from './types';
import { calculatePlayerValue, calculateWeeklyWage } from './finance';
import { isHomegrownPlayer } from './squad';
import { getClubById, getCleanClubName } from './clubs';
import { getPlayerBio, ensurePlayerBiosLoaded } from './playerBioDatabase';

export type { SupplementalPlayerDef };

/** 2026/27 Season Database (Current Season - 20 Clubs) */
export const SUPPLEMENTAL_PLAYERS_2026_27: SupplementalPlayerDef[] = [];
/** 2025/26 Season Archive Database */
export const SUPPLEMENTAL_PLAYERS_2025_26: SupplementalPlayerDef[] = [];
/** 2024/25 Season Archive Database */
export const SUPPLEMENTAL_PLAYERS_2024_25: SupplementalPlayerDef[] = [];

// Default active database (2026/27) - shares array reference so hydration populates both
export const SUPPLEMENTAL_PLAYERS_DATA: SupplementalPlayerDef[] = SUPPLEMENTAL_PLAYERS_2026_27;

let loaded2026 = false;
let loadedArchive = false;
let load2026Promise: Promise<void> | null = null;
let loadArchivePromise: Promise<void> | null = null;
let lastLoadError: string | null = null;

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

function apply2026Payload(payload: { pl?: SupplementalPlayerDef[]; continental?: SupplementalPlayerDef[] }): void {
  if (!loaded2026 && Array.isArray(payload.pl) && payload.pl.length > 0) {
    SUPPLEMENTAL_PLAYERS_2026_27.push(...payload.pl);
    loaded2026 = true;
  }
  if (Array.isArray(payload.continental) && payload.continental.length > 0) {
    hydrateContinental2026FromPayload(payload.continental);
  }
}

function applyArchivePayload(payload: {
  pl2024_25?: SupplementalPlayerDef[];
  pl2025_26?: SupplementalPlayerDef[];
  continental2024_25?: SupplementalPlayerDef[];
  continental2025_26?: SupplementalPlayerDef[];
}): void {
  if (!loadedArchive) {
    if (Array.isArray(payload.pl2024_25) && payload.pl2024_25.length > 0) {
      SUPPLEMENTAL_PLAYERS_2024_25.push(...payload.pl2024_25);
    }
    if (Array.isArray(payload.pl2025_26) && payload.pl2025_26.length > 0) {
      SUPPLEMENTAL_PLAYERS_2025_26.push(...payload.pl2025_26);
    }
    if ((payload.pl2024_25?.length || 0) > 0 || (payload.pl2025_26?.length || 0) > 0) {
      loadedArchive = true;
    }
  }
  hydrateContinentalArchiveFromPayload(payload.continental2024_25 || [], payload.continental2025_26 || []);
}

function hydrateInNodeSync(): void {
  if (!isNodeRuntime()) return;
  if (!loaded2026) {
    const data26 = readJsonInNode<{ pl?: SupplementalPlayerDef[]; continental?: SupplementalPlayerDef[] }>(
      'supplemental-2026-27.json'
    );
    if (data26) apply2026Payload(data26);
  }
  if (!loadedArchive) {
    const arch = readJsonInNode<{
      pl2024_25?: SupplementalPlayerDef[];
      pl2025_26?: SupplementalPlayerDef[];
      continental2024_25?: SupplementalPlayerDef[];
      continental2025_26?: SupplementalPlayerDef[];
    }>('supplemental-archive.json');
    if (arch) applyArchivePayload(arch);
  }
}

hydrateInNodeSync();

/**
 * Ensures career supplemental, continental, and biometric JSON databases are loaded in the browser.
 * Safe and idempotent to call repeatedly; instantaneous on Node/Vitest.
 * Returns true if the requested season dataset is loaded cleanly, false if fetching failed.
 */
export async function ensureCareerDatabaseLoaded(season: DatabaseSeason | 'all' = '2026/27'): Promise<boolean> {
  if (isNodeRuntime()) {
    hydrateInNodeSync();
    await ensurePlayerBiosLoaded();
    return isCareerDatabaseLoaded(season);
  }
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return isCareerDatabaseLoaded(season);
  }

  lastLoadError = null;
  const needArchive = season === '2024/25' || season === '2025/26' || season === 'all';
  const tasks: Promise<unknown>[] = [ensurePlayerBiosLoaded()];

  if (!loaded2026) {
    if (!load2026Promise) {
      load2026Promise = fetch('/data/supplemental-2026-27.json')
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const payload = (await res.json()) as {
            pl?: SupplementalPlayerDef[];
            continental?: SupplementalPlayerDef[];
          };
          apply2026Payload(payload);
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : 'Network error';
          lastLoadError = `Failed to load 2026/27 database (${msg})`;
          console.warn('Failed to load supplemental-2026-27.json:', err);
        })
        .finally(() => {
          load2026Promise = null;
        });
    }
    tasks.push(load2026Promise);
  }

  if (needArchive && !loadedArchive) {
    if (!loadArchivePromise) {
      loadArchivePromise = fetch('/data/supplemental-archive.json')
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const payload = (await res.json()) as {
            pl2024_25?: SupplementalPlayerDef[];
            pl2025_26?: SupplementalPlayerDef[];
            continental2024_25?: SupplementalPlayerDef[];
            continental2025_26?: SupplementalPlayerDef[];
          };
          applyArchivePayload(payload);
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : 'Network error';
          lastLoadError = lastLoadError || `Failed to load archive database (${msg})`;
          console.warn('Failed to load supplemental-archive.json:', err);
        })
        .finally(() => {
          loadArchivePromise = null;
        });
    }
    tasks.push(loadArchivePromise);
  }

  await Promise.all(tasks);
  return isCareerDatabaseLoaded(season);
}

export function getCareerDatabaseLoadError(): string | null {
  return lastLoadError;
}

export function isCareerDatabaseLoaded(season: DatabaseSeason | 'all' = '2026/27'): boolean {
  if (season === '2024/25' || season === '2025/26' || season === 'all') {
    return loaded2026 && loadedArchive;
  }
  return loaded2026;
}

/**
 * Converts supplemental player definitions into standard CareerPlayer objects.
 */
export function convertToCareerPlayer(def: SupplementalPlayerDef, seasonYear: number = 2026): CareerPlayer {
  const ageDelta = Math.max(0, seasonYear - 2026);
  const effectiveAge = def.age + ageDelta;
  const value = calculatePlayerValue(def.rating, effectiveAge, def.position);
  const wageWeekly = def.wageWeekly || calculateWeeklyWage(def.rating, value);
  const isHomegrown =
    typeof def.isHomegrown === 'boolean'
      ? def.isHomegrown
      : isHomegrownPlayer({ nationality: def.nationality });

  const clubObj = getClubById(def.clubId);
  const resolvedClub = clubObj ? clubObj.defaultName : getCleanClubName(def.clubId);
  const bio = getPlayerBio(def.name, def.position);

  const preferredFoot = def.preferredFoot || bio.preferredFoot;
  const heightCm = def.heightCm || bio.heightCm;
  const weightKg = def.weightKg || bio.weightKg;
  const dateOfBirth = def.dateOfBirth || bio.dateOfBirth || `${2026 - def.age}-07-01`;
  const contractYears = def.contractYears ?? (def.rating >= 86 ? 4 : def.age <= 21 ? 5 : 3);

  return {
    id: def.id,
    cardId: `${def.id}_card`,
    name: def.name,
    rating: def.rating,
    position: def.position,
    naturalPositions: def.naturalPositions,
    secondaryPositions: def.secondaryPositions,
    age: effectiveAge,
    dateOfBirth,
    preferredFoot,
    heightCm,
    weightKg,
    value,
    wageWeekly,
    contractYears,
    fitness: 100,
    morale: 85,
    form: 7.0,
    injured: false,
    isHomegrown,
    club: resolvedClub,
    nationality: def.nationality,
    potential: def.potential,
  };
}

export function getSupplementalPlayersForClub(
  clubId: string,
  season: DatabaseSeason = '2026/27',
  seasonYear: number = 2026
): CareerPlayer[] {
  const plPool =
    season === '2024/25'
      ? SUPPLEMENTAL_PLAYERS_2024_25
      : season === '2025/26'
      ? SUPPLEMENTAL_PLAYERS_2025_26
      : SUPPLEMENTAL_PLAYERS_2026_27;

  const euroPool =
    season === '2024/25'
      ? CONTINENTAL_PLAYERS_2024_25
      : season === '2025/26'
      ? CONTINENTAL_PLAYERS_2025_26
      : CONTINENTAL_PLAYERS_2026_27;

  const pool = [...plPool, ...euroPool];
  let matched = pool.filter((p) => p.clubId === clubId);
  if (matched.length === 0) {
    const fallbacks = [
      ...SUPPLEMENTAL_PLAYERS_2024_25,
      ...CONTINENTAL_PLAYERS_2024_25,
      ...SUPPLEMENTAL_PLAYERS_2025_26,
      ...CONTINENTAL_PLAYERS_2025_26,
      ...SUPPLEMENTAL_PLAYERS_2026_27,
      ...CONTINENTAL_PLAYERS_2026_27,
    ];
    matched = fallbacks.filter((p) => p.clubId === clubId);
  }
  return matched.map((def) => convertToCareerPlayer(def, seasonYear));
}

export function getAllSupplementalPlayers(
  season: DatabaseSeason = '2026/27',
  seasonYear: number = 2026
): CareerPlayer[] {
  const plPool =
    season === '2024/25'
      ? SUPPLEMENTAL_PLAYERS_2024_25
      : season === '2025/26'
      ? SUPPLEMENTAL_PLAYERS_2025_26
      : SUPPLEMENTAL_PLAYERS_2026_27;

  const euroPool =
    season === '2024/25'
      ? CONTINENTAL_PLAYERS_2024_25
      : season === '2025/26'
      ? CONTINENTAL_PLAYERS_2025_26
      : CONTINENTAL_PLAYERS_2026_27;

  return [...plPool, ...euroPool].map((def) => convertToCareerPlayer(def, seasonYear));
}
