import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Player, ChallengeTemplate, StreakStats, CampaignHistoryEntry, PersonalBests, ChallengeTarget } from '../types/game';
import { DailyChallengeStatus } from '../utils/storage';
import { PlayerCard } from './PlayerCard';
import { DailyChallengeBanner } from './DailyChallengeBanner';
import { listSaveSlots } from '../career/saves';
import { SaveSlotMeta } from '../career/types';

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

export interface HomeScreenProps {
  showcasePlayer: Player | null;
  streakStats: StreakStats;
  campaignHistory?: CampaignHistoryEntry[];
  personalBests?: PersonalBests;
  todayChallenge: ChallengeTemplate | null;
  dailyStatus: DailyChallengeStatus;
  freeSearchEnabled: boolean;
  onToggleFreeSearch: () => void;
  onStartDraft: () => void;
  onPlayDailyChallenge: () => void;
  onRandomDraft: () => void;
  onViewHistory?: () => void;
  incomingChallenge?: ChallengeTarget | null;
  onAcceptChallenge?: (target: ChallengeTarget) => void;
  onDismissChallenge?: () => void;
  onSelectCareerMode?: () => void;
}

export function HomeScreen({
  showcasePlayer,
  streakStats,
  campaignHistory = [],
  personalBests = {},
  todayChallenge,
  dailyStatus,
  freeSearchEnabled,
  onToggleFreeSearch,
  onStartDraft,
  onPlayDailyChallenge,
  onRandomDraft,
  onViewHistory,
  incomingChallenge,
  onAcceptChallenge,
  onDismissChallenge,
  onSelectCareerMode,
}: HomeScreenProps) {
  const activeShowcase = showcasePlayer || PELE_FALLBACK;
  const lastRun = campaignHistory.length > 0 ? campaignHistory[0] : null;

  // Detect career saves on client
  const [careerSlots, setCareerSlots] = useState<SaveSlotMeta[]>([]);
  const [showCardShowcase, setShowCardShowcase] = useState(false);

  useEffect(() => {
    try {
      const slots = listSaveSlots();
      setCareerSlots(slots);
    } catch {
      // Safe fallback
    }
  }, []);

  const activeCareerSave = careerSlots.find((s) => !s.isEmpty)?.save;

  return (
    <div className="flex flex-col items-center min-h-[80vh] text-center px-4 sm:px-6 py-6 sm:py-8 relative w-full max-w-4xl mx-auto overflow-hidden">
      {/* Ambient stadium lighting */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-emerald-500/5 filter blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-indigo-500/5 filter blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Incoming Challenge Invitation Banner */}
      {incomingChallenge && (
        <section
          aria-label="Challenge Invitation"
          className="w-full max-w-xl mb-6 rounded-3xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-950/70 via-slate-950 to-slate-950 p-5 shadow-2xl shadow-amber-950/40 flex flex-col gap-3 animate-card-deal text-left"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-display">
                Manager Challenge Invitation
              </span>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
              {(incomingChallenge.draftMode || 'classic').toUpperCase()} DRAFT
            </span>
          </div>

          <div>
            <h3 className="text-xl font-display font-black text-white leading-tight uppercase">
              Can You Beat {incomingChallenge.targetWins} Wins?
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-1">
              A fellow manager has challenged your tactical skill to top{' '}
              <strong className="text-amber-300">{incomingChallenge.targetWins} wins</strong>
              {incomingChallenge.targetPoints !== undefined
                ? ` (${incomingChallenge.targetPoints} pts)`
                : ''}{' '}
              using <strong className="text-emerald-400">{incomingChallenge.formation || 'any formation'}</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={() => onAcceptChallenge && onAcceptChallenge(incomingChallenge)}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer transition-all active:scale-98 text-center"
            >
              Accept Challenge & Draft ➔
            </button>
            <button
              onClick={onDismissChallenge}
              className="py-3 px-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      {/* Main Hub Header */}
      <header className="flex flex-col items-center justify-center w-full space-y-3 mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-widest leading-none">
          <span>⚽</span> NEXT-GEN FOOTBALL SIMULATION PLATFORM
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-black tracking-tight text-foreground uppercase leading-none">
          MY-<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">11</span>
        </h1>

        <p className="text-slate-400 text-xs sm:text-sm max-w-lg font-medium leading-relaxed">
          Draft all-time dream teams across eras or take the dugout of an authentic Premier League club. Choose your avenue below:
        </p>
      </header>

      {/* The Two Main Avenues / Game Mode Cards */}
      <section
        aria-label="Game Modes"
        className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left mb-8"
      >
        {/* Avenue 1: Draft Mode Card */}
        <article className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 via-slate-950/90 to-slate-950 p-6 sm:p-7 backdrop-blur-md shadow-2xl shadow-emerald-950/30 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full filter blur-2xl pointer-events-none group-hover:bg-emerald-500/15 transition-all" />

          <div className="space-y-4 relative z-10">
            {/* Badges */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-display font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span>⚡</span> ARCADE DRAFT
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                38-GAME SIM
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                Draft Mode
              </h2>
              <p className="text-xs text-slate-350 font-medium leading-relaxed mt-2">
                Draft 11 iconic cards across football history. Optimize club, nation & era chemistry, survive 38 games, and aim for an unbeaten 114-point campaign.
              </p>
            </div>

            {/* Feature Highlights */}
            <ul className="space-y-2 py-1 text-[11px] text-slate-300 font-semibold">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 text-xs">✓</span>
                <span><b>340+</b> historic & modern legend season cards</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 text-xs">✓</span>
                <span>Tactical chemistry boosts & positional synergies</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 text-xs">✓</span>
                <span>Daily challenges with global win targets</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 text-xs">✓</span>
                <span>Fast 5-minute simulated seasons with live logs</span>
              </li>
            </ul>

            {/* User Stats Pill (if played) */}
            {streakStats.gamesPlayed > 0 && (
              <div className="rounded-2xl border border-slate-900 bg-slate-950/80 p-3 flex justify-between items-center text-center text-xs">
                <div>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Drafts</span>
                  <span className="font-display font-black text-foreground text-sm">{streakStats.gamesPlayed}</span>
                </div>
                <div className="w-[1px] h-6 bg-slate-900" />
                <div>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Best Wins</span>
                  <span className="font-display font-black text-emerald-400 text-sm">
                    {personalBests.overall ? `${personalBests.overall.bestWins}W` : `${streakStats.bestPoints} pts`}
                  </span>
                </div>
                <div className="w-[1px] h-6 bg-slate-900" />
                <div>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Streak</span>
                  <span className="font-display font-black text-indigo-400 text-sm">⚡ {streakStats.currentDailyStreak}D</span>
                </div>
              </div>
            )}
          </div>

          {/* Draft Action CTAs */}
          <div className="pt-6 mt-4 border-t border-slate-900/80 space-y-3 relative z-10">
            <button
              onClick={onStartDraft}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/30 transition-all duration-300 transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>⚽</span> Play Draft Mode ➔
            </button>

            {/* Quick Actions Row */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <button
                onClick={onRandomDraft}
                className="py-2.5 px-3 rounded-xl border border-dashed border-emerald-500/30 hover:border-emerald-400/60 bg-emerald-950/20 text-emerald-400 hover:text-emerald-300 text-[10.5px] font-display font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🎲</span> Randomizer
              </button>

              {onViewHistory && (
                <button
                  onClick={onViewHistory}
                  className="py-2.5 px-3 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white text-[10.5px] font-display font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>📜</span> History {campaignHistory.length > 0 && `(${campaignHistory.length})`}
                </button>
              )}
            </div>

            {/* Free Search Cheat Toggle */}
            <div className="pt-2 flex justify-between items-center text-left">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-display font-black uppercase text-slate-300 tracking-wider block">
                  🔍 Free Player Search
                </span>
                <span className="text-[8.5px] text-slate-500 font-medium block">
                  Pick any player from 340+ database
                </span>
              </div>
              <button
                onClick={onToggleFreeSearch}
                aria-label="Toggle Free Player Search"
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
          </div>
        </article>

        {/* Avenue 2: Career Mode Card */}
        <article className="rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/30 via-slate-950/90 to-slate-950 p-6 sm:p-7 backdrop-blur-md shadow-2xl shadow-indigo-950/30 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-300">
          <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full filter blur-2xl pointer-events-none group-hover:bg-indigo-500/15 transition-all" />

          <div className="space-y-4 relative z-10">
            {/* Badges */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-display font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <span>🏆</span> CLUB MANAGEMENT
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                MULTI-SEASON
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                Career Mode
              </h2>
              <p className="text-xs text-slate-350 font-medium leading-relaxed mt-2">
                Step into the Premier League dugout. Lead real clubs across 2026/27, 2025/26, or 2024/25. Manage authentic squads, transfers, wages, and youth development.
              </p>
            </div>

            {/* Feature Highlights */}
            <ul className="space-y-2 py-1 text-[11px] text-slate-300 font-semibold">
              <li className="flex items-center gap-2">
                <span className="text-indigo-400 text-xs">✓</span>
                <span><b>20</b> authentic Premier League clubs across 3 seasons</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-indigo-400 text-xs">✓</span>
                <span><b>Real PL squad rules</b>: 25 senior cap (22+), U21s exempt (35 max)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-indigo-400 text-xs">✓</span>
                <span>Transfer negotiations, wage budgets & Youth Academy</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-indigo-400 text-xs">✓</span>
                <span>Premier League, FA Cup, Carabao Cup & Champions League</span>
              </li>
            </ul>

            {/* Active Save Status Pill */}
            <div className="rounded-2xl border border-slate-900 bg-slate-950/80 p-3 flex justify-between items-center text-xs">
              {activeCareerSave ? (
                <div className="w-full flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-wider block">
                      Active Career Save
                    </span>
                    <span className="font-display font-black text-foreground text-sm">
                      {activeCareerSave.clubName}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg">
                    Season {activeCareerSave.seasonNumber} • £{activeCareerSave.budget.toFixed(1)}M
                  </span>
                </div>
              ) : (
                <div className="w-full flex items-center justify-between text-slate-400">
                  <div className="text-left">
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">
                      Career Save Slots
                    </span>
                    <span className="font-display font-bold text-slate-300 text-xs">
                      3 Empty Slots Ready
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">
                    Start Fresh
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Career Action CTAs */}
          <div className="pt-6 mt-4 border-t border-slate-900/80 space-y-3 relative z-10">
            {onSelectCareerMode ? (
              <button
                onClick={onSelectCareerMode}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:shadow-indigo-400/30 transition-all duration-300 transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🏆</span> Enter Career Mode ➔
              </button>
            ) : (
              <Link
                href="/career"
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:shadow-indigo-400/30 transition-all duration-300 transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🏆</span> Enter Career Mode ➔
              </Link>
            )}

            {/* Quick Actions Row */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <Link
                href="/career/setup"
                className="py-2.5 px-3 rounded-xl border border-indigo-500/30 hover:border-indigo-400/60 bg-indigo-950/20 text-indigo-300 hover:text-white text-[10.5px] font-display font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>➕</span> New Career
              </Link>

              <Link
                href="/career"
                className="py-2.5 px-3 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white text-[10.5px] font-display font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>💾</span> Load Saves (3)
              </Link>
            </div>

            <p className="text-[9px] text-slate-500 font-semibold text-center pt-1">
              Supports 2026/27, 2025/26 & 2024/25 Premier League squads
            </p>
          </div>
        </article>
      </section>

      {/* Daily Challenge Banner (if today's challenge is active) */}
      {todayChallenge && (
        <section aria-label="Daily Challenge" className="w-full max-w-xl mb-6">
          <DailyChallengeBanner
            todayChallenge={todayChallenge}
            dailyStatus={dailyStatus}
            onPlay={onPlayDailyChallenge}
          />
        </section>
      )}

      {/* Last Run Preview (if available) */}
      {lastRun && (
        <div className="w-full max-w-md py-2.5 px-4 rounded-xl border border-slate-900 bg-slate-950/60 mb-6 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
          <span>Previous Draft:</span>
          <span className="text-slate-200 font-bold">
            {lastRun.wins}W - {lastRun.draws}D - {lastRun.losses}L ({lastRun.points} pts) •{' '}
            {lastRun.draftMode === 'quick'
              ? 'Quick'
              : lastRun.draftMode === 'mystery'
              ? 'Mystery'
              : lastRun.draftMode === 'daily_challenge'
              ? 'Challenge'
              : 'Classic'}
          </span>
        </div>
      )}

      {/* Featured Legend Card Accordion / Showcase */}
      <footer className="w-full max-w-md pt-4 border-t border-slate-900/50 flex flex-col items-center">
        <button
          onClick={() => setShowCardShowcase(!showCardShowcase)}
          className="text-[10px] font-display font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-2 py-2 cursor-pointer"
        >
          <span>⭐</span>
          <span>{showCardShowcase ? 'Hide Featured Card' : 'Preview Featured Card: Pele (Santos 1970)'}</span>
          <span>{showCardShowcase ? '▲' : '▼'}</span>
        </button>

        {showCardShowcase && (
          <div className="mt-3 transform rotate-1 hover:rotate-0 hover:scale-102 transition-all duration-300 shadow-2xl shadow-black rounded-2xl overflow-hidden animate-card-deal">
            <PlayerCard player={activeShowcase} layout="large" />
          </div>
        )}
      </footer>
    </div>
  );
}
