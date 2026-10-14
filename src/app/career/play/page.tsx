'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadCareerSave, saveCareerSave, exportCareerSaveAsJson, isValidSlotId, ValidSlotId } from '../../../career/saves';
import {
  CareerSaveFile,
  CareerSettings,
  LeagueFixture,
  Club,
  DateFormatPreference,
  CurrencyPreference,
  WageUnitPreference,
  HeightUnitPreference,
  WeightUnitPreference,
  NumberFormatPreference,
  CupFixture,
  CupTournament,
  ManagerMessage,
  MarketPlayer,
  CareerPlayer,
  ActionType,
} from '../../../career/types';
import { getEffectiveClubName, getAllClubs, getClubsWithUserClub } from '../../../career/clubs';
import { validateSettings } from '../../../career/settings';
import {
  formatCareerDate,
  formatCareerCurrency,
  formatCareerWage,
} from '../../../career/formatters';
import { getSavedTheme, saveTheme } from '../../../utils/storage';
import { SquadManagement } from '../../../components/career/SquadManagement';
import { FixturesCalendar } from '../../../components/career/FixturesCalendar';
import { LeagueTable } from '../../../components/career/LeagueTable';
import { TournamentsHub } from '../../../components/career/TournamentsHub';
import { TransferHub } from '../../../components/career/TransferHub';
import { MatchDayModal } from '../../../components/career/MatchDayModal';
import { MatchOverviewModal } from '../../../components/career/MatchOverviewModal';
import { PlayerComparisonModal } from '../../../components/career/PlayerComparisonModal';
import { SquadRegistrationModal } from '../../../components/career/SquadRegistrationModal';
import { isSeasonComplete, advanceToNextSeason, getSeasonReviewSummary, SeasonReviewSummary } from '../../../career/seasons';
import { getNextClubFixture, getNextScheduledMatch, getPreviousPlayedMatch, isDateInInternationalBreak, ScheduledMatch } from '../../../career/calendar';
import { simulateMatchFixture, advanceTimeSkip, TimeSkipTarget } from '../../../career/sim';
import {
  CUP_IDS,
  findAnyClub,
  simulateKnockoutCupFixture,
  advanceCupTournament,
  simulateAiFixturesInCupRound,
  autoResolvePendingCupFixtures,
} from '../../../career/cups';

import {
  markMessageRead,
  markAllMessagesRead,
  getInitialInboxMessages,
  classifyInboxMessage,
  getManagerialAlerts,
  markMessageResolved,
} from '../../../career/inbox';
import { calculateStandings } from '../../../career/table';
import { formatCurrency } from '../../../career/finance';
import { getSeniorPlayerCount, getSquadOrderedByLineup } from '../../../career/squad';
import {
  evaluateBoardConfidence,
  isTransferDeadlineDay,
  initializeDeadlineDay,
  advanceDeadlineDayPhase,
  getScoutingMarketPool,
} from '../../../career/transfers';
import { updatePlayerForm, applyInSeasonMatchProgression } from '../../../career/formAndProgression';

function CareerPlayHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawSlot = searchParams.get('slot') || 'slot_1';
  const slotId: ValidSlotId = isValidSlotId(rawSlot) ? rawSlot : 'slot_1';

  const [save, setSave] = useState<CareerSaveFile | null>(() => {
    if (typeof window !== 'undefined') {
      return loadCareerSave(slotId);
    }
    return null;
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getSavedTheme());
  const [activeTab, setActiveTab] = useState<'overview' | 'squad' | 'fixtures' | 'table' | 'cups' | 'transfers' | 'settings'>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dismissedSackedModal, setDismissedSackedModal] = useState(false);
  const [activeMatchFixture, setActiveMatchFixture] = useState<LeagueFixture | CupFixture | null>(null);
  const [matchOverviewModal, setMatchOverviewModal] = useState<{
    type: 'result' | 'preview';
    fixture: LeagueFixture | CupFixture;
  } | null>(null);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'action_required' | 'unread' | 'board' | 'injury' | 'transfer' | 'cup_draw'>('all');
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [pendingFastForward, setPendingFastForward] = useState<TimeSkipTarget | null>(null);
  const [fastForwardUsePreferredEleven, setFastForwardUsePreferredEleven] = useState(true);
  const [showSeasonReviewModal, setShowSeasonReviewModal] = useState(false);
  const [transferHubSubTab, setTransferHubSubTab] = useState<'market' | 'incoming' | 'contracts' | 'shortlist' | 'history' | 'board'>('market');
  const [focusedOfferId, setFocusedOfferId] = useState<string | undefined>(undefined);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Reusable Player Comparison state
  const [comparisonState, setComparisonState] = useState<{
    isOpen: boolean;
    playerA?: CareerPlayer | MarketPlayer;
    playerB?: CareerPlayer | MarketPlayer;
  }>({ isOpen: false });

  // Squad 25-man registration modal state
  const [showRegistrationModal, setShowRegistrationModal] = useState<boolean>(false);

  // Full market and shortlisted pools for comparison modal
  const fullMarketPool = useMemo(() => {
    if (!save) return [];
    const dbSeason = save.settings?.databaseSeason || save.season?.databaseSeason || '2026/27';
    return getScoutingMarketPool(save.squad, { playerPoolType: 'all', sortBy: 'value_desc' }, dbSeason, save.season?.yearStart || 2026);
  }, [save?.squad, save?.settings?.databaseSeason, save?.season?.databaseSeason, save?.season?.yearStart]);

  const shortlistedPool = useMemo(() => {
    if (!save?.shortlistPlayerIds || save.shortlistPlayerIds.length === 0) return [];
    const set = new Set(save.shortlistPlayerIds);
    return fullMarketPool.filter((p) => set.has(p.id));
  }, [save?.shortlistPlayerIds, fullMarketPool]);

  // Managerial alerts & Inbox derived states
  const allInbox = useMemo(() => {
    if (!save) return [];
    return save.inbox && save.inbox.length > 0 ? save.inbox : getInitialInboxMessages(save);
  }, [save]);

  const managerialAlerts = useMemo(() => {
    if (!save) return [];
    return getManagerialAlerts(save);
  }, [save]);

  const actionableAlerts = useMemo(() => {
    return managerialAlerts.filter((a) => a.classification === 'action_required');
  }, [managerialAlerts]);

  const handleExecuteAlertAction = (alert: {
    actionTab?: string;
    actionType?: ActionType;
    targetId?: string;
  }) => {
    if (alert.actionType === 'squad_registration') {
      setShowRegistrationModal(true);
    } else if (alert.actionType === 'review_offer') {
      setTransferHubSubTab('incoming');
      setFocusedOfferId(alert.targetId || (save?.incomingOffers && save.incomingOffers.length > 0 ? save.incomingOffers[0].id : undefined));
      setActiveTab('transfers');
    } else if (alert.actionType === 'review_contract') {
      setTransferHubSubTab('contracts');
      setFocusedOfferId(undefined);
      setActiveTab('transfers');
    } else if (alert.actionType === 'deadline_clock') {
      setTransferHubSubTab('market');
      setFocusedOfferId(undefined);
      setActiveTab('transfers');
    } else if (alert.actionType === 'open_squad' || alert.actionType === 'review_injury') {
      setActiveTab('squad');
    } else if (alert.actionType === 'view_cup_draw') {
      setActiveTab('cups');
    } else if (alert.actionType === 'respond_board') {
      setTransferHubSubTab('board');
      setActiveTab('transfers');
    } else if (alert.actionTab) {
      if (alert.actionTab === 'transfers') {
        setTransferHubSubTab('market');
      }
      setActiveTab(alert.actionTab as typeof activeTab);
    }
  };

  const handleSwapLineup = (starterId: string, benchId: string) => {
    if (!save || !save.lineup) return;
    const starterIdx = save.lineup.starterIds.indexOf(starterId);
    const benchIdx = save.lineup.benchIds.indexOf(benchId);
    if (starterIdx !== -1 && benchIdx !== -1) {
      const nextStarters = [...save.lineup.starterIds];
      const nextBench = [...save.lineup.benchIds];
      nextStarters[starterIdx] = benchId;
      nextBench[benchIdx] = starterId;
      const updatedSave: CareerSaveFile = {
        ...save,
        lineup: {
          ...save.lineup,
          formation: save.lineup.formation || '4-3-3',
          starterIds: nextStarters,
          benchIds: nextBench,
        },
      };
      handleUpdateSave(updatedSave);
      showToast('Lineup updated successfully.');
    } else {
      showToast('Players must be in starting XI and bench to swap.');
    }
  };

  const navigateToIncomingOffers = (specificOfferId?: string) => {
    setTransferHubSubTab('incoming');
    setFocusedOfferId(specificOfferId || (save?.incomingOffers && save.incomingOffers.length > 0 ? save.incomingOffers[0].id : undefined));
    setActiveTab('transfers');
  };

  // Settings editing state (when not locked)
  const [editableSettings, setEditableSettings] = useState<CareerSettings | null>(() => {
    if (typeof window !== 'undefined') {
      const loaded = loadCareerSave(slotId);
      return loaded?.settings || null;
    }
    return null;
  });
  const [editingClubName, setEditingClubName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const loaded = loadCareerSave(slotId);
      return loaded?.club.customName || loaded?.club.defaultName || '';
    }
    return '';
  });

  const [currentSlotId, setCurrentSlotId] = useState(slotId);
  if (currentSlotId !== slotId) {
    setCurrentSlotId(slotId);
    const loaded = loadCareerSave(slotId);
    setSave(loaded);
    setEditableSettings(loaded?.settings || null);
    setEditingClubName(loaded?.club.customName || loaded?.club.defaultName || '');
  }

  useEffect(() => {
    saveTheme(getSavedTheme());

    // Auto-resolve any pending cup ties whose scheduled date has arrived
    if (save && save.cups) {
      const { updatedCups, trophiesAwarded } = autoResolvePendingCupFixtures(
        save.cups,
        save.season.currentDate,
        save.season.yearStart,
        save.club.id
      );

      let hasChanges = trophiesAwarded.length > 0;
      if (!hasChanges) {
        for (const [k, v] of Object.entries(updatedCups)) {
          const oldV = save.cups[k];
          if (!oldV || oldV.currentRound !== v.currentRound || oldV.fixtures.some((f, idx) => f.played !== v.fixtures[idx]?.played)) {
            hasChanges = true;
            break;
          }
        }
      }

      if (hasChanges) {
        const trophies = [...(save.trophies || [])];
        const finances = { ...save.finances };
        const nextYearStart = save.season.yearStart + 1;

        for (const aw of trophiesAwarded) {
          if (!trophies.some((t) => t.competitionId === aw.id && t.year === nextYearStart)) {
            trophies.push({
              competitionId: aw.id,
              competitionName: aw.name,
              year: nextYearStart,
            });
            const prize = updatedCups[aw.id]?.prizeMoney || 0;
            finances.transferBudget += prize;
            finances.balance += prize;
          }
        }

        const updatedSave: CareerSaveFile = {
          ...save,
          cups: updatedCups,
          trophies,
          finances,
        };
        saveCareerSave(updatedSave);
        setSave(updatedSave);
      }
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    saveTheme(next);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExport = () => {
    const json = exportCareerSaveAsJson(slotId);
    if (!json) return;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my11_career_${slotId}_backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Save backup exported successfully.');
  };

  const handleSaveSettings = () => {
    if (!save || !editableSettings) return;

    const updatedSettings: CareerSettings = {
      ...(save.settings.locked ? save.settings : validateSettings(editableSettings)),
      dateFormat: editableSettings.dateFormat || 'uk',
      currency: editableSettings.currency || 'GBP',
      wageUnit: editableSettings.wageUnit || 'weekly',
      heightUnit: editableSettings.heightUnit || 'ft_in',
      weightUnit: editableSettings.weightUnit || 'kg',
      numberFormat: editableSettings.numberFormat || 'comma',
    };

    const updated: CareerSaveFile = {
      ...save,
      club: {
        ...save.club,
        customName: editingClubName.trim() || undefined,
      },
      settings: updatedSettings,
    };

    saveCareerSave(updated);
    setSave(updated);
    setEditableSettings(updatedSettings);
    showToast('Settings saved successfully.');
  };

  const handleUpdateSave = (updated: CareerSaveFile) => {
    saveCareerSave(updated);
    setSave(updated);
    setEditableSettings(updated.settings);
    setEditingClubName(updated.club.customName || updated.club.defaultName);
  };

  const allClubs = getClubsWithUserClub(save?.club);
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));
  const nextScheduled = save ? getNextScheduledMatch(save) : null;
  const nextFixture = nextScheduled ? nextScheduled.fixture : null;
  const prevScheduled = save ? getPreviousPlayedMatch(save) : null;
  const intlBreakStatus = save ? isDateInInternationalBreak(save.season.currentDate) : { isActive: false, name: '', resumeDate: '' };
  const seasonCompleted = save ? isSeasonComplete(save.fixtures, save.club.id) : false;
  const seasonSummary = save && seasonCompleted ? getSeasonReviewSummary(save) : null;

  const handleAdvanceDeadlinePhase = () => {
    if (!save) return;
    let cur = save;
    if (!cur.deadlineDayState?.isActive) {
      cur = initializeDeadlineDay(cur);
    }
    const res = advanceDeadlineDayPhase(cur);
    handleUpdateSave(res.updatedSave);
    if (res.summary) {
      showToast(res.summary);
    }
  };

  const getFastForwardDetails = (target: TimeSkipTarget) => {
    switch (target) {
      case 'next_match': {
        const targetDate = nextScheduled ? formatCareerDate(nextScheduled.fixture.date, save?.settings.dateFormat || 'uk', 'long') : 'Next Scheduled Match';
        return {
          title: 'Advance to Next Match',
          badge: '⏭️ Next Match',
          targetDate,
          description: `Automatically simulates all other fixtures in the calendar until your next scheduled matchday (${targetDate}). You will be brought to the dressing room ready for kickoff.`,
        };
      }
      case 'next_week': {
        return {
          title: 'Fast Forward +7 Days',
          badge: '📅 +7 Days',
          targetDate: '1 Week Forward',
          description: 'Advances the game calendar by 7 days, simulating all league fixtures that fall within this window and recalculating the table standings.',
        };
      }
      case 'next_month': {
        return {
          title: 'Fast Forward +1 Month',
          badge: '🗓️ +1 Month',
          targetDate: '30 Days Forward',
          description: 'Simulates approximately 30 calendar days of fixtures. Several matchday rounds will be played across the league. Check your squad fitness before proceeding.',
        };
      }
      case 'transfer_deadline': {
        return {
          title: 'Advance to Deadline Day',
          badge: '⏳ Deadline Day',
          targetDate: '1 Sep / 1 Feb',
          description: 'Simulates until the critical transfer window deadline day, allowing you to review last-minute transfer offers and finalize signings.',
        };
      }
      case 'season_end': {
        return {
          title: 'Simulate to Season End',
          badge: '🏁 Season End',
          targetDate: 'Round 38 (Finale)',
          description: `Fast forwards all remaining league matches to conclude Season ${save?.season.seasonNumber || 1}. Final standings, awards, and board review will be finalized.`,
        };
      }
    }
  };

  const handlePlayNextMatchInstant = () => {
    if (!save || !nextScheduled) return;
    setSimulating(true);

    const isUserHome = nextScheduled.fixture.homeClubId === save.club.id;
    const isUserAway = nextScheduled.fixture.awayClubId === save.club.id;

    // Use preferred starting 11 by ordering squad according to lineup starter slots
    const activeSquad = (save.lineup && save.lineup.starterIds && save.lineup.starterIds.length > 0)
      ? getSquadOrderedByLineup(save.squad, save.lineup)
      : save.squad;

    if (nextScheduled.isCup && nextScheduled.cupId && save.cups && save.cups[nextScheduled.cupId]) {
      const cupTourney = save.cups[nextScheduled.cupId];
      const cupFix = nextScheduled.fixture as CupFixture;
      const homeClub = findAnyClub(cupFix.homeClubId) || allClubs[0];
      const awayClub = findAnyClub(cupFix.awayClubId) || allClubs[1];

      const simmed = simulateKnockoutCupFixture(
        cupFix,
        homeClub,
        awayClub,
        isUserHome ? activeSquad : undefined,
        isUserAway ? activeSquad : undefined
      );

      const updatedFixtures = cupTourney.fixtures.map((f) => (f.id === simmed.id ? simmed : f));
      let updatedTourney: CupTournament = {
        ...cupTourney,
        fixtures: updatedFixtures,
      };

      updatedTourney = simulateAiFixturesInCupRound(updatedTourney, cupFix.roundName, save.club.id);
      const adv = advanceCupTournament(updatedTourney, save.season.yearStart);
      updatedTourney = adv.updatedTournament;

      const updatedCups = {
        ...save.cups,
        [nextScheduled.cupId]: updatedTourney,
      };

      const trophies = [...(save.trophies || [])];
      const finances = { ...save.finances };

      if (adv.updatedTournament.isCompleted && adv.updatedTournament.winnerClubId === save.club.id) {
        const trophyYear = save.season.yearStart + 1;
        if (!trophies.some((t) => t.competitionId === nextScheduled.cupId && t.year === trophyYear)) {
          trophies.push({
            competitionId: nextScheduled.cupId,
            competitionName: adv.updatedTournament.name,
            year: trophyYear,
          });
          finances.transferBudget += adv.updatedTournament.prizeMoney;
          finances.balance += adv.updatedTournament.prizeMoney;
        }
      }

      // Update player form and youth development based on cup match result
      const userGoals = isUserHome ? simmed.homeScore! : simmed.awayScore!;
      const oppGoals = isUserHome ? simmed.awayScore! : simmed.homeScore!;
      const won = userGoals > oppGoals;
      const drew = userGoals === oppGoals;
      const starterIds = new Set(activeSquad.slice(0, 11).map((p) => p.id));

      const updatedSquad = save.squad.map((player) => {
        const isStarter = starterIds.has(player.id);
        const baseRating = won ? 7.5 : drew ? 6.8 : 6.2;
        const matchRating = Number((baseRating + (Math.random() * 1.0 - 0.3)).toFixed(1));
        const withForm = updatePlayerForm(player, matchRating);
        const prog = applyInSeasonMatchProgression(withForm, isStarter ? 90 : 20, matchRating);
        return prog.updatedPlayer;
      });

      const updatedSave: CareerSaveFile = {
        ...save,
        season: {
          ...save.season,
          currentDate: cupFix.date > save.season.currentDate ? cupFix.date : save.season.currentDate,
        },
        cups: updatedCups,
        trophies,
        finances,
        squad: updatedSquad,
      };

      saveCareerSave(updatedSave);
      setSave(updatedSave);
      setSimulating(false);

      const userWon = isUserHome
        ? (simmed.homeScore! > simmed.awayScore! || (simmed.penalties ? simmed.penalties.homePenalties > simmed.penalties.awayPenalties : false))
        : (simmed.awayScore! > simmed.homeScore! || (simmed.penalties ? simmed.penalties.awayPenalties > simmed.penalties.homePenalties : false));

      const pensText = simmed.penalties ? ` (${simmed.penalties.homePenalties} - ${simmed.penalties.awayPenalties} pens)` : '';
      showToast(`${nextScheduled.cupName} ${nextScheduled.roundName}: ${simmed.homeScore} - ${simmed.awayScore}${pensText} (${userWon ? 'Victory!' : 'Eliminated'})`);
      return;
    }

    // League Match Simulation
    const leagueFix = nextScheduled.fixture as LeagueFixture;
    const homeClub = clubsMap.get(leagueFix.homeClubId) || allClubs[0];
    const awayClub = clubsMap.get(leagueFix.awayClubId) || allClubs[1];

    const simmed = simulateMatchFixture(
      leagueFix,
      homeClub,
      awayClub,
      isUserHome ? activeSquad : undefined,
      !isUserHome ? activeSquad : undefined
    );

    const currentFixtures = save.fixtures || [];
    const updatedFixtures = currentFixtures.map((f) => {
      if (f.id === simmed.id) return simmed;
      if (f.round === leagueFix.round && !f.played) {
        const h = clubsMap.get(f.homeClubId) || allClubs[0];
        const a = clubsMap.get(f.awayClubId) || allClubs[1];
        return simulateMatchFixture(f, h, a);
      }
      return f;
    });

    const updatedStandings = calculateStandings(updatedFixtures, allClubs);

    // Update player form and youth development based on league result
    const userGoals = isUserHome ? simmed.homeScore! : simmed.awayScore!;
    const oppGoals = isUserHome ? simmed.awayScore! : simmed.homeScore!;
    const won = userGoals > oppGoals;
    const drew = userGoals === oppGoals;
    const starterIds = new Set(activeSquad.slice(0, 11).map((p) => p.id));

    const updatedSquad = save.squad.map((player) => {
      const isStarter = starterIds.has(player.id);
      const baseRating = won ? 7.5 : drew ? 6.8 : 6.2;
      const matchRating = Number((baseRating + (Math.random() * 1.0 - 0.3)).toFixed(1));
      const withForm = updatePlayerForm(player, matchRating);
      const prog = applyInSeasonMatchProgression(withForm, isStarter ? 90 : 20, matchRating);
      return prog.updatedPlayer;
    });

    const updatedSave: CareerSaveFile = {
      ...save,
      season: {
        ...save.season,
        currentDate: leagueFix.date > save.season.currentDate ? leagueFix.date : save.season.currentDate,
      },
      fixtures: updatedFixtures,
      standings: updatedStandings,
      squad: updatedSquad,
    };

    saveCareerSave(updatedSave);
    setSave(updatedSave);
    setSimulating(false);

    const userWon = isUserHome
      ? simmed.homeScore! > simmed.awayScore!
      : simmed.awayScore! > simmed.homeScore!;
    const isDraw = simmed.homeScore === simmed.awayScore;
    const resultText = userWon ? 'Victory!' : isDraw ? 'Draw' : 'Defeat';

    showToast(`Matchday ${leagueFix.round} Result: ${simmed.homeScore} - ${simmed.awayScore} (${resultText})`);
  };

  const handleSkipInternationalBreak = () => {
    if (!save) return;
    const intlBreak = isDateInInternationalBreak(save.season.currentDate);
    if (!intlBreak.isActive || !intlBreak.resumeDate) return;

    setSimulating(true);
    const updatedSquad = save.squad.map((p) => {
      if (!p.injured) return p;
      const remaining = Math.max(0, (p.injuryWeeks || 1) - 2);
      return {
        ...p,
        injured: remaining > 0,
        injuryWeeks: remaining,
        injuryDescription: remaining === 0 ? undefined : p.injuryDescription,
      };
    });

    const updatedSave: CareerSaveFile = {
      ...save,
      season: {
        ...save.season,
        currentDate: intlBreak.resumeDate,
      },
      squad: updatedSquad,
    };

    saveCareerSave(updatedSave);
    setSave(updatedSave);
    setSimulating(false);
    showToast(`Fast-forwarded past ${intlBreak.name}. Squad returned to training!`);
  };

  const handleAdvanceToNextSeasonAction = () => {
    if (!save) return;
    setSimulating(true);
    const { updatedSave } = advanceToNextSeason(save);
    saveCareerSave(updatedSave);
    setSave(updatedSave);
    setSimulating(false);
    showToast(`Welcome to Season ${updatedSave.season.seasonNumber}! Summer transfer window open.`);
  };

  const handleToggleMessageRead = (msgId: string) => {
    if (!save) return;
    const updated = markMessageRead(save, msgId);
    handleUpdateSave(updated);
    setExpandedMessageId((prev) => (prev === msgId ? null : msgId));
  };

  const handleMarkAllMessagesRead = () => {
    if (!save) return;
    const updated = markAllMessagesRead(save);
    handleUpdateSave(updated);
    showToast('All inbox messages marked as read.');
  };

  const handleTimeSkipAction = (target: TimeSkipTarget, options?: { usePreferredEleven?: boolean }) => {
    if (!save) return;
    setSimulating(true);
    const res = advanceTimeSkip(save, target, options);
    saveCareerSave(res.updatedSave);
    setSave(res.updatedSave);
    setSimulating(false);

    if (res.pausedReason) {
      showToast(res.pausedReason);
    } else {
      showToast(`Calendar advanced (${res.matchesPlayedCount} matches simulated)`);
    }
  };

  const handleMatchResultSaved = (updatedSave: CareerSaveFile) => {
    saveCareerSave(updatedSave);
    setSave(updatedSave);
    setActiveMatchFixture(null);
    showToast('Match completed and results saved!');
  };

  if (!save) {
    return (
      <div className="min-h-screen bg-slate-950 text-foreground font-sans flex flex-col pitch-bg p-6 justify-center items-center">
        <main className="w-full max-w-md bg-slate-900/80 backdrop-blur-md rounded-3xl p-8 border border-slate-800 shadow-2xl text-center space-y-6">
          <span className="text-4xl">📁</span>
          <h1 className="text-xl font-display font-black text-white uppercase tracking-tight">
            No Save Found in {slotId.replace('_', ' ').toUpperCase()}
          </h1>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            There is currently no career save loaded in this slot. You can start a new career or import a backup file.
          </p>
          <div className="pt-2 flex gap-3">
            <Link
              href="/career"
              className="flex-1 py-3 px-4 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-xs font-bold text-slate-300 font-display uppercase tracking-wider"
            >
              Save Slots
            </Link>
            <Link
              href={`/career/setup?slot=${slotId}`}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-display font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/20"
            >
              Start New
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const effectiveClubName = getEffectiveClubName(save.club);
  const injuredCount = save.squad.filter((p) => p.injured).length;
  const seniorCount = getSeniorPlayerCount(save.squad);
  const incomingOffersCount = save.incomingOffers?.length || 0;
  const boardStatus = save.boardStatus || evaluateBoardConfidence(save);
  const boardConfidence = boardStatus.confidence;

  const standings = save.standings || [];
  const userRankIndex = standings.findIndex((s) => s.clubId === save.club.id);
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : 1;
  const userStanding = standings[userRankIndex];

  const fixtures = save.fixtures || [];
  const userPlayedFixtures = fixtures.filter(
    (f) => f.played && (f.homeClubId === save.club.id || f.awayClubId === save.club.id)
  );
  const recentFormResults = userPlayedFixtures.slice(-5).map((f) => {
    const isHome = f.homeClubId === save.club.id;
    const userScore = isHome ? f.homeScore! : f.awayScore!;
    const oppScore = isHome ? f.awayScore! : f.homeScore!;
    if (userScore > oppScore) return 'W';
    if (userScore === oppScore) return 'D';
    return 'L';
  });

  const previousFixture = userPlayedFixtures.length > 0 ? userPlayedFixtures[userPlayedFixtures.length - 1] : null;
  const previousResultOutcome = previousFixture
    ? (previousFixture.homeClubId === save.club.id
        ? (previousFixture.homeScore! > previousFixture.awayScore! ? 'W' : previousFixture.homeScore === previousFixture.awayScore ? 'D' : 'L')
        : (previousFixture.awayScore! > previousFixture.homeScore! ? 'W' : previousFixture.homeScore === previousFixture.awayScore ? 'D' : 'L'))
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-foreground font-sans flex flex-col pitch-bg w-full overflow-x-hidden">
      {/* Toast Alert */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl font-display font-black text-xs uppercase tracking-wider shadow-xl flex items-center gap-2 motion-reduce:animate-none animate-bounce"
        >
          <span>✓</span> {toastMessage}
        </aside>
      )}

      {/* Manager Office Top Header */}
      <header className="w-full py-2 px-3 sm:px-6 border-b border-slate-900 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 flex justify-between items-center gap-2 select-none shadow-xl">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/career"
            className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 transition-colors flex items-center gap-1 shrink-0"
            title="Exit to Career Save Slots"
          >
            ← <span className="hidden xs:inline">Saves</span>
          </Link>
          <div className="h-4 w-px bg-slate-800 shrink-0" />

          {/* Club Crest & Title */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div
              className="w-4 h-4 rounded-full border border-white/20 shadow-sm shrink-0"
              style={{
                background: `linear-gradient(135deg, ${save.club.primaryColor}, ${save.club.secondaryColor})`,
              }}
            />
            <h1 className="text-sm sm:text-base font-display font-black text-white uppercase tracking-tight truncate flex items-center gap-1.5">
              <span className="truncate">{effectiveClubName}</span>
              <span className="text-[10px] font-bold text-slate-400 font-sans tracking-normal lowercase hidden sm:inline">
                • {save.manager.name}
              </span>
            </h1>
          </div>
        </div>

        {/* Financial & Time Status Badges & Quick Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-3 bg-slate-900/60 border border-slate-800 px-2 sm:px-3 py-1 rounded-xl text-xs">
            <div className="hidden xs:block">
              <span className="text-[9px] uppercase font-bold text-slate-500 mr-1">Budget</span>
              <span className="font-display font-black text-emerald-400">
                {formatCareerCurrency(save.finances.transferBudget, save.settings.currency)}
              </span>
            </div>
            {activeTab !== 'overview' && (
              <>
                <div className="hidden xs:block h-3 w-px bg-slate-800" />
                <div className="flex items-center">
                  <span className="text-[9px] uppercase font-bold text-slate-500 mr-1">Date</span>
                  <span className="font-mono text-[11px] sm:text-xs font-semibold text-emerald-400">
                    {formatCareerDate(save.season.currentDate, save.settings.dateFormat, 'medium')}
                  </span>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => {
              setIsMoreMenuOpen(false);
              setActiveTab('settings');
            }}
            title="Career Settings"
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center border transition-colors text-xs cursor-pointer ${
              activeTab === 'settings'
                ? 'border-emerald-500 bg-emerald-950/60 text-emerald-400'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            ⚙️
          </button>

          <button
            onClick={handleExport}
            title="Export JSON backup"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs cursor-pointer"
          >
            💾
          </button>

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs cursor-pointer"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Main Hub Layout */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col">
        {/* Navigation Tabs - 4 Primary + More Menu */}
        <div className="relative mb-5 z-30">
          <nav aria-label="Career management sections" className="grid grid-cols-5 border-b border-slate-850 gap-1 pb-px bg-slate-950/40 rounded-2xl p-1">
            {[
              { id: 'overview', label: 'Office', icon: '👔', badge: actionableAlerts.length > 0 ? actionableAlerts.length : null },
              { id: 'squad', label: 'Squad', icon: '👥' },
              { id: 'fixtures', label: 'Fixtures', icon: '📅' },
              { id: 'transfers', label: 'Transfers', icon: '💱', badge: incomingOffersCount > 0 ? incomingOffersCount : null },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setActiveTab(tab.id as typeof activeTab);
                  }}
                  className={`py-2 px-1 sm:px-3 font-display font-black text-[11px] sm:text-xs uppercase tracking-wider rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer min-h-[44px] relative ${
                    isActive
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <span className="text-sm sm:text-xs">{tab.icon}</span>
                  <span className="truncate">{tab.label}</span>
                  {tab.badge && (
                    <span className="absolute -top-1 -right-0.5 sm:top-1 sm:right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-md animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* 5th Tab: More Menu */}
            {(() => {
              const isMoreActive = ['table', 'cups', 'settings'].includes(activeTab);
              const activeMoreLabel = activeTab === 'table' ? 'Table' : activeTab === 'cups' ? 'Cups' : activeTab === 'settings' ? 'Config' : null;

              return (
                <button
                  onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                  className={`py-2 px-1 sm:px-3 font-display font-black text-[11px] sm:text-xs uppercase tracking-wider rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer min-h-[44px] relative ${
                    isMoreActive
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow-sm'
                      : isMoreMenuOpen
                      ? 'bg-slate-850 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                  aria-expanded={isMoreMenuOpen}
                  aria-haspopup="true"
                >
                  <span className="text-sm sm:text-xs">⋯</span>
                  <span className="truncate">{activeMoreLabel ? activeMoreLabel : 'More'} ▾</span>
                </button>
              );
            })()}
          </nav>

          {/* More Menu Popover */}
          {isMoreMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 z-40 w-56 bg-slate-950/95 border border-slate-800 rounded-2xl p-2 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2"
              role="menu"
            >
              {[
                { id: 'table', label: 'League Table', icon: '📊', desc: 'Standings, GD & form guide' },
                { id: 'cups', label: 'Cups & Europe', icon: '🏆', desc: 'Domestic cups & continental silverware' },
                { id: 'settings', label: 'Career Settings', icon: '⚙️', desc: 'Rules, formats & club naming' },
              ].map((item) => {
                const isItemActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    role="menuitem"
                    onClick={() => {
                      setActiveTab(item.id as typeof activeTab);
                      setIsMoreMenuOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center gap-3 cursor-pointer ${
                      isItemActive
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                        : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-black text-xs uppercase tracking-wider flex items-center justify-between">
                        <span>{item.label}</span>
                        {isItemActive && <span className="text-emerald-400 text-xs">✓</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* TAB 1: OVERVIEW / MANAGER OFFICE */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* MANAGER'S COCKPIT TOP META HEADER */}
            <section aria-label="Manager Overview" className="flex items-center justify-between gap-2 pb-0.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-display font-black text-white uppercase tracking-tight truncate">
                    {effectiveClubName}
                  </h2>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    S{save.season.seasonNumber} • {save.club.tier?.toUpperCase() || 'PL'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-emerald-400 font-semibold mt-0.2">
                  <span>📅 {formatCareerDate(save.season.currentDate, save.settings.dateFormat, 'short')}</span>
                  {save.season.transferWindowOpen ? (
                    <span className="text-[8px] uppercase font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-1.5 py-0.2 rounded-full animate-pulse">
                      Window Open
                    </span>
                  ) : (
                    <span className="text-[8px] uppercase font-bold text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded-full">
                      Closed
                    </span>
                  )}
                </div>
              </div>

              {/* Board Mood Pill - smaller & moved up inline */}
              <button
                type="button"
                onClick={() => {
                  setTransferHubSubTab('board');
                  setActiveTab('transfers');
                }}
                title="View Board Room"
                className={`px-2 py-1 rounded-lg border text-[10px] font-display font-black uppercase flex items-center gap-1 shrink-0 shadow-sm transition-all cursor-pointer ${
                  boardConfidence >= 65
                    ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60'
                    : boardConfidence >= 45
                    ? 'text-amber-300 bg-amber-950/60 border-amber-800/60'
                    : 'text-rose-400 bg-rose-950/60 border-rose-800/60'
                }`}
              >
                <span>🏛️</span>
                <span>
                  {boardConfidence >= 75
                    ? 'Delighted'
                    : boardConfidence >= 60
                    ? 'Content'
                    : boardConfidence >= 45
                    ? 'Scrutiny'
                    : 'Precarious'}{' '}
                  {boardConfidence}%
                </span>
              </button>
            </section>

            {/* COMPACT MANAGERIAL ALERTS STRIP */}
            {managerialAlerts.length > 0 && (
              <section aria-label="Managerial Alerts" className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-md space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${actionableAlerts.length > 0 ? 'bg-amber-400 animate-pulse' : 'bg-blue-400'}`} />
                    <h3 className="font-display font-black text-xs uppercase tracking-wider text-white truncate flex items-center gap-1.5">
                      <span>Alerts</span>
                      {actionableAlerts.length > 0 ? (
                        <span className="text-[9px] font-mono font-black px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950">
                          {actionableAlerts.length} Action{actionableAlerts.length > 1 ? 's' : ''} Needed
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                          {managerialAlerts.length} Note{managerialAlerts.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const inboxEl = document.getElementById('managerial-inbox');
                      if (inboxEl) {
                        inboxEl.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="text-[9.5px] font-bold text-slate-400 hover:text-emerald-400 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Full Inbox</span>
                    <span className="font-mono">({allInbox.length}) ➔</span>
                  </button>
                </div>

                {/* Top 1-2 alerts rendered as compact single-line rows */}
                <div className="space-y-1">
                  {managerialAlerts.slice(0, 2).map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between gap-2 p-2 rounded-xl text-xs transition-all ${
                        alert.classification === 'action_required'
                          ? 'bg-amber-950/40 border border-amber-800/50'
                          : 'bg-slate-950/60 border border-slate-850'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[8px] font-black uppercase px-1 py-0.2 rounded shrink-0 ${
                              alert.classification === 'action_required'
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-blue-900/60 text-blue-300 border border-blue-700/60'
                            }`}
                          >
                            {alert.classification === 'action_required' ? 'ACTION' : 'INFO'}
                          </span>
                          <span className="font-display font-black text-white text-[11px] truncate">
                            {alert.title}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300 truncate mt-0.2">
                          {alert.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleExecuteAlertAction(alert)}
                          className={`py-1 px-2.5 rounded-lg font-display font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-sm whitespace-nowrap ${
                            alert.classification === 'action_required'
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          <span>{alert.actionLabel}</span>
                          <span>➔</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* TRANSFER DEADLINE DAY STATUS CARD */}
            {(save.deadlineDayState?.isActive || isTransferDeadlineDay(save.season.currentDate, save.season.yearStart)) && (
              <section className="bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-slate-950 border-2 border-amber-500/70 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full font-display animate-pulse flex items-center gap-1">
                        <span>⏱️</span> DEADLINE DAY LIVE
                      </span>
                      <span className="text-white font-mono font-black text-xs bg-slate-900 px-2 py-0.5 rounded-full border border-amber-500/40">
                        {save.deadlineDayState?.timeString || '09:00 BST'}
                      </span>
                      <span className="text-amber-300 text-xs font-mono font-bold">
                        ⏳ {save.deadlineDayState?.hoursRemaining ?? 14} Hours to Window Close (23:00)
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-display font-black text-white uppercase tracking-tight flex items-center gap-2">
                      <span>Phase:</span>
                      <span className="text-amber-400">{save.deadlineDayState?.phase?.toUpperCase() || 'MORNING'}</span>
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleAdvanceDeadlinePhase}
                      className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[42px]"
                    >
                      <span>⏩</span>
                      <span>
                        {save.deadlineDayState?.phase === 'morning'
                          ? 'Advance to Afternoon (13:00)'
                          : save.deadlineDayState?.phase === 'afternoon'
                          ? 'Advance to Evening (18:00)'
                          : save.deadlineDayState?.phase === 'evening'
                          ? 'Advance to Final Hour (22:00)'
                          : '🚨 Window Shut (23:00 BST)'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferHubSubTab('incoming');
                        setActiveTab('transfers');
                      }}
                      className="flex-1 sm:flex-none py-2.5 px-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 text-amber-300 border border-amber-500/40 font-display font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[42px]"
                    >
                      <span>Review Offers ➔</span>
                      {save.incomingOffers && save.incomingOffers.filter((o) => o.status === 'pending').length > 0 && (
                        <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full font-mono">
                          {save.incomingOffers.filter((o) => o.status === 'pending').length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* 4-Phase Progress Indicator Mini Bar */}
                <div className="grid grid-cols-4 gap-1 pt-1 text-[10px] font-bold text-center">
                  {(['morning', 'afternoon', 'evening', 'deadline'] as const).map((ph, idx) => {
                    const currentPhase = save.deadlineDayState?.phase || 'morning';
                    const phaseOrder = ['morning', 'afternoon', 'evening', 'deadline'];
                    const isPastOrCurrent = phaseOrder.indexOf(currentPhase) >= idx;
                    const isCurrent = currentPhase === ph;
                    const labels = ['09:00 Morning', '13:00 Afternoon', '18:00 Evening', '22:00 Final'];

                    return (
                      <div
                        key={ph}
                        className={`py-1 px-0.5 rounded-lg transition-all border text-[9px] ${
                          isCurrent
                            ? 'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-md shadow-amber-500/20'
                            : isPastOrCurrent
                            ? 'bg-amber-950/40 text-amber-300 border-amber-900/40'
                            : 'bg-slate-950/60 text-slate-500 border-slate-850'
                        }`}
                      >
                        {labels[idx]}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* MULTI-COMPETITION MATCHDAY SPOTLIGHT HERO */}
            {nextScheduled && (
              <section aria-label="Next Fixture" className="bg-gradient-to-r from-emerald-950/40 via-slate-900/70 to-slate-950 border border-emerald-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-0.5 rounded-full font-display">
                    {nextScheduled.isCup
                      ? `🏆 ${nextScheduled.cupName} • ${nextScheduled.roundName}`
                      : `Next Fixture • Matchday ${(nextScheduled.fixture as LeagueFixture).round} of 38`}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium font-sans">
                    {formatCareerDate(nextScheduled.fixture.date, save.settings.dateFormat, 'medium')}
                  </span>
                </div>

                {/* Match Clash: Always Side-by-Side on all viewports */}
                {(() => {
                  const home = findAnyClub(nextScheduled.fixture.homeClubId) || allClubs[0];
                  const away = findAnyClub(nextScheduled.fixture.awayClubId) || allClubs[1];
                  const isUserHome = nextScheduled.fixture.homeClubId === save.club.id;
                  const isUserAway = nextScheduled.fixture.awayClubId === save.club.id;

                  const isNeutralWembley =
                    nextScheduled.isCup &&
                    (nextScheduled.cupId === CUP_IDS.SHIELD ||
                      (nextScheduled.roundName === 'Final' &&
                        (nextScheduled.cupId === CUP_IDS.LEAGUE_CUP || nextScheduled.cupId === CUP_IDS.ENGLISH_CUP)) ||
                      (nextScheduled.roundName === 'Semi-Final' && nextScheduled.cupId === CUP_IDS.ENGLISH_CUP));

                  const venueDisplay = isNeutralWembley
                    ? 'Wembley Stadium (Neutral)'
                    : (home.stadiumName || 'Stadium');

                  return (
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-3 sm:gap-6 py-1 px-1 sm:px-4">
                        {/* Home Club */}
                        <div className="flex-1 flex flex-col items-center text-center space-y-1 min-w-0">
                          <div
                            data-force-white="true"
                            className="club-crest w-11 h-11 sm:w-14 sm:h-14 rounded-full border-2 border-white/20 shadow-xl flex items-center justify-center text-xs sm:text-base font-black text-white shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${home.primaryColor}, ${home.secondaryColor})`,
                            }}
                          >
                            {home.shortName}
                          </div>
                          <div className="min-w-0 w-full">
                            <h4 className="font-display font-black text-xs sm:text-base text-white truncate">
                              {getEffectiveClubName(home, save.club)}
                            </h4>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                              {isUserHome ? (isNeutralWembley ? '★ (YOU • NEUTRAL)' : '★ (YOU • HOME)') : (isNeutralWembley ? 'Neutral' : 'Home')}
                            </span>
                          </div>
                        </div>

                        {/* VS & Venue */}
                        <div className="flex flex-col items-center justify-center shrink-0 px-2 space-y-0.5">
                          <span className="text-lg sm:text-2xl font-display font-black text-emerald-400 tracking-wider">
                            VS
                          </span>
                          <span className="text-[9.5px] text-slate-400 font-medium truncate max-w-[110px] sm:max-w-[200px]">
                            🏟️ {venueDisplay}
                          </span>
                        </div>

                        {/* Away Club */}
                        <div className="flex-1 flex flex-col items-center text-center space-y-1 min-w-0">
                          <div
                            data-force-white="true"
                            className="club-crest w-11 h-11 sm:w-14 sm:h-14 rounded-full border-2 border-white/20 shadow-xl flex items-center justify-center text-xs sm:text-base font-black text-white shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${away.primaryColor}, ${away.secondaryColor})`,
                            }}
                          >
                            {away.shortName}
                          </div>
                          <div className="min-w-0 w-full">
                            <h4 className="font-display font-black text-xs sm:text-base text-white truncate">
                              {getEffectiveClubName(away, save.club)}
                            </h4>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                              {isUserAway ? (isNeutralWembley ? '★ (YOU • NEUTRAL)' : '★ (YOU • AWAY)') : (isNeutralWembley ? 'Neutral' : 'Away')}
                            </span>
                          </div>
                        </div>
                      </div>


                      {/* Primary 1-Column Action: Prepare & Play Match */}
                      <button
                        onClick={() => setActiveMatchFixture(nextScheduled.fixture)}
                        disabled={simulating}
                        className="w-full py-3 sm:py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-display font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer min-h-[48px]"
                      >
                        <span>▶ Prepare &amp; Play Match</span>
                      </button>

                      {/* Secondary 2-Column Actions */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handlePlayNextMatchInstant}
                          disabled={simulating}
                          className="py-2.5 px-3 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-900/80 hover:bg-slate-850 text-slate-200 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer min-h-[42px] flex items-center justify-center gap-1.5"
                          title="Quickly simulate this matchday"
                        >
                          <span>⚡ Instant Sim</span>
                        </button>
                        <button
                          onClick={() => setMatchOverviewModal({ type: 'preview', fixture: nextScheduled.fixture })}
                          className="py-2.5 px-3 rounded-xl border border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[42px]"
                          title="View pre-match tactical dossier and opponent scouting"
                        >
                          <span>📋 Match Dossier</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </section>
            )}

            {/* 3-COLUMN MANAGER STATUS & KPI ROW */}
            <section aria-label="Key Performance Indicators" className="grid grid-cols-3 gap-1.5 sm:gap-2.5 select-none">
              {/* 1. Finances */}
              <div
                onClick={() => {
                  setTransferHubSubTab('market');
                  setActiveTab('transfers');
                }}
                className="bg-slate-900/60 hover:bg-slate-850/80 border border-slate-800 hover:border-emerald-500/40 p-2 sm:p-3 rounded-2xl transition-all cursor-pointer flex flex-col justify-between min-h-[64px]"
                title="View Transfers & Finances"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] sm:text-[9.5px] uppercase font-bold text-slate-500 block truncate">Warchest</span>
                  <span className="text-xs text-slate-400 hidden xs:inline">💱</span>
                </div>
                <div className="mt-0.5">
                  <span className="text-xs sm:text-base font-display font-black text-emerald-400 block truncate">
                    {formatCareerCurrency(save.finances.transferBudget, save.settings.currency)}
                  </span>
                  <span className="text-[8.5px] sm:text-[10px] text-slate-400 block font-mono truncate">
                    +{formatCareerWage(Math.max(0, save.finances.weeklyWageBudget - save.finances.currentWeeklyWages), save.settings.wageUnit, save.settings.currency)}/w
                  </span>
                </div>
              </div>

              {/* 2. League Rank & Form */}
              <div
                onClick={() => setActiveTab('table')}
                className="bg-slate-900/60 hover:bg-slate-850/80 border border-slate-800 hover:border-emerald-500/40 p-2 sm:p-3 rounded-2xl transition-all cursor-pointer flex flex-col justify-between min-h-[64px]"
                title="View League Table"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] sm:text-[9.5px] uppercase font-bold text-slate-500 block truncate">Standing</span>
                  <span className="text-xs text-slate-400 hidden xs:inline">📊</span>
                </div>
                <div className="mt-0.5">
                  <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                    {userStanding && userStanding.played > 0 ? (
                      <>
                        <span className="text-xs sm:text-base font-display font-black text-white">
                          #{userRank}
                        </span>
                        <div className="flex gap-0.5">
                          {recentFormResults.slice(-3).map((res, i) => (
                            <span
                              key={i}
                              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded text-[8px] sm:text-[9px] font-black flex items-center justify-center font-display ${
                                res === 'W'
                                  ? 'bg-emerald-500 text-slate-950'
                                  : res === 'D'
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-rose-500 text-white'
                              }`}
                            >
                              {res}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <span className="text-xs sm:text-base font-display font-black text-slate-300">
                        Pre-Season
                      </span>
                    )}
                  </div>
                  <span className="text-[8.5px] sm:text-[10px] text-slate-400 block font-mono truncate">
                    {userStanding && userStanding.played > 0
                      ? `${userStanding.points} pts (${userStanding.won}W ${userStanding.lost}L)`
                      : 'Matchday 1 Pending'}
                  </span>
                </div>

              </div>

              {/* 3. Action Center / Urgent Alerts Pill */}
              <div
                onClick={() => {
                  if (actionableAlerts.length > 0) {
                    handleExecuteAlertAction(actionableAlerts[0]);
                  } else if (managerialAlerts.length > 0) {
                    handleExecuteAlertAction(managerialAlerts[0]);
                  } else {
                    const inboxEl = document.getElementById('managerial-inbox');
                    if (inboxEl) inboxEl.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className={`p-2 sm:p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ${
                  actionableAlerts.length > 0
                    ? 'bg-amber-950/30 hover:bg-amber-950/50 border-amber-500/40'
                    : managerialAlerts.length > 0
                    ? 'bg-blue-950/30 hover:bg-blue-950/50 border-blue-500/40'
                    : 'bg-slate-900/60 hover:bg-slate-850/80 border-slate-800'
                }`}
                title={actionableAlerts.length > 0 ? 'Click to resolve urgent issues' : 'Squad & office status'}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] sm:text-[9.5px] uppercase font-bold text-slate-500 block truncate">Action</span>
                  <span className="text-xs">{actionableAlerts.length > 0 ? '⚠️' : managerialAlerts.length > 0 ? 'ℹ️' : '✓'}</span>
                </div>
                <div className="mt-0.5">
                  {actionableAlerts.length > 0 ? (
                    <div>
                      <span className="text-[11px] sm:text-xs font-display font-black text-amber-300 block truncate">
                        🚨 Needs Action ({actionableAlerts.length})
                      </span>
                      <span className="text-[8.5px] sm:text-[10px] text-amber-200/90 block font-medium truncate">
                        {actionableAlerts[0].title} ➔
                      </span>
                    </div>
                  ) : managerialAlerts.length > 0 ? (
                    <div>
                      <span className="text-[11px] sm:text-xs font-display font-black text-blue-300 block truncate">
                        📋 {managerialAlerts.length} Review Item{managerialAlerts.length > 1 ? 's' : ''}
                      </span>
                      <span className="text-[8.5px] sm:text-[10px] text-slate-400 block font-medium truncate">
                        {managerialAlerts[0].title} ➔
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[11px] sm:text-xs font-display font-black text-emerald-400 block truncate">
                        🟢 All Clear
                      </span>
                      <span className="text-[8.5px] sm:text-[10px] text-slate-400 block font-medium truncate">
                        No pending decisions
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 4-COLUMN MOBILE SHORTCUT TOOLBAR */}
            <nav aria-label="Quick management actions" className="grid grid-cols-4 gap-2 text-center text-xs">
              <button
                onClick={() => setActiveTab('squad')}
                className="py-2.5 px-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 font-display font-black uppercase text-[10.5px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-h-[48px]"
              >
                <span className="text-base">👥</span>
                <span>Squad</span>
              </button>
              <button
                onClick={() => setActiveTab('squad')}
                className="py-2.5 px-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 font-display font-black uppercase text-[10.5px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-h-[48px]"
              >
                <span className="text-base">⚡</span>
                <span>Tactics</span>
              </button>
              <button
                onClick={() => {
                  if (incomingOffersCount > 0) {
                    navigateToIncomingOffers();
                  } else {
                    setTransferHubSubTab('market');
                    setActiveTab('transfers');
                  }
                }}
                className="py-2.5 px-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 font-display font-black uppercase text-[10.5px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-h-[48px] relative"
              >
                <span className="text-base">💱</span>
                <span>Transfers</span>
                {incomingOffersCount > 0 && (
                  <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('fixtures')}
                className="py-2.5 px-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 font-display font-black uppercase text-[10.5px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer min-h-[48px]"
              >
                <span className="text-base">📅</span>
                <span>Calendar</span>
              </button>
            </nav>

            {/* PREVIOUS MATCH RESULT SUMMARY CARD */}
            {prevScheduled && (
              <section
                aria-label="Previous Match Result"
                onClick={() => setMatchOverviewModal({ type: 'result', fixture: prevScheduled.fixture })}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/50 rounded-2xl px-4 py-3 flex flex-col gap-2 text-xs transition-all cursor-pointer shadow-md hover:shadow-emerald-500/10 group select-none"
                title="Click to view detailed match overview & statistics"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-display">
                      {prevScheduled.isCup
                        ? `Last Result (${prevScheduled.cupName}):`
                        : `Last Result (MD ${(prevScheduled.fixture as LeagueFixture).round}):`}
                    </span>
                    {(() => {
                      const isHome = prevScheduled.fixture.homeClubId === save.club.id;
                      const userScore = isHome ? prevScheduled.fixture.homeScore! : prevScheduled.fixture.awayScore!;
                      const oppScore = isHome ? prevScheduled.fixture.awayScore! : prevScheduled.fixture.homeScore!;
                      const cupFix = prevScheduled.fixture as CupFixture;
                      let outcome = userScore > oppScore ? 'W' : userScore === oppScore ? 'D' : 'L';
                      if (userScore === oppScore && cupFix.penalties) {
                        const userPens = isHome ? cupFix.penalties.homePenalties : cupFix.penalties.awayPenalties;
                        const oppPens = isHome ? cupFix.penalties.awayPenalties : cupFix.penalties.homePenalties;
                        outcome = userPens > oppPens ? 'W' : 'L';
                      }
                      return (
                        <span
                          className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${
                            outcome === 'W'
                              ? 'bg-emerald-500 text-slate-950'
                              : outcome === 'D'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-rose-500 text-white'
                          }`}
                        >
                          {outcome === 'W' ? 'WON' : outcome === 'D' ? 'DRAW' : 'LOST'}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2 font-display font-bold text-white text-xs">
                    <span className="truncate max-w-[100px] sm:max-w-none">
                      {getEffectiveClubName(findAnyClub(prevScheduled.fixture.homeClubId) || allClubs[0], save.club)}
                    </span>
                    <span className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-lg text-emerald-400 font-mono font-black">
                      {prevScheduled.fixture.homeScore} - {prevScheduled.fixture.awayScore}
                    </span>
                    <span className="truncate max-w-[100px] sm:max-w-none">
                      {getEffectiveClubName(findAnyClub(prevScheduled.fixture.awayClubId) || allClubs[1], save.club)}
                    </span>
                  </div>

                  <span className="text-emerald-400 font-display font-black group-hover:translate-x-0.5 transition-transform text-[10.5px] ml-auto sm:ml-0">
                    📊 Stats ➔
                  </span>
                </div>
              </section>
            )}

            {/* FAST-FORWARD CALENDAR TRACKER */}
            <section aria-label="Calendar Controls" className="bg-slate-900/50 border border-slate-850 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-sm">⏱️</span>
                <span className="text-[11px] font-bold uppercase tracking-wider">Fast Forward:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setPendingFastForward('next_match')}
                  disabled={simulating || !nextScheduled}
                  className="py-1.5 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-200 font-display font-bold text-[11px] uppercase transition-all cursor-pointer min-h-[36px]"
                >
                  ⏭️ Next Match
                </button>
                <button
                  onClick={() => setPendingFastForward('next_week')}
                  disabled={simulating}
                  className="py-1.5 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 font-display font-bold text-[11px] uppercase transition-all cursor-pointer min-h-[36px]"
                >
                  +7 Days
                </button>
                <button
                  onClick={() => setPendingFastForward('next_month')}
                  disabled={simulating}
                  className="py-1.5 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 font-display font-bold text-[11px] uppercase transition-all cursor-pointer min-h-[36px]"
                >
                  +1 Month
                </button>
                <button
                  onClick={() => setPendingFastForward('transfer_deadline')}
                  disabled={simulating}
                  className="py-1.5 px-3 rounded-xl bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/40 text-amber-300 font-display font-bold text-[11px] uppercase transition-all cursor-pointer min-h-[36px]"
                >
                  ⏳ Deadline
                </button>
              </div>
            </section>

            {/* END-OF-SEASON TRANSITION HUB (WHEN ALL FIXTURES CONCLUDED) */}
            {!nextScheduled && seasonCompleted && (
              <section className="bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-slate-950 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-left">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1.5">
                    <div className="text-xs font-display font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🏆</span> Season {save.season.seasonNumber} Complete!
                    </div>
                    <h3 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tight">
                      All Fixtures Concluded • What To Do Next
                    </h3>
                    <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                      All 38 league matchdays and tournaments have concluded. Advance to Season {save.season.seasonNumber + 1} to claim your merit prize money, increase your transfer budget, age your squad, and begin the new summer transfer window!
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleAdvanceToNextSeasonAction}
                      disabled={simulating}
                      className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      <span>🚀 Advance to Season {save.season.seasonNumber + 1} ➔</span>
                    </button>
                    {seasonSummary && (
                      <button
                        onClick={() => setShowSeasonReviewModal(true)}
                        className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-display font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center min-h-[38px]"
                      >
                        📋 View Season Review &amp; Player Growth
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Financial Payout & Standings Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">League Finish</span>
                    <div className="font-display font-black text-base text-white">
                      {seasonSummary?.leagueTitle ? '🥇 Champions' : `Position #${seasonSummary?.finalPosition || 1}`}
                    </div>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Merit Prize Money</span>
                    <div className="font-display font-black text-base text-emerald-400">
                      +{formatCareerCurrency(seasonSummary?.prizeMoney || 10_000_000, save.settings.currency)}
                    </div>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">New War Chest</span>
                    <div className="font-display font-black text-base text-emerald-300">
                      {formatCareerCurrency(save.finances.transferBudget + (seasonSummary?.prizeMoney || 10_000_000), save.settings.currency)}
                    </div>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Europe Status</span>
                    <div className="font-display font-bold text-xs text-blue-300 truncate" title={seasonSummary?.europeanQualification || 'Domestic'}>
                      {seasonSummary?.europeanQualification || 'Domestic Competitions'}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* PHYSIO ROOM & MEDICAL REPORT CARD */}
            {injuredCount === 0 ? (
              <section className="bg-slate-900/40 border border-slate-850 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span>🏥</span>
                  <span className="font-display font-bold text-slate-300">Physio Room:</span>
                  <span className="text-emerald-400 font-semibold">Clean Bill of Health</span>
                  <span className="hidden sm:inline text-slate-500">• 100% Squad Fit</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-2 py-0.5 rounded-full">
                  0 Injured ✓
                </span>
              </section>
            ) : (
              <section className="bg-slate-900/50 border border-slate-850 rounded-3xl p-4 sm:p-5 shadow-md space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏥</span>
                    <h3 className="text-xs font-display font-black uppercase tracking-wider text-slate-300">
                      Physio Room &amp; Squad Medical Report
                    </h3>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    {injuredCount} First-Team {injuredCount === 1 ? 'Player' : 'Players'} Injured
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {save.squad.filter((p) => p.injured).map((player) => (
                      <div
                        key={player.id}
                        className="bg-slate-950/80 border border-rose-950 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-display font-bold text-white truncate flex items-center gap-1.5">
                            <span>{player.name}</span>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-1 rounded">
                              {player.position}
                            </span>
                          </div>
                          <p className="text-[11px] text-rose-350 truncate">
                            {player.injuryDescription || 'Muscular rehabilitation'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/40 border border-rose-800/40 px-2 py-0.5 rounded-lg block">
                            {player.injuryWeeks || 1}w recovery
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => setActiveTab('squad')}
                      className="text-xs font-display font-black uppercase text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Adjust Tactics &amp; Replacements in Squad</span>
                      <span>➔</span>
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* BOARD ROOM CONFIDENCE BAR */}
            <section className="bg-slate-900/40 border border-slate-850 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-base">🏛️</span>
                <div>
                  <div className="font-display font-black uppercase text-white flex items-center gap-2">
                    <span>Board Confidence</span>
                    <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                      boardConfidence >= 70
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : boardConfidence >= 50
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {boardConfidence}% Satisfaction
                    </span>
                  </div>
                  <div className="text-[10.5px] text-slate-400 mt-0.5">
                    Objective: <strong className="text-white">{save.club.tier === 'elite' ? 'Win Title' : save.club.tier === 'upper' ? 'European Qualification' : 'Avoid Relegation'}</strong> • Status: <span className="text-emerald-400 font-bold">Job Safe</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('settings')}
                className="py-1.5 px-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-white font-display font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer"
              >
                Board Objectives ➔
              </button>
            </section>

            {/* INTERACTIVE FOOTBALL MANAGER INBOX (ACTION ITEM: GENERAL INBOX) */}
            {(() => {
              const unreadInboxCount = allInbox.filter((m) => !m.isRead).length;
              const actionableInboxCount = allInbox.filter((m) => {
                const cl = classifyInboxMessage(m, save);
                return cl.classification === 'action_required' && !cl.isResolved;
              }).length;

              const filteredMessages = allInbox.filter((m) => {
                if (inboxFilter === 'all') return true;
                if (inboxFilter === 'action_required') {
                  const cl = classifyInboxMessage(m, save);
                  return cl.classification === 'action_required' && !cl.isResolved;
                }
                if (inboxFilter === 'unread') return !m.isRead;
                return m.type === inboxFilter;
              });

              return (
                <section id="managerial-inbox" className="bg-slate-900/50 border border-slate-850 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">📬</span>
                      <h3 className="text-sm font-display font-black uppercase tracking-wider text-white flex items-center gap-2">
                        <span>Managerial Inbox</span>
                        {unreadInboxCount > 0 && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                            {unreadInboxCount} Unread
                          </span>
                        )}
                        {actionableInboxCount > 0 && (
                          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 animate-pulse">
                            {actionableInboxCount} Action Required
                          </span>
                        )}
                      </h3>
                    </div>

                    {unreadInboxCount > 0 && (
                      <button
                        onClick={handleMarkAllMessagesRead}
                        className="text-[11px] font-bold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        ✓ Mark All as Read
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <nav aria-label="Inbox Filters" className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800">
                    {[
                      { id: 'all', label: 'All', count: allInbox.length },
                      { id: 'action_required', label: 'Action Needed', count: actionableInboxCount },
                      { id: 'unread', label: 'Unread', count: unreadInboxCount },
                      { id: 'board', label: 'Board', count: allInbox.filter((m) => m.type === 'board').length },
                      { id: 'injury', label: 'Medical', count: allInbox.filter((m) => m.type === 'injury').length },
                      { id: 'transfer', label: 'Transfers', count: allInbox.filter((m) => m.type === 'transfer').length },
                      { id: 'cup_draw', label: 'Competitions', count: allInbox.filter((m) => m.type === 'cup_draw').length },
                    ].map((filter) => {
                      const active = inboxFilter === filter.id;
                      return (
                        <button
                          key={filter.id}
                          onClick={() => setInboxFilter(filter.id as typeof inboxFilter)}
                          className={`py-1.5 px-3 rounded-xl text-xs font-display font-bold uppercase transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            active
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-950/60 text-slate-400 border border-slate-850 hover:text-slate-200'
                          }`}
                        >
                          <span>{filter.label}</span>
                          <span className="text-[10px] opacity-75 font-mono">({filter.count})</span>
                        </button>
                      );
                    })}
                  </nav>

                  {/* Messages Feed */}
                  <div className="space-y-2.5">
                    {filteredMessages.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500">
                        No messages found in this folder.
                      </div>
                    ) : (
                      filteredMessages.map((msg) => {
                        const isExpanded = expandedMessageId === msg.id;
                        const classificationInfo = classifyInboxMessage(msg, save);
                        const { classification, isResolved, effectiveActionLabel, effectiveActionTab, effectiveActionType, targetId } = classificationInfo;

                        return (
                          <article
                            key={msg.id}
                            onClick={() => handleToggleMessageRead(msg.id)}
                            className={`rounded-2xl border p-4 transition-all cursor-pointer select-none space-y-2 ${
                              !msg.isRead
                                ? 'bg-slate-950/90 border-emerald-500/40 hover:border-emerald-500/70 shadow-sm'
                                : 'bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {!msg.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                )}
                                <span className="font-display font-bold text-xs text-white">
                                  {msg.sender}
                                </span>
                                <span className="text-[10px] text-slate-500 font-sans">
                                  • {msg.senderRole}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 ml-auto text-[10px]">
                                {isResolved ? (
                                  <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold uppercase text-[9px]">
                                    ✓ Resolved
                                  </span>
                                ) : classification === 'action_required' ? (
                                  <span className="bg-amber-400 text-slate-950 font-black uppercase px-2 py-0.5 rounded-full text-[9px] animate-pulse">
                                    Action Required
                                  </span>
                                ) : classification === 'important' ? (
                                  <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full font-black uppercase text-[9px]">
                                    Important
                                  </span>
                                ) : (
                                  <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-medium text-[9px]">
                                    Info
                                  </span>
                                )}
                                <span className="font-mono text-slate-400">
                                  {formatCareerDate(msg.date, save.settings.dateFormat, 'medium')}
                                </span>
                              </div>
                            </div>

                            <div className="font-semibold text-xs text-slate-200">
                              {msg.subject}
                            </div>

                            {/* Message Preview or Expanded Content */}
                            {isExpanded ? (
                              <div className="pt-2 border-t border-slate-850 space-y-3">
                                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                                  {msg.body}
                                </p>

                                {effectiveActionLabel && (
                                  <div className="pt-1 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleExecuteAlertAction({
                                          actionTab: effectiveActionTab,
                                          actionType: effectiveActionType,
                                          targetId: targetId || msg.targetId,
                                        });
                                      }}
                                      className={`py-2 px-3.5 rounded-xl font-display font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                                        classification === 'action_required' && !isResolved
                                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
                                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                                      }`}
                                    >
                                      <span>{effectiveActionLabel}</span>
                                      <span>➔</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 truncate">
                                {msg.body.replace(/\n+/g, ' ')}
                              </p>
                            )}
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })()}

            {/* Club Profile & Board Expectations (Secondary Context) */}
            <div className="pt-2 border-t border-slate-850 space-y-4">
              <h3 className="text-xs font-display font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span>🏛️</span>
                <span>Club Profile &amp; Governance</span>
              </h3>

              {/* Hero Welcome Banner */}
              <section className="bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
                <div
                  className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 filter blur-3xl pointer-events-none"
                  style={{ background: save.club.primaryColor }}
                />

                <div className="max-w-2xl space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-3 py-1 rounded-full font-display">
                    English Top Flight • Season {save.season.seasonNumber}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tight">
                    Welcome to {effectiveClubName}, {save.manager.name}
                  </h2>
                  <p className="text-xs text-slate-350 leading-relaxed font-medium">
                    Your management tenure has officially begun. You have been appointed with a{' '}
                    <span className="text-emerald-400 font-bold">
                      {formatCareerCurrency(save.finances.transferBudget, save.settings.currency)}
                    </span>{' '}
                    transfer budget and a wage allocation of{' '}
                    <span className="text-slate-200 font-bold">
                      {formatCareerWage(save.finances.weeklyWageBudget, save.settings.wageUnit, save.settings.currency)}
                    </span>.
                  </p>
                </div>
              </section>

              {/* Club Vitals & Board Expectations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-2">
                  <span className="text-xl">🏟️</span>
                  <h3 className="text-xs font-display font-black uppercase text-slate-300">
                    Home Ground
                  </h3>
                  <div className="text-base font-display font-black text-white">
                    {save.club.stadiumName}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Capacity: {save.club.stadiumCapacity.toLocaleString()} supporters
                  </p>
                </div>

                <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-2">
                  <span className="text-xl">🎯</span>
                  <h3 className="text-xs font-display font-black uppercase text-slate-300">
                    Board Objective
                  </h3>
                  <div className="text-base font-display font-black text-white">
                    {save.club.tier === 'elite'
                      ? 'Compete for the Title'
                      : save.club.tier === 'upper'
                      ? 'European Qualification'
                      : save.club.tier === 'mid'
                      ? 'Top Half Finish'
                      : 'Avoid Relegation'}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Reputation tier: <span className="uppercase font-bold text-emerald-400">{save.club.tier}</span> ({save.club.reputation}/100)
                  </p>
                </div>

                <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-2">
                  <span className="text-xl">⚖️</span>
                  <h3 className="text-xs font-display font-black uppercase text-slate-300">
                    Career Rules
                  </h3>
                  <div className="text-base font-display font-black text-white flex items-center gap-2">
                    <span className="capitalize">{save.settings.preset}</span>
                    {save.settings.locked && <span title="Settings Locked">🔒</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {save.settings.boardCanSack ? 'Board Sackings: Active' : 'No Sackings (Job Safe)'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SQUAD */}
        {activeTab === 'squad' && (
          <SquadManagement
            save={save}
            onUpdateSave={handleUpdateSave}
            onOpenCompare={(pA, pB) => setComparisonState({ isOpen: true, playerA: pA, playerB: pB })}
          />
        )}

        {/* TAB 3: FIXTURES */}
        {activeTab === 'fixtures' && (
          <FixturesCalendar
            save={save}
            onUpdateSave={handleUpdateSave}
            onNotification={showToast}
            onNavigateOffice={() => setActiveTab('overview')}
          />
        )}

        {/* TAB 4: TABLE */}
        {activeTab === 'table' && (
          <LeagueTable
            standings={save.standings || []}
            userClubId={save.club.id}
            userClub={save.club}
          />
        )}

        {/* TAB 5: CUPS & EUROPE */}
        {activeTab === 'cups' && (
          <TournamentsHub
            save={save}
            onUpdateSave={handleUpdateSave}
            onNotification={showToast}
          />
        )}

        {/* TAB 6: TRANSFERS */}
        {activeTab === 'transfers' && (
          <TransferHub
            save={save}
            onUpdateSave={handleUpdateSave}
            onNotification={showToast}
            initialSubTab={transferHubSubTab}
            focusedOfferId={focusedOfferId}
            onOpenCompare={(pA, pB) => setComparisonState({ isOpen: true, playerA: pA, playerB: pB })}
          />
        )}

        {/* TAB 6: SETTINGS & EDITING */}
        {activeTab === 'settings' && editableSettings && (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <header className="space-y-1">
              <h3 className="text-xl font-display font-black uppercase text-white">
                Career Save Settings
              </h3>
              <p className="text-xs text-slate-400">
                {save.settings.locked
                  ? 'This career has locked rules to protect save integrity and prevent mid-game changes.'
                  : 'You can adjust mid-save settings and rename your club below.'}
              </p>
            </header>

            {/* Club Name Renaming */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Club Display Name
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={editingClubName}
                  onChange={(e) => setEditingClubName(e.target.value)}
                  placeholder={save.club.defaultName}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                />
                <button
                  onClick={() => setEditingClubName(save.club.defaultName)}
                  className="py-2.5 px-3 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-400 hover:text-white"
                  title="Reset to default club name"
                >
                  Reset
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Default: {save.club.defaultName}. Renaming is permitted on all difficulties.
              </p>
            </div>

            {/* Regional & Display Preferences (Always Editable) */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-display font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <span>🌐</span> Regional & Display Preferences
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Football Manager-style units and formatting. Configurable mid-save on all difficulties.
                  </p>
                </div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Always Editable
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Date Format */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                    Date Format
                  </label>
                  <select
                    value={editableSettings.dateFormat || 'uk'}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        dateFormat: e.target.value as DateFormatPreference,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="uk">UK (14/08/2026 - DD/MM/YYYY)</option>
                    <option value="iso">ISO (2026-08-14 - YYYY-MM-DD)</option>
                    <option value="us">US (08/14/2026 - MM/DD/YYYY)</option>
                  </select>
                </div>

                {/* Currency */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                    Currency Unit
                  </label>
                  <select
                    value={editableSettings.currency || 'GBP'}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        currency: e.target.value as CurrencyPreference,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="GBP">GBP (£ - British Pound)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="USD">USD ($ - US Dollar)</option>
                  </select>
                </div>

                {/* Wage Unit */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                    Wage Rate Frequency
                  </label>
                  <select
                    value={editableSettings.wageUnit || 'weekly'}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        wageUnit: e.target.value as WageUnitPreference,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="weekly">Weekly (£/wk - FM Standard)</option>
                    <option value="monthly">Monthly (£/mo)</option>
                    <option value="annual">Annual (£/yr)</option>
                  </select>
                </div>

                {/* Height Unit */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                    Height Unit
                  </label>
                  <select
                    value={editableSettings.heightUnit || 'ft_in'}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        heightUnit: e.target.value as HeightUnitPreference,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="ft_in">Feet &amp; Inches (5&apos; 11&quot;)</option>
                    <option value="cm">Centimetres (180 cm)</option>
                    <option value="m">Metres (1.80 m)</option>
                  </select>
                </div>

                {/* Weight Unit */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                    Weight Unit
                  </label>
                  <select
                    value={editableSettings.weightUnit || 'kg'}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        weightUnit: e.target.value as WeightUnitPreference,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="kg">Kilograms (75 kg)</option>
                    <option value="st_lbs">Stone &amp; Pounds (11st 11lbs)</option>
                    <option value="lbs">Pounds (165 lbs)</option>
                  </select>
                </div>

                {/* Number Format */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
                    Number Formatting
                  </label>
                  <select
                    value={editableSettings.numberFormat || 'comma'}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        numberFormat: e.target.value as NumberFormatPreference,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="comma">Standard Comma (1,000,000)</option>
                    <option value="dot">Continental Dot (1.000.000)</option>
                    <option value="space">Space Separator (1 000 000)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Gameplay Rules Status */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h4 className="text-xs font-display font-black uppercase tracking-wider text-slate-300">
                  Gameplay Rules
                </h4>
                {save.settings.locked && (
                  <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <span>🔒</span> Locked Save
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Board Sackings */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Board Can Sack You</div>
                    <div className="text-[10px] text-slate-500">Dismissed on poor form</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editableSettings.boardCanSack}
                    disabled={save.settings.locked}
                    onChange={(e) =>
                      setEditableSettings({ ...editableSettings, boardCanSack: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Match Retry */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Allow Match Retry</div>
                    <div className="text-[10px] text-slate-500">Replay a simulated match</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editableSettings.retryMatch}
                    disabled={save.settings.locked}
                    onChange={(e) =>
                      setEditableSettings({ ...editableSettings, retryMatch: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Homegrown Rule */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Homegrown Rule</div>
                    <div className="text-[10px] text-slate-500">8+ domestic players required</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editableSettings.homegrownRule}
                    disabled={save.settings.locked}
                    onChange={(e) =>
                      setEditableSettings({ ...editableSettings, homegrownRule: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Financial Penalties */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Financial Penalties</div>
                    <div className="text-[10px] text-slate-500">Point deductions on debt</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editableSettings.financialPenalties}
                    disabled={save.settings.locked}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        financialPenalties: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveSettings}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Matchday Play/Sim Interactive Modal */}
      {activeMatchFixture && (
        <MatchDayModal
          fixture={activeMatchFixture}
          save={save}
          onClose={() => setActiveMatchFixture(null)}
          onSaveMatchResult={handleMatchResultSaved}
        />
      )}

      {/* Match Overview / Statistics / Pre-Match Dossier Modal */}
      {matchOverviewModal && (
        <MatchOverviewModal
          type={matchOverviewModal.type}
          fixture={matchOverviewModal.fixture}
          save={save}
          onClose={() => setMatchOverviewModal(null)}
          onPlayInteractiveMatch={() => {
            setActiveMatchFixture(matchOverviewModal.fixture);
            setMatchOverviewModal(null);
          }}
          onPlayInstantMatch={() => {
            setMatchOverviewModal(null);
            handlePlayNextMatchInstant();
          }}
        />
      )}

      {/* End of Season Review & Awards Modal */}
      {showSeasonReviewModal && seasonSummary && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 motion-reduce:transition-none"
        >
          <div className="bg-slate-950 border border-amber-500/40 rounded-3xl p-6 sm:p-7 max-w-xl w-full space-y-5 shadow-2xl text-left relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider font-display">
                  Official Season {save.season.seasonNumber} Review &amp; Board Summary
                </span>
                <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                  {seasonSummary.leagueTitle ? '👑 League Champions!' : `Finished Position #${seasonSummary.finalPosition}`}
                </h3>
              </div>
              <button
                onClick={() => setShowSeasonReviewModal(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg text-sm cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Campaign Accolades Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">League Finish</span>
                <div className="font-display font-black text-base text-white">
                  {seasonSummary.leagueTitle ? '🥇 1st Place' : `#${seasonSummary.finalPosition}`}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Silverware</span>
                <div className="font-display font-black text-base text-amber-400">
                  {seasonSummary.trophiesWon.length > 0 ? `${seasonSummary.trophiesWon.length} Trophies` : 'None'}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Prize Money</span>
                <div className="font-display font-black text-base text-emerald-400">
                  +{formatCareerCurrency(seasonSummary.prizeMoney, save.settings.currency)}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Europe</span>
                <div className="font-display font-bold text-xs text-blue-300 truncate" title={seasonSummary.europeanQualification}>
                  {seasonSummary.europeanQualification}
                </div>
              </div>
            </div>

            {/* Financial War Chest Increase Breakdown */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
              <div className="text-[11px] font-display font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>💰</span> End of Season Budget Increase
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The board of directors has credited your competition merit prize money to your war chest. Here is your updated financial war chest for Season {save.season.seasonNumber + 1}:
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                <div className="bg-slate-950/70 border border-slate-850 p-2 rounded-xl">
                  <span className="text-[9px] uppercase text-slate-500 block">Current Budget</span>
                  <span className="text-xs font-bold text-slate-300">{formatCareerCurrency(save.finances.transferBudget, save.settings.currency)}</span>
                </div>
                <div className="bg-emerald-950/50 border border-emerald-500/40 p-2 rounded-xl">
                  <span className="text-[9px] uppercase text-emerald-400 block">+ Prize Money</span>
                  <span className="text-xs font-bold text-emerald-300">+{formatCareerCurrency(seasonSummary.prizeMoney, save.settings.currency)}</span>
                </div>
                <div className="bg-slate-950/70 border border-emerald-500/50 p-2 rounded-xl">
                  <span className="text-[9px] uppercase text-emerald-400 block">New Season Budget</span>
                  <span className="text-xs font-bold text-emerald-400">{formatCareerCurrency(save.finances.transferBudget + seasonSummary.prizeMoney, save.settings.currency)}</span>
                </div>
              </div>
            </div>

            {/* Squad Progression & Veteran Aging Logs */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 space-y-2">
              <div className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <span>🌱</span> Squad Development &amp; Wonderkid Growth
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Players age by 1 year. Under-23 wonderkids experience rapid attribute development, while veterans gradually decline. Summer fitness resets to 100%.
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] text-slate-300 divide-y divide-slate-850/60 pt-1">
                {seasonSummary.progressionReport.logs.slice(0, 8).map((log, idx) => (
                  <div key={idx} className="py-1">
                    {log}
                  </div>
                ))}
                {seasonSummary.progressionReport.logs.length > 8 && (
                  <div className="text-[10px] text-slate-500 pt-1">
                    + {seasonSummary.progressionReport.logs.length - 8} more player development logs
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSeasonReviewModal(false)}
                className="py-3 px-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-400 text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowSeasonReviewModal(false);
                  handleAdvanceToNextSeasonAction();
                }}
                disabled={simulating}
                className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚀 Kick Off Season {save.season.seasonNumber + 1} (Collect Prize Money)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fast Forward Confirmation Modal */}
      {pendingFastForward && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 motion-reduce:transition-none"
        >
          <div className="bg-slate-950 border border-emerald-500/40 rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-5 shadow-2xl text-left relative">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider font-display">
                  Calendar Fast Forward Confirmation
                </span>
                <h3 className="text-xl font-display font-black text-white uppercase tracking-tight">
                  {getFastForwardDetails(pendingFastForward).title}
                </h3>
              </div>
              <button
                onClick={() => setPendingFastForward(null)}
                className="text-slate-500 hover:text-white p-1 rounded-lg text-sm"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400 uppercase font-bold">Target Stop Date</span>
                <span className="font-mono font-bold text-emerald-400">
                  {getFastForwardDetails(pendingFastForward).targetDate}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed pt-1">
                {getFastForwardDetails(pendingFastForward).description}
              </p>
            </div>

            <label className="flex items-start gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-xl cursor-pointer hover:border-emerald-500/40 transition-colors">
              <input
                type="checkbox"
                checked={fastForwardUsePreferredEleven}
                onChange={(e) => setFastForwardUsePreferredEleven(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700 cursor-pointer"
              />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-200">Use preferred starting 11</span>
                <span className="text-[10px] text-slate-400">Deploy your chosen starting eleven lineup for all fixtures simulated while away</span>
              </div>
            </label>

            <aside aria-label="Caution note" className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-[11px] text-amber-300/90 flex items-center gap-2">
              <span>⚠️</span>
              <span>
                Simulated matches are permanent unless &quot;Allow Match Retry&quot; is active in your career settings.
              </span>
            </aside>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setPendingFastForward(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const target = pendingFastForward;
                  setPendingFastForward(null);
                  handleTimeSkipAction(target, { usePreferredEleven: fastForwardUsePreferredEleven });
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Confirm &amp; Fast Forward
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Sacked Board Dismissal Modal */}
      {save.boardStatus?.status === 'sacked' && save.settings.boardCanSack && !dismissedSackedModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div className="bg-slate-950 border border-rose-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl text-center relative">
            <span className="text-5xl block">⚠️</span>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider">
                Board of Directors Executive Notice
              </span>
              <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                Contract Terminated
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                The Board of Directors of {effectiveClubName} has officially relieved you of your duties as first-team manager following an unacceptable run of league results and failure to meet seasonal expectations.
              </p>
            </div>

            <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 text-xs space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-500">Board Confidence</div>
              <div className="text-xl font-display font-black text-rose-400">0% (Dismissed)</div>
              <div className="text-[10px] text-slate-400 font-medium">Club Objective Failed</div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/career"
                className="w-full py-3 px-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 font-display font-black text-xs uppercase tracking-wider transition-all"
              >
                Accept Dismissal & Resign
              </Link>
              <button
                onClick={() => {
                  const restoredSave: CareerSaveFile = {
                    ...save,
                    boardStatus: {
                      confidence: 45,
                      expectation: 'Urgent Results Required',
                      status: 'under_pressure',
                      warningsCount: 2,
                    },
                  };
                  handleUpdateSave(restoredSave);
                  setDismissedSackedModal(true);
                  showToast('Board granted one final probation period. Deliver results immediately.');
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
              >
                Appeal to Board (One Final Chance)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Player Comparison Modal */}
      {comparisonState.isOpen && comparisonState.playerA && save && (
        <PlayerComparisonModal
          isOpen={comparisonState.isOpen}
          onClose={() => setComparisonState({ isOpen: false, playerA: undefined, playerB: undefined })}
          playerA={comparisonState.playerA}
          playerB={comparisonState.playerB}
          squad={save.squad || []}
          marketPlayers={fullMarketPool}
          shortlistedPlayers={shortlistedPool}
          finances={save.finances}
          seniorCount={seniorCount}
          settings={save.settings}
          onSwapSquadPlayers={(starterId: string, benchId: string) => {
            handleSwapLineup(starterId, benchId);
          }}
          onSelectTransferTarget={(targetPlayer: MarketPlayer) => {
            setComparisonState({ isOpen: false, playerA: undefined, playerB: undefined });
            setTransferHubSubTab('market');
            setActiveTab('transfers');
          }}
          onNavigateOfficeBudget={() => {
            setComparisonState({ isOpen: false, playerA: undefined, playerB: undefined });
            setTransferHubSubTab('board');
            setActiveTab('transfers');
          }}
        />
      )}

      {/* 25-Man Squad Registration Modal */}
      {showRegistrationModal && save && (
        <SquadRegistrationModal
          isOpen={showRegistrationModal}
          onClose={() => setShowRegistrationModal(false)}
          squad={save.squad}
          registeredPlayerIds={save.registeredPlayerIds}
          onSaveRegistration={(updatedIds) => {
            const updated: CareerSaveFile = {
              ...save,
              registeredPlayerIds: updatedIds,
            };
            handleUpdateSave(updated);
            showToast('Squad registration submitted successfully.');
          }}
        />
      )}
    </div>
  );
}

export default function CareerPlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-display font-black uppercase text-sm">
          Loading Manager Office...
        </div>
      }
    >
      <CareerPlayHubContent />
    </Suspense>
  );
}
