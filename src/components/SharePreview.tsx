import React, { useState, useEffect } from 'react';
import { Player, SimulationResult, StreakStats } from '../types/game';
import { toPng } from 'html-to-image';
import { generateChallengeUrl, generateChallengeShareText } from '../utils/challengeUrl';
import {
  logResultShared,
  logShareCardDownloaded,
  logShareOpened,
  logNativeShareTriggered,
  logChallengeLinkCopied,
} from '../utils/analytics';

interface SharePreviewProps {
  formation: string;
  selectedPlayers: Player[];
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
  exportRef: React.RefObject<HTMLDivElement | null>;
}

export const SharePreview: React.FC<SharePreviewProps> = ({
  formation,
  selectedPlayers,
  stats,
  simResult,
  streakStats,
  isDailyChallenge = false,
  dailyChallengeTitle = '',
  dailyChallengeBeaten = false,
  exportRef,
}) => {
  const [generating, setGenerating] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Track share view on mount
  useEffect(() => {
    logShareOpened(simResult.wins, simResult.points, simResult.draftModifier || 'classic');
  }, [simResult.wins, simResult.points, simResult.draftModifier]);

  // Generate lightweight challenge URL & adaptive football share text
  const challengeUrl = React.useMemo(() => {
    return generateChallengeUrl({
      targetWins: simResult.wins,
      targetPoints: simResult.points,
      draftMode: simResult.draftModifier || 'classic',
      formation: formation as any,
      leagueId: simResult.selectedLeague || 'english',
    });
  }, [simResult.wins, simResult.points, simResult.draftModifier, formation, simResult.selectedLeague]);

  const shareText = React.useMemo(() => {
    return generateChallengeShareText({
      wins: simResult.wins,
      draws: simResult.draws,
      losses: simResult.losses,
      points: simResult.points,
      mode: simResult.draftModifier || 'classic',
      challengeUrl,
      isDailyChallenge,
      dailyChallengeTitle,
    });
  }, [simResult.wins, simResult.draws, simResult.losses, simResult.points, simResult.draftModifier, challengeUrl, isDailyChallenge, dailyChallengeTitle]);

  // Helper: Copy challenge link specifically
  const handleCopyChallengeLink = async () => {
    try {
      await navigator.clipboard.writeText(challengeUrl);
      logChallengeLinkCopied(simResult.wins, simResult.points);
      setFeedbackMessage('Copied challenge link to clipboard!');
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (e) {
      setErrorMessage('Could not copy to clipboard.');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  // Helper: Copy formatted challenge text with link
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      logChallengeLinkCopied(simResult.wins, simResult.points);
      setFeedbackMessage('Copied challenge summary & link to clipboard!');
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (e) {
      setErrorMessage('Could not copy to clipboard.');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  // 1. Download PNG Graphic
  const handleDownloadImage = async () => {
    if (!exportRef.current) return;
    setGenerating(true);
    setErrorMessage(null);
    logShareCardDownloaded();

    // Wait slightly to ensure styles are stable
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        width: 1080,
        height: 1920,
      });

      const link = document.createElement('a');
      link.download = `my11_challenge_${simResult.wins}wins.png`;
      link.href = dataUrl;
      link.click();
      setFeedbackMessage('Downloaded 1080x1920 card!');
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (error) {
      console.error('Failed to generate image', error);
      setErrorMessage('Failed to generate image. Please try copying the challenge link instead.');
    } finally {
      setGenerating(false);
    }
  };

  // 2. Native Share using Web Share API
  const handleShareResult = async () => {
    logNativeShareTriggered(simResult.wins, simResult.points);
    logResultShared(simResult.wins, simResult.points);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Beat My Score on MY-11 (${simResult.wins} Wins)`,
          text: shareText,
          url: challengeUrl,
        });
        setFeedbackMessage('Shared successfully!');
        setTimeout(() => setFeedbackMessage(null), 3000);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          await handleCopyChallengeLink();
        }
      }
    } else {
      // Fallback: Copy challenge link to clipboard
      await handleCopyChallengeLink();
    }
  };

  const getMedalEmoji = (pos: number) => {
    if (pos === 1) return '🏆 LEAGUE CHAMPIONS';
    if (pos <= 4) return '🥈 CHAMPIONS LEAGUE';
    if (pos <= 7) return '🥉 EUROPA LEAGUE';
    return '🤝 MID TABLE FINISH';
  };

  const getTierBadgeClass = (pos: number) => {
    if (pos === 1) return 'from-amber-500 to-yellow-600 border-yellow-500 text-yellow-950 font-black';
    if (pos <= 4) return 'from-slate-300 to-slate-500 border-slate-400 text-slate-950 font-bold';
    if (pos <= 7) return 'from-indigo-900 to-indigo-950 border-indigo-700 text-indigo-100 font-bold';
    return 'from-slate-800 to-slate-900 border-slate-700 text-slate-350';
  };

  const gradeColors = {
    S: 'text-amber-400 border-amber-500 shadow-amber-500/25',
    A: 'text-purple-400 border-purple-500 shadow-purple-500/25',
    B: 'text-blue-400 border-blue-500 shadow-blue-500/25',
    C: 'text-slate-300 border-slate-600',
    D: 'text-slate-500 border-slate-800',
  }[simResult.chemistryGrade];

  return (
    <div className="w-full flex flex-col items-center gap-5 select-none relative z-10">
      
      {/* Loading Overlay when generating image */}
      {generating && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-card-deal">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4" />
          <h3 className="text-lg font-display font-black text-foreground uppercase tracking-wider">Generating Share Card...</h3>
          <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">Creating high-res 1080x1920 PNG</p>
        </div>
      )}

      {/* Visual Share Card (UI Preview only) */}
      <div 
        id="share-card-container"
        className="w-full max-w-sm rounded-3xl p-6 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border border-emerald-500/20 shadow-2xl"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-emerald-500/5 filter blur-3xl pointer-events-none" />

        <div className="flex justify-between items-start mb-5 relative z-10">
          <div>
            <h2 className="text-2xl font-display font-black tracking-tight text-foreground uppercase leading-none">
              MY DRAFTED <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">XI</span>
            </h2>
            <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mt-1">
              {isDailyChallenge 
                ? `Daily Challenge: ${dailyChallengeTitle}` 
                : `${simResult.draftModifier === 'quick' ? '⚡ Quick Draft' : simResult.draftModifier === 'mystery' ? '❓ Mystery Draft' : 'Classic Draft'} • League Season`}
            </p>
          </div>
          
          {isDailyChallenge ? (
            <span className={`text-[9px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider font-display leading-none ${
              dailyChallengeBeaten 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}>
              {dailyChallengeBeaten ? '✅ CLEARED' : '❌ FAILED'}
            </span>
          ) : (
            <span className={`text-[9.5px] font-extrabold px-3 py-1 rounded-full bg-gradient-to-r border ${getTierBadgeClass(simResult.leaguePosition)} uppercase tracking-wider leading-none font-display`}>
              {getMedalEmoji(simResult.leaguePosition)}
            </span>
          )}
        </div>

        {/* Score Card Banner */}
        <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-900 mb-4 relative z-10 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Final Record</span>
            <span className="text-[9px] font-bold text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 font-display leading-none">
              {formation}
            </span>
          </div>
          
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-display font-black text-foreground leading-none tracking-tight">
                {simResult.wins}W - {simResult.draws}D - {simResult.losses}L
              </p>
              <p className="text-xs text-slate-455 font-semibold mt-1.5 leading-none">
                Points: <span className="text-foreground font-bold">{simResult.points} PTS</span> • Tier: <span className="text-emerald-450 font-bold">Top {simResult.percentile}%</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex flex-col items-center bg-slate-900/40 px-2 py-1.5 rounded-xl border border-slate-800">
                <span className="text-[7px] font-bold text-slate-500 uppercase leading-none">OVR</span>
                <span className="text-xl font-display font-black text-foreground leading-none mt-1">
                  {stats.overall}
                </span>
              </div>
              
              <div className={`flex flex-col items-center bg-slate-900/40 px-2.5 py-1.5 rounded-xl border ${gradeColors} shadow-lg shadow-black/10`}>
                <span className="text-[7px] font-bold text-slate-500 uppercase leading-none">CHEM</span>
                <span className="text-xl font-display font-black leading-none mt-1">
                  {simResult.chemistryGrade}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-900 flex justify-between items-center text-[10px]">
            <span className="font-semibold text-slate-500 uppercase tracking-wider">Playstyle:</span>
            <span className="font-bold text-emerald-400 uppercase tracking-wide">
              {simResult.playstyle}
            </span>
          </div>

          {simResult.seasonStory && (
            <div className="mt-2 pt-2 border-t border-slate-900/60 flex justify-between items-center text-[8.5px]">
              <span className="font-extrabold uppercase text-emerald-450 tracking-wider font-display">
                {simResult.seasonStory.title}
              </span>
              <span className="text-slate-450 font-medium truncate max-w-[170px]">
                {simResult.seasonStory.longestStreak.description}
              </span>
            </div>
          )}
        </div>

        {/* Categories grid */}
        <div className="grid grid-cols-4 gap-2 mb-4 relative z-10">
          <div className="bg-slate-900/45 rounded-xl p-2 border border-slate-900 text-center leading-none">
            <p className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider">ATT</p>
            <p className="text-sm font-bold text-emerald-400 font-display mt-1">{stats.attack}</p>
          </div>
          <div className="bg-slate-900/45 rounded-xl p-2 border border-slate-900 text-center leading-none">
            <p className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider">MID</p>
            <p className="text-sm font-bold text-sky-400 font-display mt-1">{stats.midfield}</p>
          </div>
          <div className="bg-slate-900/45 rounded-xl p-2 border border-slate-900 text-center leading-none">
            <p className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider">DEF</p>
            <p className="text-sm font-bold text-rose-400 font-display mt-1">{stats.defence}</p>
          </div>
          <div className="bg-slate-900/45 rounded-xl p-2 border border-slate-900 text-center leading-none">
            <p className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider">CHEM</p>
            <p className="text-sm font-bold text-amber-400 font-display mt-1">{stats.chemistry}</p>
          </div>
        </div>

        {/* Connections Spotlight */}
        <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-900/80 mb-4 text-[10.5px] relative z-10 flex flex-col gap-2 shadow-inner">
          <div className="flex justify-between items-start leading-none">
            <span className="text-slate-500 font-semibold uppercase text-[8.5px] tracking-wide">Best Link:</span>
            <span className="text-slate-200 font-bold text-right truncate max-w-[210px] uppercase">
              {simResult.bestLink}
            </span>
          </div>
          <div className="flex justify-between items-start leading-none">
            <span className="text-slate-500 font-semibold uppercase text-[8.5px] tracking-wide">Worst Link:</span>
            <span className="text-slate-400 font-medium text-right truncate max-w-[210px] uppercase">
              {simResult.worstLink.replace('⚠️ ', '')}
            </span>
          </div>
        </div>

        {/* MVP and Weak Link */}
        <div className="flex gap-2.5 mb-4 relative z-10">
          <div className="flex-1 bg-slate-950/60 rounded-xl p-3 border border-emerald-500/10 flex flex-col justify-between h-[80px]">
            <div>
              <span className="text-[8px] font-bold text-emerald-450 uppercase tracking-widest block leading-none">⭐ Season MVP</span>
              <span className="text-sm font-display font-black text-foreground uppercase truncate block mt-1 leading-tight">
                {simResult.mvp.displayName}
              </span>
            </div>
            <span className="text-[8px] text-slate-500 font-bold mt-1 uppercase leading-none tracking-wider">
              {simResult.mvp.primaryPosition} • {simResult.mvp.rating} OVR • {simResult.mvp.club}
            </span>
          </div>

          <div className="flex-1 bg-slate-950/60 rounded-xl p-3 border border-rose-500/10 flex flex-col justify-between h-[80px]">
            <div>
              <span className="text-[8px] font-bold text-rose-400 uppercase tracking-widest block leading-none">⚠️ Weak Link</span>
              <span className="text-sm font-display font-black text-foreground uppercase truncate block mt-1 leading-tight">
                {simResult.weakLink.displayName}
              </span>
            </div>
            <span className="text-[8px] text-slate-500 font-bold mt-1 uppercase leading-none tracking-wider">
              {simResult.weakLink.primaryPosition} • {simResult.weakLink.rating} OVR • {simResult.weakLink.club}
            </span>
          </div>
        </div>

        {/* Roster XI Roster summary */}
        <div className="bg-slate-950/40 rounded-xl p-3.5 border border-slate-900/80 relative z-10 shadow-inner">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 leading-none">MY DRAFTED XI Roster</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] leading-tight">
            {selectedPlayers.map((player) => (
              <div key={player.id} className="flex justify-between items-center text-slate-400 border-b border-slate-900/40 pb-0.5">
                <span className="truncate max-w-[110px] font-semibold text-slate-350">
                  {player.displayName}
                </span>
                <span className="text-[8.5px] font-extrabold text-slate-500 uppercase font-display">
                  {player.primaryPosition}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Beat My Score Challenge Callout & Actions */}
      <div className="flex flex-col gap-3 w-full max-w-sm mt-1 px-4 sm:px-0">
        {/* Status Toast */}
        {feedbackMessage && (
          <div
            className="w-full py-2.5 px-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-400 font-display font-black text-xs uppercase tracking-wider text-center shadow-lg shadow-emerald-950/50 animate-card-deal"
            role="status"
          >
            ✓ {feedbackMessage}
          </div>
        )}

        {errorMessage && (
          <div
            className="w-full py-2.5 px-4 rounded-2xl bg-rose-950/90 border border-rose-500/40 text-rose-400 font-display font-black text-xs uppercase tracking-wider text-center shadow-lg shadow-rose-950/50 animate-card-deal"
            role="alert"
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Primary Action: Copy Challenge Link */}
        <button
          onClick={handleCopyChallengeLink}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 hover:-translate-y-0.5 transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>🎯</span> Copy Challenge Link ({simResult.wins} Wins)
        </button>

        {/* Secondary Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleShareResult}
            title="Share via native share menu or apps"
            className="py-3 px-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-display font-bold text-[11px] uppercase tracking-wider hover:bg-slate-800 transition-all duration-300 transform active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-1"
          >
            <span className="text-sm">📱</span>
            <span>Share App</span>
          </button>

          <button
            onClick={handleCopyText}
            title="Copy full campaign report with link"
            className="py-3 px-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-display font-bold text-[11px] uppercase tracking-wider hover:bg-slate-800 transition-all duration-300 transform active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-1"
          >
            <span className="text-sm">📋</span>
            <span>Copy Text</span>
          </button>

          <button
            onClick={handleDownloadImage}
            title="Download high-resolution 1080x1920 graphic"
            className="py-3 px-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-display font-bold text-[11px] uppercase tracking-wider hover:bg-slate-800 transition-all duration-300 transform active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-1"
          >
            <span className="text-sm">📥</span>
            <span>Graphic</span>
          </button>
        </div>
      </div>
    </div>
  );
};
