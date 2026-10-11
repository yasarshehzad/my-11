import {
  CareerPlayer,
  Club,
  LeagueFixture,
  MatchEvent,
  MatchStats,
  TacticalMentality,
  CareerSettings,
  GoalScorer,
} from './types';
import { categorizePosition } from './squad';

export interface InGamePlayerState {
  player: CareerPlayer;
  isStarter: boolean;
  isOnPitch: boolean;
  minutesPlayed: number;
  currentFitness: number; // 0-100%
  goals: number;
  assists: number;
  yellowCard: boolean;
  redCard: boolean;
  injured: boolean;
  matchRating: number; // 6.0 - 10.0
}

export interface MatchSimulationConfig {
  homeClub: Club;
  awayClub: Club;
  homeStarters: CareerPlayer[];
  homeBench: CareerPlayer[];
  awayStarters: CareerPlayer[];
  awayBench: CareerPlayer[];
  homeMentality?: TacticalMentality;
  awayMentality?: TacticalMentality;
  settings: CareerSettings;
}

export interface MatchSimulationResult {
  fixture: LeagueFixture;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  stats: MatchStats;
  manOfTheMatch: { name: string; clubId: string; rating: number };
  homePlayerStates: InGamePlayerState[];
  awayPlayerStates: InGamePlayerState[];
}

/**
 * High-fidelity match simulator supporting live commentary ticks, 5 substitutions,
 * stamina drain, in-match injuries, and realistic stats.
 */
export function simulateFullMatch(
  fixture: LeagueFixture,
  config: MatchSimulationConfig
): MatchSimulationResult {
  const { homeClub, awayClub, homeStarters, homeBench, awayStarters, awayBench, settings } = config;

  // Initialize player tracking states
  const homeStates: InGamePlayerState[] = [
    ...homeStarters.map((p) => createPlayerState(p, true)),
    ...homeBench.map((p) => createPlayerState(p, false)),
  ];

  const awayStates: InGamePlayerState[] = [
    ...awayStarters.map((p) => createPlayerState(p, true)),
    ...awayBench.map((p) => createPlayerState(p, false)),
  ];

  // Calculate base team strengths
  const homeAvgRating = homeStarters.reduce((s, p) => s + p.rating, 0) / Math.max(1, homeStarters.length);
  const awayAvgRating = awayStarters.reduce((s, p) => s + p.rating, 0) / Math.max(1, awayStarters.length);

  // Home advantage (+2.5)
  const homeAdvantage = 2.5;

  // Tactical mentality modifiers
  const homeMentality = config.homeMentality || 'balanced';
  const awayMentality = config.awayMentality || 'balanced';

  const homeAttackMod = homeMentality === 'attacking' ? 1.2 : homeMentality === 'defensive' ? 0.8 : 1.0;
  const awayAttackMod = awayMentality === 'attacking' ? 1.2 : awayMentality === 'defensive' ? 0.8 : 1.0;

  const homeDefenseMod = homeMentality === 'defensive' ? 1.2 : homeMentality === 'attacking' ? 0.85 : 1.0;
  const awayDefenseMod = awayMentality === 'defensive' ? 1.2 : awayMentality === 'attacking' ? 0.85 : 1.0;

  const effectiveHomeRating = (homeAvgRating + homeAdvantage) * homeAttackMod * (1 / awayDefenseMod);
  const effectiveAwayRating = awayAvgRating * awayAttackMod * (1 / homeDefenseMod);

  const delta = effectiveHomeRating - effectiveAwayRating;

  // Expected goals (xG)
  const homeXg = Math.max(0.4, Math.min(3.8, 1.45 + delta * 0.08));
  const awayXg = Math.max(0.3, Math.min(3.2, 1.15 - delta * 0.08));

  const events: MatchEvent[] = [];
  const scorers: GoalScorer[] = [];

  let homeScore = 0;
  let awayScore = 0;

  // Goals generated
  const homeGoalsCount = samplePoissonGoals(homeXg);
  const awayGoalsCount = samplePoissonGoals(awayXg);

  // Distribute home goals
  for (let i = 0; i < homeGoalsCount; i++) {
    const minute = Math.floor(Math.random() * 88) + 2;
    const activeHomePlayers = homeStates.filter((s) => s.isOnPitch);
    const scorer = pickAttackingPlayer(activeHomePlayers) || homeStates[0];
    scorer.goals += 1;
    scorer.matchRating += 0.8;

    homeScore++;
    events.push({
      minute,
      type: 'goal',
      clubId: homeClub.id,
      playerName: scorer.player.name,
      detail: `GOAL! ${scorer.player.name} strikes for ${homeClub.defaultName}!`,
    });
    scorers.push({
      name: scorer.player.name,
      minute,
      clubId: homeClub.id,
      cardId: scorer.player.cardId,
    });
  }

  // Distribute away goals
  for (let i = 0; i < awayGoalsCount; i++) {
    const minute = Math.floor(Math.random() * 88) + 2;
    const activeAwayPlayers = awayStates.filter((s) => s.isOnPitch);
    const scorer = pickAttackingPlayer(activeAwayPlayers) || awayStates[0];
    scorer.goals += 1;
    scorer.matchRating += 0.8;

    awayScore++;
    events.push({
      minute,
      type: 'goal',
      clubId: awayClub.id,
      playerName: scorer.player.name,
      detail: `GOAL! ${scorer.player.name} finds the net for ${awayClub.defaultName}!`,
    });
    scorers.push({
      name: scorer.player.name,
      minute,
      clubId: awayClub.id,
      cardId: scorer.player.cardId,
    });
  }

  // Generate cards and fouls
  const homeFouls = Math.floor(Math.random() * 8) + 6;
  const awayFouls = Math.floor(Math.random() * 8) + 6;

  // Yellow cards (1 to 3 per team)
  const homeYellows = Math.floor(Math.random() * 3);
  for (let i = 0; i < homeYellows; i++) {
    const minute = Math.floor(Math.random() * 80) + 10;
    const player = homeStates.find((p) => p.isOnPitch && !p.yellowCard);
    if (player) {
      player.yellowCard = true;
      player.matchRating -= 0.3;
      events.push({
        minute,
        type: 'yellow_card',
        clubId: homeClub.id,
        playerName: player.player.name,
        detail: `Yellow card shown to ${player.player.name}`,
      });
    }
  }

  const awayYellows = Math.floor(Math.random() * 3);
  for (let i = 0; i < awayYellows; i++) {
    const minute = Math.floor(Math.random() * 80) + 10;
    const player = awayStates.find((p) => p.isOnPitch && !p.yellowCard);
    if (player) {
      player.yellowCard = true;
      player.matchRating -= 0.3;
      events.push({
        minute,
        type: 'yellow_card',
        clubId: awayClub.id,
        playerName: player.player.name,
        detail: `Yellow card shown to ${player.player.name}`,
      });
    }
  }

  // Injury chance check based on injury severity settings
  const injuryProb =
    settings.injurySeverity === 'high' ? 0.08 : settings.injurySeverity === 'medium' ? 0.04 : 0.015;

  if (Math.random() < injuryProb) {
    const minute = Math.floor(Math.random() * 65) + 15;
    const isHomeInjured = Math.random() < 0.5;
    const states = isHomeInjured ? homeStates : awayStates;
    const targetClub = isHomeInjured ? homeClub : awayClub;

    const injuredPlayer = states.find((p) => p.isOnPitch);
    if (injuredPlayer) {
      injuredPlayer.injured = true;
      events.push({
        minute,
        type: 'injury',
        clubId: targetClub.id,
        playerName: injuredPlayer.player.name,
        detail: `Injury! ${injuredPlayer.player.name} cannot continue and requires treatment.`,
      });
    }
  }

  // AI Automatic Substitutions (around 60'-75')
  simulateAiSubstitutions(awayStates, awayClub.id, events);

  // Apply stamina/fitness drain across on-pitch players
  for (const s of [...homeStates, ...awayStates]) {
    if (s.isOnPitch) {
      s.minutesPlayed = 90;
      // Drain ~12% - 18% fitness
      s.currentFitness = Math.max(65, s.currentFitness - (Math.floor(Math.random() * 7) + 12));
    }
  }

  // Sort match events chronologically
  events.sort((a, b) => a.minute - b.minute);
  scorers.sort((a, b) => a.minute - b.minute);

  // Detailed match stats
  const totalPossession = 100;
  const possessionSkew = Math.round((effectiveHomeRating / (effectiveHomeRating + effectiveAwayRating)) * 100);
  const homePossession = Math.max(38, Math.min(68, possessionSkew));
  const awayPossession = totalPossession - homePossession;

  const homeShots = homeScore + Math.floor(Math.random() * 7) + 6;
  const awayShots = awayScore + Math.floor(Math.random() * 6) + 4;
  const homeShotsOnTarget = homeScore + Math.floor(homeShots * 0.35);
  const awayShotsOnTarget = awayScore + Math.floor(awayShots * 0.35);

  const stats: MatchStats = {
    homePossession,
    awayPossession,
    homeShots,
    awayShots,
    homeShotsOnTarget,
    awayShotsOnTarget,
    homeFouls,
    awayFouls,
    homeCorners: Math.floor(homeShots * 0.4),
    awayCorners: Math.floor(awayShots * 0.35),
  };

  // Determine Man of the Match
  const allParticipating = [...homeStates, ...awayStates].filter((p) => p.isOnPitch || p.goals > 0);
  allParticipating.sort((a, b) => b.matchRating - a.matchRating);
  const motm = allParticipating[0] || homeStates[0];

  const updatedFixture: LeagueFixture = {
    ...fixture,
    played: true,
    homeScore,
    awayScore,
    scorers,
    events,
    stats,
    manOfTheMatch: {
      name: motm.player.name,
      clubId: motm.player.club,
      rating: Math.min(10.0, Math.round(motm.matchRating * 10) / 10),
    },
  };

  return {
    fixture: updatedFixture,
    homeScore,
    awayScore,
    events,
    stats,
    manOfTheMatch: {
      name: motm.player.name,
      clubId: motm.player.club,
      rating: Math.min(10.0, Math.round(motm.matchRating * 10) / 10),
    },
    homePlayerStates: homeStates,
    awayPlayerStates: awayStates,
  };
}

function createPlayerState(player: CareerPlayer, isStarter: boolean): InGamePlayerState {
  return {
    player,
    isStarter,
    isOnPitch: isStarter,
    minutesPlayed: 0,
    currentFitness: player.fitness || 100,
    goals: 0,
    assists: 0,
    yellowCard: false,
    redCard: false,
    injured: false,
    matchRating: Math.round((6.5 + (player.rating - 75) * 0.05 + (Math.random() * 0.8 - 0.4)) * 10) / 10,
  };
}

function pickAttackingPlayer(states: InGamePlayerState[]): InGamePlayerState | undefined {
  const fwds = states.filter((s) => categorizePosition(s.player.position) === 'FWD');
  if (fwds.length > 0 && Math.random() < 0.65) {
    return fwds[Math.floor(Math.random() * fwds.length)];
  }

  const mids = states.filter((s) => categorizePosition(s.player.position) === 'MID');
  if (mids.length > 0) {
    return mids[Math.floor(Math.random() * mids.length)];
  }

  return states[Math.floor(Math.random() * states.length)];
}

function simulateAiSubstitutions(states: InGamePlayerState[], clubId: string, events: MatchEvent[]) {
  const onPitch = states.filter((s) => s.isOnPitch);
  const bench = states.filter((s) => !s.isOnPitch);

  const subCount = Math.min(3, bench.length);

  for (let i = 0; i < subCount; i++) {
    const minute = 60 + i * 8;
    const playerOut = onPitch[i];
    const playerIn = bench[i];

    if (playerOut && playerIn) {
      playerOut.isOnPitch = false;
      playerIn.isOnPitch = true;
      playerIn.minutesPlayed = 90 - minute;

      events.push({
        minute,
        type: 'substitution',
        clubId,
        playerName: playerOut.player.name,
        subPlayerIn: playerIn.player.name,
        detail: `Substitution: ${playerIn.player.name} on for ${playerOut.player.name}`,
      });
    }
  }
}

function samplePoissonGoals(expected: number): number {
  const L = Math.exp(-expected);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L && k < 12);
  return k - 1;
}

/**
 * Updates full squad fitness, form, and morale after a match is concluded.
 */
export function applyPostMatchSquadImpact(
  squad: CareerPlayer[],
  participatingStates: InGamePlayerState[],
  wonMatch: boolean,
  settings: CareerSettings
): CareerPlayer[] {
  const stateMap = new Map<string, InGamePlayerState>(
    participatingStates.map((s) => [s.player.id, s])
  );

  return squad.map((player) => {
    const playedState = stateMap.get(player.id);

    if (playedState && playedState.minutesPlayed > 0) {
      // Played in match
      const fitnessDrain = Math.round(10 + (playedState.minutesPlayed / 90) * 6);
      const newFitness = Math.max(50, player.fitness - fitnessDrain);

      // Form update
      let formDelta = wonMatch ? 0.3 : -0.2;
      if (playedState.goals > 0) formDelta += playedState.goals * 0.4;
      const newForm = Math.max(4.0, Math.min(10.0, Math.round((player.form + formDelta) * 10) / 10));

      // Morale update
      const moraleDelta = wonMatch ? 5 : -3;
      const newMorale = Math.max(30, Math.min(100, player.morale + moraleDelta));

      // Injury state
      const isInjured = playedState.injured;
      const injuryWeeks = isInjured ? Math.floor(Math.random() * 3) + 1 : player.injuryWeeks;

      return {
        ...player,
        fitness: newFitness,
        form: newForm,
        morale: newMorale,
        injured: isInjured || player.injured,
        injuryWeeks,
      };
    } else {
      // Rested player (benched / reserve) -> recovers stamina!
      const recovery = 12;
      const newFitness = Math.min(100, player.fitness + recovery);

      // Existing injury recovery countdown
      let injuryWeeks = player.injuryWeeks;
      let injured = player.injured;

      if (injured && typeof injuryWeeks === 'number') {
        injuryWeeks = Math.max(0, injuryWeeks - 1);
        if (injuryWeeks === 0) {
          injured = false;
        }
      }

      return {
        ...player,
        fitness: newFitness,
        injured,
        injuryWeeks,
      };
    }
  });
}
