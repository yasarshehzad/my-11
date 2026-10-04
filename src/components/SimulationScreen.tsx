import React, { useRef, useEffect } from 'react';
import { SimulationResult, MatchSimResult } from '../types/game';

interface SimulationScreenProps {
  simIndex: number;
  simResult: SimulationResult | null;
  liveWins: number;
  liveDraws: number;
  liveLosses: number;
  livePoints: number;
  liveGoalsFor: number;
  liveGoalsAgainst: number;
  liveMatches: MatchSimResult[];
  onProceedToResults: () => void;
  onSkipSimulation?: () => void;
}

export function SimulationScreen({
  simIndex,
  simResult,
  liveWins,
  liveDraws,
  liveLosses,
  livePoints,
  liveGoalsFor,
  liveGoalsAgainst,
  liveMatches,
  onProceedToResults,
  onSkipSimulation,
}: SimulationScreenProps) {
  const simTickerRef = useRef<HTMLDivElement>(null);
  const progressPercent = Math.round((simIndex / 38) * 100);

  // Derive meaningful live highlight from latest match
  const latestMatch = liveMatches[0];
  let liveMoment: { badge: string; text: string } | null = null;
  if (latestMatch) {
    if (liveWins > 0 && liveWins % 5 === 0 && latestMatch.outcome === 'W') {
      liveMoment = { badge: '🔥 STREAK', text: `${liveWins} wins on the board!` };
    } else if (latestMatch.keyEvents && latestMatch.keyEvents.length > 0) {
      const ev = latestMatch.keyEvents[latestMatch.keyEvents.length - 1];
      const icon = ev.type === 'goal' ? '⚽ GOAL' : ev.type === 'save' ? '🧤 BIG SAVE' : '⚡ CHANCE';
      liveMoment = { badge: icon, text: `${ev.displayMinute} · ${ev.description}` };
    } else if (latestMatch.scorers && latestMatch.scorers.length > 0) {
      liveMoment = { badge: '⚽ GOAL', text: `${latestMatch.scorers[0]} vs ${latestMatch.opponent}` };
    }
  }

  // Auto-scroll ticker on new matches
  useEffect(() => {
    if (simTickerRef.current) {
      simTickerRef.current.scrollTop = 0;
    }
  }, [liveMatches]);

  return (
    <div className={`flex flex-col items-center justify-between min-h-[80vh] w-full max-w-sm mx-auto px-4 sm:px-6 py-8 space-y-6 overflow-hidden ${simIndex === 38 ? 'pb-24' : ''}`}>
      <div className="text-center w-full mt-2 leading-none">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/25 text-emerald-450 text-[10px] font-bold uppercase tracking-widest mb-3">
          ⚡ SIMULATING LEAGUE SEASON
        </div>
        <h2 className="text-3xl font-display font-black text-foreground uppercase tracking-tight">
          FIXTURES PROGRESS
        </h2>
        <p className="text-xs text-slate-400 mt-2 font-bold tracking-wider uppercase">
          Game {simIndex}/38 played ({progressPercent}%)
        </p>
      </div>

      {/* Standings Widget */}
      <div className="w-full glass rounded-3xl p-5 border border-slate-900 shadow-2xl flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-slate-900 pb-3 leading-none">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Standings</span>
          <span className="text-sm font-display font-black text-emerald-400 uppercase tracking-wide">
            {livePoints} PTS
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2.5 text-center">
          <div className="bg-slate-950/50 p-2.5 rounded-2xl border border-slate-900/60 leading-none">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Wins</span>
            <p className="text-lg font-display font-black text-foreground mt-1">{liveWins}</p>
          </div>
          <div className="bg-slate-950/50 p-2.5 rounded-2xl border border-slate-900/60 leading-none">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Draws</span>
            <p className="text-lg font-display font-black text-foreground mt-1">{liveDraws}</p>
          </div>
          <div className="bg-slate-950/50 p-2.5 rounded-2xl border border-slate-900/60 leading-none">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Losses</span>
            <p className="text-lg font-display font-black text-foreground mt-1">{liveLosses}</p>
          </div>
          <div className="bg-slate-950/50 p-2.5 rounded-2xl border border-slate-900/60 leading-none">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Diff</span>
            <p className="text-lg font-display font-black text-emerald-400 mt-1">
              {liveGoalsFor - liveGoalsAgainst > 0 ? '+' : ''}
              {liveGoalsFor - liveGoalsAgainst}
            </p>
          </div>
        </div>
      </div>

      {/* Season Match Outcome Grid */}
      <div className="w-full glass rounded-3xl p-4 border border-slate-900 shadow-xl flex flex-col gap-2 select-none">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
          Season Fixtures Progress Tracker
        </span>
        <div 
          className="grid gap-1.5 justify-items-center mt-1"
          style={{ gridTemplateColumns: 'repeat(19, minmax(0, 1fr))' }}
        >
          {Array.from({ length: 38 }).map((_, idx) => {
            const played = idx < simIndex;
            const match = played && simResult ? simResult.matches[idx] : null;
            
            let bgColor = 'bg-slate-900 border border-slate-800';
            let textLabel = '';
            let glowEffect = '';
            
            if (match) {
              if (match.outcome === 'W') {
                bgColor = 'bg-emerald-550 border border-emerald-450';
                textLabel = 'W';
                glowEffect = 'shadow-[0_0_8px_rgba(16,185,129,0.5)]';
              } else if (match.outcome === 'D') {
                bgColor = 'bg-slate-500 border border-slate-400';
                textLabel = 'D';
                glowEffect = 'shadow-[0_0_6px_rgba(148,163,184,0.4)]';
              } else {
                bgColor = 'bg-rose-500 border border-rose-450';
                textLabel = 'L';
                glowEffect = 'shadow-[0_0_8px_rgba(239,68,68,0.5)]';
              }
            }

            const isCurrent = idx === simIndex;

            return (
              <div
                key={idx}
                title={match ? `Game ${idx + 1} vs ${match.opponent}: ${match.ourScore}-${match.opponentScore} (${match.outcome})` : `Game ${idx + 1} (Unplayed)`}
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black font-display leading-none text-zinc-950 transition-all duration-300 ${bgColor} ${glowEffect} ${
                  isCurrent ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 animate-pulse' : ''
                } ${played ? 'animate-card-deal' : ''}`}
              >
                {textLabel}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Ticker Feed */}
      <div className="w-full flex-1 flex flex-col mt-3 overflow-hidden max-h-[280px]">
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
            Live matches feed ticker
          </span>
          {simIndex < 38 && onSkipSimulation && (
            <button
              onClick={onSkipSimulation}
              type="button"
              className="text-[9px] font-bold text-slate-400 hover:text-emerald-400 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer active:scale-95"
            >
              Skip to Results ⏩
            </button>
          )}
        </div>

        {/* Dynamic Key Moment Callout */}
        {liveMoment && (
          <div 
            aria-live="polite"
            className="w-full mb-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-emerald-500/25 flex items-center justify-between text-[10px] text-slate-200 animate-fade-in shadow-sm select-none"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-emerald-400 font-extrabold font-display uppercase tracking-wider flex-shrink-0">
                {liveMoment.badge}:
              </span>
              <span className="truncate text-slate-300 font-medium">
                {liveMoment.text}
              </span>
            </div>
          </div>
        )}
        
        <div
          ref={simTickerRef}
          className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 scroll-smooth"
        >
          {liveMatches.length > 0 ? (
            liveMatches.map((match, idx) => {
              const outcomeColors = {
                W: 'bg-emerald-950/20 border-emerald-500/20 text-emerald-450',
                D: 'bg-slate-500/10 border-slate-800 text-slate-350',
                L: 'bg-rose-950/20 border-rose-500/20 text-rose-455',
              }[match.outcome];

              const outcomeLabel = {
                W: 'W',
                D: 'D',
                L: 'L',
              }[match.outcome];

              return (
                <div
                  key={38 - idx}
                  className={`flex justify-between items-center p-3 rounded-2xl border ${outcomeColors} animate-card-deal`}
                >
                  <div className="flex flex-col leading-none">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                      Game {38 - idx}
                    </span>
                    <span className="text-xs font-bold text-foreground uppercase mt-1">
                      vs {match.opponent}
                    </span>
                    {match.headline && (
                      <span className="text-[8.5px] text-slate-400 font-medium mt-1 truncate max-w-[200px]">
                        {match.headline}
                      </span>
                    )}
                    {match.scorers && match.scorers.length > 0 && (
                      <span className="text-[8.5px] text-emerald-450 font-bold mt-1 flex items-center gap-1">
                        ⚽ {match.scorers.join(', ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-display font-black text-foreground">
                      {match.ourScore} - {match.opponentScore}
                    </span>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border uppercase leading-none font-display">
                      {outcomeLabel}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex items-center justify-center border border-dashed border-slate-900 rounded-3xl py-12">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest animate-pulse">
                Awaiting kick-off...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar & Proceed Action Button */}
      <div className="w-full mt-4 space-y-4">
        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300 ease-out"
          />
        </div>

        {simIndex < 38 && onSkipSimulation && (
          <div className="flex justify-center">
            <button
              onClick={onSkipSimulation}
              type="button"
              className="py-2 px-4 rounded-xl text-slate-400 hover:text-white border border-slate-900 bg-slate-950/60 hover:bg-slate-900/60 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <span>⏩</span> Skip Simulation
            </button>
          </div>
        )}

        {simIndex === 38 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent border-t border-slate-900/30 md:relative md:bg-none md:border-none md:p-0 z-40 flex justify-center">
            <button
              onClick={onProceedToResults}
              className="w-full max-w-sm py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/35 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer text-center animate-bounce"
            >
              Reveal Final Standings ➔
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
