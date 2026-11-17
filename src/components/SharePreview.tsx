import React, { useState, useEffect } from 'react';
import { FormationType, Player, SimulationResult } from '../types/game';
import { toPng } from 'html-to-image';
import {
  generateChallengeUrl,
  generateChallengeShareText,
  generateH2HChallengeUrl,
} from '../utils/challengeUrl';
import {
  logResultShared,
  logShareCardDownloaded,
  logShareOpened,
  logNativeShareTriggered,
  logChallengeLinkCopied,
} from '../utils/analytics';
import {
  IconTrophy,
  IconMedal,
  IconCheck,
  IconClose,
  IconStar,
  IconAlert,
} from './career/GameIcons';

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
      formation: formation as FormationType,
      leagueId: simResult.selectedLeague || 'english',
    });
  }, [simResult.wins, simResult.points, simResult.draftModifier, formation, simResult.selectedLeague]);

  const h2hChallengeUrl = React.useMemo(() => {
    return generateH2HChallengeUrl({
      managerName: 'Friend',
      clubName: `${formation} Draft XI`,
      formation: formation as FormationType,
      leagueId: simResult.selectedLeague || 'english',
      draftMode: simResult.draftModifier || 'classic',
      playerIds: selectedPlayers.slice(0, 11).map((p) => p.id),
      overall: stats.overall,
      chemistry: stats.chemistry,
      seasonWins: simResult.wins,
      seasonPoints: simResult.points,
    });
  }, [formation, selectedPlayers, stats.overall, stats.chemistry, simResult.selectedLeague, simResult.draftModifier, simResult.wins, simResult.points]);

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

  // Helper: Copy Head-to-Head Squad Battle link
  const handleCopyH2HLink = async () => {
    try {
      await navigator.clipboard.writeText(h2hChallengeUrl);
      logChallengeLinkCopied(simResult.wins, simResult.points);
      setFeedbackMessage('Copied H2H link. Send it to a friend.');
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch {
      setErrorMessage('Could not copy H2H link to clipboard.');
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
      } catch (error: unknown) {
        if (!(error instanceof Error) || error.name !== 'AbortError') {
          await handleCopyChallengeLink();
        }
      }
    } else {
      // Fallback: Copy challenge link to clipboard
      await handleCopyChallengeLink();
    }
  };

  const getFinishLabel = (pos: number) => {
    if (pos === 1) return 'Champions';
    if (pos <= 4) return 'Champions League';
    if (pos <= 7) return 'Europa League';
    return 'Mid table';
  };

  const modeLabel = isDailyChallenge
    ? dailyChallengeTitle
    : simResult.draftModifier === 'quick'
    ? 'Quick draft'
    : simResult.draftModifier === 'mystery'
    ? 'Mystery draft'
    : 'Classic draft';

  const secondaryBtn =
    'min-h-[40px] px-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-display font-bold text-[11px] uppercase tracking-wide cursor-pointer active:scale-95';

  return (
    <div className="w-full flex flex-col gap-3 select-none relative z-10">
      {/* Loading Overlay when generating image */}
      {generating && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent motion-safe:animate-spin mb-4" />
          <h3 className="text-lg font-display font-black text-white uppercase tracking-wider">Creating image...</h3>
        </div>
      )}

      {/* Share card preview: headline result, key stats, the XI */}
      <div id="share-card-container" className="w-full office-subcard rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center gap-2">
          <span className="text-[11px] font-bold text-slate-600 truncate">
            {modeLabel} · {formation}
          </span>
          {isDailyChallenge ? (
            <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wider font-display leading-none shrink-0 ${
              dailyChallengeBeaten ? 'bg-blue-50 text-blue-800 border-blue-300' : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}>
              {dailyChallengeBeaten ? <IconCheck className="w-3 h-3 shrink-0" /> : <IconClose className="w-3 h-3 shrink-0" />}
              <span>{dailyChallengeBeaten ? 'Cleared' : 'Failed'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-900 uppercase tracking-wider leading-none font-display shrink-0">
              {simResult.leaguePosition === 1 ? <IconTrophy className="w-3 h-3 shrink-0" /> : <IconMedal className="w-3 h-3 shrink-0" />}
              <span>{getFinishLabel(simResult.leaguePosition)}</span>
            </span>
          )}
        </div>

        <div>
          <p className="text-3xl font-display font-black text-[#0b1536] leading-none tracking-tight">
            {simResult.wins}W - {simResult.draws}D - {simResult.losses}L
          </p>
          <p className="text-xs text-slate-600 font-semibold mt-1.5">
            {simResult.points} pts · top {simResult.percentile}% · {stats.overall} OVR · chem {simResult.chemistryGrade}
          </p>
        </div>

        <p className="text-xs text-slate-700 font-semibold flex items-center gap-1.5 pt-2 border-t border-[var(--office-divider)]">
          <IconStar className="w-3.5 h-3.5 text-amber-500 shrink-0" filled />
          <span className="truncate">
            MVP {simResult.mvp.displayName} ({simResult.mvp.rating})
          </span>
        </p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] leading-tight">
          {selectedPlayers.map((player) => (
            <div key={player.id} className="flex justify-between items-center gap-2 min-w-0">
              <span className="truncate font-semibold text-slate-800">{player.displayName}</span>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase font-display shrink-0">
                {player.primaryPosition}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Status messages */}
      {feedbackMessage && (
        <div
          className="w-full py-2 px-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 font-bold text-xs text-center inline-flex items-center justify-center gap-1.5"
          role="status"
        >
          <IconCheck className="w-3.5 h-3.5 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          className="w-full py-2 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs text-center inline-flex items-center justify-center gap-1.5"
          role="alert"
        >
          <IconAlert className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Primary action */}
      <button
        type="button"
        onClick={handleCopyChallengeLink}
        className="office-play-match-btn w-full min-h-[44px] px-5 rounded-2xl text-white font-display font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
      >
        Copy Challenge Link
      </button>

      {/* Secondary actions */}
      <div className={`grid gap-2 ${selectedPlayers.length === 11 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {selectedPlayers.length === 11 && (
          <button type="button" onClick={handleCopyH2HLink} title="Copy a head-to-head match link for a friend" className={secondaryBtn}>
            H2H Link
          </button>
        )}
        <button type="button" onClick={handleShareResult} title="Share via your device's share menu" className={secondaryBtn}>
          Share
        </button>
        <button type="button" onClick={handleCopyText} title="Copy result summary with link" className={secondaryBtn}>
          Copy Text
        </button>
        <button type="button" onClick={handleDownloadImage} title="Download 1080x1920 image" className={secondaryBtn}>
          Image
        </button>
      </div>
    </div>
  );
};
