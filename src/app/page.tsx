'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  saveTheme,
  getHideTutorial,
  saveHideTutorial,
  getHideCareerTutorial,
  saveHideCareerTutorial,
  getSavedStreaks,
  getSavedPersonalBests,
  getDailyChallengeStatus,
  DEFAULT_STREAKS,
  DailyChallengeStatus,
} from '../utils/storage';
import { getTodayChallenge } from '../utils/dailyChallenges';
import { parseChallengeFromUrl, parseH2HChallengeFromUrl } from '../utils/challengeUrl';
import { logChallengeLinkOpened } from '../utils/analytics';
import {
  ChallengeTarget,
  ChallengeTemplate,
  PersonalBests,
  StreakStats,
  H2HSquadChallenge,
} from '../types/game';
import { HomeScreen } from '../components/HomeScreen';
import { HowToPlayModal } from '../components/HowToPlayModal';

export default function DraftedXIGame() {
  const router = useRouter();

  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialMode, setTutorialMode] = useState<'draft' | 'career' | 'all'>('draft');
  const [streakStats, setStreakStats] = useState<StreakStats>(DEFAULT_STREAKS);
  const [personalBests, setPersonalBests] = useState<PersonalBests>({});
  const [todayChallenge, setTodayChallenge] = useState<ChallengeTemplate | null>(null);
  const [dailyStatus, setDailyStatus] = useState<DailyChallengeStatus>({
    completed: false,
    score: 0,
    beaten: false,
  });
  const [incomingChallenge, setIncomingChallenge] = useState<ChallengeTarget | null>(null);
  const [incomingH2HChallenge, setIncomingH2HChallenge] = useState<H2HSquadChallenge | null>(null);

  useEffect(() => {
    saveTheme('light');
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      setTodayChallenge(getTodayChallenge(today));
      setStreakStats(getSavedStreaks());
      setPersonalBests(getSavedPersonalBests());
      setDailyStatus(getDailyChallengeStatus(dateStr));

      if (typeof window !== 'undefined' && window.location.search) {
        const parsed = parseChallengeFromUrl(window.location.search);
        if (parsed) {
          setIncomingChallenge(parsed);
          logChallengeLinkOpened(parsed.targetWins, parsed.targetPoints);
        }
        const parsedH2H = parseH2HChallengeFromUrl(window.location.search);
        if (parsedH2H) {
          setIncomingH2HChallenge(parsedH2H);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStartDraftWithTutorialCheck = () => {
    const hide = getHideTutorial();
    if (!hide) {
      setTutorialMode('draft');
      setShowTutorial(true);
    } else {
      router.push('/draft');
    }
  };

  const handleSelectCareerModeWithTutorialCheck = () => {
    const hide = getHideCareerTutorial();
    if (!hide) {
      setTutorialMode('career');
      setShowTutorial(true);
    } else {
      router.push('/career');
    }
  };

  const handleOpenHelpModal = () => {
    setTutorialMode('all');
    setShowTutorial(true);
  };

  const handleCloseTutorial = (dontShowAgain: boolean) => {
    setShowTutorial(false);
    if (dontShowAgain) {
      if (tutorialMode === 'draft') {
        saveHideTutorial(true);
      } else if (tutorialMode === 'career') {
        saveHideCareerTutorial(true);
      }
    }
  };

  const handleProceedTutorial = () => {
    setShowTutorial(false);
    if (tutorialMode === 'draft') {
      router.push('/draft');
    } else if (tutorialMode === 'career') {
      router.push('/career');
    }
  };

  const handleDismissChallenge = () => {
    setIncomingChallenge(null);
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const handleDismissH2HChallenge = () => {
    setIncomingH2HChallenge(null);
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  return (
    <div className="min-h-screen my11-canvas text-foreground font-sans flex flex-col w-full overflow-x-hidden p-3 sm:p-5 select-none">
      {/* Floating MY-11 Header Card */}
      <header className="w-full max-w-5xl mx-auto rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 flex items-center justify-between border border-[var(--border-crisp)] bg-[var(--surface-card)]">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0 text-[var(--ink-primary)]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 2L4 6v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V6l-8-4z" />
            <path d="M9 12l2 2 4-4" stroke="#047857" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="text-left">
            <div className="text-base sm:text-lg font-display font-semibold text-[var(--ink-primary)]">
              MY-11
            </div>
            <div className="text-xs text-[var(--ink-muted)]">
              Football management and draft
            </div>
          </div>
        </div>

        <nav aria-label="Primary navigation" className="flex items-center gap-2">
          {/* History Screen Trigger Button */}
          <button
            type="button"
            onClick={() => router.push('/draft?phase=history')}
            aria-label="View squad history and personal bests"
            title="Squad history and personal bests"
            className="w-11 h-11 rounded-lg flex items-center justify-center border border-[var(--border-crisp)] bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </button>

          {/* Help Tutorial Trigger Button */}
          <button
            type="button"
            onClick={handleOpenHelpModal}
            aria-label="How to play and game guides"
            title="How to play"
            className="w-11 h-11 rounded-lg flex items-center justify-center border border-[var(--border-crisp)] bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
        </nav>
      </header>

      {/* Main Homepage */}
      <main className="flex-1 w-full mx-auto flex flex-col justify-center max-w-5xl">
        <HomeScreen
          streakStats={streakStats}
          personalBests={personalBests}
          todayChallenge={todayChallenge}
          dailyStatus={dailyStatus}
          onStartDraft={handleStartDraftWithTutorialCheck}
          onPlayDailyChallenge={() => router.push('/draft?mode=daily_challenge')}
          incomingChallenge={incomingChallenge}
          onAcceptChallenge={() => router.push(`/draft${typeof window !== 'undefined' ? window.location.search : ''}`)}
          onDismissChallenge={handleDismissChallenge}
          incomingH2HChallenge={incomingH2HChallenge}
          onAcceptH2HChallenge={() => router.push(`/draft${typeof window !== 'undefined' ? window.location.search : ''}`)}
          onDismissH2HChallenge={handleDismissH2HChallenge}
          onSelectCareerMode={handleSelectCareerModeWithTutorialCheck}
        />
      </main>

      {/* App Footer */}
      <footer className="w-full py-8 text-center border-t border-[var(--border-subtle)] text-xs text-[var(--ink-muted)] select-none space-y-3 px-4 safe-pb">
        <p className="max-w-md mx-auto text-xs text-[var(--ink-muted)] leading-relaxed">
          MY-11 is an unofficial, independent football draft and management simulation game. Not affiliated with, sponsored by, or endorsed by any club, league, or governing body.
        </p>
        <div className="flex flex-col items-center gap-1 text-[var(--ink-secondary)] text-xs font-medium">
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
            <Link href="/progress" className="inline-flex items-center min-h-11 hover:text-[#1d5eff] transition-colors">Progress</Link>
            <Link href="/career" className="inline-flex items-center min-h-11 hover:text-[#1d5eff] transition-colors">Career saves</Link>
            <Link href="/drafts" className="inline-flex items-center min-h-11 hover:text-[#1d5eff] transition-colors">Draft ideas</Link>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
            <Link href="/privacy" className="inline-flex items-center min-h-11 hover:text-[#1d5eff] transition-colors">Privacy policy</Link>
            <Link href="/terms" className="inline-flex items-center min-h-11 hover:text-[#1d5eff] transition-colors">Terms of service</Link>
          </div>
        </div>
        <p className="text-[var(--ink-muted)] text-xs">
          MY-11 © 2026 · Built for football fans
        </p>
      </footer>

      {/* How to Play Tutorial Modal */}
      <HowToPlayModal
        isOpen={showTutorial}
        mode={tutorialMode}
        onClose={handleCloseTutorial}
        onProceed={handleProceedTutorial}
      />
    </div>
  );
}
