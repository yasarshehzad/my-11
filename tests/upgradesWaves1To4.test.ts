import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  writeCareerSaveRecord,
  readRawCareerSave,
  deleteCareerSave,
  listSaveSlots,
  hydrateCareerSaveVault,
  exportCareerSaveAsJson,
  importCareerSaveFromJson,
  getSlotStorageKey,
} from '../src/career/saveVault';
import { createNewCareerSave } from '../src/career/saves';
import { getPresetSettings } from '../src/career/settings';
import { getClubById } from '../src/career/clubs';
import { advanceToNextSeason } from '../src/career/seasons';
import { processVeteranRetirementsAndRegens } from '../src/career/youthAcademy';
import { selectRotatedAiMatchdaySquad, applyAiMatchdayImpact } from '../src/career/sim';
import { evaluateDressingRoomDynamics, resolveDressingRoomConfrontation } from '../src/career/inbox';
import { getClubTacticalProfile, pickDefaultSetPieceTakers } from '../src/career/tactics';
import {
  createLiveMatchSession,
  stepLiveMatchMinute,
  applyTouchlineShout,
  simulatePenaltyShootoutDetailed,
  applyPostMatchSquadImpact,
} from '../src/career/matchEngine';
import {
  encodeH2HPayload,
  generateH2HChallengeUrl,
  parseH2HChallengeFromUrl,
  simulateH2HSquadShowdown,
} from '../src/utils/challengeUrl';
import { players } from '../src/data/players';
import { calculateSquadStats, FORMATION_SLOTS } from '../src/utils/gameLogic';
import { CareerPlayer, CareerSaveFile, LeagueFixture } from '../src/career/types';
import { H2HSquadChallenge } from '../src/types/game';

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

describe('Waves 1-4 Feature Upgrades Integration', () => {
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

  // =========================================================================
  // WAVE 1: Save Vault Persistence, Migration, Export & Import
  // =========================================================================
  it('Wave 1: persists, exports, imports, and hydrates legacy localStorage saves in saveVault', async () => {
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Vault Manager', nationality: 'England' },
      club: manBlue,
      settings: getPresetSettings('easy'),
    });

    expect(writeCareerSaveRecord(save)).toBe(true);
    const loaded = readRawCareerSave('slot_1');
    expect(loaded).not.toBeNull();
    expect(loaded?.manager.name).toBe('Vault Manager');

    const slots = listSaveSlots();
    expect(slots[0].isEmpty).toBe(false);
    expect(slots[0].save?.clubName).toBe(manBlue.defaultName);

    const json = exportCareerSaveAsJson('slot_1');
    expect(json).toBeTruthy();

    const imported = importCareerSaveFromJson('slot_2', json!);
    expect(imported.success).toBe(true);
    expect(readRawCareerSave('slot_2')?.id).toBe('slot_2');

    // Legacy localStorage blob migration fallback when IDB isn't present
    deleteCareerSave('slot_3');
    localStorage.setItem(
      getSlotStorageKey('slot_3'),
      JSON.stringify({ ...save, id: 'slot_3', manager: { ...save.manager, name: 'Legacy Manager' } })
    );
    await hydrateCareerSaveVault();
    expect(readRawCareerSave('slot_3')?.manager.name).toBe('Legacy Manager');
  });

  // =========================================================================
  // WAVE 2: Bosman Pre-Contracts, World Regens, AI Rotation & Dressing Room
  // =========================================================================
  it('Wave 2: preserves full metadata when Bosman pre-contracts arrive next season', () => {
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Bosman Boss', nationality: 'England' },
      club: manBlue,
      settings: getPresetSettings('easy'),
    });

    const completedFixtures = (save.fixtures || []).map((f) => ({
      ...f,
      played: true,
      homeScore: 2,
      awayScore: 1,
    }));

    const saveWithPreContract: CareerSaveFile = {
      ...save,
      fixtures: completedFixtures,
      preContracts: [
        {
          id: 'pc_test_1',
          playerId: 'bosman_star_99',
          cardId: 'bosman_star_99_card',
          playerName: 'Luka Bosmanovic',
          rating: 86,
          position: 'CM',
          naturalPositions: ['CM', 'CAM'],
          secondaryPositions: ['CDM'],
          age: 27,
          dateOfBirth: '1999-03-10',
          nationality: 'Croatia',
          originClub: 'FC Zagreb',
          wageWeekly: 145_000,
          contractYears: 4,
          signingBonus: 250_000,
          agreementDate: '2027-01-12',
          arrivalDate: '2027-07-01',
          preferredFoot: 'Right',
          heightCm: 181,
          weightKg: 75,
          squadRole: 'crucial',
          potential: 88,
          isHomegrown: false,
          faceStats: { pac: 78, sho: 81, pas: 89, dri: 86, def: 74, phy: 76 },
        },
      ],
    };

    const { updatedSave: nextSave } = advanceToNextSeason(saveWithPreContract);
    expect(nextSave.preContracts).toEqual([]);

    const arrived = nextSave.squad.find((p) => p.name === 'Luka Bosmanovic');
    expect(arrived).toBeDefined();
    expect(arrived?.nationality).toBe('Croatia');
    expect(arrived?.preferredFoot).toBe('Right');
    expect(arrived?.faceStats?.pas).toBe(89);
    expect(arrived?.squadRole).toBe('crucial');
    expect(arrived?.age).toBe(28);
    expect(nextSave.transfersHistory?.some((tx) => tx.playerName === 'Luka Bosmanovic' && tx.type === 'free_signing')).toBe(true);
    expect(nextSave.inbox?.some((m) => m.subject.includes('Bosman Free Transfers Registered'))).toBe(true);
  });

  it('Wave 2: retires 37+ veterans and generates matching-nationality World Regens', () => {
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Youth Scout', nationality: 'England' },
      club: manBlue,
      settings: getPresetSettings('easy'),
    });

    const veteran: CareerPlayer = {
      ...save.squad[0],
      id: 'vet_italian_gk',
      name: 'Gianluigi Veteran',
      age: 38,
      rating: 87,
      position: 'GK',
      naturalPositions: ['GK'],
      nationality: 'Italy',
    };

    const bigSquad: CareerPlayer[] = [veteran, ...save.squad.slice(1)];
    while (bigSquad.length < 20) {
      bigSquad.push({ ...save.squad[1], id: `filler_${bigSquad.length}`, age: 23 });
    }

    const academyOutcome = processVeteranRetirementsAndRegens(bigSquad, manBlue.defaultName, manBlue.id, 2027, {
      placeInSquadDirectly: false,
      minSquadSize: 16,
    });
    expect(academyOutcome.retiredPlayers.some((p) => p.id === 'vet_italian_gk')).toBe(true);
    expect(academyOutcome.academyRegens.length).toBeGreaterThanOrEqual(1);
    const italRegen = academyOutcome.academyRegens.find((r) => r.nationality === 'Italy');
    expect(italRegen).toBeDefined();
    expect(italRegen?.position).toBe('GK');
    expect(italRegen?.potential).toBeGreaterThanOrEqual(83);

    const directOutcome = processVeteranRetirementsAndRegens(bigSquad, manBlue.defaultName, manBlue.id, 2027, {
      placeInSquadDirectly: true,
      minSquadSize: 16,
    });
    expect(directOutcome.squadRegens.some((r) => r.nationality === 'Italy' && r.position === 'GK')).toBe(true);
  });

  it('Wave 2: rotates fatigued/suspended AI players and applies post-match stamina & card impact', () => {
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Analyst', nationality: 'England' },
      club: manBlue,
      settings: getPresetSettings('easy'),
    });

    const baseSquad = save.squad.map((p, i) => ({
      ...p,
      fitness: i === 0 ? 55 : 95,
      suspendedMatches: i === 1 ? 1 : 0,
    }));

    const { matchdaySquad } = selectRotatedAiMatchdaySquad(baseSquad, 1);
    const starterIds = new Set(matchdaySquad.slice(0, 11).map((p) => p.id));
    expect(starterIds.has(baseSquad[1].id)).toBe(false); // suspended player excluded

    const redPlayer = matchdaySquad[2];
    const fixture: LeagueFixture = {
      id: 'fx_ai_1',
      competitionId: 'eng_pl',
      round: 1,
      date: '2026-08-15',
      homeClubId: londonRed.id,
      awayClubId: manBlue.id,
      played: true,
      homeScore: 1,
      awayScore: 1,
      events: [
        {
          minute: 72,
          type: 'red_card',
          clubId: londonRed.id,
          playerName: redPlayer.name,
          detail: 'Straight red card',
        },
      ],
    };

    const updated = applyAiMatchdayImpact(baseSquad, matchdaySquad, fixture, londonRed.id);
    const updatedRed = updated.find((p) => p.id === redPlayer.id);
    const updatedBanned = updated.find((p) => p.id === baseSquad[1].id);
    const updatedStarter = updated.find((p) => p.id === matchdaySquad[3].id);

    expect(updatedRed?.suspendedMatches).toBe(1);
    expect(updatedBanned?.suspendedMatches).toBe(0); // ban served while out of matchday squad
    expect((updatedStarter?.fitness ?? 100)).toBeLessThan(95);
  });

  it('Wave 2: triggers playing-time confrontations, tracks promises across matches, and resolves fulfillment/breach', () => {
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Man Manager', nationality: 'England' },
      club: manBlue,
      settings: getPresetSettings('easy'),
    });

    const unhappyStar: CareerPlayer = {
      ...save.squad[0],
      id: 'unhappy_star_1',
      name: 'Marcus Unhappy',
      squadRole: 'crucial',
      benchedStreak: 3,
      morale: 68,
    };

    const evaluated = evaluateDressingRoomDynamics({
      ...save,
      squad: [unhappyStar, ...save.squad.slice(1)],
    });

    const confrontationMsg = evaluated.inbox?.find(
      (m) => m.type === 'dressing_room' && m.targetId === 'unhappy_star_1' && !m.resolved
    );
    expect(confrontationMsg).toBeDefined();

    // Manager promises 3 starts in 5 matches
    const { updatedSave: promisedSave } = resolveDressingRoomConfrontation(
      evaluated,
      'unhappy_star_1',
      'promise_starts',
      confrontationMsg!.id
    );
    const promisedPlayer = promisedSave.squad.find((p) => p.id === 'unhappy_star_1')!;
    expect(promisedPlayer.playingTimePromise?.status).toBe('active');
    expect(promisedPlayer.playingTimePromise?.targetStarts).toBe(3);

    // Simulate 3 consecutive starts -> promise fulfilled
    let progressedSave = promisedSave;
    for (let m = 0; m < 3; m++) {
      const target = progressedSave.squad.find((p) => p.id === 'unhappy_star_1')!;
      progressedSave = {
        ...progressedSave,
        squad: applyPostMatchSquadImpact(
          progressedSave.squad,
          [
            {
              player: target,
              isStarter: true,
              isOnPitch: true,
              slotPosition: target.position,
              minutesPlayed: 90,
              currentFitness: 80,
              goals: 0,
              assists: 0,
              saves: 0,
              yellowCard: false,
              redCard: false,
              injured: false,
              matchRating: 7.4,
            },
          ],
          true,
          progressedSave.settings
        ),
      };
    }

    const fulfilledPlayer = progressedSave.squad.find((p) => p.id === 'unhappy_star_1')!;
    expect(fulfilledPlayer.playingTimePromise?.status).toBe('fulfilled');

    const finalEvaluated = evaluateDressingRoomDynamics(progressedSave);
    expect(
      finalEvaluated.inbox?.some(
        (m) => m.type === 'dressing_room' && m.targetId === 'unhappy_star_1' && m.subject.includes('Promise Kept')
      )
    ).toBe(true);
    expect(finalEvaluated.squad.find((p) => p.id === 'unhappy_star_1')?.playingTimePromise).toBeUndefined();
  });

  // =========================================================================
  // WAVE 3: Reactive AI Tactics, Set-Piece Takers & Touchline Shouts
  // =========================================================================
  it('Wave 3: assigns distinct club tactical profiles, set-piece specialists, reactive AI shifts, shouts & PK order', () => {
    const cityProfile = getClubTacticalProfile(manBlue);
    expect(cityProfile.philosophy).toBe('tiki_taka');
    expect(cityProfile.pressing).toBe('high_press');

    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Tactician', nationality: 'Spain' },
      club: manBlue,
      settings: getPresetSettings('easy'),
    });

    const specialists = pickDefaultSetPieceTakers(save.squad);
    expect(specialists.penaltyTakerId).toBeTruthy();
    expect(specialists.freeKickTakerId).toBeTruthy();
    expect(specialists.cornerTakerId).toBeTruthy();

    const fixture: LeagueFixture = {
      id: 'fx_live_wave3',
      competitionId: 'eng_pl',
      round: 1,
      date: '2026-08-15',
      homeClubId: manBlue.id,
      awayClubId: londonRed.id,
      played: false,
    };

    const starters = save.squad.slice(0, 11);
    const bench = save.squad.slice(11, 18);
    let session = createLiveMatchSession(fixture, {
      userClubId: manBlue.id,
      homeClub: manBlue,
      awayClub: londonRed,
      homeStarters: starters,
      homeBench: bench,
      awayStarters: starters,
      awayBench: bench,
      homeFormation: '4-3-3',
      homeTactics: {
        philosophy: save.tactics?.philosophy || 'gegenpress',
        familiarity: save.tactics?.familiarity ?? 75,
        ...(save.tactics || {}),
        penaltyTakerId: specialists.penaltyTakerId,
      },
      settings: save.settings,
    });

    // Touchline shout applies buff & triggers 15m cooldown
    const shoutResult = applyTouchlineShout(session, manBlue.id, 'push_forward');
    expect(shoutResult.applied).toBe(true);
    expect(shoutResult.session.activeShoutHome?.type).toBe('push_forward');
    expect(shoutResult.session.events.some((e) => e.type === 'tactical')).toBe(true);

    const blockedShout = applyTouchlineShout(shoutResult.session, manBlue.id, 'encourage');
    expect(blockedShout.applied).toBe(false);

    // Trailing AI at minute 60+ switches to attacking + high_press
    session = {
      ...shoutResult.session,
      minute: 62,
      homeScore: 2,
      awayScore: 0,
      awayMentality: 'balanced',
      awayPressing: 'balanced',
      lastAiTacticalSwitchMinuteAway: 0,
    };
    const steppedAttack = stepLiveMatchMinute(session);
    expect(steppedAttack.awayMentality).toBe('attacking');
    expect(steppedAttack.awayPressing).toBe('high_press');
    expect(steppedAttack.lastAiTacticalSwitchMinuteAway).toBe(63);

    // Leading AI at minute 75+ switches to defensive + low_block
    const steppedDefend = stepLiveMatchMinute({
      ...steppedAttack,
      minute: 75,
      homeScore: 0,
      awayScore: 1,
      awayMentality: 'balanced',
      awayPressing: 'balanced',
      lastAiTacticalSwitchMinuteAway: 0,
    });
    expect(steppedDefend.awayMentality).toBe('defensive');
    expect(steppedDefend.awayPressing).toBe('low_block');
    expect(steppedDefend.lastAiTacticalSwitchMinuteAway).toBe(76);

    // Designated penalty taker takes the very first shootout kick for home team
    const chosenPenPlayer = starters.find((p) => p.position !== 'GK') || starters[4];
    const shootout = simulatePenaltyShootoutDetailed(
      manBlue,
      londonRed,
      steppedDefend.homePlayerStates,
      steppedDefend.awayPlayerStates,
      {
        philosophy: save.tactics?.philosophy || 'gegenpress',
        familiarity: save.tactics?.familiarity ?? 75,
        ...(save.tactics || {}),
        penaltyTakerId: chosenPenPlayer.id,
      },
      undefined
    );
    const firstHomeKick = shootout.kicks.find((k) => k.clubId === manBlue.id);
    expect(firstHomeKick?.takerName).toBe(chosenPenPlayer.name);
  });

  // =========================================================================
  // WAVE 4: Head-to-Head (?h2h=...) Friend Squad Battles
  // =========================================================================
  it('Wave 4: encodes, parses, validates, and simulates 2-legged H2H Squad Showdowns', () => {
    const pickByPos = (posList: string[], count: number) =>
      players.filter((p) => posList.includes(p.primaryPosition)).slice(0, count);

    const challengerXI = [
      ...pickByPos(['GK'], 1),
      ...pickByPos(['LB', 'CB', 'RB'], 4),
      ...pickByPos(['CM', 'CDM', 'CAM'], 3),
      ...pickByPos(['LW', 'ST', 'RW'], 3),
    ];
    expect(challengerXI).toHaveLength(11);

    const userXI = [
      ...players.filter((p) => p.primaryPosition === 'GK').slice(1, 2),
      ...players.filter((p) => ['LB', 'CB', 'RB'].includes(p.primaryPosition)).slice(4, 8),
      ...players.filter((p) => ['CM', 'CDM', 'CAM'].includes(p.primaryPosition)).slice(3, 6),
      ...players.filter((p) => ['LW', 'ST', 'RW'].includes(p.primaryPosition)).slice(3, 6),
    ];
    expect(userXI).toHaveLength(11);

    const challengerStats = calculateSquadStats(challengerXI, FORMATION_SLOTS['4-3-3']);
    const userStats = calculateSquadStats(userXI, FORMATION_SLOTS['4-3-3']);

    const challenge: H2HSquadChallenge = {
      managerName: 'Coach Alex',
      clubName: 'North London XI',
      formation: '4-3-3',
      leagueId: 'english',
      draftMode: 'classic',
      playerIds: challengerXI.map((p) => p.id),
      overall: challengerStats.overall,
      chemistry: challengerStats.chemistry,
      seasonWins: 28,
      seasonPoints: 90,
    };

    const token = encodeH2HPayload(challenge);
    expect(token.length).toBeGreaterThan(20);

    const url = generateH2HChallengeUrl(challenge, 'https://my-11.com');
    expect(url).toContain('?h2h=');

    const parsed = parseH2HChallengeFromUrl(url);
    expect(parsed).not.toBeNull();
    expect(parsed?.managerName).toBe('Coach Alex');
    expect(parsed?.clubName).toBe('North London XI');
    expect(parsed?.playerIds).toEqual(challenge.playerIds);
    expect(parsed?.overall).toBe(challenge.overall);

    expect(parseH2HChallengeFromUrl('https://my-11.com/?h2h=invalid_token')).toBeNull();
    expect(parseH2HChallengeFromUrl('https://my-11.com/?c=1')).toBeNull();

    const showdown1 = simulateH2HSquadShowdown(userXI, '4-3-3', userStats, parsed!, players);
    const showdown2 = simulateH2HSquadShowdown(userXI, '4-3-3', userStats, parsed!, players);

    expect(showdown1.legs).toHaveLength(2);
    expect(showdown1.legs[0].venue).toBe('home');
    expect(showdown1.legs[1].venue).toBe('away');
    expect(showdown1.userAggregateGoals).toBe(showdown1.legs[0].userGoals + showdown1.legs[1].userGoals);
    expect(showdown1.challengerAggregateGoals).toBe(
      showdown1.legs[0].challengerGoals + showdown1.legs[1].challengerGoals
    );
    expect(['user', 'challenger']).toContain(showdown1.winner);
    expect(showdown1.motmName).toBeTruthy();
    // Deterministic result for identical squads
    expect(showdown1.userAggregateGoals).toBe(showdown2.userAggregateGoals);
    expect(showdown1.challengerAggregateGoals).toBe(showdown2.challengerAggregateGoals);
  });
});
