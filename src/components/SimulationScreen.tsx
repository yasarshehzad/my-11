import React, { useRef, useEffect, useMemo } from 'react';
import { SimulationResult, MatchSimResult } from '../types/game';
import {
  IconBolt,
  IconSnowflake,
  IconSprout,
  IconTrophy,
  IconFlame,
  IconBall,
  IconShield,
  IconStar,
  IconGlobe,
  IconAlert,
  IconSkipForward,
  IconCheck,
  IconArrowRight,
} from './career/GameIcons';

export interface ChapterConfig {
  id: number;
  title: string;
  tagline: string;
  startMatch: number; // 1-based (1, 11, 21, 31)
  endMatch: number;   // 1-based (10, 20, 30, 38)
  totalMatches: number;
  iconKey: 'bolt' | 'snowflake' | 'sprout' | 'trophy';
  accentColor: string;
}

function renderChapterIcon(iconKey: ChapterConfig['iconKey'], className = 'w-3.5 h-3.5 shrink-0') {
  switch (iconKey) {
    case 'bolt':
      return <IconBolt className={className} />;
    case 'snowflake':
      return <IconSnowflake className={className} />;
    case 'sprout':
      return <IconSprout className={className} />;
    case 'trophy':
      return <IconTrophy className={className} />;
  }
}

export const SEASON_CHAPTERS: ChapterConfig[] = [
  {
    id: 1,
    title: 'The Opening Salvo',
    tagline: 'Laying tactical foundations & early title pace',
    startMatch: 1,
    endMatch: 10,
    totalMatches: 10,
    iconKey: 'bolt',
    accentColor: 'border-blue-500 text-blue-600 bg-blue-50/70',
  },
  {
    id: 2,
    title: 'Winter Grasp & Festivities',
    tagline: 'Congested festive battles & squad endurance test',
    startMatch: 11,
    endMatch: 20,
    totalMatches: 10,
    iconKey: 'snowflake',
    accentColor: 'border-cyan-500 text-cyan-700 bg-cyan-50/70',
  },
  {
    id: 3,
    title: 'The Spring Surge',
    tagline: 'Separating contenders from pretenders in European race',
    startMatch: 21,
    endMatch: 30,
    totalMatches: 10,
    iconKey: 'sprout',
    accentColor: 'border-emerald-500 text-emerald-700 bg-emerald-50/70',
  },
  {
    id: 4,
    title: 'The Championship Run-In',
    tagline: 'Final 8 fixtures: Squeaky bum time & ultimate glory',
    startMatch: 31,
    endMatch: 38,
    totalMatches: 8,
    iconKey: 'trophy',
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
    };
  }, [simResult, isChapterPaused, simIndex]);

  // Derive meaningful live highlight from latest match
  const latestMatch = liveMatches[0];
  let liveMoment: { type: 'streak' | 'goal' | 'save' | 'chance'; badge: string; text: string } | null = null;
  if (latestMatch) {
    if (liveWins > 0 && liveWins % 5 === 0 && latestMatch.outcome === 'W') {
      liveMoment = { type: 'streak', badge: 'STREAK', text: `${liveWins} wins on the board!` };
    } else if (latestMatch.keyEvents && latestMatch.keyEvents.length > 0) {
      const ev = latestMatch.keyEvents[latestMatch.keyEvents.length - 1];
      const eventType = ev.type === 'goal' ? 'goal' : ev.type === 'save' ? 'save' : 'chance';
      const label = ev.type === 'goal' ? 'GOAL' : ev.type === 'save' ? 'BIG SAVE' : 'CHANCE';
      liveMoment = { type: eventType, badge: label, text: `${ev.displayMinute} · ${ev.description}` };
    } else if (latestMatch.scorers && latestMatch.scorers.length > 0) {
      liveMoment = { type: 'goal', badge: 'GOAL', text: `${latestMatch.scorers[0]} vs ${latestMatch.opponent}` };
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
    if (simIndex === 0) return { label: 'Season Opening', badge: 'Kick-Off', iconKey: 'ball' as const, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    if (projectedPoints >= 84) {
      return { label: 'Title Contender', badge: 'Title Pace (1st/2nd)', iconKey: 'trophy' as const, color: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    if (projectedPoints >= 70) {
      return { label: 'Champions League', badge: 'Top 4 Pace', iconKey: 'star' as const, color: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
    if (projectedPoints >= 58) {
      return { label: 'Europa League', badge: 'European Pace (5th–7th)', iconKey: 'globe' as const, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    if (projectedPoints >= 44) {
      return { label: 'Mid-Table Safety', badge: 'Top 10 Pace', iconKey: 'shield' as const, color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
    return { label: 'Relegation Battle', badge: 'Bottom 6 Pace', iconKey: 'alert' as const, color: 'bg-rose-100 text-rose-800 border-rose-300' };
  }, [simIndex, projectedPoints]);

  const goalDiff = liveGoalsFor - liveGoalsAgainst;

  return (
    <main
      aria-label="Season Simulation"
      className={`flex flex-col items-center min-h-[80vh] w-full max-w-md mx-auto px-4 sm:px-6 py-4 gap-4 overflow-hidden ${
        simIndex === 38 ? 'pb-24' : ''
      }`}
    >
      {/* Header & Mode Switcher */}
      <header className="w-full flex items-center justify-between gap-2">
        <h2 className="text-xl font-display font-black text-[#0b1536] uppercase tracking-tight">
          Match {simIndex}/38
        </h2>

        {onSetSimMode && (
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200" role="group" aria-label="Simulation pace">
            {(['chapters', 'continuous'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={simMode === m}
                onClick={() => onSetSimMode(m)}
                className={`min-h-[36px] px-3 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  simMode === m
                    ? 'bg-white text-blue-700 shadow-2xs border border-slate-200/80 font-black'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'chapters' ? 'Chapters' : 'Non-stop'}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Standings + season track (the single progress indicator) */}
      <section aria-label="Live Standings" className="w-full office-floating-card p-4 flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3 leading-none">
          <div>
            <span className="text-3xl font-display font-black text-blue-600">{livePoints}</span>
            <span className="text-xs font-bold text-slate-500 uppercase ml-1">pts</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-display font-black text-[#0b1536]">
              {liveWins}W {liveDraws}D {liveLosses}L
              <span className="text-slate-500 font-bold ml-2">
                GD {goalDiff > 0 ? '+' : ''}
                {goalDiff}
              </span>
            </div>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1.5 ${paceTier.color}`}>
              {paceTier.iconKey === 'ball' && <IconBall className="w-3 h-3 shrink-0" />}
              {paceTier.iconKey === 'trophy' && <IconTrophy className="w-3 h-3 shrink-0" />}
              {paceTier.iconKey === 'star' && <IconStar className="w-3 h-3 shrink-0" filled />}
              {paceTier.iconKey === 'globe' && <IconGlobe className="w-3 h-3 shrink-0" />}
              {paceTier.iconKey === 'shield' && <IconShield className="w-3 h-3 shrink-0" />}
              {paceTier.iconKey === 'alert' && <IconAlert className="w-3 h-3 shrink-0" />}
              <span>{paceTier.badge}</span>
              {simIndex > 0 && <span>· ~{projectedPoints} pts</span>}
            </span>
          </div>
        </div>

        <div aria-label="Season Fixtures Tracker" className="flex flex-col gap-2 pt-3 border-t border-[var(--office-divider)] select-none">
          {SEASON_CHAPTERS.map((ch) => {
            const chapterMatchesCount = ch.endMatch - ch.startMatch + 1;
            const isCompleted = simIndex >= ch.endMatch;
            const isActive = !isCompleted && ch.id === activeChapter.id;
            return (
              <div key={ch.id} className="space-y-1">
                <div
                  className={`flex items-center gap-1 text-[10px] font-bold uppercase ${
                    isActive ? 'text-blue-700' : isCompleted ? 'text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  {isCompleted ? <IconCheck className="w-3 h-3 shrink-0" /> : renderChapterIcon(ch.iconKey, 'w-3 h-3 shrink-0')}
                  <span className="truncate">{ch.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: chapterMatchesCount }).map((_, localIdx) => {
                    const matchIdx = ch.startMatch - 1 + localIdx;
                    const played = matchIdx < simIndex;
                    const match = played && simResult ? simResult.matches[matchIdx] : null;
                    const bgColor = !match
                      ? 'bg-slate-200'
                      : match.outcome === 'W'
                      ? 'bg-emerald-500 text-white'
                      : match.outcome === 'D'
                      ? 'bg-slate-400 text-white'
                      : 'bg-rose-500 text-white';

                    return (
                      <div
                        key={matchIdx}
                        title={
                          match
                            ? `Game ${matchIdx + 1} vs ${match.opponent}: ${match.ourScore}-${match.opponentScore} (${match.outcome})`
                            : `Game ${matchIdx + 1} (Unplayed)`
                        }
                        className={`flex-1 h-5 rounded-md flex items-center justify-center text-[10px] font-black font-display leading-none ${bgColor} ${
                          matchIdx === simIndex ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white' : ''
                        }`}
                      >
                        {match ? match.outcome : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Chapter break (shown when paused after chapter 1, 2 or 3) */}
      {isChapterPaused && chapterReview && (
        <article
          role="dialog"
          aria-label="Chapter Milestone Summary"
          className="w-full office-floating-card p-4 border-2 border-blue-400 space-y-3 motion-safe:animate-fade-in select-none"
        >
          <div>
            <h3 className="font-display font-black text-sm text-slate-900 uppercase">
              Chapter {chapterReview.chapter.id} done
            </h3>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">
              {chapterReview.wins}W {chapterReview.draws}D {chapterReview.losses}L · {chapterReview.pts} pts · goals{' '}
              {chapterReview.gf}:{chapterReview.ga}
            </p>
          </div>
          <button
            type="button"
            onClick={onAdvanceChapter}
            className="w-full min-h-[44px] px-4 rounded-xl office-play-match-btn text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer active:scale-98 text-center inline-flex items-center justify-center gap-1.5"
          >
            <span className="truncate">Play {chapterReview.nextChapter.title}</span>
            <IconArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </article>
      )}

      {/* Live match feed */}
      <section aria-label="Live Match Feed" className="w-full flex-1 flex flex-col overflow-hidden max-h-[240px]">
        {liveMoment && (
          <div
            aria-live="polite"
            className="w-full mb-2 flex items-center gap-1.5 text-[11px] text-slate-800 select-none"
          >
            {liveMoment.type === 'streak' ? (
              <IconFlame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            ) : liveMoment.type === 'goal' ? (
              <IconBall className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : liveMoment.type === 'save' ? (
              <IconShield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            ) : (
              <IconBolt className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
            <span className="text-blue-600 font-extrabold font-display uppercase tracking-wider shrink-0">
              {liveMoment.badge}
            </span>
            <span className="truncate text-slate-700 font-medium">{liveMoment.text}</span>
          </div>
        )}

        <div
          ref={simTickerRef}
          className="flex-1 overflow-y-auto pr-1 flex flex-col divide-y divide-[var(--office-divider)] scroll-smooth"
        >
          {liveMatches.length > 0 ? (
            liveMatches.map((match, idx) => {
              const badgeColors = {
                W: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                D: 'bg-slate-200 text-slate-700 border-slate-300',
                L: 'bg-rose-100 text-rose-800 border-rose-300',
              }[match.outcome];
              const matchNumber = liveMatches.length - idx;
              const detail = match.scorers && match.scorers.length > 0 ? match.scorers.join(', ') : match.headline;

              return (
                <article key={matchNumber} className="flex justify-between items-center gap-3 py-2">
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-[#0b1536] uppercase truncate">
                      <span className="text-slate-500 font-mono mr-1.5">{matchNumber}</span>
                      vs {match.opponent}
                    </span>
                    {detail && (
                      <span className="block text-[10px] text-slate-600 font-medium truncate">{detail}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-display font-black text-[#0b1536]">
                      {match.ourScore} - {match.opponentScore}
                    </span>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border uppercase leading-none font-display ${badgeColors}`}>
                      {match.outcome}
                    </span>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="py-8 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Awaiting kick-off...
            </p>
          )}
        </div>
      </section>

      {/* Single skip / proceed action */}
      {simIndex < 38 && onSkipSimulation && (
        <button
          onClick={onSkipSimulation}
          type="button"
          className="min-h-[40px] px-4 rounded-xl text-xs font-black uppercase tracking-wider office-subcard text-[#0b1536] hover:bg-slate-100 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
        >
          <IconSkipForward className="w-3.5 h-3.5 shrink-0" />
          <span>Skip to Results</span>
        </button>
      )}

      {simIndex === 38 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom,16px))] bg-gradient-to-t from-background via-background/95 to-transparent border-t border-border/30 md:relative md:bg-none md:border-none md:p-0 z-40 flex justify-center">
          <button
            onClick={onProceedToResults}
            className="w-full max-w-sm py-4 px-6 rounded-2xl office-play-match-btn text-white font-display font-black text-sm uppercase tracking-wider shadow-lg cursor-pointer inline-flex items-center justify-center gap-2 active:scale-98"
          >
            <span>See Results</span>
            <IconArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      )}
    </main>
  );
}
