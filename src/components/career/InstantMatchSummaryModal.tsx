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
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-5 max-w-md w-full space-y-3.5 shadow-2xl relative my-auto motion-reduce:transition-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <header className="flex items-center justify-between border-b border-slate-850 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 font-display truncate">
              ⚡ Match Result
            </span>
            {isUserMatch && (
              <span
                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                  userWon
                    ? 'bg-emerald-500 text-slate-950'
                    : isDraw
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {userWon ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs shrink-0"
            title="Close"
            aria-label="Close modal"
          >
            ✕
          </button>
        </header>

        {/* Scoreboard Hero */}
        <article className="bg-slate-900/80 border border-slate-850 rounded-2xl p-3 sm:p-4 space-y-2 shadow-inner">
          <div className="text-center text-[10px] font-mono text-slate-400 font-medium truncate">
            {competitionTitle} • {roundTitle}
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Home Club */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1 min-w-0">
              <div
                data-force-white="true"
                className="club-crest w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/20 shadow-md flex items-center justify-center text-xs sm:text-sm font-black text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${homeClub.primaryColor}, ${homeClub.secondaryColor})`,
                }}
              >
                {homeClub.shortName}
              </div>
              <div className="min-w-0 w-full">
                <h3 className="font-display font-black text-xs text-white truncate">
                  {getEffectiveClubName(homeClub, save.club)}
                </h3>
                <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                  {isUserHome ? '★ (YOU)' : 'Home'}
                </span>
              </div>
            </div>

            {/* Final Scoreline */}
            <div className="flex flex-col items-center justify-center shrink-0 px-2 space-y-1">
              <div className="bg-slate-950 border border-slate-700 px-3.5 py-1.5 rounded-2xl font-mono font-black text-2xl sm:text-3xl text-foreground shadow-xl tracking-tight">
                {homeScore} - {awayScore}
              </div>
              {cupFixture?.penalties && (
                <span className="text-[10px] font-mono text-amber-400 font-bold">
                  ({cupFixture.penalties.homePenalties} - {cupFixture.penalties.awayPenalties} pens)
                </span>
              )}
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-950/70 border border-slate-800/80 px-2 py-0.5 rounded-full">
                Full Time
              </span>
            </div>

            {/* Away Club */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1 min-w-0">
              <div
                data-force-white="true"
                className="club-crest w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/20 shadow-md flex items-center justify-center text-xs sm:text-sm font-black text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${awayClub.primaryColor}, ${awayClub.secondaryColor})`,
                }}
              >
                {awayClub.shortName}
              </div>
              <div className="min-w-0 w-full">
                <h3 className="font-display font-black text-xs text-white truncate">
                  {getEffectiveClubName(awayClub, save.club)}
                </h3>
                <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                  {isUserAway ? '★ (YOU)' : 'Away'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
            <span className="truncate max-w-[180px]">🏟️ {venueDisplay}</span>
            <span>{formatCareerDate(fixture.date, save.settings.dateFormat, 'short')}</span>
          </div>
        </article>

        {/* Compact Goalscorers */}
        <section className="bg-slate-900/50 border border-slate-850 rounded-2xl p-2.5 sm:p-3 space-y-1.5">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <span>⚽</span> Goalscorers
          </div>

          {homeScore + awayScore === 0 ? (
            <div className="text-center py-1.5 text-xs text-slate-400 italic">
              Goalless draw — Stalemate at {venueDisplay.split(' ')[0]}.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs divide-x divide-slate-800/80 pt-0.5">
              {/* Home Scorers */}
              <div className="space-y-1 pr-1.5 max-h-20 overflow-y-auto scrollbar-none">
                {homeScorers.length > 0 ? (
                  homeScorers.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-[11px] text-slate-200">
                      <span>⚽</span>
                      <span className="font-semibold truncate">{s.name}</span>
                      <span className="text-slate-400 text-[10px] shrink-0 font-mono">({s.minute}&apos;)</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-500 italic">—</span>
                )}
              </div>

              {/* Away Scorers */}
              <div className="space-y-1 pl-2 max-h-20 overflow-y-auto scrollbar-none">
                {awayScorers.length > 0 ? (
                  awayScorers.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-[11px] text-slate-200">
                      <span>⚽</span>
                      <span className="font-semibold truncate">{s.name}</span>
                      <span className="text-slate-400 text-[10px] shrink-0 font-mono">({s.minute}&apos;)</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-500 italic">—</span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Man of the Match Pill */}
        <section className="bg-amber-950/20 border border-amber-500/30 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">⭐</span>
            <div className="min-w-0 flex items-center gap-1.5 truncate">
              <span className="text-[9px] font-black uppercase text-amber-400 shrink-0">MOTM:</span>
              <span className="font-display font-black text-xs text-white truncate">{motm.name}</span>
              <span className="text-[10px] text-slate-400 truncate">({getEffectiveClubName(motmClub, save.club)})</span>
            </div>
          </div>
          <div className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-lg font-display font-black text-[10px] shrink-0 shadow-sm">
            {motm.rating.toFixed(1)} ★
          </div>
        </section>

        {/* Navigation & Action Links */}
        <nav aria-label="Post-match actions" className="space-y-2 pt-0.5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onViewDetailedDossier}
              className="flex-1 py-2 px-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-200 font-display font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span>📊 Full Dossier</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('table')}
              className="flex-1 py-2 px-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-200 font-display font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span>📈 Table</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('squad')}
              className="flex-1 py-2 px-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-200 font-display font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span>👥 Squad</span>
            </button>
          </div>

          {/* Primary Action Button: "Close" */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-750 hover:bg-slate-850 hover:border-slate-700 text-white font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-colors"
          >
            <span>Close</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
