import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Player, FormationType, SimulationResult, ChallengeTemplate, StreakStats, MatchSimResult } from '../types/game';
import { FORMATION_SLOTS, getDetailedChemistryLogs } from '../utils/gameLogic';
import { PitchLayout } from './PitchLayout';
import { StatsDisplay } from './StatsDisplay';
import { SharePreview } from './SharePreview';
import { getAllClubs, getEffectiveClubName } from '../career/clubs';
import { createNewCareerSave, listSaveSlots, ValidSlotId } from '../career/saves';
import { validateSettings } from '../career/settings';
import { formatCareerCurrency } from '../career/formatters';

interface SeasonResultsProps {
  formation: FormationType;
  selectedPlayers: (Player | null)[];
  stats: { attack: number; midfield: number; defence: number; chemistry: number; overall: number };
  simResult: SimulationResult;
  streakStats: StreakStats;
  isDailyChallenge: boolean;
  todayChallenge: ChallengeTemplate | null;
  challengeBeaten: boolean;
  showFixturesBreakdown: boolean;
  exportRef: React.RefObject<HTMLDivElement | null>;
  onToggleFixturesBreakdown: () => void;
  onStartDraft: () => void;
  onRandomDraft: () => void;
}

export function SeasonResults({
  formation,
  selectedPlayers,
  stats,
  simResult,
  streakStats,
  isDailyChallenge,
  todayChallenge,
  challengeBeaten,
  showFixturesBreakdown,
  exportRef,
  onToggleFixturesBreakdown,
  onStartDraft,
  onRandomDraft,
}: SeasonResultsProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiAnimRef = useRef<number | null>(null);

  const router = useRouter();
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<ValidSlotId>('slot_1');
  const [selectedClubId, setSelectedClubId] = useState<string>('man_blue');
  const [managerName, setManagerName] = useState<string>('Manager');
  const [managerNationality, setManagerNationality] = useState<string>('England');
  const [budgetMultiplier, setBudgetMultiplier] = useState<number>(1.0);
  const [isExporting, setIsExporting] = useState(false);
  const [saveSlots, setSaveSlots] = useState(() => (typeof window !== 'undefined' ? listSaveSlots() : []));

  useEffect(() => {
    if (showExportModal && typeof window !== 'undefined') {
      const slots = listSaveSlots();
      setSaveSlots(slots);
      const firstEmpty = slots.find((s) => s.isEmpty);
      if (firstEmpty) {
        setSelectedSlot(firstEmpty.slotId);
      }
    }
  }, [showExportModal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showExportModal) {
        setShowExportModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showExportModal]);

  const handleConfirmExport = () => {
    setIsExporting(true);
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
    1: '🏆 LEAGUE CHAMPIONS!',
    2: '🥈 RUNNERS-UP',
    3: '🥉 3RD PLACE',
    4: '🇪🇺 4TH PLACE (CHAMPIONS LEAGUE)',
    5: '🇪🇺 5TH PLACE (EUROPA LEAGUE)',
    6: '🇪🇺 6TH PLACE (EUROPA LEAGUE)',
    7: '🇪🇺 7TH PLACE',
  }[simResult.leaguePosition] || `🤝 #${simResult.leaguePosition} MID-TABLE`;

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

  const getManagerAdvice = () => {
    const advice = [];
    
    // 1. Chemistry Advice
    if (stats.chemistry < 80) {
      advice.push({
        type: 'chemistry',
        status: 'warning',
        title: 'Squad Chemistry is Low',
        desc: `Your team chemistry is ${stats.chemistry}/100. Focus on linking adjacent players of the same club, nationality, or era. Good chemistry scales up your squad overall rating.`,
      });
    } else {
      advice.push({
        type: 'chemistry',
        status: 'good',
        title: 'Fluid Chemistry Links',
        desc: `Excellent squad chemistry (${stats.chemistry}/100). Your players established strong links, boosting your team's tactical coordination.`,
      });
    }

    // 2. Department Checks
    if (stats.attack < 82) {
      advice.push({
        type: 'attack',
        status: 'warning',
        title: 'Attack Lacks Bite',
        desc: `Your attack rating is ${stats.attack}. In your next draft, prioritize forwards with high finishing and pace ratings to convert critical chances.`,
      });
    }
    if (stats.midfield < 82) {
      advice.push({
        type: 'midfield',
        status: 'warning',
        title: 'Midfield Control Weak',
        desc: `Your midfield rating is ${stats.midfield}. Draft central midfielders (CM/CDM) with high passing and technique to control the tempo and possession.`,
      });
    }
    if (stats.defence < 82) {
      advice.push({
        type: 'defence',
        status: 'warning',
        title: 'Backline is Vulnerable',
        desc: `Your defence rating is ${stats.defence}. Try securing a defensive leader (CB) or anchor midfielder (CDM) to lock down opposing attacks.`,
      });
    }

    // 3. Challenge Contextual Advice
    if (isDailyChallenge && todayChallenge) {
      if (todayChallenge.rule === 'no_legends') {
        advice.push({
          type: 'challenge',
          status: 'info',
          title: 'No Legends Strategy',
          desc: 'Without 90+ rated superstar legends, maximizing tactical chemistry blocks (e.g. English core or Manchester United links) is crucial to overcome elite opponents.',
        });
      } else if (todayChallenge.rule === 'underdog_xi') {
        advice.push({
          type: 'challenge',
          status: 'info',
          title: 'Underdog Efficiency',
          desc: 'Underdog drafts depend on high-efficiency Rare cards. Look for high-performing rare cards with strong nationality or club links to build chemistry.',
        });
      }
    }

    return advice;
  };

  const activePlayers = selectedPlayers.filter((p): p is Player => p !== null);

  return (
    <div className="flex flex-col gap-8 px-4 sm:px-6 py-8 w-full max-w-lg mx-auto min-h-[95vh] relative overflow-hidden">
      {simResult.wins >= 35 && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-50 w-full h-full"
        />
      )}

      {/* Results Header */}
      <div className="text-center mt-2 relative z-10 leading-none">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-widest mb-3 shadow-sm">
          ⚽ FIXTURES COMPLETE
        </div>
        
        <h2 className="text-3xl font-display font-black text-[#0b1536] uppercase tracking-tight">
          CAMPAIGN DEBRIEF
        </h2>
        
        {isDailyChallenge && todayChallenge && (
          <p className="text-[10px] text-slate-600 font-bold tracking-widest uppercase mt-2">
            Daily Challenge: <span className="text-blue-600 font-display">{todayChallenge.title}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1.5">
          <p className="text-[10px] text-slate-600 font-bold tracking-widest uppercase">
            League: <span className="text-blue-600 font-display">
              {
                {
                  english: 'English Premier League 🇬🇧',
                  spanish: 'La Liga 🇪🇸',
                  german: 'Bundesliga 🇩🇪',
                  italian: 'Serie A 🇮🇹',
                  french: 'Ligue 1 🇫🇷',
                }[simResult.selectedLeague || 'english']
              }
            </span>
          </p>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <p className="text-[10px] text-slate-600 font-bold tracking-widest uppercase">
            Mode: <span className="text-blue-600 font-display">
              {simResult.draftModifier === 'quick' ? '⚡ QUICK DRAFT' : simResult.draftModifier === 'mystery' ? '❓ MYSTERY DRAFT' : '⏱️ CLASSIC DRAFT'}
            </span>
          </p>
        </div>
      </div>

      {/* Heartbreak / Celebratory Banner */}
      {isSoClose && (
        <div className="w-full p-4.5 rounded-3xl office-subcard border-rose-200 bg-rose-50/90 relative z-10 text-center animate-pulse shadow-sm">
          <span className="text-xl">💔</span>
          <h3 className="text-sm font-display font-black text-rose-800 uppercase mt-1 leading-none">So close to perfection!</h3>
          <p className="text-[10px] text-rose-700 mt-1.5 leading-relaxed max-w-xs mx-auto font-medium">
            Just {38 - simResult.wins} slip-up{38 - simResult.wins > 1 ? 's' : ''} cost you the legendary 38-0 Invincibles campaign.
          </p>
        </div>
      )}

      {simResult.wins === 38 && (
        <div className="w-full p-5 rounded-3xl office-subcard border-amber-300 bg-amber-50/90 relative z-10 text-center animate-bounce shadow-sm">
          <span className="text-xl">👑</span>
          <h3 className="text-sm font-display font-black text-amber-800 uppercase mt-1 leading-none">THE PERFECT SEASON!</h3>
          <p className="text-[10px] text-amber-700 mt-1.5 leading-relaxed max-w-xs mx-auto font-semibold">
            38 wins. 0 draws. 0 losses. You have achieved absolute football immortality!
          </p>
        </div>
      )}

      {/* Target Replay Outcome Banner */}
      {simResult.beatTargetResult && (
        <div className={`w-full p-4.5 rounded-3xl border relative z-10 text-center shadow-sm ${
          simResult.beatTargetResult.beaten
            ? 'office-subcard border-blue-200 bg-blue-50/80 text-blue-900'
            : simResult.beatTargetResult.matched
            ? 'office-subcard border-amber-200 bg-amber-50/80 text-amber-900'
            : 'office-subcard border-slate-200 bg-slate-50/80 text-slate-800'
        }`}>
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-lg">
              {simResult.beatTargetResult.beaten ? '🏆' : simResult.beatTargetResult.matched ? '🤝' : '⏱️'}
            </span>
            <h3 className="text-xs font-display font-black uppercase tracking-wider">
              {simResult.beatTargetResult.beaten
                ? `🏆 TARGET BEATEN (${simResult.wins} wins vs target ${simResult.beatTargetResult.targetWins})`
                : simResult.beatTargetResult.matched
                ? `TARGET MATCHED (${simResult.wins} wins)`
                : `SO CLOSE (${simResult.wins} wins vs target ${simResult.beatTargetResult.targetWins})`}
            </h3>
          </div>
          <p className="text-[10px] text-slate-600 mt-1 font-semibold">
            {simResult.beatTargetResult.beaten
              ? `You conquered the challenge target of ${simResult.beatTargetResult.targetWins} wins with ${simResult.wins} wins!`
              : simResult.beatTargetResult.matched
              ? `You matched the target of ${simResult.beatTargetResult.targetWins} wins.`
              : `Finished with ${simResult.wins} wins (Target was ${simResult.beatTargetResult.targetWins} wins). Share your score or try again!`}
          </p>
        </div>
      )}

      {/* New Personal Best Banner */}
      {simResult.newPersonalBests && simResult.newPersonalBests.length > 0 && (
        <div className="w-full p-4 rounded-3xl office-subcard border-blue-200 bg-blue-50/90 relative z-10 text-center shadow-sm animate-pulse">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-lg">🏆</span>
            <h3 className="text-xs font-display font-black text-blue-700 uppercase tracking-widest">
              NEW PERSONAL BEST!
            </h3>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1.5">
            {simResult.newPersonalBests.map((record, idx) => (
              <span
                key={idx}
                className="text-[9px] font-display font-black uppercase px-2.5 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-800"
              >
                {record}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 1. Main League Outcome Card */}
      <div className="w-full flex flex-col items-center p-6 office-floating-card relative overflow-hidden text-center z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

        {/* Daily Challenge Clear Status Badge */}
        {isDailyChallenge ? (
          <div className={`px-5 py-2 rounded-2xl bg-gradient-to-r border shadow-lg font-display font-black text-sm uppercase tracking-wider mb-4 leading-none ${
            challengeBeaten 
              ? 'from-blue-600 via-indigo-600 to-violet-600 text-white border-blue-400 shadow-blue-500/20'
              : 'from-rose-500 to-red-700 text-white border-rose-400'
          }`}>
            {challengeBeaten ? '✅ CHALLENGE CLEARED!' : '❌ CHALLENGE FAILED'}
          </div>
        ) : (
          <div className={`px-5 py-2 rounded-2xl bg-gradient-to-r border shadow-sm font-display font-black text-xs uppercase tracking-wider ${getFinishAccentClass(simResult.leaguePosition)} mb-4 leading-none`}>
            {leagueFinishLabel}
          </div>
        )}

        <p className="text-5xl font-display font-black text-[#0b1536] leading-none tracking-tight">
          {simResult.wins}W - {simResult.draws}D - {simResult.losses}L
        </p>
        
        <p className="text-xs font-bold text-slate-600 mt-2 leading-none uppercase tracking-wide">
          Record: <span className="text-[#0b1536] font-extrabold">{simResult.points} PTS</span> • Goals: <span className="text-[#0b1536] font-extrabold">{simResult.goalsFor}F / {simResult.goalsAgainst}A</span>
        </p>

        <div className="h-[1.5px] w-12 bg-[var(--office-divider)] my-4" />

        <p className="text-xs font-semibold text-slate-600 max-w-sm leading-relaxed italic">
          "{simResult.summary}"
        </p>

        {/* Season Verdict & Expectation Band */}
        {simResult.seasonStory && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-3 border-t border-[var(--office-divider)] w-full">
            <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-wider font-display leading-none ${
              simResult.seasonStory.verdict === 'Exceeded expectations'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : simResult.seasonStory.verdict === 'Underperformed'
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-indigo-100 text-indigo-800 border-indigo-300'
            }`}>
              VERDICT: {simResult.seasonStory.verdict}
            </span>
            <span className="text-[9px] font-bold text-slate-600 office-subcard px-2.5 py-1 rounded-full uppercase tracking-wider font-display">
              Expected: {simResult.seasonStory.expectedWinsBand}
            </span>
          </div>
        )}
      </div>

      {/* Season Narrative & Story Review Card */}
      {simResult.seasonStory && (
        <div className="w-full p-6 office-floating-card z-10 flex flex-col gap-4 select-none">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--office-divider)] pb-3">
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                Official Season Review
              </span>
              <h3 className="text-lg font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 uppercase tracking-tight mt-0.5">
                {simResult.seasonStory.title}
              </h3>
            </div>
            <span className="text-[9px] font-extrabold px-2.5 py-1 rounded-xl office-subcard text-[#0b1536] font-display">
              {simResult.seasonStory.longestStreak.description}
            </span>
          </div>

          <div className="flex flex-col gap-3 text-xs leading-relaxed text-slate-600">
            <div className="p-3.5 rounded-2xl office-subcard">
              <span className="text-[9.5px] font-extrabold text-blue-600 uppercase tracking-wider font-display block mb-1">
                🏁 The Opening 10 Matchdays
              </span>
              <p className="text-slate-800 font-medium">{simResult.seasonStory.howStarted}</p>
            </div>

            {simResult.seasonStory.turningPoint && (
              <div className="p-3.5 rounded-2xl office-subcard">
                <span className="text-[9.5px] font-extrabold text-amber-600 uppercase tracking-wider font-display block mb-1">
                  ⚡ The Turning Point
                </span>
                <p className="text-slate-800 font-medium">{simResult.seasonStory.turningPoint}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl office-subcard border-blue-200 bg-blue-50/60">
                <span className="text-[9.5px] font-extrabold text-blue-600 uppercase tracking-wider font-display block mb-1">
                  💪 Why It Worked
                </span>
                <p className="text-slate-800 font-medium text-[11px]">{simResult.seasonStory.whyItWorked}</p>
              </div>

              <div className="p-3.5 rounded-2xl office-subcard border-rose-200 bg-rose-50/60">
                <span className="text-[9.5px] font-extrabold text-rose-600 uppercase tracking-wider font-display block mb-1">
                  ⚠️ What Held You Back
                </span>
                <p className="text-slate-800 font-medium text-[11px]">{simResult.seasonStory.whatHeldBack}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl office-subcard">
              <span className="text-[9.5px] font-extrabold text-indigo-600 uppercase tracking-wider font-display block mb-1">
                🏆 Final Campaign Appraisal
              </span>
              <p className="text-slate-800 font-medium">{simResult.seasonStory.howEnded}</p>
            </div>
          </div>
        </div>
      )}

      {/* Season Key Match Highlights */}
      {simResult.highlights && simResult.highlights.length > 0 && (
        <div className="w-full flex flex-col gap-3 z-10">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
              Key Fixture Highlights ({simResult.highlights.length} Spotlight Matches)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {simResult.highlights.map((hl, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl office-subcard border-[var(--office-divider)] bg-white/95 flex flex-col justify-between gap-3 text-left shadow-sm"
              >
                <div>
                  <div className="flex justify-between items-center mb-1.5 leading-none">
                    <span className="text-[8.5px] font-black uppercase text-amber-700 font-display tracking-wider">
                      {hl.categoryLabel}
                    </span>
                    <span className="text-[9px] font-extrabold text-slate-500 font-display">
                      MD {hl.matchIndex + 1}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="text-sm font-display font-black text-[#0b1536] uppercase truncate">
                      vs {hl.match.opponent}
                    </h4>
                    <span className="text-sm font-display font-black text-blue-600">
                      {hl.match.ourScore} - {hl.match.opponentScore}
                    </span>
                  </div>
                  {hl.match.headline && (
                    <p className="text-[11px] font-bold text-slate-700 leading-snug">
                      "{hl.match.headline}"
                    </p>
                  )}
                  {hl.match.scorers && hl.match.scorers.length > 0 && (
                    <p className="text-[9.5px] text-blue-600 font-semibold mt-1">
                      ⚽ {hl.match.scorers.join(', ')}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[var(--office-divider)] flex flex-col gap-1">
                  {hl.match.motm && (
                    <span className="text-[8.5px] text-slate-600 font-medium">
                      ⭐ <span className="font-bold text-[#0b1536]">{hl.match.motm.player.displayName}</span>: {hl.match.motm.reason}
                    </span>
                  )}
                  <p className="text-[9.5px] text-slate-500 font-normal leading-normal italic">
                    {hl.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Premium Share Card Preview (Streaks inside) */}
      <SharePreview
        formation={formation}
        selectedPlayers={activePlayers}
        stats={stats}
        simResult={simResult}
        streakStats={streakStats}
        isDailyChallenge={isDailyChallenge}
        dailyChallengeTitle={todayChallenge?.title}
        dailyChallengeBeaten={challengeBeaten}
        exportRef={exportRef}
      />

      {/* 3. Pitch XI Representation */}
      <div className="flex flex-col gap-3 relative z-10 w-full">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 leading-none">
          Squad Tactical Pitch Layout
        </span>
        <PitchLayout
          formation={formation}
          selectedPlayers={selectedPlayers}
          currentSlotIndex={-1}
        />
      </div>

      {/* 4. Complete Stats Breakdown */}
      <div className="flex flex-col gap-3 relative z-10 w-full">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 leading-none">
          Complete Team Statistics
        </span>
        <StatsDisplay
          attack={stats.attack}
          midfield={stats.midfield}
          defence={stats.defence}
          chemistry={stats.chemistry}
          overall={stats.overall}
          logs={getDetailedChemistryLogs(selectedPlayers, FORMATION_SLOTS[formation])}
        />
      </div>

      {/* Manager's Tactical Report Card */}
      <div className="w-full p-6 rounded-3xl office-floating-card z-10 flex flex-col gap-4 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <div className="flex-1 leading-none">
            <h3 className="text-md font-display font-black text-[#0b1536] uppercase tracking-tight">
              Manager's Tactical Report
            </h3>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              Post-Campaign Analysis
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 mt-2">
          {getManagerAdvice().map((adv, idx) => {
            const borderColors = {
              warning: 'border-rose-200 bg-rose-50/70 text-rose-900',
              good: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
              info: 'border-indigo-200 bg-indigo-50/70 text-indigo-900',
            }[adv.status as 'warning' | 'good' | 'info'];

            const icon = {
              warning: '🔴',
              good: '🟢',
              info: '💡',
            }[adv.status as 'warning' | 'good' | 'info'];

            return (
              <div key={idx} className={`p-4.5 rounded-2xl border ${borderColors} flex gap-3.5 leading-normal text-xs`}>
                <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
                <div className="flex-1 space-y-1">
                  <h4 className="font-extrabold uppercase text-[11px] tracking-wide leading-tight text-[#0b1536]">
                    {adv.title}
                  </h4>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    {adv.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Season Awards: Top Scorer & Clean Sheets */}
      {(simResult.topScorer || simResult.cleanSheets !== undefined) && (
        <div className="w-full grid grid-cols-2 gap-3 z-10">
          {simResult.topScorer && (
            <div className="p-4 rounded-2xl office-subcard border-amber-200 bg-amber-50/80 flex flex-col justify-between shadow-sm">
              <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1">
                🥇 Golden Boot
              </span>
              <div className="mt-2">
                <h4 className="text-sm font-display font-black text-[#0b1536] uppercase truncate">
                  {simResult.topScorer.player.displayName}
                </h4>
                <p className="text-[10px] text-slate-600 font-semibold mt-0.5">
                  {simResult.topScorer.goals} Goals in 38 Matches
                </p>
              </div>
            </div>
          )}
          {simResult.cleanSheets !== undefined && (
            <div className="p-4 rounded-2xl office-subcard border-blue-200 bg-blue-50/80 flex flex-col justify-between shadow-sm">
              <span className="text-[9px] font-black uppercase text-blue-800 tracking-wider flex items-center gap-1">
                🧤 Golden Glove
              </span>
              <div className="mt-2">
                <h4 className="text-sm font-display font-black text-[#0b1536] uppercase">
                  {simResult.cleanSheets} Clean Sheets
                </h4>
                <p className="text-[10px] text-slate-600 font-semibold mt-0.5">
                  {38 - simResult.cleanSheets} Matches Conceded
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Season Fixtures & Results (Collapsible) */}
      <div className="w-full z-10 flex flex-col gap-3">
        <button
          onClick={onToggleFixturesBreakdown}
          className="w-full p-4.5 rounded-2xl office-subcard border-[var(--office-divider)] hover:bg-slate-50 transition-all duration-300 flex items-center justify-between cursor-pointer active:scale-99 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">📅</span>
            <span className="text-xs font-display font-black text-[#0b1536] uppercase tracking-wider">
              {showFixturesBreakdown ? 'Hide' : 'Show'} Detailed Season Fixtures
            </span>
          </div>
          <span className="text-xs text-slate-500 font-extrabold font-display">
            {showFixturesBreakdown ? '▲' : '▼'}
          </span>
        </button>

        {showFixturesBreakdown && (
          <div className="w-full p-4.5 rounded-3xl office-floating-card flex flex-col gap-2.5 animate-card-deal shadow-md border border-slate-200">
            {simResult.matches.map((match, idx) => {
              const outcomeColors = {
                W: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
                D: 'bg-slate-50/80 border-slate-200 text-slate-800',
                L: 'bg-rose-50/80 border-rose-200 text-rose-900',
              }[match.outcome];

              const outcomeBadge = {
                W: 'bg-emerald-100 border-emerald-300 text-emerald-800',
                D: 'bg-slate-200 border-slate-300 text-slate-700',
                L: 'bg-rose-100 border-rose-300 text-rose-800',
              }[match.outcome];

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-4 p-3.5 rounded-2xl border ${outcomeColors} text-left leading-normal shadow-sm`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center w-full leading-none">
                      <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">
                        Game {idx + 1}
                      </span>
                      <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded border uppercase leading-none font-display ${outcomeBadge}`}>
                        {match.outcome === 'W' ? 'WIN' : match.outcome === 'D' ? 'DRAW' : 'LOSS'}
                      </span>
                    </div>
                    <h4 className="text-sm font-display font-black text-[#0b1536] mt-1.5 leading-none uppercase">
                      vs {match.opponent}
                    </h4>
                    {match.headline && (
                      <p className="text-[11px] font-bold text-slate-700 leading-snug mt-1">
                        "{match.headline}"
                      </p>
                    )}
                    {match.scorers && match.scorers.length > 0 && (
                      <p className="text-[10px] text-blue-600 font-bold leading-normal mt-1 flex items-center gap-1 flex-wrap">
                        <span>⚽</span> {match.scorers.join(', ')}
                      </p>
                    )}
                    {match.motm && (
                      <p className="text-[9.5px] text-amber-700 font-semibold mt-1">
                        ⭐ MOTM: {match.motm.player.displayName} ({match.motm.reason})
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500 leading-normal mt-1 italic">
                      {match.summary || getMatchCommentary(match)}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1 flex-shrink-0 self-center leading-none">
                    <span className="text-md font-display font-black text-[#0b1536] tracking-tight">
                      {match.ourScore} - {match.opponentScore}
                    </span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                      {match.opponentRating} OVR
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons: Export to Career, Build Another Team, Randomize */}
      <div className="mt-4 mb-6 relative z-10 flex flex-col gap-3 w-full">
        <button
          type="button"
          onClick={() => setShowExportModal(true)}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 text-white font-display font-black text-sm uppercase tracking-wider shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 transform active:scale-98 cursor-pointer text-center flex items-center justify-center gap-2"
        >
          <span className="text-lg">🚀</span>
          <span>Take This Squad into Career Mode</span>
        </button>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={onStartDraft}
            className="flex-1 py-4 px-6 rounded-2xl office-subcard text-[#0b1536] hover:bg-slate-100 font-display font-black text-sm uppercase tracking-wider transition-all duration-300 transform active:scale-98 cursor-pointer text-center shadow-sm"
          >
            🎮 Build Another Team
          </button>
          <button
            type="button"
            onClick={onRandomDraft}
            className="flex-grow py-4 px-6 rounded-2xl office-play-match-btn text-white font-display font-black text-sm uppercase tracking-wider shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 transform active:scale-98 cursor-pointer text-center"
          >
            🎲 Randomize Again
          </button>
        </div>
      </div>

      {/* Export to Career Mode Modal */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-draft-modal-title"
        >
          <div className="office-floating-card w-full max-w-xl bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto space-y-5 text-left">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl shadow-xs border border-emerald-100">
                  🚀
                </div>
                <div>
                  <h3 id="export-draft-modal-title" className="text-base font-display font-black text-[#0b1536] uppercase tracking-wide">
                    Take Drafted XI to Career Mode
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Launch a persistent Career save with your drafted 11 stars as the starting squad.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 text-sm font-bold flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Squad Snapshot */}
            <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-display font-black text-[#0b1536] uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚽</span> Drafted Foundation ({formation})
                </span>
                <span className="font-mono text-[11px] font-bold text-emerald-700">
                  {stats.overall} OVR • {stats.chemistry}% Chem
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {selectedPlayers.filter((p): p is Player => Boolean(p)).map((p, idx) => (
                  <span
                    key={p.id || idx}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10.5px] font-bold text-[#0b1536] shadow-2xs"
                  >
                    <span className="text-[9px] font-display font-black text-blue-700 px-1 py-0.2 bg-blue-50 rounded">
                      {p.primaryPosition}
                    </span>
                    <span className="truncate max-w-[90px]">{p.displayName}</span>
                    <span className="font-mono font-black text-[9.5px] text-slate-600">{p.rating}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Save Slot Selector */}
            <div className="space-y-2">
              <label className="text-xs font-display font-black text-[#0b1536] uppercase tracking-wider block">
                1. Select Destination Save Slot
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {saveSlots.map((slot) => {
                  const isSelected = selectedSlot === slot.slotId;
                  const slotLabel = slot.slotId === 'slot_1' ? 'Slot 1' : slot.slotId === 'slot_2' ? 'Slot 2' : 'Slot 3';
                  return (
                    <button
                      key={slot.slotId}
                      type="button"
                      onClick={() => setSelectedSlot(slot.slotId)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[78px] ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500 shadow-xs'
                          : 'border-slate-200/90 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-display font-black text-[#0b1536] uppercase">
                          {slotLabel}
                        </span>
                        {isSelected && <span className="text-emerald-700 font-bold text-xs">✓</span>}
                      </div>
                      {slot.isEmpty ? (
                        <div className="text-[10.5px] font-bold text-emerald-700 flex items-center gap-1 mt-1">
                          <span>🟢</span> Empty Slot
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-600 mt-1 line-clamp-2">
                          <span className="text-amber-700 font-bold">⚠️ Overwrites:</span>{' '}
                          <span className="font-semibold">{slot.save?.clubName || 'Club'}</span> (S{slot.save?.seasonNumber || 1})
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Club Identity Selection */}
            <div className="space-y-2">
              <label htmlFor="target-club-select" className="text-xs font-display font-black text-[#0b1536] uppercase tracking-wider block">
                2. Choose Club Identity
              </label>
              <select
                id="target-club-select"
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-display font-bold text-[#0b1536] focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
              >
                {getAllClubs().map((club) => (
                  <option key={club.id} value={club.id}>
                    {getEffectiveClubName(club)} • {club.stadiumName} (Budget: {formatCareerCurrency(club.startingBudget)})
                  </option>
                ))}
              </select>
            </div>

            {/* Manager Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="export-manager-name" className="text-xs font-display font-black text-[#0b1536] uppercase tracking-wider block">
                  3. Manager Name
                </label>
                <input
                  id="export-manager-name"
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Manager"
                  maxLength={30}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#0b1536] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
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
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#0b1536] focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Starting Budget Boost Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-display font-black text-[#0b1536] uppercase tracking-wider block">
                4. Starting Financial Backing
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 1.0, label: 'Standard (1.0x)' },
                  { value: 1.5, label: 'Well-Funded (1.5x)' },
                  { value: 2.0, label: 'Tycoon (2.0x)' },
                ].map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setBudgetMultiplier(b.value)}
                    className={`py-2 px-2.5 rounded-xl border text-[11px] font-display font-black uppercase text-center transition-all cursor-pointer ${
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
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="py-3 px-4.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-display font-black text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExport}
                disabled={isExporting}
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-display font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all transform active:scale-98 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <span>{isExporting ? '⏳ Initializing Career...' : '🚀 Launch Career Mode'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
