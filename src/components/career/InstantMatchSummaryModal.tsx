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
import {
  IconBall,
  IconBarChart,
  IconBolt,
  IconClose,
  IconMegaphone,
  IconStadium,
  IconStar,
  IconTrendingUp,
  IconUsers,
} from './GameIcons';

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
    ? 'Wembley Stadium (Neutral)'
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
    name: fixture.scorers && fixture.scorers.length > 0 ? fixture.scorers[0].name : 'Star Performer',
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-scrim="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-fade-in motion-reduce:animate-none"
      style={{
        backgroundColor: 'rgba(11, 21, 54, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <div
        data-office-ui="true"
        className="office-floating-card rounded-3xl p-4 sm:p-5 max-w-md w-full space-y-3.5 shadow-2xl relative my-auto max-h-[90dvh] overflow-y-auto border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 motion-reduce:transition-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#0f3eb5] dark:text-blue-400 font-display truncate inline-flex items-center gap-1">
              <IconBolt className="w-3.5 h-3.5 shrink-0" />
              <span>Match Result</span>
            </span>
            {isUserMatch && (
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shrink-0 border ${
                  userWon
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                    : isDraw
                    ? 'bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                    : 'bg-rose-100 text-rose-950 border-rose-400 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700'
                }`}
              >
                {userWon ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
            aria-label="Close modal"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </header>

        {/* Scoreboard Hero */}
        <article className="rounded-2xl p-3.5 sm:p-4 space-y-2.5 border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-850 dark:via-slate-900 dark:to-slate-850 shadow-xs">
          <div className="text-center text-[11px] font-mono text-slate-700 dark:text-slate-300 font-bold truncate">
            {competitionTitle} • {roundTitle}
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Home Club */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1 min-w-0">
              <div
                data-force-white="true"
                className="club-crest w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/80 shadow-md flex items-center justify-center text-xs sm:text-sm font-black text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${homeClub.primaryColor}, ${homeClub.secondaryColor})`,
                }}
              >
                {homeClub.shortName}
              </div>
              <div className="min-w-0 w-full">
                <h3 className="font-display font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {getEffectiveClubName(homeClub, save.club)}
                </h3>
                <span className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 inline-flex items-center justify-center gap-0.5 truncate mt-0.5">
                  {isUserHome ? (
                    <>
                      <IconStar className="w-2.5 h-2.5 text-amber-500" filled />
                      <span>YOU</span>
                    </>
                  ) : (
                    'Home'
                  )}
                </span>
              </div>
            </div>

            {/* Final Scoreline */}
            <div className="flex flex-col items-center justify-center shrink-0 px-2 space-y-1">
              <div className="bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 px-4 py-1.5 rounded-2xl font-mono font-black text-2xl sm:text-3xl text-slate-950 dark:text-white shadow-sm tracking-tight">
                {homeScore} - {awayScore}
              </div>
              {cupFixture?.penalties && (
                <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300 font-black">
                  ({cupFixture.penalties.homePenalties} - {cupFixture.penalties.awayPenalties} pens)
                </span>
              )}
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-2.5 py-0.5 rounded-full">
                Full Time
              </span>
            </div>

            {/* Away Club */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1 min-w-0">
              <div
                data-force-white="true"
                className="club-crest w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/80 shadow-md flex items-center justify-center text-xs sm:text-sm font-black text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${awayClub.primaryColor}, ${awayClub.secondaryColor})`,
                }}
              >
                {awayClub.shortName}
              </div>
              <div className="min-w-0 w-full">
                <h3 className="font-display font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {getEffectiveClubName(awayClub, save.club)}
                </h3>
                <span className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 inline-flex items-center justify-center gap-0.5 truncate mt-0.5">
                  {isUserAway ? (
                    <>
                      <IconStar className="w-2.5 h-2.5 text-amber-500" filled />
                      <span>YOU</span>
                    </>
                  ) : (
                    'Away'
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 pt-1.5 border-t border-slate-200 dark:border-slate-700 gap-2">
            <span className="truncate inline-flex items-center gap-1 min-w-0">
              <IconStadium className="w-3.5 h-3.5 shrink-0 text-slate-500" />
              <span className="truncate">{venueDisplay}</span>
            </span>
            <span className="shrink-0">{formatCareerDate(fixture.date, save.settings.dateFormat, 'short')}</span>
          </div>
        </article>

        {/* Compact Goalscorers */}
        <section className="rounded-2xl p-2.5 sm:p-3 space-y-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
            <IconBall className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Goalscorers</span>
          </div>

          {homeScore + awayScore === 0 ? (
            <div className="text-center py-1.5 text-xs text-slate-600 dark:text-slate-400 italic font-medium">
              No goals.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs divide-x divide-slate-200 dark:divide-slate-700 pt-0.5">
              {/* Home Scorers */}
              <div className="space-y-1 pr-1.5 min-w-0">
                {homeScorers.length > 0 ? (
                  homeScorers.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-[11px] text-slate-900 dark:text-slate-100">
                      <IconBall className="w-3 h-3 shrink-0 text-slate-600 dark:text-slate-300" />
                      <span className="font-extrabold text-slate-950 dark:text-white truncate">{s.name}</span>
                      <span className="text-slate-600 dark:text-slate-400 text-[10px] shrink-0 font-mono font-bold">({s.minute}&apos;)</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 italic">—</span>
                )}
              </div>

              {/* Away Scorers */}
              <div className="space-y-1 pl-2 min-w-0">
                {awayScorers.length > 0 ? (
                  awayScorers.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-[11px] text-slate-900 dark:text-slate-100">
                      <IconBall className="w-3 h-3 shrink-0 text-slate-600 dark:text-slate-300" />
                      <span className="font-extrabold text-slate-950 dark:text-white truncate">{s.name}</span>
                      <span className="text-slate-600 dark:text-slate-400 text-[10px] shrink-0 font-mono font-bold">({s.minute}&apos;)</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 italic">—</span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Man of the Match Spotlight */}
        <section className="bg-gradient-to-r from-amber-50 via-amber-100/50 to-orange-50 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-orange-950/40 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <IconStar className="w-4 h-4 shrink-0 text-amber-500" filled />
            <div className="min-w-0 flex items-center gap-1.5 truncate">
              <span className="text-[10px] font-black uppercase text-amber-950 dark:text-amber-200 shrink-0">MOTM:</span>
              <span className="font-display font-black text-xs text-slate-950 dark:text-white truncate">{motm.name}</span>
              <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold truncate">({getEffectiveClubName(motmClub, save.club)})</span>
            </div>
          </div>
          <div className="bg-amber-600 text-white px-2.5 py-0.5 rounded-lg font-display font-black text-[11px] shrink-0 shadow-xs inline-flex items-center gap-1">
            <span>{motm.rating.toFixed(1)}</span>
            <IconStar className="w-3 h-3" filled />
          </div>
        </section>

        {/* Post-match actions: one primary, up to two secondary, a small "More" row */}
        <nav aria-label="Post-match actions" className="space-y-2 pt-0.5">
          <div className="flex gap-2">
            <button
              type="button"
              data-office-ui="true"
              onClick={onViewDetailedDossier}
              className="flex-1 min-h-10 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-display font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-[0.98] cursor-pointer motion-reduce:transition-none"
            >
              <IconBarChart className="w-3.5 h-3.5 shrink-0" />
              <span>Full Stats</span>
            </button>
            {onAttendPressConference && (
              <button
                type="button"
                data-office-ui="true"
                onClick={onAttendPressConference}
                className="flex-1 min-h-10 px-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 font-display font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer motion-reduce:transition-none"
              >
                <IconMegaphone className="w-3.5 h-3.5 shrink-0" />
                <span>Press Conference</span>
              </button>
            )}
          </div>

          <button
            type="button"
            data-office-ui="true"
            onClick={onClose}
            className="office-action-btn-primary w-full py-3 px-4 rounded-xl font-display font-black text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-[0.99] motion-reduce:transition-none"
          >
            <span>Continue</span>
          </button>

          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
            <span>More:</span>
            <button
              type="button"
              onClick={() => handleNavigate('table')}
              className="min-h-9 px-2 font-bold text-[#0f3eb5] dark:text-blue-400 underline underline-offset-2 cursor-pointer inline-flex items-center gap-1"
            >
              <IconTrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('squad')}
              className="min-h-9 px-2 font-bold text-[#0f3eb5] dark:text-blue-400 underline underline-offset-2 cursor-pointer inline-flex items-center gap-1"
            >
              <IconUsers className="w-3.5 h-3.5 shrink-0" />
              <span>Squad</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
