import React, { useState } from 'react';
import { IconClose } from './career/GameIcons';
import { Button, SectionHeader } from '@/components/ui';

interface GuideStep {
  title: string;
  body: React.ReactNode;
}

const draftSteps: GuideStep[] = [
  {
    title: 'Choose formation and tactics',
    body: (
      <>
        Select your formation (4-3-3, 4-4-2 and so on) and league. Turn on <b>Draft IQ</b> for live chemistry advice and positional notes.
      </>
    ),
  },
  {
    title: 'Draft 11 player cards',
    body: (
      <>
        Pick from 3 player choices per slot. Link teammates with matching <b>nationality</b>, <b>club</b> or <b>era</b> to raise chemistry.
      </>
    ),
  },
  {
    title: 'Simulate the season',
    body: 'Simulate a full 38-game league season in seconds. Follow the goals, climb the table, and challenge friends to beat your win tally.',
  },
];

const careerSteps: GuideStep[] = [
  {
    title: 'Pick your club',
    body: (
      <>
        Manage any of the 20 Premier League clubs with updated <b>2026/27</b> rosters, budgets and club profiles.
      </>
    ),
  },
  {
    title: '25-man Premier League registration',
    body: (
      <>
        Register up to 25 senior players (age 22+). <b>Under-21 players are exempt</b> from the cap, with a full 35-player squad capacity. Maximum 17 foreign seniors.
      </>
    ),
  },
  {
    title: 'Transfers and youth academy',
    body: 'Scout players, submit transfer bids, negotiate contracts, and promote high-potential teenagers from your youth academy.',
  },
  {
    title: 'Compete for domestic and European trophies',
    body: 'Simulate week-by-week fixtures across the English Top Flight, FA Cup, League Cup and European Champions Cup over multi-season careers.',
  },
];

export interface HowToPlayModalProps {
  isOpen: boolean;
  mode?: 'draft' | 'career' | 'all';
  onClose: (dontShowAgain: boolean) => void;
  onProceed?: () => void;
}

export function HowToPlayModal({
  isOpen,
  mode = 'draft',
  onClose,
  onProceed,
}: HowToPlayModalProps) {
  const [activeTab, setActiveTab] = useState<'draft' | 'career'>(
    mode === 'career' ? 'career' : 'draft'
  );
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const [prevMode, setPrevMode] = useState(mode);
  if (mode !== prevMode) {
    setPrevMode(mode);
    if (mode === 'career') setActiveTab('career');
    else if (mode === 'draft') setActiveTab('draft');
  }

  if (!isOpen) return null;

  const handleAction = () => {
    onClose(dontShowAgain);
    if (onProceed) {
      onProceed();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 cursor-pointer transition-opacity"
        onClick={() => onClose(false)}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="w-full max-w-lg office-floating-card rounded-xl p-5 sm:p-6 relative z-10 space-y-5 animate-card-deal motion-reduce:animate-none my-auto max-h-[90dvh] overflow-y-auto scrollbar-none">
        {/* Modal Header */}
        <div className="flex justify-between items-center gap-3 pb-3 border-b border-[var(--office-divider)]">
          <h3
            id="how-to-play-title"
            className="text-base font-display font-semibold text-[var(--ink-primary)]"
          >
            {mode === 'all'
              ? 'MY-11 game guide'
              : activeTab === 'draft'
              ? 'Draft mode guide'
              : 'Career mode guide'}
          </h3>
          <button
            type="button"
            onClick={() => onClose(false)}
            aria-label="Close modal"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)] cursor-pointer transition-colors shrink-0"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher if mode is 'all' */}
        {mode === 'all' && (
          <div className="flex gap-1 rounded-lg bg-[var(--surface-subcard)] border border-[var(--border-subtle)] p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('draft')}
              aria-pressed={activeTab === 'draft'}
              className={`flex-1 min-h-10 px-3 rounded-md border transition-colors cursor-pointer inline-flex items-center justify-center ${
                activeTab === 'draft'
                  ? 'bg-[var(--surface-card)] text-[var(--ink-primary)] border-[var(--border-crisp)]'
                  : 'border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
              }`}
            >
              Draft mode
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('career')}
              aria-pressed={activeTab === 'career'}
              className={`flex-1 min-h-10 px-3 rounded-md border transition-colors cursor-pointer inline-flex items-center justify-center ${
                activeTab === 'career'
                  ? 'bg-[var(--surface-card)] text-[var(--ink-primary)] border-[var(--border-crisp)]'
                  : 'border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
              }`}
            >
              Career mode
            </button>
          </div>
        )}

        {/* Guide steps */}
        <ol className="space-y-4">
          {(activeTab === 'draft' ? draftSteps : careerSteps).map((step, i) => (
            <li key={step.title} className="flex gap-3 items-baseline">
              <span className="w-4 shrink-0 text-sm font-display font-semibold text-[var(--ink-muted)] tabular-nums">
                {i + 1}
              </span>
              <SectionHeader as="h4" title={step.title} description={step.body} className="min-w-0" />
            </li>
          ))}
        </ol>

        {/* Footer with "Don't show again" & Action CTA */}
        <div className="pt-3 border-t border-[var(--office-divider)] flex flex-col gap-3">
          {mode !== 'all' && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded accent-amber-600 w-4 h-4"
              />
              <span className="text-sm text-[var(--ink-secondary)]">
                Don&apos;t show again
              </span>
            </label>
          )}

          <Button variant="primary" fullWidth onClick={handleAction}>
            {mode === 'all'
              ? 'Got it'
              : activeTab === 'draft'
              ? 'Start draft'
              : 'Enter career mode'}
          </Button>
        </div>
      </div>
    </div>
  );
}
