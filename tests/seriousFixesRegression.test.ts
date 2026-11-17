import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  writeCareerSaveRecord,
  readRawCareerSave,
  deleteCareerSave,
  hydrateCareerSaveVault,
  getSlotStorageKey,
} from '../src/career/saveVault';
import { createNewCareerSave, loadCareerSave } from '../src/career/saves';
import { getPresetSettings } from '../src/career/settings';
import {
  getClubById,
  getAllClubs,
  getClubsWithUserClub,
  getActiveLeagueClubs,
  LOWER_LEAGUE_CLUBS,
} from '../src/career/clubs';
import { calculateStandings } from '../src/career/table';
import { resolveMatchdayLineup } from '../src/career/squad';
import {
  resolveActiveUserMatchdaySquad,
  simulateAiLeagueRoundWithSquads,
  applySingleMatchdayProgression,
  advanceTimeSkip,
} from '../src/career/sim';
import { ensurePlayerBiosLoaded, getPlayerBioLoadError } from '../src/career/playerBioDatabase';
import { parseChallengeFromUrl } from '../src/utils/challengeUrl';
import { CareerPlayer, LeagueFixture } from '../src/career/types';

function createLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };
}

describe('Serious Fixes Regression Suite', () => {
  const manBlue = getClubById('man_blue')!;
  const londonRed = getClubById('london_red')!;

  beforeEach(() => {
    const ls = createLocalStorageMock();
    vi.stubGlobal('localStorage', ls);
    vi.stubGlobal('window', {});
    deleteCareerSave('slot_1');
    deleteCareerSave('slot_2');
    deleteCareerSave('slot_3');
  });

  it('saveVault: keeps save in localStorage when IndexedDB is unavailable or fails, and survives hydration', async () => {
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Resilient Manager', nationality: 'England' },
      club: manBlue,
      settings: getPresetSettings('easy'),
    });

    const ok = writeCareerSaveRecord(save);
    expect(ok).toBe(true);

    // Must remain readable synchronously from both vault cache and localStorage fallback
    expect(readRawCareerSave('slot_1')?.manager.name).toBe('Resilient Manager');
    expect(localStorage.getItem(getSlotStorageKey('slot_1'))).toBeTruthy();

    // Hydrating when IDB is absent must not delete or lose the localStorage-staged save
    await hydrateCareerSaveVault();
    expect(readRawCareerSave('slot_1')?.manager.name).toBe('Resilient Manager');
    expect(localStorage.getItem(getSlotStorageKey('slot_1'))).toBeTruthy();
  });

  it('challengeUrl: parses ?challenge=1 parameters accurately for /draft challenge activation', () => {
    const target = parseChallengeFromUrl(
      'https://my-11.com/draft?challenge=1&wins=29&pts=88&mode=classic&formation=4-3-3&league=english'
    );
    expect(target).not.toBeNull();
    expect(target?.targetWins).toBe(29);
    expect(target?.targetPoints).toBe(88);
    expect(target?.draftMode).toBe('classic');
    expect(target?.formation).toBe('4-3-3');
    expect(target?.leagueId).toBe('english');

    expect(parseChallengeFromUrl('https://my-11.com/draft')).toBeNull();
  });

  it('resolveMatchdayLineup & resolveActiveUserMatchdaySquad: preserves chosen lower-rated starter and replaces only ineligible/injured/suspended slots', () => {
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Rotation Boss', nationality: 'Spain' },
      club: manBlue,
      settings: getPresetSettings('easy'),
    });

    // Craft a manual starter who has lower OVR than a bench player, plus one injured and one suspended starter
    const chosenWonderkid: CareerPlayer = {
      ...save.squad[12],
      id: 'chosen_wonderkid_starter',
      name: 'Manual Pick Kid',
      position: 'CM',
      naturalPositions: ['CM'],
      rating: 71,
      age: 19,
      injured: false,
      suspendedMatches: 0,
    };
    const injuredStarter: CareerPlayer = {
      ...save.squad[2],
      id: 'injured_starter_1',
      name: 'Hurt Starter',
      injured: true,
      injuryWeeks: 2,
    };
    const suspendedStarter: CareerPlayer = {
      ...save.squad[3],
      id: 'suspended_starter_1',
      name: 'Banned Starter',
      injured: false,
      suspendedMatches: 1,
    };
    const unregisteredStarter: CareerPlayer = {
      ...save.squad[4],
      id: 'unregistered_starter_1',
      name: 'Unregistered Senior',
      age: 26,
      dateOfBirth: '1999-05-01',
      injured: false,
      suspendedMatches: 0,
    };
    const healthyHigherRatedBench: CareerPlayer = {
      ...save.squad[13],
      id: 'high_rated_bench',
      name: 'Higher Rated Sub',
      position: 'CM',
      naturalPositions: ['CM'],
      rating: 88,
      age: 26,
      injured: false,
      suspendedMatches: 0,
    };

    const customSquad: CareerPlayer[] = [
      save.squad[0], // GK
      save.squad[1],
      injuredStarter,
      suspendedStarter,
      unregisteredStarter,
      save.squad[5],
      save.squad[6],
      save.squad[7],
      save.squad[8],
      save.squad[9],
      chosenWonderkid,
      save.squad[10],
      save.squad[11],
      healthyHigherRatedBench,
      ...save.squad.slice(14),
    ];

    const customLineup = {
      formation: '4-3-3',
      starterIds: customSquad.slice(0, 11).map((p) => p.id),
      benchIds: customSquad.slice(11, 18).map((p) => p.id),
    };

    const registeredIds = customSquad
      .filter((p) => p.id !== 'unregistered_starter_1')
      .map((p) => p.id);

    const resolved = resolveMatchdayLineup(
      customSquad,
      customLineup,
      registeredIds,
      save.season.yearStart,
      true,
      manBlue.id
    );

    // Manually selected lower-rated starter MUST be preserved
    expect(resolved.starterIds).toContain('chosen_wonderkid_starter');
    // Injured, suspended, and unregistered (in league) starters MUST be replaced
    expect(resolved.starterIds).not.toContain('injured_starter_1');
    expect(resolved.starterIds).not.toContain('suspended_starter_1');
    expect(resolved.starterIds).not.toContain('unregistered_starter_1');
    expect(resolved.starterIds).toHaveLength(11);

    // Cup match allows unregistered senior player while still keeping manual XI & excluding injured/suspended
    const cupActive = resolveActiveUserMatchdaySquad(
      customSquad,
      {
        club: manBlue,
        lineup: customLineup,
        registeredPlayerIds: registeredIds,
        season: save.season,
      },
      false,
      true
    );
    const cupStarterIds = cupActive.slice(0, 11).map((p) => p.id);
    expect(cupStarterIds).toContain('chosen_wonderkid_starter');
    expect(cupStarterIds).toContain('unregistered_starter_1');
    expect(cupStarterIds).not.toContain('injured_starter_1');
    expect(cupStarterIds).not.toContain('suspended_starter_1');

    // Time-skip with usePreferredElevenOnHoliday preserves chosen_wonderkid_starter too
    const nextLeagueFix = (save.fixtures || []).find(
      (f) => !f.played && (f.homeClubId === manBlue.id || f.awayClubId === manBlue.id)
    );
    expect(nextLeagueFix).toBeDefined();
    const saveForSkip = {
      ...save,
      squad: customSquad,
      lineup: customLineup,
      registeredPlayerIds: registeredIds,
      settings: { ...save.settings, usePreferredElevenOnHoliday: true, smartPause: false },
    };
    const skipResult = advanceTimeSkip(saveForSkip, 'next_week');
    const playedFix = skipResult.updatedSave.fixtures?.find((f) => f.id === nextLeagueFix!.id);
    if (playedFix?.played && playedFix.starterPlayerIds) {
      expect(playedFix.starterPlayerIds).toContain('chosen_wonderkid_starter');
    }
  });

  it('simulateAiLeagueRoundWithSquads & applySingleMatchdayProgression: updates AI club squads and advances background daily tasks', () => {
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Parity Boss', nationality: 'England' },
      club: manBlue,
      settings: getPresetSettings('easy'),
    });

    const allClubs = getAllClubs();
    const clubsMap = new Map(allClubs.map((c) => [c.id, c]));
    const round1Fixtures = (save.fixtures || []).filter((f) => f.round === 1);
    const userFix = round1Fixtures.find(
      (f) => f.homeClubId === manBlue.id || f.awayClubId === manBlue.id
    )!;

    const simmedUserFix: LeagueFixture = {
      ...userFix,
      played: true,
      homeScore: 2,
      awayScore: 1,
    };

    const aiRound = simulateAiLeagueRoundWithSquads(
      save,
      save.fixtures || [],
      1,
      userFix.id,
      clubsMap,
      allClubs
    );

    const otherAiFix = aiRound.updatedFixtures.find((f) => f.round === 1 && f.id !== userFix.id)!;
    expect(otherAiFix.played).toBe(true);
    expect(aiRound.updatedAiClubSquads[londonRed.id]?.length).toBeGreaterThan(10);
    // At least one starter on AI club should reflect post-match fitness drain
    expect(
      aiRound.updatedAiClubSquads[londonRed.id].some((p) => (p.fitness ?? 100) < 100)
    ).toBe(true);

    // Ensure applySingleMatchdayProgression completes an active construction project whose completionDate passed
    const saveWithProject = {
      ...save,
      fixtures: aiRound.updatedFixtures.map((f) => (f.id === userFix.id ? simmedUserFix : f)),
      infrastructure: {
        stadiumLevel: 1,
        stadiumCapacity: 40000,
        trainingGroundLevel: 1,
        medicalCenterLevel: 1,
        scoutingHubLevel: 1,
        activeProjects: [
          {
            id: 'proj_test_1',
            facilityType: 'trainingGround' as const,
            targetLevel: 2,
            facilityName: 'Elite Performance Complex',
            startDate: '2026-07-02',
            completionDate: '2026-08-15',
            cost: 8_000_000,
            completed: false,
          },
        ],
      },
    };

    const progressed = applySingleMatchdayProgression(saveWithProject, '2026-08-16');
    expect(progressed.infrastructure?.trainingGroundLevel).toBe(2);
    expect(progressed.infrastructure?.activeProjects.find((p) => p.id === 'proj_test_1')?.completed).toBe(true);
  });

  it('activeLeagueClubIds: persists 20 clubs on save creation, backfills on load, and retains promoted Season 2+ clubs', () => {
    const save = createNewCareerSave({
      slotId: 'slot_2',
      manager: { name: 'Promo Manager', nationality: 'England' },
      club: manBlue,
      settings: getPresetSettings('easy'),
    });

    expect(save.activeLeagueClubIds).toBeDefined();
    expect(save.activeLeagueClubIds).toHaveLength(20);
    expect(getActiveLeagueClubs(save)).toHaveLength(20);

    // Simulate Season 2 promotion: replace last club with a promoted lower-league club
    const promotedClub = LOWER_LEAGUE_CLUBS[0];
    const season2ClubIds = [...save.activeLeagueClubIds!.slice(0, 19), promotedClub.id];
    const season2Clubs = getClubsWithUserClub(save.club, season2ClubIds, save.settings.databaseSeason);

    expect(season2Clubs).toHaveLength(20);
    expect(season2Clubs.some((c) => c.id === promotedClub.id)).toBe(true);

    const standings = calculateStandings([], season2Clubs);
    expect(standings.some((s) => s.clubId === promotedClub.id)).toBe(true);

    // Simulate loading a legacy save missing activeLeagueClubIds
    const legacySave = { ...save, activeLeagueClubIds: undefined };
    writeCareerSaveRecord(legacySave);
    const reloaded = loadCareerSave('slot_2');
    expect(reloaded?.activeLeagueClubIds).toHaveLength(20);
  });

  it('playerBioDatabase: exposes load status boolean and error getter cleanly', async () => {
    const loaded = await ensurePlayerBiosLoaded();
    expect(loaded).toBe(true);
    expect(getPlayerBioLoadError()).toBeNull();
  });
});
