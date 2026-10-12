'use client';

import React from 'react';
import {
  LeagueFixture,
  CareerSaveFile,
  Club,
  MatchStats,
} from '../../career/types';
import { getEffectiveClubName, getClubsWithUserClub } from '../../career/clubs';
import { formatCareerDate } from '../../career/formatters';

export interface MatchOverviewModalProps {
  type: 'result' | 'preview';
  fixture: LeagueFixture;
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

  const homeClub = clubsMap.get(fixture.homeClubId) || allClubs[0];
  const awayClub = clubsMap.get(fixture.awayClubId) || allClubs[1];

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
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-7 max-w-xl w-full space-y-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto scrollbar-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 font-display">
              {type === 'result' ? '📊 Match Result & Statistics' : '📋 Pre-Match Tactical Dossier'}
            </span>
            <h2 className="text-sm sm:text-base font-display font-black text-white uppercase tracking-tight">
              Matchday {fixture.round} of 38 • English Top Flight
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Clash & Scoreline Banner */}
        <div className="bg-slate-900/70 border border-slate-850 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 sm:gap-6">
            {/* Home Club */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1.5 min-w-0">
              <div
                data-force-white="true"
                className="club-crest w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/20 shadow-lg flex items-center justify-center text-xs sm:text-sm font-black text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${homeClub.primaryColor}, ${homeClub.secondaryColor})`,
                }}
              >
                {homeClub.shortName}
              </div>
              <div className="min-w-0 w-full">
                <h4 className="font-display font-black text-xs sm:text-sm text-white truncate">
                  {getEffectiveClubName(homeClub, save.club)}
                </h4>
                <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                  {isUserHome ? '★ (YOU • HOME)' : 'Home'}
                </span>
              </div>
            </div>

            {/* Score / VS Display */}
            <div className="flex flex-col items-center justify-center shrink-0 px-2 space-y-1">
              {fixture.played ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-slate-950 border border-slate-750 px-3.5 py-1.5 rounded-xl font-mono font-black text-lg sm:text-2xl text-emerald-400 shadow-inner">
                    {fixture.homeScore} - {fixture.awayScore}
                  </div>
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
              ) : (
                <span className="text-xl sm:text-2xl font-display font-black text-emerald-400 tracking-wider">
                  VS
                </span>
              )}
              <span className="text-[10px] text-slate-400 font-medium truncate max-w-[130px] sm:max-w-[170px] text-center">
                🏟️ {homeClub.stadiumName}
              </span>
            </div>

            {/* Away Club */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1.5 min-w-0">
              <div
                data-force-white="true"
                className="club-crest w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/20 shadow-lg flex items-center justify-center text-xs sm:text-sm font-black text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${awayClub.primaryColor}, ${awayClub.secondaryColor})`,
                }}
              >
                {awayClub.shortName}
              </div>
              <div className="min-w-0 w-full">
                <h4 className="font-display font-black text-xs sm:text-sm text-white truncate">
                  {getEffectiveClubName(awayClub, save.club)}
                </h4>
                <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                  {isUserAway ? '★ (YOU • AWAY)' : 'Away'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
            {formatCareerDate(fixture.date, save.settings.dateFormat, 'long')}
          </div>
        </div>

        {/* MODE A: PLAYED MATCH RESULTS & STATISTICS */}
        {type === 'result' && (
          <div className="space-y-5">
            {/* Goalscorers Grid */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 space-y-2">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <span>⚽</span> Goalscorers & Key Events
              </div>

              {(fixture.homeScore || 0) + (fixture.awayScore || 0) === 0 ? (
                <div className="text-center py-2 text-xs text-slate-400 italic">
                  No goals scored in this match (Goalless Draw).
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
                          <span className="font-semibold">{s.name}</span>
                          <span className="text-slate-400 text-[10px]">({s.minute}&apos;)</span>
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
                          <span className="font-semibold">{s.name}</span>
                          <span className="text-slate-400 text-[10px]">({s.minute}&apos;)</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">—</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Man of the Match Spotlight */}
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⭐</span>
                <div>
                  <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider block">
                    Man of the Match
                  </span>
                  <span className="font-display font-black text-sm text-white">
                    {motm.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {getEffectiveClubName(motmClub, save.club)}
                  </span>
                </div>
              </div>
              <div className="bg-amber-500 text-slate-950 px-2.5 py-1 rounded-xl font-display font-black text-xs shadow-md">
                {motm.rating.toFixed(1)} ★
              </div>
            </div>

            {/* Manager Match Statistics */}
            <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="text-[10px] font-black uppercase text-slate-300 tracking-wider flex items-center justify-between">
                <span>📊 Match Statistics Comparison</span>
                <span className="text-[9px] text-slate-500">Official Data</span>
              </div>

              {/* Possession Comparison Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono font-bold">
                  <span className="text-emerald-400">{stats.homePossession}%</span>
                  <span className="text-[10px] font-sans uppercase font-bold text-slate-400">Possession</span>
                  <span className="text-blue-400">{stats.awayPossession}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${stats.homePossession}%` }}
                  />
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
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
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-850/60 last:border-b-0">
                    <span className="font-mono font-bold text-slate-200 w-12 text-left">{row.home}</span>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{row.label}</span>
                    <span className="font-mono font-bold text-slate-200 w-12 text-right">{row.away}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODE B: PRE-MATCH TACTICAL DOSSIER */}
        {type === 'preview' && (
          <div className="space-y-5">
            {/* Standings & Head-to-Head Form Comparison */}
            <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-4 space-y-3">
              <div className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center justify-between">
                <span>📈 League Table Standing & Form Guide</span>
                <span className="text-slate-400 text-[10px] font-mono">Top Flight</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs divide-x divide-slate-800/80">
                {/* Home Club Standing */}
                <div className="space-y-1.5 pr-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Position</span>
                    <span className="font-display font-black text-amber-400 text-sm">#{homeRank || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Points</span>
                    <span className="font-mono font-bold text-slate-200">{homeStanding?.points ?? 0} pts</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Goal Diff</span>
                    <span className="font-mono font-bold text-slate-200">
                      {(homeStanding?.goalDifference ?? 0) > 0 ? `+${homeStanding?.goalDifference}` : homeStanding?.goalDifference ?? 0}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Recent Form</span>
                    <div className="flex gap-1">
                      {(homeStanding?.form || ['W', 'D', 'W', 'L', 'W']).map((f, i) => (
                        <span
                          key={i}
                          className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center ${
                            f === 'W' ? 'bg-emerald-500 text-slate-950' : f === 'D' ? 'bg-amber-500 text-slate-950' : 'bg-rose-500 text-white'
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
                    <span className="text-[10px] font-bold uppercase text-slate-400">Position</span>
                    <span className="font-display font-black text-amber-400 text-sm">#{awayRank || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Points</span>
                    <span className="font-mono font-bold text-slate-200">{awayStanding?.points ?? 0} pts</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Goal Diff</span>
                    <span className="font-mono font-bold text-slate-200">
                      {(awayStanding?.goalDifference ?? 0) > 0 ? `+${awayStanding?.goalDifference}` : awayStanding?.goalDifference ?? 0}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Recent Form</span>
                    <div className="flex gap-1">
                      {(awayStanding?.form || ['D', 'W', 'L', 'W', 'D']).map((f, i) => (
                        <span
                          key={i}
                          className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center ${
                            f === 'W' ? 'bg-emerald-500 text-slate-950' : f === 'D' ? 'bg-amber-500 text-slate-950' : 'bg-rose-500 text-white'
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
            <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-4 space-y-3">
              <div className="text-[10px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <span>🛡️</span> Opponent Scouting Report & Danger Player
              </div>

              <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-xs">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-amber-400">Danger Man</span>
                  <div className="font-display font-black text-sm text-white">
                    {dangerPlayer.name}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {dangerPlayer.position} • {getEffectiveClubName(opponentClub, save.club)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Rating</span>
                  <span className="font-mono font-black text-lg text-emerald-400">
                    {dangerPlayer.rating}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tactical Mentality: <strong className="text-slate-200">Balanced / High Pressing</strong>.
                Expect a competitive encounter at {homeClub.stadiumName}. Managers must ensure defensive discipline and manage fitness rotations carefully.
              </p>
            </div>

            {/* Matchday Action Buttons */}
            {onPlayInteractiveMatch && onPlayInstantMatch && (
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onPlayInteractiveMatch();
                  }}
                  className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 cursor-pointer"
                >
                  <span>▶ Play Match Now</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onPlayInstantMatch();
                  }}
                  className="py-3 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-850 text-slate-200 font-display font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  <span>⚡ Instant Result</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-2 border-t border-slate-850/80 flex justify-end">
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-display font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
