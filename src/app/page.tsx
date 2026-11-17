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
      <header className="office-floating-card w-full max-w-5xl mx-auto rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div
            data-force-white="true"
            className="w-9 h-9 rounded-xl bg-[#09152b] text-white border border-slate-700 shadow-sm flex items-center justify-center shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M12 2L4 6v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V6l-8-4z" />
              <path d="M9 12l2 2 4-4" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-left">
            <div className="text-base sm:text-lg font-display font-black tracking-tight text-slate-900 uppercase leading-none">
              MY-<span className="text-[#047857]">11</span>
            </div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mt-0.5">
              Football Management &amp; Draft
            </div>
          </div>
        </div>

        <nav aria-label="Primary navigation" className="flex items-center gap-2">
          {/* History Screen Trigger Button */}
          <button
            type="button"
            onClick={() => router.push('/draft?phase=history')}
            aria-label="View Squad History & Personal Bests"
            title="View Squad History & Personal Bests"
            className="w-10 h-10 rounded-xl flex items-center justify-center office-subcard text-slate-700 hover:text-slate-900 cursor-pointer active:scale-95 transition-transform shadow-2xs"
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
            aria-label="How to Play & Game Guides"
            title="How to Play & Game Guides"
            className="w-10 h-10 rounded-xl flex items-center justify-center office-subcard text-slate-700 hover:text-slate-900 cursor-pointer active:scale-95 transition-transform shadow-2xs"
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
          onRandomDraft={() => router.push('/draft?mode=random')}
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
      <footer className="w-full py-8 text-center border-t border-[var(--office-divider)] text-[10px] font-bold text-[var(--office-text-muted)] uppercase tracking-widest select-none space-y-3 px-4 bg-white/60 backdrop-blur-md mt-8 safe-pb">
        <p className="max-w-md mx-auto text-[10px] text-[var(--office-text-muted)] leading-relaxed font-medium normal-case">
          MY-11 is an unofficial, independent football draft and management simulation game. Not affiliated with, sponsored by, or endorsed by any club, league, or governing body.
        </p>
        <div className="flex justify-center items-center gap-4 text-[var(--office-text-secondary)] normal-case text-xs font-semibold">
          <Link href="/privacy" className="hover:text-[#1d5eff] transition-colors">Privacy Policy</Link>
          <span className="text-[var(--office-text-muted)]">•</span>
          <Link href="/terms" className="hover:text-[#1d5eff] transition-colors">Terms of Service</Link>
        </div>
        <p className="text-[var(--office-text-muted)] text-[10px] font-mono tracking-wider">
          MY-11 © 2026 • BUILT FOR FOOTBALL FANS
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
