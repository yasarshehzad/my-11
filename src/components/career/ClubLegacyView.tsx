'use client';

import React, { useMemo } from 'react';
import { CareerSaveFile, CareerPlayer } from '../../career/types';
import { getEffectiveClubName, ALL_CAREER_CLUBS, getClubsWithUserClub } from '../../career/clubs';
import { formatCareerCurrency } from '../../career/formatters';
import { IconTrophy, IconMedal, IconCalendar } from './GameIcons';

const LINK_BUTTON_CLASS =
  'min-h-[40px] px-2 text-xs font-display font-bold text-[#1d5eff] underline underline-offset-4 cursor-pointer';

interface ClubLegacyViewProps {
  save: CareerSaveFile;
  onNavigateCups?: () => void;
  onNavigateTable?: () => void;
}

function getTotalPlayerGoals(p: CareerPlayer): number {
  const cur = p.seasonStats?.goals || 0;
  const hist = (p.historyStats || []).reduce((sum, s) => sum + (s.goals || 0), 0);
  return cur + hist;
}

function getTotalPlayerAssists(p: CareerPlayer): number {
  const cur = p.seasonStats?.assists || 0;
  const hist = (p.historyStats || []).reduce((sum, s) => sum + (s.assists || 0), 0);
  return cur + hist;
}

function getTotalPlayerAppearances(p: CareerPlayer): number {
  const cur = p.seasonStats?.appearances || 0;
  const hist = (p.historyStats || []).reduce((sum, s) => sum + (s.appearances || 0), 0);
  return cur + hist;
}

export function ClubLegacyView({
  save,
  onNavigateCups,
  onNavigateTable,
}: ClubLegacyViewProps) {
  const clubName = getEffectiveClubName(save.club);
  const currency = save.settings?.currency;
  const numFormat = save.settings?.numberFormat;

  const stats = useMemo(() => {
    const history = save.seasonHistory || [];
    const currentStanding = (save.standings || []).find((s) => s.clubId === save.club.id);

    const histPlayed = history.reduce((acc, s) => acc + s.won + s.drawn + s.lost, 0);
    const histWon = history.reduce((acc, s) => acc + s.won, 0);
    const histDrawn = history.reduce((acc, s) => acc + s.drawn, 0);
    const histLost = history.reduce((acc, s) => acc + s.lost, 0);
    const histGF = history.reduce((acc, s) => acc + s.goalsFor, 0);
    const histGA = history.reduce((acc, s) => acc + s.goalsAgainst, 0);

    const curPlayed = currentStanding?.played || 0;
    const curWon = currentStanding?.won || 0;
    const curDrawn = currentStanding?.drawn || 0;
    const curLost = currentStanding?.lost || 0;
    const curGF = currentStanding?.goalsFor || 0;
    const curGA = currentStanding?.goalsAgainst || 0;

    const totalPlayed = histPlayed + curPlayed;
    const totalWon = histWon + curWon;
    const totalDrawn = histDrawn + curDrawn;
    const totalLost = histLost + curLost;
    const totalGF = histGF + curGF;
    const totalGA = histGA + curGA;
    const winPct = totalPlayed > 0 ? Math.round((totalWon / totalPlayed) * 100) : 0;

    // Best league finish & points
    const bestHistoryPos =
      history.length > 0 ? Math.min(...history.map((s) => s.finalPosition)) : null;
    const bestPoints =
      history.length > 0 ? Math.max(...history.map((s) => s.points)) : currentStanding?.points ?? 0;

    // Biggest win this season from played fixtures
    const allClubs = getClubsWithUserClub(save.club, save.activeLeagueClubIds, save.settings?.databaseSeason);
    const clubMap = new Map(allClubs.map((c) => [c.id, getEffectiveClubName(c)]));
    const fallbackMap = new Map(ALL_CAREER_CLUBS.map((c) => [c.id, getEffectiveClubName(c)]));

    let biggestWin: { margin: number; scoreline: string; opponent: string } | null = null;
    for (const fix of save.fixtures || []) {
      if (!fix.played) continue;
      const isHome = fix.homeClubId === save.club.id;
      const isAway = fix.awayClubId === save.club.id;
      if (!isHome && !isAway) continue;
      const myScore = isHome ? (fix.homeScore ?? 0) : (fix.awayScore ?? 0);
      const oppScore = isHome ? (fix.awayScore ?? 0) : (fix.homeScore ?? 0);
      const margin = myScore - oppScore;
      if (margin > 0 && (!biggestWin || margin > biggestWin.margin || (margin === biggestWin.margin && myScore > Number(biggestWin.scoreline.split('-')[0])))) {
        const oppId = isHome ? fix.awayClubId : fix.homeClubId;
        const oppName = clubMap.get(oppId) || fallbackMap.get(oppId) || 'Opponent';
        biggestWin = {
          margin,
          scoreline: `${myScore}-${oppScore}`,
          opponent: oppName,
        };
      }
    }

    // Transfer records
    const userTransfers = save.transfersHistory || [];
    const signings = userTransfers
      .filter((t) => t.type === 'signing' || t.type === 'free_signing' || t.type === 'pre_contract')
      .sort((a, b) => (b.fee || 0) - (a.fee || 0));
    const sales = userTransfers
      .filter((t) => t.type === 'sale')
      .sort((a, b) => (b.fee || 0) - (a.fee || 0));

    const recordSigning = signings[0] || null;
    const recordSale = sales[0] || null;

    // Squad leaders across career at club
    const squadByGoals = [...(save.squad || [])]
      .map((p) => ({ player: p, val: getTotalPlayerGoals(p) }))
      .filter((x) => x.val > 0)
      .sort((a, b) => b.val - a.val);
    const squadByAssists = [...(save.squad || [])]
      .map((p) => ({ player: p, val: getTotalPlayerAssists(p) }))
      .filter((x) => x.val > 0)
      .sort((a, b) => b.val - a.val);
    const squadByApps = [...(save.squad || [])]
      .map((p) => ({ player: p, val: getTotalPlayerAppearances(p) }))
      .filter((x) => x.val > 0)
      .sort((a, b) => b.val - a.val);

    // Group trophies by competition
    const trophyGroups = new Map<string, { name: string; years: number[] }>();
    for (const t of save.trophies || []) {
      const existing = trophyGroups.get(t.competitionName);
      if (existing) {
        existing.years.push(t.year);
      } else {
        trophyGroups.set(t.competitionName, { name: t.competitionName, years: [t.year] });
      }
    }

    return {
      totalPlayed,
      totalWon,
      totalDrawn,
      totalLost,
      totalGF,
      totalGA,
      winPct,
      bestHistoryPos,
      bestPoints,
      biggestWin,
      recordSigning,
      recordSale,
      topScorer: squadByGoals[0] || null,
      topAssister: squadByAssists[0] || null,
      mostAppearances: squadByApps[0] || null,
      trophyGroups: Array.from(trophyGroups.values()),
      seasonsCompleted: history.length,
    };
  }, [save]);

  const trophies = save.trophies || [];
  const history = save.seasonHistory || [];
  const goalDiff = stats.totalGF - stats.totalGA;

  const records: { label: string; value: string; note?: string }[] = [
    {
      label: 'League record (W-D-L)',
      value: `${stats.totalWon}-${stats.totalDrawn}-${stats.totalLost}`,
      note: `${stats.totalPlayed} played`,
    },
    {
      label: 'Goals for / against',
      value: `${stats.totalGF} : ${stats.totalGA}`,
      note: `GD ${goalDiff >= 0 ? `+${goalDiff}` : goalDiff}`,
    },
    { label: 'Best finish', value: stats.bestHistoryPos ? `#${stats.bestHistoryPos}` : 'In progress' },
    { label: 'Best points total', value: String(stats.bestPoints) },
    {
      label: 'Biggest win (this season)',
      value: stats.biggestWin ? stats.biggestWin.scoreline : '—',
      note: stats.biggestWin ? `vs ${stats.biggestWin.opponent}` : undefined,
    },
    {
      label: 'Record signing',
      value: stats.recordSigning ? stats.recordSigning.playerName : '—',
      note: stats.recordSigning
        ? stats.recordSigning.fee > 0
          ? formatCareerCurrency(stats.recordSigning.fee, currency, numFormat)
          : 'Free transfer'
        : undefined,
    },
    {
      label: 'Record sale',
      value: stats.recordSale ? stats.recordSale.playerName : '—',
      note: stats.recordSale ? formatCareerCurrency(stats.recordSale.fee, currency, numFormat) : undefined,
    },
    {
      label: 'Top scorer',
      value: stats.topScorer ? stats.topScorer.player.name : '—',
      note: stats.topScorer ? String(stats.topScorer.val) : undefined,
    },
    {
      label: 'Most assists',
      value: stats.topAssister ? stats.topAssister.player.name : '—',
      note: stats.topAssister ? String(stats.topAssister.val) : undefined,
    },
    {
      label: 'Most appearances',
      value: stats.mostAppearances ? stats.mostAppearances.player.name : '—',
      note: stats.mostAppearances ? String(stats.mostAppearances.val) : undefined,
    },
  ];

  return (
    <div id="club-legacy-view" data-office-ui="true" className="space-y-4 w-full scroll-mt-20">
      {/* Club banner */}
      <section className="my11-canopy-card">
        <div className="my11-canopy-head p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 text-left min-w-0">
            <h2 className="text-xl sm:text-2xl font-display font-black uppercase tracking-tight text-white truncate">
              {clubName}
            </h2>
            <p className="text-xs text-slate-200">
              {save.manager?.name || 'Manager'} · Season {save.season.seasonNumber} ({save.season.yearStart}/{String((save.season.yearStart + 1) % 100).padStart(2, '0')})
            </p>
          </div>

          <dl className="flex gap-6 shrink-0">
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-300">Trophies</dt>
              <dd className="text-lg font-display font-black text-amber-300">{trophies.length}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-300">Win Rate</dt>
              <dd className="text-lg font-display font-black text-emerald-300">{stats.winPct}%</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Trophy Cabinet */}
      <section className="office-floating-card rounded-3xl p-4 sm:p-5 border border-amber-200/80 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--office-divider)] pb-2.5">
          <h3 className="text-sm font-display font-black text-[#0b1536] uppercase tracking-tight flex items-center gap-2">
            <IconTrophy className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Trophy Cabinet</span>
          </h3>
          {onNavigateCups && (
            <button type="button" onClick={onNavigateCups} className={LINK_BUTTON_CLASS}>
              Cup brackets
            </button>
          )}
        </div>

        {trophies.length === 0 ? (
          <p className="pt-3 text-xs text-slate-500">No trophies yet. League titles and cup wins appear here.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {stats.trophyGroups.map((group) => (
              <li key={group.name} className="py-2.5 flex items-baseline justify-between gap-3 text-xs">
                <span className="font-display font-black text-[#0b1536] uppercase min-w-0">
                  {group.name}
                  {group.years.length > 1 && <span className="text-amber-700"> ×{group.years.length}</span>}
                </span>
                <span className="font-mono font-bold text-amber-800 text-right">{group.years.join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Records */}
      <section className="office-floating-card rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm">
        <h3 className="text-sm font-display font-black text-[#0b1536] uppercase tracking-tight flex items-center gap-2 border-b border-[var(--office-divider)] pb-2.5">
          <IconMedal className="w-4 h-4 text-[#1d5eff] shrink-0" />
          <span>Records</span>
        </h3>
        <dl className="divide-y divide-slate-100 text-xs">
          {records.map((row) => (
            <div key={row.label} className="py-2.5 flex items-baseline justify-between gap-3">
              <dt className="text-slate-500 shrink-0">{row.label}</dt>
              <dd className="min-w-0 text-right">
                <span className="font-display font-black text-[#0b1536]">{row.value}</span>
                {row.note && <span className="text-slate-500 font-mono"> · {row.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Season-by-Season History */}
      <section className="office-floating-card rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--office-divider)] pb-2.5">
          <h3 className="text-sm font-display font-black text-[#0b1536] uppercase tracking-tight flex items-center gap-2">
            <IconCalendar className="w-4 h-4 text-[#1d5eff] shrink-0" />
            <span>Season History</span>
          </h3>
          {onNavigateTable && (
            <button type="button" onClick={onNavigateTable} className={LINK_BUTTON_CLASS}>
              League table
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="pt-3 text-xs text-slate-500">
            Season {save.season.seasonNumber} is under way. It is archived here after all 38 matchdays.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {[...history].reverse().map((rec) => {
              const gd = rec.goalsFor - rec.goalsAgainst;
              return (
                <li key={`${rec.seasonNumber}_${rec.yearLabel}`} className="py-3 space-y-1 text-xs">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display font-black text-[#0b1536] uppercase">
                      {rec.finalPosition === 1 ? 'Champions' : `Finished #${rec.finalPosition}`}
                    </span>
                    <span className="font-mono font-bold text-slate-500 shrink-0">
                      S{rec.seasonNumber} · {rec.yearLabel}
                    </span>
                  </div>
                  <p className="font-mono text-slate-600">
                    {rec.points} pts · {rec.won}W-{rec.drawn}D-{rec.lost}L · GD {gd >= 0 ? `+${gd}` : gd} ({rec.goalsFor}-{rec.goalsAgainst})
                  </p>
                  {rec.trophiesWon.length > 0 && (
                    <p className="font-bold text-amber-800 flex items-start gap-1.5">
                      <IconTrophy className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{rec.trophiesWon.join(', ')}</span>
                    </p>
                  )}
                  {(rec.topScorerName || rec.europeanQualification) && (
                    <p className="text-[11px] text-slate-500">
                      {[
                        rec.topScorerName ? `Top scorer: ${rec.topScorerName} (${rec.topScorerGoals || 0})` : null,
                        rec.europeanQualification ? `Europe: ${rec.europeanQualification}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                  {((rec.promotedClubNames?.length ?? 0) > 0 || (rec.relegatedClubNames?.length ?? 0) > 0) && (
                    <p className="text-[11px] text-slate-500">
                      {[
                        rec.promotedClubNames?.length ? `Promoted: ${rec.promotedClubNames.join(', ')}` : null,
                        rec.relegatedClubNames?.length ? `Relegated: ${rec.relegatedClubNames.join(', ')}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}