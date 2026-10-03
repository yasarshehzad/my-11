import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Player, 
  FormationType, 
  SimulationResult, 
  MatchSimResult, 
  ChallengeTemplate, 
  StreakStats 
} from '../types/game';
import { 
  FORMATION_SLOTS, 
  getDraftOptions, 
  calculateSquadStats, 
  simulateLeagueSeason,
  DAILY_CHALLENGES,
  createSeedableRandom,
  getDetailedChemistryLogs,
  generateRandomSquad
} from '../utils/gameLogic';
import { players } from '../data/players';
import { 
  logGameStarted, 
  logFormationSelected, 
  logPlayerSelected, 
  logDraftCompleted, 
  logDailyChallengeStarted, 
  logDailyChallengeCompleted 
} from '../utils/analytics';
import { 
  getSavedStreaks, 
  saveStreaks, 
  getDailyChallengeStatus, 
  saveDailyChallengeStatus, 
  DailyChallengeStatus 
} from '../utils/storage';

export type GamePhase = 'home' | 'formation' | 'draft' | 'simulating' | 'results';

export function useDraftGame() {
  // --- Game Lifecycle State ---
  const [phase, setPhase] = useState<GamePhase>('home');
  const [formation, setFormation] = useState<FormationType | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string>('english');
  const [selectedPlayers, setSelectedPlayers] = useState<(Player | null)[]>(Array(11).fill(null));
  const [currentSlotIndex, setCurrentSlotIndex] = useState<number>(0);
  const [draftOptions, setDraftOptions] = useState<[Player, Player, Player] | null>(null);
  const [stats, setStats] = useState({ attack: 0, midfield: 0, defence: 0, chemistry: 0, overall: 0 });
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  // --- Toggles & Modes ---
  const [draftIQMode, setDraftIQMode] = useState<boolean>(false);
  const [rerollsRemaining, setRerollsRemaining] = useState<number>(3);
  const [freeSearchEnabled, setFreeSearchEnabled] = useState<boolean>(false);
  const [showcasePlayer, setShowcasePlayer] = useState<Player | null>(null);

  // --- Daily Challenge & Streaks ---
  const [isDailyChallenge, setIsDailyChallenge] = useState(false);
  const [todayChallenge, setTodayChallenge] = useState<ChallengeTemplate | null>(null);
  const [todayDateStr, setTodayDateStr] = useState<string>('');
  const [challengeBeaten, setChallengeBeaten] = useState(false);
  const [showFixturesBreakdown, setShowFixturesBreakdown] = useState(false);

  // --- Search & Custom Filters ---
  const [draftTab, setDraftTab] = useState<'recommended' | 'search'>('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState('');
  const [selectedEra, setSelectedEra] = useState('');
  const [onlyMatchingPosition, setOnlyMatchingPosition] = useState(true);

  // --- Stored Stats & Status ---
  const [streakStats, setStreakStats] = useState<StreakStats>({
    gamesPlayed: 0,
    bestPoints: 0,
    perfectSeasons: 0,
    dailyChallengesCompleted: 0,
    currentDailyStreak: 0,
    lastPlayedDate: '',
  });

  const [dailyStatus, setDailyStatus] = useState<DailyChallengeStatus>({
    completed: false,
    score: 0,
    beaten: false,
  });

  // --- Micro-interaction Toast ---
  const [chemistryToast, setChemistryToast] = useState<{
    text: string;
    type: 'positive' | 'negative';
  } | null>(null);

  // --- Live Simulation Animation States ---
  const [simIndex, setSimIndex] = useState<number>(0);
  const [liveWins, setLiveWins] = useState(0);
  const [liveDraws, setLiveDraws] = useState(0);
  const [liveLosses, setLiveLosses] = useState(0);
  const [livePoints, setLivePoints] = useState(0);
  const [liveGoalsFor, setLiveGoalsFor] = useState(0);
  const [liveGoalsAgainst, setLiveGoalsAgainst] = useState(0);
  const [liveMatches, setLiveMatches] = useState<MatchSimResult[]>([]);

  // Safe DOM transition helper
  const transitionDOM = useCallback((updateFn: () => void) => {
    if (typeof document !== 'undefined' && (document as any).startViewTransition) {
      (document as any).startViewTransition(updateFn);
    } else {
      updateFn();
    }
  }, []);

  // ==========================================
  // INITIAL LOAD
  // ==========================================
  useEffect(() => {
    // 1. Get today's local date YYYY-MM-DD
    const today = new Date();
    const YYYY = today.getFullYear();
    const MM = String(today.getMonth() + 1).padStart(2, '0');
    const DD = String(today.getDate()).padStart(2, '0');
    const dateStr = `${YYYY}-${MM}-${DD}`;
    setTodayDateStr(dateStr);

    // 2. Set today's challenge
    const day = today.getDay(); // 0 = Sun, ..., 6 = Sat
    setTodayChallenge(DAILY_CHALLENGES[day]);

    // 3. Load stats, streaks and daily status via storage utility
    setStreakStats(getSavedStreaks());
    setDailyStatus(getDailyChallengeStatus(dateStr));

    // 4. Select a random legend for showcase
    const legends = players.filter((p) => p.isLegendaryPlayer || p.rarity === 'legend');
    if (legends.length > 0) {
      const randomIndex = Math.floor(Math.random() * legends.length);
      setShowcasePlayer(legends[randomIndex]);
    }
  }, []);

  // Reset scroll to top on screen/phase transitions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [phase]);

  // Reset search filters when target slot changes
  useEffect(() => {
    setSearchQuery('');
    setSelectedClub('');
    setSelectedEra('');
    setOnlyMatchingPosition(true);
    setDraftTab('recommended');
  }, [currentSlotIndex]);

  // Unique list of clubs and eras for dropdown filters
  const allClubs = useMemo(() => {
    return Array.from(new Set(players.map((p) => p.club))).sort();
  }, []);

  const allEras = useMemo(() => {
    return Array.from(new Set(players.map((p) => p.era))).sort();
  }, []);

  const satisfiesChallenge = useCallback((player: Player) => {
    if (!isDailyChallenge || !todayChallenge) return true;
    const rule = todayChallenge.rule;
    switch (rule) {
      case 'only_2000s':
        return player.era === '00s';
      case 'underdog_xi':
        return player.rarity === 'common' || player.rarity === 'rare';
      case 'no_legends':
        return !player.isLegendaryPlayer;
      case 'under_90_rating':
        return player.rating < 90;
      case 'only_modern':
        return player.era === 'Modern';
      default:
        return true;
    }
  }, [isDailyChallenge, todayChallenge]);

  const getFilteredPlayers = useCallback(() => {
    if (!formation) return [];
    const slots = FORMATION_SLOTS[formation];
    const targetSlot = slots[currentSlotIndex];
    if (!targetSlot) return [];

    const draftedIds = new Set(
      selectedPlayers.filter((p): p is Player => p !== null).map((p) => p.id)
    );

    let list = players.filter((p) => !draftedIds.has(p.id) && satisfiesChallenge(p));

    // 1. Position Filter
    if (onlyMatchingPosition) {
      list = list.filter(
        (p) =>
          p.primaryPosition === targetSlot.position ||
          p.secondaryPositions.includes(targetSlot.position)
      );
    }

    // 2. Query Search (Name, Club, Season)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          p.playerName.toLowerCase().includes(q) ||
          p.club.toLowerCase().includes(q) ||
          p.season.toLowerCase().includes(q)
      );
    }

    // 3. Dropdown Club Filter
    if (selectedClub !== '') {
      list = list.filter((p) => p.club === selectedClub);
    }

    // 4. Dropdown Era Filter
    if (selectedEra !== '') {
      list = list.filter((p) => p.era === selectedEra);
    }

    // Sort by rating descending
    list.sort((a, b) => b.rating - a.rating);

    return list.slice(0, 24); // Top 24 results
  }, [formation, currentSlotIndex, selectedPlayers, satisfiesChallenge, onlyMatchingPosition, searchQuery, selectedClub, selectedEra]);

  // ==========================================
  // GAMEPLAY ACTIONS
  // ==========================================

  // --- Start Draft (Standard Mode) ---
  const handleStartDraft = useCallback(() => {
    logGameStarted();
    transitionDOM(() => {
      setIsDailyChallenge(false);
      setFormation(null);
      setSelectedPlayers(Array(11).fill(null));
      setCurrentSlotIndex(0);
      setDraftOptions(null);
      setRerollsRemaining(3);
      setStats({ attack: 0, midfield: 0, defence: 0, chemistry: 0, overall: 0 });
      setSimResult(null);
      setPhase('formation');
    });
  }, [transitionDOM]);

  // --- Start Daily Challenge ---
  const handlePlayDailyChallenge = useCallback(() => {
    if (!todayChallenge) return;
    logDailyChallengeStarted(todayChallenge.title);
    
    transitionDOM(() => {
      setIsDailyChallenge(true);
      setFormation(null);
      setSelectedPlayers(Array(11).fill(null));
      setCurrentSlotIndex(0);
      setDraftOptions(null);
      setRerollsRemaining(3);
      setFreeSearchEnabled(false);
      setStats({ attack: 0, midfield: 0, defence: 0, chemistry: 0, overall: 0 });
      setSimResult(null);
      setPhase('formation');
    });
  }, [todayChallenge, transitionDOM]);

  // --- Start Random Draft & Simulate ---
  const handleRandomDraft = useCallback((forceDailyRule?: boolean) => {
    logGameStarted();
    transitionDOM(() => {
      const useChallenge = forceDailyRule !== undefined ? forceDailyRule : isDailyChallenge;
      setIsDailyChallenge(useChallenge);

      // 1. Pick a random formation
      const formationsList: FormationType[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'];
      const randomFormation = formationsList[Math.floor(Math.random() * formationsList.length)];
      setFormation(randomFormation);
      
      // 2. Generate random eligible unique squad
      const rule = useChallenge && todayChallenge ? todayChallenge.rule : undefined;
      const randomSquad = generateRandomSquad(randomFormation, rule, selectedLeague);
      setSelectedPlayers(randomSquad);
      setCurrentSlotIndex(11);
      setDraftOptions(null);
      setRerollsRemaining(3);
      
      // 3. Calculate team stats
      const slots = FORMATION_SLOTS[randomFormation];
      const newStats = calculateSquadStats(randomSquad, slots);
      setStats(newStats);
      
      // 4. Simulate season
      const result = simulateLeagueSeason(randomSquad, newStats, selectedLeague, undefined, slots);
      setSimResult(result);
      
      // 5. Reset live simulation counters
      setSimIndex(0);
      setLiveWins(0);
      setLiveDraws(0);
      setLiveLosses(0);
      setLivePoints(0);
      setLiveGoalsFor(0);
      setLiveGoalsAgainst(0);
      setLiveMatches([]);
      
      // 6. Navigate to draft screen to review the random team first
      setPhase('draft');
    });
  }, [isDailyChallenge, todayChallenge, selectedLeague, transitionDOM]);

  // --- Selection of Formation ---
  const handleSelectFormation = useCallback((form: FormationType) => {
    setFormation(form);
  }, []);

  // --- Confirm Tactical Settings & Start Draft ---
  const handleConfirmTactics = useCallback(() => {
    if (!formation) return;
    logFormationSelected(formation);
    transitionDOM(() => {
      const slots = FORMATION_SLOTS[formation];

      // If Daily Challenge, use date-based seed
      let options: [Player, Player, Player];
      if (isDailyChallenge && todayChallenge) {
        const seedValue = parseInt(todayDateStr.replace(/-/g, ''), 10);
        const randFn = createSeedableRandom(seedValue + 0 * 1000);
        options = getDraftOptions(slots[0].position, Array(11).fill(null), randFn, todayChallenge.rule, selectedLeague);
      } else {
        options = getDraftOptions(slots[0].position, Array(11).fill(null), undefined, undefined, selectedLeague);
      }

      setDraftOptions(options);
      setPhase('draft');
    });
  }, [formation, isDailyChallenge, todayChallenge, todayDateStr, selectedLeague, transitionDOM]);

  // --- Reroll Draft Choices ---
  const handleRerollOptions = useCallback(() => {
    if (rerollsRemaining <= 0 || !formation || currentSlotIndex >= 11) return;

    const slots = FORMATION_SLOTS[formation];
    const newRerolls = rerollsRemaining - 1;
    setRerollsRemaining(newRerolls);

    let options: [Player, Player, Player];
    if (isDailyChallenge && todayChallenge) {
      const seedValue = parseInt(todayDateStr.replace(/-/g, ''), 10);
      const randFn = createSeedableRandom(seedValue + currentSlotIndex * 1000 + (3 - newRerolls) * 50000);
      options = getDraftOptions(slots[currentSlotIndex].position, selectedPlayers, randFn, todayChallenge.rule, selectedLeague);
    } else {
      options = getDraftOptions(slots[currentSlotIndex].position, selectedPlayers, undefined, undefined, selectedLeague);
    }

    setDraftOptions(options);
  }, [rerollsRemaining, formation, currentSlotIndex, isDailyChallenge, todayChallenge, todayDateStr, selectedPlayers, selectedLeague]);

  // --- Undo Pick ---
  const handleUndoPick = useCallback(() => {
    if (!formation) return;
    const targetIndex = currentSlotIndex >= 11 ? 10 : currentSlotIndex - 1;
    if (targetIndex < 0) return;
    const slots = FORMATION_SLOTS[formation];

    const updatedSelection = [...selectedPlayers];
    updatedSelection[targetIndex] = null;
    setSelectedPlayers(updatedSelection);
    setCurrentSlotIndex(targetIndex);
    setSimResult(null);

    const newStats = calculateSquadStats(updatedSelection, slots);
    setStats(newStats);

    let prevOptions: [Player, Player, Player];
    if (isDailyChallenge && todayChallenge) {
      const seedValue = parseInt(todayDateStr.replace(/-/g, ''), 10);
      const randFn = createSeedableRandom(seedValue + targetIndex * 1000);
      prevOptions = getDraftOptions(slots[targetIndex].position, updatedSelection, randFn, todayChallenge.rule, selectedLeague);
    } else {
      prevOptions = getDraftOptions(slots[targetIndex].position, updatedSelection, undefined, undefined, selectedLeague);
    }
    setDraftOptions(prevOptions);
  }, [formation, currentSlotIndex, selectedPlayers, isDailyChallenge, todayChallenge, todayDateStr, selectedLeague]);

  // --- Select Player and Draft ---
  const handleSelectPlayer = useCallback((player: Player) => {
    if (!formation) return;
    const slots = FORMATION_SLOTS[formation];
    logPlayerSelected(player.displayName, slots[currentSlotIndex]?.label || '');

    // Compute previous chemistry logs
    const prevLogs = getDetailedChemistryLogs(selectedPlayers, slots);
    const prevChemistry = selectedPlayers.filter(p => p !== null).length === 0 ? 0 : calculateSquadStats(selectedPlayers, slots).chemistry;
    
    // Update selection
    const updatedSelection = [...selectedPlayers];
    updatedSelection[currentSlotIndex] = player;
    setSelectedPlayers(updatedSelection);

    // Compute new chemistry details
    const newStats = calculateSquadStats(updatedSelection, slots);
    setStats(newStats);
    const newLogs = getDetailedChemistryLogs(updatedSelection, slots);

    // Dynamic chemistry feedback toast calculations
    const chemDelta = newStats.chemistry - prevChemistry;
    if (selectedPlayers.filter(p => p !== null).length > 0 && chemDelta !== 0) {
      let reasonMessage = '';
      if (player.primaryPosition !== slots[currentSlotIndex].position) {
        reasonMessage = `Out of position: -${Math.abs(chemDelta)} Chem`;
      } else {
        const uniqueNewLog = newLogs.find((nLog) => !prevLogs.some((pLog) => pLog.reason === nLog.reason));
        if (uniqueNewLog) {
          reasonMessage = `${uniqueNewLog.reason}: +${uniqueNewLog.delta} Chem`;
        } else {
          reasonMessage = chemDelta > 0 ? `+${chemDelta} Chemistry Link` : `-${Math.abs(chemDelta)} Chemistry`;
        }
      }

      setChemistryToast({
        text: reasonMessage,
        type: chemDelta > 0 ? 'positive' : 'negative',
      });

      // Clear toast after 2.5s
      setTimeout(() => setChemistryToast(null), 2500);
    }

    const nextIndex = currentSlotIndex + 1;
    if (nextIndex < 11) {
      setCurrentSlotIndex(nextIndex);
      
      // Determine next options
      let nextOptions: [Player, Player, Player];
      if (isDailyChallenge && todayChallenge) {
        const seedValue = parseInt(todayDateStr.replace(/-/g, ''), 10);
        const randFn = createSeedableRandom(seedValue + nextIndex * 1000);
        nextOptions = getDraftOptions(slots[nextIndex].position, updatedSelection, randFn, todayChallenge.rule, selectedLeague);
      } else {
        nextOptions = getDraftOptions(slots[nextIndex].position, updatedSelection, undefined, undefined, selectedLeague);
      }
      setDraftOptions(nextOptions);
    } else {
      // Draft complete! Compile final results
      const finalPlayers = updatedSelection.filter((p): p is Player => p !== null);
      const result = simulateLeagueSeason(finalPlayers, newStats, selectedLeague, undefined, slots);
      logDraftCompleted(newStats.overall, newStats.chemistry);
      setSimResult(result);
    }
  }, [formation, currentSlotIndex, selectedPlayers, isDailyChallenge, todayChallenge, todayDateStr, selectedLeague]);

  // --- Begin League Season Simulation ---
  const startSimulation = useCallback(() => {
    if (!simResult) return;
    
    setPhase('simulating');
    setSimIndex(0);
    setLiveWins(0);
    setLiveDraws(0);
    setLiveLosses(0);
    setLivePoints(0);
    setLiveGoalsFor(0);
    setLiveGoalsAgainst(0);
    setLiveMatches([]);
  }, [simResult]);

  // --- Simulation ticking loop ---
  useEffect(() => {
    if (phase !== 'simulating' || !simResult) return;

    if (simIndex < 38) {
      const timer = setTimeout(() => {
        const match = simResult.matches[simIndex];
        
        setLiveMatches((prev) => [match, ...prev]);
        setLiveGoalsFor((prev) => prev + match.ourScore);
        setLiveGoalsAgainst((prev) => prev + match.opponentScore);

        if (match.outcome === 'W') {
          setLiveWins((prev) => prev + 1);
          setLivePoints((prev) => prev + 3);
        } else if (match.outcome === 'D') {
          setLiveDraws((prev) => prev + 1);
          setLivePoints((prev) => prev + 1);
        } else {
          setLiveLosses((prev) => prev + 1);
        }

        setSimIndex((prev) => prev + 1);
      }, 75);

      return () => clearTimeout(timer);
    }
  }, [phase, simIndex, simResult]);

  // --- Save Campaign Results ---
  const handleSaveCampaignResults = useCallback(() => {
    if (!simResult) return;

    // 1. Calculate challenge beaten status
    let isBeaten = false;
    if (isDailyChallenge && todayChallenge) {
      if (todayChallenge.rule === 'underdog_xi') {
        isBeaten = simResult.points >= 50;
      } else if (todayChallenge.rule === 'best_defence') {
        isBeaten = simResult.points >= 60 && stats.defence >= 88;
      } else {
        isBeaten = simResult.points >= 60;
      }
      setChallengeBeaten(isBeaten);
    }

    // 2. Load latest streaks object and increment
    const newStreakStats = { ...streakStats };
    newStreakStats.gamesPlayed += 1;
    if (simResult.points > newStreakStats.bestPoints) {
      newStreakStats.bestPoints = simResult.points;
    }
    if (simResult.wins === 38) {
      newStreakStats.perfectSeasons += 1;
    }

    // 3. Daily Streak calculations
    if (isDailyChallenge && todayChallenge) {
      const today = todayDateStr;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const YYYY = yesterday.getFullYear();
      const MM = String(yesterday.getMonth() + 1).padStart(2, '0');
      const DD = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${YYYY}-${MM}-${DD}`;

      if (newStreakStats.lastPlayedDate === yesterdayStr) {
        newStreakStats.currentDailyStreak += 1;
      } else if (newStreakStats.lastPlayedDate !== today) {
        newStreakStats.currentDailyStreak = 1;
      }

      newStreakStats.lastPlayedDate = today;

      if (isBeaten && !dailyStatus.beaten) {
        newStreakStats.dailyChallengesCompleted += 1;
      }

      // Save today's challenge score
      const challengeScore = stats.overall + simResult.points + (isBeaten ? 50 : 0);
      const statusUpdate: DailyChallengeStatus = { completed: true, score: challengeScore, beaten: isBeaten };
      setDailyStatus(statusUpdate);
      logDailyChallengeCompleted(todayChallenge.title, isBeaten, challengeScore);
      saveDailyChallengeStatus(todayDateStr, statusUpdate);
    }

    // 4. Save and set state
    setStreakStats(newStreakStats);
    saveStreaks(newStreakStats);
  }, [simResult, isDailyChallenge, todayChallenge, stats.defence, stats.overall, streakStats, todayDateStr, dailyStatus.beaten]);

  // Return to homepage
  const returnHome = useCallback(() => {
    transitionDOM(() => {
      setPhase('home');
    });
  }, [transitionDOM]);

  const proceedToResults = useCallback(() => {
    handleSaveCampaignResults();
    transitionDOM(() => {
      setPhase('results');
    });
  }, [handleSaveCampaignResults, transitionDOM]);

  return {
    // State
    phase,
    setPhase,
    formation,
    selectedLeague,
    setSelectedLeague,
    selectedPlayers,
    currentSlotIndex,
    draftOptions,
    stats,
    simResult,
    draftIQMode,
    setDraftIQMode,
    rerollsRemaining,
    freeSearchEnabled,
    setFreeSearchEnabled,
    showcasePlayer,
    isDailyChallenge,
    todayChallenge,
    todayDateStr,
    challengeBeaten,
    showFixturesBreakdown,
    setShowFixturesBreakdown,
    draftTab,
    setDraftTab,
    searchQuery,
    setSearchQuery,
    selectedClub,
    setSelectedClub,
    selectedEra,
    setSelectedEra,
    onlyMatchingPosition,
    setOnlyMatchingPosition,
    streakStats,
    dailyStatus,
    chemistryToast,
    simIndex,
    liveWins,
    liveDraws,
    liveLosses,
    livePoints,
    liveGoalsFor,
    liveGoalsAgainst,
    liveMatches,
    allClubs,
    allEras,
    getFilteredPlayers,

    // Handlers
    handleStartDraft,
    handlePlayDailyChallenge,
    handleRandomDraft,
    handleSelectFormation,
    handleConfirmTactics,
    handleRerollOptions,
    handleUndoPick,
    handleSelectPlayer,
    startSimulation,
    handleSaveCampaignResults,
    proceedToResults,
    returnHome,
  };
}
