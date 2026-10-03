import React from 'react';
import { ChallengeTemplate } from '../types/game';
import { DailyChallengeStatus } from '../utils/storage';

interface DailyChallengeBannerProps {
  todayChallenge: ChallengeTemplate | null;
  dailyStatus: DailyChallengeStatus;
  onPlay: () => void;
}

export function DailyChallengeBanner({
  todayChallenge,
  dailyStatus,
  onPlay,
}: DailyChallengeBannerProps) {
  if (!todayChallenge) {
    return (
      <div className="w-full max-w-[340px] h-[210px] rounded-3xl border border-slate-900 bg-slate-950/40 animate-pulse glass" />
    );
  }

  return (
    <div className="w-full max-w-[340px] rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 to-slate-950/70 p-5 text-left relative glass shadow-2xl animate-card-deal">
      <div className="absolute top-4 right-4 text-[8px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 uppercase tracking-widest">
        Daily Mode
      </div>

      <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest">
        Today's Challenge
      </span>
      
      <h3 className="text-lg font-display font-black text-foreground uppercase tracking-tight mt-1 leading-tight">
        {todayChallenge.title}
      </h3>
      
      <p className="text-[11px] text-slate-400 font-semibold leading-relaxed mt-2">
        {todayChallenge.description}
      </p>

      {dailyStatus.completed ? (
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-900 leading-none">
          <span className="text-[9px] font-bold text-slate-500 uppercase">
            Status: <span className={dailyStatus.beaten ? 'text-emerald-450' : 'text-rose-455'}>{dailyStatus.beaten ? 'Cleared ✅' : 'Failed ❌'}</span>
          </span>
          <span className="text-[9px] font-black text-slate-500 uppercase">
            Score: <span className="text-emerald-450">{dailyStatus.score}</span>
          </span>
        </div>
      ) : (
        <div className="h-[1px] w-full bg-slate-900/60 mt-4" />
      )}

      <button
        onClick={onPlay}
        className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-display font-black text-xs uppercase tracking-wider shadow hover:shadow-emerald-400/10 mt-4 transition-all duration-300 transform active:scale-98 cursor-pointer text-center"
      >
        {dailyStatus.completed ? "Re-play Daily Challenge" : "Play Today's Challenge"}
      </button>
    </div>
  );
}
