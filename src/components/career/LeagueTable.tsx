'use client';

import React, { useState } from 'react';
import { ClubStanding, Club, LeagueFixture, CareerPlayer, SeasonHistoryRecord } from '../../career/types';
import { getQualificationZone } from '../../career/table';
import { getEffectiveClubName, getClubsWithUserClub } from '../../career/clubs';
import { getLeagueLeaderboards, LeagueLeaderboardEntry } from '../../career/playerStats';
import { SectionHeader } from '../ui';

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
  { id: 'clean_sheets', label: 'Clean sheets' },
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

  const getRankBadge = (rank: number) => (
    <span
      className={`text-xs tabular-nums ${
        rank <= 3 ? 'font-semibold text-[var(--ink-primary)]' : 'text-[var(--ink-muted)]'
      }`}
    >
      {rank}
    </span>
  );

  return (
    <section id="league-table-section" data-office-ui="true" aria-label="League Standings and Player Stats" className="space-y-3.5 scroll-mt-20 w-full">
      {/* Sub-tab Switcher: Standings vs Player Stats Leaderboards */}
      <nav aria-label="League navigation" className="flex items-center gap-4 px-1 border-b border-[var(--border-subtle)] overflow-x-auto no-scrollbar">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={activeSubTab === tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`min-h-10 px-0.5 text-sm text-center whitespace-nowrap cursor-pointer transition-colors border-b-2 ${
              activeSubTab === tab.id ? 'border-[var(--accent-primary)] font-semibold text-[var(--ink-primary)]' : 'border-transparent font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {isPreSeason && (
        <p className="px-1 text-xs text-[var(--ink-secondary)]">
          Pre-season: {activeSubTab === 'standings' ? 'the table' : 'stats'} will update after Matchday 1.
        </p>
      )}

      {/* VIEW 1: STANDINGS TABLE */}
      {activeSubTab === 'standings' && (
        <>
          <div className="office-floating-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums border-collapse">
                <thead className="sticky top-0 bg-[var(--surface-subcard)] z-10 text-2xs font-medium text-[var(--ink-muted)] border-b border-[var(--border-subtle)] select-none">
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
                    <th className="py-2.5 px-2.5 sm:px-4 text-center font-semibold text-[var(--ink-primary)]">Pts</th>
                    <th className="py-2.5 px-3 text-center hidden md:table-cell">Form</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-card)]">
                  {standings.map((row, index) => {
                    const position = index + 1;
                    const club = clubsMap.get(row.clubId);
                    const isUserClub = row.clubId === userClubId;
                    const zone = getQualificationZone(position);

                    const posBadgeClass = 'text-[var(--ink-secondary)]';
                    let rowBorderClass = 'border-l-[3px] border-l-transparent';

                    if (zone === 'champions_league') {
                      rowBorderClass = 'border-l-[3px] border-l-blue-600';
                    } else if (zone === 'europa_league') {
                      rowBorderClass = 'border-l-[3px] border-l-amber-500';
                    } else if (zone === 'conference_league') {
                      rowBorderClass = 'border-l-[3px] border-l-teal-500';
                    } else if (zone === 'relegation') {
                      rowBorderClass = 'border-l-[3px] border-l-rose-500';
                    }

                    const displayName = club ? getEffectiveClubName(club) : row.clubId;

                    return (
                      <tr
                        key={row.clubId}
                        className={`${rowBorderClass} ${
                          isUserClub ? 'bg-[var(--surface-elevated)] font-semibold' : ''
                        }`}
                      >
                        {/* Position */}
                        <td className={`py-2 px-2 text-center text-xs ${posBadgeClass}`}>
                          {position}
                        </td>

                        {/* Club */}
                        <td className="py-2 px-2.5 sm:px-4">
                          <div className="flex items-center gap-2 min-w-0">
                            {club && (
                              <div
                                data-force-white="true"
                                className="club-crest w-4 h-4 rounded-full border border-[var(--border-crisp)] flex-shrink-0"
                                style={{ background: club.primaryColor }}
                              />
                            )}
                            <span className="truncate text-xs text-[var(--ink-primary)]">
                              {displayName}
                            </span>
                            {isUserClub && (
                              <span className="text-xs font-normal text-[var(--ink-muted)] shrink-0">You</span>
                            )}
                          </div>
                        </td>

                        {/* P / W / D / L */}
                        <td className="py-2 px-1.5 sm:px-2.5 text-center text-[var(--ink-secondary)] text-xs">{row.played}</td>
                        <td className="py-2 px-1.5 sm:px-2.5 text-center text-[var(--ink-secondary)] text-xs">{row.won}</td>
                        <td className="py-2 px-1.5 sm:px-2.5 text-center text-[var(--ink-secondary)] text-xs">{row.drawn}</td>
                        <td className="py-2 px-1.5 sm:px-2.5 text-center text-[var(--ink-secondary)] text-xs">{row.lost}</td>

                        {/* GF / GA */}
                        <td className="py-2 px-2 text-center text-[var(--ink-secondary)] text-xs hidden sm:table-cell">{row.goalsFor}</td>
                        <td className="py-2 px-2 text-center text-[var(--ink-secondary)] text-xs hidden sm:table-cell">{row.goalsAgainst}</td>

                        {/* GD */}
                        <td className={`py-2 px-1.5 sm:px-2.5 text-center text-xs ${row.goalDifference > 0 ? 'text-emerald-700' : row.goalDifference < 0 ? 'text-rose-700' : 'text-[var(--ink-secondary)]'}`}>
                          {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                        </td>

                        {/* Points */}
                        <td className="py-2 px-2.5 sm:px-4 text-center font-semibold text-sm text-[var(--ink-primary)]">
                          {row.points}
                        </td>

                        {/* Form Dots */}
                        <td className="py-2 px-3 text-center hidden md:table-cell">
                          <div className="flex justify-center items-center gap-1">
                            {row.form.length === 0 && <span className="text-[var(--ink-muted)]">-</span>}
                            {row.form.map((res, i) => (
                              <span
                                key={i}
                                className={`w-5 text-xs font-semibold text-center ${
                                  res === 'W' ? 'text-emerald-700' : res === 'D' ? 'text-amber-700' : 'text-rose-700'
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
          <footer className="px-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs text-[var(--ink-secondary)]">
            <div className="flex items-center gap-x-3.5 gap-y-1.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>1–4: Champions Cup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>5: Challenge Cup</span>
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

            <div className="text-xs text-[var(--ink-muted)]">
              38 matches · 20 clubs
            </div>
          </footer>
        </>
      )}

      {/* VIEW 2: TOP SCORERS / GOLDEN BOOT */}
      {activeSubTab === 'scorers' && (
        <LeaderboardCard
          title="Golden boot race"
          statLabel="Goals"
          entries={leaderboards.topScorers}
          userClubId={userClubId}
          getRankBadge={getRankBadge}
          emptyText="No goals scored yet this season. This list updates as fixtures are played."
        />
      )}

      {/* VIEW 3: TOP ASSISTS / PLAYMAKER */}
      {activeSubTab === 'assists' && (
        <LeaderboardCard
          title="Playmaker award"
          statLabel="Assists"
          entries={leaderboards.topAssists}
          userClubId={userClubId}
          getRankBadge={getRankBadge}
          emptyText="No assists recorded yet this season. This list updates as fixtures are played."
        />
      )}

      {/* VIEW 4: CLEAN SHEETS / GOLDEN GLOVE */}
      {activeSubTab === 'clean_sheets' && (
        <LeaderboardCard
          title="Golden glove"
          statLabel="Clean sheets"
          entries={leaderboards.topCleanSheets}
          userClubId={userClubId}
          getRankBadge={getRankBadge}
          emptyText="No clean sheets recorded yet this season. This list updates as fixtures are played."
        />
      )}

      <p className="text-xs text-[var(--ink-muted)] text-center">Past seasons are listed in the Legacy tab.</p>
    </section>
  );
}

interface LeaderboardCardProps {
  title: string;
  statLabel: string;
  entries: LeagueLeaderboardEntry[];
  userClubId: string;
  getRankBadge: (rank: number) => React.ReactNode;
  emptyText: string;
}

function LeaderboardCard({
  title,
  statLabel,
  entries,
  userClubId,
  getRankBadge,
  emptyText,
}: LeaderboardCardProps) {
  if (entries.length === 0) {
    return (
      <div className="office-subcard rounded-xl p-8 text-center text-[var(--ink-muted)] text-sm">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionHeader title={title} className="px-1" />

      {/* Leaderboard Table */}
      <div className="office-floating-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums border-collapse">
            <thead className="bg-[var(--surface-subcard)] text-2xs font-medium text-[var(--ink-muted)] border-b border-[var(--border-subtle)] select-none">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">Rank</th>
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-3 hidden sm:table-cell">Club</th>
                <th className="py-2.5 px-2 text-center w-12">Apps</th>
                <th className="py-2.5 px-3 text-center font-semibold text-[var(--ink-primary)] w-24">
                  {statLabel}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-card)]">
              {entries.map((entry) => {
                const isUser = entry.isUserPlayer || entry.clubId === userClubId;
                return (
                  <tr
                    key={`${entry.clubId}-${entry.playerName}-${entry.rank}`}
                    className={isUser ? 'bg-[var(--surface-elevated)] font-semibold' : undefined}
                  >
                    {/* Rank Badge */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center">
                        {getRankBadge(entry.rank)}
                      </div>
                    </td>

                    {/* Player Name */}
                    <td className="py-2 px-3">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs text-[var(--ink-primary)]">
                          {entry.playerName}
                        </span>
                        {isUser && (
                          <span className="text-xs font-normal text-[var(--ink-muted)] shrink-0">You</span>
                        )}
                      </div>
                      <div className="text-xs font-normal text-[var(--ink-muted)] sm:hidden">
                        {entry.clubName}
                      </div>
                    </td>

                    {/* Club */}
                    <td className="py-2 px-3 text-[var(--ink-secondary)] text-xs hidden sm:table-cell">
                      {entry.clubName}
                    </td>

                    {/* Appearances */}
                    <td className="py-2 px-2 text-center text-[var(--ink-secondary)] text-xs">
                      {entry.appearances}
                    </td>

                    {/* Stat Value */}
                    <td className="py-2 px-3 text-center font-semibold text-sm text-[var(--ink-primary)]">
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
