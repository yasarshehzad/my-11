import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isSeasonComplete,
  getSeasonReviewSummary,
  advanceToNextSeason,
} from '../src/career/seasons';
import { createNewCareerSave } from '../src/career/saves';
import { getPresetSettings } from '../src/career/settings';
import { getClubById } from '../src/career/clubs';
import { CareerSaveFile } from '../src/career/types';

describe('Career Seasons Engine & Dynasty Progression', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    });
    vi.stubGlobal('window', {});
  });

  const club = getClubById('man_blue')!;

  it('correctly detects whether a 38-game season is complete', () => {
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Pep', nationality: 'Spain' },
      club,
      settings: getPresetSettings('easy'),
    });

    expect(isSeasonComplete(save.fixtures)).toBe(false);

    // Mark all fixtures as played
    const completedFixtures = (save.fixtures || []).map((f) => ({
      ...f,
      played: true,
      homeScore: 2,
      awayScore: 1,
    }));

    expect(isSeasonComplete(completedFixtures)).toBe(true);
  });

  it('evaluates season review summary with prize money and continental qualification', () => {
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Pep', nationality: 'Spain' },
      club,
      settings: getPresetSettings('easy'),
    });

    // Artificially put user's club at position 1 in standings
    const standings = [...(save.standings || [])];
    const userStandingIdx = standings.findIndex((s) => s.clubId === club.id);
    if (userStandingIdx > 0) {
      const temp = standings[0];
      standings[0] = standings[userStandingIdx];
      standings[userStandingIdx] = temp;
    }

    const saveChampion: CareerSaveFile = {
      ...save,
      standings,
    };

    const summary = getSeasonReviewSummary(saveChampion);
    expect(summary.seasonNumber).toBe(1);
    expect(summary.finalPosition).toBe(1);
    expect(summary.leagueTitle).toBe(true);
    expect(summary.prizeMoney).toBe(40_000_000);
    expect(summary.europeanQualification).toContain('European Champions Cup');
    expect(summary.trophiesWon).toContain('English Top Flight');
  });

  it('advances career to Season 2, aging squad, generating new youth, awarding prize money and resetting table', () => {
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Pep', nationality: 'Spain' },
      club,
      settings: getPresetSettings('easy'),
    });

    // Simulate an injured, tired player
    const injuredSquad = [...save.squad];
    injuredSquad[0] = {
      ...injuredSquad[0],
      fitness: 45,
      injured: true,
      injuryWeeks: 3,
      age: 21,
      rating: 75,
      potential: 85,
    };

    const initialBudget = save.finances.transferBudget;
    const initialTrophiesCount = save.trophies.length;
    const initialAcademyCount = (save.youthAcademy || []).length;

    const saveCompleted: CareerSaveFile = {
      ...save,
      squad: injuredSquad,
    };

    const { updatedSave, summary } = advanceToNextSeason(saveCompleted);

    // Season metadata
    expect(updatedSave.season.seasonNumber).toBe(2);
    expect(updatedSave.season.yearStart).toBe(2027);
    expect(updatedSave.season.currentDate).toBe('2027-07-01');
    expect(updatedSave.season.transferWindowOpen).toBe(true);

    // Prize money applied
    expect(updatedSave.finances.transferBudget).toBe(initialBudget + summary.prizeMoney);
    expect(updatedSave.finances.balance).toBe(save.finances.balance + summary.prizeMoney);

    // Squad recovered over summer
    const player1 = updatedSave.squad[0];
    expect(player1.age).toBe(22);
    expect(player1.fitness).toBe(100);
    expect(player1.injured).toBe(false);
    expect(player1.injuryWeeks).toBe(0);
    expect(player1.rating).toBeGreaterThanOrEqual(76); // Developed +1 to +3

    // Fresh youth academy intake added
    expect((updatedSave.youthAcademy || []).length).toBeGreaterThan(initialAcademyCount);

    // 38 fresh fixtures generated for 2027
    expect(updatedSave.fixtures?.length).toBe(380);
    expect(updatedSave.fixtures?.every((f) => !f.played)).toBe(true);
    expect(updatedSave.fixtures?.[0].date.startsWith('2027')).toBe(true);

    // Standings reset to 0 points / 0 played
    expect(updatedSave.standings?.every((s) => s.played === 0 && s.points === 0)).toBe(true);

    // Board confidence reset for fresh season
    expect(updatedSave.boardStatus?.status).toBe('secure');
    expect(updatedSave.boardStatus?.confidence).toBe(85);
  });
});
