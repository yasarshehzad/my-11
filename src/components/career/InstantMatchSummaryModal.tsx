'use client';

import React, { useEffect } from 'react';
import {
  LeagueFixture,
  CupFixture,
  CareerSaveFile,
  Club,
} from '../../career/types';
import { getEffectiveClubName, getClubsWithUserClub } from '../../career/clubs';
import { findAnyClub, CUP_IDS } from '../../career/cups';
import { formatCareerDate } from '../../career/formatters';
import { IconClose } from './GameIcons';
import { Button, Eyebrow, Tag } from '@/components/ui';

export interface InstantMatchSummaryModalProps {
  fixture: LeagueFixture | CupFixture;
  save: CareerSaveFile;
  onClose: () => void;
  onViewDetailedDossier: () => void;
  onAttendPressConference?: () => void;
  onNavigateTab?: (tab: 'table' | 'squad' | 'transfers' | 'fixtures' | 'cups' | 'overview') => void;
}

export function InstantMatchSummaryModal({
  fixture,
  save,
  onClose,
  onViewDetailedDossier,
  onAttendPressConference,
  onNavigateTab,
}: InstantMatchSummaryModalProps) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const allClubs = getClubsWithUserClub(save.club, save.activeLeagueClubIds, save.settings?.databaseSeason);
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));

  const homeClub = clubsMap.get(fixture.homeClubId) || findAnyClub(fixture.homeClubId) || allClubs[0];
  const awayClub = clubsMap.get(fixture.awayClubId) || findAnyClub(fixture.awayClubId) || allClubs[1];

  const isCup = 'competitionName' in fixture;
  const cupFixture = isCup ? (fixture as CupFixture) : null;
  const competitionTitle = cupFixture ? cupFixture.competitionName : 'English Top Flight';

  const isNeutralWembley =
    cupFixture &&
    (cupFixture.competitionId === CUP_IDS.SHIELD ||
      (cupFixture.roundName === 'Final' &&
        (cupFixture.competitionId === CUP_IDS.LEAGUE_CUP || cupFixture.competitionId === CUP_IDS.ENGLISH_CUP)) ||
      (cupFixture.roundName === 'Semi-Final' && cupFixture.competitionId === CUP_IDS.ENGLISH_CUP));

  const venueDisplay = isNeutralWembley
    ? 'Wembley Stadium (neutral)'
    : (homeClub.stadiumName || 'Stadium');

  const roundTitle = cupFixture ? cupFixture.roundName : `Matchday ${fixture.round} of 38`;

  const isUserHome = fixture.homeClubId === save.club.id;
  const isUserAway = fixture.awayClubId === save.club.id;
  const isUserMatch = isUserHome || isUserAway;

  const homeScore = fixture.homeScore ?? 0;
  const awayScore = fixture.awayScore ?? 0;

  const userWon =
    isUserMatch &&
    fixture.played &&
    ((isUserHome && homeScore > awayScore) ||
      (isUserAway && awayScore > homeScore) ||
      (cupFixture?.penalties
        ? (isUserHome && cupFixture.penalties.homePenalties > cupFixture.penalties.awayPenalties) ||
          (isUserAway && cupFixture.penalties.awayPenalties > cupFixture.penalties.homePenalties)
        : false));

  const isDraw =
    isUserMatch && fixture.played && homeScore === awayScore && !cupFixture?.penalties;

  const homeScorers = fixture.scorers?.filter((s) => s.clubId === homeClub.id) || [];
  const awayScorers = fixture.scorers?.filter((s) => s.clubId === awayClub.id) || [];

  const motm = fixture.manOfTheMatch || {
    name: fixture.scorers && fixture.scorers.length > 0 ? fixture.scorers[0].name : 'Star performer',
    clubId: fixture.scorers && fixture.scorers.length > 0 ? fixture.scorers[0].clubId : homeClub.id,
    rating: 8.4,
  };
  const motmClub = clubsMap.get(motm.clubId) || homeClub;

  const handleNavigate = (tab: 'table' | 'squad' | 'transfers' | 'fixtures' | 'cups' | 'overview') => {
    onClose();
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  const renderScorers = (list: typeof homeScorers) =>
    list.length > 0 ? (
      list.map((s, idx) => (
        <div key={idx} className="flex items-baseline gap-1 text-xs text-[var(--ink-primary)] min-w-0">
          <span className="font-medium truncate">{s.name}</span>
          <span className="text-[var(--ink-muted)] shrink-0 tabular-nums">{s.minute}&apos;</span>
        </div>
      ))
    ) : (
      <span className="text-xs text-[var(--ink-muted)]">—</span>
    );

  const renderSide = (club: Club, isUser: boolean, side: 'Home' | 'Away') => (
    <div className="flex-1 flex flex-col items-center text-center space-y-1 min-w-0">
      <div
        data-force-white="true"
        className="club-crest w-12 h-12 rounded-full border border-[var(--border-subtle)] flex items-center justify-center text-xs font-semibold text-white shrink-0"
        style={{
          background: `linear-gradient(135deg, ${club.primaryColor}, ${club.secondaryColor})`,
        }}
      >
        {club.shortName}
      </div>
      <div className="min-w-0 w-full">
        <h3 className="font-display font-semibold text-sm text-[var(--ink-primary)] line-clamp-2 leading-snug">
          {getEffectiveClubName(club, save.club)}
        </h3>
        <span className="text-xs text-[var(--ink-muted)] block">{isUser ? `You · ${side}` : side}</span>
      </div>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-scrim="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-fade-in motion-reduce:animate-none"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        data-office-ui="true"
        className="rounded-xl p-4 sm:p-5 max-w-md w-full space-y-4 shadow-sm relative my-auto max-h-[90dvh] overflow-y-auto border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--ink-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Eyebrow>
              {competitionTitle} · {roundTitle}
            </Eyebrow>
            <div className="flex items-center gap-2 mt-0.5">
              <h2 className="font-display font-semibold text-base text-[var(--ink-primary)]">Match result</h2>
              {isUserMatch && (
                <Tag tone={userWon ? 'success' : isDraw ? 'warning' : 'danger'}>
                  {userWon ? 'Victory' : isDraw ? 'Draw' : 'Defeat'}
                </Tag>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 -mr-2 -mt-2 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
            aria-label="Close modal"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </header>

        {/* Scoreboard */}
        <article className="rounded-xl p-4 space-y-3 border border-[var(--border-subtle)] bg-[var(--surface-subcard)]">
          <div className="flex items-start justify-between gap-3">
            {renderSide(homeClub, isUserHome, 'Home')}

            <div className="flex flex-col items-center justify-center shrink-0 px-1 pt-1.5">
              <div className="font-display font-bold text-3xl text-[var(--ink-primary)] tabular-nums tracking-tight">
                {homeScore} - {awayScore}
              </div>
              {cupFixture?.penalties && (
                <span className="text-xs text-[var(--ink-secondary)] tabular-nums">
                  ({cupFixture.penalties.homePenalties} - {cupFixture.penalties.awayPenalties} pens)
                </span>
              )}
              <span className="text-xs text-[var(--ink-muted)]">Full time</span>
            </div>

            {renderSide(awayClub, isUserAway, 'Away')}
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--ink-muted)] pt-2 border-t border-[var(--border-subtle)] gap-2">
            <span className="truncate min-w-0">{venueDisplay}</span>
            <span className="shrink-0">{formatCareerDate(fixture.date, save.settings.dateFormat, 'short')}</span>
          </div>
        </article>

        {/* Goalscorers */}
        <section className="space-y-1.5">
          <h3 className="text-xs font-medium text-[var(--ink-muted)]">Goalscorers</h3>
          {homeScore + awayScore === 0 ? (
            <p className="text-xs text-[var(--ink-secondary)]">No goals.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 min-w-0">{renderScorers(homeScorers)}</div>
              <div className="space-y-1 min-w-0">{renderScorers(awayScorers)}</div>
            </div>
          )}
        </section>

        {/* Man of the match */}
        <section className="border-t border-[var(--border-subtle)] pt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-medium text-[var(--ink-muted)] block">Man of the match</span>
            <span className="text-sm text-[var(--ink-primary)] block truncate">
              <span className="font-semibold">{motm.name}</span>
              <span className="text-[var(--ink-muted)]"> · {getEffectiveClubName(motmClub, save.club)}</span>
            </span>
          </div>
          <span className="font-display font-semibold text-base text-[var(--ink-primary)] tabular-nums shrink-0">
            {motm.rating.toFixed(1)}
          </span>
        </section>

        {/* Post-match actions */}
        <nav aria-label="Post-match actions" className="space-y-2">
          <Button variant="primary" fullWidth data-office-ui="true" onClick={onClose}>
            Continue
          </Button>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" data-office-ui="true" onClick={onViewDetailedDossier}>
              Full stats
            </Button>
            {onAttendPressConference && (
              <Button variant="secondary" className="flex-1" data-office-ui="true" onClick={onAttendPressConference}>
                Press conference
              </Button>
            )}
          </div>

          <div className="flex items-center justify-center gap-1 text-xs text-[var(--ink-muted)]">
            <span>More:</span>
            <Button variant="ghost" size="sm" onClick={() => handleNavigate('table')}>
              Table
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleNavigate('squad')}>
              Squad
            </Button>
          </div>
        </nav>
      </div>
    </div>
  );
}
