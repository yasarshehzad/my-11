'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { ChallengeTemplate, DailyResult, StreakStats } from '../types/game';
import type { DailyChallengeStatus } from '../utils/storage';
import { getLocalDateKey } from '../utils/dailyChallenges';
import { recordShare } from '../progression/progress';
import { logDailyResultShared } from '../utils/analytics';
import { Button, Tag } from '@/components/ui';
import { IconCheck, IconClock, IconFlame, IconShare } from './career/GameIcons';

function getCountdownToMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const ms = Math.max(0, midnight.getTime() - now.getTime());
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 1) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function formatDayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function buildRecentDays(count: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < count; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    days.push(getLocalDateKey(date));
  }
  return days;
}

export function DailyHubCard({
  challenge,
  dailyStatus,
  streakStats,
  dailyResults,
  onPlay,
}: {
  challenge: ChallengeTemplate | null;
  dailyStatus: DailyChallengeStatus;
  streakStats: StreakStats;
  dailyResults: DailyResult[];
  onPlay: () => void;
}) {
  const [countdown, setCountdown] = useState(() => getCountdownToMidnight());
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdownToMidnight()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const todayKey = getLocalDateKey();
  const todayResult = dailyResults.find((result) => result.date === todayKey);
  const completed = Boolean(todayResult) || dailyStatus.completed;
  const beaten = todayResult?.beaten ?? dailyStatus.beaten;
  const streak = streakStats.currentChallengeStreak || 0;
  const bestStreak = Math.max(streakStats.bestChallengeStreak || 0, streak);
  const recentDays = useMemo(() => buildRecentDays(14), []);
  const byDate = useMemo(() => new Map(dailyResults.map((result) => [result.date, result])), [dailyResults]);
  const clearedThisMonth = dailyResults.filter(
    (result) =>
      result.beaten &&
      result.date >= getLocalDateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  ).length;

  if (!challenge) return null;

  const handleShare = async () => {
    if (!todayResult) return;
    const text = `MY-11 Daily · ${todayResult.challengeTitle} · ${todayResult.points} pts · top ${todayResult.percentile}% · ${
      todayResult.beaten ? 'Cleared' : 'Missed'
    }. Can you beat it? https://my-11.com/draft?mode=daily_challenge`;
    logDailyResultShared(todayResult.score, todayResult.beaten);
    recordShare();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Today's MY-11 daily", text, url: 'https://my-11.com' });
        setShareFeedback('Shared.');
      } else {
        await navigator.clipboard.writeText(text);
        setShareFeedback('Score copied.');
      }
      window.setTimeout(() => setShareFeedback(null), 2500);
    } catch {
      setShareFeedback(null);
    }
  };

  return (
    <section
      aria-label="Today's daily scenario"
      className="rounded-xl bg-[var(--surface-card)] border border-[var(--border-crisp)] overflow-hidden"
    >
      <div className="p-4 sm:p-5 text-left grid sm:grid-cols-[1.05fr_0.95fr] sm:gap-6">
        <div className="space-y-3.5 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-display font-semibold text-[var(--ink-primary)] leading-tight">
                {challenge.title}
              </h2>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">Daily</p>
            </div>
            <Tag tone={beaten ? 'success' : completed ? 'warning' : 'neutral'} className="shrink-0 mt-1">
              {beaten ? (
                <>
                  <IconCheck className="w-3 h-3" />
                  <span>Cleared</span>
                </>
              ) : completed ? (
                <>
                  <IconClock className="w-3 h-3" />
                  <span>Played</span>
                </>
              ) : (
                <span>Not played</span>
              )}
            </Tag>
          </div>

          <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">{challenge.description}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--ink-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <IconClock className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
              <span>{countdown}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconFlame className="w-3.5 h-3.5 text-amber-600" />
              <span>{streak > 0 ? `${streak}-day clear streak` : 'No streak yet'}</span>
            </span>
            {bestStreak > 0 && <span>Best {bestStreak} {bestStreak === 1 ? 'day' : 'days'}</span>}
            {clearedThisMonth > 0 && <span>{clearedThisMonth} cleared this month</span>}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Button variant="primary" onClick={onPlay}>
              {completed ? 'Replay today' : 'Play today’s scenario'}
            </Button>
            {todayResult && (
              <Button variant="secondary" onClick={handleShare}>
                <IconShare className="w-3.5 h-3.5" />
                <span>Share score</span>
              </Button>
            )}
            {shareFeedback && (
              <span role="status" className="text-xs font-medium text-emerald-700">
                {shareFeedback}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3.5 pt-3.5 sm:mt-0 sm:pt-0 border-t sm:border-t-0 sm:border-l border-[var(--border-subtle)] sm:pl-6 flex flex-col gap-3 min-w-0">
          <div>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="text-xs font-medium text-[var(--ink-secondary)]">Last 14 days</span>
              <span className="text-xs text-[var(--ink-muted)]">Tick = cleared, dot = played</span>
            </div>
            <div
              role="list"
              aria-label="Daily scenario history for the last 14 days"
              className="grid grid-cols-[repeat(14,minmax(0,1fr))] sm:grid-cols-[repeat(7,minmax(0,1fr))] gap-1 max-w-[360px]"
            >
              {recentDays.map((date) => {
                const result = byDate.get(date);
                const isToday = date === todayKey;
                const label = result
                  ? `${formatDayLabel(date)}: ${result.beaten ? 'cleared' : 'played, not cleared'}, ${result.points} points`
                  : `${formatDayLabel(date)}: not played`;
                return (
                  <div
                    key={date}
                    role="listitem"
                    aria-label={label}
                    title={label}
                    className={`aspect-square rounded-[4px] flex items-center justify-center border ${
                      result?.beaten
                        ? 'bg-emerald-600 border-emerald-700 text-white'
                        : result
                        ? 'bg-amber-100 border-amber-300 text-amber-800'
                        : 'bg-[var(--surface-subcard)] border-[var(--border-subtle)]'
                    } ${isToday ? 'ring-2 ring-[var(--ink-primary)] ring-offset-1 ring-offset-[var(--surface-card)]' : ''}`}
                  >
                    {result?.beaten ? (
                      <IconCheck className="w-3 h-3" />
                    ) : result ? (
                      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
