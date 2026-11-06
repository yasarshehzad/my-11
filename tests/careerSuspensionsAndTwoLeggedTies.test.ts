import { describe, it, expect } from 'vitest';
import { applyPostMatchSquadImpact, InGamePlayerState } from '../src/career/matchEngine';
import { CareerPlayer, CupFixture, CupTournament } from '../src/career/types';
import { autoRotateFitLineup, isPlayerAvailableForMatch } from '../src/career/squad';
import { advanceCupTournament, CUP_IDS, getCupWinner, simulateKnockoutCupFixture } from '../src/career/cups';

function createDummyPlayer(id: string, name: string, rating: number = 80, position: string = 'CM'): CareerPlayer {
  return {
    id,
    name,
    age: 24,
    nationality: 'England',
    position,
    rating,
    value: 20_000_000,
    wageWeekly: 50_000,
    contractYears: 3,
    fitness: 100,
    morale: 80,
    form: 7.0,
    stats: { appearances: 0, goals: 0, assists: 0, cleanSheets: 0 },
    statsHistory: [],
    yellowCardsTotal: 0,
    redCardsTotal: 0,
    suspendedMatches: 0,
  };
}

describe('Option 1: Disciplinary Tracking & Suspensions', () => {
  it('assigns 1 match suspension on receiving a red card', () => {
    const p1 = createDummyPlayer('p1', 'Declan Rice');
    const pStates: InGamePlayerState[] = [
      {
        player: p1,
        isStarter: true,
        isOnPitch: true,
        minutesPlayed: 65,
        currentFitness: 85,
        goals: 0,
        assists: 0,
        yellowCard: false,
        redCard: true,
        injured: false,
        matchRating: 5.5,
      },
    ];

    const updated = applyPostMatchSquadImpact([p1], pStates, false, {} as any);
    const updatedP1 = updated.find((p) => p.id === 'p1')!;

    expect(updatedP1.redCardsTotal).toBe(1);
    expect(updatedP1.suspendedMatches).toBe(1);
    expect(updatedP1.suspensionReason).toContain('Red card');
  });

  it('decrements suspension countdown when player serves a ban while rested', () => {
    const p1 = createDummyPlayer('p1', 'Declan Rice');
    p1.suspendedMatches = 1;
    p1.suspensionReason = 'Suspended (Red card in previous match)';

    // Player did not feature in this match (no in-game state for p1)
    const pStates: InGamePlayerState[] = [];

    const updated = applyPostMatchSquadImpact([p1], pStates, true, {} as any);
    const updatedP1 = updated.find((p) => p.id === 'p1')!;

    expect(updatedP1.suspendedMatches).toBe(0);
    expect(updatedP1.suspensionReason).toBeUndefined();
  });

  it('triggers a 1-match ban on accumulating 5 yellow cards', () => {
    const p1 = createDummyPlayer('p1', 'Bruno Fernandes');
    p1.yellowCardsTotal = 4;

    const pStates: InGamePlayerState[] = [
      {
        player: p1,
        isStarter: true,
        isOnPitch: true,
        minutesPlayed: 90,
        currentFitness: 80,
        goals: 0,
        assists: 0,
        yellowCard: true,
        redCard: false,
        injured: false,
        matchRating: 6.8,
      },
    ];

    const updated = applyPostMatchSquadImpact([p1], pStates, true, {} as any);
    const updatedP1 = updated.find((p) => p.id === 'p1')!;

    expect(updatedP1.yellowCardsTotal).toBe(5);
    expect(updatedP1.suspendedMatches).toBe(1);
    expect(updatedP1.suspensionReason).toContain('Yellow cards accumulated');
  });

  it('isPlayerAvailableForMatch correctly marks suspended players as unavailable', () => {
    const p1 = createDummyPlayer('p1', 'Player One');
    p1.suspendedMatches = 1;
    p1.suspensionReason = 'Suspended';

    const check = isPlayerAvailableForMatch(p1, [p1], ['p1'], 2026);
    expect(check.available).toBe(false);
    expect(check.reason).toContain('Suspended');
  });

  it('autoRotateFitLineup rotates out a suspended starter', () => {
    const starterSuspended = createDummyPlayer('s1', 'Suspended Starter', 85, 'GK');
    starterSuspended.suspendedMatches = 1;

    const benchReplacement = createDummyPlayer('b1', 'Fit Reserve', 80, 'GK');
    const squad = [starterSuspended, benchReplacement];

    const currentLineup = {
      formation: '4-3-3',
      starterIds: ['s1'],
      benchIds: ['b1'],
    };

    const rotation = autoRotateFitLineup(squad, currentLineup as any, 78, ['s1', 'b1'], 2026);
    expect(rotation.rotatedCount).toBe(1);
    expect(rotation.updatedLineup.starterIds[0]).toBe('b1');
    expect(rotation.swaps[0].fatiguedPlayer.id).toBe('s1');
  });
});

describe('Option 1: Two-Legged European Knockouts', () => {
  it('in Leg 1, allows draws to stand without penalty shootouts', () => {
    const leg1Fix: CupFixture = {
      id: 'ucl_qf_leg1',
      competitionId: CUP_IDS.EURO_CHAMPIONS,
      competitionName: 'European Champions Cup',
      round: 9,
      roundName: 'Quarter-Final (Leg 1)',
      date: '2027-03-10',
      homeClubId: 'chelsea',
      awayClubId: 'arsenal',
      played: false,
      isKnockout: true,
      leg: 1,
    };

    const squadH = [
      createDummyPlayer('h1', 'Player H1', 82, 'ST'),
      createDummyPlayer('h2', 'Player H2', 81, 'CM'),
      createDummyPlayer('h3', 'Player H3', 80, 'CB'),
    ];
    const squadA = [
      createDummyPlayer('a1', 'Player A1', 82, 'ST'),
      createDummyPlayer('a2', 'Player A2', 81, 'CM'),
      createDummyPlayer('a3', 'Player A3', 80, 'CB'),
    ];

    const sim = simulateKnockoutCupFixture(
      leg1Fix,
      { id: 'chelsea', name: 'Chelsea', reputation: 85, shortName: 'CHE', defaultName: 'Chelsea' } as any,
      { id: 'arsenal', name: 'Arsenal', reputation: 85, shortName: 'ARS', defaultName: 'Arsenal' } as any,
      squadH,
      squadA
    );

    // In Leg 1, penalties must be undefined even if drawn
    if (sim.homeScore === sim.awayScore) {
      expect(sim.penalties).toBeUndefined();
    }
    expect(sim.played).toBe(true);
  });

  it('in Leg 2, calculates winner based on aggregate score and triggers penalties only if aggregate is level', () => {
    // Leg 1 was Arsenal 2 - 1 Bayern (so Arsenal +1)
    // In Leg 2: Bayern is Home, Arsenal is Away
    // aggregateHomeScore = 1 (Bayern from leg 1), aggregateAwayScore = 2 (Arsenal from leg 1)
    const leg2Fix: CupFixture = {
      id: 'ucl_qf_leg2',
      competitionId: CUP_IDS.EURO_CHAMPIONS,
      competitionName: 'European Champions Cup',
      round: 10,
      roundName: 'Quarter-Final (Leg 2)',
      date: '2027-03-17',
      homeClubId: 'bayern_munich',
      awayClubId: 'arsenal',
      played: false,
      isKnockout: true,
      leg: 2,
      aggregateHomeScore: 1, // Bayern scored 1 in leg 1
      aggregateAwayScore: 2, // Arsenal scored 2 in leg 1
    };

    // Scenario A: Bayern wins Leg 2 2-0 (Agg: Bayern 3, Arsenal 2 -> Bayern wins)
    const playedLeg2A: CupFixture = {
      ...leg2Fix,
      homeScore: 2,
      awayScore: 0,
      played: true,
    };
    expect(getCupWinner(playedLeg2A)).toBe('bayern_munich');

    // Scenario B: Bayern wins Leg 2 1-0 (Agg: Bayern 2, Arsenal 2 -> Aggregate Tied!)
    const playedLeg2B: CupFixture = {
      ...leg2Fix,
      homeScore: 1,
      awayScore: 0,
      played: true,
      penalties: { homePenalties: 5, awayPenalties: 4 },
    };
    expect(getCupWinner(playedLeg2B)).toBe('bayern_munich');

    // Scenario C: Arsenal wins on penalties if Arsenal scores more penalties
    const playedLeg2C: CupFixture = {
      ...leg2Fix,
      homeScore: 1,
      awayScore: 0,
      played: true,
      penalties: { homePenalties: 3, awayPenalties: 4 },
    };
    expect(getCupWinner(playedLeg2C)).toBe('arsenal');
  });

  it('automatically schedules Leg 2 after Leg 1 concludes in European tournaments', () => {
    const tournament: CupTournament = {
      id: CUP_IDS.EURO_CHAMPIONS,
      name: 'European Champions Cup',
      tier: 'continental',
      stage: 'knockout',
      currentRound: 'Quarter-Final (Leg 1)',
      isCompleted: false,
      fixtures: [
        {
          id: 'fix_leg1_1',
          competitionId: CUP_IDS.EURO_CHAMPIONS,
          competitionName: 'European Champions Cup',
          round: 9,
          roundName: 'Quarter-Final (Leg 1)',
          date: '2027-03-10',
          homeClubId: 'arsenal',
          awayClubId: 'bayern_munich',
          homeScore: 2,
          awayScore: 1,
          played: true,
          isKnockout: true,
          leg: 1,
        },
      ],
    };

    const res = advanceCupTournament(tournament, 2026);
    expect(res.isNewRound).toBe(true);
    expect(res.updatedTournament.currentRound).toBe('Quarter-Final (Leg 2)');

    const leg2 = res.updatedTournament.fixtures.find((f) => f.roundName === 'Quarter-Final (Leg 2)');
    expect(leg2).toBeDefined();
    expect(leg2?.homeClubId).toBe('bayern_munich'); // Swapped venue
    expect(leg2?.awayClubId).toBe('arsenal');
    expect(leg2?.leg).toBe(2);
    // In leg 2: Bayern is home, Arsenal is away.
    // Bayern scored 1 in leg 1 (aggregateHomeScore), Arsenal scored 2 in leg 1 (aggregateAwayScore).
    expect(leg2?.aggregateHomeScore).toBe(1);
    expect(leg2?.aggregateAwayScore).toBe(2);
  });
});
