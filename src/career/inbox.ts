import {
  CareerSaveFile,
  ManagerMessage,
  MessageClassification,
  CareerPlayer,
  ActionType,
} from './types';
import { getEffectiveClubName } from './clubs';
import { formatCareerCurrency } from './formatters';
import { isTransferDeadlineDay } from './transfers';

export interface ManagerialAlert {
  id: string;
  messageId?: string;
  title: string;
  description: string;
  classification: MessageClassification;
  actionLabel: string;
  actionTab: 'overview' | 'squad' | 'transfers' | 'cups' | 'fixtures' | 'table' | 'settings';
  actionType: ActionType;
  targetId?: string;
  isResolved: boolean;
  date: string;
  badgeText?: string;
}

/**
 * Returns dynamic, football-accurate classification and resolution status for an inbox message
 * based on actual game state (e.g. pending bids, squad fitness, contract expiries, calendar date).
 */
export function classifyInboxMessage(
  message: ManagerMessage,
  save: CareerSaveFile
): {
  classification: MessageClassification;
  isResolved: boolean;
  effectiveActionLabel: string;
  effectiveActionTab: ManagerMessage['actionTab'];
  effectiveActionType?: ManagerMessage['actionType'];
  targetId?: string;
} {
  const starterIds = new Set(save.lineup?.starterIds || []);
  const squad = save.squad || [];
  const currentDate = save.season.currentDate || '2026-07-01';
  const seasonStart = `${save.season.yearStart || 2026}-07-01`;

  // 1. Initial Welcome / Board message
  if (message.id === 'msg_welcome_board' || message.subject.includes('Welcome to')) {
    // Welcome message is only urgent/important during the first 7 days of the season
    const isFirstWeek = currentDate <= `${save.season.yearStart || 2026}-07-07`;
    return {
      classification: isFirstWeek ? 'important' : 'info',
      isResolved: !isFirstWeek || message.isRead,
      effectiveActionLabel: 'Review Vision & Rules',
      effectiveActionTab: 'settings',
      effectiveActionType: 'respond_board',
    };
  }

  // 2. Incoming transfer offers / bids
  if (message.type === 'transfer') {
    const pendingOffers = (save.incomingOffers || []).filter((o) => o.status === 'pending');
    
    // If message targets a specific offer
    if (message.targetId) {
      const targetOffer = (save.incomingOffers || []).find((o) => o.id === message.targetId);
      if (targetOffer) {
        const isPending = targetOffer.status === 'pending';
        return {
          classification: isPending ? 'action_required' : 'info',
          isResolved: !isPending,
          effectiveActionLabel: isPending ? 'Review Offer' : 'Offer Concluded',
          effectiveActionTab: 'transfers',
          effectiveActionType: 'review_offer',
          targetId: targetOffer.id,
        };
      }
    }

    // If message is a bid notification with pending offers in the save
    if (message.subject.toLowerCase().includes('bid') || message.subject.toLowerCase().includes('offer')) {
      const hasPending = pendingOffers.length > 0;
      return {
        classification: hasPending ? 'action_required' : 'info',
        isResolved: !hasPending,
        effectiveActionLabel: hasPending ? 'Review Offer' : 'View Transfers',
        effectiveActionTab: 'transfers',
        effectiveActionType: hasPending ? 'review_offer' : 'open_transfers',
        targetId: pendingOffers[0]?.id,
      };
    }

    // General scouting or window announcements
    return {
      classification: 'info',
      isResolved: true,
      effectiveActionLabel: message.actionLabel || 'Open Transfer Market',
      effectiveActionTab: message.actionTab || 'transfers',
      effectiveActionType: 'open_transfers',
    };
  }

  // 3. Medical / Injury Reports
  if (message.type === 'injury') {
    // Check if a specific player was targeted
    let targetPlayer: CareerPlayer | undefined;
    if (message.targetId) {
      targetPlayer = squad.find((p) => p.id === message.targetId);
    } else {
      // Find player by name in subject
      targetPlayer = squad.find((p) => message.subject.includes(p.name));
    }

    if (targetPlayer) {
      if (targetPlayer.injured) {
        const isStarter = starterIds.has(targetPlayer.id);
        return {
          classification: isStarter ? 'action_required' : 'important',
          isResolved: false,
          effectiveActionLabel: isStarter ? 'Adjust Lineup' : 'Review Injury',
          effectiveActionTab: 'squad',
          effectiveActionType: isStarter ? 'open_squad' : 'review_injury',
          targetId: targetPlayer.id,
        };
      } else {
        // Player has recovered
        return {
          classification: 'info',
          isResolved: true,
          effectiveActionLabel: 'Inspect Fitness',
          effectiveActionTab: 'squad',
          effectiveActionType: 'open_squad',
          targetId: targetPlayer.id,
        };
      }
    }

    // Check if any starting player is currently injured
    const injuredStarters = squad.filter((p) => p.injured && starterIds.has(p.id));
    if (injuredStarters.length > 0) {
      return {
        classification: 'action_required',
        isResolved: false,
        effectiveActionLabel: 'Adjust Lineup',
        effectiveActionTab: 'squad',
        effectiveActionType: 'open_squad',
        targetId: injuredStarters[0].id,
      };
    }

    const anyInjured = squad.some((p) => p.injured);
    return {
      classification: anyInjured ? 'important' : 'info',
      isResolved: !anyInjured,
      effectiveActionLabel: 'Inspect Squad Fitness',
      effectiveActionTab: 'squad',
      effectiveActionType: 'open_squad',
    };
  }

  // 4. Board of Directors
  if (message.type === 'board') {
    const isCritical = (save.boardStatus?.confidence ?? 100) < 45;
    return {
      classification: isCritical ? 'action_required' : message.priority === 'urgent' ? 'important' : 'info',
      isResolved: !isCritical,
      effectiveActionLabel: message.actionLabel || 'Respond to Board',
      effectiveActionTab: message.actionTab || 'overview',
      effectiveActionType: 'respond_board',
    };
  }

  // 5. Cup Draws & Competitions
  if (message.type === 'cup_draw') {
    return {
      classification: 'important',
      isResolved: true,
      effectiveActionLabel: message.actionLabel || 'View Cup Draw',
      effectiveActionTab: message.actionTab || 'cups',
      effectiveActionType: 'view_cup_draw',
    };
  }

  // Default fallback
  const isUrgent = message.priority === 'urgent';
  return {
    classification: isUrgent ? 'important' : 'info',
    isResolved: message.resolved ?? message.isRead,
    effectiveActionLabel: message.actionLabel || 'View Details',
    effectiveActionTab: message.actionTab || 'overview',
  };
}

/**
 * Returns prioritized list of live, actionable managerial alerts based on true game state.
 * Never displays "All Clear" when there are pending bids, injured starters, deadline clocks, or critical board ultimatums.
 */
export function getManagerialAlerts(save: CareerSaveFile): ManagerialAlert[] {
  const alerts: ManagerialAlert[] = [];
  const squad = save.squad || [];
  const starterIds = new Set(save.lineup?.starterIds || []);
  const currentDate = save.season.currentDate || '2026-07-01';
  const yearStart = save.season.yearStart || 2026;

  // 1. Pending Incoming Transfer Offers (Action Required)
  const pendingOffers = (save.incomingOffers || []).filter((o) => o.status === 'pending');
  for (const offer of pendingOffers) {
    alerts.push({
      id: `alert_bid_${offer.id}`,
      title: `Incoming Bid: ${offer.buyingClubName}`,
      description: `Offered ${formatCareerCurrency(offer.offeredFee, save.settings.currency)} for ${offer.playerName}. Decision required.`,
      classification: 'action_required',
      actionLabel: 'Review Offer',
      actionTab: 'transfers',
      actionType: 'review_offer',
      targetId: offer.id,
      isResolved: false,
      date: offer.date || currentDate,
      badgeText: 'Pending Bid',
    });
  }

  // 2. Starting XI Injuries (Action Required: Lineup adjustment needed)
  const injuredStarters = squad.filter((p) => p.injured && starterIds.has(p.id));
  for (const player of injuredStarters) {
    alerts.push({
      id: `alert_inj_starter_${player.id}`,
      title: `Lineup Alert: ${player.name} Injured`,
      description: `Starter ${player.name} (${player.position}) is sidelined (${player.injuryDescription || 'Injured'}, ${player.injuryWeeks || 1}w). Swap before next match.`,
      classification: 'action_required',
      actionLabel: 'Adjust Lineup',
      actionTab: 'squad',
      actionType: 'open_squad',
      targetId: player.id,
      isResolved: false,
      date: currentDate,
      badgeText: 'Lineup Void',
    });
  }

  // 3. Squad Registration Alert (Action Required when seniors > 25)
  const seniorPlayers = squad.filter((p) => p.age > 21);
  if (seniorPlayers.length > 25) {
    alerts.push({
      id: 'alert_squad_registration',
      title: `Squad Registration: ${seniorPlayers.length} Senior Players`,
      description: `Senior squad exceeds 25-man Premier League limit by ${seniorPlayers.length - 25}. Register your 25 senior players for league fixtures.`,
      classification: 'action_required',
      actionLabel: 'Register Squad',
      actionTab: 'squad',
      actionType: 'squad_registration',
      isResolved: false,
      date: currentDate,
      badgeText: `${seniorPlayers.length}/25 Seniors`,
    });
  }

  // 4. Transfer Deadline Day Clock Active (Action Required)
  const isDeadline =
    save.deadlineDayState?.isActive ||
    isTransferDeadlineDay(currentDate, yearStart);
  if (isDeadline && save.deadlineDayState?.phase !== 'closed') {
    alerts.push({
      id: 'alert_deadline_clock',
      title: `Deadline Day (${save.deadlineDayState?.phase?.toUpperCase() || 'LIVE'})`,
      description: `Window shuts tonight at 23:00 BST (${save.deadlineDayState?.hoursRemaining ?? 14}h left). Complete urgent signings and outgoing deals.`,
      classification: 'action_required',
      actionLabel: 'Deadline Clock',
      actionTab: 'overview',
      actionType: 'deadline_clock',
      isResolved: false,
      date: currentDate,
      badgeText: '23:00 BST',
    });
  }

  // 4. Critical Board Confidence / Ultimatums (Action Required)
  const boardConfidence = save.boardStatus?.confidence ?? 100;
  if (boardConfidence < 45) {
    alerts.push({
      id: 'alert_board_pressure',
      title: `Board Scrutiny (${boardConfidence}%)`,
      description: `Managerial status: ${save.boardStatus?.status?.toUpperCase() || 'CRITICAL'}. Urgent turnaround in performances or vision alignment needed.`,
      classification: 'action_required',
      actionLabel: 'Respond to Board',
      actionTab: 'overview',
      actionType: 'respond_board',
      isResolved: false,
      date: currentDate,
      badgeText: 'Under Pressure',
    });
  }

  // 5. Expiring Contracts on Key Squad Members (Important)
  const expiringKeyPlayers = squad.filter(
    (p) => (p.contractYears ?? 2) <= 1 && (p.rating >= 78 || p.value >= 12_000_000)
  );
  for (const player of expiringKeyPlayers.slice(0, 2)) {
    alerts.push({
      id: `alert_contract_${player.id}`,
      title: `Expiring Contract: ${player.name}`,
      description: `${player.name} has only ${player.contractYears} year left on contract. Risk of free departure at end of campaign.`,
      classification: 'important',
      actionLabel: 'Review Contract',
      actionTab: 'transfers',
      actionType: 'review_contract',
      targetId: player.id,
      isResolved: false,
      date: currentDate,
      badgeText: '1 Year Left',
    });
  }

  // 6. Bench/Reserve Injuries (Important)
  const injuredReserves = squad.filter((p) => p.injured && !starterIds.has(p.id));
  if (injuredReserves.length > 0 && injuredStarters.length === 0) {
    const firstInjured = injuredReserves[0];
    alerts.push({
      id: `alert_inj_reserve_${firstInjured.id}`,
      title: `Medical Room: ${injuredReserves.length} Player${injuredReserves.length > 1 ? 's' : ''} Sidelined`,
      description: `${firstInjured.name} (${firstInjured.position}, ${firstInjured.injuryDescription || 'Out'}, ${firstInjured.injuryWeeks || 1}w) under physio care.`,
      classification: 'important',
      actionLabel: 'Review Injury',
      actionTab: 'squad',
      actionType: 'review_injury',
      targetId: firstInjured.id,
      isResolved: false,
      date: currentDate,
      badgeText: `${injuredReserves.length} Injured`,
    });
  }

  // 7. Cup Draws scheduled and ready (Important)
  if (save.cups) {
    for (const [cId, cup] of Object.entries(save.cups)) {
      if (!cup.drawCompleted && cup.drawDate && currentDate >= cup.drawDate) {
        alerts.push({
          id: `alert_cup_draw_${cId}`,
          title: `${cup.name} Draw Live`,
          description: `Qualifying round complete. Fixtures awaiting draw on the tournament desk.`,
          classification: 'important',
          actionLabel: 'View Cup Draw',
          actionTab: 'cups',
          actionType: 'view_cup_draw',
          targetId: cId,
          isResolved: false,
          date: cup.drawDate,
          badgeText: 'Draw Live',
        });
        break; // Show at most 1 cup draw alert to avoid cluttering
      }
    }
  }

  // Sort alerts: Action Required first, then Important
  alerts.sort((a, b) => {
    if (a.classification === 'action_required' && b.classification !== 'action_required') return -1;
    if (b.classification === 'action_required' && a.classification !== 'action_required') return 1;
    return 0;
  });

  return alerts;
}

export function getInitialInboxMessages(save: CareerSaveFile): ManagerMessage[] {
  const clubName = getEffectiveClubName(save.club);
  const managerName = save.manager.name;
  const date = save.season.currentDate || '2026-07-01';

  return [
    {
      id: 'msg_welcome_board',
      date,
      sender: 'Board of Directors',
      senderRole: 'Club Executive Committee',
      subject: `Welcome to ${clubName} - Managerial Contract Confirmed`,
      body: `Dear ${managerName},\n\nThe Board is delighted to welcome you as our new first-team manager. We have approved a starting transfer budget of ${formatCareerCurrency(save.finances.transferBudget, save.settings.currency)}. The supporters have high expectations for the coming campaign. Good luck!`,
      type: 'board',
      isRead: false,
      priority: 'urgent',
      classification: 'important',
      resolved: false,
      actionLabel: 'Review Club Vision & Rules',
      actionTab: 'settings',
      actionType: 'respond_board',
    },
    {
      id: 'msg_physio_preseason',
      date,
      sender: 'Dr. Marcus Vance',
      senderRole: 'Head of Sports Science & Medicine',
      subject: 'Medical Room & Squad Physical Baseline Report',
      body: `Boss,\n\nThe senior squad has completed physical screenings. Current overall fitness stands at 100%. We will monitor fatigue levels during matches. Should any player suffer muscular or contact injuries, our medical staff will notify you immediately with expected recovery timelines.`,
      type: 'injury',
      isRead: false,
      priority: 'normal',
      classification: 'info',
      resolved: true,
      actionLabel: 'Inspect Squad Fitness',
      actionTab: 'squad',
      actionType: 'open_squad',
    },
    {
      id: 'msg_scout_window',
      date,
      sender: 'David Gallagher',
      senderRole: 'Chief Scout',
      subject: 'Summer Transfer Window Scouting Intel',
      body: `Boss,\n\nThe summer transfer window is officially open. We have prepared market intelligence on domestic talent and elite international players. Our scouting database allows filtering by position, age, rating, and value. Let us know when you wish to lodge incoming bids.`,
      type: 'transfer',
      isRead: false,
      priority: 'normal',
      classification: 'info',
      resolved: true,
      actionLabel: 'Open Transfer Market',
      actionTab: 'transfers',
      actionType: 'open_transfers',
    },
    {
      id: 'msg_fa_cups',
      date,
      sender: 'Competitions Committee',
      senderRole: 'Football Association & UEFA',
      subject: 'Season Fixtures & Tournament Draws Confirmed',
      body: `The official calendar for Season ${save.season.seasonNumber} has been sanctioned. In addition to the 38-game league campaign, your club will compete in the domestic cup competitions (League Cup & The English Cup) as well as European tournament action. All dates are synchronized on your management desk.`,
      type: 'cup_draw',
      isRead: false,
      priority: 'normal',
      classification: 'info',
      resolved: true,
      actionLabel: 'Inspect Cups & Europe',
      actionTab: 'cups',
      actionType: 'view_cup_draw',
    },
  ];
}

export function addInboxMessage(
  save: CareerSaveFile,
  msg: Omit<ManagerMessage, 'id'>
): CareerSaveFile {
  const newMsg: ManagerMessage = {
    ...msg,
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  };

  const existing = save.inbox || [];
  return {
    ...save,
    inbox: [newMsg, ...existing],
  };
}

export function markMessageRead(
  save: CareerSaveFile,
  messageId: string
): CareerSaveFile {
  const existing = save.inbox || [];
  return {
    ...save,
    inbox: existing.map((m) => (m.id === messageId ? { ...m, isRead: true } : m)),
  };
}

export function markMessageResolved(
  save: CareerSaveFile,
  messageId: string,
  resolved: boolean = true
): CareerSaveFile {
  const existing = save.inbox || [];
  return {
    ...save,
    inbox: existing.map((m) => (m.id === messageId ? { ...m, resolved } : m)),
  };
}

export function markAllMessagesRead(save: CareerSaveFile): CareerSaveFile {
  const existing = save.inbox || [];
  return {
    ...save,
    inbox: existing.map((m) => ({ ...m, isRead: true })),
  };
}
