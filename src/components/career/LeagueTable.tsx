'use client';

import React, { useState } from 'react';
import { ClubStanding, Club, LeagueFixture, CareerPlayer } from '../../career/types';
import { getQualificationZone } from '../../career/table';
import { getEffectiveClubName, getClubsWithUserClub } from '../../career/clubs';
import { getLeagueLeaderboards, LeagueLeaderboardEntry } from '../../career/playerStats';

interface LeagueTableProps {
  standings: ClubStanding[];
  userClubId: string;
  userClub?: Club;
  fixtures?: LeagueFixture[];
  userSquad?: CareerPlayer[];
}

type TableSubTab = 'standings' | 'scorers' | 'assists' | 'clean_sheets';

export function LeagueTable({ standings, userClubId, userClub, fixtures = [], userSquad = [] }: LeagueTableProps) {
  const [activeSubTab, setActiveSubTab] = useState<TableSubTab>('standings');

  const allClubs = getClubsWithUserClub(userClub);
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));
  const totalPlayed = standings.reduce((sum, r) => sum + r.played, 0);
  const isPreSeason = totalPlayed === 0;

  const leaderboards = getLeagueLeaderboards(fixtures, userClubId, userSquad);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] shadow-sm">
          🥇
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 text-slate-950 font-black text-[11px] shadow-sm">
          🥈
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[11px] shadow-sm">
          🥉
        </span>
      );
    }
    return <span className="font-mono font-bold text-slate-400 text-xs">#{rank}</span>;
  };

  return (
    <section id="league-table-section" aria-label="League Standings and Player Stats" className="space-y-4 scroll-mt-20">
      {/* Sub-tab Switcher: Standings vs Player Stats Leaderboards */}
      <nav aria-label="League navigation" className="bg-slate-900/60 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar shadow-sm">
        <button
          type="button"
          onClick={() => setActiveSubTab('standings')}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'standings'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span>🏆</span>
          <span>Standings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('scorers')}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'scorers'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span>⚽</span>
          <span>Top Scorers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('assists')}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'assists'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span>🎯</span>
          <span>Top Assists</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('clean_sheets')}
          className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'clean_sheets'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span>🧤</span>
          <span>Clean Sheets</span>
        </button>
      </nav>

      {/* Informative Pre-Season State */}
      {isPreSeason && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-950 border border-emerald-500/30 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg shrink-0">⚡</span>
            <div className="min-w-0">
              <span className="font-display font-black text-emerald-400 uppercase tracking-wider block text-xs">
                Pre-Season • Matchday 1 Pending
              </span>
              <span className="text-[11px] text-slate-300 truncate block">
                {activeSubTab === 'standings'
                  ? 'All 20 clubs start level on 0 points. Head to Office to play your opening league fixture!'
                  : 'Displaying season contenders. Player statistics will update automatically as matches are played!'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: STANDINGS TABLE */}
      {activeSubTab === 'standings' && (
        <>
          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/30 shadow-lg">
            <div className="overflow-x-auto max-h-[75vh]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-950/95 backdrop-blur-md z-10 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800 select-none shadow-sm">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-8">Pos</th>
                    <th className="py-2.5 px-2.5 sm:px-4">Club</th>
                    <th className="py-2.5 px-1.5 sm:px-2.5 text-center">P</th>
                    <th className="py-2.5 px-1.5 sm:px-2.5 text-center">W</th>
                    <th className="py-2.5 px-1.5 sm:px-2.5 text-center">D</th>
                    <th className="py-2.5 px-1.5 sm:px-2.5 text-center">L</th>
                    <th className="py-2.5 px-2 text-center hidden sm:table-cell">GF</th>
                    <th className="py-2.5 px-2 text-center hidden sm:table-cell">GA</th>
                    <th className="py-2.5 px-1.5 sm:px-2.5 text-center">GD</th>
                    <th className="py-2.5 px-2.5 sm:px-4 text-center font-display font-black text-white">Pts</th>
                    <th className="py-2.5 px-3 text-center hidden md:table-cell">Form</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 font-medium">
                  {standings.map((row, index) => {
                    const position = index + 1;
                    const club = clubsMap.get(row.clubId);
                    const isUserClub = row.clubId === userClubId;
                    const zone = getQualificationZone(position);

                    let posBadgeClass = 'text-slate-400 font-bold';
                    let rowBorderClass = '';

                    if (zone === 'champions_league') {
                      posBadgeClass = 'text-emerald-400 font-display font-black';
                      rowBorderClass = 'border-l-3 border-l-emerald-500';
                    } else if (zone === 'europa_league') {
                      posBadgeClass = 'text-amber-400 font-display font-black';
                      rowBorderClass = 'border-l-3 border-l-amber-500';
                    } else if (zone === 'conference_league') {
                      posBadgeClass = 'text-teal-400 font-display font-black';
                      rowBorderClass = 'border-l-3 border-l-teal-500';
                    } else if (zone === 'relegation') {
                      posBadgeClass = 'text-rose-400 font-display font-black';
                      rowBorderClass = 'border-l-3 border-l-rose-500';
                    }

                    const displayName = club ? getEffectiveClubName(club) : row.clubId;

                    return (
                      <tr
                        key={row.clubId}
                        className={`transition-colors ${rowBorderClass} ${
                          isUserClub
                            ? 'bg-emerald-950/30 hover:bg-emerald-950/45 font-bold ring-1 ring-inset ring-emerald-500/30'
                            : 'hover:bg-slate-850/30'
                        }`}
                      >
                        {/* Position */}
                        <td className={`py-2 px-2 text-center text-xs ${posBadgeClass}`}>
                          {position}
                        </td>

                        {/* Club */}
                        <td className="py-2 px-2.5 sm:px-4">
                          <div className="flex items-center gap-2">
                            {club && (
                              <div
                                className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0"
                                style={{
                                  background: `linear-gradient(135deg, ${club.primaryColor}, ${club.secondaryColor})`,
                                }}
                              />
                            )}
                            <span className={`truncate text-xs ${isUserClub ? 'text-emerald-300 font-black' : 'text-white'}`}>
                              {displayName}
                            </span>
                            {isUserClub && (
                              <span className="text-[8px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-emerald-500 text-slate-950 leading-tight">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>

                        {/* P / W / D / L */}
                        <td className="py-2 px-1.5 sm:px-2.5 text-center text-slate-300 text-xs">{row.played}</td>
                        <td className="py-2 px-1.5 sm:px-2.5 text-center text-slate-300 text-xs">{row.won}</td>
                        <td className="py-2 px-1.5 sm:px-2.5 text-center text-slate-400 text-xs">{row.drawn}</td>
                        <td className="py-2 px-1.5 sm:px-2.5 text-center text-slate-400 text-xs">{row.lost}</td>

                        {/* GF / GA */}
                        <td className="py-2 px-2 text-center text-slate-400 text-xs hidden sm:table-cell">{row.goalsFor}</td>
                        <td className="py-2 px-2 text-center text-slate-400 text-xs hidden sm:table-cell">{row.goalsAgainst}</td>

                        {/* GD */}
                        <td className={`py-2 px-1.5 sm:px-2.5 text-center text-xs font-semibold ${row.goalDifference > 0 ? 'text-emerald-400' : row.goalDifference < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                          {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                        </td>

                        {/* Points */}
                        <td className="py-2 px-2.5 sm:px-4 text-center font-display font-black text-xs sm:text-sm text-white">
                          {row.points}
                        </td>

                        {/* Form Dots */}
                        <td className="py-2 px-3 text-center hidden md:table-cell">
                          <div className="flex justify-center items-center gap-1">
                            {row.form.length === 0 && <span className="text-slate-600">-</span>}
                            {row.form.map((res, i) => (
                              <span
                                key={i}
                                className={`w-3.5 h-3.5 rounded-full text-[8px] font-black flex items-center justify-center leading-none ${
                                  res === 'W'
                                    ? 'bg-emerald-500 text-slate-950'
                                    : res === 'D'
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-rose-500 text-white'
                                }`}
                              >
                                {res}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <footer className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 bg-slate-950/60 border border-slate-850 p-4 rounded-2xl">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>1–4: European Champions Cup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>5: European Challenge Cup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span>6: European Plate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>18–20: Relegation</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500">
              38 Matches • 20 Clubs
            </div>
          </footer>
        </>
      )}

      {/* VIEW 2: TOP SCORERS / GOLDEN BOOT */}
      {activeSubTab === 'scorers' && (
        <LeaderboardCard
          title="Golden Boot Race"
          subtitle="Top goalscorers in the Premier League"
          statLabel="Goals"
          statIcon="⚽"
          entries={leaderboards.topScorers}
          userClubId={userClubId}
          getRankBadge={getRankBadge}
          emptyText="No goals scored yet this season. Fixtures played will update this chart in real-time."
        />
      )}

      {/* VIEW 3: TOP ASSISTS / PLAYMAKER */}
      {activeSubTab === 'assists' && (
        <LeaderboardCard
          title="Playmaker Award"
          subtitle="Assist leaders across all league fixtures"
          statLabel="Assists"
          statIcon="🎯"
          entries={leaderboards.topAssists}
          userClubId={userClubId}
          getRankBadge={getRankBadge}
          emptyText="No assists recorded yet this season. Fixtures played will update this chart in real-time."
        />
      )}

      {/* VIEW 4: CLEAN SHEETS / GOLDEN GLOVE */}
      {activeSubTab === 'clean_sheets' && (
        <LeaderboardCard
          title="Golden Glove"
          subtitle="Goalkeepers with the most clean sheets"
          statLabel="Clean Sheets"
          statIcon="🧤"
          entries={leaderboards.topCleanSheets}
          userClubId={userClubId}
          getRankBadge={getRankBadge}
          emptyText="No clean sheets recorded yet this season. Keep your defense solid to lead this race!"
        />
      )}
    </section>
  );
}

interface LeaderboardCardProps {
  title: string;
  subtitle: string;
  statLabel: string;
  statIcon: string;
  entries: LeagueLeaderboardEntry[];
  userClubId: string;
  getRankBadge: (rank: number) => React.ReactNode;
  emptyText: string;
}

function LeaderboardCard({
  title,
  subtitle,
  statLabel,
  statIcon,
  entries,
  userClubId,
  getRankBadge,
  emptyText,
}: LeaderboardCardProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-md">
        <div>
          <h3 className="font-display font-black text-sm text-white flex items-center gap-1.5">
            <span>{statIcon}</span>
            <span>{title}</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Top 10 Leaders</span>
          <span className="text-xs font-mono font-bold text-emerald-400">2026/27</span>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/30 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/95 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800 select-none">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">Rank</th>
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-3 hidden sm:table-cell">Club</th>
                <th className="py-2.5 px-3 text-center w-16">Apps</th>
                <th className="py-2.5 px-4 text-center font-display font-black text-emerald-400 w-24">
                  {statLabel}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60 font-medium">
              {entries.map((entry) => {
                const isUser = entry.isUserPlayer || entry.clubId === userClubId;
                return (
                  <tr
                    key={`${entry.clubId}-${entry.playerName}-${entry.rank}`}
                    className={`transition-colors ${
                      isUser
                        ? 'bg-emerald-950/35 hover:bg-emerald-950/50 font-bold ring-1 ring-inset ring-emerald-500/30'
                        : 'hover:bg-slate-850/30'
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center">
                        {getRankBadge(entry.rank)}
                      </div>
                    </td>

                    {/* Player Name */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-display font-bold text-xs truncate ${isUser ? 'text-emerald-300 font-black' : 'text-white'}`}>
                          {entry.playerName}
                        </span>
                        {isUser && (
                          <span className="text-[8px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-emerald-500 text-slate-950 leading-tight">
                            YOU
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 sm:hidden">
                          • {entry.clubName}
                        </span>
                      </div>
                    </td>

                    {/* Club */}
                    <td className="py-2.5 px-3 text-slate-300 text-xs hidden sm:table-cell">
                      {entry.clubName}
                    </td>

                    {/* Appearances */}
                    <td className="py-2.5 px-3 text-center text-slate-400 text-xs font-mono">
                      {entry.appearances}
                    </td>

                    {/* Stat Value */}
                    <td className="py-2.5 px-4 text-center font-display font-black text-sm text-emerald-400">
                      {entry.statValue}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
