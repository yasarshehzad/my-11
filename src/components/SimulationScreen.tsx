import React, { useRef, useEffect, useMemo } from 'react';
import { SimulationResult, MatchSimResult } from '../types/game';

export interface ChapterConfig {
  id: number;
  title: string;
  tagline: string;
  startMatch: number; // 1-based (1, 11, 21, 31)
  endMatch: number;   // 1-based (10, 20, 30, 38)
  totalMatches: number;
  icon: string;
  accentColor: string;
}

export const SEASON_CHAPTERS: ChapterConfig[] = [
  {
    id: 1,
    title: 'The Opening Salvo',
    tagline: 'Laying tactical foundations & early title pace',
    startMatch: 1,
    endMatch: 10,
    totalMatches: 10,
    icon: '⚡',
    accentColor: 'border-blue-500 text-blue-600 bg-blue-50/70',
  },
  {
    id: 2,
    title: 'Winter Grasp & Festivities',
    tagline: 'Congested festive battles & squad endurance test',
    startMatch: 11,
    endMatch: 20,
    totalMatches: 10,
    icon: '❄️',
    accentColor: 'border-cyan-500 text-cyan-700 bg-cyan-50/70',
  },
  {
    id: 3,
    title: 'The Spring Surge',
    tagline: 'Separating contenders from pretenders in European race',
    startMatch: 21,
    endMatch: 30,
    totalMatches: 10,
    icon: '🌱',
    accentColor: 'border-emerald-500 text-emerald-700 bg-emerald-50/70',
  },
  {
    id: 4,
    title: 'The Championship Run-In',
    tagline: 'Final 8 fixtures: Squeaky bum time & ultimate glory',
    startMatch: 31,
    endMatch: 38,
    totalMatches: 8,
    icon: '🏆',
    accentColor: 'border-purple-500 text-purple-700 bg-purple-50/70',
  },
];

interface SimulationScreenProps {
  simIndex: number;
  simResult: SimulationResult | null;
  liveWins: number;
  liveDraws: number;
  liveLosses: number;
  livePoints: number;
  liveGoalsFor: number;
  liveGoalsAgainst: number;
  liveMatches: MatchSimResult[];
  onProceedToResults: () => void;
  onSkipSimulation?: () => void;
  simMode?: 'continuous' | 'chapters';
  onSetSimMode?: (mode: 'continuous' | 'chapters') => void;
  onAdvanceChapter?: () => void;
}

export function SimulationScreen({
  simIndex,
  simResult,
  liveWins,
  liveDraws,
  liveLosses,
  livePoints,
  liveGoalsFor,
  liveGoalsAgainst,
  liveMatches,
  onProceedToResults,
  onSkipSimulation,
  simMode = 'chapters',
  onSetSimMode,
  onAdvanceChapter,
}: SimulationScreenProps) {
  const simTickerRef = useRef<HTMLDivElement>(null);
  const progressPercent = Math.round((simIndex / 38) * 100);

  // Active chapter computation
  const activeChapterIndex = useMemo(() => {
    if (simIndex <= 10) return 0;
    if (simIndex <= 20) return 1;
    if (simIndex <= 30) return 2;
    return 3;
  }, [simIndex]);

  const activeChapter = SEASON_CHAPTERS[activeChapterIndex];

  // Detect whether currently paused at a chapter milestone
  const isChapterPaused =
    simMode === 'chapters' &&
    (simIndex === 10 || simIndex === 20 || simIndex === 30);

  // Compute summary for the completed chapter when paused
  const chapterReview = useMemo(() => {
    if (!simResult || !isChapterPaused) return null;

    let targetChapter: ChapterConfig;
    if (simIndex === 10) targetChapter = SEASON_CHAPTERS[0];
    else if (simIndex === 20) targetChapter = SEASON_CHAPTERS[1];
    else targetChapter = SEASON_CHAPTERS[2];

    const chapterMatches = simResult.matches.slice(
      targetChapter.startMatch - 1,
      targetChapter.endMatch
    );

    const wins = chapterMatches.filter((m) => m.outcome === 'W').length;
    const draws = chapterMatches.filter((m) => m.outcome === 'D').length;
    const losses = chapterMatches.filter((m) => m.outcome === 'L').length;
    const pts = wins * 3 + draws;
    const gf = chapterMatches.reduce((acc, m) => acc + m.ourScore, 0);
    const ga = chapterMatches.reduce((acc, m) => acc + m.opponentScore, 0);

    // Find best match moment in this chapter
    const bestMatch = [...chapterMatches].sort((a, b) => {
      const marginA = a.ourScore - a.opponentScore;
      const marginB = b.ourScore - b.opponentScore;
      return marginB - marginA;
    })[0];

    const nextChapter = SEASON_CHAPTERS[targetChapter.id]; // Next in array

    return {
      chapter: targetChapter,
      nextChapter,
      wins,
      draws,
      losses,
      pts,
      gf,
      ga,
      matches: chapterMatches,
      bestMatch,
    };
  }, [simResult, isChapterPaused, simIndex]);

  // Derive meaningful live highlight from latest match
  const latestMatch = liveMatches[0];
  let liveMoment: { badge: string; text: string } | null = null;
  if (latestMatch) {
    if (liveWins > 0 && liveWins % 5 === 0 && latestMatch.outcome === 'W') {
      liveMoment = { badge: '🔥 STREAK', text: `${liveWins} wins on the board!` };
    } else if (latestMatch.keyEvents && latestMatch.keyEvents.length > 0) {
      const ev = latestMatch.keyEvents[latestMatch.keyEvents.length - 1];
      const icon = ev.type === 'goal' ? '⚽ GOAL' : ev.type === 'save' ? '🧤 BIG SAVE' : '⚡ CHANCE';
      liveMoment = { badge: icon, text: `${ev.displayMinute} · ${ev.description}` };
    } else if (latestMatch.scorers && latestMatch.scorers.length > 0) {
      liveMoment = { badge: '⚽ GOAL', text: `${latestMatch.scorers[0]} vs ${latestMatch.opponent}` };
    }
  }

  // Auto-scroll ticker on new matches
  useEffect(() => {
    if (simTickerRef.current) {
      simTickerRef.current.scrollTop = 0;
    }
  }, [liveMatches]);

  // Projected 38-game total & pace tier
  const ppg = simIndex > 0 ? (livePoints / simIndex) : 0;
  const projectedPoints = simIndex > 0 ? Math.round(ppg * 38) : 0;

  const paceTier = useMemo(() => {
    if (simIndex === 0) return { label: 'Season Opening', badge: 'Kick-Off', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    if (projectedPoints >= 84) {
      return { label: 'Title Contender', badge: '🏆 Title Pace (1st/2nd)', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    if (projectedPoints >= 70) {
      return { label: 'Champions League', badge: '⭐ Top 4 Pace', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
    if (projectedPoints >= 58) {
      return { label: 'Europa League', badge: '🌍 European Pace (5th–7th)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    if (projectedPoints >= 44) {
      return { label: 'Mid-Table Safety', badge: '🛡️ Top 10 Pace', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
    return { label: 'Relegation Battle', badge: '⚠️ Bottom 6 Pace', color: 'bg-rose-100 text-rose-800 border-rose-300' };
  }, [simIndex, projectedPoints]);

  return (
    <main
      aria-label="Season Simulation"
      className={`flex flex-col items-center justify-between min-h-[80vh] w-full max-w-md mx-auto px-4 sm:px-6 py-6 space-y-5 overflow-hidden ${
        simIndex === 38 ? 'pb-24' : ''
      }`}
    >
      {/* Header & Mode Switcher */}
      <header className="text-center w-full space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-widest shadow-2xs">
            <span>⚡</span> LEAGUE SIMULATION
          </div>

          {onSetSimMode && (
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => onSetSimMode('chapters')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  simMode === 'chapters'
                    ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-black'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                📖 4 Chapters
              </button>
              <button
                type="button"
                onClick={() => onSetSimMode('continuous')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  simMode === 'continuous'
                    ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-black'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                ⏩ Continuous
              </button>
            </div>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-black text-[#0b1536] uppercase tracking-tight">
          FIXTURES PROGRESS
        </h2>
        <p className="text-xs text-slate-600 font-bold tracking-wider uppercase">
          Match {simIndex}/38 played ({progressPercent}%)
        </p>
      </header>

      {/* 4-Chapter Segmented Timeline Bar */}
      <nav aria-label="Season Chapters Timeline" className="w-full office-floating-card p-3 space-y-2">
        <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500 tracking-wider px-1">
          <span>Season Chapters</span>
          <span className="text-blue-600 font-bold">
            Chapter {activeChapter.id}/4: {activeChapter.title}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {SEASON_CHAPTERS.map((ch) => {
            const isCompleted = simIndex >= ch.endMatch;
            const isActive = !isCompleted && simIndex >= ch.startMatch - 1;
            const isUpcoming = simIndex < ch.startMatch - 1;

            return (
              <div
                key={ch.id}
                className={`p-2 rounded-xl border text-center transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 shadow-2xs'
                    : isActive
                    ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs ring-1 ring-blue-400'
                    : 'bg-slate-50/60 border-slate-200 text-slate-500 opacity-70'
                }`}
              >
                <div className="flex items-center justify-center gap-1 text-[10px]">
                  <span>{ch.icon}</span>
                  <span className="font-display font-black text-[9px] uppercase truncate">
                    Ch.{ch.id}
                  </span>
                </div>
                <div className="text-[8px] font-mono mt-0.5 font-bold">
                  {ch.startMatch}-{ch.endMatch}
                </div>
                <div className="mt-1">
                  {isCompleted ? (
                    <span className="inline-block text-[8px] font-bold text-emerald-600">✓ Done</span>
                  ) : isActive ? (
                    <span className="inline-block text-[8px] font-black text-blue-600 animate-pulse">
                      Live
                    </span>
                  ) : (
                    <span className="inline-block text-[8px] text-slate-400">Locked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Chapter Milestone Intermission Card (Displayed when paused at Ch. 1, 2, or 3) */}
      {isChapterPaused && chapterReview && (
        <article
          role="dialog"
          aria-label="Chapter Milestone Summary"
          className="w-full office-floating-card p-4 border-2 border-blue-400 bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-white shadow-lg space-y-3 animate-fade-in select-none"
        >
          <div className="flex justify-between items-center border-b border-blue-200/70 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{chapterReview.chapter.icon}</span>
              <div>
                <span className="text-[9px] font-black uppercase text-blue-600 tracking-wider block">
                  Chapter {chapterReview.chapter.id} Concluded
                </span>
                <h3 className="font-display font-black text-sm text-slate-900 uppercase">
                  {chapterReview.chapter.title}
                </h3>
              </div>
            </div>
            <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-blue-600 text-white shadow-2xs">
              {chapterReview.pts} PTS WON
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="office-subcard p-2">
              <span className="text-[8px] uppercase font-bold text-slate-500 block">Record</span>
              <span className="text-xs font-display font-black text-slate-900">
                {chapterReview.wins}W - {chapterReview.draws}D - {chapterReview.losses}L
              </span>
            </div>
            <div className="office-subcard p-2">
              <span className="text-[8px] uppercase font-bold text-slate-500 block">Goals</span>
              <span className="text-xs font-display font-black text-slate-900">
                {chapterReview.gf} : {chapterReview.ga}
              </span>
            </div>
            <div className="office-subcard p-2">
              <span className="text-[8px] uppercase font-bold text-slate-500 block">Pace</span>
              <span className="text-xs font-display font-black text-blue-600">
                ~{projectedPoints} pts
              </span>
            </div>
          </div>

          {/* Form Strip */}
          <div className="space-y-1">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">
              Chapter Form Sequence:
            </span>
            <div className="flex items-center gap-1 justify-center">
              {chapterReview.matches.map((m, idx) => {
                const color =
                  m.outcome === 'W'
                    ? 'bg-emerald-500 text-white'
                    : m.outcome === 'D'
                    ? 'bg-slate-400 text-white'
                    : 'bg-rose-500 text-white';
                return (
                  <span
                    key={idx}
                    title={`Game ${chapterReview.chapter.startMatch + idx} vs ${m.opponent}: ${m.ourScore}-${m.opponentScore}`}
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black font-display ${color}`}
                  >
                    {m.outcome}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Action to play next chapter */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onAdvanceChapter}
              className="flex-1 py-2.5 px-4 rounded-xl office-play-match-btn text-white font-display font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98 text-center"
            >
              Begin Chapter {chapterReview.nextChapter.id}: {chapterReview.nextChapter.title} ➔
            </button>
            {onSkipSimulation && (
              <button
                type="button"
                onClick={onSkipSimulation}
                className="py-2 px-3 rounded-xl office-subcard text-[10px] font-bold text-slate-600 hover:text-slate-900 transition-colors uppercase cursor-pointer text-center"
              >
                Fast-Forward All ⏩
              </button>
            )}
          </div>
        </article>
      )}

      {/* Standings & Live Pace Widget */}
      <section aria-label="Live Standings" className="w-full office-floating-card p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-[var(--office-divider)] pb-2.5 leading-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Live Standings</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${paceTier.color}`}>
              {paceTier.badge}
            </span>
          </div>
          <span className="text-sm font-display font-black text-blue-600 uppercase tracking-wide">
            {livePoints} PTS
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="office-subcard p-2 leading-none">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Wins</span>
            <p className="text-base font-display font-black text-[#0b1536] mt-1">{liveWins}</p>
          </div>
          <div className="office-subcard p-2 leading-none">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Draws</span>
            <p className="text-base font-display font-black text-[#0b1536] mt-1">{liveDraws}</p>
          </div>
          <div className="office-subcard p-2 leading-none">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Losses</span>
            <p className="text-base font-display font-black text-[#0b1536] mt-1">{liveLosses}</p>
          </div>
          <div className="office-subcard p-2 leading-none">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Diff</span>
            <p className="text-base font-display font-black text-blue-600 mt-1">
              {liveGoalsFor - liveGoalsAgainst > 0 ? '+' : ''}
              {liveGoalsFor - liveGoalsAgainst}
            </p>
          </div>
        </div>

        {/* Projected Season Points Bar */}
        {simIndex > 0 && (
          <div className="pt-1 flex items-center justify-between text-[9px] text-slate-500 font-bold border-t border-slate-100">
            <span>Current Form: {ppg.toFixed(2)} PPG</span>
            <span className="text-blue-700 font-extrabold font-mono">
              Projected Finish: ~{projectedPoints} Points
            </span>
          </div>
        )}
      </section>

      {/* Season Match Outcome Grid Grouped into 4 Chapters */}
      <section aria-label="Season Fixtures Tracker" className="w-full office-floating-card p-3.5 flex flex-col gap-2 select-none">
        <div className="flex justify-between items-center px-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            38-Fixture Season Track (By Chapter)
          </span>
          <span className="text-[9px] text-slate-400 font-mono">
            {simIndex}/38 Done
          </span>
        </div>

        <div className="flex flex-col gap-2 mt-1">
          {SEASON_CHAPTERS.map((ch) => {
            const chapterMatchesCount = ch.endMatch - ch.startMatch + 1;
            return (
              <div key={ch.id} className="space-y-1">
                <div className="flex justify-between items-center text-[8px] font-bold text-slate-500 uppercase">
                  <span>Ch.{ch.id}: {ch.title}</span>
                  <span className="font-mono">Games {ch.startMatch}–{ch.endMatch}</span>
                </div>
                <div className="flex items-center gap-1.5 justify-between">
                  {Array.from({ length: chapterMatchesCount }).map((_, localIdx) => {
                    const matchIdx = ch.startMatch - 1 + localIdx;
                    const played = matchIdx < simIndex;
                    const match = played && simResult ? simResult.matches[matchIdx] : null;

                    let bgColor = 'bg-slate-200 border border-slate-300';
                    let textLabel = '';
                    let glowEffect = '';

                    if (match) {
                      if (match.outcome === 'W') {
                        bgColor = 'bg-emerald-500 border border-emerald-400 text-white';
                        textLabel = 'W';
                        glowEffect = 'shadow-[0_0_6px_rgba(16,185,129,0.3)]';
                      } else if (match.outcome === 'D') {
                        bgColor = 'bg-slate-400 border border-slate-300 text-white';
                        textLabel = 'D';
                        glowEffect = 'shadow-[0_0_4px_rgba(148,163,184,0.3)]';
                      } else {
                        bgColor = 'bg-rose-500 border border-rose-400 text-white';
                        textLabel = 'L';
                        glowEffect = 'shadow-[0_0_6px_rgba(239,68,68,0.3)]';
                      }
                    }

                    const isCurrent = matchIdx === simIndex;

                    return (
                      <div
                        key={matchIdx}
                        title={
                          match
                            ? `Game ${matchIdx + 1} vs ${match.opponent}: ${match.ourScore}-${match.opponentScore} (${match.outcome})`
                            : `Game ${matchIdx + 1} (Unplayed)`
                        }
                        className={`flex-1 h-5 rounded-md flex items-center justify-center text-[7.5px] font-black font-display leading-none transition-all duration-300 ${bgColor} ${glowEffect} ${
                          isCurrent
                            ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white animate-pulse'
                            : ''
                        }`}
                      >
                        {textLabel}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live Ticker Feed */}
      <section aria-label="Live Match Feed" className="w-full flex-1 flex flex-col mt-1 overflow-hidden max-h-[220px]">
        <div className="flex justify-between items-center mb-1.5 px-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            Live Matches Feed Ticker
          </span>
          {simIndex < 38 && onSkipSimulation && (
            <button
              onClick={onSkipSimulation}
              type="button"
              className="text-[9px] font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer active:scale-95"
            >
              Skip to Results ⏩
            </button>
          )}
        </div>

        {/* Dynamic Key Moment Callout */}
        {liveMoment && (
          <div
            aria-live="polite"
            className="w-full mb-2 px-3 py-1.5 rounded-xl office-subcard border-blue-200 bg-blue-50/70 flex items-center justify-between text-[10px] text-slate-800 animate-fade-in shadow-xs select-none"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-blue-600 font-extrabold font-display uppercase tracking-wider flex-shrink-0">
                {liveMoment.badge}:
              </span>
              <span className="truncate text-slate-700 font-medium text-[9.5px]">
                {liveMoment.text}
              </span>
            </div>
          </div>
        )}

        <div
          ref={simTickerRef}
          className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 scroll-smooth"
        >
          {liveMatches.length > 0 ? (
            liveMatches.map((match, idx) => {
              const outcomeColors = {
                W: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
                D: 'bg-slate-50/80 border-slate-200 text-slate-800',
                L: 'bg-rose-50/80 border-rose-200 text-rose-900',
              }[match.outcome];

              const badgeColors = {
                W: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                D: 'bg-slate-200 text-slate-700 border-slate-300',
                L: 'bg-rose-100 text-rose-800 border-rose-300',
              }[match.outcome];

              const outcomeLabel = {
                W: 'W',
                D: 'D',
                L: 'L',
              }[match.outcome];

              return (
                <article
                  key={38 - idx}
                  className={`flex justify-between items-center p-2.5 rounded-xl border ${outcomeColors} animate-card-deal shadow-2xs`}
                >
                  <div className="flex flex-col leading-none">
                    <span className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wider">
                      Match {38 - idx}
                    </span>
                    <span className="text-xs font-bold text-[#0b1536] uppercase mt-1">
                      vs {match.opponent}
                    </span>
                    {match.headline && (
                      <span className="text-[8px] text-slate-600 font-medium mt-0.5 truncate max-w-[200px]">
                        {match.headline}
                      </span>
                    )}
                    {match.scorers && match.scorers.length > 0 && (
                      <span className="text-[8px] text-blue-600 font-bold mt-0.5 flex items-center gap-1">
                        ⚽ {match.scorers.join(', ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-display font-black text-[#0b1536]">
                      {match.ourScore} - {match.opponentScore}
                    </span>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border uppercase leading-none font-display ${badgeColors}`}>
                      {outcomeLabel}
                    </span>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="h-full flex items-center justify-center border border-dashed border-slate-300 rounded-2xl py-8">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest animate-pulse">
                Awaiting kick-off...
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Progress Bar & Proceed Action Button */}
      <footer className="w-full space-y-3 pt-1">
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden border border-slate-300/80">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-gradient-to-r from-[#00d2ff] via-[#1d5eff] to-[#7c3aed] rounded-full transition-all duration-300 ease-out"
          />
        </div>

        {simIndex < 38 && onSkipSimulation && !isChapterPaused && (
          <div className="flex justify-center">
            <button
              onClick={onSkipSimulation}
              type="button"
              className="py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider office-subcard text-[#0b1536] hover:bg-slate-100 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-2xs"
            >
              <span>⏩</span> Skip to Results
            </button>
          </div>
        )}

        {simIndex === 38 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent border-t border-border/30 md:relative md:bg-none md:border-none md:p-0 z-40 flex justify-center">
            <button
              onClick={onProceedToResults}
              className="w-full max-w-sm py-4 px-6 rounded-2xl office-play-match-btn text-white font-display font-black text-sm uppercase tracking-wider shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer text-center"
            >
              Reveal Final Standings ➔
            </button>
          </div>
        )}
      </footer>
    </main>
  );
}
