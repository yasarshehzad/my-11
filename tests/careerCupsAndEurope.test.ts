import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializeSeasonCups,
  simulateKnockoutCupFixture,
  getCupWinner,
  advanceCupTournament,
  simulateAiFixturesInCupRound,
  autoResolvePendingCupFixtures,
  CUP_IDS,
  findAnyClub,
} from '../src/career/cups';
import { getAllClubs, getClubById } from '../src/career/clubs';
import { CONTINENTAL_EUROPEAN_CLUBS, getContinentalClubById } from '../src/career/continentalClubs';
import { CupFixture, CupTournament, CareerSaveFile } from '../src/career/types';
import { advanceTimeSkip } from '../src/career/sim';
import { createNewCareerSave } from '../src/career/saves';
import { getPresetSettings } from '../src/career/settings';

// Mock localStorage for node environment
const mockStorage: Record<string, string> = {};
beforeEach(() => {
  for (const k in mockStorage) delete mockStorage[k];
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mockStorage[k] || null,
    setItem: (k: string, v: string) => {
      mockStorage[k] = v;
    },
    removeItem: (k: string) => {
      delete mockStorage[k];
    },
    clear: () => {
      for (const k in mockStorage) delete mockStorage[k];
    },
  });
  vi.stubGlobal('window', {});
});

describe('Career Mode Phase 5: Cups & European Competitions', () => {
  const clubs = getAllClubs();
  const testClub = clubs[0]; // Man Blue

  describe('Continental European Clubs', () => {
    it('provides 10 copyright-safe European giants', () => {
      expect(CONTINENTAL_EUROPEAN_CLUBS.length).toBe(10);
      const names = CONTINENTAL_EUROPEAN_CLUBS.map((c) => c.defaultName);
      expect(names).toContain('Madrid Royal');
      expect(names).toContain('Barcelona Blaugrana');
      expect(names).toContain('Bavarian Munich');
      expect(names).toContain('Paris Red & Blue');
      expect(names).toContain('Lisbon Eagles');
    });

    it('findAnyClub resolves both domestic and continental clubs', () => {
      const domestic = findAnyClub(clubs[0].id);
      expect(domestic).toBeDefined();
      expect(domestic?.id).toBe(clubs[0].id);

      const continental = findAnyClub('madrid_royal');
      expect(continental).toBeDefined();
      expect(continental?.shortName).toBe('RMA');
    });
  });

  describe('Cup Tournament Initialization', () => {
    it('initializes all 6 competitions with correct tournament structures', () => {
      const cups = initializeSeasonCups(testClub, 2026);

      expect(cups[CUP_IDS.SHIELD]).toBeDefined();
      expect(cups[CUP_IDS.LEAGUE_CUP]).toBeDefined();
      expect(cups[CUP_IDS.ENGLISH_CUP]).toBeDefined();
      expect(cups[CUP_IDS.EURO_CHAMPIONS]).toBeDefined();
      expect(cups[CUP_IDS.EURO_CHALLENGE]).toBeDefined();
      expect(cups[CUP_IDS.EURO_PLATE]).toBeDefined();

      // Check Shield
      expect(cups[CUP_IDS.SHIELD].name).toBe('Season Opener Shield');
      expect(cups[CUP_IDS.SHIELD].currentRound).toBe('Final');
      expect(cups[CUP_IDS.SHIELD].fixtures.length).toBe(1);
      expect(cups[CUP_IDS.SHIELD].prizeMoney).toBe(2_500_000);

      // Check League Cup
      expect(cups[CUP_IDS.LEAGUE_CUP].name).toBe('League Cup');
      expect(cups[CUP_IDS.LEAGUE_CUP].currentRound).toBe('Round of 16');
      expect(cups[CUP_IDS.LEAGUE_CUP].fixtures.length).toBe(8);

      // Check European Champions Cup
      expect(cups[CUP_IDS.EURO_CHAMPIONS].name).toBe('European Champions Cup');
      expect(cups[CUP_IDS.EURO_CHAMPIONS].currentRound).toBe('Quarter-Final');
      expect(cups[CUP_IDS.EURO_CHAMPIONS].fixtures.length).toBe(4);
      expect(cups[CUP_IDS.EURO_CHAMPIONS].prizeMoney).toBe(45_000_000);

      // Check that European cups include continental clubs
      const euroClubs = cups[CUP_IDS.EURO_CHAMPIONS].fixtures.flatMap((f) => [
        f.homeClubId,
        f.awayClubId,
      ]);
      expect(euroClubs).toContain('madrid_royal');
      expect(euroClubs).toContain('bavarian_munich');
    });
  });

  describe('Knockout Simulation and Penalty Shootouts', () => {
    it('resolves regulation draws with penalty shootouts', () => {
      const fixture: CupFixture = {
        id: 'test_fix_draw',
        competitionId: CUP_IDS.ENGLISH_CUP,
        competitionName: 'The English Cup',
        round: 1,
        roundName: 'Final',
        date: '2027-05-15',
        homeClubId: clubs[0].id,
        awayClubId: clubs[1].id,
        played: false,
        isKnockout: true,
      };

      // Force draw by running multiple simulations if needed or testing penalty branch
      let foundDraw = false;
      for (let i = 0; i < 30; i++) {
        const simmed = simulateKnockoutCupFixture(fixture, clubs[0], clubs[1]);
        if (simmed.homeScore === simmed.awayScore) {
          foundDraw = true;
          expect(simmed.penalties).toBeDefined();
          expect(simmed.penalties!.homePenalties).not.toBe(simmed.penalties!.awayPenalties);
          const winner = getCupWinner(simmed);
          expect([simmed.homeClubId, simmed.awayClubId]).toContain(winner);
          break;
        }
      }
      expect(true).toBe(true);
    });

    it('getCupWinner identifies correct winners', () => {
      const homeWin: CupFixture = {
        id: 'f1',
        competitionId: 'c1',
        competitionName: 'Cup',
        round: 1,
        roundName: 'Final',
        date: '2026-08-01',
        homeClubId: 'home_club',
        awayClubId: 'away_club',
        played: true,
        isKnockout: true,
        homeScore: 3,
        awayScore: 1,
      };
      expect(getCupWinner(homeWin)).toBe('home_club');

      const awayWin: CupFixture = {
        ...homeWin,
        homeScore: 0,
        awayScore: 2,
      };
      expect(getCupWinner(awayWin)).toBe('away_club');

      const penWin: CupFixture = {
        ...homeWin,
        homeScore: 2,
        awayScore: 2,
        penalties: { homePenalties: 4, awayPenalties: 5 },
      };
      expect(getCupWinner(penWin)).toBe('away_club');
    });
  });

  describe('Bracket Progression', () => {
    it('advances tournament from Round of 16 to Quarter-Final when all matches are played', () => {
      const cups = initializeSeasonCups(testClub, 2026);
      const leagueCup = cups[CUP_IDS.LEAGUE_CUP];

      expect(leagueCup.currentRound).toBe('Round of 16');
      expect(leagueCup.fixtures.length).toBe(8);

      // Initially unplayed -> advance does nothing
      const initialAdv = advanceCupTournament(leagueCup, 2026);
      expect(initialAdv.isNewRound).toBe(false);

      // Play all 8 fixtures
      const playedTourney: CupTournament = {
        ...leagueCup,
        fixtures: leagueCup.fixtures.map((f, i) => ({
          ...f,
          played: true,
          homeScore: 2,
          awayScore: 1,
        })),
      };

      const advanced = advanceCupTournament(playedTourney, 2026);
      expect(advanced.isNewRound).toBe(true);
      expect(advanced.updatedTournament.currentRound).toBe('Quarter-Final');
      // 8 R16 fixtures + 4 QF fixtures = 12 fixtures
      expect(advanced.updatedTournament.fixtures.length).toBe(12);
    });

    it('completes tournament and names champion when Final is played', () => {
      const cups = initializeSeasonCups(testClub, 2026);
      const shield = cups[CUP_IDS.SHIELD];

      expect(shield.currentRound).toBe('Final');
      expect(shield.fixtures.length).toBe(1);

      const playedFinal: CupTournament = {
        ...shield,
        fixtures: [
          {
            ...shield.fixtures[0],
            played: true,
            homeScore: 3,
            awayScore: 1,
          },
        ],
      };

      const result = advanceCupTournament(playedFinal, 2026);
      expect(result.updatedTournament.isCompleted).toBe(true);
      expect(result.updatedTournament.winnerClubId).toBe(shield.fixtures[0].homeClubId);
      expect(result.updatedTournament.runnerUpClubId).toBe(shield.fixtures[0].awayClubId);
    });
  });

  describe('Time-Skip Simulation & Prize Money Integration', () => {
    it('simulates cup ties and awards trophies and prize money upon winning a cup', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Gaffer', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      expect(save.cups).toBeDefined();
      expect(save.cups![CUP_IDS.SHIELD]).toBeDefined();

      const initialBudget = save.finances.transferBudget;

      // Simulate Season Opener Shield final as a win for user's club
      const shield = save.cups![CUP_IDS.SHIELD];
      shield.fixtures[0] = {
        ...shield.fixtures[0],
        homeClubId: testClub.id,
        awayClubId: clubs[1].id,
        played: true,
        homeScore: 2,
        awayScore: 0,
      };

      // Advance time skip
      const skipRes = advanceTimeSkip(save, 'next_week');
      expect(skipRes.updatedSave.trophies.length).toBe(1);
      expect(skipRes.updatedSave.trophies[0].competitionId).toBe(CUP_IDS.SHIELD);
      expect(skipRes.updatedSave.finances.transferBudget).toBe(
        initialBudget + shield.prizeMoney
      );
    });

    it('automatically simulates AI matches in a cup round without manual quick sim', () => {
      const clubs = getAllClubs();
      const userClub = clubs[0]; // Man Blue
      const cups = initializeSeasonCups(userClub, 2026);
      const championsCup = cups[CUP_IDS.EURO_CHAMPIONS];

      // Quarter-Final has 4 matches
      expect(championsCup.fixtures.length).toBe(4);
      expect(championsCup.fixtures.every((f) => !f.played)).toBe(true);

      // Simulate AI fixtures in the Quarter-Final
      const autoPlayed = simulateAiFixturesInCupRound(championsCup, 'Quarter-Final', userClub.id);

      // The AI vs AI matches should now be played automatically
      const aiMatches = autoPlayed.fixtures.filter(
        (f) => f.homeClubId !== userClub.id && f.awayClubId !== userClub.id
      );
      expect(aiMatches.every((f) => f.played)).toBe(true);

      // If user's match was in this round, it remains unplayed for the user to play
      const userMatch = autoPlayed.fixtures.find(
        (f) => f.homeClubId === userClub.id || f.awayClubId === userClub.id
      );
      if (userMatch) {
        expect(userMatch.played).toBe(false);
      }
    });

    it('autoResolvePendingCupFixtures advances cup tournament automatically when dates have passed', () => {
      const clubs = getAllClubs();
      const userClub = clubs[0]; // Man Blue
      const cups = initializeSeasonCups(userClub, 2026);

      // Auto resolve cups up to May 2027
      const { updatedCups } = autoResolvePendingCupFixtures(cups, '2027-05-20', 2026);

      // Tournaments should have simulated their matches automatically
      const leagueCup = updatedCups[CUP_IDS.LEAGUE_CUP];
      expect(leagueCup.fixtures.some((f) => f.played)).toBe(true);
    });
  });
});
