import React, { useRef, useEffect } from 'react';
import { Player, FormationType, SimulationResult, ChallengeTemplate, StreakStats, MatchSimResult } from '../types/game';
import { FORMATION_SLOTS, getDetailedChemistryLogs } from '../utils/gameLogic';
import { PitchLayout } from './PitchLayout';
import { StatsDisplay } from './StatsDisplay';
import { SharePreview } from './SharePreview';

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
    if (pos <= 4) return 'from-slate-200 to-slate-450 text-zinc-950 border-slate-350';
    return 'from-slate-900 to-slate-950 text-slate-300 border-slate-900';
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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/25 text-emerald-450 text-[10px] font-bold uppercase tracking-widest mb-3">
          ⚽ FIXTURES COMPLETE
        </div>
        
        <h2 className="text-3xl font-display font-black text-foreground uppercase tracking-tight">
          CAMPAIGN DEBRIEF
        </h2>
        
        {isDailyChallenge && todayChallenge && (
          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-2">
            Daily Challenge: <span className="text-emerald-450 font-display">{todayChallenge.title}</span>
          </p>
        )}
        <p className="text-[10px] text-slate-450 font-bold tracking-widest uppercase mt-1.5">
          League: <span className="text-emerald-450 font-display">
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
      </div>

      {/* Heartbreak / Celebratory Banner */}
      {isSoClose && (
        <div className="w-full p-4.5 rounded-3xl bg-gradient-to-r from-rose-950/60 to-slate-950/80 border border-rose-500/25 relative z-10 text-center animate-pulse shadow-xl">
          <span className="text-xl">💔</span>
          <h3 className="text-sm font-display font-black text-rose-455 uppercase mt-1 leading-none">So close to perfection!</h3>
          <p className="text-[10px] text-slate-450 mt-1.5 leading-relaxed max-w-xs mx-auto font-medium">
            Just {38 - simResult.wins} slip-up{38 - simResult.wins > 1 ? 's' : ''} cost you the legendary 38-0 Invincibles campaign.
          </p>
        </div>
      )}

      {simResult.wins === 38 && (
        <div className="w-full p-5 rounded-3xl bg-gradient-to-r from-amber-950/60 to-slate-950/80 border border-amber-500/25 relative z-10 text-center animate-bounce shadow-xl">
          <span className="text-xl">👑</span>
          <h3 className="text-sm font-display font-black text-amber-400 uppercase mt-1 leading-none">THE PERFECT SEASON!</h3>
          <p className="text-[10px] text-slate-450 mt-1.5 leading-relaxed max-w-xs mx-auto font-semibold">
            38 wins. 0 draws. 0 losses. You have achieved absolute football immortality!
          </p>
        </div>
      )}

      {/* 1. Main League Outcome Card */}
      <div className="w-full flex flex-col items-center p-6 rounded-[32px] glass border border-emerald-500/10 relative overflow-hidden text-center z-10 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />

        {/* Daily Challenge Clear Status Badge */}
        {isDailyChallenge ? (
          <div className={`px-5 py-2 rounded-2xl bg-gradient-to-r border shadow-lg font-display font-black text-sm uppercase tracking-wider mb-4 leading-none ${
            challengeBeaten 
              ? 'from-emerald-400 to-teal-500 text-zinc-950 border-emerald-400 shadow-emerald-500/20'
              : 'from-rose-500 to-red-700 text-rose-950 border-rose-500'
          }`}>
            {challengeBeaten ? '✅ CHALLENGE CLEARED!' : '❌ CHALLENGE FAILED'}
          </div>
        ) : (
          <div className={`px-5 py-2 rounded-2xl bg-gradient-to-r border shadow-lg font-display font-black text-xs uppercase tracking-wider ${getFinishAccentClass(simResult.leaguePosition)} mb-4 leading-none`}>
            {leagueFinishLabel}
          </div>
        )}

        <p className="text-5xl font-display font-black text-foreground leading-none tracking-tight">
          {simResult.wins}W - {simResult.draws}D - {simResult.losses}L
        </p>
        
        <p className="text-xs font-bold text-slate-350 mt-2 leading-none uppercase tracking-wide">
          Record: <span className="text-foreground font-extrabold">{simResult.points} PTS</span> • Goals: <span className="text-foreground font-extrabold">{simResult.goalsFor}F / {simResult.goalsAgainst}A</span>
        </p>

        <div className="h-[1.5px] w-12 bg-slate-900 my-4" />

        <p className="text-xs font-semibold text-slate-400 max-w-sm leading-relaxed italic">
          "{simResult.summary}"
        </p>
      </div>

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
      <div className="w-full p-6 rounded-[32px] glass border border-slate-900 z-10 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <div className="flex-1 leading-none">
            <h3 className="text-md font-display font-black text-foreground uppercase tracking-tight">
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
              warning: 'border-rose-500/25 bg-rose-950/10 text-rose-350',
              good: 'border-emerald-500/25 bg-emerald-950/10 text-emerald-350',
              info: 'border-indigo-500/25 bg-indigo-950/10 text-indigo-350',
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
                  <h4 className="font-extrabold uppercase text-[11px] tracking-wide leading-tight text-foreground">
                    {adv.title}
                  </h4>
                  <p className="text-slate-400 font-medium leading-relaxed">
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
            <div className="p-4 rounded-2xl glass border border-amber-500/20 bg-amber-950/10 flex flex-col justify-between">
              <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                🥇 Golden Boot
              </span>
              <div className="mt-2">
                <h4 className="text-sm font-display font-black text-foreground uppercase truncate">
                  {simResult.topScorer.player.displayName}
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {simResult.topScorer.goals} Goals in 38 Matches
                </p>
              </div>
            </div>
          )}
          {simResult.cleanSheets !== undefined && (
            <div className="p-4 rounded-2xl glass border border-emerald-500/20 bg-emerald-950/10 flex flex-col justify-between">
              <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                🧤 Golden Glove
              </span>
              <div className="mt-2">
                <h4 className="text-sm font-display font-black text-foreground uppercase">
                  {simResult.cleanSheets} Clean Sheets
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
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
          className="w-full p-4.5 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-all duration-300 flex items-center justify-between cursor-pointer active:scale-99"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">📅</span>
            <span className="text-xs font-display font-black text-foreground uppercase tracking-wider">
              {showFixturesBreakdown ? 'Hide' : 'Show'} Detailed Season Fixtures
            </span>
          </div>
          <span className="text-xs text-slate-450 font-extrabold font-display">
            {showFixturesBreakdown ? '▲' : '▼'}
          </span>
        </button>

        {showFixturesBreakdown && (
          <div className="w-full p-4.5 rounded-[32px] glass border border-slate-900 max-h-[420px] overflow-y-auto flex flex-col gap-2.5 scroll-smooth custom-scrollbar animate-card-deal">
            {simResult.matches.map((match, idx) => {
              const outcomeColors = {
                W: 'bg-emerald-950/20 border-emerald-500/20 text-emerald-450',
                D: 'bg-slate-500/10 border-slate-900 text-slate-350',
                L: 'bg-rose-950/20 border-rose-500/20 text-rose-455',
              }[match.outcome];

              const outcomeBadge = {
                W: 'bg-emerald-950/30 border-emerald-500/30 text-emerald-450',
                D: 'bg-slate-900 border-slate-800 text-slate-450',
                L: 'bg-rose-950/30 border-rose-500/30 text-rose-455',
              }[match.outcome];

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-4 p-3.5 rounded-2xl border ${outcomeColors} text-left leading-normal`}
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
                    <h4 className="text-sm font-display font-black text-foreground mt-1.5 leading-none uppercase">
                      vs {match.opponent}
                    </h4>
                    {match.scorers && match.scorers.length > 0 && (
                      <p className="text-[10px] text-emerald-450 font-bold leading-normal mt-1 flex items-center gap-1 flex-wrap">
                        <span>⚽</span> {match.scorers.join(', ')}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 leading-normal mt-1 italic">
                      {getMatchCommentary(match)}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1 flex-shrink-0 self-center leading-none">
                    <span className="text-md font-display font-black text-foreground tracking-tight">
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

      {/* Play Again and Randomize Buttons */}
      <div className="mt-4 mb-6 relative z-10 flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={onStartDraft}
          className="flex-1 py-4 px-6 rounded-2xl bg-slate-900 border border-slate-800 text-foreground hover:bg-slate-800 font-display font-black text-sm uppercase tracking-wider transition-all duration-300 transform active:scale-98 cursor-pointer text-center"
        >
          🎮 Build Another Team
        </button>
        <button
          onClick={onRandomDraft}
          className="flex-grow py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 hover:-translate-y-0.5 transition-all duration-300 transform active:scale-98 cursor-pointer text-center"
        >
          🎲 Randomize Again
        </button>
      </div>
    </div>
  );
}
