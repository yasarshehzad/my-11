import { describe, it, expect } from 'vitest';
import { createNewCareerSave } from '../src/career/saves';
import { getClubById } from '../src/career/clubs';
import { getPresetSettings } from '../src/career/settings';
import {
  classifyInboxMessage,
  getManagerialAlerts,
  markMessageResolved,
  markMessageRead,
  getInitialInboxMessages,
} from '../src/career/inbox';
import {
  comparePlayers,
  calculatePositionFit,
  normalizePlayerForComparison,
} from '../src/career/playerComparison';
import { CareerPlayer, MarketPlayer, ManagerMessage, CareerSaveFile } from '../src/career/types';
import {
  getSeniorPlayerCount,
  getRegisteredSeniorPlayerIds,
  isPlayerRegisteredForMatch,
  validateSquad,
} from '../src/career/squad';
import { getScoutingMarketPool, executePlayerSigning } from '../src/career/transfers';

describe('Managerial Inbox Classification & Alert Prioritisation', () => {
  const baseSave = createNewCareerSave({
    slotId: 'slot_1',
    manager: { name: 'Manager X', nationality: 'England', preferredFormation: '4-3-3' },
    club: getClubById('merseyside_red')!,
    settings: getPresetSettings('balanced'),
  });

  it('preserves initial urgent priority on day 1 but expires after 7 July (week 1)', () => {
    const welcomeMsg: ManagerMessage = {
      id: 'msg_welcome',
      date: '2026-07-01',
      sender: 'Board of Directors',
      senderRole: 'Chairman',
      subject: 'Welcome to Liverpool Football Club',
      body: 'Welcome to the club...',
      type: 'board',
      isRead: false,
      priority: 'urgent',
    };

    // On 2026-07-02 (within week 1)
    const earlySave = {
      ...baseSave,
      season: { ...baseSave.season, currentDate: '2026-07-02' },
    };
    const earlyClassification = classifyInboxMessage(welcomeMsg, earlySave);
    expect(earlyClassification.classification).toBe('important');
    expect(earlyClassification.isResolved).toBe(false);

    // On 2026-07-15 (after week 1)
    const lateSave = {
      ...baseSave,
      season: { ...baseSave.season, currentDate: '2026-07-15' },
    };
    const lateClassification = classifyInboxMessage(welcomeMsg, lateSave);
    expect(lateClassification.classification).toBe('info');
    expect(lateClassification.isResolved).toBe(true);
  });

  it('marks pending incoming bids as action_required and resolves them when handled', () => {
    const bidMsg: ManagerMessage = {
      id: 'msg_bid_1',
      date: '2026-08-10',
      sender: 'Sporting Director',
      subject: 'Transfer Offer Received for Mo Salah',
      body: 'Al-Ittihad have submitted an offer...',
      type: 'transfer',
      isRead: false,
      priority: 'urgent',
      targetId: 'offer_123',
    };

    // With active pending offer
    const saveWithOffer: CareerSaveFile = {
      ...baseSave,
      incomingOffers: [
        {
          id: 'offer_123',
          playerId: 'salah_1',
          playerName: 'Mohamed Salah',
          buyingClubId: 'al_ittihad',
          buyingClubName: 'Al-Ittihad',
          offeredFee: 85_000_000,
          date: '2026-08-10',
          status: 'pending',
          negotiationRound: 1,
        },
      ],
    };

    const pendingClassification = classifyInboxMessage(bidMsg, saveWithOffer);
    expect(pendingClassification.classification).toBe('action_required');
    expect(pendingClassification.isResolved).toBe(false);
    expect(pendingClassification.effectiveActionLabel).toBe('Review Offer');
    expect(pendingClassification.effectiveActionTab).toBe('transfers');

    // After offer is accepted or rejected (no pending status)
    const saveWithResolvedOffer: CareerSaveFile = {
      ...baseSave,
      incomingOffers: [
        {
          id: 'offer_123',
          playerId: 'salah_1',
          playerName: 'Mohamed Salah',
          buyingClubId: 'al_ittihad',
          buyingClubName: 'Al-Ittihad',
          offeredFee: 85_000_000,
          date: '2026-08-10',
          status: 'accepted',
          negotiationRound: 1,
        },
      ],
    };

    const resolvedClassification = classifyInboxMessage(bidMsg, saveWithResolvedOffer);
    expect(resolvedClassification.classification).toBe('info');
    expect(resolvedClassification.isResolved).toBe(true);
    expect(resolvedClassification.effectiveActionLabel).toBe('Offer Concluded');
  });

  it('differentiates starting XI injuries (action_required) from bench injuries (important)', () => {
    const starterId = baseSave.lineup?.starterIds[0] || baseSave.squad[0].id;
    const benchId = baseSave.lineup?.benchIds[0] || baseSave.squad[15].id;

    const starterPlayer = baseSave.squad.find((p) => p.id === starterId)!;
    const benchPlayer = baseSave.squad.find((p) => p.id === benchId)!;

    // Save where starter is injured
    const saveWithStarterInjured: CareerSaveFile = {
      ...baseSave,
      squad: baseSave.squad.map((p) =>
        p.id === starterId ? { ...p, injured: true, injuryWeeks: 3, injuryDescription: 'Hamstring Tear' } : p
      ),
    };

    const starterInjMsg: ManagerMessage = {
      id: 'msg_inj_starter',
      date: '2026-09-01',
      sender: 'Head Physio',
      subject: `Injury Report: ${starterPlayer.name}`,
      body: `${starterPlayer.name} has suffered an injury in training.`,
      type: 'injury',
      isRead: false,
      targetId: starterId,
    };

    const starterResult = classifyInboxMessage(starterInjMsg, saveWithStarterInjured);
    expect(starterResult.classification).toBe('action_required');
    expect(starterResult.isResolved).toBe(false);
    expect(starterResult.effectiveActionLabel).toBe('Adjust Lineup');
    expect(starterResult.effectiveActionTab).toBe('squad');

    // Save where bench player is injured
    const saveWithBenchInjured: CareerSaveFile = {
      ...baseSave,
      squad: baseSave.squad.map((p) =>
        p.id === benchId ? { ...p, injured: true, injuryWeeks: 2, injuryDescription: 'Ankle Sprain' } : p
      ),
    };

    const benchInjMsg: ManagerMessage = {
      id: 'msg_inj_bench',
      date: '2026-09-01',
      sender: 'Head Physio',
      subject: `Injury Report: ${benchPlayer.name}`,
      body: `${benchPlayer.name} is sidelined.`,
      type: 'injury',
      isRead: false,
      targetId: benchId,
    };

    const benchResult = classifyInboxMessage(benchInjMsg, saveWithBenchInjured);
    expect(benchResult.classification).toBe('important');
    expect(benchResult.isResolved).toBe(false);
    expect(benchResult.effectiveActionLabel).toBe('Review Injury');

    // Once healed
    const saveHealed: CareerSaveFile = {
      ...baseSave,
      squad: baseSave.squad.map((p) => ({ ...p, injured: false })),
    };
    const healedResult = classifyInboxMessage(starterInjMsg, saveHealed);
    expect(healedResult.classification).toBe('info');
    expect(healedResult.isResolved).toBe(true);
  });

  it('aggregates true managerial alerts and never shows all clear when action required', () => {
    // 1. Clean save: should have pre-season note or 0 actionable alerts
    const cleanAlerts = getManagerialAlerts(baseSave);
    const cleanActionable = cleanAlerts.filter((a) => a.classification === 'action_required');
    expect(cleanActionable.length).toBe(0);

    // 2. Add an injured starter and a pending bid
    const starterId = baseSave.lineup.starterIds[0];
    const dirtySave: CareerSaveFile = {
      ...baseSave,
      squad: baseSave.squad.map((p) =>
        p.id === starterId ? { ...p, injured: true, injuryWeeks: 4, injuryDescription: 'Knee Sprain' } : p
      ),
      incomingOffers: [
        {
          id: 'offer_urgent',
          playerId: baseSave.squad[1].id,
          playerName: baseSave.squad[1].name,
          buyingClubId: 'real_madrid',
          buyingClubName: 'Real Madrid',
          offeredFee: 90_000_000,
          date: '2026-08-01',
          status: 'pending',
          negotiationRound: 1,
        },
      ],
      boardStatus: {
        confidence: 38, // <45% critical
        expectation: 'Avoid Sack',
        status: 'under_pressure',
        warningsCount: 1,
      },
    };

    const alerts = getManagerialAlerts(dirtySave);
    const actionable = alerts.filter((a) => a.classification === 'action_required');

    expect(actionable.length).toBeGreaterThanOrEqual(3);
    const alertTypes = actionable.map((a) => a.actionType);
    expect(alertTypes).toContain('review_offer');
    expect(alertTypes).toContain('open_squad');
    expect(alertTypes).toContain('respond_board');

    const offerAlert = actionable.find((a) => a.actionType === 'review_offer');
    expect(offerAlert?.targetId).toBe('offer_urgent');

    const squadAlert = actionable.find((a) => a.actionType === 'open_squad');
    expect(squadAlert?.targetId).toBe(starterId);
  });

  it('generates targeted review_contract alerts with player targetId for expiring contracts', () => {
    const keyPlayer = baseSave.squad.find((p) => p.rating >= 78) || baseSave.squad[0];
    const contractSave: CareerSaveFile = {
      ...baseSave,
      squad: baseSave.squad.map((p) =>
        p.id === keyPlayer.id ? { ...p, contractYears: 1 } : p
      ),
    };

    const alerts = getManagerialAlerts(contractSave);
    const contractAlert = alerts.find((a) => a.actionType === 'review_contract');
    expect(contractAlert).toBeDefined();
    expect(contractAlert?.targetId).toBe(keyPlayer.id);
    expect(contractAlert?.actionTab).toBe('transfers');
  });

  it('preserves historical inbox items when marked resolved or read', () => {
    let saveWithInbox: CareerSaveFile = {
      ...baseSave,
      inbox: [
        {
          id: 'msg_hist_1',
          date: '2026-07-01',
          sender: 'Board',
          subject: 'Season Expectations',
          body: 'We expect Champions League qualification.',
          type: 'board',
          isRead: false,
          resolved: false,
        },
      ],
    };

    // Mark resolved
    saveWithInbox = markMessageResolved(saveWithInbox, 'msg_hist_1', true);
    expect(saveWithInbox.inbox[0].resolved).toBe(true);
    expect(saveWithInbox.inbox[0].isRead).toBe(false); // unread status remains independent!

    // Mark read
    saveWithInbox = markMessageRead(saveWithInbox, 'msg_hist_1');
    expect(saveWithInbox.inbox[0].isRead).toBe(true);
    expect(saveWithInbox.inbox[0].resolved).toBe(true);
    expect(saveWithInbox.inbox.length).toBe(1); // not deleted from history
  });
});

describe('Player Comparison Engine', () => {
  const squadPlayerA: CareerPlayer = {
    id: 'squad_saliba',
    name: 'William Saliba',
    position: 'CB',
    rating: 88,
    potential: 92,
    age: 25,
    value: 75_000_000,
    wage: 150_000,
    contractYears: 3,
    injured: false,
    fitness: 100,
    morale: 85,
    form: 7.6,
    appearances: 20,
    goals: 2,
    assists: 1,
    cleanSheets: 10,
    yellowCards: 2,
    redCards: 0,
    faceStats: {
      pac: 82,
      sho: 40,
      pas: 74,
      dri: 78,
      def: 89,
      phy: 84,
      isGoalkeeper: false,
    },
  };

  const squadPlayerB: CareerPlayer = {
    id: 'squad_gabriel',
    name: 'Gabriel Magalhães',
    position: 'CB',
    rating: 86,
    potential: 88,
    age: 28,
    value: 60_000_000,
    wage: 130_000,
    contractYears: 2,
    injured: false,
    fitness: 100,
    morale: 80,
    form: 7.4,
    appearances: 20,
    goals: 3,
    assists: 0,
    cleanSheets: 10,
    yellowCards: 3,
    redCards: 0,
    faceStats: {
      pac: 72,
      sho: 42,
      pas: 68,
      dri: 66,
      def: 88,
      phy: 86,
      isGoalkeeper: false,
    },
  };

  const transferTargetA: MarketPlayer = {
    id: 'target_bastoni',
    name: 'Alessandro Bastoni',
    position: 'CB',
    rating: 87,
    potential: 90,
    age: 27,
    nationality: 'Italy',
    value: 70_000_000,
    wageDemand: 180_000,
    currentClub: 'Inter Milan',
    stats: { attack: 45, midfield: 78, defence: 89, chemistry: 80, overall: 87 },
  };

  const transferTargetB: MarketPlayer = {
    id: 'target_yoro',
    name: 'Leny Yoro',
    position: 'CB',
    rating: 80,
    potential: 91,
    age: 20,
    nationality: 'France',
    value: 35_000_000,
    wageDemand: 70_000,
    currentClub: 'Lille',
    stats: { attack: 35, midfield: 65, defence: 82, chemistry: 75, overall: 80 },
  };

  it('Scenario A: Squad vs Squad comparison evaluates attributes and non-colour winning indicators', () => {
    const comparison = comparePlayers(squadPlayerA, squadPlayerB, {
      squad: [squadPlayerA, squadPlayerB],
      finances: {
        transferBudget: 50_000_000,
        weeklyWageBudget: 3_000_000,
        currentWeeklyWages: 2_500_000,
        balance: 60_000_000,
      },
    });

    expect(comparison.mode).toBe('squad_vs_squad');
    expect(comparison.playerA.rating).toBe(88);
    expect(comparison.playerB.rating).toBe(86);
    expect(comparison.fitA).toBe('natural');
    expect(comparison.fitB).toBe('natural');

    // PAC comparison: Saliba (82) vs Gabriel (72) -> playerA diff +10
    const pacRow = comparison.attributes.find((r) => r.key === 'pac');
    expect(pacRow).toBeDefined();
    expect(pacRow?.diff).toBe(10);
    expect(pacRow?.winner).toBe('playerA');

    // Key attribute for CB: DEF & PHY should have isKeyForPosition: true
    const defRow = comparison.attributes.find((r) => r.key === 'def');
    expect(defRow?.isKeyForPosition).toBe(true);

    // Verdict is generated intelligently
    expect(comparison.verdict.recommended).toBe('playerA');
    expect(comparison.verdict.headline.length).toBeGreaterThan(0);
    expect(comparison.verdict.summary.length).toBeGreaterThan(0);
  });

  it('Scenario B: Transfer Target vs Squad Player verifies financial headroom and registration feasibility', () => {
    // Club has tight wage budget: £100k headroom, but Bastoni demands £180k
    const tightFinances = {
      transferBudget: 100_000_000,
      weeklyWageBudget: 2_100_000,
      currentWeeklyWages: 2_000_000, // headroom = 100k
      balance: 100_000_000,
    };

    const comparison = comparePlayers(transferTargetA, squadPlayerA, {
      squad: [squadPlayerA],
      finances: tightFinances,
      seniorCount: 25, // senior squad full (25/25)
      maxSeniorCount: 25,
    });

    expect(comparison.mode).toBe('target_vs_squad');
    expect(comparison.financialImpact.canAffordFeeA).toBe(true); // 100M > 70M
    expect(comparison.financialImpact.hasWageHeadroomA).toBe(false); // demands 180k > 100k headroom
    expect(comparison.financialImpact.wageHeadroom).toBe(100_000);
    expect(comparison.financialImpact.wageWarningA).toContain('exceeds available headroom');

    // Registration feasibility: Bastoni is 27 (>21) and senior squad is 25/25
    expect(comparison.financialImpact.isExemptU21A).toBe(false);
    expect(comparison.financialImpact.registrationWarningA).toContain('Senior roster full');
  });

  it('Scenario C: Transfer Target vs Transfer Target handles U21 registration exemption', () => {
    const comparison = comparePlayers(transferTargetB, transferTargetA, {
      squad: [squadPlayerA],
      finances: {
        transferBudget: 80_000_000,
        weeklyWageBudget: 3_000_000,
        currentWeeklyWages: 2_500_000, // headroom = 500k
        balance: 90_000_000,
      },
      seniorCount: 25, // senior limit full
      maxSeniorCount: 25,
    });

    expect(comparison.mode).toBe('target_vs_target');
    // Player A (Yoro, 20 yrs) is U21 exempt!
    expect(comparison.financialImpact.isExemptU21A).toBe(true);
    expect(comparison.financialImpact.registrationWarningA).toBeUndefined();
    expect(comparison.financialImpact.canAffordFeeA).toBe(true);
    expect(comparison.financialImpact.hasWageHeadroomA).toBe(true);

    // Player B (Bastoni, 27 yrs) is not exempt
    expect(comparison.financialImpact.isExemptU21B).toBe(false);
    expect(comparison.financialImpact.registrationWarningB).toBeDefined();
  });

  it('evaluates positional fit correctly for natural, competent, and out_of_position positions', () => {
    // Saliba is CB: CB is natural
    const cbFit = calculatePositionFit(squadPlayerA, 'CB');
    expect(cbFit).toBe('natural');

    // Saliba as ST is out of position
    const strikerFit = calculatePositionFit(squadPlayerA, 'ST');
    expect(strikerFit).toBe('out_of_position');

    // Central midfielder (CM) playing at CDM is competent
    const midfielder: CareerPlayer = {
      ...squadPlayerA,
      id: 'mid_rice',
      position: 'CM',
      secondaryPositions: ['CDM'],
    };
    const cdmFit = calculatePositionFit(midfielder, 'CDM');
    expect(cdmFit).toBe('competent');
  });

  it('gracefully handles missing faceStats on older saved player data without NaN or crashes', () => {
    const legacyPlayer: CareerPlayer = {
      id: 'legacy_player_1',
      name: 'Legacy Veteran',
      position: 'CM',
      rating: 81,
      potential: 81,
      age: 31,
      value: 15_000_000,
      wage: 65_000,
      contractYears: 1,
      injured: false,
      fitness: 95,
      morale: 70,
      form: 6.8,
      appearances: 10,
      goals: 1,
      assists: 3,
      cleanSheets: 0,
      yellowCards: 1,
      redCards: 0,
      // faceStats intentionally omitted (legacy save format)
    };

    const normalized = normalizePlayerForComparison(legacyPlayer, true);
    expect(normalized.faceStats).toBeDefined();
    expect(normalized.faceStats.pac).toBeGreaterThan(0);
    expect(normalized.faceStats.pas).toBeGreaterThan(0);
    expect(Number.isNaN(normalized.faceStats.pac)).toBe(false);

    // Can compare with another player without crashing
    const comparison = comparePlayers(legacyPlayer, squadPlayerA, {
      squad: [legacyPlayer, squadPlayerA],
      finances: {
        transferBudget: 50_000_000,
        weeklyWageBudget: 2_000_000,
        currentWeeklyWages: 1_800_000,
        balance: 50_000_000,
      },
    });

    expect(comparison.attributes.length).toBe(6);
    for (const row of comparison.attributes) {
      expect(Number.isNaN(row.diff)).toBe(false);
      expect(Number.isNaN(row.valA)).toBe(false);
      expect(Number.isNaN(row.valB)).toBe(false);
    }
  });
});

describe('25-Man Squad Registration & Scouting Market Filters', () => {
  const save = createNewCareerSave({
    slotId: 'slot_1',
    manager: { name: 'Manager Y', nationality: 'Spain', preferredFormation: '4-3-3' },
    club: getClubById('man_blue')!,
    settings: getPresetSettings('balanced'),
  });

  it('allows signing players even if senior squad exceeds 25 without blocking', () => {
    // Generate a squad with 25 senior players (>21)
    const seniorPlayers: CareerPlayer[] = Array.from({ length: 25 }, (_, idx) => ({
      id: `senior_p_${idx}`,
      name: `Senior Player ${idx}`,
      position: 'CM',
      rating: 80,
      potential: 80,
      age: 26,
      value: 10_000_000,
      wage: 50_000,
      contractYears: 2,
      injured: false,
      fitness: 100,
      morale: 80,
      form: 7.0,
      appearances: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
    }));

    const saveWith25Seniors: CareerSaveFile = {
      ...save,
      squad: seniorPlayers,
      finances: {
        ...save.finances,
        transferBudget: 100_000_000,
        weeklyWageBudget: 3_000_000,
        currentWeeklyWages: 1_250_000,
      },
    };

    expect(getSeniorPlayerCount(saveWith25Seniors.squad)).toBe(25);

    // Target a 26th senior player
    const targetPlayer: MarketPlayer = {
      id: 'target_rodri',
      cardId: 'rodri',
      name: 'Rodri',
      rating: 89,
      position: 'CDM',
      age: 27,
      value: 30_000_000,
      wageDemand: 120_000,
      club: 'Manchester City',
      nationality: 'Spain',
      isHomegrown: false,
      rarity: 'gold',
    };

    const res = executePlayerSigning(saveWith25Seniors, targetPlayer, 30_000_000, 120_000, 3);
    // Player signing should succeed!
    expect(res.success).toBe(true);
    expect(res.updatedSave.squad.length).toBe(26);
    expect(getSeniorPlayerCount(res.updatedSave.squad)).toBe(26);

    // Alert for squad registration should now trigger
    const alerts = getManagerialAlerts(res.updatedSave);
    const regAlert = alerts.find((a) => a.id === 'alert_squad_registration');
    expect(regAlert).toBeDefined();
    expect(regAlert?.classification).toBe('action_required');
    expect(regAlert?.actionLabel).toBe('Register Squad');
    expect(regAlert?.actionType).toBe('squad_registration');
  });

  it('treats U21 players as automatically exempt from 25-man senior registration', () => {
    const u21Player: CareerPlayer = {
      id: 'wonderkid_1',
      name: 'Youth Star',
      position: 'CAM',
      rating: 77,
      potential: 88,
      age: 19, // U21
      value: 12_000_000,
      wage: 20_000,
      contractYears: 4,
      injured: false,
      fitness: 100,
      morale: 85,
      form: 7.2,
      appearances: 5,
      goals: 2,
      assists: 1,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
    };

    const registeredSeniorIds = ['senior_1', 'senior_2'];
    // U21 player is ALWAYS registered for matches regardless of registeredSeniorIds list
    expect(isPlayerRegisteredForMatch(u21Player, [u21Player], registeredSeniorIds)).toBe(true);
  });

  it('filters market pool by league, club, nationality, and sort by valuation', () => {
    const market = getScoutingMarketPool(
      save.squad,
      {
        playerPoolType: 'all',
        sortBy: 'value_desc',
      },
      '2026/27',
      2026
    );

    expect(market.length).toBeGreaterThan(0);
    // Ensure sorted descending by value
    for (let i = 0; i < Math.min(10, market.length - 1); i++) {
      expect(market[i].value).toBeGreaterThanOrEqual(market[i + 1].value);
    }

    // Filter by nationality: Spain
    const spanishMarket = getScoutingMarketPool(
      save.squad,
      {
        playerPoolType: 'all',
        nationality: 'Spain',
      },
      '2026/27',
      2026
    );
    expect(spanishMarket.every((p) => p.nationality === 'Spain')).toBe(true);

    // Filter by specific position: GK
    const gkMarket = getScoutingMarketPool(
      save.squad,
      {
        playerPoolType: 'all',
        specificPosition: 'GK',
      },
      '2026/27',
      2026
    );
    expect(gkMarket.every((p) => p.position === 'GK')).toBe(true);
  });
});

