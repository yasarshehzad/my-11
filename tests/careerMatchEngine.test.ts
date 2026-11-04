import { describe, it, expect } from 'vitest';
import {
  simulateFullMatch,
  applyPostMatchSquadImpact,
  applySimulatedMatchSquadImpact,
  calculateTeamDepartmentRatings,
  createLiveMatchSession,
  stepLiveMatchMinute,
  applyHalfTimeTeamTalk,
  makeLiveSubstitution,
  startExtraTimeSession,
  simulatePenaltyShootoutDetailed,
  finalizeLiveMatchSession,
  MatchSimulationConfig,
} from '../src/career/matchEngine';
import { getClubById } from '../src/career/clubs';
import { generateClubSquad, getAiClubMatchdaySquad } from '../src/career/squadGenerator';
import { getPresetSettings } from '../src/career/settings';
import { LeagueFixture, CupFixture } from '../src/career/types';

describe('Career Match Engine & Live Simulation', () => {
  const homeClub = getClubById('london_red')!;
  const awayClub = getClubById('merseyside_red')!;

  const homeSquad = generateClubSquad(homeClub);
  const awaySquad = generateClubSquad(awayClub);

  const fixture: LeagueFixture = {
    id: 'fix_test_live_1',
    competitionId: 'league_english_top_flight',
    round: 1,
    date: '2026-08-15',
    homeClubId: homeClub.id,
    awayClubId: awayClub.id,
    played: false,
  };

  it('calculates 3-department team strength ratings based on player attributes and tactics', () => {
    const starters = homeSquad.slice(0, 11);
    const balancedRatings = calculateTeamDepartmentRatings(starters, {
      formation: '4-3-3',
      mentality: 'balanced',
      pressing: 'balanced',
      style: 'mixed',
    });

    expect(balancedRatings.attack).toBeGreaterThan(60);
    expect(balancedRatings.midfield).toBeGreaterThan(60);
    expect(balancedRatings.defense).toBeGreaterThan(60);
    expect(balancedRatings.overall).toBeGreaterThan(60);

    // Attacking mentality should increase attack rating compared to defensive mentality
    const attackingRatings = calculateTeamDepartmentRatings(starters, {
      formation: '4-3-3',
      mentality: 'attacking',
      pressing: 'high_press',
      style: 'direct_counter',
    });

    const defensiveRatings = calculateTeamDepartmentRatings(starters, {
      formation: '4-3-3',
      mentality: 'defensive',
      pressing: 'low_block',
      style: 'patient',
    });

    expect(attackingRatings.attack).toBeGreaterThan(defensiveRatings.attack);
    expect(defensiveRatings.defense).toBeGreaterThan(attackingRatings.defense);
  });

  it('runs a step-by-step minute-by-minute live match session with substitutions and half-time talk', () => {
    const homeStarters = homeSquad.slice(0, 11);
    const homeBench = homeSquad.slice(11, 18);
    const awayStarters = awaySquad.slice(0, 11);
    const awayBench = awaySquad.slice(11, 18);

    let session = createLiveMatchSession(fixture, {
      homeClub,
      awayClub,
      homeStarters,
      homeBench,
      awayStarters,
      awayBench,
      settings: getPresetSettings('custom'),
      homeFormation: '4-3-3',
      homeMentality: 'balanced',
      homePressing: 'balanced',
      homeStyle: 'mixed',
    });

    expect(session.minute).toBe(0);

    // Step to minute 45 (half-time)
    while (session.minute < 45) {
      session = stepLiveMatchMinute(session);
    }

    expect(session.minute).toBe(45);

    // Apply half-time team talk
    const talkResult = applyHalfTimeTeamTalk(session, homeClub.id, 'demand_more');
    session = talkResult.session;
    expect(session.homeTeamTalkBuff).toBeDefined();

    // Make a tactical substitution at half-time
    const subOut = session.homePlayerStates.find((p) => p.isOnPitch)!;
    const subIn = session.homePlayerStates.find((p) => !p.isOnPitch)!;
    session = makeLiveSubstitution(session, homeClub.id, subOut.player.id, subIn.player.id);

    expect(session.subsRemainingHome).toBe(4);
    const updatedSubOut = session.homePlayerStates.find((p) => p.player.id === subOut.player.id)!;
    const updatedSubIn = session.homePlayerStates.find((p) => p.player.id === subIn.player.id)!;
    expect(updatedSubOut.isOnPitch).toBe(false);
    expect(updatedSubIn.isOnPitch).toBe(true);

    // Play second half until 90'
    while (session.minute < 90) {
      session = stepLiveMatchMinute(session);
    }

    expect(session.minute).toBe(90);

    // Finalize match session
    const finalized = finalizeLiveMatchSession(session);
    expect(finalized.fixture.played).toBe(true);
    expect(finalized.fixture.homeScore).toBe(session.homeScore);
    expect(finalized.fixture.awayScore).toBe(session.awayScore);

    // Fixture persisted ratings & participants
    expect(finalized.fixture.starterPlayerIds).toBeDefined();
    expect(finalized.fixture.starterPlayerIds!.length).toBe(22); // 11 home + 11 away
    expect(finalized.fixture.participatingPlayerIds).toBeDefined();
    expect(finalized.fixture.participatingPlayerIds!.length).toBeGreaterThanOrEqual(23); // 22 starters + 1 sub
    expect(finalized.fixture.playerRatings).toBeDefined();
    expect(Object.keys(finalized.fixture.playerRatings!).length).toBeGreaterThanOrEqual(23);

    // Stats including xG and saves
    expect(finalized.stats.homeXg).toBeDefined();
    expect(finalized.stats.awayXg).toBeDefined();
    expect(finalized.stats.homeSaves).toBeDefined();
    expect(finalized.stats.awaySaves).toBeDefined();
  });

  it('handles cup extra time (120 mins) and interactive penalty shootout', () => {
    const cupFixture: CupFixture = {
      id: 'cup_fix_test_1',
      competitionId: 'english_cup',
      competitionName: 'English FA Cup',
      isKnockout: true,
      round: 3,
      roundName: 'Round 3',
      date: '2027-01-09',
      homeClubId: homeClub.id,
      awayClubId: awayClub.id,
      played: false,
    };

    const homeStarters = homeSquad.slice(0, 11);
    const homeBench = homeSquad.slice(11, 18);
    const awayStarters = awaySquad.slice(0, 11);
    const awayBench = awaySquad.slice(11, 18);

    let session = createLiveMatchSession(cupFixture, {
      homeClub,
      awayClub,
      homeStarters,
      homeBench,
      awayStarters,
      awayBench,
      settings: getPresetSettings('custom'),
    });

    // Run to 90'
    while (session.minute < 90) {
      session = stepLiveMatchMinute(session);
    }

    // Force a draw to test extra time
    session = { ...session, homeScore: 1, awayScore: 1 };

    session = startExtraTimeSession(session);
    expect(session.isExtraTime).toBe(true);
    expect(session.minute).toBe(90);
    expect(session.maxMinutes).toBe(120);

    // Run through extra time to 120'
    while (session.minute < 120) {
      session = stepLiveMatchMinute(session);
    }

    expect(session.minute).toBe(120);

    // If still tied at 120', simulate detailed penalty shootout
    session = { ...session, homeScore: 2, awayScore: 2 };

    const shootout = simulatePenaltyShootoutDetailed(
      homeClub,
      awayClub,
      session.homePlayerStates,
      session.awayPlayerStates
    );
    expect(shootout.kicks.length).toBeGreaterThanOrEqual(6); // at least 3 rounds each or sudden death
    expect(shootout.homePenalties).not.toBe(shootout.awayPenalties); // someone must win
    shootout.kicks.forEach((kick) => {
      expect(kick.takerName).toBeTruthy();
      expect(typeof kick.scored).toBe('boolean');
    });
  });

  it('generates authentic AI club matchday squads with named danger player', () => {
    const aiSquadData = getAiClubMatchdaySquad(awayClub, '2026/27');

    expect(aiSquadData.starters.length).toBe(11);
    expect(aiSquadData.bench.length).toBeGreaterThanOrEqual(7);
    expect(aiSquadData.dangerPlayer).toBeDefined();
    expect(aiSquadData.dangerPlayer.rating).toBeGreaterThanOrEqual(75);
    expect(aiSquadData.dangerPlayer.name).not.toContain('Player 1');
  });

  it('drains fitness and updates recovery symmetrically across instant sim and full match', () => {
    const starters = homeSquad.slice(0, 11).map((p) => ({ ...p, fitness: 100 }));
    const bench = homeSquad.slice(11, 18).map((p) => ({ ...p, fitness: 75 }));
    const injured = [{ ...homeSquad[19], injured: true, injuryWeeks: 2, fitness: 80 }];

    const fullSquad = [...starters, ...bench, ...injured];

    const simFixture: LeagueFixture = {
      id: 'fix_sim_test_1',
      competitionId: 'league_english_top_flight',
      round: 1,
      date: '2026-08-15',
      homeClubId: homeClub.id,
      awayClubId: awayClub.id,
      played: true,
      homeScore: 2,
      awayScore: 1,
      participatingPlayerIds: starters.map((s) => s.id),
    };

    const updated = applySimulatedMatchSquadImpact(
      fullSquad,
      [...starters, ...bench],
      simFixture,
      homeClub.id,
      getPresetSettings('custom')
    );

    // Starters lost stamina
    starters.forEach((s) => {
      const p = updated.find((u) => u.id === s.id)!;
      expect(p.fitness).toBeLessThan(100);
    });

    // Rested bench players who were not subbed on recovered stamina
    bench.slice(2).forEach((b) => {
      const p = updated.find((u) => u.id === b.id)!;
      expect(p.fitness).toBeGreaterThan(75);
    });

    // Injured player had countdown reduced
    const updatedInjured = updated.find((u) => u.id === injured[0].id)!;
    expect(updatedInjured.injuryWeeks).toBe(1);
  });

  it('simulates a complete match with events, stats, and MOTM', () => {
    const config: MatchSimulationConfig = {
      homeClub,
      awayClub,
      homeStarters: homeSquad.slice(0, 11),
      homeBench: homeSquad.slice(11, 18),
      awayStarters: awaySquad.slice(0, 11),
      awayBench: awaySquad.slice(11, 18),
      settings: getPresetSettings('easy'),
    };

    const result = simulateFullMatch(fixture, config);

    expect(result.fixture.played).toBe(true);
    expect(result.homeScore).toBeGreaterThanOrEqual(0);
    expect(result.awayScore).toBeGreaterThanOrEqual(0);

    // Stats validation
    expect(result.stats.homePossession + result.stats.awayPossession).toBe(100);
    expect(result.stats.homeShots).toBeGreaterThanOrEqual(result.homeScore);
    expect(result.stats.awayShots).toBeGreaterThanOrEqual(result.awayScore);

    // Man of the Match
    expect(result.manOfTheMatch.name).toBeTruthy();
    expect(result.manOfTheMatch.rating).toBeGreaterThanOrEqual(6.0);
    expect(result.manOfTheMatch.rating).toBeLessThanOrEqual(10.0);

    // Scorers match the scoreline
    const goalEvents = result.events.filter((e) => e.type === 'goal');
    expect(goalEvents.length).toBe(result.homeScore + result.awayScore);
  });

  it('drains fitness for on-pitch players while resting bench players recover', () => {
    const starters = homeSquad.slice(0, 11).map((p) => ({ ...p, fitness: 100 }));
    const bench = homeSquad.slice(11, 18).map((p) => ({ ...p, fitness: 80 }));

    const config: MatchSimulationConfig = {
      homeClub,
      awayClub,
      homeStarters: starters,
      homeBench: bench,
      awayStarters: awaySquad.slice(0, 11),
      awayBench: awaySquad.slice(11, 18),
      settings: getPresetSettings('hard'),
    };

    const result = simulateFullMatch(fixture, config);

    const updatedSquad = applyPostMatchSquadImpact(
      [...starters, ...bench],
      result.homePlayerStates,
      true, // won match
      getPresetSettings('hard')
    );

    // Starters must have drained fitness
    const updatedStarters = updatedSquad.filter((p) => starters.some((s) => s.id === p.id));
    updatedStarters.forEach((p) => {
      expect(p.fitness).toBeLessThan(100);
      expect(p.fitness).toBeGreaterThanOrEqual(50);
    });

    // Bench players who did not play should have recovered fitness
    const restedBench = updatedSquad.filter(
      (p) => bench.some((b) => b.id === p.id) && !result.homePlayerStates.find((s) => s.player.id === p.id && s.minutesPlayed > 0)
    );
    restedBench.forEach((p) => {
      expect(p.fitness).toBeGreaterThan(80); // gained stamina
    });
  });

  it('recovers injured players over time when rested', () => {
    const injuredPlayer = {
      ...homeSquad[0],
      injured: true,
      injuryWeeks: 2,
      fitness: 85,
    };

    const updated = applyPostMatchSquadImpact(
      [injuredPlayer],
      [], // no minutes played
      true,
      getPresetSettings('easy')
    );

    expect(updated[0].injuryWeeks).toBe(1);
    expect(updated[0].injured).toBe(true);

    // Rest again
    const updatedAgain = applyPostMatchSquadImpact(
      updated,
      [],
      true,
      getPresetSettings('easy')
    );

    expect(updatedAgain[0].injuryWeeks).toBe(0);
    expect(updatedAgain[0].injured).toBe(false); // fully healed!
  });

  it('respects match retry permission across difficulty presets', () => {
    const easy = getPresetSettings('easy');
    const hard = getPresetSettings('hard');

    expect(easy.retryMatch).toBe(true);
    expect(hard.retryMatch).toBe(false);
  });
});
