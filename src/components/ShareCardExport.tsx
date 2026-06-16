import React from 'react';
import { Player, FormationType, SimulationResult, StreakStats } from '../types/game';
import { FORMATION_SLOTS } from '../utils/gameLogic';

interface ShareCardExportProps {
  formation: FormationType;
  selectedPlayers: (Player | null)[];
  stats: {
    attack: number;
    midfield: number;
    defence: number;
    chemistry: number;
    overall: number;
  };
  simResult: SimulationResult;
  streakStats?: StreakStats | null;
  isDailyChallenge?: boolean;
  dailyChallengeTitle?: string;
  dailyChallengeBeaten?: boolean;
  domRef: React.RefObject<HTMLDivElement | null>;
}

export const ShareCardExport: React.FC<ShareCardExportProps> = ({
  formation,
  selectedPlayers,
  stats,
  simResult,
  streakStats,
  isDailyChallenge = false,
  dailyChallengeTitle = '',
  dailyChallengeBeaten = false,
  domRef,
}) => {
  const slots = FORMATION_SLOTS[formation] || [];

  // Rarity color/styling mapping for export cards
  const getPlayerCardStyles = (rarity: Player['rarity']) => {
    return {
      legend: {
        border: 'border-amber-400/80',
        bg: 'from-amber-950/50 to-slate-950/95',
        text: 'text-amber-400',
        ratingText: 'text-amber-300 font-extrabold',
        badge: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.25)]',
      },
      elite: {
        border: 'border-purple-400/80',
        bg: 'from-purple-950/50 to-slate-950/95',
        text: 'text-purple-400',
        ratingText: 'text-purple-300 font-extrabold',
        badge: 'bg-purple-400/15 text-purple-300 border-purple-400/30',
        glow: 'shadow-[0_0_15px_rgba(168,85,247,0.25)]',
      },
      rare: {
        border: 'border-blue-400/80',
        bg: 'from-blue-950/50 to-slate-950/95',
        text: 'text-blue-400',
        ratingText: 'text-blue-300 font-extrabold',
        badge: 'bg-blue-400/15 text-blue-300 border-blue-400/30',
        glow: 'shadow-[0_0_15px_rgba(59,130,246,0.25)]',
      },
      cult: {
        border: 'border-emerald-450/80',
        bg: 'from-emerald-950/50 to-slate-950/95',
        text: 'text-emerald-450',
        ratingText: 'text-emerald-350 font-extrabold',
        badge: 'bg-emerald-450/15 text-emerald-350 border-emerald-450/30',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
      },
      solid: {
        border: 'border-slate-500/60',
        bg: 'from-slate-800/40 to-slate-950/95',
        text: 'text-slate-300',
        ratingText: 'text-slate-200 font-semibold',
        badge: 'bg-slate-700/15 text-slate-350 border-slate-700/35',
        glow: 'shadow-none',
      },
      common: {
        border: 'border-slate-750',
        bg: 'from-slate-900/50 to-slate-950/95',
        text: 'text-slate-400',
        ratingText: 'text-slate-300 font-bold',
        badge: 'bg-slate-800 text-slate-450 border-slate-750',
        glow: 'shadow-none',
      },
    }[rarity] || {
      border: 'border-slate-750',
      bg: 'from-slate-900/50 to-slate-950/95',
      text: 'text-slate-400',
      ratingText: 'text-slate-300 font-bold',
      badge: 'bg-slate-850 text-slate-450 border-slate-750',
      glow: 'shadow-none',
    };
  };

  const getFinishText = (pos: number) => {
    if (pos === 1) return 'LEAGUE CHAMPIONS 🏆';
    if (pos <= 4) return 'CHAMPIONS LEAGUE QUALIFICATION 🥈';
    if (pos <= 7) return 'EUROPA LEAGUE BOUND 🥉';
    return 'MID TABLE LEAGUE RUN 🤝';
  };

  const getFinishClass = (pos: number) => {
    if (pos === 1) return 'from-amber-400 to-yellow-600 border-yellow-500 text-yellow-950 font-black shadow-lg shadow-amber-500/20';
    if (pos <= 4) return 'from-slate-200 to-slate-400 border-slate-300 text-slate-950 font-bold';
    return 'from-slate-800 to-slate-900 border-slate-800 text-slate-300';
  };

  const gradeColors = {
    S: 'text-amber-400 border-amber-500 shadow-amber-500/30',
    A: 'text-purple-400 border-purple-500 shadow-purple-500/30',
    B: 'text-blue-400 border-blue-500 shadow-blue-500/30',
    C: 'text-slate-300 border-slate-700',
    D: 'text-slate-500 border-slate-800',
  }[simResult.chemistryGrade];

  return (
    // Outer Wrapper: Fixed at exactly 1080px wide and 1920px tall for perfect story export
    <div
      ref={domRef}
      className="w-[1080px] h-[1920px] flex flex-col justify-between p-14 bg-slate-950 text-white font-sans overflow-hidden relative"
      style={{
        boxSizing: 'border-box',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.1), transparent 60%), radial-gradient(circle at 0% 100%, rgba(6, 78, 59, 0.15), transparent 50%), linear-gradient(to bottom, #020617 0%, #080f21 100%)',
      }}
    >
      {/* 1. Header Area */}
      <div className="flex justify-between items-center w-full border-b-2 border-slate-900 pb-8 relative z-10">
        <div>
          <h1 className="text-6xl font-display font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-emerald-450 uppercase leading-none">
            DRAFTED XI
          </h1>
          <p className="text-lg font-bold text-slate-500 tracking-widest uppercase mt-3.5">
            {isDailyChallenge ? `Daily Challenge: ${dailyChallengeTitle}` : 'Football Draft League'}
          </p>
        </div>

        {isDailyChallenge ? (
          <span className={`text-xl font-black px-7 py-3 rounded-2xl border uppercase tracking-wider font-display ${
            dailyChallengeBeaten 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.25)]' 
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          }`}>
            {dailyChallengeBeaten ? '✅ CHALLENGE CLEARED' : '❌ CHALLENGE FAILED'}
          </span>
        ) : (
          <span className={`text-lg font-black px-7 py-3 rounded-2xl bg-gradient-to-r border uppercase tracking-wider font-display ${getFinishClass(simResult.leaguePosition)}`}>
            {getFinishText(simResult.leaguePosition)}
          </span>
        )}
      </div>

      {/* 2. Visual Pitch Canvas (Scaled up for 1080px width) */}
      <div className="w-full h-[890px] relative rounded-[40px] overflow-hidden bg-gradient-to-b from-[#021c16] to-[#040e0b] border border-emerald-900/40 shadow-2xl relative z-10 mt-6">
        
        {/* Tactical Pitch Markings */}
        <div className="absolute inset-0 p-8 opacity-70 pointer-events-none">
          <div className="w-full h-full border-4 border-emerald-500/10 rounded-[30px] relative">
            <div className="absolute top-1/2 left-0 right-0 h-[3px] bg-emerald-500/10 transform -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-48 h-48 border-4 border-emerald-500/10 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-4.5 h-4.5 bg-emerald-500/15 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
            
            {/* Penalty Boxes */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[480px] h-[220px] border-b-4 border-x-4 border-emerald-500/10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[240px] h-[80px] border-b-4 border-x-4 border-emerald-500/10" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[480px] h-[220px] border-t-4 border-x-4 border-emerald-500/10" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[240px] h-[80px] border-t-4 border-x-4 border-emerald-500/10" />
          </div>
        </div>

        {/* Grass Strips */}
        <div className="absolute inset-0 flex flex-col pointer-events-none opacity-20">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 w-full ${i % 2 === 0 ? 'bg-emerald-950/20' : 'bg-transparent'}`}
            />
          ))}
        </div>

        {/* Render 11 Players inside Pitch */}
        {slots.map((slot, index) => {
          const player = selectedPlayers[index];
          if (!player) return null;
          
          const cardStyle = getPlayerCardStyles(player.rarity);

          return (
            <div
              key={slot.id}
              className="absolute z-20"
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Scaled compact player cards on pitch showing Club & Season explicitly */}
              <div className={`w-[136px] h-[202px] rounded-2xl border-2 ${cardStyle.border} bg-gradient-to-b ${cardStyle.bg} ${cardStyle.glow} flex flex-col justify-between p-3.5 relative shadow-2xl`}>
                <div className="flex justify-between items-start leading-none">
                  <span className={`text-2xl font-display font-black leading-none ${cardStyle.text}`}>
                    {player.rating}
                  </span>
                  <span className="text-[10px] font-black text-slate-350 bg-slate-900/80 px-1 py-0.5 rounded uppercase font-display leading-none">
                    {player.primaryPosition}
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-end mt-2 mb-1.5 leading-none">
                  <span className="text-sm font-display font-extrabold text-white uppercase tracking-tight truncate">
                    {player.displayName.split(' ').pop()}
                  </span>
                </div>

                {/* Club + Season rendered nicely at bottom of card */}
                <div className="flex flex-col text-[8.5px] text-slate-400 border-t border-slate-850/60 pt-1.5 mt-1 font-semibold leading-none gap-1">
                  <span className="truncate max-w-[110px] uppercase text-slate-350">{player.club}</span>
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[8px] text-slate-500 uppercase">{player.era}</span>
                    <span className={`text-[8.5px] font-black ${player.rarity === 'legend' ? 'text-amber-400' : player.rarity === 'elite' ? 'text-purple-400' : player.rarity === 'cult' ? 'text-emerald-450' : 'text-slate-400'}`}>
                      {player.season}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Campaign Record Banner */}
      <div className="w-full bg-slate-900 border border-slate-850 rounded-[35px] p-9 mt-6 flex justify-between items-center relative z-10 shadow-xl">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">
            Simulated Campaign Results
          </span>
          <h2 className="text-6xl font-display font-black text-white leading-none tracking-tight">
            {simResult.wins}W - {simResult.draws}D - {simResult.losses}L
          </h2>
          <p className="text-xl text-slate-400 font-bold mt-3">
            Points: <span className="text-white">{simResult.points} PTS</span> • Goals: <span className="text-white">{simResult.goalsFor}F / {simResult.goalsAgainst}A</span>
          </p>
        </div>

        <div className="flex gap-4">
          {/* Overall Badge */}
          <div className="flex flex-col items-center bg-slate-950 border-2 border-emerald-500/20 px-6 py-4.5 rounded-3xl shadow-lg leading-none">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TEAM OVR</span>
            <span className="text-5xl font-display font-black text-white mt-2.5">{stats.overall}</span>
          </div>

          {/* Chemistry Grade Badge */}
          <div className={`flex flex-col items-center bg-slate-950 border-2 px-6 py-4.5 rounded-3xl shadow-lg leading-none ${gradeColors}`}>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CHEM</span>
            <span className="text-5xl font-display font-black mt-2.5">{simResult.chemistryGrade}</span>
          </div>
        </div>
      </div>

      {/* 4. Stats Category row */}
      <div className="grid grid-cols-5 gap-4 mt-6 relative z-10">
        <div className="bg-slate-900/60 rounded-2xl p-4.5 border border-slate-850 text-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ATTACK</span>
          <p className="text-2xl font-display font-black text-emerald-450 mt-2">{stats.attack}</p>
        </div>
        <div className="bg-slate-900/60 rounded-2xl p-4.5 border border-slate-850 text-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">MIDFIELD</span>
          <p className="text-2xl font-display font-black text-sky-405 mt-2">{stats.midfield}</p>
        </div>
        <div className="bg-slate-900/60 rounded-2xl p-4.5 border border-slate-850 text-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DEFENCE</span>
          <p className="text-2xl font-display font-black text-rose-455 mt-2">{stats.defence}</p>
        </div>
        <div className="bg-slate-900/60 rounded-2xl p-4.5 border border-slate-850 text-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CHEMISTRY</span>
          <p className="text-2xl font-display font-black text-amber-450 mt-2">{stats.chemistry}</p>
        </div>
        <div className="bg-slate-900/60 rounded-2xl p-4.5 border border-slate-850 text-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">GLOBAL TIER</span>
          <p className="text-xl font-display font-black text-indigo-400 mt-2">Top {simResult.percentile}%</p>
        </div>
      </div>

      {/* Narrative summary */}
      <div className="bg-slate-900/35 border border-slate-900 rounded-2xl p-6 mt-6 relative z-10 text-center">
        <p className="text-base font-semibold text-slate-350 leading-relaxed italic">
          "{simResult.summary}"
        </p>
        <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mt-2.5">
          TACTICAL PLAYSTYLE: {simResult.playstyle}
        </p>
      </div>

      {/* 5. MVP & Isolated Spotlight */}
      <div className="grid grid-cols-2 gap-6 mt-6 relative z-10">
        <div className="bg-slate-950/60 rounded-3xl p-5.5 border border-emerald-500/10 flex flex-col justify-between h-[90px] leading-none">
          <div>
            <span className="text-[10px] font-bold text-emerald-450 uppercase tracking-widest block mb-1">⭐ SEASON MVP</span>
            <span className="text-2xl font-display font-extrabold text-white uppercase leading-tight truncate block">
              {simResult.mvp.displayName}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            {simResult.mvp.primaryPosition} • {simResult.mvp.rating} OVR • {simResult.mvp.club}
          </span>
        </div>

        <div className="bg-slate-950/60 rounded-3xl p-5.5 border border-rose-500/10 flex flex-col justify-between h-[90px] leading-none">
          <div>
            <span className="text-[10px] font-bold text-rose-455 uppercase tracking-widest block mb-1">⚠️ WEAK LINK</span>
            <span className="text-2xl font-display font-extrabold text-white uppercase leading-tight truncate block">
              {simResult.weakLink.displayName}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            {simResult.weakLink.primaryPosition} • {simResult.weakLink.rating} OVR • {simResult.weakLink.club}
          </span>
        </div>
      </div>

      {/* Streaks stats if available */}
      {streakStats && (
        <div className="bg-slate-900/20 rounded-3xl p-6 border border-slate-900/60 mt-6 relative z-10 flex justify-between text-center gap-2">
          <div className="flex-grow">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Runs Played</span>
            <p className="text-2xl font-display font-black text-white mt-1">{streakStats.gamesPlayed}</p>
          </div>
          <div className="w-[1.5px] bg-slate-850" />
          <div className="flex-grow">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Best League Record</span>
            <p className="text-2xl font-display font-black text-emerald-400 mt-1">{streakStats.bestPoints} pts</p>
          </div>
          <div className="w-[1.5px] bg-slate-850" />
          <div className="flex-grow">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Completed Runs</span>
            <p className="text-2xl font-display font-black text-amber-400 mt-1">{streakStats.dailyChallengesCompleted}</p>
          </div>
          <div className="w-[1.5px] bg-slate-850" />
          <div className="flex-grow">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Streak</span>
            <p className="text-2xl font-display font-black text-indigo-400 mt-1">⚡ {streakStats.currentDailyStreak} Days</p>
          </div>
        </div>
      )}

      {/* 6. Footer / CTA watermark */}
      <div className="flex justify-between items-center border-t-2 border-slate-900 pt-8 mt-6 relative z-10">
        <div>
          <p className="text-2xl font-display font-black tracking-tight text-white uppercase leading-none">
            CAN YOU BEAT THIS?
          </p>
          <p className="text-xs text-emerald-450 mt-2 font-black uppercase leading-none tracking-widest font-display">
            PLAY NOW AT MY-11.COM
          </p>
        </div>

        <span className="text-xs font-black text-slate-500 bg-slate-900 px-4 py-1.5 rounded-lg border border-slate-850 uppercase tracking-wider">
          TACTICAL FORMATION: {formation}
        </span>
      </div>
    </div>
  );
};
