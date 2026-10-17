'use client';

import React from 'react';
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

export interface MatchOverviewModalProps {
  type: 'result' | 'preview';
  fixture: LeagueFixture | CupFixture;
  save: CareerSaveFile;
  onClose: () => void;
  onPlayInteractiveMatch?: () => void;
  onPlayInstantMatch?: () => void;
}

export function MatchOverviewModal({
  type,
  fixture,
  save,
  onClose,
  onPlayInteractiveMatch,
  onPlayInstantMatch,
}: MatchOverviewModalProps) {
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

  const standings = save.standings || [];
  const homeStanding = standings.find((s) => s.clubId === homeClub.id);
  const awayStanding = standings.find((s) => s.clubId === awayClub.id);
  const homeRank = standings.findIndex((s) => s.clubId === homeClub.id) + 1;
  const awayRank = standings.findIndex((s) => s.clubId === awayClub.id) + 1;

  // Synthesize realistic stats if not already present on fixture
  const stats: MatchStats = fixture.stats || {
    homePossession: 50,
    awayPossession: 50,
    homeShots: (fixture.homeScore || 0) + 7,
    awayShots: (fixture.awayScore || 0) + 6,
    homeShotsOnTarget: (fixture.homeScore || 0) + 3,
    awayShotsOnTarget: (fixture.awayScore || 0) + 3,
    homeFouls: 9,
    awayFouls: 11,
    homeCorners: 5,
    awayCorners: 4,
  };

  const homeScorers = fixture.scorers?.filter((s) => s.clubId === homeClub.id) || [];
  const awayScorers = fixture.scorers?.filter((s) => s.clubId === awayClub.id) || [];

  const userWon =
    isUserMatch &&
    fixture.played &&
    ((isUserHome && fixture.homeScore! > fixture.awayScore!) ||
      (isUserAway && fixture.awayScore! > fixture.homeScore!));
  const isDraw =
    isUserMatch && fixture.played && fixture.homeScore === fixture.awayScore;
  const userLost =
    isUserMatch &&
    fixture.played &&
    ((isUserHome && fixture.homeScore! < fixture.awayScore!) ||
      (isUserAway && fixture.awayScore! < fixture.homeScore!));

  const motm = fixture.manOfTheMatch || {
    name: fixture.scorers && fixture.scorers.length > 0 ? fixture.scorers[0].name : 'Star Performer',
    clubId: fixture.scorers && fixture.scorers.length > 0 ? fixture.scorers[0].clubId : homeClub.id,
    rating: 8.4,
  };
  const motmClub = clubsMap.get(motm.clubId) || homeClub;

  // Opponent key threat detection for pre-match preview
  const opponentClub = isUserHome ? awayClub : homeClub;
  const DANGER_STRIKERS_BY_CLUB: Record<string, { name: string; position: string; rating: number }> = {
    merseyside_red: { name: 'Mohamed Salah', position: 'FWD', rating: 89 },
    manchester_blue: { name: 'Erling Haaland', position: 'FWD', rating: 91 },
    london_red: { name: 'Bukayo Saka', position: 'FWD', rating: 88 },
    london_blue: { name: 'Cole Palmer', position: 'MID', rating: 86 },
    north_london_white: { name: 'Son Heung-min', position: 'FWD', rating: 87 },
    manchester_red: { name: 'Bruno Fernandes', position: 'MID', rating: 86 },
    west_midlands_claret: { name: 'Ollie Watkins', position: 'FWD', rating: 85 },
    tyne_wear_black_white: { name: 'Alexander Isak', position: 'FWD', rating: 86 },
  };

  const dangerPlayer =
    DANGER_STRIKERS_BY_CLUB[opponentClub.id] || {
      name: `${opponentClub.shortName} Lead Striker`,
      position: 'FWD',
      rating: Math.max(76, Math.min(88, Math.round(opponentClub.reputation * 0.95))),
    };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-[#0b1536]/75 dark:bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        data-office-ui="true"
        className="office-floating-card bg-white dark:bg-slate-900 rounded-3xl p-3.5 sm:p-6 max-w-xl w-full space-y-3 sm:space-y-4 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto scrollbar-none border border-slate-200/90 dark:border-slate-700/80 text-[#0b1536] dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[var(--office-divider)] pb-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1d5eff] font-display">
              {type === 'result' ? '📊 Match Result & Statistics' : '📋 Pre-Match Tactical Dossier'}
            </span>
            <h2 className="text-sm sm:text-base font-display font-extrabold text-[var(--office-text-primary)] uppercase tracking-tight">
              {roundTitle} • {competitionTitle}
            </h2>
          </div>
          <button
            type="button"
            data-office-ui="true"
            onClick={onClose}
            className="office-subcard w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)] transition-colors cursor-pointer border border-slate-200 shadow-2xs"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Clash & Scoreline Banner */}
        <div className="office-subcard rounded-2xl p-3.5 sm:p-4 space-y-2.5 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/30 border border-indigo-100/70">
          <div className="flex items-center justify-between gap-3 sm:gap-6">
            {/* Home Club */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1.5 min-w-0">
              <div
                data-force-white="true"
                className="club-crest w-11 h-11 sm:w-14 sm:h-14 rounded-full border-2 border-white/60 shadow-lg flex items-center justify-center text-xs sm:text-sm font-black text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${homeClub.primaryColor}, ${homeClub.secondaryColor})`,
                }}
              >
                {homeClub.shortName}
              </div>
              <div className="min-w-0 w-full">
                <h4 className="font-display font-extrabold text-xs sm:text-sm text-[var(--office-text-primary)] line-clamp-2 leading-tight">
                  {getEffectiveClubName(homeClub, save.club)}
                </h4>
                <span className="text-[9px] uppercase font-bold text-[var(--office-text-muted)] block truncate mt-0.5">
                  {isUserHome ? '★ (YOU • HOME)' : 'Home'}
                </span>
              </div>
            </div>

            {/* Score / VS Display */}
            <div className="flex flex-col items-center justify-center shrink-0 px-2 space-y-1">
              {fixture.played ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-white border-2 border-indigo-200/80 px-3.5 py-1.5 rounded-xl font-mono font-black text-lg sm:text-2xl text-[var(--office-text-primary)] shadow-sm">
                    {fixture.homeScore} - {fixture.awayScore}
                  </div>
                  {cupFixture?.penalties && (
                    <span className="text-[10px] font-mono text-amber-600 font-bold">
                      ({cupFixture.penalties.homePenalties} - {cupFixture.penalties.awayPenalties} pens)
                    </span>
                  )}
                  {isUserMatch && (
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
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
              ) : (
                <span className="text-xl sm:text-2xl font-display font-black text-[#1d5eff] tracking-wider">
                  VS
                </span>
              )}
              <span className="text-[10px] text-[var(--office-text-muted)] font-medium truncate max-w-[130px] sm:max-w-[170px] text-center">
                🏟️ {venueDisplay}
              </span>
            </div>

            {/* Away Club */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1.5 min-w-0">
              <div
                data-force-white="true"
                className="club-crest w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/60 shadow-lg flex items-center justify-center text-xs sm:text-sm font-black text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${awayClub.primaryColor}, ${awayClub.secondaryColor})`,
                }}
              >
                {awayClub.shortName}
              </div>
              <div className="min-w-0 w-full">
                <h4 className="font-display font-extrabold text-xs sm:text-sm text-[var(--office-text-primary)] line-clamp-2 leading-tight">
                  {getEffectiveClubName(awayClub, save.club)}
                </h4>
                <span className="text-[9px] uppercase font-bold text-[var(--office-text-muted)] block truncate mt-0.5">
                  {isUserAway ? '★ (YOU • AWAY)' : 'Away'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] font-mono text-[var(--office-text-muted)] pt-1 border-t border-[var(--office-divider)]">
            {formatCareerDate(fixture.date, save.settings.dateFormat, 'long')}
          </div>
        </div>

        {/* MODE A: PLAYED MATCH RESULTS & STATISTICS */}
        {type === 'result' && (
          <div className="space-y-4">
            {/* Goalscorers Grid */}
            <div className="office-subcard rounded-2xl p-4 space-y-2">
              <div className="text-[10px] font-black uppercase text-[var(--office-text-muted)] tracking-wider flex items-center gap-1.5">
                <span>⚽</span> Goalscorers & Key Events
              </div>

              {(fixture.homeScore || 0) + (fixture.awayScore || 0) === 0 ? (
                <div className="text-center py-2 text-xs text-[var(--office-text-muted)] italic">
                  No goals scored in this match (Goalless Draw).
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-xs divide-x divide-[var(--office-divider)] pt-1">
                  {/* Home Scorers */}
                  <div className="space-y-1.5 pr-2">
                    <span className="text-[10px] font-bold text-[var(--office-text-muted)] uppercase block truncate">
                      {getEffectiveClubName(homeClub, save.club)} ({homeScorers.length})
                    </span>
                    {homeScorers.length > 0 ? (
                      homeScorers.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-[11px] text-[var(--office-text-primary)]">
                          <span>⚽</span>
                          <span className="font-bold">{s.name}</span>
                          <span className="text-[var(--office-text-muted)] text-[10px]">({s.minute}&apos;)</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-[var(--office-text-muted)] italic">—</span>
                    )}
                  </div>

                  {/* Away Scorers */}
                  <div className="space-y-1.5 pl-3">
                    <span className="text-[10px] font-bold text-[var(--office-text-muted)] uppercase block truncate">
                      {getEffectiveClubName(awayClub, save.club)} ({awayScorers.length})
                    </span>
                    {awayScorers.length > 0 ? (
                      awayScorers.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-[11px] text-[var(--office-text-primary)]">
                          <span>⚽</span>
                          <span className="font-bold">{s.name}</span>
                          <span className="text-[var(--office-text-muted)] text-[10px]">({s.minute}&apos;)</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-[var(--office-text-muted)] italic">—</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Man of the Match Spotlight */}
            <div className="bg-gradient-to-r from-amber-50 via-amber-100/40 to-orange-50 border border-amber-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⭐</span>
                <div>
                  <span className="text-[9px] font-black uppercase text-amber-700 tracking-wider block">
                    Man of the Match
                  </span>
                  <span className="font-display font-extrabold text-sm text-[var(--office-text-primary)]">
                    {motm.name}
                  </span>
                  <span className="text-[10px] text-[var(--office-text-muted)] block">
                    {getEffectiveClubName(motmClub, save.club)}
                  </span>
                </div>
              </div>
              <div className="bg-amber-500 text-white px-2.5 py-1 rounded-xl font-display font-black text-xs shadow-2xs">
                {motm.rating.toFixed(1)} ★
              </div>
            </div>

            {/* Manager Match Statistics */}
            <div className="office-subcard rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="text-[10px] font-black uppercase text-[var(--office-text-muted)] tracking-wider flex items-center justify-between">
                <span>📊 Match Statistics Comparison</span>
                <span className="text-[9px] text-[var(--office-text-muted)]">Official Match Data</span>
              </div>

              {/* Possession Comparison Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono font-bold">
                  <span className="text-[#1d5eff]">{stats.homePossession}%</span>
                  <span className="text-[10px] font-sans uppercase font-bold text-[var(--office-text-muted)]">Possession</span>
                  <span className="text-[#7c3aed]">{stats.awayPossession}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-[#1d5eff] transition-all duration-500"
                    style={{ width: `${stats.homePossession}%` }}
                  />
                  <div
                    className="h-full bg-[#7c3aed] transition-all duration-500"
                    style={{ width: `${stats.awayPossession}%` }}
                  />
                </div>
              </div>

              {/* Stat Comparison Rows */}
              <div className="space-y-2.5 pt-1 text-xs">
                {[
                  { label: 'Total Shots', home: stats.homeShots, away: stats.awayShots },
                  { label: 'Shots on Target', home: stats.homeShotsOnTarget, away: stats.awayShotsOnTarget },
                  { label: 'Corners', home: stats.homeCorners, away: stats.awayCorners },
                  { label: 'Fouls Committed', home: stats.homeFouls, away: stats.awayFouls },
                ].map((row, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b border-[var(--office-divider)] last:border-b-0">
                    <span className="font-mono font-bold text-[var(--office-text-primary)] w-12 text-left">{row.home}</span>
                    <span className="text-[11px] font-bold text-[var(--office-text-muted)] uppercase tracking-wide">{row.label}</span>
                    <span className="font-mono font-bold text-[var(--office-text-primary)] w-12 text-right">{row.away}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODE B: PRE-MATCH TACTICAL DOSSIER */}
        {type === 'preview' && (
          <div className="space-y-4">
            {/* Standings & Head-to-Head Form Comparison */}
            <div className="office-subcard rounded-2xl p-4 space-y-3">
              <div className="text-[10px] font-black uppercase text-[#1d5eff] tracking-wider flex items-center justify-between">
                <span>📈 League Table Standing & Form Guide</span>
                <span className="text-[var(--office-text-muted)] text-[10px] font-mono">Top Flight</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs divide-x divide-[var(--office-divider)]">
                {/* Home Club Standing */}
                <div className="space-y-1.5 pr-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[var(--office-text-muted)]">Position</span>
                    <span className="font-display font-black text-amber-600 text-sm">#{homeRank || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[var(--office-text-muted)]">Points</span>
                    <span className="font-mono font-bold text-[var(--office-text-primary)]">{homeStanding?.points ?? 0} pts</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[var(--office-text-muted)]">Goal Diff</span>
                    <span className="font-mono font-bold text-[var(--office-text-primary)]">
                      {(homeStanding?.goalDifference ?? 0) > 0 ? `+${homeStanding?.goalDifference}` : homeStanding?.goalDifference ?? 0}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-[9px] uppercase font-bold text-[var(--office-text-muted)] block mb-1">Recent Form</span>
                    <div className="flex gap-1">
                      {(homeStanding?.form || ['W', 'D', 'W', 'L', 'W']).map((f, i) => (
                        <span
                          key={i}
                          className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center ${
                            f === 'W' ? 'bg-emerald-500 text-white' : f === 'D' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                          }`}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Away Club Standing */}
                <div className="space-y-1.5 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[var(--office-text-muted)]">Position</span>
                    <span className="font-display font-black text-amber-600 text-sm">#{awayRank || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[var(--office-text-muted)]">Points</span>
                    <span className="font-mono font-bold text-[var(--office-text-primary)]">{awayStanding?.points ?? 0} pts</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-[var(--office-text-muted)]">Goal Diff</span>
                    <span className="font-mono font-bold text-[var(--office-text-primary)]">
                      {(awayStanding?.goalDifference ?? 0) > 0 ? `+${awayStanding?.goalDifference}` : awayStanding?.goalDifference ?? 0}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-[9px] uppercase font-bold text-[var(--office-text-muted)] block mb-1">Recent Form</span>
                    <div className="flex gap-1">
                      {(awayStanding?.form || ['D', 'W', 'L', 'W', 'D']).map((f, i) => (
                        <span
                          key={i}
                          className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center ${
                            f === 'W' ? 'bg-emerald-500 text-white' : f === 'D' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                          }`}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tactical Intel & Key Threat Card */}
            <div className="office-subcard rounded-2xl p-4 space-y-3">
              <div className="text-[10px] font-black uppercase text-[var(--office-text-muted)] tracking-wider flex items-center gap-1.5">
                <span>🛡️</span> Opponent Scouting Report & Danger Player
              </div>

              <div className="flex items-center justify-between bg-gradient-to-r from-amber-50/70 via-amber-100/30 to-orange-50/50 border border-amber-200/80 p-3 rounded-xl text-xs">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-amber-700">Danger Man</span>
                  <div className="font-display font-extrabold text-sm text-[var(--office-text-primary)]">
                    {dangerPlayer.name}
                  </div>
                  <span className="text-[10px] text-[var(--office-text-muted)]">
                    {dangerPlayer.position} • {getEffectiveClubName(opponentClub, save.club)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-[var(--office-text-muted)] block">Rating</span>
                  <span className="font-mono font-black text-lg text-[#1d5eff]">
                    {dangerPlayer.rating}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[var(--office-text-secondary)] leading-relaxed">
                Tactical Mentality: <strong className="text-[var(--office-text-primary)]">Balanced / High Pressing</strong>.
                Expect a competitive encounter at {venueDisplay}. Managers must ensure defensive discipline and manage squad rotation carefully.
              </p>
            </div>

            {/* Matchday Action Buttons */}
            {onPlayInteractiveMatch && onPlayInstantMatch && (
              <div className="grid grid-cols-2 gap-2 pt-1 pb-0.5">
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={() => {
                    onClose();
                    onPlayInteractiveMatch();
                  }}
                  className="office-action-btn-primary py-3 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer text-white active:scale-[0.99] transition-transform truncate"
                >
                  <span>▶ Play Match</span>
                </button>
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={() => {
                    onClose();
                    onPlayInstantMatch();
                  }}
                  className="office-subcard py-3 px-3 rounded-xl hover:bg-indigo-50/50 text-[var(--office-text-primary)] font-display font-bold text-xs uppercase tracking-wider cursor-pointer border border-slate-200 shadow-2xs active:scale-[0.99] transition-transform flex items-center justify-center gap-1.5 truncate"
                >
                  <span>⚡ Instant Result</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer (Result Mode only) */}
        {type === 'result' && (
          <div className="pt-2 border-t border-[var(--office-divider)] flex justify-end">
            <button
              type="button"
              data-office-ui="true"
              onClick={onClose}
              className="office-subcard py-2 px-5 rounded-xl hover:bg-indigo-50/50 text-[var(--office-text-primary)] font-display font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-slate-200 shadow-2xs"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
