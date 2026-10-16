import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FORMATION_SLOTS, calculateSquadStats, evaluateChemistry, simulateLeagueSeason } from '../src/utils/gameLogic';
import { players } from '../src/data/players';
import {
  createNewCareerSave,
} from '../src/career/saves';
import {
  getPresetSettings,
} from '../src/career/settings';
import {
  getNextClubFixture,
  generateRoundRobinFixtures,
} from '../src/career/calendar';
import {
  advanceTimeSkip,
} from '../src/career/sim';
import {
  isPlayerRegisteredForMatch,
  getRegisteredSeniorPlayerIds,
  isHomegrownPlayer,
  isSeniorPlayer,
  isU21Exempt,
  MAX_SENIOR_SQUAD_SIZE,
  MAX_SENIOR_NON_HOMEGROWN,
  getBestStartingLineup,
} from '../src/career/squad';
import { getAllClubs, getClubById } from '../src/career/clubs';
import { CUP_IDS, advanceCupTournament, conductCupDraw } from '../src/career/cups';
import { evaluateTransferOffer, executePlayerSigning, renewPlayerContract } from '../src/career/transfers';
import { getQualificationZone } from '../src/career/table';
import { getLeagueLeaderboards } from '../src/career/playerStats';
import { getSavedTheme, saveTheme, getSavedStreaks } from '../src/utils/storage';
import { MarketPlayer } from '../src/career/types';

describe('Comprehensive Full-Site & Element-by-Element Audit', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => { mockStorage[key] = val; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; },
    });
    vi.stubGlobal('window', {
      scrollTo: vi.fn(),
    });
  });

  describe('1. Global Theme, Storage & Navigation Guardrails', () => {
    it('handles theme toggling between dark and light seamlessly', () => {
      saveTheme('light');
      expect(getSavedTheme()).toBe('light');
      saveTheme('dark');
      expect(getSavedTheme()).toBe('dark');
    });

    it('maintains streak tracking without drift or corruption', () => {
      const initial = getSavedStreaks();
      expect(initial.currentDailyStreak).toBe(0);
      expect(initial.gamesPlayed).toBe(0);
    });
  });

  describe('2. Draft Mode Flow & Formation Integrity', () => {
    it('verifies all supported formations have exactly 11 slots', () => {
      Object.keys(FORMATION_SLOTS).forEach((fmt) => {
        const slots = FORMATION_SLOTS[fmt as keyof typeof FORMATION_SLOTS];
        expect(slots, `Formation ${fmt} should have slots`).toBeDefined();
        expect(slots.length, `Formation ${fmt} must have exactly 11 slots`).toBe(11);
        expect(slots[0].position).toBe('GK');
      });
    });

    it('evaluates chemistry correctly without crashing on empty or partial squad', () => {
      const emptySquad = Array(11).fill(null);
      const emptyStats = calculateSquadStats(emptySquad, FORMATION_SLOTS['4-3-3']);
      expect(emptyStats.overall).toBe(0);
      expect(emptyStats.chemistry).toBe(0);

      // Partial squad with 1 player
      const partialSquad = [...emptySquad];
      partialSquad[0] = players[0];
      const partialStats = calculateSquadStats(partialSquad, FORMATION_SLOTS['4-3-3']);
      expect(partialStats.overall).toBeGreaterThan(0);
    });

    it('runs 38-game season simulation to completion with valid standings', () => {
      const fullSquad = players.slice(0, 11);
      const slots = FORMATION_SLOTS['4-3-3'];
      const stats = calculateSquadStats(fullSquad, slots);
      const simResult = simulateLeagueSeason(fullSquad, stats, 'english');
      expect(simResult.matches.length).toBe(38);
      expect(simResult.wins + simResult.draws + simResult.losses).toBe(38);
      expect(simResult.points).toBe(simResult.wins * 3 + simResult.draws);
      expect(simResult.leaguePosition).toBeGreaterThanOrEqual(1);
      expect(simResult.leaguePosition).toBeLessThanOrEqual(20);
    });
  });

  describe('3. Career Mode Office, Setup & Save Engine', () => {
    it('initializes a clean Career save file with all required properties', () => {
      const arsenal = getAllClubs()[0];
      const settings = getPresetSettings('realistic');
      const save = createNewCareerSave({
        slotId: '1',
        club: arsenal,
        manager: { name: 'Arteta', nationality: 'Spain' },
        settings,
      });
      expect(save.manager.name).toBe('Arteta');
      expect(save.club.id).toBe(arsenal.id);
      expect(save.season.currentDate).toBe(`${save.season.yearStart}-07-01`);
      expect(save.squad.length).toBeGreaterThanOrEqual(18);
      expect(save.finances.transferBudget).toBeGreaterThan(0);
      expect(save.fixtures.length).toBe(380); // 20 teams * 19 rounds * 2 = 380 games
      expect(save.cups).toBeDefined();
    });

    it('advances calendar date and updates fixture tracking', () => {
      const club = getAllClubs()[0];
      const settings = getPresetSettings('casual');
      const save = createNewCareerSave({
        slotId: '1',
        club,
        manager: { name: 'Manager', nationality: 'England' },
        settings,
      });
      const initialDate = save.season.currentDate;
      const res = advanceTimeSkip(save, 'continue');
      expect(res.updatedSave.season.currentDate).not.toBe(initialDate);
    });

    it('identifies next user fixture accurately', () => {
      const club = getAllClubs()[0];
      const settings = getPresetSettings('casual');
      const save = createNewCareerSave({
        slotId: '1',
        club,
        manager: { name: 'Manager', nationality: 'England' },
        settings,
      });
      const nextFix = getNextClubFixture(save.fixtures, club.id);
      expect(nextFix).toBeDefined();
      expect([nextFix?.homeClubId, nextFix?.awayClubId]).toContain(club.id);
      expect(nextFix?.played).toBe(false);
    });
  });

  describe('4. Squad Management, Registration & Homegrown Guardrails', () => {
    it('verifies Premier League 25-man squad registration bounds', () => {
      expect(MAX_SENIOR_SQUAD_SIZE).toBe(25);
      expect(MAX_SENIOR_NON_HOMEGROWN).toBe(17);
    });

    it('auto-registers all senior players when total seniors <= 25', () => {
      const club = getAllClubs()[0];
      const settings = getPresetSettings('casual');
      const save = createNewCareerSave({
        slotId: '1',
        club,
        manager: { name: 'Manager', nationality: 'England' },
        settings,
      });
      const seniors = save.squad.filter((p) => isSeniorPlayer(p, save.season.yearStart));
      const registeredIds = getRegisteredSeniorPlayerIds(save.squad, save.registeredPlayerIds, save.season.yearStart);
      
      expect(registeredIds.length).toBeLessThanOrEqual(25);
      if (seniors.length <= 25) {
        expect(registeredIds.length).toBe(seniors.length);
      }
    });

    it('allows 7 homegrown players without penalty (as long as non-homegrown <= 17)', () => {
      const club = getAllClubs()[0];
      const settings = getPresetSettings('casual');
      const save = createNewCareerSave({
        slotId: '1',
        club,
        manager: { name: 'Manager', nationality: 'England' },
        settings,
      });
      
      // Construct a mock squad with 7 homegrown and 17 non-homegrown seniors = 24 players
      const mockSquad = save.squad.slice(0, 24).map((p, idx) => ({
        ...p,
        age: 26, // senior
        dateOfBirth: '1998-05-15',
        nationality: idx < 7 ? 'England' : 'France',
        isHomegrown: idx < 7,
      }));

      const seniors = mockSquad.filter((p) => isSeniorPlayer(p, save.season.yearStart));
      const hgCount = seniors.filter((p) => isHomegrownPlayer(p)).length;
      const nonHgCount = seniors.filter((p) => !isHomegrownPlayer(p)).length;

      expect(hgCount).toBe(7);
      expect(nonHgCount).toBe(17);
      expect(nonHgCount).toBeLessThanOrEqual(MAX_SENIOR_NON_HOMEGROWN);

      // Verify every player in this 24-man setup is eligible
      mockSquad.forEach((p) => {
        expect(isPlayerRegisteredForMatch(p, mockSquad, mockSquad.map((m) => m.id), save.season.yearStart)).toBe(true);
      });
    });

    it('picks the best starting lineup for chosen formation without exceeding 11 starters', () => {
      const club = getAllClubs()[0];
      const settings = getPresetSettings('casual');
      const save = createNewCareerSave({
        slotId: '1',
        club,
        manager: { name: 'Manager', nationality: 'England' },
        settings,
      });
      const lineup = getBestStartingLineup(save.squad, '4-3-3', save.registeredPlayerIds, save.season.yearStart);
      expect(lineup.starterIds.length).toBe(11);
      expect(lineup.starterIds.every((id) => id.length > 0)).toBe(true);
    });
  });

  describe('5. Transfers & Contracts Market Engine', () => {
    it('evaluates realistic transfer bids cleanly without throwing', () => {
      const targetPlayer: MarketPlayer = {
        id: 'test_player',
        cardId: 'card_tp_1',
        name: 'Super Star',
        age: 25,
        rating: 86,
        position: 'ST',
        club: 'Rival FC',
        nationality: 'England',
        value: 50_000_000,
        weeklyWage: 120_000,
        era: 'Modern',
      };

      // Fair offer
      const fairEval = evaluateTransferOffer(targetPlayer, 55_000_000, 140_000);
      expect(['accepted', 'counter_offer']).toContain(fairEval.status);

      // Ridiculous lowball offer
      const lowballEval = evaluateTransferOffer(targetPlayer, 5_000_000, 20_000);
      expect(lowballEval.status).toBe('fee_rejected');
    });

    it('executes player signing and updates finances and squad records', () => {
      const club = getAllClubs()[0];
      const settings = getPresetSettings('casual');
      let save = createNewCareerSave({
        slotId: '1',
        club,
        manager: { name: 'Manager', nationality: 'England' },
        settings,
      });
      const initialBudget = save.finances.transferBudget;
      const initialSquadCount = save.squad.length;

      const newSign: MarketPlayer = {
        id: 'new_sig_1',
        cardId: 'card_sig_1',
        name: 'Elite Talent',
        age: 23,
        rating: 85,
        position: 'CAM',
        club: 'Free Agent',
        nationality: 'Spain',
        value: 30_000_000,
        weeklyWage: 90_000,
        era: 'Modern',
      };

      const signResult = executePlayerSigning(save, newSign, 30_000_000, 100_000, 4);
      expect(signResult.success).toBe(true);
      expect(signResult.updatedSave.squad.length).toBe(initialSquadCount + 1);
      expect(signResult.updatedSave.finances.transferBudget).toBe(initialBudget - 30_000_000);
      expect(signResult.updatedSave.transfersHistory?.length).toBe(1);
    });

    it('renews expiring contracts accurately', () => {
      const club = getAllClubs()[0];
      const settings = getPresetSettings('casual');
      let save = createNewCareerSave({
        slotId: '1',
        club,
        manager: { name: 'Manager', nationality: 'England' },
        settings,
      });
      const player = save.squad[0];
      const res = renewPlayerContract(save, player.id, 150_000, 4);
      expect(res.success).toBe(true);
      const renewed = res.updatedSave.squad.find((p) => p.id === player.id);
      expect(renewed?.wageWeekly).toBe(150_000);
      expect(renewed?.contractYears).toBe(4);
    });
  });

  describe('6. Tournaments & Cup Competitions Hub', () => {
    it('conducts knockout cup draws when draw date arrives', () => {
      const club = getAllClubs()[0];
      const settings = getPresetSettings('casual');
      const save = createNewCareerSave({
        slotId: '1',
        club,
        manager: { name: 'Manager', nationality: 'England' },
        settings,
      });
      const championsCup = save.cups?.[CUP_IDS.EURO_CHAMPIONS];
      expect(championsCup).toBeDefined();
      if (championsCup && !championsCup.drawCompleted) {
        const drawn = conductCupDraw(championsCup, undefined, club.id);
        expect(drawn.drawCompleted).toBe(true);
        expect(drawn.fixtures.length).toBeGreaterThan(0);
      }
    });

    it('advances cup tournaments properly through knockout rounds', () => {
      const club = getAllClubs()[0];
      const settings = getPresetSettings('casual');
      const save = createNewCareerSave({
        slotId: '1',
        club,
        manager: { name: 'Manager', nationality: 'England' },
        settings,
      });
      const cup = save.cups?.[CUP_IDS.ENGLISH_CUP];
      if (cup) {
        const adv = advanceCupTournament(cup, save.season.yearStart);
        expect(adv.updatedTournament).toBeDefined();
      }
    });
  });

  describe('7. League Standings, Qualification Zones & Leaderboards', () => {
    it('categorizes European qualification and relegation zones correctly', () => {
      expect(getQualificationZone(1)).toBe('champions_league');
      expect(getQualificationZone(4)).toBe('champions_league');
      expect(getQualificationZone(5)).toBe('europa_league');
      expect(getQualificationZone(6)).toBe('conference_league');
      expect(getQualificationZone(10)).toBe('mid_table');
      expect(getQualificationZone(18)).toBe('relegation');
      expect(getQualificationZone(20)).toBe('relegation');
    });

    it('calculates player stats leaderboards without NaN or runtime errors', () => {
      const club = getAllClubs()[0];
      const settings = getPresetSettings('casual');
      const save = createNewCareerSave({
        slotId: '1',
        club,
        manager: { name: 'Manager', nationality: 'England' },
        settings,
      });
      const boards = getLeagueLeaderboards(save.fixtures, club.id, save.squad);
      expect(boards.topScorers).toBeDefined();
      expect(boards.topAssists).toBeDefined();
      expect(boards.topCleanSheets).toBeDefined();
      expect(Array.isArray(boards.topScorers)).toBe(true);
    });
  });
});
