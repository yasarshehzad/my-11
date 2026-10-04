import React, { useState, useEffect } from 'react';

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

  useEffect(() => {
    if (currentStep) {
      setInternalStep(currentStep);
    }
  }, [currentStep]);

  const activeStep = currentStep || internalStep;

  const handleNext = () => {
    if (activeStep === 1) {
      setInternalStep(2);
    } else if (activeStep === 2) {
      setInternalStep(3);
    } else {
      onComplete();
    }
  };

  const stepsData = {
    1: {
      stepNumber: 1,
      badge: '🎯 STEP 1 OF 3',
      title: 'PICK YOUR PLAYER',
      description: 'Each round gives you 3 choices. Rating matters — but team fit matters too.',
      actionLabel: 'Next: Chemistry ➔',
    },
    2: {
      stepNumber: 2,
      badge: '🔗 STEP 2 OF 3',
      title: 'BUILD CHEMISTRY',
      description: 'Club, nation and era links can improve how your XI performs. Watch the projected CHEM tags.',
      actionLabel: 'Next: The Season ➔',
    },
    3: {
      stepNumber: 3,
      badge: '🏆 STEP 3 OF 3',
      title: 'BUILD THE TEAM, THEN SIMULATE',
      description: 'Draft all 11, then see how your XI survives a 38-game season. Can you go unbeaten?',
      actionLabel: 'Start Drafting! ⚽',
    },
  }[activeStep] || {
    stepNumber: 1,
    badge: '🎯 STEP 1 OF 3',
    title: 'PICK YOUR PLAYER',
    description: 'Each round gives you 3 choices. Rating matters — but team fit matters too.',
    actionLabel: 'Next ➔',
  };

  return (
    <aside
      aria-label="First-run draft guide"
      className="w-full rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/90 via-slate-950/95 to-slate-950/90 p-4 shadow-2xl relative z-30 transition-all duration-300 animate-card-deal glass"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 text-[8.5px] font-display font-black uppercase tracking-wider">
              {stepsData.badge}
            </span>
            <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
              Quick Guide
            </span>
          </div>

          <h3 className="text-sm font-display font-black text-foreground uppercase tracking-tight">
            {stepsData.title}
          </h3>

          <p className="text-xs text-slate-350 mt-1 leading-relaxed font-semibold">
            {stepsData.description}
          </p>
        </div>

        <button
          onClick={onSkip}
          type="button"
          className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors uppercase font-bold tracking-wider cursor-pointer flex-shrink-0"
          aria-label="Skip interactive guide"
        >
          Skip
        </button>
      </div>

      <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-900/80">
        {/* Step dots */}
        <div className="flex gap-1.5 items-center" aria-hidden="true">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === activeStep
                  ? 'w-6 bg-emerald-400'
                  : s < activeStep
                  ? 'w-1.5 bg-emerald-500/40'
                  : 'w-1.5 bg-slate-800'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          type="button"
          className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-display font-black text-xs uppercase tracking-wider shadow-md hover:shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        >
          {stepsData.actionLabel}
        </button>
      </div>
    </aside>
  );
}
