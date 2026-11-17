import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Player, FormationType, SimulationResult, ChallengeTemplate, MatchSimResult, H2HShowdownResult } from '../types/game';
import { FORMATION_SLOTS, getDetailedChemistryLogs } from '../utils/gameLogic';
import { PitchLayout } from './PitchLayout';
import { StatsDisplay } from './StatsDisplay';
import { SharePreview } from './SharePreview';
import { getAllClubs, getEffectiveClubName } from '../career/clubs';
import { createNewCareerSave, hydrateCareerSaveVault, listSaveSlots, ValidSlotId } from '../career/saves';
import { ensureCareerDatabaseLoaded } from '../career/databaseExpansion';
import { validateSettings } from '../career/settings';
import { formatCareerCurrency } from '../career/formatters';
import {
  IconClock,
  IconHeart,
  IconCrown,
  IconTrophy,
  IconHandshake,
  IconCheck,
  IconClose,
  IconAlert,
  IconStar,
  IconMedal,
  IconShield,
  IconChevronUp,
  IconChevronDown,
  IconPlay,
  IconRefresh,
} from './career/GameIcons';

interface SeasonResultsProps {
  formation: FormationType;
  selectedPlayers: (Player | null)[];
  stats: { attack: number; midfield: number; defence: number; chemistry: number; overall: number };
  simResult: SimulationResult;
  isDailyChallenge: boolean;
  todayChallenge: ChallengeTemplate | null;
  challengeBeaten: boolean;
  exportRef: React.RefObject<HTMLDivElement | null>;
  h2hShowdown?: H2HShowdownResult | null;
  onStartDraft: () => void;
  onRandomDraft: () => void;
}

export function SeasonResults({
  formation,
  selectedPlayers,
  stats,
  simResult,
  isDailyChallenge,
  todayChallenge,
  challengeBeaten,
  exportRef,
  h2hShowdown,
  onStartDraft,
  onRandomDraft,
}: SeasonResultsProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiAnimRef = useRef<number | null>(null);

  const router = useRouter();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [tab, setTab] = useState<'summary' | 'squad' | 'story'>('summary');
  const [showTips, setShowTips] = useState(false);
  const [showAllHighlights, setShowAllHighlights] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<ValidSlotId>('slot_1');
  const [selectedClubId, setSelectedClubId] = useState<string>('man_blue');
  const [managerName, setManagerName] = useState<string>('Manager');
  const [managerNationality, setManagerNationality] = useState<string>('England');
  const [budgetMultiplier, setBudgetMultiplier] = useState<number>(1.0);
  const [isExporting, setIsExporting] = useState(false);
  const [saveSlots, setSaveSlots] = useState<ReturnType<typeof listSaveSlots>>([]);

  const openExportModal = () => {
    setShowExportModal(true);
    if (typeof window !== 'undefined') {
      void Promise.all([
        hydrateCareerSaveVault(),
        ensureCareerDatabaseLoaded('2026/27'),
      ]).then(() => {
        const slots = listSaveSlots();
        setSaveSlots(slots);
        const firstEmpty = slots.find((s) => s.isEmpty);
        if (firstEmpty) {
          setSelectedSlot(firstEmpty.slotId);
        }
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showExportModal) setShowExportModal(false);
      if (showShare) setShowShare(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showExportModal, showShare]);

  const handleConfirmExport = async () => {
    setIsExporting(true);
    try {
      await Promise.all([
        hydrateCareerSaveVault(),
        ensureCareerDatabaseLoaded('2026/27'),
      ]);
      const clubs = getAllClubs();
      const targetClub = clubs.find((c) => c.id === selectedClubId) || clubs[0];
      const validDrafted = selectedPlayers.filter((p): p is Player => Boolean(p));

      const finalSettings = validateSettings({
        preset: 'hard',
        startingBudgetMultiplier: budgetMultiplier,
      });

      createNewCareerSave({
        slotId: selectedSlot,
        manager: {
          name: managerName.trim() || 'Manager',
          nationality: managerNationality.trim() || 'England',
        },
        club: targetClub,
        settings: finalSettings,
        customDraftedPlayers: validDrafted,
        initialFormation: formation,
      });

      router.push(`/career/play?slot=${selectedSlot}`);
    } catch {
      setIsExporting(false);
    }
  };

  // Confetti Animation for 35+ wins
  useEffect(() => {
    if (simResult.wins < 35) {
      if (confettiAnimRef.current) {
        cancelAnimationFrame(confettiAnimRef.current);
        confettiAnimRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    const particles = Array.from({ length: 90 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height - 20,
      size: Math.random() * 6 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2,
      speedX: Math.random() * 2 - 1,
      rotation: Math.random() * 360,
      rotSpeed: Math.random() * 4 - 2,
    }));

    const updateConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotSpeed;

        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      confettiAnimRef.current = requestAnimationFrame(updateConfetti);
    };

    updateConfetti();

    return () => {
      if (confettiAnimRef.current) {
        cancelAnimationFrame(confettiAnimRef.current);
        confettiAnimRef.current = null;
      }
    };
  }, [simResult.wins]);

  const leagueFinishLabel = {
    1: 'LEAGUE CHAMPIONS',
    2: 'RUNNERS-UP',
    3: '3RD PLACE',
    4: '4TH PLACE (CHAMPIONS LEAGUE)',
    5: '5TH PLACE (EUROPA LEAGUE)',
    6: '6TH PLACE (EUROPA LEAGUE)',
    7: '7TH PLACE',
  }[simResult.leaguePosition] || `#${simResult.leaguePosition} MID-TABLE`;

  const renderFinishIcon = (pos: number) => {
    if (pos === 1) return <IconTrophy className="w-3.5 h-3.5 shrink-0" />;
    if (pos <= 3) return <IconMedal className="w-3.5 h-3.5 shrink-0" />;
    if (pos <= 7) return <IconStar className="w-3.5 h-3.5 shrink-0" filled />;
    return <IconHandshake className="w-3.5 h-3.5 shrink-0" />;
  };

  const getFinishAccentClass = (pos: number) => {
    if (pos === 1) return 'from-amber-400 to-yellow-500 text-yellow-950 border-yellow-500 shadow-amber-500/20';
    if (pos <= 4) return 'from-indigo-100 to-blue-100 text-blue-950 border-blue-200';
    return 'from-slate-100 to-slate-200 text-slate-800 border-slate-300';
  };

  const isSoClose = simResult.wins === 36 || simResult.wins === 37;

  const getMatchCommentary = (match: MatchSimResult) => {
    const diff = match.ourScore - match.opponentScore;
    if (match.outcome === 'W') {
      if (diff >= 3) return 'An absolute masterclass. Complete dominance from kick-off.';
      if (diff >= 2) return 'A comfortable performance, controlled the match beautifully.';
      return 'A hard-fought victory. Held on under late pressure.';
    } else if (match.outcome === 'L') {
      if (diff <= -3) return 'Completely outclassed. The opponent rating gap was too wide.';
      if (diff <= -2) return 'Defensive errors cost you. Opponent capitalized on key errors.';
      return 'Unlucky. A very tight game decided by a narrow margin.';
    } else {
      if (match.ourScore === 0) return 'A scoreless, defensive stalemate. Strong defensive displays.';
      return 'A lively draw. High-scoring end-to-end tactical battle.';
    }
  };

  // Short pointers for the next draft (the season review already explains what worked and what did not)
  const nextDraftTips: string[] = [];
  if (stats.chemistry < 80) nextDraftTips.push(`Chemistry ${stats.chemistry}/100: link neighbours by club, nation or era.`);
  if (stats.attack < 82) nextDraftTips.push(`Attack ${stats.attack}: pick forwards with finishing and pace.`);
  if (stats.midfield < 82) nextDraftTips.push(`Midfield ${stats.midfield}: pick CM/CDMs with passing and technique.`);
  if (stats.defence < 82) nextDraftTips.push(`Defence ${stats.defence}: add a leading CB or a holding CDM.`);
  if (isDailyChallenge && todayChallenge?.rule === 'no_legends') {
    nextDraftTips.push('No legends: lean on chemistry blocks such as a shared club or nation.');
  } else if (isDailyChallenge && todayChallenge?.rule === 'underdog_xi') {
    nextDraftTips.push('Underdog XI: look for Rare cards with strong club or nation links.');
  }

  const activePlayers = selectedPlayers.filter((p): p is Player => p !== null);
  const story = simResult.seasonStory;
  const highlights = simResult.highlights || [];
  const shownHighlights = showAllHighlights ? highlights : highlights.slice(0, 3);
  const leagueName = {
    english: 'Premier League',
    spanish: 'La Liga',
    german: 'Bundesliga',
    italian: 'Serie A',
    french: 'Ligue 1',
  }[simResult.selectedLeague || 'english'];
  const modeName =
    simResult.draftModifier === 'quick' ? 'Quick draft' : simResult.draftModifier === 'mystery' ? 'Mystery draft' : 'Classic draft';
  const slipUps = 38 - simResult.wins;
  const bannerClass = 'w-full px-4 py-2.5 rounded-2xl border flex items-center gap-2 text-xs font-bold';
  const sectionLabel = 'text-[10px] font-black text-slate-500 uppercase tracking-widest';
  const tabs = [
    { id: 'summary' as const, label: 'Summary' },
    { id: 'squad' as const, label: 'Squad & Stats' },
    { id: 'story' as const, label: 'Season Story' },
  ];

  return (
    <div className="flex flex-col gap-4 px-4 sm:px-6 py-5 w-full max-w-lg mx-auto min-h-[95vh] relative overflow-hidden">
      {simResult.wins >= 35 && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-50 w-full h-full"
        />
      )}

      {/* Results Header */}
      <div className="text-center relative z-10">
        <h2 className="text-2xl font-display font-black text-[#0b1536] uppercase tracking-tight leading-none">
          Season Complete
        </h2>
        <p className="text-[11px] text-slate-600 font-bold mt-1.5">
          {leagueName} · {modeName}
          {isDailyChallenge && todayChallenge ? ` · ${todayChallenge.title}` : ''}
        </p>
      </div>

      {/* One-line banners */}
      {(isSoClose || simResult.wins === 38 || simResult.beatTargetResult || (simResult.newPersonalBests && simResult.newPersonalBests.length > 0)) && (
        <div className="flex flex-col gap-2 relative z-10">
          {isSoClose && (
            <div className={`${bannerClass} border-rose-200 bg-rose-50/90 text-rose-800`}>
              <IconHeart className="w-4 h-4 text-rose-600 shrink-0" />
              <span>So close: {slipUps} slip-up{slipUps > 1 ? 's' : ''} from a perfect 38-0.</span>
            </div>
          )}

          {simResult.wins === 38 && (
            <div className={`${bannerClass} border-amber-300 bg-amber-50/90 text-amber-800`}>
              <IconCrown className="w-4 h-4 text-amber-600 shrink-0" />
              <span>The perfect season: 38 wins from 38.</span>
            </div>
          )}

          {simResult.beatTargetResult && (
            <div className={`${bannerClass} ${
              simResult.beatTargetResult.beaten
                ? 'border-blue-200 bg-blue-50/80 text-blue-900'
                : simResult.beatTargetResult.matched
                ? 'border-amber-200 bg-amber-50/80 text-amber-900'
                : 'border-slate-200 bg-slate-50/80 text-slate-800'
            }`}>
              {simResult.beatTargetResult.beaten ? (
                <IconTrophy className="w-4 h-4 text-blue-700 shrink-0" />
              ) : simResult.beatTargetResult.matched ? (
                <IconHandshake className="w-4 h-4 text-amber-700 shrink-0" />
              ) : (
                <IconClock className="w-4 h-4 text-slate-600 shrink-0" />
              )}
              <span>
                {simResult.beatTargetResult.beaten
                  ? `Target beaten: ${simResult.wins} wins vs ${simResult.beatTargetResult.targetWins}.`
                  : simResult.beatTargetResult.matched
                  ? `Target matched: ${simResult.wins} wins.`
                  : `Target missed: ${simResult.wins} wins vs ${simResult.beatTargetResult.targetWins}.`}
              </span>
            </div>
          )}

          {simResult.newPersonalBests && simResult.newPersonalBests.length > 0 && (
            <div className={`${bannerClass} border-blue-200 bg-blue-50/90 text-blue-800`}>
              <IconTrophy className="w-4 h-4 text-blue-700 shrink-0" />
              <span>New personal best: {simResult.newPersonalBests.join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Head-to-Head Showdown (2-Legged Clash) */}
      {h2hShowdown && (
        <div className={`w-full p-4 rounded-2xl border relative z-10 space-y-3 ${
          h2hShowdown.winner === 'user'
            ? 'border-emerald-300 bg-emerald-50/80'
            : h2hShowdown.winner === 'challenger'
            ? 'border-rose-300 bg-rose-50/80'
            : 'border-amber-300 bg-amber-50/80'
        }`}>
          <div className="text-center">
            <div className={`inline-flex items-center gap-1.5 text-[11px] font-display font-black uppercase tracking-wider ${
              h2hShowdown.winner === 'user'
                ? 'text-emerald-800'
                : h2hShowdown.winner === 'challenger'
                ? 'text-rose-800'
                : 'text-amber-800'
            }`}>
              {h2hShowdown.winner === 'user' ? (
                <IconTrophy className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <IconHandshake className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {h2hShowdown.winner === 'user'
                  ? 'H2H win'
                  : h2hShowdown.winner === 'challenger'
                  ? 'H2H defeat'
                  : 'H2H draw'}
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 mt-1 text-[#0b1536]">
              <span className="text-xs font-display font-black uppercase">Your XI</span>
              <span className="text-2xl font-display font-black tracking-tight leading-none">
                {h2hShowdown.userAggregateGoals} - {h2hShowdown.challengerAggregateGoals}
              </span>
              <span className="text-xs font-display font-black uppercase truncate">{h2hShowdown.challenger.clubName}</span>
            </div>

            {h2hShowdown.decidedByPenalties && (
              <p className="text-[11px] font-bold text-slate-700 mt-1">
                Penalties {h2hShowdown.userPenalties ?? 0} - {h2hShowdown.challengerPenalties ?? 0}
              </p>
            )}
          </div>

          <div className="text-[11px] text-slate-700 font-semibold divide-y divide-slate-200/80 border-t border-slate-200/80">
            <p className="py-1.5 flex justify-between gap-2">
              <span>You ({formation})</span>
              <span>{stats.overall} OVR · {stats.chemistry} chem</span>
            </p>
            <p className="py-1.5 flex justify-between gap-2">
              <span className="truncate">{h2hShowdown.challenger.managerName} ({h2hShowdown.challenger.formation})</span>
              <span className="shrink-0">{h2hShowdown.challengerStats.overall} OVR · {h2hShowdown.challengerStats.chemistry} chem</span>
            </p>
            {h2hShowdown.legs.map((leg) => (
              <div key={leg.leg} className="py-1.5">
                <p className="flex justify-between gap-2 font-black text-[#0b1536]">
                  <span>Leg {leg.leg} ({leg.venue === 'home' ? 'home' : 'away'})</span>
                  <span>{leg.userGoals} - {leg.challengerGoals}</span>
                </p>
                {(leg.userScorers.length > 0 || leg.challengerScorers.length > 0) && (
                  <p className="font-medium text-slate-600">
                    {[
                      leg.userScorers.length > 0 ? `You: ${leg.userScorers.join(', ')}` : '',
                      leg.challengerScorers.length > 0 ? `Them: ${leg.challengerScorers.join(', ')}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
            ))}
            <p className="py-1.5 flex items-start gap-1.5">
              <IconStar className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>
                MOTM {h2hShowdown.motmName}. <span className="font-medium text-slate-600">{h2hShowdown.summary}</span>
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Main League Outcome Card */}
      <div className="w-full flex flex-col items-center p-5 office-floating-card relative overflow-hidden text-center z-10">
        {isDailyChallenge ? (
          <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border font-display font-black text-xs uppercase tracking-wider mb-3 leading-none ${
            challengeBeaten
              ? 'bg-blue-50 text-blue-800 border-blue-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}>
            {challengeBeaten ? <IconCheck className="w-4 h-4 shrink-0" /> : <IconClose className="w-4 h-4 shrink-0" />}
            <span>{challengeBeaten ? 'Challenge cleared' : 'Challenge failed'}</span>
          </div>
        ) : (
          <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r border font-display font-black text-xs uppercase tracking-wider ${getFinishAccentClass(simResult.leaguePosition)} mb-3 leading-none`}>
            {renderFinishIcon(simResult.leaguePosition)}
            <span>{leagueFinishLabel}</span>
          </div>
        )}

        <p className="text-4xl font-display font-black text-[#0b1536] leading-none tracking-tight">
          {simResult.wins}W - {simResult.draws}D - {simResult.losses}L
        </p>

        <p className="text-xs font-bold text-slate-600 mt-2 leading-none">
          <span className="text-[#0b1536] font-extrabold">{simResult.points} pts</span> · goals{' '}
          <span className="text-[#0b1536] font-extrabold">{simResult.goalsFor}-{simResult.goalsAgainst}</span>
          {story ? ` · expected ${story.expectedWinsBand}` : ''}
        </p>

        {story && (
          <p className={`text-[11px] font-black uppercase tracking-wider mt-2 ${
            story.verdict === 'Exceeded expectations'
              ? 'text-emerald-700'
              : story.verdict === 'Underperformed'
              ? 'text-rose-700'
              : 'text-indigo-700'
          }`}>
            {story.verdict}
          </p>
        )}

        <p className="text-xs font-medium text-slate-600 max-w-sm leading-relaxed mt-2">{simResult.summary}</p>
      </div>

      {/* Actions (visible on every tab) */}
      <div className="grid grid-cols-2 gap-2 relative z-10">
        <button
          type="button"
          onClick={onStartDraft}
          className="min-h-[44px] px-3 rounded-2xl office-play-match-btn text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-98"
        >
          <IconRefresh className="w-4 h-4 shrink-0" />
          <span>New Draft</span>
        </button>
        <button
          type="button"
          onClick={() => setShowShare(true)}
          className="min-h-[44px] px-3 rounded-2xl office-action-btn-primary text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-98"
        >
          <span>Share / Challenge</span>
        </button>
        <button
          type="button"
          onClick={onRandomDraft}
          className="min-h-[40px] px-3 rounded-2xl office-subcard text-[#0b1536] hover:bg-slate-100 font-display font-black text-[11px] uppercase tracking-wider cursor-pointer active:scale-98"
        >
          Random Draft
        </button>
        <button
          type="button"
          onClick={openExportModal}
          className="min-h-[40px] px-3 rounded-2xl office-subcard text-emerald-800 hover:bg-emerald-50 font-display font-black text-[11px] uppercase tracking-wider cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-98"
        >
          <IconPlay className="w-3.5 h-3.5 shrink-0" />
          <span>Take to Career</span>
        </button>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Season results" className="flex gap-1 p-1 office-subcard relative z-10 text-[11px] font-display font-black uppercase tracking-wider">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`results-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="results-tabpanel"
            onClick={() => setTab(t.id)}
            className={`flex-1 min-h-[40px] px-1 rounded-xl cursor-pointer whitespace-nowrap ${
              tab === t.id ? 'office-nav-tab-active shadow-sm' : 'office-nav-tab'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="results-tabpanel" role="tabpanel" aria-labelledby={`results-tab-${tab}`} className="flex flex-col gap-4 relative z-10 w-full">
        {tab === 'summary' && (
          <>
            {/* Condensed season review */}
            {story && (
              <div className="office-floating-card p-4 space-y-2">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <h3 className="text-base font-display font-black text-[#0b1536] uppercase tracking-tight">{story.title}</h3>
                  <span className="text-[11px] font-bold text-slate-600">{story.longestStreak.description}</span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed flex items-start gap-1.5">
                  <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{story.whyItWorked}</span>
                </p>
                <p className="text-xs text-slate-700 font-medium leading-relaxed flex items-start gap-1.5">
                  <IconAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{story.whatHeldBack}</span>
                </p>
                {nextDraftTips.length > 0 && (
                  <div className="pt-1 border-t border-[var(--office-divider)]">
                    <button
                      type="button"
                      aria-expanded={showTips}
                      onClick={() => setShowTips(!showTips)}
                      className="w-full min-h-[40px] flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-600 cursor-pointer"
                    >
                      <span>Tips for next draft ({nextDraftTips.length})</span>
                      {showTips ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
                    </button>
                    {showTips && (
                      <ul className="text-xs text-slate-700 font-medium leading-relaxed space-y-1 pb-1 list-disc pl-4">
                        {nextDraftTips.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Awards */}
            <div className="office-subcard px-4 divide-y divide-[var(--office-divider)] text-xs">
              <p className="py-2.5 flex items-center gap-2">
                <IconStar className="w-3.5 h-3.5 text-amber-500 shrink-0" filled />
                <span className="font-bold text-slate-600">MVP</span>
                <span className="ml-auto font-display font-black text-[#0b1536] uppercase truncate">{simResult.mvp.displayName}</span>
              </p>
              {simResult.topScorer && (
                <p className="py-2.5 flex items-center gap-2">
                  <IconMedal className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="font-bold text-slate-600">Golden Boot</span>
                  <span className="ml-auto font-display font-black text-[#0b1536] uppercase truncate">
                    {simResult.topScorer.player.displayName} · {simResult.topScorer.goals}
                  </span>
                </p>
              )}
              {simResult.cleanSheets !== undefined && (
                <p className="py-2.5 flex items-center gap-2">
                  <IconShield className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span className="font-bold text-slate-600">Clean sheets</span>
                  <span className="ml-auto font-display font-black text-[#0b1536]">{simResult.cleanSheets}</span>
                </p>
              )}
            </div>

            {/* Key match highlights */}
            {highlights.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className={`${sectionLabel} px-1`}>Key matches</span>
                <div className="office-subcard px-4 divide-y divide-[var(--office-divider)]">
                  {shownHighlights.map((hl, i) => (
                    <div key={i} className="py-2.5 text-left">
                      <div className="flex justify-between items-baseline gap-2">
                        <h4 className="text-xs font-display font-black text-[#0b1536] uppercase truncate">
                          vs {hl.match.opponent}
                        </h4>
                        <span className="text-xs font-display font-black text-blue-600 shrink-0">
                          {hl.match.ourScore} - {hl.match.opponentScore}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-amber-700">
                        {hl.categoryLabel} · MD {hl.matchIndex + 1}
                      </p>
                      <p className="text-[11px] text-slate-600 font-medium leading-snug line-clamp-2">
                        {hl.match.headline || hl.description}
                      </p>
                    </div>
                  ))}
                </div>
                {highlights.length > 3 && (
                  <button
                    type="button"
                    aria-expanded={showAllHighlights}
                    onClick={() => setShowAllHighlights(!showAllHighlights)}
                    className="min-h-[40px] text-[11px] font-black uppercase tracking-wider text-blue-700 cursor-pointer inline-flex items-center justify-center gap-1"
                  >
                    <span>{showAllHighlights ? 'Show fewer' : `Show all ${highlights.length}`}</span>
                    {showAllHighlights ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'squad' && (
          <>
            <PitchLayout formation={formation} selectedPlayers={selectedPlayers} currentSlotIndex={-1} />
            <StatsDisplay
              attack={stats.attack}
              midfield={stats.midfield}
              defence={stats.defence}
              chemistry={stats.chemistry}
              overall={stats.overall}
              logs={getDetailedChemistryLogs(selectedPlayers, FORMATION_SLOTS[formation])}
            />
          </>
        )}

        {tab === 'story' && (
          <>
            {story && (
              <div className="office-floating-card p-4 space-y-2 text-xs text-slate-700 font-medium leading-relaxed">
                <p><span className="font-black text-[#0b1536]">Start. </span>{story.howStarted}</p>
                {story.turningPoint && (
                  <p><span className="font-black text-[#0b1536]">Turning point. </span>{story.turningPoint}</p>
                )}
                <p><span className="font-black text-[#0b1536]">Finish. </span>{story.howEnded}</p>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className={`${sectionLabel} px-1`}>All 38 matches</span>
              <div className="office-subcard px-4 divide-y divide-[var(--office-divider)]">
                {simResult.matches.map((match, idx) => {
                  const outcomeBadge = {
                    W: 'bg-emerald-100 border-emerald-300 text-emerald-800',
                    D: 'bg-slate-200 border-slate-300 text-slate-700',
                    L: 'bg-rose-100 border-rose-300 text-rose-800',
                  }[match.outcome];
                  const people = [
                    match.scorers && match.scorers.length > 0 ? match.scorers.join(', ') : '',
                    match.motm ? `MOTM ${match.motm.player.displayName}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <div key={idx} className="py-2 flex items-center gap-3 text-left">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-display font-black text-[#0b1536] uppercase truncate">
                          <span className="text-slate-500 font-mono mr-1.5">{idx + 1}</span>
                          vs {match.opponent}
                          <span className="text-slate-500 font-bold ml-1.5">{match.opponentRating}</span>
                        </h4>
                        <p className="text-[11px] text-slate-600 font-medium truncate">
                          {match.headline || match.summary || getMatchCommentary(match)}
                        </p>
                        {people && <p className="text-[11px] text-blue-700 font-semibold truncate">{people}</p>}
                      </div>
                      <span className="text-sm font-display font-black text-[#0b1536] shrink-0">
                        {match.ourScore} - {match.opponentScore}
                      </span>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border leading-none font-display shrink-0 ${outcomeBadge}`}>
                        {match.outcome}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Share / Challenge Modal */}
      {showShare && (
        <div
          data-scrim="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/80 backdrop-blur-sm motion-safe:animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShare(false);
          }}
        >
          <div className="office-floating-card w-full max-w-sm bg-white border border-slate-200/90 rounded-3xl p-4 shadow-2xl relative my-auto max-h-[90dvh] overflow-y-auto scrollbar-none space-y-3 text-left">
            <div className="flex items-center justify-between gap-3">
              <h3 id="share-modal-title" className="text-base font-display font-black text-[#0b1536] uppercase tracking-wide">
                Share / Challenge
              </h3>
              <button
                type="button"
                onClick={() => setShowShare(false)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Close share"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>
            <SharePreview
              formation={formation}
              selectedPlayers={activePlayers}
              stats={stats}
              simResult={simResult}
              isDailyChallenge={isDailyChallenge}
              dailyChallengeTitle={todayChallenge?.title}
              dailyChallengeBeaten={challengeBeaten}
              exportRef={exportRef}
            />
          </div>
        </div>
      )}

      {/* Export to Career Mode Modal */}
      {showExportModal && (
        <div
          data-scrim="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/80 backdrop-blur-sm motion-safe:animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-draft-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowExportModal(false);
          }}
        >
          <div className="office-floating-card w-full max-w-xl bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto max-h-[90dvh] overflow-y-auto scrollbar-none space-y-4 text-left">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="export-draft-modal-title" className="text-base font-display font-black text-[#0b1536] uppercase tracking-wide">
                  Take Squad to Career
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Your XI ({formation}, {stats.overall} OVR) becomes the starting squad of a new career save.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Save Slot Selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-display font-black text-[#0b1536] uppercase tracking-wider block">
                Save slot
              </span>
              <div className="grid grid-cols-3 gap-2">
                {saveSlots.map((slot) => {
                  const isSelected = selectedSlot === slot.slotId;
                  const slotLabel = slot.slotId === 'slot_1' ? 'Slot 1' : slot.slotId === 'slot_2' ? 'Slot 2' : 'Slot 3';
                  return (
                    <button
                      key={slot.slotId}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedSlot(slot.slotId)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[56px] ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-500'
                          : 'border-slate-200/90 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-display font-black text-[#0b1536] uppercase block">{slotLabel}</span>
                      {slot.isEmpty ? (
                        <span className="text-[11px] font-bold text-emerald-700 block">Empty</span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-700 block truncate">
                          Replaces {slot.save?.clubName || 'Club'} (S{slot.save?.seasonNumber || 1})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Club Identity Selection */}
            <div className="space-y-1.5">
              <label htmlFor="target-club-select" className="text-xs font-display font-black text-[#0b1536] uppercase tracking-wider block">
                Club
              </label>
              <select
                id="target-club-select"
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-display font-bold text-[#0b1536] focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {getAllClubs().map((club) => (
                  <option key={club.id} value={club.id}>
                    {getEffectiveClubName(club)} ({formatCareerCurrency(club.startingBudget)})
                  </option>
                ))}
              </select>
            </div>

            {/* Manager Credentials */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label htmlFor="export-manager-name" className="text-xs font-display font-black text-[#0b1536] uppercase tracking-wider block">
                  Manager
                </label>
                <input
                  id="export-manager-name"
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Manager"
                  maxLength={30}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#0b1536] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="export-manager-nat" className="text-xs font-display font-black text-[#0b1536] uppercase tracking-wider block">
                  Nationality
                </label>
                <input
                  id="export-manager-nat"
                  type="text"
                  value={managerNationality}
                  onChange={(e) => setManagerNationality(e.target.value)}
                  placeholder="England"
                  maxLength={30}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#0b1536] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Starting Budget */}
            <div className="space-y-1.5">
              <span className="text-xs font-display font-black text-[#0b1536] uppercase tracking-wider block">
                Budget
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 1.0, label: 'Standard' },
                  { value: 1.5, label: '1.5x' },
                  { value: 2.0, label: '2x' },
                ].map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    aria-pressed={budgetMultiplier === b.value}
                    onClick={() => setBudgetMultiplier(b.value)}
                    className={`min-h-[40px] px-2 rounded-xl border text-[11px] font-display font-black uppercase text-center transition-all cursor-pointer ${
                      budgetMultiplier === b.value
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-display font-black text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExport}
                disabled={isExporting}
                className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 active:scale-98"
              >
                {isExporting ? (
                  <>
                    <IconClock className="w-3.5 h-3.5 shrink-0" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <IconPlay className="w-3.5 h-3.5 shrink-0" />
                    <span>Start Career</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
