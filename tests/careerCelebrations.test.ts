import { describe, it, expect } from 'vitest';
import { detectCelebrationEvent } from '../src/career/celebrations';
import { CareerSaveFile, CupTournament, LeagueFixture } from '../src/career/types';
import { getAllClubs } from '../src/career/clubs';

function getMockSave(): CareerSaveFile {
  const clubs = getAllClubs();
  const userClub = clubs[0];
  return {
    version: 1,
    id: 'slot_1',
    createdAt: '2026-07-01',
    lastSavedAt: '2026-07-01',
    manager: {
      name: 'Test Manager',
      nationality: 'England',
      avatarUrl: '',
      tacticalPhilosophy: 'Balanced',
      contractYearsRemaining: 3,
      reputationScore: 80,
    },
    club: userClub,
    settings: {
      currency: 'GBP',
      matchLengthMinutes: 6,
      difficulty: 'normal',
      autosaveFrequency: 'after_every_match',
      dateFormat: 'DD/MM/YYYY',
      enableInjuries: true,
      enableTransferWindows: true,
    },
    season: {
      seasonNumber: 1,
      yearStart: 2026,
      currentDate: '2027-02-28',
      matchDay: 28,
      matchesPlayed: 28,
      isTransferWindowOpen: false,
    },
    finances: {
      transferBudget: 50_000_000,
      wageBudgetWeekly: 2_500_000,
      wageSpentWeekly: 2_000_000,
      balance: 75_000_000,
      weeklyNetIncome: 200_000,
    },
    squad: [
      {
        id: 'p1',
        name: 'Kevin De Bruyne',
        position: 'MID',
        rating: 91,
        age: 34,
        clubId: userClub.id,
        isCaptain: true,
        stats: { pace: 72, shooting: 88, passing: 94, dribbling: 87, defending: 65, physical: 74 },
        form: 'superb',
        morale: 'ecstatic',
        fitness: 100,
        injured: false,
        contractWeeksRemaining: 52,
        wageWeekly: 350_000,
        marketValue: 40_000_000,
      },
    ],
    trophies: [],
    boardStatus: {
      confidence: 85,
      statusText: 'Confident',
      wageBudgetIncreasesGranted: 0,
    },
    phase: 'regular_season',
    inbox: [],
    celebratedMilestones: [],
    cups: {},
  };
}

describe('Career Celebration System', () => {
  it('detects and triggers a celebration when the user wins a Cup Final', () => {
    const save = getMockSave();
    const mockCup: CupTournament = {
      id: 'cup_league_cup',
      name: 'Carabao Cup',
      currentRound: 'Final',
      fixtures: [
        {
          id: 'fix_final',
          competitionId: 'cup_league_cup',
          competitionName: 'Carabao Cup',
          round: 5,
          roundName: 'Final',
          date: '2027-02-28',
          homeClubId: save.club.id,
          awayClubId: 'chelsea',
          homeScore: 3,
          awayScore: 1,
          played: true,
          isKnockout: true,
        },
      ],
      isCompleted: true,
      winnerClubId: save.club.id,
      prizeMoney: 3_000_000,
      drawCompleted: true,
    };

    save.cups = { cup_league_cup: mockCup };

    const result = detectCelebrationEvent(save);
    expect(result).not.toBeNull();
    expect(result?.event.category).toBe('cup_win');
    expect(result?.event.badge).toBe('🏆');
    expect(result?.event.title).toContain('CARABAO CUP CHAMPIONS');
    expect(result?.event.rewards?.prizeMoney).toBe(3_000_000);
    expect(result?.event.playerReaction.player.isCaptain).toBe(true);
    expect(result?.updatedSave.celebratedMilestones).toContain('2026_cup_trophy_cup_league_cup');
    expect(result?.updatedSave.inbox?.[0].subject).toContain('Carabao Cup Winners');

    // A second check on the updated save should return null (prevent duplicate modal)
    const secondCheck = detectCelebrationEvent(result!.updatedSave);
    expect(secondCheck).toBeNull();
  });

  it('detects and triggers an advancement celebration when user wins a cup tie before the final', () => {
    const save = getMockSave();
    const mockCup: CupTournament = {
      id: 'cup_the_english_cup',
      name: 'FA Cup',
      currentRound: 'Quarter-Final',
      fixtures: [
        {
          id: 'fix_qf',
          competitionId: 'cup_the_english_cup',
          competitionName: 'FA Cup',
          round: 4,
          roundName: 'Quarter-Final',
          date: '2027-03-15',
          homeClubId: save.club.id,
          awayClubId: 'liverpool',
          homeScore: 2,
          awayScore: 0,
          played: true,
          isKnockout: true,
        },
      ],
      isCompleted: false,
      prizeMoney: 10_000_000,
      drawCompleted: true,
    };

    save.cups = { cup_the_english_cup: mockCup };

    const result = detectCelebrationEvent(save);
    expect(result).not.toBeNull();
    expect(result?.event.category).toBe('knockout_advancement');
    expect(result?.event.title).toContain('THROUGH TO THE SEMI-FINALS');
    expect(result?.updatedSave.celebratedMilestones).toContain('2026_cup_adv_cup_the_english_cup_Quarter-Final');
  });

  it('detects and triggers a league title celebration when user mathematically clinches the championship', () => {
    const save = getMockSave();
    const clubs = getAllClubs();
    const fixtures: LeagueFixture[] = [];

    // Simulate 35 games where user has 35 wins = 105 points, 2nd place has 70 points
    for (let r = 1; r <= 35; r++) {
      fixtures.push({
        id: `f_${r}`,
        round: r,
        date: '2027-04-10',
        homeClubId: save.club.id,
        awayClubId: clubs[1].id,
        homeScore: 2,
        awayScore: 0,
        played: true,
      });
      // 2nd place won some
      fixtures.push({
        id: `f2_${r}`,
        round: r,
        date: '2027-04-10',
        homeClubId: clubs[1].id,
        awayClubId: clubs[2].id,
        homeScore: r <= 23 ? 1 : 0,
        awayScore: r <= 23 ? 0 : 1,
        played: true,
      });
    }

    save.fixtures = fixtures;

    const result = detectCelebrationEvent(save);
    expect(result).not.toBeNull();
    expect(result?.event.category).toBe('title_win');
    expect(result?.event.title).toContain('CHAMPIONS OF ENGLAND');
    expect(result?.updatedSave.celebratedMilestones).toContain('2026_league_champions');
    expect(result?.updatedSave.finances.transferBudget).toBe(88_000_000); // 50m + 38m
  });
});
