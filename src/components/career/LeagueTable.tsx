'use client';

import React from 'react';
import { ClubStanding, Club } from '../../career/types';
import { getQualificationZone } from '../../career/table';
import { getAllClubs, getEffectiveClubName, getClubsWithUserClub } from '../../career/clubs';

interface LeagueTableProps {
  standings: ClubStanding[];
  userClubId: string;
  userClub?: Club;
}

export function LeagueTable({ standings, userClubId, userClub }: LeagueTableProps) {
  const allClubs = getClubsWithUserClub(userClub);
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));
  const totalPlayed = standings.reduce((sum, r) => sum + r.played, 0);
  const isPreSeason = totalPlayed === 0;

  return (
    <div className="space-y-4">
      {/* Informative Pre-Season State */}
      {isPreSeason && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-950 border border-emerald-500/30 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg shrink-0">⚡</span>
            <div className="min-w-0">
              <span className="font-display font-black text-emerald-400 uppercase tracking-wider block text-xs">
                Pre-Season Standings • Matchday 1 Pending
              </span>
              <span className="text-[11px] text-slate-300 truncate block">
                All 20 clubs start level on 0 points. Head to Office to play your opening league fixture!
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Table Container */}
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
    </div>
  );
}
