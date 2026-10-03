import React from 'react';
import { Player, ChallengeTemplate, StreakStats } from '../types/game';
import { DailyChallengeStatus } from '../utils/storage';
import { PlayerCard } from './PlayerCard';
import { DailyChallengeBanner } from './DailyChallengeBanner';

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

interface HomeScreenProps {
  showcasePlayer: Player | null;
  streakStats: StreakStats;
  todayChallenge: ChallengeTemplate | null;
  dailyStatus: DailyChallengeStatus;
  freeSearchEnabled: boolean;
  onToggleFreeSearch: () => void;
  onStartDraft: () => void;
  onPlayDailyChallenge: () => void;
  onRandomDraft: () => void;
}

export function HomeScreen({
  showcasePlayer,
  streakStats,
  todayChallenge,
  dailyStatus,
  freeSearchEnabled,
  onToggleFreeSearch,
  onStartDraft,
  onPlayDailyChallenge,
  onRandomDraft,
}: HomeScreenProps) {
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
        <DailyChallengeBanner
          todayChallenge={todayChallenge}
          dailyStatus={dailyStatus}
          onPlay={onPlayDailyChallenge}
        />
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
            onClick={onToggleFreeSearch}
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
          onClick={onStartDraft}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/20 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer"
        >
          Start Draft
        </button>

        <button
          onClick={onRandomDraft}
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
}
