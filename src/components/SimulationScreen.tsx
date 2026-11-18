import React, { useRef, useEffect, useMemo } from 'react';
import { SimulationResult, MatchSimResult } from '../types/game';
import { Button } from '@/components/ui';
import {
  IconBolt,
  IconFlame,
  IconBall,
  IconShield,
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

export const SEASON_CHAPTERS: ChapterConfig[] = [
  {
    id: 1,
    title: 'The opening salvo',
    tagline: 'Laying tactical foundations and early title pace',
    startMatch: 1,
    endMatch: 10,
    totalMatches: 10,
    iconKey: 'bolt',
    accentColor: 'border-blue-500 text-blue-600 bg-blue-50/70',
  },
  {
    id: 2,
    title: 'Winter grasp and festivities',
    tagline: 'Congested festive battles and a squad endurance test',
    startMatch: 11,
    endMatch: 20,
    totalMatches: 10,
    iconKey: 'snowflake',
    accentColor: 'border-cyan-500 text-cyan-700 bg-cyan-50/70',
  },
  {
    id: 3,
    title: 'The spring surge',
    tagline: 'Separating contenders from pretenders in the European race',
    startMatch: 21,
    endMatch: 30,
    totalMatches: 10,
    iconKey: 'sprout',
    accentColor: 'border-emerald-500 text-emerald-700 bg-emerald-50/70',
  },
  {
    id: 4,
    title: 'The championship run-in',
    tagline: 'Final 8 fixtures: squeaky bum time',
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
      liveMoment = { type: 'streak', badge: 'Streak', text: `${liveWins} wins on the board` };
    } else if (latestMatch.keyEvents && latestMatch.keyEvents.length > 0) {
      const ev = latestMatch.keyEvents[latestMatch.keyEvents.length - 1];
      const eventType = ev.type === 'goal' ? 'goal' : ev.type === 'save' ? 'save' : 'chance';
      const label = ev.type === 'goal' ? 'Goal' : ev.type === 'save' ? 'Big save' : 'Chance';
      liveMoment = { type: eventType, badge: label, text: `${ev.displayMinute} · ${ev.description}` };
    } else if (latestMatch.scorers && latestMatch.scorers.length > 0) {
      liveMoment = { type: 'goal', badge: 'Goal', text: `${latestMatch.scorers[0]} vs ${latestMatch.opponent}` };
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
    if (simIndex === 0) return { label: 'Season opening', badge: 'Kick-off', iconKey: 'ball' as const, color: 'text-[var(--ink-secondary)]' };
    if (projectedPoints >= 84) {
      return { label: 'Title contender', badge: 'Title pace (1st/2nd)', iconKey: 'trophy' as const, color: 'text-emerald-700' };
    }
    if (projectedPoints >= 70) {
      return { label: 'Champions League', badge: 'Top 4 pace', iconKey: 'star' as const, color: 'text-emerald-700' };
    }
    if (projectedPoints >= 58) {
      return { label: 'Europa League', badge: 'European pace (5th–7th)', iconKey: 'globe' as const, color: 'text-[var(--ink-secondary)]' };
    }
    if (projectedPoints >= 44) {
      return { label: 'Mid-table safety', badge: 'Top 10 pace', iconKey: 'shield' as const, color: 'text-[var(--ink-secondary)]' };
    }
    return { label: 'Relegation battle', badge: 'Bottom 6 pace', iconKey: 'alert' as const, color: 'text-rose-700' };
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
        <h2 className="text-xl font-display font-bold text-[var(--ink-primary)]">
          Match {simIndex}/38
        </h2>

        {onSetSimMode && (
          <div className="inline-flex items-center gap-0.5 bg-[var(--surface-subcard)] p-0.5 rounded-lg border border-[var(--border-subtle)]" role="group" aria-label="Simulation pace">
            {(['chapters', 'continuous'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={simMode === m}
                onClick={() => onSetSimMode(m)}
                className={`min-h-9 px-3 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                  simMode === m
                    ? 'bg-[var(--surface-card)] text-[var(--ink-primary)] border-[var(--border-crisp)]'
                    : 'border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
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
        <div className="flex items-end justify-between gap-3">
          <div className="leading-none">
            <span className="text-3xl font-display font-bold text-[var(--ink-primary)] tabular-nums">{livePoints}</span>
            <span className="text-xs text-[var(--ink-muted)] ml-1">pts</span>
          </div>
          <div className="text-right min-w-0">
            <div className="text-sm font-display font-semibold text-[var(--ink-primary)] tabular-nums">
              {liveWins}W {liveDraws}D {liveLosses}L
              <span className="text-[var(--ink-muted)] font-medium ml-2">
                GD {goalDiff > 0 ? '+' : ''}
                {goalDiff}
              </span>
            </div>
            <p className={`text-xs font-medium mt-0.5 ${paceTier.color}`}>
              {paceTier.badge}
              {simIndex > 0 && <span> · ~{projectedPoints} pts</span>}
            </p>
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
                  className={`flex items-center gap-1 text-xs ${
                    isActive ? 'font-semibold text-[var(--ink-primary)]' : isCompleted ? 'font-medium text-[var(--ink-secondary)]' : 'font-medium text-[var(--ink-muted)]'
                  }`}
                >
                  {isCompleted && <IconCheck className="w-3 h-3 shrink-0 text-emerald-700" />}
                  <span className="truncate">{ch.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: chapterMatchesCount }).map((_, localIdx) => {
                    const matchIdx = ch.startMatch - 1 + localIdx;
                    const played = matchIdx < simIndex;
                    const match = played && simResult ? simResult.matches[matchIdx] : null;
                    const bgColor = !match
                      ? 'bg-[var(--surface-elevated)]'
                      : match.outcome === 'W'
                      ? 'bg-emerald-600 text-white'
                      : match.outcome === 'D'
                      ? 'bg-[#8a8a85] text-white'
                      : 'bg-rose-600 text-white';

                    return (
                      <div
                        key={matchIdx}
                        title={
                          match
                            ? `Game ${matchIdx + 1} vs ${match.opponent}: ${match.ourScore}-${match.opponentScore} (${match.outcome})`
                            : `Game ${matchIdx + 1} (unplayed)`
                        }
                        className={`flex-1 h-5 rounded-md flex items-center justify-center text-2xs font-semibold leading-none ${bgColor} ${
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
          className="w-full office-floating-card rounded-xl p-4 space-y-3 motion-safe:animate-fade-in select-none"
        >
          <div>
            <h3 className="font-display font-semibold text-base text-[var(--ink-primary)]">
              Chapter {chapterReview.chapter.id} done
            </h3>
            <p className="text-sm text-[var(--ink-secondary)] mt-0.5 tabular-nums">
              {chapterReview.wins}W {chapterReview.draws}D {chapterReview.losses}L · {chapterReview.pts} pts · goals{' '}
              {chapterReview.gf}:{chapterReview.ga}
            </p>
          </div>
          <Button variant="primary" fullWidth onClick={onAdvanceChapter} className="min-h-11">
            <span className="truncate">Next: {chapterReview.nextChapter.title.replace(/^The /, 'the ')}</span>
            <IconArrowRight className="w-3.5 h-3.5 shrink-0" />
          </Button>
        </article>
      )}

      {/* Live match feed */}
      <section aria-label="Live Match Feed" className="w-full flex-1 flex flex-col overflow-hidden max-h-[240px]">
        {liveMoment && (
          <div
            aria-live="polite"
            className="w-full mb-2 flex items-center gap-1.5 text-xs text-[var(--ink-secondary)] select-none"
          >
            {liveMoment.type === 'streak' ? (
              <IconFlame className="w-3.5 h-3.5 shrink-0" />
            ) : liveMoment.type === 'goal' ? (
              <IconBall className="w-3.5 h-3.5 shrink-0" />
            ) : liveMoment.type === 'save' ? (
              <IconShield className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <IconBolt className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="text-[var(--ink-primary)] font-semibold shrink-0">
              {liveMoment.badge}
            </span>
            <span className="truncate">{liveMoment.text}</span>
          </div>
        )}

        <div
          ref={simTickerRef}
          className="flex-1 overflow-y-auto pr-1 flex flex-col divide-y divide-[var(--office-divider)] scroll-smooth"
        >
          {liveMatches.length > 0 ? (
            liveMatches.map((match, idx) => {
              const badgeColors = {
                W: 'bg-emerald-600 text-white',
                D: 'bg-[#8a8a85] text-white',
                L: 'bg-rose-600 text-white',
              }[match.outcome];
              const matchNumber = liveMatches.length - idx;
              const detail = match.scorers && match.scorers.length > 0 ? match.scorers.join(', ') : match.headline;

              return (
                <article key={matchNumber} className="flex justify-between items-center gap-3 py-2">
                  <div className="min-w-0">
                    <span className="block text-sm font-medium text-[var(--ink-primary)] truncate">
                      <span className="text-[var(--ink-muted)] font-normal tabular-nums mr-1.5">{matchNumber}</span>
                      vs {match.opponent}
                    </span>
                    {detail && (
                      <span className="block text-xs text-[var(--ink-secondary)] truncate">{detail}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-display font-semibold text-[var(--ink-primary)] tabular-nums">
                      {match.ourScore} - {match.opponentScore}
                    </span>
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-2xs font-semibold leading-none ${badgeColors}`}>
                      {match.outcome}
                    </span>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="py-8 text-center text-sm text-[var(--ink-muted)]">
              Awaiting kick-off...
            </p>
          )}
        </div>
      </section>

      {/* Single skip / proceed action */}
      {simIndex < 38 && onSkipSimulation && (
        <Button variant="secondary" onClick={onSkipSimulation}>
          <IconSkipForward className="w-3.5 h-3.5 shrink-0" />
          <span>Skip to results</span>
        </Button>
      )}

      {simIndex === 38 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom,16px))] bg-[var(--surface-ground)] border-t border-[var(--border-subtle)] md:relative md:bg-transparent md:border-0 md:p-0 z-40 flex justify-center">
          <Button variant="primary" onClick={onProceedToResults} className="w-full max-w-sm min-h-12">
            <span>See results</span>
            <IconArrowRight className="w-4 h-4 shrink-0" />
          </Button>
        </div>
      )}
    </main>
  );
}
