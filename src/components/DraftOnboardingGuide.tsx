import React, { useState } from 'react';
import { IconArrowRight } from './career/GameIcons';
import { Button, Eyebrow, SectionHeader } from '@/components/ui';

interface DraftOnboardingGuideProps {
  currentSlotIndex?: number;
  currentStep?: number;
  isFinished?: boolean;
  onSkip: () => void;
  onComplete: () => void;
}

export function DraftOnboardingGuide({
  currentSlotIndex = 0,
  currentStep,
  isFinished = false,
  onSkip,
  onComplete,
}: DraftOnboardingGuideProps) {
  // 1: Pick player, 2: Build chemistry, 3: Build & simulate
  const [internalStep, setInternalStep] = useState<number>(() => {
    if (currentStep) return currentStep;
    if (isFinished || currentSlotIndex >= 10) return 3;
    if (currentSlotIndex >= 1) return 2;
    return 1;
  });

  // The parent passes the step that matches draft progress; "Next" lets the player read ahead.
  const activeStep = Math.max(currentStep || 0, internalStep);

  const handleNext = () => {
    if (activeStep >= 3) onComplete();
    else setInternalStep(activeStep + 1);
  };

  const steps = [
    { title: 'Pick your player', description: 'Each round gives you up to 3 choices. Rating matters, but so does team fit.', actionLabel: 'Next' },
    { title: 'Build chemistry', description: 'Shared club, nation and era links lift your XI. Watch the chemistry value on each choice.', actionLabel: 'Next' },
    { title: 'Simulate the season', description: 'Draft all 11, then play a 38-game season. Can you go unbeaten?', actionLabel: 'Got it' },
  ];
  const step = steps[Math.min(Math.max(activeStep, 1), 3) - 1];

  return (
    <aside
      aria-label="First-run draft guide"
      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 relative z-30 animate-card-deal motion-reduce:animate-none"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <Eyebrow>Step {Math.min(Math.max(activeStep, 1), 3)} of 3</Eyebrow>
          <SectionHeader title={step.title} description={step.description} />
        </div>
      </div>

      <div className="flex justify-end items-center gap-2 mt-2">
        <Button variant="ghost" onClick={onSkip} aria-label="Skip guide">
          Skip
        </Button>
        <Button variant="primary" onClick={handleNext}>
          <span>{step.actionLabel}</span>
          {activeStep < 3 && <IconArrowRight className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </aside>
  );
}
