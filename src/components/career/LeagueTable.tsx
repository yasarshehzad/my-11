'use client';

import React, { useState } from 'react';
import { ClubStanding, Club, LeagueFixture, CareerPlayer, SeasonHistoryRecord } from '../../career/types';
import { getQualificationZone } from '../../career/table';
import { getEffectiveClubName, getClubsWithUserClub } from '../../career/clubs';
import { getLeagueLeaderboards, LeagueLeaderboardEntry } from '../../career/playerStats';
import { IconBall, IconShield, IconTarget } from './GameIcons';

interface LeagueTableProps {
  standings: ClubStanding[];
  userClubId: string;
  userClub?: Club;
  fixtures?: LeagueFixture[];
  userSquad?: CareerPlayer[];
  seasonHistory?: SeasonHistoryRecord[];
  activeLeagueClubIds?: string[];
}

type TableSubTab = 'standings' | 'scorers' | 'assists' | 'clean_sheets';

const SUB_TABS: { id: TableSubTab; label: string }[] = [
  { id: 'standings', label: 'Standings' },
  { id: 'scorers', label: 'Goals' },
  { id: 'assists', label: 'Assists' },
  { id: 'clean_sheets', label: 'Clean Sheets' },
];

export function LeagueTable({
  standings,
  userClubId,
  userClub,
  fixtures = [],
  userSquad = [],
  activeLeagueClubIds,
}: LeagueTableProps) {
  const [activeSubTab, setActiveSubTab] = useState<TableSubTab>('standings');

  const allClubs = getClubsWithUserClub(userClub, activeLeagueClubIds);
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));
  const totalPlayed = standings.reduce((sum, r) => sum + r.played, 0);
  const isPreSeason = totalPlayed === 0;

  const leaderboards = getLeagueLeaderboards(fixtures, userClubId, userSquad);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] shadow-2xs">
          1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-[11px] shadow-2xs">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-[11px] shadow-2xs">
          3
        </span>
      );
    }
    return <span className="font-mono font-bold text-slate-500 text-xs">#{rank}</span>;
  };

  return (
    <section id="league-table-section" data-office-ui="true" aria-label="League Standings and Player Stats" className="space-y-3.5 scroll-mt-20 w-full">
      {/* Sub-tab Switcher: Standings vs Player Stats Leaderboards */}
      <nav aria-label="League navigation" className="office-subcard p-1 flex items-center gap-1 overflow-x-auto no-scrollbar shadow-xs rounded-2xl">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={activeSubTab === tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 min-h-[40px] py-2 px-2 rounded-xl text-[11px] font-display font-black uppercase tracking-wide transition-all text-center whitespace-nowrap cursor-pointer ${
              activeSubTab === tab.id ? 'office-nav-tab-active shadow-xs' : 'office-nav-tab-inactive'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {isPreSeason && (
        <p className="px-1 text-[11px] font-bold text-amber-800">
          Pre-season: {activeSubTab === 'standings' ? 'the table' : 'stats'} will update after Matchday 1.
        </p>
      )}

      {/* VIEW 1: STANDINGS TABLE */}
      {activeSubTab === 'standings' && (
        <>
          <div className="office-floating-card rounded-2xl overflow-hidden shadow-xs border border-slate-200/90">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums border-collapse">
                <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-md z-10 text-[10px] font-display font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 select-none shadow-2xs">
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
                    <th className="py-2.5 px-2.5 sm:px-4 text-center font-display font-black text-[#0b1536]">Pts</th>
                    <th className="py-2.5 px-3 text-center hidden md:table-cell">Form</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium bg-white">
                  {standings.map((row, index) => {
                    const position = index + 1;
                    const club = clubsMap.get(row.clubId);
                    const isUserClub = row.clubId === userClubId;
                    const zone = getQualificationZone(position);

                    let posBadgeClass = 'text-slate-500 font-bold';
                    let rowBorderClass = 'border-l-[3px] border-l-transparent';
                    let zoneBg = '';

                    if (zone === 'champions_league') {
                      posBadgeClass = 'text-blue-700 font-display font-black';
                      rowBorderClass = 'border-l-[3px] border-l-blue-600';
                      zoneBg = 'bg-blue-50/15';
                    } else if (zone === 'europa_league') {
                      posBadgeClass = 'text-amber-700 font-display font-black';
                      rowBorderClass = 'border-l-[3px] border-l-amber-500';
                      zoneBg = 'bg-amber-50/15';
                    } else if (zone === 'conference_league') {
                      posBadgeClass = 'text-teal-700 font-display font-black';
                      rowBorderClass = 'border-l-[3px] border-l-teal-500';
                      zoneBg = 'bg-teal-50/15';
                    } else if (zone === 'relegation') {
                      posBadgeClass = 'text-rose-700 font-display font-black';
                      rowBorderClass = 'border-l-[3px] border-l-rose-500';
                      zoneBg = 'bg-rose-50/15';
                    }

                    const displayName = club ? getEffectiveClubName(club) : row.clubId;

                    return (
                      <tr
                        key={row.clubId}
                        className={`transition-colors ${rowBorderClass} ${zoneBg} ${
                          isUserClub
                            ? 'bg-amber-50/90 hover:bg-amber-100/70 font-bold ring-1 ring-inset ring-amber-500/40'
                            : 'hover:bg-[#F7F6F3]'
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
                                data-force-white="true"
                                className="club-crest w-4 h-4 rounded-full border border-slate-300 flex-shrink-0 shadow-2xs"
                                style={{
                                  background: `linear-gradient(135deg, ${club.primaryColor}, ${club.secondaryColor})`,
                                }}
                              />
                            )}
                            <span className={`truncate text-xs ${isUserClub ? 'text-blue-700 font-black' : 'text-[#0b1536]'}`}>
                              {displayName}
                            </span>
                            {isUserClub && (
                              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-display leading-tight shadow-2xs">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>

                        {/* P / W / D / L */}
                        <td className="py-2 px-1.5 sm:px-2.5 text-center text-slate-600 text-xs font-mono">{row.played}</td>
                        <td className="py-2 px-1.5 sm:px-2.5 text-center text-slate-600 text-xs font-mono">{row.won}</td>
                        <td className="py-2 px-1.5 sm:px-2.5 text-center text-slate-500 text-xs font-mono">{row.drawn}</td>
                        <td className="py-2 px-1.5 sm:px-2.5 text-center text-slate-500 text-xs font-mono">{row.lost}</td>

                        {/* GF / GA */}
                        <td className="py-2 px-2 text-center text-slate-500 text-xs hidden sm:table-cell font-mono">{row.goalsFor}</td>
                        <td className="py-2 px-2 text-center text-slate-500 text-xs hidden sm:table-cell font-mono">{row.goalsAgainst}</td>

                        {/* GD */}
                        <td className={`py-2 px-1.5 sm:px-2.5 text-center text-xs font-mono font-bold ${row.goalDifference > 0 ? 'text-emerald-700' : row.goalDifference < 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                          {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                        </td>

                        {/* Points */}
                        <td className="py-2 px-2.5 sm:px-4 text-center font-display font-black text-xs sm:text-sm text-[#0b1536]">
                          {row.points}
                        </td>

                        {/* Form Dots */}
                        <td className="py-2 px-3 text-center hidden md:table-cell">
                          <div className="flex justify-center items-center gap-1">
                            {row.form.length === 0 && <span className="text-slate-400 font-mono">-</span>}
                            {row.form.map((res, i) => (
                              <span
                                key={i}
                                className={`w-4 h-4 rounded-full text-[10px] font-black font-display flex items-center justify-center leading-none shadow-2xs ${
                                  res === 'W'
                                    ? 'bg-emerald-600 text-white'
                                    : res === 'D'
                                    ? 'bg-amber-500 text-slate-950 font-black'
                                    : 'bg-rose-600 text-white'
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
          <footer className="office-subcard p-3 sm:p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 shadow-xs">
            <div className="flex items-center gap-3.5 flex-wrap font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-2xs" />
                <span>1–4: Champions Cup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs" />
                <span>5: Challenge Cup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-2xs" />
                <span>6: European Plate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs" />
                <span>18–20: Relegation</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 font-mono font-bold">
              38 Matches • 20 Clubs
            </div>
          </footer>
        </>
      )}

      {/* VIEW 2: TOP SCORERS / GOLDEN BOOT */}
      {activeSubTab === 'scorers' && (
        <LeaderboardCard
          title="Golden Boot Race"
          statLabel="Goals"
          statIcon={<IconBall className="w-4 h-4 text-blue-600" />}
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
          statLabel="Assists"
          statIcon={<IconTarget className="w-4 h-4 text-amber-600" />}
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
          statLabel="Clean Sheets"
          statIcon={<IconShield className="w-4 h-4 text-emerald-600" />}
          entries={leaderboards.topCleanSheets}
          userClubId={userClubId}
          getRankBadge={getRankBadge}
          emptyText="No clean sheets recorded yet this season. Keep your defense solid to lead this race!"
        />
      )}

      <p className="text-[11px] text-slate-500 text-center">Past seasons are listed in the Legacy tab.</p>
    </section>
  );
}

interface LeaderboardCardProps {
  title: string;
  statLabel: string;
  statIcon: React.ReactNode;
  entries: LeagueLeaderboardEntry[];
  userClubId: string;
  getRankBadge: (rank: number) => React.ReactNode;
  emptyText: string;
}

function LeaderboardCard({
  title,
  statLabel,
  statIcon,
  entries,
  userClubId,
  getRankBadge,
  emptyText,
}: LeaderboardCardProps) {
  if (entries.length === 0) {
    return (
      <div className="office-subcard rounded-2xl p-8 text-center text-slate-500 text-xs shadow-xs">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display font-black text-xs sm:text-sm text-[#0b1536] flex items-center gap-1.5 px-1">
        {statIcon}
        <span>{title}</span>
      </h3>

      {/* Leaderboard Table */}
      <div className="office-floating-card rounded-2xl overflow-hidden shadow-xs border border-slate-200/90">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums border-collapse">
            <thead className="bg-slate-50/95 backdrop-blur-md text-[10px] font-display font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 select-none">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">Rank</th>
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-3 hidden sm:table-cell">Club</th>
                <th className="py-2.5 px-3 text-center w-16">Apps</th>
                <th className="py-2.5 px-4 text-center font-display font-black text-blue-700 w-24">
                  {statLabel}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium bg-white">
              {entries.map((entry) => {
                const isUser = entry.isUserPlayer || entry.clubId === userClubId;
                return (
                  <tr
                    key={`${entry.clubId}-${entry.playerName}-${entry.rank}`}
                    className={`transition-colors ${
                      isUser
                        ? 'bg-blue-50/90 hover:bg-blue-100/70 font-bold ring-1 ring-inset ring-blue-500/30'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center">
                        {getRankBadge(entry.rank)}
                      </div>
                    </td>

                    {/* Player Name */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-display font-bold text-xs truncate ${isUser ? 'text-blue-700 font-black' : 'text-[#0b1536]'}`}>
                          {entry.playerName}
                        </span>
                        {isUser && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-display leading-tight shadow-2xs">
                            YOU
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 sm:hidden">
                          • {entry.clubName}
                        </span>
                      </div>
                    </td>

                    {/* Club */}
                    <td className="py-2 px-3 text-slate-600 text-xs hidden sm:table-cell">
                      {entry.clubName}
                    </td>

                    {/* Appearances */}
                    <td className="py-2 px-3 text-center text-slate-500 text-xs font-mono">
                      {entry.appearances}
                    </td>

                    {/* Stat Value */}
                    <td className="py-2 px-4 text-center font-display font-black text-xs sm:text-sm text-blue-700">
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
