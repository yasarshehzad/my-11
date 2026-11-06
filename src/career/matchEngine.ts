import {
  CareerPlayer,
  Club,
  LeagueFixture,
  CupFixture,
  MatchEvent,
  MatchStats,
  TacticalMentality,
  PressingIntensity,
  AttackingStyle,
  HalfTimeTeamTalkType,
  CareerSettings,
  GoalScorer,
  PenaltyKickAttempt,
  TeamTrainingFocus,
  ClubTactics,
} from './types';
import {
  getTacticalPhilosophy,
  getPhilosophyDepartmentBonus,
  calculateTacticalMatchupMultiplier,
  calculateCaptaincyEffects,
} from './tactics';
import {
  categorizePosition,
  calculatePositionFit,
  SUPPORTED_CAREER_FORMATIONS,
} from './squad';
import { getEffectiveClubName } from './clubs';
import {
  updatePlayerForm,
  applyInSeasonMatchProgression,
  calculateEaFcFaceStats,
  calculateFormRatingBonus,
  getEffectiveRating,
} from './formAndProgression';
import { getAiClubMatchdaySquad } from './squadGenerator';

export interface InGamePlayerState {
  player: CareerPlayer;
  isStarter: boolean;
  isOnPitch: boolean;
  slotPosition?: string;
  minutesPlayed: number;
  currentFitness: number; // 0-100%
  goals: number;
  assists: number;
  saves?: number;
  yellowCard: boolean;
  redCard: boolean;
  injured: boolean;
  matchRating: number; // 4.5 - 10.0
  subbedInMinute?: number;
  subbedOutMinute?: number;
}

export interface DepartmentRatings {
  attack: number;
  midfield: number;
  defense: number;
  overall: number;
}

export type PitchZone = 'HOME_BOX' | 'HOME_THIRD' | 'MID' | 'AWAY_THIRD' | 'AWAY_BOX';

export interface MatchSimulationConfig {
  homeClub: Club;
  awayClub: Club;
  homeStarters: CareerPlayer[];
  homeBench: CareerPlayer[];
  awayStarters: CareerPlayer[];
  awayBench: CareerPlayer[];
  homeMentality?: TacticalMentality;
  awayMentality?: TacticalMentality;
  homePressing?: PressingIntensity;
  awayPressing?: PressingIntensity;
  homeStyle?: AttackingStyle;
  awayStyle?: AttackingStyle;
  homeFormation?: string;
  awayFormation?: string;
  homeTrainingFocus?: TeamTrainingFocus;
  awayTrainingFocus?: TeamTrainingFocus;
  isNeutralVenue?: boolean;
  userClubId?: string;
  settings: CareerSettings;
  homeTactics?: ClubTactics;
  awayTactics?: ClubTactics;
  userInjuryRiskModifier?: number;
}

export interface MatchSimulationResult {
  fixture: LeagueFixture;
  homeScore: number;
  awayScore: number;
  scorers: GoalScorer[];
  events: MatchEvent[];
  stats: MatchStats;
  manOfTheMatch: { name: string; clubId: string; rating: number };
  homePlayerStates: InGamePlayerState[];
  awayPlayerStates: InGamePlayerState[];
  homeDeptRatings?: DepartmentRatings;
  awayDeptRatings?: DepartmentRatings;
  penalties?: {
    homePenalties: number;
    awayPenalties: number;
    kicks: PenaltyKickAttempt[];
  };
}

export interface TeamTalkBuff {
  attackMod: number;
  midfieldMod: number;
  defenseMod: number;
  composureMod: number;
  label: string;
}

export interface LiveMatchSession {
  fixture: LeagueFixture | CupFixture;
  config: MatchSimulationConfig;
  minute: number;
  maxMinutes: 90 | 120;
  isExtraTime: boolean;
  homeScore: number;
  awayScore: number;
  homeXg: number;
  awayXg: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeFouls: number;
  awayFouls: number;
  homeCorners: number;
  awayCorners: number;
  homeSaves: number;
  awaySaves: number;
  homeBigChances: number;
  awayBigChances: number;
  homePossessionSamples: number[];
  homePlayerStates: InGamePlayerState[];
  awayPlayerStates: InGamePlayerState[];
  homeMentality: TacticalMentality;
  awayMentality: TacticalMentality;
  homePressing: PressingIntensity;
  awayPressing: PressingIntensity;
  homeStyle: AttackingStyle;
  awayStyle: AttackingStyle;
  homeTeamTalkBuff?: TeamTalkBuff;
  awayTeamTalkBuff?: TeamTalkBuff;
  subsRemainingHome: number;
  subsRemainingAway: number;
  aiSubsMadeHome: number;
  aiSubsMadeAway: number;
  scorers: GoalScorer[];
  events: MatchEvent[];
  momentum: number; // -100 (Home dominant) to +100 (Away dominant)
  ballZone: PitchZone;
  homeDeptRatings: DepartmentRatings;
  awayDeptRatings: DepartmentRatings;
  criticalPauseReason?: string;
  hasInjuryOccurred: boolean;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function resolveFormationSlots(formationName: string = '4-3-3'): string[] {
  const found = SUPPORTED_CAREER_FORMATIONS.find((f) => f.name === formationName);
  return found ? found.slots : SUPPORTED_CAREER_FORMATIONS[0].slots;
}

function isPlaceholderSquad(players: CareerPlayer[]): boolean {
  if (!players || players.length === 0) return true;
  return players.some((p) => /\bPlayer\s+\d+$/i.test(p.name));
}

/**
 * Computes live 3-department ratings (Attack, Midfield, Defense + GK) for an on-pitch lineup
 * using EA FC 6-face stats, form bonuses, positional fit, live stamina, morale, red-card penalties,
 * and tactical instructions.
 */
export function calculateTeamDepartmentRatings(
  states: Array<InGamePlayerState | CareerPlayer>,
  options: {
    formation?: string;
    mentality: TacticalMentality;
    pressing: PressingIntensity;
    style: AttackingStyle;
    isHome?: boolean;
    isNeutralVenue?: boolean;
    teamTalkBuff?: TeamTalkBuff;
    trainingFocus?: TeamTrainingFocus;
    tactics?: ClubTactics;
    opponentTactics?: ClubTactics;
  }
): DepartmentRatings {
  const normalizedStates: InGamePlayerState[] = states.map((s) => {
    if ('player' in s && s.player) {
      return s as InGamePlayerState;
    }
    const p = s as unknown as CareerPlayer;
    return {
      player: p,
      isStarter: true,
      isOnPitch: true,
      slotPosition: p.position,
      currentFitness: p.fitness ?? 100,
      goals: 0,
      assists: 0,
      yellowCard: false,
      redCard: false,
      injured: false,
      minutesPlayed: 90,
      matchRating: 6.5,
    };
  });

  const active = normalizedStates.filter((s) => s.isOnPitch && !s.redCard);
  if (active.length === 0) {
    return { attack: 60, midfield: 60, defense: 60, overall: 60 };
  }

  let attSum = 0;
  let attWeight = 0;
  let midSum = 0;
  let midWeight = 0;
  let defSum = 0;
  let defWeight = 0;

  for (const s of active) {
    const p = s.player;
    const formBonus = calculateFormRatingBonus(p);
    const face = p.faceStats || calculateEaFcFaceStats(p, formBonus);
    const effOvr = getEffectiveRating(p);

    // Fitness / fatigue multiplier: players below 70% fitness lose sharpness
    const fitNorm = clamp(s.currentFitness ?? p.fitness ?? 100, 35, 100);
    const fitnessFactor = fitNorm >= 75
      ? 0.96 + (fitNorm - 75) * 0.0016
      : 0.76 + (fitNorm / 75) * 0.20;

    // Morale multiplier (0.95 to 1.04)
    const moraleNorm = clamp(p.morale ?? 80, 30, 100);
    const moraleFactor = 0.94 + (moraleNorm / 100) * 0.09;

    // Positional fit multiplier
    let posFitFactor = 1.0;
    if (s.slotPosition) {
      const fit = calculatePositionFit(p, s.slotPosition);
      if (fit === 'competent') posFitFactor = 0.98;
      else if (fit === 'out_of_position') posFitFactor = 0.86;
    }

    const combinedMultiplier = fitnessFactor * moraleFactor * posFitFactor;
    const group = categorizePosition(s.slotPosition || p.position);

    if (group === 'GK') {
      // For GK: pac=DIV, sho=HAN, dri=REF, phy=POS
      const gkRating = (face.dri * 0.35 + face.pac * 0.30 + face.phy * 0.20 + face.sho * 0.15 + effOvr * 0.3) / 1.3;
      defSum += gkRating * combinedMultiplier * 1.35;
      defWeight += 1.35;
    } else if (group === 'DEF') {
      const defAbility = (face.def * 0.48 + face.phy * 0.24 + face.pac * 0.14 + effOvr * 0.14) * combinedMultiplier;
      const midContrib = (face.pas * 0.55 + face.dri * 0.25 + effOvr * 0.20) * combinedMultiplier;
      defSum += defAbility * 1.1;
      defWeight += 1.1;
      midSum += midContrib * 0.3;
      midWeight += 0.3;
    } else if (group === 'MID') {
      const midAbility = (face.pas * 0.38 + face.dri * 0.28 + face.phy * 0.14 + effOvr * 0.20) * combinedMultiplier;
      const attContrib = (face.sho * 0.40 + face.pas * 0.35 + face.dri * 0.25) * combinedMultiplier;
      const defContrib = (face.def * 0.50 + face.phy * 0.30 + face.pac * 0.20) * combinedMultiplier;
      midSum += midAbility * 1.15;
      midWeight += 1.15;
      attSum += attContrib * 0.45;
      attWeight += 0.45;
      defSum += defContrib * 0.40;
      defWeight += 0.40;
    } else {
      // FWD
      const attAbility = (face.sho * 0.45 + face.pac * 0.22 + face.dri * 0.20 + effOvr * 0.13) * combinedMultiplier;
      const midContrib = (face.pas * 0.50 + face.dri * 0.50) * combinedMultiplier;
      attSum += attAbility * 1.25;
      attWeight += 1.25;
      midSum += midContrib * 0.25;
      midWeight += 0.25;
    }
  }

  let attack = attWeight > 0 ? attSum / attWeight : 74;
  let midfield = midWeight > 0 ? midSum / midWeight : 74;
  let defense = defWeight > 0 ? defSum / defWeight : 74;

  // Numerical disadvantage if players were sent off (fewer than 11 active players)
  const missingPlayers = Math.max(0, 11 - active.length);
  if (missingPlayers > 0) {
    const redPenalty = Math.pow(0.93, missingPlayers);
    attack *= redPenalty;
    midfield *= redPenalty;
    defense *= redPenalty;
  }

  // Home advantage (+2.2 unless neutral venue)
  const homeBoost = options.isHome && !options.isNeutralVenue ? 2.2 : 0;
  attack += homeBoost;
  midfield += homeBoost;
  defense += homeBoost;

  // Tactical Mentality modifiers
  if (options.mentality === 'attacking') {
    attack *= 1.07;
    midfield *= 1.02;
    defense *= 0.93;
  } else if (options.mentality === 'defensive') {
    attack *= 0.91;
    midfield *= 0.98;
    defense *= 1.08;
  }

  // Pressing Intensity modifiers
  if (options.pressing === 'high_press') {
    attack *= 1.03;
    midfield *= 1.04;
    defense *= 0.97;
  } else if (options.pressing === 'low_block') {
    attack *= 0.96;
    midfield *= 0.97;
    defense *= 1.05;
  }

  // Attacking Style modifiers
  if (options.style === 'patient') {
    midfield *= 1.04;
    attack *= 0.99;
  } else if (options.style === 'direct_counter') {
    attack *= 1.04;
    midfield *= 0.97;
  }

  // Half-Time Team Talk buffs
  if (options.teamTalkBuff) {
    attack *= options.teamTalkBuff.attackMod;
    midfield *= options.teamTalkBuff.midfieldMod;
    defense *= options.teamTalkBuff.defenseMod;
  }

  // Team Training Focus modifiers
  if (options.trainingFocus === 'match_prep') {
    attack += 1.2;
    midfield += 1.2;
    defense += 1.2;
  } else if (options.trainingFocus === 'attacking') {
    attack += 2.2;
    defense -= 0.6;
  } else if (options.trainingFocus === 'defensive') {
    defense += 2.2;
    attack -= 0.6;
  }

  // Tactical Philosophy synergy & matchup multipliers
  if (options.tactics) {
    const activeStarters = active.map((s) => s.player);
    const synergy = getPhilosophyDepartmentBonus(options.tactics, activeStarters);
    if (synergy.synergyActive) {
      attack += synergy.attackBonus;
      midfield += synergy.midfieldBonus;
      defense += synergy.defenceBonus;
    }

    if (options.opponentTactics) {
      const matchup = calculateTacticalMatchupMultiplier(
        options.tactics.philosophy,
        options.opponentTactics.philosophy
      );
      attack *= matchup.userAttackMod;
      defense *= matchup.userDefenceMod;
    }
  }

  const finalAttack = Math.round(clamp(attack, 45, 99) * 10) / 10;
  const finalMidfield = Math.round(clamp(midfield, 45, 99) * 10) / 10;
  const finalDefense = Math.round(clamp(defense, 45, 99) * 10) / 10;
  const overall = Math.round(((finalAttack + finalMidfield + finalDefense) / 3) * 10) / 10;

  return {
    attack: finalAttack,
    midfield: finalMidfield,
    defense: finalDefense,
    overall,
  };
}

function createPlayerState(player: CareerPlayer, isStarter: boolean, slotPosition?: string): InGamePlayerState {
  const formBonus = calculateFormRatingBonus(player);
  const baseRat = 6.5 + (player.rating + formBonus - 76) * 0.025;
  return {
    player,
    isStarter,
    isOnPitch: isStarter,
    slotPosition,
    minutesPlayed: 0,
    currentFitness: player.fitness ?? 100,
    goals: 0,
    assists: 0,
    saves: 0,
    yellowCard: false,
    redCard: false,
    injured: false,
    matchRating: Number(clamp(baseRat, 6.1, 7.2).toFixed(1)),
  };
}

/**
 * Initializes a stateful minute-by-minute live match session.
 * Automatically replaces any legacy procedural placeholder lineups with real club squads.
 */
export function createLiveMatchSession(
  fixture: LeagueFixture,
  config: MatchSimulationConfig
): LiveMatchSession {
  const homeSlots = resolveFormationSlots(config.homeFormation || '4-3-3');
  const awaySlots = resolveFormationSlots(config.awayFormation || '4-3-3');

  let homeStarters = config.homeStarters;
  let homeBench = config.homeBench;
  if (isPlaceholderSquad(homeStarters)) {
    const aiHome = getAiClubMatchdaySquad(config.homeClub, config.settings?.databaseSeason);
    homeStarters = aiHome.starters;
    homeBench = aiHome.bench;
  }

  let awayStarters = config.awayStarters;
  let awayBench = config.awayBench;
  if (isPlaceholderSquad(awayStarters)) {
    const aiAway = getAiClubMatchdaySquad(config.awayClub, config.settings?.databaseSeason);
    awayStarters = aiAway.starters;
    awayBench = aiAway.bench;
  } else if (!awayBench || awayBench.length === 0) {
    const aiAway = getAiClubMatchdaySquad(config.awayClub, config.settings?.databaseSeason);
    const starterIds = new Set(awayStarters.map((p) => p.id));
    awayBench = aiAway.squad.filter((p) => !starterIds.has(p.id)).slice(0, 7);
  }

  const homeStates: InGamePlayerState[] = [
    ...homeStarters.map((p, idx) => createPlayerState(p, true, homeSlots[idx] || p.position)),
    ...homeBench.map((p) => createPlayerState(p, false, p.position)),
  ];

  const awayStates: InGamePlayerState[] = [
    ...awayStarters.map((p, idx) => createPlayerState(p, true, awaySlots[idx] || p.position)),
    ...awayBench.map((p) => createPlayerState(p, false, p.position)),
  ];

  const homeMentality = config.homeMentality || 'balanced';
  const awayMentality = config.awayMentality || 'balanced';
  const homePressing = config.homePressing || 'balanced';
  const awayPressing = config.awayPressing || 'balanced';
  const homeStyle = config.homeStyle || 'mixed';
  const awayStyle = config.awayStyle || 'mixed';
  const isNeutral = Boolean(
    config.isNeutralVenue ||
    (fixture.venue && fixture.venue.toLowerCase().includes('neutral'))
  );

  const homeDeptRatings = calculateTeamDepartmentRatings(homeStates, {
    mentality: homeMentality,
    pressing: homePressing,
    style: homeStyle,
    isHome: true,
    isNeutralVenue: isNeutral,
    trainingFocus: config.homeTrainingFocus,
    tactics: config.homeTactics,
    opponentTactics: config.awayTactics,
  });

  const awayDeptRatings = calculateTeamDepartmentRatings(awayStates, {
    mentality: awayMentality,
    pressing: awayPressing,
    style: awayStyle,
    isHome: false,
    isNeutralVenue: isNeutral,
    trainingFocus: config.awayTrainingFocus,
    tactics: config.awayTactics,
    opponentTactics: config.homeTactics,
  });

  return {
    fixture,
    config: {
      ...config,
      homeStarters,
      homeBench,
      awayStarters,
      awayBench,
      isNeutralVenue: isNeutral,
    },
    minute: 0,
    maxMinutes: 90,
    isExtraTime: false,
    homeScore: 0,
    awayScore: 0,
    homeXg: 0,
    awayXg: 0,
    homeShots: 0,
    awayShots: 0,
    homeShotsOnTarget: 0,
    awayShotsOnTarget: 0,
    homeFouls: 0,
    awayFouls: 0,
    homeCorners: 0,
    awayCorners: 0,
    homeSaves: 0,
    awaySaves: 0,
    homeBigChances: 0,
    awayBigChances: 0,
    homePossessionSamples: [],
    homePlayerStates: homeStates,
    awayPlayerStates: awayStates,
    homeMentality,
    awayMentality,
    homePressing,
    awayPressing,
    homeStyle,
    awayStyle,
    subsRemainingHome: 5,
    subsRemainingAway: 5,
    aiSubsMadeHome: 0,
    aiSubsMadeAway: 0,
    scorers: [],
    events: [],
    momentum: 0,
    ballZone: 'MID',
    homeDeptRatings,
    awayDeptRatings,
    hasInjuryOccurred: false,
  };
}

/**
 * Advances a LiveMatchSession by 1 minute, applying live tactical overrides,
 * real-time stamina drain, department-vs-department chance creation, assists,
 * goalkeeper saves, cards, injuries, and adaptive AI opponent adjustments.
 */
export function stepLiveMatchMinute(
  session: LiveMatchSession,
  overrides?: {
    homeMentality?: TacticalMentality;
    awayMentality?: TacticalMentality;
    homePressing?: PressingIntensity;
    awayPressing?: PressingIntensity;
    homeStyle?: AttackingStyle;
    awayStyle?: AttackingStyle;
  }
): LiveMatchSession {
  if (session.minute >= session.maxMinutes) {
    return session;
  }

  const nextMinute = session.minute + 1;
  const homeMentality = overrides?.homeMentality ?? session.homeMentality;
  const awayMentality = overrides?.awayMentality ?? session.awayMentality;
  const homePressing = overrides?.homePressing ?? session.homePressing;
  const awayPressing = overrides?.awayPressing ?? session.awayPressing;
  const homeStyle = overrides?.homeStyle ?? session.homeStyle;
  const awayStyle = overrides?.awayStyle ?? session.awayStyle;

  const homeStates = session.homePlayerStates.map((s) => ({ ...s }));
  const awayStates = session.awayPlayerStates.map((s) => ({ ...s }));
  const events = [...session.events];
  const scorers = [...session.scorers];

  let homeScore = session.homeScore;
  let awayScore = session.awayScore;
  let homeXg = session.homeXg;
  let awayXg = session.awayXg;
  let homeShots = session.homeShots;
  let awayShots = session.awayShots;
  let homeShotsOnTarget = session.homeShotsOnTarget;
  let awayShotsOnTarget = session.awayShotsOnTarget;
  let homeFouls = session.homeFouls;
  let awayFouls = session.awayFouls;
  let homeCorners = session.homeCorners;
  let awayCorners = session.awayCorners;
  let homeSaves = session.homeSaves;
  let awaySaves = session.awaySaves;
  let homeBigChances = session.homeBigChances;
  let awayBigChances = session.awayBigChances;
  let subsRemainingHome = session.subsRemainingHome;
  let subsRemainingAway = session.subsRemainingAway;
  let aiSubsMadeHome = session.aiSubsMadeHome;
  let aiSubsMadeAway = session.aiSubsMadeAway;
  let hasInjuryOccurred = session.hasInjuryOccurred;
  let criticalPauseReason: string | undefined = undefined;

  const userClubId = session.config.userClubId;
  const isHomeAi = userClubId ? session.config.homeClub.id !== userClubId : false;
  const isAwayAi = userClubId ? session.config.awayClub.id !== userClubId : true;

  // 1. Drain stamina for on-pitch players each minute based on pressing intensity & recovery training focus
  const homeRecoveryMod = session.config.homeTrainingFocus === 'recovery' ? 0.82 : 1.0;
  const awayRecoveryMod = session.config.awayTrainingFocus === 'recovery' ? 0.82 : 1.0;
  const homePhilosophyDrain = session.config.homeTactics?.philosophy
    ? getTacticalPhilosophy(session.config.homeTactics.philosophy).staminaDrainMultiplier
    : 1.0;
  const awayPhilosophyDrain = session.config.awayTactics?.philosophy
    ? getTacticalPhilosophy(session.config.awayTactics.philosophy).staminaDrainMultiplier
    : 1.0;
  const homeDrainPerMin =
    (homePressing === 'high_press' ? 0.21 : homePressing === 'low_block' ? 0.13 : 0.165) * homeRecoveryMod * homePhilosophyDrain;
  const awayDrainPerMin =
    (awayPressing === 'high_press' ? 0.21 : awayPressing === 'low_block' ? 0.13 : 0.165) * awayRecoveryMod * awayPhilosophyDrain;

  for (const s of homeStates) {
    if (s.isOnPitch && !s.redCard) {
      s.minutesPlayed += 1;
      const jitter = (Math.random() * 0.05) - 0.02;
      s.currentFitness = Math.max(48, Math.round((s.currentFitness - (homeDrainPerMin + jitter)) * 10) / 10);
    }
  }
  for (const s of awayStates) {
    if (s.isOnPitch && !s.redCard) {
      s.minutesPlayed += 1;
      const jitter = (Math.random() * 0.05) - 0.02;
      s.currentFitness = Math.max(48, Math.round((s.currentFitness - (awayDrainPerMin + jitter)) * 10) / 10);
    }
  }

  // 2. Adaptive AI tactical adjustments & AI substitutions in the 2nd half
  let effectiveAwayMentality = awayMentality;
  let effectiveHomeMentality = homeMentality;

  if (isAwayAi && nextMinute >= 60) {
    if (awayScore < homeScore) effectiveAwayMentality = 'attacking';
    else if (awayScore > homeScore && nextMinute >= 75) effectiveAwayMentality = 'defensive';
  }
  if (isHomeAi && nextMinute >= 60) {
    if (homeScore < awayScore) effectiveHomeMentality = 'attacking';
    else if (homeScore > awayScore && nextMinute >= 75) effectiveHomeMentality = 'defensive';
  }

  // AI Substitutions at 62', 71', 80', and 98' (in extra time)
  const aiSubMinutes = [62, 71, 80, 98];
  if (aiSubMinutes.includes(nextMinute)) {
    if (isAwayAi && subsRemainingAway > 0 && aiSubsMadeAway < (session.isExtraTime ? 4 : 3)) {
      const subMade = performSmartAiSubstitution(awayStates, session.config.awayClub.id, nextMinute, events);
      if (subMade) {
        subsRemainingAway -= 1;
        aiSubsMadeAway += 1;
      }
    }
    if (isHomeAi && subsRemainingHome > 0 && aiSubsMadeHome < (session.isExtraTime ? 4 : 3)) {
      const subMade = performSmartAiSubstitution(homeStates, session.config.homeClub.id, nextMinute, events);
      if (subMade) {
        subsRemainingHome -= 1;
        aiSubsMadeHome += 1;
      }
    }
  }

  // 3. Calculate live department ratings
  const homeDept = calculateTeamDepartmentRatings(homeStates, {
    mentality: effectiveHomeMentality,
    pressing: homePressing,
    style: homeStyle,
    isHome: true,
    isNeutralVenue: session.config.isNeutralVenue,
    teamTalkBuff: session.homeTeamTalkBuff,
    trainingFocus: session.config.homeTrainingFocus,
    tactics: session.config.homeTactics,
    opponentTactics: session.config.awayTactics,
  });

  const awayDept = calculateTeamDepartmentRatings(awayStates, {
    mentality: effectiveAwayMentality,
    pressing: awayPressing,
    style: awayStyle,
    isHome: false,
    isNeutralVenue: session.config.isNeutralVenue,
    teamTalkBuff: session.awayTeamTalkBuff,
    trainingFocus: session.config.awayTrainingFocus,
    tactics: session.config.awayTactics,
    opponentTactics: session.config.homeTactics,
  });

  // 4. Minute possession & momentum calculation
  const midDiff = homeDept.midfield - awayDept.midfield;
  const stylePossessionMod =
    (homeStyle === 'patient' ? 3.5 : homeStyle === 'direct_counter' ? -3.0 : 0) -
    (awayStyle === 'patient' ? 3.5 : awayStyle === 'direct_counter' ? -3.0 : 0);
  const minuteHomePoss = clamp(
    Math.round(50 + midDiff * 1.45 + stylePossessionMod + (Math.random() * 10 - 5)),
    32,
    68
  );
  const homePossessionSamples = [...session.homePossessionSamples, minuteHomePoss];

  // Update momentum (-100 Home dominant to +100 Away dominant)
  const rawImpulse = (50 - minuteHomePoss) * 1.6 + (awayDept.attack - homeDept.attack) * 0.8;
  let momentum = clamp(Math.round(session.momentum * 0.65 + rawImpulse * 0.35), -100, 100);
  let ballZone: PitchZone =
    momentum <= -38
      ? 'AWAY_BOX'
      : momentum <= -14
      ? 'AWAY_THIRD'
      : momentum >= 38
      ? 'HOME_BOX'
      : momentum >= 14
      ? 'HOME_THIRD'
      : 'MID';

  // 5. Chance Creation & Shot Resolution
  const homeAttVsDef = homeDept.attack - awayDept.defense;
  const awayAttVsDef = awayDept.attack - homeDept.defense;

  const homeShotProb = clamp(0.135 + homeAttVsDef * 0.0045 + midDiff * 0.0022, 0.055, 0.25);
  const awayShotProb = clamp(0.112 + awayAttVsDef * 0.0045 - midDiff * 0.0022, 0.045, 0.23);

  // Home Attack Roll
  if (Math.random() < homeShotProb) {
    homeShots += 1;
    momentum = clamp(momentum - 22, -100, 100);
    ballZone = 'AWAY_BOX';

    const shooter = pickWeightedAttackingPlayer(homeStates) || homeStates[0];
    const awayGk = awayStates.find((s) => s.isOnPitch && categorizePosition(s.player.position) === 'GK') || awayStates[0];

    const isBigChance = Math.random() < clamp(0.19 + homeAttVsDef * 0.006, 0.10, 0.34);
    if (isBigChance) homeBigChances += 1;

    const shotXg = isBigChance
      ? 0.24 + Math.random() * 0.18
      : 0.04 + Math.random() * 0.10;
    homeXg = Number((homeXg + shotXg).toFixed(2));

    const shooterFace = shooter.player.faceStats || calculateEaFcFaceStats(shooter.player);
    const gkFace = awayGk.player.faceStats || calculateEaFcFaceStats(awayGk.player);
    const finishAdvantage = (shooterFace.sho - (gkFace.dri * 0.55 + gkFace.pac * 0.45)) * 0.003;
    const talkComposure = session.homeTeamTalkBuff ? (session.homeTeamTalkBuff.composureMod - 1) * 0.04 : 0;
    const homeCapComposure =
      nextMinute >= 85 && session.config.homeTactics?.captainId
        ? calculateCaptaincyEffects(
            homeStates.filter((s) => s.isOnPitch).map((s) => s.player),
            session.config.homeTactics.captainId,
            session.config.homeTactics.viceCaptainId
          ).composureBonus * 0.004
        : 0;
    const goalProb = clamp(shotXg * (0.94 + finishAdvantage + talkComposure + homeCapComposure), 0.025, 0.62);

    const roll = Math.random();
    if (roll < goalProb) {
      // GOAL!
      homeScore += 1;
      homeShotsOnTarget += 1;
      shooter.goals += 1;
      shooter.matchRating = clamp(Number((shooter.matchRating + 0.85).toFixed(1)), 5.0, 10.0);

      let assister: InGamePlayerState | undefined;
      if (Math.random() < 0.74) {
        assister = pickWeightedAssister(homeStates, shooter.player.id);
        if (assister) {
          assister.assists += 1;
          assister.matchRating = clamp(Number((assister.matchRating + 0.55).toFixed(1)), 5.0, 10.0);
        }
      }

      const clubName = getEffectiveClubName(session.config.homeClub);
      const detail = assister
        ? `GOAL! ${shooter.player.name} strikes for ${clubName}! (Assist: ${assister.player.name})`
        : `GOAL! ${shooter.player.name} finishes clinicaly for ${clubName}!`;

      events.push({
        minute: nextMinute,
        type: 'goal',
        clubId: session.config.homeClub.id,
        playerName: shooter.player.name,
        assisterName: assister?.player.name,
        detail,
      });

      scorers.push({
        name: shooter.player.name,
        minute: nextMinute,
        clubId: session.config.homeClub.id,
        cardId: shooter.player.cardId,
        assisterName: assister?.player.name,
        assisterCardId: assister?.player.cardId,
      });
    } else if (roll < goalProb + 0.30) {
      // Shot on target -> Save by Away GK
      homeShotsOnTarget += 1;
      awaySaves += 1;
      awayGk.saves = (awayGk.saves || 0) + 1;
      awayGk.matchRating = clamp(Number((awayGk.matchRating + 0.18).toFixed(1)), 5.0, 10.0);
      if (Math.random() < 0.45) homeCorners += 1;

      if (isBigChance) {
        events.push({
          minute: nextMinute,
          type: 'save',
          clubId: session.config.awayClub.id,
          playerName: awayGk.player.name,
          detail: `🧤 Big Save! ${awayGk.player.name} denies ${shooter.player.name} from point-blank range!`,
        });
      }
    } else if (isBigChance && roll < goalProb + 0.37) {
      // Hit the woodwork!
      events.push({
        minute: nextMinute,
        type: 'woodwork',
        clubId: session.config.homeClub.id,
        playerName: shooter.player.name,
        detail: `💥 Woodwork! ${shooter.player.name} rattles the frame of the goal for ${getEffectiveClubName(session.config.homeClub)}!`,
      });
    } else if (Math.random() < 0.32) {
      homeCorners += 1;
    }
  }

  // Away Attack Roll
  if (Math.random() < awayShotProb) {
    awayShots += 1;
    momentum = clamp(momentum + 22, -100, 100);
    ballZone = 'HOME_BOX';

    const shooter = pickWeightedAttackingPlayer(awayStates) || awayStates[0];
    const homeGk = homeStates.find((s) => s.isOnPitch && categorizePosition(s.player.position) === 'GK') || homeStates[0];

    const isBigChance = Math.random() < clamp(0.18 + awayAttVsDef * 0.006, 0.09, 0.33);
    if (isBigChance) awayBigChances += 1;

    const shotXg = isBigChance
      ? 0.23 + Math.random() * 0.18
      : 0.04 + Math.random() * 0.095;
    awayXg = Number((awayXg + shotXg).toFixed(2));

    const shooterFace = shooter.player.faceStats || calculateEaFcFaceStats(shooter.player);
    const gkFace = homeGk.player.faceStats || calculateEaFcFaceStats(homeGk.player);
    const finishAdvantage = (shooterFace.sho - (gkFace.dri * 0.55 + gkFace.pac * 0.45)) * 0.003;
    const talkComposure = session.awayTeamTalkBuff ? (session.awayTeamTalkBuff.composureMod - 1) * 0.04 : 0;
    const awayCapComposure =
      nextMinute >= 85 && session.config.awayTactics?.captainId
        ? calculateCaptaincyEffects(
            awayStates.filter((s) => s.isOnPitch).map((s) => s.player),
            session.config.awayTactics.captainId,
            session.config.awayTactics.viceCaptainId
          ).composureBonus * 0.004
        : 0;
    const goalProb = clamp(shotXg * (0.94 + finishAdvantage + talkComposure + awayCapComposure), 0.025, 0.62);

    const roll = Math.random();
    if (roll < goalProb) {
      // GOAL!
      awayScore += 1;
      awayShotsOnTarget += 1;
      shooter.goals += 1;
      shooter.matchRating = clamp(Number((shooter.matchRating + 0.85).toFixed(1)), 5.0, 10.0);

      let assister: InGamePlayerState | undefined;
      if (Math.random() < 0.74) {
        assister = pickWeightedAssister(awayStates, shooter.player.id);
        if (assister) {
          assister.assists += 1;
          assister.matchRating = clamp(Number((assister.matchRating + 0.55).toFixed(1)), 5.0, 10.0);
        }
      }

      const clubName = getEffectiveClubName(session.config.awayClub);
      const detail = assister
        ? `GOAL! ${shooter.player.name} finds the net for ${clubName}! (Assist: ${assister.player.name})`
        : `GOAL! ${shooter.player.name} scores for ${clubName}!`;

      events.push({
        minute: nextMinute,
        type: 'goal',
        clubId: session.config.awayClub.id,
        playerName: shooter.player.name,
        assisterName: assister?.player.name,
        detail,
      });

      scorers.push({
        name: shooter.player.name,
        minute: nextMinute,
        clubId: session.config.awayClub.id,
        cardId: shooter.player.cardId,
        assisterName: assister?.player.name,
        assisterCardId: assister?.player.cardId,
      });
    } else if (roll < goalProb + 0.30) {
      // Shot on target -> Save by Home GK
      awayShotsOnTarget += 1;
      homeSaves += 1;
      homeGk.saves = (homeGk.saves || 0) + 1;
      homeGk.matchRating = clamp(Number((homeGk.matchRating + 0.18).toFixed(1)), 5.0, 10.0);
      if (Math.random() < 0.45) awayCorners += 1;

      if (isBigChance) {
        events.push({
          minute: nextMinute,
          type: 'save',
          clubId: session.config.homeClub.id,
          playerName: homeGk.player.name,
          detail: `🧤 Crucial Save! ${homeGk.player.name} parries away a fierce strike from ${shooter.player.name}!`,
        });
      }
    } else if (isBigChance && roll < goalProb + 0.37) {
      events.push({
        minute: nextMinute,
        type: 'woodwork',
        clubId: session.config.awayClub.id,
        playerName: shooter.player.name,
        detail: `💥 Woodwork! ${shooter.player.name} strikes the post for ${getEffectiveClubName(session.config.awayClub)}!`,
      });
    } else if (Math.random() < 0.32) {
      awayCorners += 1;
    }
  }

  // 6. Fouls, Yellow Cards & Red Cards
  const homeFoulProb = homePressing === 'high_press' ? 0.13 : 0.10;
  const awayFoulProb = awayPressing === 'high_press' ? 0.13 : 0.10;

  if (Math.random() < homeFoulProb) {
    homeFouls += 1;
    if (Math.random() < 0.14) {
      const candidates = homeStates.filter((p) => p.isOnPitch && !p.redCard && categorizePosition(p.player.position) !== 'GK');
      const offender = candidates[Math.floor(Math.random() * candidates.length)];
      if (offender) {
        if (offender.yellowCard && Math.random() < 0.18) {
          offender.redCard = true;
          offender.isOnPitch = false;
          offender.subbedOutMinute = nextMinute;
          offender.matchRating = clamp(Number((offender.matchRating - 1.2).toFixed(1)), 4.5, 10.0);
          events.push({
            minute: nextMinute,
            type: 'red_card',
            clubId: session.config.homeClub.id,
            playerName: offender.player.name,
            detail: `🟥 RED CARD! Second bookable offence for ${offender.player.name} (${getEffectiveClubName(session.config.homeClub)})!`,
          });
          if (userClubId === session.config.homeClub.id) {
            criticalPauseReason = `🟥 ${offender.player.name} has been sent off! Consider adjusting your tactical shape.`;
          }
        } else if (!offender.yellowCard) {
          offender.yellowCard = true;
          offender.matchRating = clamp(Number((offender.matchRating - 0.25).toFixed(1)), 4.5, 10.0);
          events.push({
            minute: nextMinute,
            type: 'yellow_card',
            clubId: session.config.homeClub.id,
            playerName: offender.player.name,
            detail: `Yellow card shown to ${offender.player.name}`,
          });
        }
      }
    }
  }

  if (Math.random() < awayFoulProb) {
    awayFouls += 1;
    if (Math.random() < 0.14) {
      const candidates = awayStates.filter((p) => p.isOnPitch && !p.redCard && categorizePosition(p.player.position) !== 'GK');
      const offender = candidates[Math.floor(Math.random() * candidates.length)];
      if (offender) {
        if (offender.yellowCard && Math.random() < 0.18) {
          offender.redCard = true;
          offender.isOnPitch = false;
          offender.subbedOutMinute = nextMinute;
          offender.matchRating = clamp(Number((offender.matchRating - 1.2).toFixed(1)), 4.5, 10.0);
          events.push({
            minute: nextMinute,
            type: 'red_card',
            clubId: session.config.awayClub.id,
            playerName: offender.player.name,
            detail: `🟥 RED CARD! Second yellow card for ${offender.player.name} (${getEffectiveClubName(session.config.awayClub)})!`,
          });
          if (userClubId === session.config.awayClub.id) {
            criticalPauseReason = `🟥 ${offender.player.name} has been sent off! Consider adjusting your tactical shape.`;
          }
        } else if (!offender.yellowCard) {
          offender.yellowCard = true;
          offender.matchRating = clamp(Number((offender.matchRating - 0.25).toFixed(1)), 4.5, 10.0);
          events.push({
            minute: nextMinute,
            type: 'yellow_card',
            clubId: session.config.awayClub.id,
            playerName: offender.player.name,
            detail: `Yellow card shown to ${offender.player.name}`,
          });
        }
      }
    }
  }

  // 7. In-Match Injury Check (at most 1 per match, scaled by injurySeverity & player fatigue)
  if (!hasInjuryOccurred && nextMinute >= 14 && nextMinute <= 84) {
    const matchInjuryProb =
      session.config.settings.injurySeverity === 'high'
        ? 0.08
        : session.config.settings.injurySeverity === 'medium'
        ? 0.04
        : 0.015;
    const perMinuteInjuryProb = matchInjuryProb / 70;

    const isHomeInjured = Math.random() < 0.5;
    const targetStates = isHomeInjured ? homeStates : awayStates;
    const targetClub = isHomeInjured ? session.config.homeClub : session.config.awayClub;

    // Apply medical center injury risk reduction for user club
    let effectiveInjuryProb = perMinuteInjuryProb;
    if (
      session.config.userClubId === targetClub.id &&
      typeof session.config.userInjuryRiskModifier === 'number'
    ) {
      effectiveInjuryProb *= Math.max(0.2, session.config.userInjuryRiskModifier);
    }

    if (Math.random() < effectiveInjuryProb) {
      const outfieldOnPitch = targetStates.filter(
        (p) => p.isOnPitch && !p.redCard && categorizePosition(p.player.position) !== 'GK'
      );

      if (outfieldOnPitch.length > 0) {
        // Tired players have higher chance of picking up a knock
        const sortedByFatigue = [...outfieldOnPitch].sort((a, b) => a.currentFitness - b.currentFitness);
        const injuredPlayer = sortedByFatigue[0];
        injuredPlayer.injured = true;
        hasInjuryOccurred = true;

        events.push({
          minute: nextMinute,
          type: 'injury',
          clubId: targetClub.id,
          playerName: injuredPlayer.player.name,
          detail: `🩹 Injury! ${injuredPlayer.player.name} picks up a knock and signals to the bench.`,
        });

        if (userClubId === targetClub.id) {
          criticalPauseReason = `🩹 ${injuredPlayer.player.name} has suffered an injury! Select a substitute from the dugout.`;
        } else {
          // AI automatically substitutes the injured player if subs remain
          const subMade = performSmartAiSubstitution(
            targetStates,
            targetClub.id,
            nextMinute,
            events,
            injuredPlayer.player.id
          );
          if (subMade) {
            if (isHomeInjured) subsRemainingHome = Math.max(0, subsRemainingHome - 1);
            else subsRemainingAway = Math.max(0, subsRemainingAway - 1);
          }
        }
      }
    }
  }

  return {
    ...session,
    minute: nextMinute,
    homeScore,
    awayScore,
    homeXg,
    awayXg,
    homeShots,
    awayShots,
    homeShotsOnTarget,
    awayShotsOnTarget,
    homeFouls,
    awayFouls,
    homeCorners,
    awayCorners,
    homeSaves,
    awaySaves,
    homeBigChances,
    awayBigChances,
    homePossessionSamples,
    homePlayerStates: homeStates,
    awayPlayerStates: awayStates,
    homeMentality: effectiveHomeMentality,
    awayMentality: effectiveAwayMentality,
    homePressing,
    awayPressing,
    homeStyle,
    awayStyle,
    subsRemainingHome,
    subsRemainingAway,
    aiSubsMadeHome,
    aiSubsMadeAway,
    scorers,
    events,
    momentum,
    ballZone,
    homeDeptRatings: homeDept,
    awayDeptRatings: awayDept,
    criticalPauseReason,
    hasInjuryOccurred,
  };
}

/**
 * Applies a Half-Time Team Talk to a club's dressing room, producing a real second-half
 * tactical/composure modifier and a morale reaction based on the current scoreline.
 */
export function applyHalfTimeTeamTalk(
  session: LiveMatchSession,
  clubId: string,
  talkType: HalfTimeTeamTalkType
): {
  session: LiveMatchSession;
  feedback: string;
  effectSummary: string;
} {
  const isHome = session.config.homeClub.id === clubId;
  const myGoals = isHome ? session.homeScore : session.awayScore;
  const oppGoals = isHome ? session.awayScore : session.homeScore;
  const goalDiff = myGoals - oppGoals;

  let buff: TeamTalkBuff;
  let feedback: string;
  let effectSummary: string;

  if (talkType === 'demand_more') {
    if (goalDiff <= 0) {
      buff = {
        attackMod: 1.05,
        midfieldMod: 1.04,
        defenseMod: 1.01,
        composureMod: 1.04,
        label: 'Fired Up (+5% Attack, +4% Midfield)',
      };
      feedback = '📣 Your squad responded fiercely to the challenge! Second-half attacking intensity and work-rate increased.';
      effectSummary = '+5% Attack • +4% Midfield Work-Rate';
    } else {
      buff = {
        attackMod: 1.02,
        midfieldMod: 1.02,
        defenseMod: 1.0,
        composureMod: 1.01,
        label: 'Focused (+2% Attack & Midfield)',
      };
      feedback = '📣 Despite leading at the break, the players nodded and vowed not to let their standards drop.';
      effectSummary = '+2% Attack • +2% Midfield';
    }
  } else if (talkType === 'keep_composed') {
    buff = {
      attackMod: 1.02,
      midfieldMod: 1.05,
      defenseMod: 1.02,
      composureMod: 1.06,
      label: 'Composed (+5% Midfield Control & Finishing)',
    };
    feedback = '👏 You praised their tactical discipline! Players look calm on the ball with sharper passing and finishing composure.';
    effectSummary = '+5% Midfield Control • +6% Finishing Composure';
  } else if (talkType === 'tighten_up') {
    buff = {
      attackMod: 0.98,
      midfieldMod: 1.02,
      defenseMod: 1.06,
      composureMod: 1.02,
      label: 'Organized Backline (+6% Defense)',
    };
    feedback = '🛡️ You drilled the defensive shape on the tactics board! The back four and midfield pivot are locked in.';
    effectSummary = '+6% Defensive Solidity • +2% Midfield Shield';
  } else {
    // aggressive
    if (goalDiff < 0) {
      buff = {
        attackMod: 1.07,
        midfieldMod: 1.04,
        defenseMod: 0.99,
        composureMod: 1.03,
        label: 'All-Out Response (+7% Attack)',
      };
      feedback = '🔥 The hairdryer treatment stung the dressing room into action! Expect a ferocious second-half surge.';
      effectSummary = '+7% Attack Surge • +4% Pressing';
    } else {
      buff = {
        attackMod: 1.01,
        midfieldMod: 0.99,
        defenseMod: 0.99,
        composureMod: 0.98,
        label: 'Tense (+1% Attack, -2% Composure)',
      };
      feedback = '⚠️ Several players looked stunned by the harsh criticism while not trailing.';
      effectSummary = '+1% Attack • Slight Composure Dip';
    }
  }

  const updatedSession: LiveMatchSession = {
    ...session,
    homeTeamTalkBuff: isHome ? buff : session.homeTeamTalkBuff,
    awayTeamTalkBuff: !isHome ? buff : session.awayTeamTalkBuff,
  };

  // Recompute live department ratings with the new buff
  updatedSession.homeDeptRatings = calculateTeamDepartmentRatings(updatedSession.homePlayerStates, {
    mentality: updatedSession.homeMentality,
    pressing: updatedSession.homePressing,
    style: updatedSession.homeStyle,
    isHome: true,
    isNeutralVenue: updatedSession.config.isNeutralVenue,
    teamTalkBuff: updatedSession.homeTeamTalkBuff,
  });
  updatedSession.awayDeptRatings = calculateTeamDepartmentRatings(updatedSession.awayPlayerStates, {
    mentality: updatedSession.awayMentality,
    pressing: updatedSession.awayPressing,
    style: updatedSession.awayStyle,
    isHome: false,
    isNeutralVenue: updatedSession.config.isNeutralVenue,
    teamTalkBuff: updatedSession.awayTeamTalkBuff,
  });

  return {
    session: updatedSession,
    feedback,
    effectSummary,
  };
}

/**
 * Executes an interactive live substitution for a club, updating on-pitch players,
 * logging a substitution event in the match timeline, and recalculating live department strengths.
 */
export function makeLiveSubstitution(
  session: LiveMatchSession,
  clubId: string,
  playerOutId: string,
  playerInId: string
): LiveMatchSession {
  const isHome = session.config.homeClub.id === clubId;
  const subsRemaining = isHome ? session.subsRemainingHome : session.subsRemainingAway;
  if (subsRemaining <= 0) return session;

  const states = (isHome ? session.homePlayerStates : session.awayPlayerStates).map((s) => ({ ...s }));
  const outIdx = states.findIndex((s) => s.player.id === playerOutId && s.isOnPitch);
  const inIdx = states.findIndex((s) => s.player.id === playerInId && !s.isOnPitch && !s.redCard && !s.subbedOutMinute);

  if (outIdx === -1 || inIdx === -1) return session;

  const playerOut = states[outIdx];
  const playerIn = states[inIdx];

  const inheritedSlot = playerOut.slotPosition || playerOut.player.position;
  playerOut.isOnPitch = false;
  playerOut.subbedOutMinute = Math.max(1, session.minute);

  playerIn.isOnPitch = true;
  playerIn.slotPosition = inheritedSlot;
  playerIn.subbedInMinute = Math.max(1, session.minute);

  const subEvent: MatchEvent = {
    minute: Math.max(1, session.minute),
    type: 'substitution',
    clubId,
    playerName: playerOut.player.name,
    subPlayerIn: playerIn.player.name,
    detail: `Substitution: ${playerIn.player.name} replaces ${playerOut.player.name}`,
  };

  const nextEvents = [...session.events, subEvent];
  const nextHomeStates = isHome ? states : session.homePlayerStates;
  const nextAwayStates = !isHome ? states : session.awayPlayerStates;

  const homeDeptRatings = calculateTeamDepartmentRatings(nextHomeStates, {
    mentality: session.homeMentality,
    pressing: session.homePressing,
    style: session.homeStyle,
    isHome: true,
    isNeutralVenue: session.config.isNeutralVenue,
    teamTalkBuff: session.homeTeamTalkBuff,
  });

  const awayDeptRatings = calculateTeamDepartmentRatings(nextAwayStates, {
    mentality: session.awayMentality,
    pressing: session.awayPressing,
    style: session.awayStyle,
    isHome: false,
    isNeutralVenue: session.config.isNeutralVenue,
    teamTalkBuff: session.awayTeamTalkBuff,
  });

  return {
    ...session,
    homePlayerStates: nextHomeStates,
    awayPlayerStates: nextAwayStates,
    subsRemainingHome: isHome ? subsRemaining - 1 : session.subsRemainingHome,
    subsRemainingAway: !isHome ? subsRemaining - 1 : session.subsRemainingAway,
    events: nextEvents,
    homeDeptRatings,
    awayDeptRatings,
    criticalPauseReason: undefined,
  };
}

/**
 * Transitions a level knockout tie at 90' into Extra Time (91' - 120')
 * and grants +1 bonus substitution slot to both clubs per official cup rules.
 */
export function startExtraTimeSession(session: LiveMatchSession): LiveMatchSession {
  return {
    ...session,
    maxMinutes: 120,
    isExtraTime: true,
    subsRemainingHome: session.subsRemainingHome + 1,
    subsRemainingAway: session.subsRemainingAway + 1,
  };
}

/**
 * Simulates an authentic kick-by-kick Penalty Shootout using the on-pitch players'
 * Shooting (SHO) attribute and Goalkeepers' Reflexes (REF) / Diving (DIV) attributes.
 */
export function simulatePenaltyShootoutDetailed(
  homeClub: Club,
  awayClub: Club,
  homeStates: InGamePlayerState[],
  awayStates: InGamePlayerState[],
  homeTactics?: ClubTactics,
  awayTactics?: ClubTactics
): {
  homePenalties: number;
  awayPenalties: number;
  kicks: PenaltyKickAttempt[];
} {
  const homeOnPitch = homeStates.filter((s) => s.isOnPitch && !s.redCard);
  const awayOnPitch = awayStates.filter((s) => s.isOnPitch && !s.redCard);

  const homeCapEffects = homeTactics?.captainId
    ? calculateCaptaincyEffects(
        homeStates.map((s) => s.player),
        homeTactics.captainId,
        homeTactics.viceCaptainId
      )
    : null;
  const awayCapEffects = awayTactics?.captainId
    ? calculateCaptaincyEffects(
        awayStates.map((s) => s.player),
        awayTactics.captainId,
        awayTactics.viceCaptainId
      )
    : null;

  const homeGk =
    homeOnPitch.find((s) => categorizePosition(s.player.position) === 'GK')?.player ||
    homeStates[0]?.player;
  const awayGk =
    awayOnPitch.find((s) => categorizePosition(s.player.position) === 'GK')?.player ||
    awayStates[0]?.player;

  const sortTakers = (list: InGamePlayerState[]) => {
    const outfield = list.filter((s) => categorizePosition(s.player.position) !== 'GK');
    const pool = outfield.length >= 5 ? outfield : list;
    return [...pool].sort((a, b) => {
      const fA = a.player.faceStats || calculateEaFcFaceStats(a.player);
      const fB = b.player.faceStats || calculateEaFcFaceStats(b.player);
      return fB.sho + b.player.rating * 0.5 - (fA.sho + a.player.rating * 0.5);
    });
  };

  const homeTakers = sortTakers(homeOnPitch.length > 0 ? homeOnPitch : homeStates);
  const awayTakers = sortTakers(awayOnPitch.length > 0 ? awayOnPitch : awayStates);

  const homeGkFace = homeGk ? (homeGk.faceStats || calculateEaFcFaceStats(homeGk)) : { dri: 80, pac: 80 };
  const awayGkFace = awayGk ? (awayGk.faceStats || calculateEaFcFaceStats(awayGk)) : { dri: 80, pac: 80 };

  let homePenalties = 0;
  let awayPenalties = 0;
  const kicks: PenaltyKickAttempt[] = [];

  const takeKick = (
    round: number,
    club: Club,
    taker: CareerPlayer,
    oppGkName: string,
    oppGkReflex: number,
    composureBonus: number = 0
  ): PenaltyKickAttempt => {
    const face = taker.faceStats || calculateEaFcFaceStats(taker);
    const convProb = clamp(
      0.76 + (face.sho - oppGkReflex) * 0.004 + (composureBonus / 100) * 0.4,
      0.62,
      0.92
    );
    const scored = Math.random() < convProb;
    const detail = scored
      ? `🟢 GOAL! ${taker.name} sends ${oppGkName} the wrong way!`
      : Math.random() < 0.72
      ? `🔴 SAVED! ${oppGkName} dives to parry ${taker.name}'s spot-kick!`
      : `🔴 MISSED! ${taker.name} fires off the woodwork!`;
    return {
      round,
      clubId: club.id,
      takerName: taker.name,
      scored,
      detail,
    };
  };

  // Standard 5 rounds (with early mathematical elimination check)
  for (let round = 1; round <= 5; round++) {
    const hTaker = homeTakers[(round - 1) % Math.max(1, homeTakers.length)]?.player;
    if (hTaker) {
      const hk = takeKick(
        round,
        homeClub,
        hTaker,
        awayGk?.name || 'Keeper',
        awayGkFace.dri,
        homeCapEffects?.composureBonus || 0
      );
      if (hk.scored) homePenalties++;
      kicks.push(hk);
    }

    const homeRemainingAfterH = 5 - round;
    const awayRemainingBeforeA = 5 - (round - 1);
    if (
      homePenalties > awayPenalties + awayRemainingBeforeA ||
      awayPenalties > homePenalties + homeRemainingAfterH
    ) {
      break;
    }

    const aTaker = awayTakers[(round - 1) % Math.max(1, awayTakers.length)]?.player;
    if (aTaker) {
      const ak = takeKick(
        round,
        awayClub,
        aTaker,
        homeGk?.name || 'Keeper',
        homeGkFace.dri,
        awayCapEffects?.composureBonus || 0
      );
      if (ak.scored) awayPenalties++;
      kicks.push(ak);
    }

    const remainingBoth = 5 - round;
    if (
      homePenalties > awayPenalties + remainingBoth ||
      awayPenalties > homePenalties + remainingBoth
    ) {
      break;
    }
  }

  // Sudden death rounds if tied after 5
  let sdRound = 6;
  while (homePenalties === awayPenalties && sdRound <= 14) {
    const hTaker = homeTakers[(sdRound - 1) % Math.max(1, homeTakers.length)]?.player;
    const aTaker = awayTakers[(sdRound - 1) % Math.max(1, awayTakers.length)]?.player;
    if (!hTaker || !aTaker) {
      homePenalties += 1;
      break;
    }
    const hk = takeKick(
      sdRound,
      homeClub,
      hTaker,
      awayGk?.name || 'Keeper',
      awayGkFace.dri,
      homeCapEffects?.composureBonus || 0
    );
    if (hk.scored) homePenalties++;
    kicks.push(hk);

    const ak = takeKick(
      sdRound,
      awayClub,
      aTaker,
      homeGk?.name || 'Keeper',
      homeGkFace.dri,
      awayCapEffects?.composureBonus || 0
    );
    if (ak.scored) awayPenalties++;
    kicks.push(ak);

    sdRound++;
  }

  if (homePenalties === awayPenalties) {
    homePenalties += 1;
  }

  return {
    homePenalties,
    awayPenalties,
    kicks,
  };
}

/**
 * Packages a completed LiveMatchSession into a final MatchSimulationResult,
 * recording clean-sheet bonuses, accurate playerRatings, starterPlayerIds,
 * and participatingPlayerIds on the fixture.
 */
export function finalizeLiveMatchSession(session: LiveMatchSession): MatchSimulationResult {
  const homeStates = session.homePlayerStates.map((s) => ({ ...s }));
  const awayStates = session.awayPlayerStates.map((s) => ({ ...s }));

  const homeWon = session.homeScore > session.awayScore;
  const awayWon = session.awayScore > session.homeScore;
  const homeCleanSheet = session.awayScore === 0;
  const awayCleanSheet = session.homeScore === 0;

  // Apply post-90' rating adjustments for clean sheets and match winners
  for (const s of homeStates) {
    if (s.minutesPlayed > 0 || s.isOnPitch) {
      if (s.minutesPlayed === 0 && s.isOnPitch) s.minutesPlayed = session.maxMinutes;
      const g = categorizePosition(s.player.position);
      if (homeCleanSheet && (g === 'GK' || g === 'DEF')) {
        s.matchRating += 0.45;
      }
      if (homeWon) s.matchRating += 0.25;
      else if (awayWon) s.matchRating -= 0.2;
      s.matchRating = Number(clamp(s.matchRating, 4.8, 10.0).toFixed(1));
    }
  }

  for (const s of awayStates) {
    if (s.minutesPlayed > 0 || s.isOnPitch) {
      if (s.minutesPlayed === 0 && s.isOnPitch) s.minutesPlayed = session.maxMinutes;
      const g = categorizePosition(s.player.position);
      if (awayCleanSheet && (g === 'GK' || g === 'DEF')) {
        s.matchRating += 0.45;
      }
      if (awayWon) s.matchRating += 0.25;
      else if (homeWon) s.matchRating -= 0.2;
      s.matchRating = Number(clamp(s.matchRating, 4.8, 10.0).toFixed(1));
    }
  }

  const avgHomePoss =
    session.homePossessionSamples.length > 0
      ? Math.round(
          session.homePossessionSamples.reduce((a, b) => a + b, 0) /
            session.homePossessionSamples.length
        )
      : 50;
  const homePossession = clamp(avgHomePoss, 34, 66);
  const awayPossession = 100 - homePossession;

  const stats: MatchStats = {
    homePossession,
    awayPossession,
    homeShots: Math.max(session.homeScore, session.homeShots),
    awayShots: Math.max(session.awayScore, session.awayShots),
    homeShotsOnTarget: Math.max(session.homeScore, session.homeShotsOnTarget),
    awayShotsOnTarget: Math.max(session.awayScore, session.awayShotsOnTarget),
    homeFouls: session.homeFouls,
    awayFouls: session.awayFouls,
    homeCorners: session.homeCorners,
    awayCorners: session.awayCorners,
    homeXg: Number(Math.max(session.homeScore * 0.35, session.homeXg).toFixed(2)),
    awayXg: Number(Math.max(session.awayScore * 0.35, session.awayXg).toFixed(2)),
    homeSaves: session.homeSaves,
    awaySaves: session.awaySaves,
    homeBigChances: session.homeBigChances,
    awayBigChances: session.awayBigChances,
  };

  // Determine Man of the Match
  const allParticipating = [...homeStates, ...awayStates].filter(
    (p) => p.minutesPlayed > 0 || p.isOnPitch || p.goals > 0
  );
  allParticipating.sort((a, b) => b.matchRating - a.matchRating || b.goals - a.goals);
  const motm = allParticipating[0] || homeStates[0];
  const motmClubId = homeStates.some((h) => h.player.id === motm.player.id)
    ? session.config.homeClub.id
    : session.config.awayClub.id;

  const manOfTheMatch = {
    name: motm.player.name,
    clubId: motmClubId,
    rating: Math.min(10.0, Math.max(6.0, Number(motm.matchRating.toFixed(1)))),
  };

  // Persist participating IDs, starter IDs, and individual player ratings
  const starterPlayerIds = [...homeStates, ...awayStates]
    .filter((s) => s.isStarter)
    .map((s) => s.player.id);
  const participatingPlayerIds = [...homeStates, ...awayStates]
    .filter((s) => s.minutesPlayed > 0 || s.isStarter || s.isOnPitch)
    .map((s) => s.player.id);

  const playerRatings: Record<string, number> = {};
  for (const s of [...homeStates, ...awayStates]) {
    if (s.minutesPlayed > 0 || s.isStarter || s.isOnPitch) {
      playerRatings[s.player.id] = s.matchRating;
    }
  }

  const sortedEvents = [...session.events].sort((a, b) => a.minute - b.minute);
  const sortedScorers = [...session.scorers].sort((a, b) => a.minute - b.minute);

  const updatedFixture: LeagueFixture = {
    ...session.fixture,
    played: true,
    homeScore: session.homeScore,
    awayScore: session.awayScore,
    scorers: sortedScorers,
    events: sortedEvents,
    stats,
    manOfTheMatch,
    starterPlayerIds,
    participatingPlayerIds,
    playerRatings,
  };

  return {
    fixture: updatedFixture,
    homeScore: session.homeScore,
    awayScore: session.awayScore,
    scorers: sortedScorers,
    events: sortedEvents,
    stats,
    manOfTheMatch,
    homePlayerStates: homeStates,
    awayPlayerStates: awayStates,
    homeDeptRatings: session.homeDeptRatings,
    awayDeptRatings: session.awayDeptRatings,
  };
}

/**
 * High-fidelity match simulator supporting live commentary ticks, 5 substitutions,
 * stamina drain, in-match injuries, assists, and realistic department stats.
 */
export function simulateFullMatch(
  fixture: LeagueFixture,
  config: MatchSimulationConfig
): MatchSimulationResult {
  let session = createLiveMatchSession(fixture, config);
  for (let m = 1; m <= 90; m++) {
    session = stepLiveMatchMinute(session);
  }
  return finalizeLiveMatchSession(session);
}

function pickWeightedAttackingPlayer(states: InGamePlayerState[]): InGamePlayerState | undefined {
  const active = states.filter(
    (s) => s.isOnPitch && !s.redCard && categorizePosition(s.player.position) !== 'GK'
  );
  if (active.length === 0) return states[0];

  const weights = active.map((s) => {
    const g = categorizePosition(s.slotPosition || s.player.position);
    const face = s.player.faceStats || calculateEaFcFaceStats(s.player);
    const posWeight = g === 'FWD' ? 4.2 : g === 'MID' ? 1.8 : 0.45;
    const shoWeight = Math.max(0.5, (face.sho - 45) / 35);
    return posWeight * shoWeight;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < active.length; i++) {
    r -= weights[i];
    if (r <= 0) return active[i];
  }
  return active[0];
}

function pickWeightedAssister(
  states: InGamePlayerState[],
  excludePlayerId: string
): InGamePlayerState | undefined {
  const active = states.filter(
    (s) =>
      s.isOnPitch &&
      !s.redCard &&
      s.player.id !== excludePlayerId &&
      categorizePosition(s.player.position) !== 'GK'
  );
  if (active.length === 0) return undefined;

  const weights = active.map((s) => {
    const pos = (s.slotPosition || s.player.position).toUpperCase();
    const g = categorizePosition(pos);
    const face = s.player.faceStats || calculateEaFcFaceStats(s.player);
    const isCreativeRole = ['CAM', 'LW', 'RW', 'LM', 'RM', 'CM'].includes(pos);
    const isFullback = ['LB', 'RB', 'LWB', 'RWB'].includes(pos);
    const roleWeight = isCreativeRole ? 3.5 : g === 'FWD' ? 2.2 : isFullback ? 1.8 : 0.6;
    const pasWeight = Math.max(0.5, (face.pas - 45) / 35);
    return roleWeight * pasWeight;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < active.length; i++) {
    r -= weights[i];
    if (r <= 0) return active[i];
  }
  return active[0];
}

function performSmartAiSubstitution(
  states: InGamePlayerState[],
  clubId: string,
  minute: number,
  events: MatchEvent[],
  forcedPlayerOutId?: string
): boolean {
  const onPitchOutfield = states.filter(
    (s) => s.isOnPitch && !s.redCard && categorizePosition(s.player.position) !== 'GK'
  );
  const benchAvailable = states.filter(
    (s) => !s.isOnPitch && !s.redCard && !s.subbedOutMinute && categorizePosition(s.player.position) !== 'GK'
  );

  if (onPitchOutfield.length === 0 || benchAvailable.length === 0) return false;

  let playerOut = forcedPlayerOutId
    ? onPitchOutfield.find((s) => s.player.id === forcedPlayerOutId)
    : undefined;

  if (!playerOut) {
    // Prioritize booked or most fatigued outfield player
    const sortedCandidates = [...onPitchOutfield].sort((a, b) => {
      const scoreA = a.currentFitness - (a.yellowCard ? 12 : 0) - (a.injured ? 50 : 0);
      const scoreB = b.currentFitness - (b.yellowCard ? 12 : 0) - (b.injured ? 50 : 0);
      return scoreA - scoreB;
    });
    playerOut = sortedCandidates[0];
  }

  if (!playerOut) return false;

  const targetGroup = categorizePosition(playerOut.slotPosition || playerOut.player.position);
  const sameGroupBench = benchAvailable.filter(
    (b) => categorizePosition(b.player.position) === targetGroup
  );
  const playerIn = sameGroupBench.length > 0 ? sameGroupBench[0] : benchAvailable[0];

  if (!playerIn) return false;

  playerOut.isOnPitch = false;
  playerOut.subbedOutMinute = minute;

  playerIn.isOnPitch = true;
  playerIn.slotPosition = playerOut.slotPosition || playerOut.player.position;
  playerIn.subbedInMinute = minute;

  events.push({
    minute,
    type: 'substitution',
    clubId,
    playerName: playerOut.player.name,
    subPlayerIn: playerIn.player.name,
    detail: `Substitution: ${playerIn.player.name} on for ${playerOut.player.name}`,
  });

  return true;
}

/**
 * Updates full squad fitness, form, morale, injury recovery, and U23 progression after a match is concluded.
 */
export function applyPostMatchSquadImpact(
  squad: CareerPlayer[],
  participatingStates: InGamePlayerState[],
  wonMatch: boolean,
  settings: CareerSettings,
  drewMatch: boolean = false,
  trainingFocus?: TeamTrainingFocus,
  injuryDurationReductionWeeks: number = 0,
  fitnessRecoveryModifier: number = 1.0,
  xpModifier: number = 1.0
): CareerPlayer[] {
  const stateMap = new Map<string, InGamePlayerState>(
    participatingStates.map((s) => [s.player.id, s])
  );

  return squad.map((player) => {
    const playedState = stateMap.get(player.id);

    if (playedState && playedState.minutesPlayed > 0) {
      // Played in match
      const drainBase = 10 + (playedState.minutesPlayed / 90) * 6;
      const drainMult = trainingFocus === 'recovery' ? 0.8 : 1.0;
      const fitnessDrain = Math.round(drainBase * drainMult);
      const newFitness = Math.max(50, (player.fitness ?? 100) - fitnessDrain);

      // Morale update
      const moraleDelta = wonMatch ? 5 : drewMatch ? 1 : -3;
      const newMorale = Math.max(30, Math.min(100, (player.morale ?? 85) + moraleDelta));

      // Injury state
      const isInjured = playedState.injured;
      const baseInjuryWeeks = isInjured ? Math.floor(Math.random() * 3) + 1 : player.injuryWeeks;
      const injuryWeeks = isInjured && typeof baseInjuryWeeks === 'number'
        ? Math.max(1, baseInjuryWeeks - injuryDurationReductionWeeks)
        : player.injuryWeeks;

      // Discipline & Suspensions tracking
      let yellowCardsTotal = player.yellowCardsTotal ?? 0;
      let redCardsTotal = player.redCardsTotal ?? 0;
      let suspendedMatches = player.suspendedMatches ?? 0;
      let suspensionReason = player.suspensionReason;

      if (playedState.redCard) {
        redCardsTotal += 1;
        suspendedMatches = 1;
        suspensionReason = 'Suspended (Red card in previous match)';
      } else if (playedState.yellowCard) {
        yellowCardsTotal += 1;
        if (yellowCardsTotal % 5 === 0) {
          suspendedMatches = 1;
          suspensionReason = `Suspended (${yellowCardsTotal} Yellow cards accumulated)`;
        }
      } else if (suspendedMatches > 0) {
        // Player served suspension if they didn't receive another ban
        suspendedMatches = Math.max(0, suspendedMatches - 1);
        if (suspendedMatches === 0) suspensionReason = undefined;
      }

      // 1. Update form history and dynamic ratings
      const matchRating = playedState.matchRating || (wonMatch ? 7.6 : drewMatch ? 6.9 : 6.5);
      const playerWithUpdatedForm = updatePlayerForm(
        {
          ...player,
          fitness: newFitness,
          morale: newMorale,
          injured: isInjured || player.injured,
          injuryWeeks,
          yellowCardsTotal,
          redCardsTotal,
          suspendedMatches,
          suspensionReason,
        },
        matchRating
      );

      // 2. Natural in-season youth development from match experience
      const progression = applyInSeasonMatchProgression(
        playerWithUpdatedForm,
        playedState.minutesPlayed,
        matchRating,
        xpModifier
      );

      return progression.updatedPlayer;
    } else {
      // Rested player (benched / reserve) -> recovers stamina!
      const baseRecovery = trainingFocus === 'recovery' ? 18 : 12;
      const recovery = Math.round(baseRecovery * fitnessRecoveryModifier);
      const newFitness = Math.min(100, (player.fitness ?? 100) + recovery);

      // Existing injury recovery countdown
      let injuryWeeks = player.injuryWeeks;
      let injured = player.injured;

      if (injured && typeof injuryWeeks === 'number') {
        injuryWeeks = Math.max(0, injuryWeeks - 1);
        if (injuryWeeks === 0) {
          injured = false;
        }
      }

      // Disciplinary suspension countdown for players serving a ban
      let suspendedMatches = player.suspendedMatches;
      let suspensionReason = player.suspensionReason;
      if (typeof suspendedMatches === 'number' && suspendedMatches > 0) {
        suspendedMatches = Math.max(0, suspendedMatches - 1);
        if (suspendedMatches === 0) {
          suspensionReason = undefined;
        }
      }

      const restedBase: CareerPlayer = {
        ...player,
        fitness: newFitness,
        injured,
        injuryWeeks,
        suspendedMatches,
        suspensionReason,
      };

      // Unused young squad members still gain training experience from matchday prep
      const progression = applyInSeasonMatchProgression(restedBase, 0, 7.0, xpModifier);
      return progression.updatedPlayer;
    }
  });
}

/**
 * Applies unified post-match squad impact (stamina drain, bench recovery, injury healing countdown,
 * morale, form, and U23 progression) for Instant Sim and Fast-Forward simulated fixtures.
 */
export function applySimulatedMatchSquadImpact(
  fullSquad: CareerPlayer[],
  activeMatchdaySquad: CareerPlayer[],
  simmedFixture: LeagueFixture,
  userClubId: string,
  settings: CareerSettings,
  trainingFocus?: TeamTrainingFocus,
  injuryDurationReductionWeeks: number = 0,
  fitnessRecoveryModifier: number = 1.0,
  xpModifier: number = 1.0
): CareerPlayer[] {
  const isHome = simmedFixture.homeClubId === userClubId;
  const userGoals = isHome ? (simmedFixture.homeScore ?? 0) : (simmedFixture.awayScore ?? 0);
  const oppGoals = isHome ? (simmedFixture.awayScore ?? 0) : (simmedFixture.homeScore ?? 0);
  const won = userGoals > oppGoals;
  const drew = userGoals === oppGoals;

  const starters = activeMatchdaySquad.slice(0, 11);
  const bench = activeMatchdaySquad.slice(11, 20);
  const participatingIds = new Set(simmedFixture.participatingPlayerIds || starters.map((p) => p.id));
  const cardEvents = simmedFixture.events || [];

  const states: InGamePlayerState[] = [
    ...starters.map((p) => {
      const goals = (simmedFixture.scorers || []).filter(
        (sc) => sc.clubId === userClubId && sc.name === p.name
      ).length;
      const assists = (simmedFixture.events || []).filter(
        (ev) => ev.clubId === userClubId && ev.type === 'goal' && ev.detail?.includes(`Assist: ${p.name}`)
      ).length;
      const hadYellow = cardEvents.some(
        (ev) => ev.clubId === userClubId && ev.type === 'yellow_card' && ev.detail?.includes(p.name)
      );
      const hadRed = cardEvents.some(
        (ev) => ev.clubId === userClubId && ev.type === 'red_card' && ev.detail?.includes(p.name)
      );
      const savedRating = simmedFixture.playerRatings?.[p.id];
      const baseRating = won ? 7.4 : drew ? 6.8 : 6.3;
      const matchRating =
        savedRating ??
        Number(clamp(baseRating + goals * 0.7 + assists * 0.4 + (Math.random() * 0.6 - 0.3), 5.5, 10.0).toFixed(1));

      return {
        player: p,
        isStarter: true,
        isOnPitch: true,
        minutesPlayed: 90,
        currentFitness: p.fitness ?? 100,
        goals,
        assists,
        yellowCard: hadYellow,
        redCard: hadRed,
        injured: false,
        matchRating,
      };
    }),
    ...bench.map((p, idx) => {
      const subPlayed = participatingIds.has(p.id) || idx < 2;
      const goals = (simmedFixture.scorers || []).filter(
        (sc) => sc.clubId === userClubId && sc.name === p.name
      ).length;
      const assists = subPlayed
        ? (simmedFixture.events || []).filter(
            (ev) => ev.clubId === userClubId && ev.type === 'goal' && ev.detail?.includes(`Assist: ${p.name}`)
          ).length
        : 0;
      const hadYellow = subPlayed && cardEvents.some(
        (ev) => ev.clubId === userClubId && ev.type === 'yellow_card' && ev.detail?.includes(p.name)
      );
      const hadRed = subPlayed && cardEvents.some(
        (ev) => ev.clubId === userClubId && ev.type === 'red_card' && ev.detail?.includes(p.name)
      );
      const savedRating = simmedFixture.playerRatings?.[p.id];
      const baseRating = won ? 7.2 : drew ? 6.7 : 6.3;
      const matchRating =
        savedRating ?? Number(clamp(baseRating + goals * 0.7, 5.8, 9.5).toFixed(1));

      return {
        player: p,
        isStarter: false,
        isOnPitch: subPlayed,
        minutesPlayed: subPlayed ? 22 : 0,
        currentFitness: p.fitness ?? 100,
        goals,
        assists,
        yellowCard: hadYellow,
        redCard: hadRed,
        injured: false,
        matchRating,
      };
    }),
  ];

  return applyPostMatchSquadImpact(
    fullSquad,
    states,
    won,
    settings,
    drew,
    trainingFocus,
    injuryDurationReductionWeeks,
    fitnessRecoveryModifier,
    xpModifier
  );
}
