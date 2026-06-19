'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Player, FormationType, SimulationResult, MatchSimResult, ChallengeTemplate, StreakStats } from '../types/game';
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
import { PlayerCard } from '../components/PlayerCard';
import { PitchLayout } from '../components/PitchLayout';
import { StatsDisplay } from '../components/StatsDisplay';
import { SharePreview } from '../components/SharePreview';
import { ShareCardExport } from '../components/ShareCardExport';
import { players } from '../data/players';
import { 
  logGameStarted, 
  logFormationSelected, 
  logPlayerSelected, 
  logDraftCompleted, 
  logDailyChallengeStarted, 
  logDailyChallengeCompleted 
} from '../utils/analytics';

export default function DraftedXIGame() {
  // --- Game State ---
  const [phase, setPhase] = useState<'home' | 'formation' | 'draft' | 'simulating' | 'results'>('home');
  const [formation, setFormation] = useState<FormationType | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string>('english');
  const [selectedPlayers, setSelectedPlayers] = useState<(Player | null)[]>(Array(11).fill(null));
  const [currentSlotIndex, setCurrentSlotIndex] = useState<number>(0);
  const [draftOptions, setDraftOptions] = useState<[Player, Player, Player] | null>(null);
  const [stats, setStats] = useState({ attack: 0, midfield: 0, defence: 0, chemistry: 0, overall: 0 });
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  // --- Theme, Tutorial and IQ Mode States ---
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showTutorial, setShowTutorial] = useState(false);
  const [draftIQMode, setDraftIQMode] = useState<boolean>(false);
  const [rerollsRemaining, setRerollsRemaining] = useState<number>(3);
  const [freeSearchEnabled, setFreeSearchEnabled] = useState<boolean>(false);
  const [showcasePlayer, setShowcasePlayer] = useState<Player | null>(null);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('drafted_xi_theme', nextTheme);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
  };

  const handleCloseTutorial = (dontShowAgain: boolean) => {
    setShowTutorial(false);
    if (dontShowAgain) {
      try {
        localStorage.setItem('drafted_xi_hide_tutorial', 'true');
      } catch (e) {
        console.warn('Failed to save tutorial preference:', e);
      }
    }
  };

  // --- Upgrade: Challenge & Streaks States ---
  const [isDailyChallenge, setIsDailyChallenge] = useState(false);
  const [todayChallenge, setTodayChallenge] = useState<ChallengeTemplate | null>(null);
  const [todayDateStr, setTodayDateStr] = useState<string>('');
  const [challengeBeaten, setChallengeBeaten] = useState(false);
  const [showFixturesBreakdown, setShowFixturesBreakdown] = useState(false);

  // --- Search & custom filters State ---
  const [draftTab, setDraftTab] = useState<'recommended' | 'search'>('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState('');
  const [selectedEra, setSelectedEra] = useState('');
  const [onlyMatchingPosition, setOnlyMatchingPosition] = useState(true);
  
  const [streakStats, setStreakStats] = useState<StreakStats>({
    gamesPlayed: 0,
    bestPoints: 0,
    perfectSeasons: 0,
    dailyChallengesCompleted: 0,
    currentDailyStreak: 0,
    lastPlayedDate: '',
  });

  const [dailyStatus, setDailyStatus] = useState<{ completed: boolean; score: number; beaten: boolean }>({
    completed: false,
    score: 0,
    beaten: false,
  });

  // --- Upgrade: Visible Chemistry Toast Notification ---
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
  
  const simTickerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiAnimRef = useRef<number | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  // ==========================================
  // INITS & LOCALSTORAGE LOADING
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

    // 3. Load stats & streaks from localStorage safely
    let savedStreaks = null;
    try {
      savedStreaks = localStorage.getItem('drafted_xi_streaks');
    } catch (e) {
      console.warn('localStorage getItem (streaks) failed/blocked:', e);
    }
    if (savedStreaks) {
      try {
        setStreakStats(JSON.parse(savedStreaks));
      } catch (e) {
        console.error('Failed to parse streaks', e);
      }
    }

    // 4. Load today's challenge status safely
    let savedChallengeStatus = null;
    try {
      savedChallengeStatus = localStorage.getItem(`drafted_xi_challenge_${dateStr}`);
    } catch (e) {
      console.warn('localStorage getItem (challenge status) failed/blocked:', e);
    }
    if (savedChallengeStatus) {
      try {
        setDailyStatus(JSON.parse(savedChallengeStatus));
      } catch (e) {
        console.error('Failed to parse daily challenge status', e);
      }
    }

    // 5. Load theme and tutorial preferences safely
    let savedTheme = 'dark';
    let hideTutorial = false;
    try {
      savedTheme = localStorage.getItem('drafted_xi_theme') || 'dark';
      hideTutorial = localStorage.getItem('drafted_xi_hide_tutorial') === 'true';
    } catch (e) {
      console.warn('localStorage theme/tutorial failed:', e);
    }
    setTheme(savedTheme as 'dark' | 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (!hideTutorial) {
      setShowTutorial(true);
    }

    // Select a random legend from database for Home showcase
    const legends = players.filter((p) => p.isLegendaryPlayer || p.rarity === 'legend');
    if (legends.length > 0) {
      const randomIndex = Math.floor(Math.random() * legends.length);
      setShowcasePlayer(legends[randomIndex]);
    }
  }, []);

  // Reset scroll to top on screen/phase transitions
  useEffect(() => {
    window.scrollTo(0, 0);
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
  const allClubs = React.useMemo(() => {
    return Array.from(new Set(players.map((p) => p.club))).sort();
  }, []);

  const allEras = React.useMemo(() => {
    return Array.from(new Set(players.map((p) => p.era))).sort();
  }, []);

  const satisfiesChallenge = (player: Player) => {
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
  };

  const getFilteredPlayers = () => {
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
  };

  // ==========================================
  // GAMEPLAY ACTIONS
  // ==========================================

  // --- Start Draft (Standard Mode) ---
  const handleStartDraft = () => {
    logGameStarted();
    const updateDOM = () => {
      setIsDailyChallenge(false);
      setFormation(null);
      setSelectedPlayers(Array(11).fill(null));
      setCurrentSlotIndex(0);
      setDraftOptions(null);
      setRerollsRemaining(3);
      setStats({ attack: 0, midfield: 0, defence: 0, chemistry: 0, overall: 0 });
      setSimResult(null);
      setPhase('formation');
    };

    if (document.startViewTransition) {
      document.startViewTransition(updateDOM);
    } else {
      updateDOM();
    }
  };

  // --- Start Daily Challenge ---
  const handlePlayDailyChallenge = () => {
    if (!todayChallenge) return;
    logDailyChallengeStarted(todayChallenge.title);
    
    const updateDOM = () => {
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
    };

    if (document.startViewTransition) {
      document.startViewTransition(updateDOM);
    } else {
      updateDOM();
    }
  };

  // --- Start Random Draft & Simulate ---
  const handleRandomDraft = (forceDailyRule?: boolean) => {
    logGameStarted();
    const updateDOM = () => {
      const useChallenge = forceDailyRule !== undefined ? forceDailyRule : isDailyChallenge;
      setIsDailyChallenge(useChallenge);

      // 1. Pick a random formation
      const formations: FormationType[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'];
      const randomFormation = formations[Math.floor(Math.random() * formations.length)];
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
      const result = simulateLeagueSeason(randomSquad, newStats, selectedLeague);
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
    };

    if (document.startViewTransition) {
      document.startViewTransition(updateDOM);
    } else {
      updateDOM();
    }
  };

  // --- Selection of Formation ---
  const handleSelectFormation = (form: FormationType) => {
    setFormation(form);
  };

  // --- Confirm Tactical Settings & Start Draft ---
  const handleConfirmTactics = () => {
    if (!formation) return;
    logFormationSelected(formation);
    const updateDOM = () => {
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
    };

    if (document.startViewTransition) {
      document.startViewTransition(updateDOM);
    } else {
      updateDOM();
    }
  };

  // --- Reroll Draft Choices ---
  const handleRerollOptions = () => {
    if (rerollsRemaining <= 0 || !formation || currentSlotIndex >= 11) return;

    const slots = FORMATION_SLOTS[formation];
    const newRerolls = rerollsRemaining - 1;
    setRerollsRemaining(newRerolls);

    let options: [Player, Player, Player];
    if (isDailyChallenge && todayChallenge) {
      const seedValue = parseInt(todayDateStr.replace(/-/g, ''), 10);
      // Incorporate the reroll count into the seed so it remains deterministic for daily challenges
      const randFn = createSeedableRandom(seedValue + currentSlotIndex * 1000 + (3 - newRerolls) * 50000);
      options = getDraftOptions(slots[currentSlotIndex].position, selectedPlayers, randFn, todayChallenge.rule, selectedLeague);
    } else {
      options = getDraftOptions(slots[currentSlotIndex].position, selectedPlayers, undefined, undefined, selectedLeague);
    }

    setDraftOptions(options);
  };

  // --- Select Player and Draft ---
  const handleSelectPlayer = (player: Player) => {
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
      const result = simulateLeagueSeason(finalPlayers, newStats, selectedLeague);
      logDraftCompleted(newStats.overall, newStats.chemistry);
      setSimResult(result);
    }
  };

  // --- Begin League Season Simulation ---
  const startSimulation = () => {
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
  };

  // --- Handle simulation ticking ---
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
    } else {
      // Simulation complete! Save outcomes is handled manually via the proceed button click.
    }
  }, [phase, simIndex, simResult]);

  // --- Auto-scroll ticker ---
  useEffect(() => {
    if (simTickerRef.current) {
      simTickerRef.current.scrollTop = 0;
    }
  }, [liveMatches]);

  // ==========================================
  // STREAKS & LOCALSTORAGE SAVER
  // ==========================================
  const handleSaveCampaignResults = () => {
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

    // 2. Load latest streaks object
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
      const statusUpdate = { completed: true, score: challengeScore, beaten: isBeaten };
      setDailyStatus(statusUpdate);
      logDailyChallengeCompleted(todayChallenge.title, isBeaten, challengeScore);
      try {
        localStorage.setItem(`drafted_xi_challenge_${todayDateStr}`, JSON.stringify(statusUpdate));
      } catch (e) {
        console.warn('localStorage setItem (challenge status) failed/blocked:', e);
      }
    }

    // 4. Save and set state
    setStreakStats(newStreakStats);
    try {
      localStorage.setItem('drafted_xi_streaks', JSON.stringify(newStreakStats));
    } catch (e) {
      console.warn('localStorage setItem (streaks) failed/blocked:', e);
    }
  };

  // ==========================================
  // CONFETTI ANIMATION LOOP (35+ wins)
  // ==========================================
  useEffect(() => {
    if (phase !== 'results' || !simResult || simResult.wins < 35) {
      if (confettiAnimRef.current) {
        cancelAnimationFrame(confettiAnimRef.current);
        confettiAnimRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    const particles = Array.from({ length: 90 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height - 20,
      size: Math.random() * 6 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2,
      speedX: Math.random() * 2 - 1,
      rotation: Math.random() * 360,
      rotSpeed: Math.random() * 4 - 2,
    }));

    const updateConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotSpeed;

        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      confettiAnimRef.current = requestAnimationFrame(updateConfetti);
    };

    updateConfetti();

    return () => {
      if (confettiAnimRef.current) {
        cancelAnimationFrame(confettiAnimRef.current);
        confettiAnimRef.current = null;
      }
    };
  }, [phase, simResult]);

  // ==========================================
  // RENDER SCREENS
  // ==========================================

  // --- 1. LANDING SCREEN ---
  const renderHome = () => {
    const PELE_FALLBACK: Player = {
      id: 'show_pele',
      playerName: 'Pele',
      displayName: 'Pele',
      season: '1970',
      club: 'Santos',
      league: 'Campeonato Paulista',
      nationality: 'Brazil',
      primaryPosition: 'ST',
      secondaryPositions: ['CF'],
      era: '90s',
      rating: 98,
      attack: 98,
      midfield: 92,
      defence: 45,
      pace: 96,
      technique: 97,
      physical: 88,
      mentality: 96,
      finishing: 98,
      creativity: 95,
      passing: 90,
      dribbling: 97,
      defending: 40,
      aerial: 88,
      pressing: 75,
      leadership: 95,
      bigGame: 99,
      consistency: 96,
      chemistryTags: ['Santos', 'Brazil', '90s', 'Legend'],
      clubTags: ['Santos'],
      nationalityTag: 'Brazil',
      eraTag: '90s',
      playStyleTags: ['Playmaker'],
      rivalryTags: [],
      rarity: 'legend',
      specialTrait: 'Generational King',
      shortBio: 'Widely regarded as the greatest of all time.',
      whyIncluded: 'Iconic showcase card.',
      dataConfidence: 'high',
      seasonLabel: '1970',
      clubSeasonLabel: 'Santos 1970',
      oneLineDescription: 'Widely regarded as the greatest of all time.',
      strengths: ['Finishing', 'Dribbling', 'Pace'],
      weaknesses: ['Defending Work'],
      bestRole: 'Generational King',
      chemistryBoosts: ['Santos', 'Brazil'],
    };

    const activeShowcase = showcasePlayer || PELE_FALLBACK;

    return (
      <div className="flex flex-col items-center min-h-[80vh] text-center px-4 sm:px-6 py-8 relative space-y-6 w-full max-w-sm mx-auto overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-emerald-500/5 filter blur-3xl pointer-events-none" />

        {/* Hero Title */}
        <div className="flex flex-col items-center justify-center mt-2 w-full space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/25 text-emerald-450 text-[10px] font-bold uppercase tracking-widest leading-none">
            ⚽ ALL-TIME DRAFT CHALLENGE
          </div>
          
          <h1 className="text-5xl md:text-6xl font-display font-black tracking-tight text-foreground uppercase leading-none">
            MY DRAFTED <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">XI</span>
          </h1>

          <p className="text-slate-400 text-xs md:text-sm max-w-md font-medium leading-relaxed">
            Build your ultimate football XI. Draft iconic player seasons, simulate a 38-game season, and see if your squad can go unbeaten.
          </p>

          {/* Streaks Widget */}
          {streakStats.gamesPlayed > 0 && (
            <div className="w-full max-w-[340px] rounded-2xl border border-slate-900 bg-slate-950/70 p-3.5 flex justify-between text-center glass">
              <div className="flex-1">
                <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest block">Runs</span>
                <p className="text-sm font-display font-black text-foreground mt-1">{streakStats.gamesPlayed}</p>
              </div>
              <div className="w-[1px] bg-slate-900" />
              <div className="flex-grow flex-shrink-0 px-2">
                <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest block">Best Score</span>
                <p className="text-sm font-display font-black text-emerald-400 mt-1">{streakStats.bestPoints} pts</p>
              </div>
              <div className="w-[1px] bg-slate-900" />
              <div className="flex-1">
                <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest block">Challenges</span>
                <p className="text-sm font-display font-black text-amber-400 mt-1">🏆 {streakStats.dailyChallengesCompleted}</p>
              </div>
              <div className="w-[1px] bg-slate-900" />
              <div className="flex-1">
                <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest block">Streak</span>
                <p className="text-sm font-display font-black text-indigo-400 mt-1">⚡ {streakStats.currentDailyStreak}</p>
              </div>
            </div>
          )}

          {/* Daily Challenge Card */}
          {todayChallenge ? (
            <div className="w-full max-w-[340px] rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 to-slate-950/70 p-5 text-left relative glass shadow-2xl animate-card-deal">
              <div className="absolute top-4 right-4 text-[8px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 uppercase tracking-widest">
                Daily Mode
              </div>

              <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest">
                Today's Challenge
              </span>
              
              <h3 className="text-lg font-display font-black text-foreground uppercase tracking-tight mt-1 leading-tight">
                {todayChallenge.title}
              </h3>
              
              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed mt-2">
                {todayChallenge.description}
              </p>

              {dailyStatus.completed ? (
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-900 leading-none">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">
                    Status: <span className={dailyStatus.beaten ? 'text-emerald-450' : 'text-rose-455'}>{dailyStatus.beaten ? 'Cleared ✅' : 'Failed ❌'}</span>
                  </span>
                  <span className="text-[9px] font-black text-slate-500 uppercase">
                    Score: <span className="text-emerald-450">{dailyStatus.score}</span>
                  </span>
                </div>
              ) : (
                <div className="h-[1px] w-full bg-slate-900/60 mt-4" />
              )}

              <button
                onClick={handlePlayDailyChallenge}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow hover:shadow-emerald-400/10 mt-4 transition-all duration-300 transform active:scale-98 cursor-pointer text-center"
              >
                {dailyStatus.completed ? "Re-play Daily Challenge" : "Play Today's Challenge"}
              </button>
            </div>
          ) : (
            /* Skeleton Loader for Daily Challenge while loading to avoid layout shift */
            <div className="w-full max-w-[340px] h-[210px] rounded-3xl border border-slate-900 bg-slate-950/40 animate-pulse glass" />
          )}
        </div>

        {/* Standard CTA Buttons */}
        <div className="w-full max-w-xs mt-2 space-y-3">
          {/* Free Database Search Toggle (Cheat Mode) */}
          <div className="w-full rounded-2xl border border-slate-900 bg-slate-950/70 p-3.5 flex justify-between items-center gap-3 select-none glass">
            <div className="flex-1 text-left min-w-0">
              <h4 className="text-[10px] font-display font-black uppercase text-foreground tracking-wider flex items-center gap-1 leading-none">
                🔍 Free Database Search
              </h4>
              <p className="text-[8px] text-slate-500 mt-1 leading-normal font-semibold">
                Search/select any player (disables Rerolls).
              </p>
            </div>
            <button
              onClick={() => setFreeSearchEnabled(!freeSearchEnabled)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none cursor-pointer flex-shrink-0 relative ${
                freeSearchEnabled ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  freeSearchEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button
            onClick={handleStartDraft}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/20 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer"
          >
            Start Draft
          </button>

          <button
            onClick={() => {
              handleRandomDraft(false);
            }}
            className="w-full py-3.5 px-6 rounded-2xl border border-dashed border-emerald-500/40 hover:border-emerald-400/80 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40 font-display font-black text-xs uppercase tracking-wider hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer text-center"
          >
            🎲 Instant Randomizer
          </button>

          <p className="text-[9px] text-slate-600 font-extrabold mt-3 uppercase tracking-widest leading-none text-center">
            Draft restrictions apply in daily challenge mode
          </p>
        </div>

        {/* Featured Legend Card at the very bottom */}
        <div className="flex flex-col items-center mt-2 pt-4 border-t border-slate-900/30 w-full max-w-[340px]">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1 leading-none">
            ⭐ Featured Legend
          </span>
          <div className="transform rotate-1 hover:rotate-0 hover:scale-102 transition-all duration-500 shadow-2xl shadow-black/80 dark:shadow-black/95 rounded-2xl overflow-hidden my-2">
            <PlayerCard player={activeShowcase} layout="large" />
          </div>
        </div>
      </div>
    );
  };

  // --- 2. FORMATION SELECTOR SCREEN ---
  const renderFormationSelector = () => {
    const formations: { type: FormationType; label: string; desc: string }[] = [
      { type: '4-3-3', label: '4 - 3 - 3', desc: 'Wingers & Balanced Midfield' },
      { type: '4-4-2', label: '4 - 4 - 2', desc: 'Traditional Flat Four & Twin Strikers' },
      { type: '3-5-2', label: '3 - 5 - 2', desc: 'Overloaded Midfield & Defensive Shield' },
      { type: '4-2-3-1', label: '4 - 2 - 3 - 1', desc: 'Double Pivot & Attacking Playmakers' },
    ];

    const leaguesList = [
      { id: 'english', name: 'English Premier League', flag: '🇬🇧', desc: 'The most intense, high-rated league in the world.', avgRating: 81 },
      { id: 'spanish', name: 'La Liga', flag: '🇪🇸', desc: 'Tactical and technical football dominated by giants.', avgRating: 78 },
      { id: 'german', name: 'Bundesliga', flag: '🇩🇪', desc: 'High-pressing, fast-paced attacking spectacles.', avgRating: 77 },
      { id: 'italian', name: 'Serie A', flag: '🇮🇹', desc: 'Catenaccio heritage with robust tactical defensive units.', avgRating: 78 },
      { id: 'french', name: 'Ligue 1', flag: '🇫🇷', desc: 'Physical, explosive counters and rising superstars.', avgRating: 76 },
    ];

    return (
      <div className={`flex flex-col items-center justify-center min-h-[75vh] px-4 sm:px-6 py-8 space-y-6 w-full max-w-full overflow-hidden ${formation ? 'pb-24 md:pb-8' : ''}`}>
        <div className="text-center">
          <h2 className="text-3xl font-display font-black text-foreground uppercase tracking-tight leading-none mb-2">
             Tactical Settings
          </h2>
          <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase leading-none">
            Configure your campaign and layout to begin drafting
          </p>
        </div>

        {/* League Selector */}
        <div className="w-full max-w-md space-y-3">
          <div className="text-center sm:text-left">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              Select Competition League
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {leaguesList.map((lg) => {
              const active = selectedLeague === lg.id;
              return (
                <button
                  key={lg.id}
                  onClick={() => setSelectedLeague(lg.id)}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all duration-300 flex items-center gap-3.5 cursor-pointer relative active:scale-99 ${
                    active
                      ? 'border-emerald-500 bg-emerald-950/20 text-emerald-450 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : 'border-slate-900 bg-slate-950/40 text-slate-350 hover:border-slate-805 hover:bg-slate-900/40'
                  }`}
                >
                  <span className="text-2xl">{lg.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-display font-black uppercase tracking-wide leading-none">
                        {lg.name}
                      </h4>
                      <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase leading-none font-display border ${
                        active ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        OVR ~{lg.avgRating}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 truncate leading-none">
                      {lg.desc}
                    </p>
                  </div>
                  {active && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Draft IQ Mode Toggle */}
        <div className="w-full max-w-md p-4 rounded-2xl glass border border-slate-900 flex justify-between items-center gap-4 select-none">
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-display font-black uppercase text-foreground tracking-wider flex items-center gap-1.5 leading-none">
              🧠 Draft IQ Mode
            </h4>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal font-semibold">
              Hide ratings & stats during drafting. Rely on your football knowledge to build chemistry and reveal scores at the end!
            </p>
          </div>
          <button
            onClick={() => setDraftIQMode(!draftIQMode)}
            className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer flex-shrink-0 relative ${
              draftIQMode ? 'bg-emerald-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-300 ${
                draftIQMode ? 'translate-x-5.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Divider */}
        <div className="w-full max-w-md h-[1.5px] bg-slate-900/60" />

        <div className="w-full max-w-md space-y-3">
          <div className="text-center sm:text-left">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              Choose Formation Layout
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {formations.map((f) => {
              const active = formation === f.type;
              return (
                <button
                  key={f.type}
                  onClick={() => handleSelectFormation(f.type)}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all duration-300 group active:scale-98 cursor-pointer flex flex-col justify-between ${
                    active
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-2 ring-emerald-500/30'
                      : 'border-slate-900 bg-slate-950/40 hover:bg-slate-900/40 hover:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center w-full leading-none">
                    <span className={`text-base font-display font-black transition-colors ${active ? 'text-emerald-450' : 'text-foreground group-hover:text-emerald-450'}`}>
                      {f.label}
                    </span>
                    <span className="text-[8px] font-extrabold text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900 font-display">
                      {f.type}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-tight font-semibold">
                    {f.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sticky proceed button */}
        {formation && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent border-t border-slate-900/30 md:relative md:bg-none md:border-none md:p-0 z-40 flex justify-center animate-card-deal">
            <button
              onClick={handleConfirmTactics}
              className="w-full max-w-sm py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/35 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer text-center animate-pulse"
            >
              Confirm & Start Draft ➔
            </button>
          </div>
        )}
      </div>
    );
  };

  // --- 3. DRAFTING SCREEN ---
  const renderDraft = () => {
    if (!formation) return null;
    const slots = FORMATION_SLOTS[formation];
    const isFinished = currentSlotIndex >= 11 || selectedPlayers.every((p) => p !== null);
    const activeLogs = getDetailedChemistryLogs(selectedPlayers, slots);

    return (
      <div className={`flex flex-col gap-6 px-4 sm:px-6 py-6 w-full max-w-lg mx-auto min-h-[90vh] relative overflow-hidden ${isFinished ? 'pb-24' : ''}`}>
        
        {/* Floating Chemistry Toast Notification (Micro-interaction) */}
        {chemistryToast && (
          <div className={`fixed bottom-36 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full border shadow-2xl animate-card-deal text-xs font-black uppercase tracking-wider ${
            chemistryToast.type === 'positive'
              ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/35 shadow-emerald-500/15'
              : 'bg-rose-950/90 text-rose-455 border-rose-500/35 shadow-rose-500/15'
          }`}>
            {chemistryToast.type === 'positive' ? '💚 ' : '💔 '}
            {chemistryToast.text}
          </div>
        )}

        {/* Progress Header */}
        <div className="flex justify-between items-center w-full leading-none">
          <div>
            <span className="text-[9px] font-black text-emerald-450 uppercase tracking-widest block mb-1">
              {isDailyChallenge ? `🏆 CHALLENGE: ${todayChallenge?.title}` : '⚽ CLASSIC LEAGUE RUN'}
            </span>
            <h2 className="text-lg font-display font-black text-foreground uppercase tracking-wider">
              {isFinished ? 'Draft Completed!' : `Pick #${currentSlotIndex + 1} of 11`}
            </h2>
          </div>
          
          {isFinished && simResult && (
            <button
              onClick={startSimulation}
              className="hidden md:inline-flex py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/20 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer"
            >
              Start simulation ➔
            </button>
          )}
        </div>

        {/* 1. Visual Pitch */}
        <PitchLayout
          formation={formation}
          selectedPlayers={selectedPlayers}
          currentSlotIndex={isFinished ? -1 : currentSlotIndex}
          draftIQActive={draftIQMode}
        />

        {/* 2. Interactive Stats Display */}
        <StatsDisplay
          attack={stats.attack}
          midfield={stats.midfield}
          defence={stats.defence}
          chemistry={stats.chemistry}
          overall={stats.overall}
          logs={activeLogs}
          draftIQActive={draftIQMode}
        />

        {/* 3. Three Player Card Options / Custom Search (Horizontal slider with edge padding) */}
        {!isFinished && (
          <div className="flex flex-col gap-3.5 w-full">
            {/* Header / Info bar with Rerolls */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/40 px-4 py-3 rounded-2xl border border-slate-900/60 gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                Choose Player for:{' '}
                <span className="text-emerald-400 font-display font-black">
                  {slots[currentSlotIndex]?.label}
                </span>
              </span>

              {/* Reroll Interface */}
              {!freeSearchEnabled && (
                <div className="flex items-center gap-3 select-none">
                  {/* Reroll Tokens representation */}
                  <div className="flex gap-1.5" title={`${rerollsRemaining} rerolls left`}>
                    {Array.from({ length: 3 }).map((_, idx) => {
                      const active = idx < rerollsRemaining;
                      return (
                        <span
                          key={idx}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            active
                              ? 'bg-amber-450 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse'
                              : 'bg-slate-800 border border-slate-900'
                          }`}
                        />
                      );
                    })}
                  </div>

                  <button
                    onClick={handleRerollOptions}
                    disabled={rerollsRemaining <= 0}
                    className={`px-3 py-1.5 rounded-xl font-display font-black text-[9px] uppercase tracking-wider transition-all select-none border cursor-pointer ${
                      rerollsRemaining > 0
                        ? 'bg-amber-500/10 text-amber-450 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 active:scale-95'
                        : 'bg-slate-900/50 text-slate-600 border-slate-950 cursor-not-allowed'
                    }`}
                  >
                    🔄 Reroll ({rerollsRemaining})
                  </button>
                </div>
              )}
            </div>

            {/* Tab Swapper */}
            {freeSearchEnabled && (
              <div className="flex bg-slate-950/70 p-1 rounded-2xl border border-slate-900 w-full mb-1">
                <button
                  onClick={() => setDraftTab('recommended')}
                  className={`flex-grow py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
                    draftTab === 'recommended'
                      ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/25 text-emerald-400 font-black shadow-md'
                      : 'border border-transparent text-slate-405 hover:text-foreground'
                  }`}
                >
                  🔎 Scout Picks
                </button>
                <button
                  onClick={() => setDraftTab('search')}
                  className={`flex-grow py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
                    draftTab === 'search'
                      ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/25 text-emerald-450 font-black shadow-md'
                      : 'border border-transparent text-slate-405 hover:text-foreground'
                  }`}
                >
                  🔍 Search Database
                </button>
              </div>
            )}

            {/* Scout Recommended Picks */}
            {draftTab === 'recommended' && draftOptions && (
              <div className="flex justify-start gap-4 overflow-x-auto pb-4 pt-1.5 snap-x scroll-px-4 scrollbar-thin px-4 w-full">
                {draftOptions.map((player) => (
                  <div key={player.id} className="snap-start flex-shrink-0 animate-card-deal">
                    <PlayerCard
                      player={player}
                      layout="large"
                      onClick={() => handleSelectPlayer(player)}
                      draftIQActive={draftIQMode}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Search and filter options */}
            {draftTab === 'search' && (
              <div className="flex flex-col gap-4 w-full animate-card-deal">
                {/* Search Text Input */}
                <div className="relative w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, club, season..."
                    className="w-full bg-slate-950/80 border border-slate-900 rounded-2xl py-3.5 pl-10 pr-10 text-xs text-foreground placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold"
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
                  {searchQuery !== '' && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-foreground text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filters Dropdown row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Club filter option */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest px-1">Club / Team</label>
                    <select
                      value={selectedClub}
                      onChange={(e) => setSelectedClub(e.target.value)}
                      className="w-full bg-slate-950/85 border border-slate-900 rounded-xl py-2 px-3 text-[10px] text-foreground font-bold tracking-wide focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                    >
                      <option value="" className="text-foreground bg-background">All Clubs</option>
                      {allClubs.map((club) => (
                        <option key={club} value={club} className="text-foreground bg-background">
                          {club}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Era filter option */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest px-1">Era</label>
                    <select
                      value={selectedEra}
                      onChange={(e) => setSelectedEra(e.target.value)}
                      className="w-full bg-slate-950/85 border border-slate-900 rounded-xl py-2 px-3 text-[10px] text-foreground font-bold tracking-wide focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                    >
                      <option value="" className="text-foreground bg-background">All Eras</option>
                      {allEras.map((era) => {
                        const eraLabels: Record<string, string> = {
                          '90s': '1990s Era',
                          '00s': '2000s Era',
                          '10s': '2010s Era',
                          'Modern': 'Modern Era',
                        };
                        return (
                          <option key={era} value={era} className="text-foreground bg-background">
                            {eraLabels[era] || era}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Position lock status toggle */}
                <div className="flex items-center justify-between bg-slate-900/20 px-3.5 py-2.5 rounded-xl border border-slate-900/50 leading-none">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Position Filter: <span className="text-emerald-450 font-display font-black">{slots[currentSlotIndex]?.position}</span>
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyMatchingPosition}
                      onChange={(e) => setOnlyMatchingPosition(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-emerald-450 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-950/60 border border-slate-700 peer-checked:border-emerald-500/40 font-semibold"></div>
                  </label>
                </div>

                {/* Search Results Display */}
                <div className="flex flex-col gap-1.5 mt-1 w-full">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">
                    Matching Candidates ({getFilteredPlayers().length})
                  </span>
                  
                  {getFilteredPlayers().length > 0 ? (
                    <div className="flex justify-start gap-4 overflow-x-auto pb-4 pt-1 snap-x scroll-px-4 scrollbar-thin px-4 w-full">
                      {getFilteredPlayers().map((player) => (
                        <div key={player.id} className="snap-start flex-shrink-0 animate-card-deal">
                          <PlayerCard
                            player={player}
                            layout="large"
                            onClick={() => handleSelectPlayer(player)}
                            draftIQActive={draftIQMode}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-900 rounded-3xl py-10 px-4 text-center">
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-relaxed">
                        No matching players found
                      </p>
                      <p className="text-[9px] text-slate-600 mt-1.5 leading-normal font-semibold">
                        Try loosening your filters or search keywords.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sticky Proceed Button for Mobile (Bottom of screen) */}
        {isFinished && simResult && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent border-t border-slate-900/30 md:relative md:bg-none md:border-none md:p-0 z-40 flex justify-center">
            <button
              onClick={startSimulation}
              className="w-full max-w-sm py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/35 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer text-center"
            >
              Start Simulation ➔
            </button>
          </div>
        )}
      </div>
    );
  };

  // --- 4. SIMULATING SCREEN ---
  const renderSimulating = () => {
    const progressPercent = Math.round((simIndex / 38) * 100);

    return (
      <div className={`flex flex-col items-center justify-between min-h-[80vh] w-full max-w-sm mx-auto px-4 sm:px-6 py-8 space-y-6 overflow-hidden ${simIndex === 38 ? 'pb-24' : ''}`}>
        <div className="text-center w-full mt-2 leading-none">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/25 text-emerald-450 text-[10px] font-bold uppercase tracking-widest mb-3">
            ⚡ SIMULATING LEAGUE SEASON
          </div>
          <h2 className="text-3xl font-display font-black text-foreground uppercase tracking-tight">
            FIXTURES PROGRESS
          </h2>
          <p className="text-xs text-slate-400 mt-2 font-bold tracking-wider uppercase">
            Game {simIndex}/38 played ({progressPercent}%)
          </p>
        </div>

        {/* Standings Widget */}
        <div className="w-full glass rounded-3xl p-5 border border-slate-900 shadow-2xl flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-slate-900 pb-3 leading-none">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Standings</span>
            <span className="text-sm font-display font-black text-emerald-400 uppercase tracking-wide">
              {livePoints} PTS
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5 text-center">
            <div className="bg-slate-950/50 p-2.5 rounded-2xl border border-slate-900/60 leading-none">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Wins</span>
              <p className="text-lg font-display font-black text-foreground mt-1">{liveWins}</p>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-2xl border border-slate-900/60 leading-none">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Draws</span>
              <p className="text-lg font-display font-black text-foreground mt-1">{liveDraws}</p>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-2xl border border-slate-900/60 leading-none">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Losses</span>
              <p className="text-lg font-display font-black text-foreground mt-1">{liveLosses}</p>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-2xl border border-slate-900/60 leading-none">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Diff</span>
              <p className="text-lg font-display font-black text-emerald-400 mt-1">
                {liveGoalsFor - liveGoalsAgainst > 0 ? '+' : ''}
                {liveGoalsFor - liveGoalsAgainst}
              </p>
            </div>
          </div>
        </div>

        {/* Season Match Outcome Grid */}
        <div className="w-full glass rounded-3xl p-4 border border-slate-900 shadow-xl flex flex-col gap-2 select-none">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
            Season Fixtures Progress Tracker
          </span>
          <div 
            className="grid gap-1.5 justify-items-center mt-1"
            style={{ gridTemplateColumns: 'repeat(19, minmax(0, 1fr))' }}
          >
            {Array.from({ length: 38 }).map((_, idx) => {
              const played = idx < simIndex;
              const match = played && simResult ? simResult.matches[idx] : null;
              
              let bgColor = 'bg-slate-900 border border-slate-800';
              let textLabel = '';
              let glowEffect = '';
              
              if (match) {
                if (match.outcome === 'W') {
                  bgColor = 'bg-emerald-550 border border-emerald-450';
                  textLabel = 'W';
                  glowEffect = 'shadow-[0_0_8px_rgba(16,185,129,0.5)]';
                } else if (match.outcome === 'D') {
                  bgColor = 'bg-slate-500 border border-slate-400';
                  textLabel = 'D';
                  glowEffect = 'shadow-[0_0_6px_rgba(148,163,184,0.4)]';
                } else {
                  bgColor = 'bg-rose-500 border border-rose-450';
                  textLabel = 'L';
                  glowEffect = 'shadow-[0_0_8px_rgba(239,68,68,0.5)]';
                }
              }

              const isCurrent = idx === simIndex;

              return (
                <div
                  key={idx}
                  title={match ? `Game ${idx + 1} vs ${match.opponent}: ${match.ourScore}-${match.opponentScore} (${match.outcome})` : `Game ${idx + 1} (Unplayed)`}
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black font-display leading-none text-slate-950 transition-all duration-300 ${bgColor} ${glowEffect} ${
                    isCurrent ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 animate-pulse' : ''
                  } ${played ? 'animate-card-deal' : ''}`}
                >
                  {textLabel}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Ticker Feed */}
        <div className="w-full flex-1 flex flex-col mt-4 overflow-hidden max-h-[280px]">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">
            Live matches feed ticker
          </span>
          
          <div
            ref={simTickerRef}
            className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 scroll-smooth"
          >
            {liveMatches.length > 0 ? (
              liveMatches.map((match, idx) => {
                const outcomeColors = {
                  W: 'bg-emerald-950/20 border-emerald-500/20 text-emerald-450',
                  D: 'bg-slate-500/10 border-slate-800 text-slate-350',
                  L: 'bg-rose-950/20 border-rose-500/20 text-rose-455',
                }[match.outcome];

                const outcomeLabel = {
                  W: 'W',
                  D: 'D',
                  L: 'L',
                }[match.outcome];

                return (
                  <div
                    key={38 - idx}
                    className={`flex justify-between items-center p-3 rounded-2xl border ${outcomeColors} animate-card-deal`}
                  >
                    <div className="flex flex-col leading-none">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                        Game {38 - idx}
                      </span>
                      <span className="text-xs font-bold text-foreground uppercase mt-1">
                        vs {match.opponent}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-display font-black text-foreground">
                        {match.ourScore} - {match.opponentScore}
                      </span>
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border uppercase leading-none font-display">
                        {outcomeLabel}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center border border-dashed border-slate-900 rounded-3xl py-12">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest animate-pulse">
                  Awaiting kick-off...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar & Proceed Action Button */}
        <div className="w-full mt-4 space-y-4">
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300 ease-out"
            />
          </div>

          {simIndex === 38 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent border-t border-slate-900/30 md:relative md:bg-none md:border-none md:p-0 z-40 flex justify-center">
              <button
                onClick={() => {
                  handleSaveCampaignResults();
                  const updateDOM = () => {
                    setPhase('results');
                  };
                  if (document.startViewTransition) {
                    document.startViewTransition(updateDOM);
                  } else {
                    updateDOM();
                  }
                }}
                className="w-full max-w-sm py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/35 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer text-center animate-bounce"
              >
                Reveal Final Standings ➔
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- 5. RESULTS SCREEN ---
  const renderResults = () => {
    if (!formation || !simResult) return null;

    const leagueFinishLabel = {
      1: '🏆 LEAGUE CHAMPIONS!',
      2: '🥈 RUNNERS-UP',
      3: '🥉 3RD PLACE',
      4: '🇪🇺 4TH PLACE (CHAMPIONS LEAGUE)',
      5: '🇪🇺 5TH PLACE (EUROPA LEAGUE)',
      6: '🇪🇺 6TH PLACE (EUROPA LEAGUE)',
      7: '🇪🇺 7TH PLACE',
    }[simResult.leaguePosition] || `🤝 #${simResult.leaguePosition} MID-TABLE`;

    const getFinishAccentClass = (pos: number) => {
      if (pos === 1) return 'from-amber-400 to-yellow-500 text-yellow-950 border-yellow-500 shadow-amber-500/20';
      if (pos <= 4) return 'from-slate-200 to-slate-450 text-slate-950 border-slate-350';
      return 'from-slate-900 to-slate-950 text-slate-300 border-slate-900';
    };

    const isSoClose = simResult.wins === 36 || simResult.wins === 37;

    return (
      <div className="flex flex-col gap-8 px-4 sm:px-6 py-8 w-full max-w-lg mx-auto min-h-[95vh] relative overflow-hidden">
        {simResult.wins >= 35 && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-50 w-full h-full"
          />
        )}

        {/* Results Header */}
        <div className="text-center mt-2 relative z-10 leading-none">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/25 text-emerald-450 text-[10px] font-bold uppercase tracking-widest mb-3">
            ⚽ FIXTURES COMPLETE
          </div>
          
          <h2 className="text-3xl font-display font-black text-foreground uppercase tracking-tight">
            CAMPAIGN DEBRIEF
          </h2>
          
          {isDailyChallenge && todayChallenge && (
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-2">
              Daily Challenge: <span className="text-emerald-450 font-display">{todayChallenge.title}</span>
            </p>
          )}
          <p className="text-[10px] text-slate-450 font-bold tracking-widest uppercase mt-1.5">
            League: <span className="text-emerald-450 font-display">
              {
                {
                  english: 'English Premier League 🇬🇧',
                  spanish: 'La Liga 🇪🇸',
                  german: 'Bundesliga 🇩🇪',
                  italian: 'Serie A 🇮🇹',
                  french: 'Ligue 1 🇫🇷',
                }[simResult.selectedLeague || 'english']
              }
            </span>
          </p>
        </div>

        {/* Heartbreak / Celebratory Banner */}
        {isSoClose && (
          <div className="w-full p-4.5 rounded-3xl bg-gradient-to-r from-rose-950/60 to-slate-950/80 border border-rose-500/25 relative z-10 text-center animate-pulse shadow-xl">
            <span className="text-xl">💔</span>
            <h3 className="text-sm font-display font-black text-rose-455 uppercase mt-1 leading-none">So close to perfection!</h3>
            <p className="text-[10px] text-slate-450 mt-1.5 leading-relaxed max-w-xs mx-auto font-medium">
              Just {38 - simResult.wins} slip-up{38 - simResult.wins > 1 ? 's' : ''} cost you the legendary 38-0 Invincibles campaign.
            </p>
          </div>
        )}

        {simResult.wins === 38 && (
          <div className="w-full p-5 rounded-3xl bg-gradient-to-r from-amber-950/60 to-slate-950/80 border border-amber-500/25 relative z-10 text-center animate-bounce shadow-xl">
            <span className="text-xl">👑</span>
            <h3 className="text-sm font-display font-black text-amber-400 uppercase mt-1 leading-none">THE PERFECT SEASON!</h3>
            <p className="text-[10px] text-slate-450 mt-1.5 leading-relaxed max-w-xs mx-auto font-semibold">
              38 wins. 0 draws. 0 losses. You have achieved absolute football immortality!
            </p>
          </div>
        )}

        {/* 1. Main League Outcome Card */}
        <div className="w-full flex flex-col items-center p-6 rounded-[32px] glass border border-emerald-500/10 relative overflow-hidden text-center z-10 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />

          {/* Daily Challenge Clear Status Badge */}
          {isDailyChallenge ? (
            <div className={`px-5 py-2 rounded-2xl bg-gradient-to-r border shadow-lg font-display font-black text-sm uppercase tracking-wider mb-4 leading-none ${
              challengeBeaten 
                ? 'from-emerald-400 to-teal-500 text-slate-950 border-emerald-400 shadow-emerald-500/20'
                : 'from-rose-500 to-red-700 text-rose-950 border-rose-500'
            }`}>
              {challengeBeaten ? '✅ CHALLENGE CLEARED!' : '❌ CHALLENGE FAILED'}
            </div>
          ) : (
            <div className={`px-5 py-2 rounded-2xl bg-gradient-to-r border shadow-lg font-display font-black text-xs uppercase tracking-wider ${getFinishAccentClass(simResult.leaguePosition)} mb-4 leading-none`}>
              {leagueFinishLabel}
            </div>
          )}

          <p className="text-5xl font-display font-black text-foreground leading-none tracking-tight">
            {simResult.wins}W - {simResult.draws}D - {simResult.losses}L
          </p>
          
          <p className="text-xs font-bold text-slate-350 mt-2 leading-none uppercase tracking-wide">
            Record: <span className="text-foreground font-extrabold">{simResult.points} PTS</span> • Goals: <span className="text-foreground font-extrabold">{simResult.goalsFor}F / {simResult.goalsAgainst}A</span>
          </p>

          <div className="h-[1.5px] w-12 bg-slate-900 my-4" />

          <p className="text-xs font-semibold text-slate-400 max-w-sm leading-relaxed italic">
            "{simResult.summary}"
          </p>
        </div>


        {/* 2. Premium Share Card Preview (Streaks inside) */}
        <SharePreview
          formation={formation}
          selectedPlayers={selectedPlayers.filter((p): p is Player => p !== null)}
          stats={stats}
          simResult={simResult}
          streakStats={streakStats}
          isDailyChallenge={isDailyChallenge}
          dailyChallengeTitle={todayChallenge?.title}
          dailyChallengeBeaten={challengeBeaten}
          exportRef={exportRef}
        />

        {/* 3. Pitch XI Representation */}
        <div className="flex flex-col gap-3 relative z-10 w-full">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 leading-none">
            Squad Tactical Pitch Layout
          </span>
          <PitchLayout
            formation={formation}
            selectedPlayers={selectedPlayers}
            currentSlotIndex={-1}
          />
        </div>

        {/* 4. Complete Stats Breakdown */}
        <div className="flex flex-col gap-3 relative z-10 w-full">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 leading-none">
            Complete Team Statistics
          </span>
          <StatsDisplay
            attack={stats.attack}
            midfield={stats.midfield}
            defence={stats.defence}
            chemistry={stats.chemistry}
            overall={stats.overall}
            logs={getDetailedChemistryLogs(selectedPlayers, FORMATION_SLOTS[formation])}
          />
        </div>

        {/* Manager's Tactical Report Card */}
        {(() => {
          const getManagerAdvice = () => {
            const advice = [];
            
            // 1. Chemistry Advice
            if (stats.chemistry < 80) {
              advice.push({
                type: 'chemistry',
                status: 'warning',
                title: 'Squad Chemistry is Low',
                desc: `Your team chemistry is ${stats.chemistry}/100. Focus on linking adjacent players of the same club, nationality, or era. Good chemistry scales up your squad overall rating.`,
              });
            } else {
              advice.push({
                type: 'chemistry',
                status: 'good',
                title: 'Fluid Chemistry Links',
                desc: `Excellent squad chemistry (${stats.chemistry}/100). Your players established strong links, boosting your team's tactical coordination.`,
              });
            }

            // 2. Department Checks
            if (stats.attack < 82) {
              advice.push({
                type: 'attack',
                status: 'warning',
                title: 'Attack Lacks Bite',
                desc: `Your attack rating is ${stats.attack}. In your next draft, prioritize forwards with high finishing and pace ratings to convert critical chances.`,
              });
            }
            if (stats.midfield < 82) {
              advice.push({
                type: 'midfield',
                status: 'warning',
                title: 'Midfield Control Weak',
                desc: `Your midfield rating is ${stats.midfield}. Draft central midfielders (CM/CDM) with high passing and technique to control the tempo and possession.`,
              });
            }
            if (stats.defence < 82) {
              advice.push({
                type: 'defence',
                status: 'warning',
                title: 'Backline is Vulnerable',
                desc: `Your defence rating is ${stats.defence}. Try securing a defensive leader (CB) or anchor midfielder (CDM) to lock down opposing attacks.`,
              });
            }

            // 3. Challenge Contextual Advice
            if (isDailyChallenge && todayChallenge) {
              if (todayChallenge.rule === 'no_legends') {
                advice.push({
                  type: 'challenge',
                  status: 'info',
                  title: 'No Legends Strategy',
                  desc: 'Without 90+ rated superstar legends, maximizing tactical chemistry blocks (e.g. English core or Manchester United links) is crucial to overcome elite opponents.',
                });
              } else if (todayChallenge.rule === 'underdog_xi') {
                advice.push({
                  type: 'challenge',
                  status: 'info',
                  title: 'Underdog Efficiency',
                  desc: 'Underdog drafts depend on high-efficiency Rare cards. Look for high-performing rare cards with strong nationality or club links to build chemistry.',
                });
              }
            }

            return advice;
          };

          return (
            <div className="w-full p-6 rounded-[32px] glass border border-slate-900 z-10 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <div className="flex-1 leading-none">
                  <h3 className="text-md font-display font-black text-foreground uppercase tracking-tight">
                    Manager's Tactical Report
                  </h3>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    Post-Campaign Analysis
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3.5 mt-2">
                {getManagerAdvice().map((adv, idx) => {
                  const borderColors = {
                    warning: 'border-rose-500/25 bg-rose-950/10 text-rose-350',
                    good: 'border-emerald-500/25 bg-emerald-950/10 text-emerald-350',
                    info: 'border-indigo-500/25 bg-indigo-950/10 text-indigo-350',
                  }[adv.status as 'warning' | 'good' | 'info'];

                  const icon = {
                    warning: '🔴',
                    good: '🟢',
                    info: '💡',
                  }[adv.status as 'warning' | 'good' | 'info'];

                  return (
                    <div key={idx} className={`p-4.5 rounded-2xl border ${borderColors} flex gap-3.5 leading-normal text-xs`}>
                      <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-extrabold uppercase text-[11px] tracking-wide leading-tight text-foreground">
                          {adv.title}
                        </h4>
                        <p className="text-slate-400 font-medium leading-relaxed">
                          {adv.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Detailed Season Fixtures & Results (Collapsible) */}
        <div className="w-full z-10 flex flex-col gap-3">
          <button
            onClick={() => setShowFixturesBreakdown(!showFixturesBreakdown)}
            className="w-full p-4.5 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 transition-all duration-300 flex items-center justify-between cursor-pointer active:scale-99"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">📅</span>
              <span className="text-xs font-display font-black text-foreground uppercase tracking-wider">
                {showFixturesBreakdown ? 'Hide' : 'Show'} Detailed Season Fixtures
              </span>
            </div>
            <span className="text-xs text-slate-450 font-extrabold font-display">
              {showFixturesBreakdown ? '▲' : '▼'}
            </span>
          </button>

          {showFixturesBreakdown && (() => {
            const getMatchCommentary = (match: MatchSimResult) => {
              const diff = match.ourScore - match.opponentScore;
              if (match.outcome === 'W') {
                if (diff >= 3) return 'An absolute masterclass. Complete dominance from kick-off.';
                if (diff >= 2) return 'A comfortable performance, controlled the match beautifully.';
                return 'A hard-fought victory. Held on under late pressure.';
              } else if (match.outcome === 'L') {
                if (diff <= -3) return 'Completely outclassed. The opponent rating gap was too wide.';
                if (diff <= -2) return 'Defensive errors cost you. Opponent capitalized on key errors.';
                return 'Unlucky. A very tight game decided by a narrow margin.';
              } else {
                if (match.ourScore === 0) return 'A scoreless, defensive stalemate. Strong defensive displays.';
                return 'A lively draw. High-scoring end-to-end tactical battle.';
              }
            };

            return (
              <div className="w-full p-4.5 rounded-[32px] glass border border-slate-900 max-h-[420px] overflow-y-auto flex flex-col gap-2.5 scroll-smooth custom-scrollbar animate-card-deal">
                {simResult.matches.map((match, idx) => {
                  const outcomeColors = {
                    W: 'bg-emerald-950/20 border-emerald-500/20 text-emerald-450',
                    D: 'bg-slate-500/10 border-slate-900 text-slate-350',
                    L: 'bg-rose-950/20 border-rose-500/20 text-rose-455',
                  }[match.outcome];

                  const outcomeBadge = {
                    W: 'bg-emerald-950/30 border-emerald-500/30 text-emerald-450',
                    D: 'bg-slate-900 border-slate-800 text-slate-450',
                    L: 'bg-rose-950/30 border-rose-500/30 text-rose-455',
                  }[match.outcome];

                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-4 p-3.5 rounded-2xl border ${outcomeColors} text-left leading-normal`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center w-full leading-none">
                          <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">
                            Game {idx + 1}
                          </span>
                          <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded border uppercase leading-none font-display ${outcomeBadge}`}>
                            {match.outcome === 'W' ? 'WIN' : match.outcome === 'D' ? 'DRAW' : 'LOSS'}
                          </span>
                        </div>
                        <h4 className="text-sm font-display font-black text-foreground mt-1.5 leading-none uppercase">
                          vs {match.opponent}
                        </h4>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1 italic">
                          {getMatchCommentary(match)}
                        </p>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1 flex-shrink-0 self-center leading-none">
                        <span className="text-md font-display font-black text-foreground tracking-tight">
                          {match.ourScore} - {match.opponentScore}
                        </span>
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                          {match.opponentRating} OVR
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Play Again and Randomize Buttons */}
        <div className="mt-4 mb-6 relative z-10 flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={handleStartDraft}
            className="flex-1 py-4 px-6 rounded-2xl bg-slate-900 border border-slate-800 text-foreground hover:bg-slate-800 font-display font-black text-sm uppercase tracking-wider transition-all duration-300 transform active:scale-98 cursor-pointer text-center"
          >
            🎮 Build Another Team
          </button>
          <button
            onClick={() => handleRandomDraft()}
            className="flex-grow py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 hover:-translate-y-0.5 transition-all duration-300 transform active:scale-98 cursor-pointer text-center"
          >
            🎲 Randomize Again
          </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // VIEW MANAGER
  // ==========================================
  if (!players || players.length === 0) {
    return (
      <div className="min-h-screen text-white font-sans flex flex-col pitch-bg p-6 justify-center items-center">
        <main className="w-full max-w-md bg-slate-950/80 backdrop-blur-md rounded-3xl p-8 border border-red-500/25 shadow-2xl text-center space-y-6">
          <span className="text-4xl">⚠️</span>
          <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight">
            Database Loading Error
          </h1>
          <p className="text-sm text-slate-350 leading-relaxed font-semibold">
            We couldn't load the MY DRAFTED XI player database. This might be due to a corrupt build or missing database assets.
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Please refresh the page if the issue persists.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-foreground font-sans flex flex-col pitch-bg w-full overflow-x-hidden">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 flex justify-between items-center select-none shadow-lg">
        <button
          onClick={() => {
            if (window.confirm('Abandon current run and return to homepage?')) {
              const updateDOM = () => {
                setPhase('home');
              };
              if (document.startViewTransition) {
                document.startViewTransition(updateDOM);
              } else {
                updateDOM();
              }
            }
          }}
          className="text-lg font-display font-black tracking-tight text-foreground uppercase hover:text-emerald-400 transition-colors cursor-pointer"
        >
          MY DRAFTED <span className="text-emerald-400">XI</span>
        </button>
        
        <div className="flex items-center gap-3 select-none">
          {streakStats.currentDailyStreak > 0 && (
            <span className="text-[9px] font-black text-indigo-300 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-900/60 uppercase tracking-widest flex items-center gap-1 animate-pulse leading-none font-display">
              ⚡ STREAK: {streakStats.currentDailyStreak}D
            </span>
          )}
          
          {/* Help Tutorial Trigger Button */}
          <button
            onClick={() => setShowTutorial(true)}
            title="How to Play"
            className="w-7 h-7 rounded-full flex items-center justify-center border border-slate-900 bg-slate-950/60 text-[9px] text-slate-400 hover:text-white hover:border-slate-800 hover:bg-slate-900/60 cursor-pointer active:scale-95 transition-all leading-none"
          >
            ❓
          </button>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-7 h-7 rounded-full flex items-center justify-center border border-slate-900 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-800 hover:bg-slate-900/60 cursor-pointer active:scale-95 transition-all text-[11px] leading-none"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Screen Coordinator */}
      <main className="flex-1 w-full max-w-lg mx-auto flex flex-col justify-center">
        {phase === 'home' && renderHome()}
        {phase === 'formation' && renderFormationSelector()}
        {phase === 'draft' && renderDraft()}
        {phase === 'simulating' && renderSimulating()}
        {phase === 'results' && renderResults()}
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center border-t border-slate-900 text-[9px] font-bold text-slate-500 uppercase tracking-widest select-none space-y-4 px-4 bg-slate-950/60 backdrop-blur-sm">
        <p className="max-w-md mx-auto text-[8px] text-slate-600 leading-normal font-semibold">
          This is an unofficial football draft game and is not affiliated with any club, league, player, governing body, or rights holder.
        </p>
        <div className="flex justify-center gap-4 text-slate-400 normal-case">
          <Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link>
        </div>
        <p className="text-slate-600">
          MY DRAFTED XI © 2026 • CREATED FOR FANS
        </p>
      </footer>

      {/* Hidden 1080x1920 Export Canvas */}
      {phase === 'results' && formation && simResult && (
        <div className="absolute top-0 left-0 -translate-x-[9999px] -translate-y-[9999px] pointer-events-none select-none">
          <ShareCardExport
            formation={formation}
            selectedPlayers={selectedPlayers}
            stats={stats}
            simResult={simResult}
            streakStats={streakStats}
            isDailyChallenge={isDailyChallenge}
            dailyChallengeTitle={todayChallenge?.title}
            dailyChallengeBeaten={challengeBeaten}
            domRef={exportRef}
          />
        </div>
      )}

      {/* 4. Tutorial Modal (How to Play Popup) */}
      {showTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm cursor-pointer"
            onClick={() => handleCloseTutorial(false)}
          />

          {/* Modal Container */}
          <div className="w-full max-w-md bg-slate-950 border border-slate-900 rounded-3xl p-6 shadow-2xl relative z-10 space-y-5 animate-card-deal">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-900">
              <h3 className="text-md font-display font-black text-foreground uppercase tracking-wider flex items-center gap-1.5 leading-none">
                ⚽ How to Play MY DRAFTED XI
              </h3>
              <button
                onClick={() => handleCloseTutorial(false)}
                className="text-slate-500 hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Steps */}
            <div className="text-xs text-slate-350 space-y-4 font-semibold leading-relaxed">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 flex items-center justify-center font-display font-black flex-shrink-0">1</span>
                <div>
                  <h4 className="text-foreground uppercase font-display font-black leading-none mb-1">Set Your Strategy</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Choose your team formation and match league. Toggle <b>Draft IQ Mode</b> to test your memory without seeing player stats!</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 flex items-center justify-center font-display font-black flex-shrink-0">2</span>
                <div>
                  <h4 className="text-foreground uppercase font-display font-black leading-none mb-1">Draft the Ultimate Squad</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Select players for each position. Link players of the same <b>nationality</b>, <b>club</b>, or <b>era</b> to boost Chemistry & performance!</p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 flex items-center justify-center font-display font-black flex-shrink-0">3</span>
                <div>
                  <h4 className="text-foreground uppercase font-display font-black leading-none mb-1">Simulate & Win</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Simulate a full 38-game league season. Win matches based on your ratings and chemistry to climb the standings!</p>
                </div>
              </div>
            </div>

            {/* Don't show again and Action Footer */}
            <div className="pt-3 border-t border-slate-900 flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="dont-show-checkbox"
                  type="checkbox"
                  className="rounded border-slate-900 text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 bg-slate-950 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Don't show this popup again</span>
              </label>
              <button
                onClick={() => {
                  const chk = document.getElementById('dont-show-checkbox') as HTMLInputElement;
                  handleCloseTutorial(chk?.checked || false);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-display font-black text-xs uppercase tracking-wider shadow hover:from-emerald-400 hover:to-teal-400 cursor-pointer text-center"
              >
                Let's Go! ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
