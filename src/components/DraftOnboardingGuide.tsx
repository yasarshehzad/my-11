import React, { useState } from 'react';
import { IconTarget, IconHandshake, IconTrophy, IconArrowRight } from './career/GameIcons';

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
    { title: 'Pick your player', description: 'Each round gives you 3 choices. Rating matters, but so does team fit.', actionLabel: 'Next' },
    { title: 'Build chemistry', description: 'Shared club, nation and era links lift your XI. Watch the CHEM value on each choice.', actionLabel: 'Next' },
    { title: 'Simulate the season', description: 'Draft all 11, then play a 38-game season. Can you go unbeaten?', actionLabel: 'Got it' },
  ];
  const step = steps[Math.min(Math.max(activeStep, 1), 3) - 1];

  return (
    <aside
      aria-label="First-run draft guide"
      className="w-full rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 relative z-30 animate-card-deal motion-reduce:animate-none"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-display font-black uppercase tracking-wider text-blue-700 inline-flex items-center gap-1">
            {activeStep === 1 ? (
              <IconTarget className="w-3 h-3" />
            ) : activeStep === 2 ? (
              <IconHandshake className="w-3 h-3" />
            ) : (
              <IconTrophy className="w-3 h-3" />
            )}
            <span>Step {Math.min(Math.max(activeStep, 1), 3)} of 3</span>
          </span>
          <h3 className="text-sm font-display font-black text-[#0b1536] uppercase tracking-tight">
            {step.title}
          </h3>
          <p className="text-xs text-slate-700 mt-0.5 leading-snug font-medium">
            {step.description}
          </p>
        </div>
      </div>

      <div className="flex justify-end items-center gap-2 mt-2">
        <button
          onClick={onSkip}
          type="button"
          className="min-h-[40px] px-3 rounded-xl text-[11px] text-slate-600 hover:text-[#0b1536] uppercase font-bold tracking-wider cursor-pointer"
          aria-label="Skip guide"
        >
          Skip
        </button>
        <button
          onClick={handleNext}
          type="button"
          className="min-h-[40px] px-4 rounded-xl office-action-btn-primary text-white font-display font-black text-xs uppercase tracking-wider active:scale-95 transition-transform cursor-pointer inline-flex items-center gap-1.5"
        >
          <span>{step.actionLabel}</span>
          {activeStep < 3 && <IconArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  );
}
