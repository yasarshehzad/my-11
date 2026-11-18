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
import { Button } from '@/components/ui';
import { IconCheck, IconAlert } from './career/GameIcons';

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
      setFeedbackMessage('Challenge link copied.');
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
      setFeedbackMessage('Head-to-head link copied. Send it to a friend.');
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch {
      setErrorMessage('Could not copy the head-to-head link.');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  // Helper: Copy formatted challenge text with link
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      logChallengeLinkCopied(simResult.wins, simResult.points);
      setFeedbackMessage('Summary and link copied.');
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
      setFeedbackMessage('Image downloaded.');
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (error) {
      console.error('Failed to generate image', error);
      setErrorMessage('Could not create the image. Try copying the challenge link instead.');
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
          title: `Beat my score on MY-11 (${simResult.wins} wins)`,
          text: shareText,
          url: challengeUrl,
        });
        setFeedbackMessage('Shared.');
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
    return 'Mid-table';
  };

  const modeLabel = isDailyChallenge
    ? dailyChallengeTitle
    : simResult.draftModifier === 'quick'
    ? 'Quick draft'
    : simResult.draftModifier === 'mystery'
    ? 'Mystery draft'
    : 'Classic draft';

  const resultLabel = isDailyChallenge
    ? dailyChallengeBeaten
      ? 'Challenge cleared'
      : 'Challenge failed'
    : getFinishLabel(simResult.leaguePosition);

  return (
    <div className="w-full flex flex-col gap-3 select-none relative z-10">
      {/* Loading Overlay when generating image */}
      {generating && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-white/80 border-t-transparent motion-safe:animate-spin mb-4" />
          <h3 className="text-lg font-display font-semibold text-white">Creating image...</h3>
        </div>
      )}

      {/* Share card preview: headline result, key stats, the XI */}
      <div id="share-card-container" className="w-full rounded-xl bg-[var(--surface-subcard)] border border-[var(--border-subtle)] p-4 space-y-3">
        <p className="text-xs text-[var(--ink-secondary)]">
          {modeLabel} · {formation} · {resultLabel}
        </p>

        <div>
          <p className="text-3xl font-display font-bold text-[var(--ink-primary)] leading-none tabular-nums">
            {simResult.wins}W - {simResult.draws}D - {simResult.losses}L
          </p>
          <p className="text-xs text-[var(--ink-secondary)] mt-1.5">
            {simResult.points} pts · top {simResult.percentile}% · {stats.overall} OVR · chem {simResult.chemistryGrade}
          </p>
        </div>

        <p className="text-xs text-[var(--ink-secondary)] pt-2 border-t border-[var(--border-subtle)] truncate">
          MVP <span className="font-semibold text-[var(--ink-primary)]">{simResult.mvp.displayName}</span> ({simResult.mvp.rating})
        </p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {selectedPlayers.map((player) => (
            <div key={player.id} className="flex justify-between items-center gap-2 min-w-0">
              <span className="truncate text-[var(--ink-primary)]">{player.displayName}</span>
              <span className="text-xs text-[var(--ink-muted)] shrink-0">
                {player.primaryPosition}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Status messages */}
      {feedbackMessage && (
        <div
          className="w-full text-emerald-800 font-medium text-sm text-center inline-flex items-center justify-center gap-1.5"
          role="status"
        >
          <IconCheck className="w-3.5 h-3.5 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          className="w-full text-rose-800 font-medium text-sm text-center inline-flex items-center justify-center gap-1.5"
          role="alert"
        >
          <IconAlert className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Primary action */}
      <Button variant="primary" fullWidth onClick={handleCopyChallengeLink} className="min-h-11">
        Copy challenge link
      </Button>

      {/* Secondary actions */}
      <div className={`grid gap-2 ${selectedPlayers.length === 11 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {selectedPlayers.length === 11 && (
          <Button variant="secondary" onClick={handleCopyH2HLink} title="Copy a head-to-head match link for a friend" className="px-1 text-xs">
            H2H link
          </Button>
        )}
        <Button variant="secondary" onClick={handleShareResult} title="Share via your device's share menu" className="px-1 text-xs">
          Share
        </Button>
        <Button variant="secondary" onClick={handleCopyText} title="Copy result summary with link" className="px-1 text-xs">
          Copy text
        </Button>
        <Button variant="secondary" onClick={handleDownloadImage} title="Download 1080x1920 image" className="px-1 text-xs">
          Image
        </Button>
      </div>
    </div>
  );
};
