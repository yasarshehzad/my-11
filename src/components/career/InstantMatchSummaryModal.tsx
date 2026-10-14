'use client';

import React, { useEffect } from 'react';
import {
  LeagueFixture,
  CupFixture,
  CareerSaveFile,
  Club,
  MatchStats,
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

  const userLost =
    isUserMatch &&
    fixture.played &&
    !userWon &&
    !isDraw;

  const stats: MatchStats = fixture.stats || {
    homePossession: 50,
    awayPossession: 50,
    homeShots: homeScore + 7,
    awayShots: awayScore + 6,
    homeShotsOnTarget: homeScore + 3,
    awayShotsOnTarget: awayScore + 3,
    homeFouls: 9,
    awayFouls: 11,
    homeCorners: 5,
    awayCorners: 4,
  };

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
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-7 max-w-xl w-full space-y-5 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto scrollbar-none motion-reduce:transition-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <header className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 font-display">
                ⚡ Instant Match Result
              </span>
              {isUserMatch && (
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
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
            <h2 className="text-sm sm:text-base font-display font-black text-white uppercase tracking-tight">
              {competitionTitle} • {roundTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
            title="Close"
            aria-label="Close modal"
          >
            ✕
          </button>
        </header>

        {/* Scoreboard Hero Banner */}
        <article className="bg-slate-900/80 border border-slate-850 rounded-2xl p-4 sm:p-5 space-y-3 shadow-inner">
          <div className="flex items-center justify-between gap-3 sm:gap-6">
            {/* Home Club */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1.5 min-w-0">
              <div
                data-force-white="true"
                className="club-crest w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/20 shadow-lg flex items-center justify-center text-xs sm:text-sm font-black text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${homeClub.primaryColor}, ${homeClub.secondaryColor})`,
                }}
              >
                {homeClub.shortName}
              </div>
              <div className="min-w-0 w-full">
                <h3 className="font-display font-black text-xs sm:text-sm text-white truncate">
                  {getEffectiveClubName(homeClub, save.club)}
                </h3>
                <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                  {isUserHome ? '★ (YOU • HOME)' : 'Home'}
                </span>
              </div>
            </div>

            {/* Final Scoreline */}
            <div className="flex flex-col items-center justify-center shrink-0 px-2 space-y-1">
              <div className="bg-slate-950 border border-slate-700 px-4 py-2 rounded-2xl font-mono font-black text-2xl sm:text-3xl text-emerald-400 shadow-xl tracking-tight">
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
              <span className="text-[10px] text-slate-400 font-medium truncate max-w-[130px] sm:max-w-[170px] text-center pt-0.5">
                🏟️ {venueDisplay}
              </span>
            </div>

            {/* Away Club */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1.5 min-w-0">
              <div
                data-force-white="true"
                className="club-crest w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/20 shadow-lg flex items-center justify-center text-xs sm:text-sm font-black text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${awayClub.primaryColor}, ${awayClub.secondaryColor})`,
                }}
              >
                {awayClub.shortName}
              </div>
              <div className="min-w-0 w-full">
                <h3 className="font-display font-black text-xs sm:text-sm text-white truncate">
                  {getEffectiveClubName(awayClub, save.club)}
                </h3>
                <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                  {isUserAway ? '★ (YOU • AWAY)' : 'Away'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-800/60">
            {formatCareerDate(fixture.date, save.settings.dateFormat, 'long')}
          </div>
        </article>

        {/* Goalscorers & Key Events */}
        <section className="bg-slate-900/50 border border-slate-850 rounded-2xl p-4 space-y-2">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <span>⚽</span> Goalscorers & Match Events
          </div>

          {homeScore + awayScore === 0 ? (
            <div className="text-center py-2.5 text-xs text-slate-400 italic">
              Goalless draw — Defenses stood firm at both ends.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-xs divide-x divide-slate-800/80 pt-1">
              {/* Home Scorers */}
              <div className="space-y-1.5 pr-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">
                  {getEffectiveClubName(homeClub, save.club)} ({homeScorers.length})
                </span>
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
              <div className="space-y-1.5 pl-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">
                  {getEffectiveClubName(awayClub, save.club)} ({awayScorers.length})
                </span>
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

        {/* Man of the Match Spotlight */}
        <section className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl">⭐</span>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider block">
                Player of the Match
              </span>
              <span className="font-display font-black text-sm text-white truncate block">
                {motm.name}
              </span>
              <span className="text-[10px] text-slate-400 truncate block">
                {getEffectiveClubName(motmClub, save.club)}
              </span>
            </div>
          </div>
          <div className="bg-amber-500 text-slate-950 px-2.5 py-1 rounded-xl font-display font-black text-xs shadow-md shrink-0">
            {motm.rating.toFixed(1)} ★
          </div>
        </section>

        {/* Match Key Stats Quick-Pulse */}
        <section className="bg-slate-900/40 border border-slate-850 rounded-2xl p-3.5 space-y-3">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
            <span>📊 Match Pulse</span>
            <span className="text-[9px] text-slate-500 font-mono">Quick Stats</span>
          </div>

          {/* Possession Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono font-bold">
              <span className="text-emerald-400">{stats.homePossession}%</span>
              <span className="text-[10px] font-sans uppercase font-bold text-slate-400">Possession</span>
              <span className="text-blue-400">{stats.awayPossession}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${stats.homePossession}%` }}
              />
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${stats.awayPossession}%` }}
              />
            </div>
          </div>

          {/* Quick Stat Tiles */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850">
              <div className="text-[9px] uppercase font-bold text-slate-400">Shots</div>
              <div className="font-mono font-black text-xs text-slate-100">{stats.homeShots} - {stats.awayShots}</div>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850">
              <div className="text-[9px] uppercase font-bold text-slate-400">On Target</div>
              <div className="font-mono font-black text-xs text-emerald-400">{stats.homeShotsOnTarget} - {stats.awayShotsOnTarget}</div>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850">
              <div className="text-[9px] uppercase font-bold text-slate-400">Corners</div>
              <div className="font-mono font-black text-xs text-slate-100">{stats.homeCorners} - {stats.awayCorners}</div>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-850">
              <div className="text-[9px] uppercase font-bold text-slate-400">Fouls</div>
              <div className="font-mono font-black text-xs text-slate-100">{stats.homeFouls} - {stats.awayFouls}</div>
            </div>
          </div>
        </section>

        {/* Navigation & Action Links (Clickable links to different places as requested) */}
        <nav aria-label="Post-match actions" className="space-y-2 pt-1">
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <button
              type="button"
              onClick={onViewDetailedDossier}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-200 font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>📊 Full Match Dossier</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('table')}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-200 font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>📈 League Table</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('squad')}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-200 font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>👥 Squad & Form</span>
            </button>
          </div>

          {/* Primary Continue Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 cursor-pointer"
          >
            <span>Continue Season ➔</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
