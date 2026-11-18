import React from 'react';
import { ChallengeTemplate } from '../types/game';
import { DailyChallengeStatus } from '../utils/storage';
import { Button, Eyebrow } from '@/components/ui';

interface DailyChallengeBannerProps {
  todayChallenge: ChallengeTemplate | null;
  dailyStatus: DailyChallengeStatus;
  onPlay: () => void;
}

export function DailyChallengeBanner({
  todayChallenge,
  dailyStatus,
  onPlay,
}: DailyChallengeBannerProps) {
  if (!todayChallenge) {
    return (
      <div className="w-full max-w-[340px] h-[210px] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subcard)]" />
    );
  }

  return (
    <div className="w-full max-w-[340px] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 text-left relative animate-card-deal motion-reduce:animate-none">
      <Eyebrow>Today&apos;s challenge</Eyebrow>

      <h3 className="text-lg font-display font-semibold text-[var(--ink-primary)] mt-1 leading-tight">
        {todayChallenge.title}
      </h3>

      <p className="text-sm text-[var(--ink-secondary)] leading-relaxed mt-2">
        {todayChallenge.description}
      </p>

      {dailyStatus.completed && (
        <p className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-sm text-[var(--ink-secondary)] flex justify-between items-center gap-2">
          <span className={`font-medium ${dailyStatus.beaten ? 'text-emerald-700' : 'text-rose-700'}`}>
            {dailyStatus.beaten ? 'Cleared' : 'Failed'}
          </span>
          <span>
            Score: <span className="font-semibold text-[var(--ink-primary)]">{dailyStatus.score}</span>
          </span>
        </p>
      )}

      <Button variant="primary" fullWidth onClick={onPlay} className="mt-4 min-h-11">
        {dailyStatus.completed ? 'Play again' : 'Play'}
      </Button>
    </div>
  );
}
