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

export interface InstantMatchSummaryModalProps {
  fixture: LeagueFixture | CupFixture;
  save: CareerSaveFile;
  onClose: () => void;
  onViewDetailedDossier: () => void;
  onNavigateTab?: (tab: 'table' | 'squad' | 'transfers' | 'fixtures' | 'cups' | 'overview') => void;
}

export function InstantMatchSummaryModal({
  fixture,
  save,
  onClose,
  onViewDetailedDossier,
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

  const allClubs = getClubsWithUserClub(save.club);
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
      aria-label="Instant Match Summary"
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-fade-in"
      onClick={onClose}
    >
      <div
        data-office-ui="true"
        className="office-floating-card rounded-3xl p-4 sm:p-5 max-w-md w-full space-y-3.5 shadow-2xl relative my-auto border border-indigo-100/80 motion-reduce:transition-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <header className="flex items-center justify-between border-b border-[var(--office-divider)] pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1d5eff] font-display truncate">
              ⚡ Match Result
            </span>
            {isUserMatch && (
              <span
                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 border ${
                  userWon
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isDraw
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {userWon ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="office-subcard w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)] transition-colors cursor-pointer shrink-0"
            title="Close"
            aria-label="Close modal"
          >
            ✕
          </button>
        </header>

        {/* Scoreboard Hero */}
        <article className="office-subcard rounded-2xl p-3 sm:p-4 space-y-2.5 border border-indigo-100/70 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/30">
          <div className="text-center text-[10px] font-mono text-[var(--office-text-muted)] font-semibold truncate">
            {competitionTitle} • {roundTitle}
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Home Club */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1 min-w-0">
              <div
                data-force-white="true"
                className="club-crest w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/60 shadow-md flex items-center justify-center text-xs sm:text-sm font-black text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${homeClub.primaryColor}, ${homeClub.secondaryColor})`,
                }}
              >
                {homeClub.shortName}
              </div>
              <div className="min-w-0 w-full">
                <h3 className="font-display font-extrabold text-xs text-[var(--office-text-primary)] truncate">
                  {getEffectiveClubName(homeClub, save.club)}
                </h3>
                <span className="text-[9px] uppercase font-bold text-[var(--office-text-muted)] block truncate">
                  {isUserHome ? '★ (YOU)' : 'Home'}
                </span>
              </div>
            </div>

            {/* Final Scoreline */}
            <div className="flex flex-col items-center justify-center shrink-0 px-2 space-y-1">
              <div className="bg-white border-2 border-indigo-200/80 px-3.5 py-1.5 rounded-2xl font-mono font-black text-2xl sm:text-3xl text-[var(--office-text-primary)] shadow-sm tracking-tight">
                {homeScore} - {awayScore}
              </div>
              {cupFixture?.penalties && (
                <span className="text-[10px] font-mono text-amber-600 font-bold">
                  ({cupFixture.penalties.homePenalties} - {cupFixture.penalties.awayPenalties} pens)
                </span>
              )}
              <span className="text-[9px] font-black uppercase tracking-wider text-[#1d5eff] bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full">
                Full Time
              </span>
            </div>

            {/* Away Club */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1 min-w-0">
              <div
                data-force-white="true"
                className="club-crest w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/60 shadow-md flex items-center justify-center text-xs sm:text-sm font-black text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${awayClub.primaryColor}, ${awayClub.secondaryColor})`,
                }}
              >
                {awayClub.shortName}
              </div>
              <div className="min-w-0 w-full">
                <h3 className="font-display font-extrabold text-xs text-[var(--office-text-primary)] truncate">
                  {getEffectiveClubName(awayClub, save.club)}
                </h3>
                <span className="text-[9px] uppercase font-bold text-[var(--office-text-muted)] block truncate">
                  {isUserAway ? '★ (YOU)' : 'Away'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--office-text-muted)] pt-1 border-t border-[var(--office-divider)]">
            <span className="truncate max-w-[180px]">🏟️ {venueDisplay}</span>
            <span>{formatCareerDate(fixture.date, save.settings.dateFormat, 'short')}</span>
          </div>
        </article>

        {/* Compact Goalscorers */}
        <section className="office-subcard rounded-2xl p-2.5 sm:p-3 space-y-1.5">
          <div className="text-[10px] font-black uppercase text-[var(--office-text-muted)] tracking-wider flex items-center gap-1.5">
            <span>⚽</span> Goalscorers
          </div>

          {homeScore + awayScore === 0 ? (
            <div className="text-center py-1.5 text-xs text-[var(--office-text-muted)] italic">
              Goalless draw — Stalemate at {venueDisplay.split(' ')[0]}.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs divide-x divide-[var(--office-divider)] pt-0.5">
              {/* Home Scorers */}
              <div className="space-y-1 pr-1.5">
                {homeScorers.length > 0 ? (
                  homeScorers.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-[11px] text-[var(--office-text-primary)]">
                      <span>⚽</span>
                      <span className="font-bold truncate">{s.name}</span>
                      <span className="text-[var(--office-text-muted)] text-[10px] shrink-0 font-mono">({s.minute}&apos;)</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[10px] text-[var(--office-text-muted)] italic">—</span>
                )}
              </div>

              {/* Away Scorers */}
              <div className="space-y-1 pl-2">
                {awayScorers.length > 0 ? (
                  awayScorers.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-[11px] text-[var(--office-text-primary)]">
                      <span>⚽</span>
                      <span className="font-bold truncate">{s.name}</span>
                      <span className="text-[var(--office-text-muted)] text-[10px] shrink-0 font-mono">({s.minute}&apos;)</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[10px] text-[var(--office-text-muted)] italic">—</span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Man of the Match Spotlight */}
        <section className="bg-gradient-to-r from-amber-50 via-amber-100/40 to-orange-50 border border-amber-200/80 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">⭐</span>
            <div className="min-w-0 flex items-center gap-1.5 truncate">
              <span className="text-[9px] font-black uppercase text-amber-700 shrink-0">MOTM:</span>
              <span className="font-display font-extrabold text-xs text-[var(--office-text-primary)] truncate">{motm.name}</span>
              <span className="text-[10px] text-[var(--office-text-muted)] truncate">({getEffectiveClubName(motmClub, save.club)})</span>
            </div>
          </div>
          <div className="bg-amber-500 text-white px-2 py-0.5 rounded-lg font-display font-black text-[10px] shrink-0 shadow-2xs">
            {motm.rating.toFixed(1)} ★
          </div>
        </section>

        {/* Navigation & Action Links */}
        <nav aria-label="Post-match actions" className="space-y-2 pt-0.5">
          <div className="flex gap-2">
            <button
              type="button"
              data-office-ui="true"
              onClick={onViewDetailedDossier}
              className="office-subcard flex-1 py-2 px-2.5 rounded-xl hover:bg-indigo-50/50 text-[var(--office-text-primary)] font-display font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span>📊 Full Dossier</span>
            </button>
            <button
              type="button"
              data-office-ui="true"
              onClick={() => handleNavigate('table')}
              className="office-subcard flex-1 py-2 px-2.5 rounded-xl hover:bg-indigo-50/50 text-[var(--office-text-primary)] font-display font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span>📈 Table</span>
            </button>
            <button
              type="button"
              data-office-ui="true"
              onClick={() => handleNavigate('squad')}
              className="office-subcard flex-1 py-2 px-2.5 rounded-xl hover:bg-indigo-50/50 text-[var(--office-text-primary)] font-display font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span>👥 Squad</span>
            </button>
          </div>

          {/* Primary Action Button: "Continue" */}
          <button
            type="button"
            data-office-ui="true"
            onClick={onClose}
            className="office-action-btn-primary w-full py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-colors"
          >
            <span>Continue</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
