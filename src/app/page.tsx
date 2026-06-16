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
  const [selectedPlayers, setSelectedPlayers] = useState<(Player | null)[]>(Array(11).fill(null));
  const [currentSlotIndex, setCurrentSlotIndex] = useState<number>(0);
  const [draftOptions, setDraftOptions] = useState<[Player, Player, Player] | null>(null);
  const [stats, setStats] = useState({ attack: 0, midfield: 0, defence: 0, chemistry: 0, overall: 0 });
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  // --- Upgrade: Challenge & Streaks States ---
  const [isDailyChallenge, setIsDailyChallenge] = useState(false);
  const [todayChallenge, setTodayChallenge] = useState<ChallengeTemplate | null>(null);
  const [todayDateStr, setTodayDateStr] = useState<string>('');
  const [challengeBeaten, setChallengeBeaten] = useState(false);

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
  }, []);

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
      const randomSquad = generateRandomSquad(randomFormation, rule);
      setSelectedPlayers(randomSquad);
      setCurrentSlotIndex(11);
      setDraftOptions(null);
      
      // 3. Calculate team stats
      const slots = FORMATION_SLOTS[randomFormation];
      const newStats = calculateSquadStats(randomSquad, slots);
      setStats(newStats);
      
      // 4. Simulate season
      const result = simulateLeagueSeason(randomSquad, newStats);
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
    logFormationSelected(form);
    const updateDOM = () => {
      setFormation(form);
      const slots = FORMATION_SLOTS[form];

      // If Daily Challenge, use date-based seed
      let options: [Player, Player, Player];
      if (isDailyChallenge && todayChallenge) {
        const seedValue = parseInt(todayDateStr.replace(/-/g, ''), 10);
        const randFn = createSeedableRandom(seedValue + 0 * 1000);
        options = getDraftOptions(slots[0].position, Array(11).fill(null), randFn, todayChallenge.rule);
      } else {
        options = getDraftOptions(slots[0].position, Array(11).fill(null));
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
        nextOptions = getDraftOptions(slots[nextIndex].position, updatedSelection, randFn, todayChallenge.rule);
      } else {
        nextOptions = getDraftOptions(slots[nextIndex].position, updatedSelection);
      }
      setDraftOptions(nextOptions);
    } else {
      // Draft complete! Compile final results
      const finalPlayers = updatedSelection.filter((p): p is Player => p !== null);
      const result = simulateLeagueSeason(finalPlayers, newStats);
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
    const mockShowcase: Player = {
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

    return (
      <div className="flex flex-col items-center justify-between min-h-[80vh] text-center px-4 sm:px-6 py-8 relative space-y-8 w-full max-w-full overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-emerald-500/5 filter blur-3xl pointer-events-none" />

        {/* Hero Title */}
        <div className="flex-1 flex flex-col items-center justify-center mt-2 w-full space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/25 text-emerald-450 text-[10px] font-bold uppercase tracking-widest leading-none">
            ⚽ ALL-TIME DRAFT CHALLENGE
          </div>
          
          <h1 className="text-5xl md:text-6xl font-display font-black tracking-tight text-white uppercase leading-none">
            DRAFTED <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">XI</span>
          </h1>

          <p className="text-slate-400 text-xs md:text-sm max-w-md font-medium leading-relaxed">
            Build your ultimate football XI. Draft iconic player seasons, simulate a 38-game season, and see if your squad can go unbeaten.
          </p>

          {/* Streaks Widget */}
          {streakStats.gamesPlayed > 0 && (
            <div className="w-full max-w-[340px] rounded-2xl border border-slate-900 bg-slate-950/70 p-3.5 flex justify-between text-center glass">
              <div className="flex-1">
                <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest block">Runs</span>
                <p className="text-sm font-display font-black text-white mt-1">{streakStats.gamesPlayed}</p>
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
          {todayChallenge && (
            <div className="w-full max-w-[340px] rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/30 to-slate-950/70 p-5 text-left relative glass shadow-2xl animate-card-deal">
              <div className="absolute top-4 right-4 text-[8px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 uppercase tracking-widest">
                Daily Mode
              </div>

              <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest">
                Today's Challenge
              </span>
              
              <h3 className="text-lg font-display font-black text-white uppercase tracking-tight mt-1 leading-tight">
                {todayChallenge.title}
              </h3>
              
              <p className="text-[11px] text-slate-400 font-semibold leading-relaxed mt-2">
                {todayChallenge.description}
              </p>

              {dailyStatus.completed ? (
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-900 leading-none">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">
                    Status: <span className={dailyStatus.beaten ? 'text-emerald-400' : 'text-rose-455'}>{dailyStatus.beaten ? 'Cleared ✅' : 'Failed ❌'}</span>
                  </span>
                  <span className="text-[9px] font-black text-slate-500 uppercase">
                    Score: <span className="text-emerald-400">{dailyStatus.score}</span>
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
          )}

          {/* Floating Card Showcase */}
          {!todayChallenge && (
            <div className="transform rotate-2 scale-95 shadow-2xl shadow-black/80 my-4">
              <PlayerCard player={mockShowcase} layout="large" />
            </div>
          )}
        </div>

        {/* Standard CTA Button */}
        <div className="w-full max-w-xs mt-2 pb-4 space-y-3">
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
        </div>     </div>
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

    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 sm:px-6 py-8 space-y-6 w-full max-w-full overflow-hidden">
        <div className="text-center">
          <h2 className="text-3xl font-display font-black text-white uppercase tracking-tight leading-none mb-2">
            {isDailyChallenge ? "CHALLENGE FORMATION" : "CHOOSE FORMATION"}
          </h2>
          <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase leading-none">
            Select your tactical layout to begin drafting
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
          {formations.map((f) => (
            <button
              key={f.type}
              onClick={() => handleSelectFormation(f.type)}
              className="w-full p-5 rounded-3xl glass hover:bg-slate-900/60 hover:border-emerald-500/40 text-left transition-all duration-300 group active:scale-98 cursor-pointer flex flex-col justify-between aspect-[3/1.8]"
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-xl font-display font-black text-white group-hover:text-emerald-450 transition-colors">
                  {f.label}
                </span>
                <span className="text-[9px] font-extrabold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-900 font-display">
                  {f.type}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-350 mt-2 leading-relaxed">
                  {f.desc}
                </p>
                <div className="h-1 w-8 rounded bg-slate-800 group-hover:bg-emerald-500 group-hover:w-16 transition-all duration-300 mt-3.5" />
              </div>
            </button>
          ))}
        </div>
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
            <h2 className="text-lg font-display font-black text-white uppercase tracking-wider">
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
        />

        {/* 2. Interactive Stats Display */}
        <StatsDisplay
          attack={stats.attack}
          midfield={stats.midfield}
          defence={stats.defence}
          chemistry={stats.chemistry}
          overall={stats.overall}
          logs={activeLogs}
        />

        {/* 3. Three Player Card Options / Custom Search (Horizontal slider with edge padding) */}
        {!isFinished && (
          <div className="flex flex-col gap-3.5 w-full">
            {/* Header / Info bar */}
            <div className="text-center bg-slate-900/40 py-2.5 rounded-2xl border border-slate-900/60 leading-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Choose Player for:{' '}
                <span className="text-emerald-400 font-display font-black">
                  {slots[currentSlotIndex]?.label}
                </span>
              </span>
            </div>

            {/* Tab Swapper */}
            <div className="flex bg-slate-950/70 p-1 rounded-2xl border border-slate-900 w-full mb-1">
              <button
                onClick={() => setDraftTab('recommended')}
                className={`flex-grow py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
                  draftTab === 'recommended'
                    ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/25 text-emerald-400 font-black shadow-md'
                    : 'border border-transparent text-slate-405 hover:text-white'
                }`}
              >
                🔎 Scout Picks
              </button>
              <button
                onClick={() => setDraftTab('search')}
                className={`flex-grow py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
                  draftTab === 'search'
                    ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/25 text-emerald-450 font-black shadow-md'
                    : 'border border-transparent text-slate-405 hover:text-white'
                }`}
              >
                🔍 Search Database
              </button>
            </div>

            {/* Scout Recommended Picks */}
            {draftTab === 'recommended' && draftOptions && (
              <div className="flex justify-start gap-4 overflow-x-auto pb-4 pt-1.5 snap-x scroll-px-4 scrollbar-thin px-4 w-full">
                {draftOptions.map((player) => (
                  <div key={player.id} className="snap-start flex-shrink-0 animate-card-deal">
                    <PlayerCard
                      player={player}
                      layout="large"
                      onClick={() => handleSelectPlayer(player)}
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
                    className="w-full bg-slate-950/80 border border-slate-900 rounded-2xl py-3.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold"
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
                  {searchQuery !== '' && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
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
                      className="w-full bg-slate-950/85 border border-slate-900 rounded-xl py-2 px-3 text-[10px] text-white font-bold tracking-wide focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                    >
                      <option value="">All Clubs</option>
                      {allClubs.map((club) => (
                        <option key={club} value={club}>
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
                      className="w-full bg-slate-950/85 border border-slate-900 rounded-xl py-2 px-3 text-[10px] text-white font-bold tracking-wide focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                    >
                      <option value="">All Eras</option>
                      {allEras.map((era) => {
                        const eraLabels: Record<string, string> = {
                          '90s': '1990s Era',
                          '00s': '2000s Era',
                          '10s': '2010s Era',
                          'Modern': 'Modern Era',
                        };
                        return (
                          <option key={era} value={era}>
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
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-emerald-450 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-950/60 border border-slate-700 peer-checked:border-emerald-550/40"></div>
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
          <h2 className="text-3xl font-display font-black text-white uppercase tracking-tight">
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
              <p className="text-lg font-display font-black text-white mt-1">{liveWins}</p>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-2xl border border-slate-900/60 leading-none">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Draws</span>
              <p className="text-lg font-display font-black text-white mt-1">{liveDraws}</p>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-2xl border border-slate-900/60 leading-none">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Losses</span>
              <p className="text-lg font-display font-black text-white mt-1">{liveLosses}</p>
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
                  W: 'bg-emerald-550/10 border-emerald-500/30 text-emerald-400',
                  D: 'bg-slate-500/10 border-slate-800 text-slate-350',
                  L: 'bg-rose-550/10 border-rose-500/30 text-rose-455',
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
                      <span className="text-xs font-bold text-white uppercase mt-1">
                        vs {match.opponent}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-display font-black text-white">
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
          
          <h2 className="text-3xl font-display font-black text-white uppercase tracking-tight">
            CAMPAIGN DEBRIEF
          </h2>
          
          {isDailyChallenge && todayChallenge && (
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-2">
              Daily Challenge: <span className="text-emerald-450 font-display">{todayChallenge.title}</span>
            </p>
          )}
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

          <p className="text-5xl font-display font-black text-white leading-none tracking-tight">
            {simResult.wins}W - {simResult.draws}D - {simResult.losses}L
          </p>
          
          <p className="text-xs font-bold text-slate-350 mt-2 leading-none uppercase tracking-wide">
            Record: <span className="text-white font-extrabold">{simResult.points} PTS</span> • Goals: <span className="text-white font-extrabold">{simResult.goalsFor}F / {simResult.goalsAgainst}A</span>
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

        {/* Play Again and Randomize Buttons */}
        <div className="mt-4 mb-6 relative z-10 flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={handleStartDraft}
            className="flex-1 py-4 px-6 rounded-2xl bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 font-display font-black text-sm uppercase tracking-wider transition-all duration-300 transform active:scale-98 cursor-pointer text-center"
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
            We couldn't load the Drafted XI player database. This might be due to a corrupt build or missing database assets.
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Please refresh the page or contact support at support@draftedxi.com if the issue persists.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col pitch-bg w-full overflow-x-hidden">
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
          className="text-lg font-display font-black tracking-tight text-white uppercase hover:text-emerald-400 transition-colors cursor-pointer"
        >
          Drafted <span className="text-emerald-400">XI</span>
        </button>
        
        {/* Streak Indicator in Header */}
        {streakStats.currentDailyStreak > 0 && (
          <span className="text-[9px] font-black text-indigo-300 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-900/60 uppercase tracking-widest flex items-center gap-1 animate-pulse leading-none font-display">
            ⚡ STREAK: {streakStats.currentDailyStreak}D
          </span>
        )}
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
          <span>•</span>
          <Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact Us</Link>
        </div>
        <p className="text-slate-600">
          DRAFTED XI © 2026 • CREATED FOR FANS
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
    </div>
  );
}
