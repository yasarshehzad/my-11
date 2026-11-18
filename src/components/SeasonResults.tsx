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
import { Button, Eyebrow, StatRow } from '@/components/ui';
import {
  IconClock,
  IconCheck,
  IconClose,
  IconAlert,
  IconChevronUp,
  IconChevronDown,
  IconPlay,
  IconRefresh,
} from './career/GameIcons';

/** Some stored labels are written in capitals or Title Case; show them as a sentence. */
function toSentenceCase(text: string): string {
  const lower = text.toLowerCase();
  return (lower.charAt(0).toUpperCase() + lower.slice(1))
    .replace(/\bchampions league\b/g, 'Champions League')
    .replace(/\beuropa league\b/g, 'Europa League')
    .replace(/\bmotm\b/g, 'MOTM');
}

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
    1: 'League champions',
    2: 'Runners-up',
    3: '3rd place',
    4: '4th place (Champions League)',
    5: '5th place (Europa League)',
    6: '6th place (Europa League)',
    7: '7th place',
  }[simResult.leaguePosition] || `#${simResult.leaguePosition} mid-table`;

  const isSoClose = simResult.wins === 36 || simResult.wins === 37;

  const getMatchCommentary = (match: MatchSimResult) => {
    const diff = match.ourScore - match.opponentScore;
    if (match.outcome === 'W') {
      if (diff >= 3) return 'A dominant win. In control from kick-off.';
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
  const sectionLabel = 'text-sm font-semibold text-[var(--ink-primary)]';
  const listCard = 'rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] px-4 divide-y divide-[var(--border-subtle)]';
  const outcomeSquare = {
    W: 'bg-emerald-600 text-white',
    D: 'bg-[#8a8a85] text-white',
    L: 'bg-rose-600 text-white',
  };
  const personalBestLine = (simResult.newPersonalBests || [])
    .map((record) => record.replace(/^NEW /, '').toLowerCase())
    .join(', ');
  const tabs = [
    { id: 'summary' as const, label: 'Summary' },
    { id: 'squad' as const, label: 'Squad and stats' },
    { id: 'story' as const, label: 'Season story' },
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
        <h2 className="text-2xl font-display font-bold text-[var(--ink-primary)]">
          Season complete
        </h2>
        <p className="text-sm text-[var(--ink-secondary)] mt-1">
          {leagueName} · {modeName}
          {isDailyChallenge && todayChallenge ? ` · ${todayChallenge.title}` : ''}
        </p>
      </div>

      {/* One-line notes */}
      {(isSoClose || simResult.wins === 38 || simResult.beatTargetResult || personalBestLine) && (
        <div className="flex flex-col gap-1 relative z-10 text-sm text-center text-[var(--ink-secondary)]">
          {isSoClose && (
            <p>So close: {slipUps} slip-up{slipUps > 1 ? 's' : ''} from a perfect 38-0.</p>
          )}

          {simResult.wins === 38 && (
            <p className="font-medium text-[var(--ink-primary)]">The perfect season: 38 wins from 38.</p>
          )}

          {simResult.beatTargetResult && (
            <p className={simResult.beatTargetResult.beaten ? 'font-medium text-emerald-700' : undefined}>
              {simResult.beatTargetResult.beaten
                ? `Target beaten: ${simResult.wins} wins vs ${simResult.beatTargetResult.targetWins}.`
                : simResult.beatTargetResult.matched
                ? `Target matched: ${simResult.wins} wins.`
                : `Target missed: ${simResult.wins} wins vs ${simResult.beatTargetResult.targetWins}.`}
            </p>
          )}

          {personalBestLine && (
            <p className="font-medium text-[var(--ink-primary)]">New personal best: {personalBestLine}</p>
          )}
        </div>
      )}

      {/* Head-to-Head Showdown (2-Legged Clash) */}
      {h2hShowdown && (
        <div className="w-full p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] relative z-10 space-y-3">
          <div className="text-center">
            <p className={`text-sm font-medium ${
              h2hShowdown.winner === 'user'
                ? 'text-emerald-700'
                : h2hShowdown.winner === 'challenger'
                ? 'text-rose-700'
                : 'text-[var(--ink-secondary)]'
            }`}>
              {h2hShowdown.winner === 'user'
                ? 'Head-to-head win'
                : h2hShowdown.winner === 'challenger'
                ? 'Head-to-head defeat'
                : 'Head-to-head draw'}
            </p>

            <div className="flex items-center justify-center gap-3 mt-1 text-[var(--ink-primary)]">
              <span className="text-sm font-semibold min-w-0 truncate">Your XI</span>
              <span className="text-2xl font-display font-bold leading-none tabular-nums shrink-0">
                {h2hShowdown.userAggregateGoals} - {h2hShowdown.challengerAggregateGoals}
              </span>
              <span className="text-sm font-semibold min-w-0 truncate">{h2hShowdown.challenger.clubName}</span>
            </div>

            {h2hShowdown.decidedByPenalties && (
              <p className="text-xs text-[var(--ink-secondary)] mt-1">
                Penalties {h2hShowdown.userPenalties ?? 0} - {h2hShowdown.challengerPenalties ?? 0}
              </p>
            )}
          </div>

          <div className="text-xs text-[var(--ink-secondary)] divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
            <p className="py-1.5 flex justify-between gap-2">
              <span>You ({formation})</span>
              <span className="shrink-0 tabular-nums">{stats.overall} OVR · {stats.chemistry} chem</span>
            </p>
            <p className="py-1.5 flex justify-between gap-2">
              <span className="truncate">{h2hShowdown.challenger.managerName} ({h2hShowdown.challenger.formation})</span>
              <span className="shrink-0 tabular-nums">{h2hShowdown.challengerStats.overall} OVR · {h2hShowdown.challengerStats.chemistry} chem</span>
            </p>
            {h2hShowdown.legs.map((leg) => (
              <div key={leg.leg} className="py-1.5">
                <p className="flex justify-between gap-2 font-semibold text-[var(--ink-primary)]">
                  <span>Leg {leg.leg} ({leg.venue === 'home' ? 'home' : 'away'})</span>
                  <span className="tabular-nums">{leg.userGoals} - {leg.challengerGoals}</span>
                </p>
                {(leg.userScorers.length > 0 || leg.challengerScorers.length > 0) && (
                  <p>
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
            <p className="py-1.5">
              <span className="font-semibold text-[var(--ink-primary)]">MOTM {h2hShowdown.motmName}.</span>{' '}
              {h2hShowdown.summary}
            </p>
          </div>
        </div>
      )}

      {/* Main League Outcome Card */}
      <div className="w-full flex flex-col items-center p-5 office-floating-card rounded-xl relative overflow-hidden text-center z-10">
        <p className={`text-sm font-medium mb-2 ${
          !isDailyChallenge
            ? 'text-[var(--ink-secondary)]'
            : challengeBeaten
            ? 'text-emerald-700'
            : 'text-rose-700'
        }`}>
          {isDailyChallenge ? (challengeBeaten ? 'Challenge cleared' : 'Challenge failed') : leagueFinishLabel}
        </p>

        <p className="text-4xl font-display font-bold text-[var(--ink-primary)] leading-none tabular-nums">
          {simResult.wins}W - {simResult.draws}D - {simResult.losses}L
        </p>

        <p className="text-sm text-[var(--ink-secondary)] mt-2">
          <span className="text-[var(--ink-primary)] font-semibold">{simResult.points} pts</span> · goals{' '}
          <span className="text-[var(--ink-primary)] font-semibold">{simResult.goalsFor}-{simResult.goalsAgainst}</span>
          {story ? ` · expected ${story.expectedWinsBand}` : ''}
        </p>

        {story && (
          <p className={`text-sm font-medium mt-1 ${
            story.verdict === 'Exceeded expectations'
              ? 'text-emerald-700'
              : story.verdict === 'Underperformed'
              ? 'text-rose-700'
              : 'text-[var(--ink-secondary)]'
          }`}>
            {story.verdict}
          </p>
        )}

        <p className="text-sm text-[var(--ink-secondary)] max-w-sm leading-relaxed mt-2">{simResult.summary}</p>
      </div>

      {/* Actions (visible on every tab) */}
      <div className="grid grid-cols-2 gap-2 relative z-10">
        <Button variant="primary" onClick={onStartDraft} className="min-h-11">
          <IconRefresh className="w-4 h-4 shrink-0" />
          <span>New draft</span>
        </Button>
        <Button variant="secondary" onClick={() => setShowShare(true)} className="min-h-11">
          Share or challenge
        </Button>
        <Button variant="secondary" onClick={onRandomDraft}>
          Random draft
        </Button>
        <Button variant="secondary" onClick={openExportModal}>
          Take to career
        </Button>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Season results" className="flex gap-1 p-1 rounded-lg bg-[var(--surface-subcard)] border border-[var(--border-subtle)] relative z-10 text-xs sm:text-sm font-semibold">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`results-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="results-tabpanel"
            onClick={() => setTab(t.id)}
            className={`flex-1 min-h-10 px-1 rounded-md cursor-pointer transition-colors ${
              tab === t.id
                ? 'bg-[var(--surface-elevated)] text-[var(--ink-primary)]'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
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
              <div className="office-floating-card rounded-xl p-4 space-y-2">
                <div>
                  <h3 className="text-base font-display font-semibold text-[var(--ink-primary)]">{toSentenceCase(story.title)}</h3>
                  <Eyebrow>{toSentenceCase(story.longestStreak.description)}</Eyebrow>
                </div>
                <p className="text-sm text-[var(--ink-secondary)] leading-relaxed flex items-start gap-1.5">
                  <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-1" />
                  <span>{story.whyItWorked}</span>
                </p>
                <p className="text-sm text-[var(--ink-secondary)] leading-relaxed flex items-start gap-1.5">
                  <IconAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-1" />
                  <span>{story.whatHeldBack}</span>
                </p>
                {nextDraftTips.length > 0 && (
                  <div className="pt-1 border-t border-[var(--office-divider)]">
                    <button
                      type="button"
                      aria-expanded={showTips}
                      onClick={() => setShowTips(!showTips)}
                      className="w-full min-h-10 flex items-center justify-between text-sm font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                    >
                      <span>Tips for next draft ({nextDraftTips.length})</span>
                      {showTips ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
                    </button>
                    {showTips && (
                      <ul className="text-sm text-[var(--ink-secondary)] leading-relaxed space-y-1 pb-1 list-disc pl-4">
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
            <div className={listCard}>
              <StatRow label="MVP" value={simResult.mvp.displayName} className="py-2.5" />
              {simResult.topScorer && (
                <StatRow
                  label="Golden Boot"
                  value={`${simResult.topScorer.player.displayName} · ${simResult.topScorer.goals}`}
                  className="py-2.5"
                />
              )}
              {simResult.cleanSheets !== undefined && (
                <StatRow label="Clean sheets" value={simResult.cleanSheets} className="py-2.5" />
              )}
            </div>

            {/* Key match highlights */}
            {highlights.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <h3 className={`${sectionLabel} px-1`}>Key matches</h3>
                <div className={listCard}>
                  {shownHighlights.map((hl, i) => (
                    <div key={i} className="py-2.5 text-left">
                      <div className="flex justify-between items-baseline gap-2">
                        <h4 className="text-sm font-semibold text-[var(--ink-primary)] truncate">
                          vs {hl.match.opponent}
                        </h4>
                        <span className="text-sm font-display font-semibold text-[var(--ink-primary)] tabular-nums shrink-0">
                          {hl.match.ourScore} - {hl.match.opponentScore}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {toSentenceCase(hl.categoryLabel)} · matchday {hl.matchIndex + 1}
                      </p>
                      <p className="text-xs text-[var(--ink-secondary)] leading-snug line-clamp-2 mt-0.5">
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
                    className="min-h-10 text-sm font-medium text-blue-700 cursor-pointer inline-flex items-center justify-center gap-1"
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
              <div className="office-floating-card rounded-xl p-4 space-y-2 text-sm text-[var(--ink-secondary)] leading-relaxed">
                <p><span className="font-semibold text-[var(--ink-primary)]">Start. </span>{story.howStarted}</p>
                {story.turningPoint && (
                  <p><span className="font-semibold text-[var(--ink-primary)]">Turning point. </span>{story.turningPoint}</p>
                )}
                <p><span className="font-semibold text-[var(--ink-primary)]">Finish. </span>{story.howEnded}</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <h3 className={`${sectionLabel} px-1`}>All 38 matches</h3>
              <div className={listCard}>
                {simResult.matches.map((match, idx) => {
                  const people = [
                    match.scorers && match.scorers.length > 0 ? match.scorers.join(', ') : '',
                    match.motm ? `MOTM ${match.motm.player.displayName}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <div key={idx} className="py-2 flex items-center gap-3 text-left">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-[var(--ink-primary)] truncate">
                          <span className="text-[var(--ink-muted)] font-normal tabular-nums mr-1.5">{idx + 1}</span>
                          vs {match.opponent}
                          <span className="text-[var(--ink-muted)] font-normal ml-1.5">{match.opponentRating}</span>
                        </h4>
                        <p className="text-xs text-[var(--ink-secondary)] truncate">
                          {match.headline || match.summary || getMatchCommentary(match)}
                        </p>
                        {people && <p className="text-xs text-[var(--ink-muted)] truncate">{people}</p>}
                      </div>
                      <span className="text-sm font-display font-semibold text-[var(--ink-primary)] tabular-nums shrink-0">
                        {match.ourScore} - {match.opponentScore}
                      </span>
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-2xs font-semibold leading-none shrink-0 ${outcomeSquare[match.outcome]}`}>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/60 motion-safe:animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShare(false);
          }}
        >
          <div className="office-floating-card w-full max-w-sm rounded-xl p-4 relative my-auto max-h-[90dvh] overflow-y-auto scrollbar-none space-y-3 text-left">
            <div className="flex items-center justify-between gap-3">
              <h3 id="share-modal-title" className="text-base font-display font-semibold text-[var(--ink-primary)]">
                Share or challenge
              </h3>
              <button
                type="button"
                onClick={() => setShowShare(false)}
                className="w-10 h-10 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/60 motion-safe:animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-draft-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowExportModal(false);
          }}
        >
          <div className="office-floating-card w-full max-w-xl rounded-xl p-5 sm:p-6 relative my-auto max-h-[90dvh] overflow-y-auto scrollbar-none space-y-4 text-left">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="export-draft-modal-title" className="text-base font-display font-semibold text-[var(--ink-primary)]">
                  Take squad to career
                </h3>
                <p className="text-sm text-[var(--ink-secondary)] mt-0.5">
                  Your XI ({formation}, {stats.overall} OVR) becomes the starting squad of a new career save.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-10 h-10 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Save Slot Selector */}
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-[var(--ink-primary)] block">
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
                      className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer min-h-14 min-w-0 ${
                        isSelected
                          ? 'border-[var(--ink-secondary)] bg-[var(--surface-elevated)]'
                          : 'border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)]'
                      }`}
                    >
                      <span className="text-sm font-semibold text-[var(--ink-primary)] block">{slotLabel}</span>
                      {slot.isEmpty ? (
                        <span className="text-xs text-[var(--ink-muted)] block">Empty</span>
                      ) : (
                        <span className="text-xs text-amber-800 block leading-snug break-words">
                          Replaces {slot.save?.clubName || 'Club'}, season {slot.save?.seasonNumber || 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Club Identity Selection */}
            <div className="space-y-1.5">
              <label htmlFor="target-club-select" className="text-sm font-medium text-[var(--ink-primary)] block">
                Club
              </label>
              <select
                id="target-club-select"
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="w-full min-h-10 px-3 py-2 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] text-sm text-[var(--ink-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                <label htmlFor="export-manager-name" className="text-sm font-medium text-[var(--ink-primary)] block">
                  Manager
                </label>
                <input
                  id="export-manager-name"
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Manager"
                  maxLength={30}
                  className="w-full min-h-10 px-3 py-2 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] text-sm text-[var(--ink-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="export-manager-nat" className="text-sm font-medium text-[var(--ink-primary)] block">
                  Nationality
                </label>
                <input
                  id="export-manager-nat"
                  type="text"
                  value={managerNationality}
                  onChange={(e) => setManagerNationality(e.target.value)}
                  placeholder="England"
                  maxLength={30}
                  className="w-full min-h-10 px-3 py-2 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] text-sm text-[var(--ink-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Starting Budget */}
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-[var(--ink-primary)] block">
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
                    className={`min-h-10 px-2 rounded-lg border text-sm font-medium text-center transition-colors cursor-pointer ${
                      budgetMultiplier === b.value
                        ? 'border-[var(--ink-secondary)] bg-[var(--surface-elevated)] text-[var(--ink-primary)]'
                        : 'border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--ink-secondary)] hover:bg-[var(--surface-subcard)]'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowExportModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirmExport} disabled={isExporting}>
                {isExporting ? (
                  <>
                    <IconClock className="w-3.5 h-3.5 shrink-0" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <IconPlay className="w-3.5 h-3.5 shrink-0" />
                    <span>Start career</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
