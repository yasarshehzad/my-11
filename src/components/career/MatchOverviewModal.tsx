'use client';

import React, { useState, useMemo } from 'react';
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
import { getAiClubMatchdaySquad } from '../../career/squadGenerator';
import { IconClose, IconStar } from './GameIcons';
import { Button, Eyebrow, Tag } from '@/components/ui';

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
    ? 'Wembley Stadium (neutral)'
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
    name: fixture.scorers && fixture.scorers.length > 0 ? fixture.scorers[0].name : 'Star performer',
    clubId: fixture.scorers && fixture.scorers.length > 0 ? fixture.scorers[0].clubId : homeClub.id,
    rating: 8.4,
  };
  const motmClub = clubsMap.get(motm.clubId) || homeClub;

  // Opponent squad and key threat detection for pre-match preview
  const opponentClub = isUserHome ? awayClub : homeClub;
  const opponentSquadData = useMemo(() => {
    return getAiClubMatchdaySquad(opponentClub, save.season);
  }, [opponentClub, save.season]);

  const dangerPlayer = opponentSquadData.dangerPlayer;

  const [activeTab, setActiveTab] = useState<'stats' | 'ratings'>('stats');

  const hasPlayerRatings = fixture.playerRatings && Object.keys(fixture.playerRatings).length > 0;
  const playerMap = useMemo(() => new Map(save.squad.map((p) => [p.id, p])), [save.squad]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto animate-fade-in motion-reduce:animate-none"
      onClick={onClose}
    >
      <div
        data-office-ui="true"
        className="bg-[var(--surface-card)] rounded-xl p-4 sm:p-6 max-w-xl w-full space-y-4 shadow-sm relative my-auto max-h-[90dvh] overflow-y-auto scrollbar-none border border-[var(--border-subtle)] text-[var(--ink-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <Eyebrow>{type === 'result' ? 'Match result' : 'Match preview'}</Eyebrow>
            <h2 className="text-base font-display font-semibold text-[var(--ink-primary)] leading-snug">
              {roundTitle} · {competitionTitle}
            </h2>
          </div>
          <button
            type="button"
            data-office-ui="true"
            onClick={onClose}
            aria-label="Close modal"
            className="w-10 h-10 -mr-2 -mt-2 rounded-lg flex items-center justify-center text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)] transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Clash & Scoreline Banner */}
        <div className="rounded-xl p-4 space-y-3 bg-[var(--surface-subcard)] border border-[var(--border-subtle)]">
          <div className="flex items-start justify-between gap-2 sm:gap-6">
            {/* Home Club */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1.5 min-w-0">
              <div
                data-force-white="true"
                className="club-crest w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-[var(--border-subtle)] flex items-center justify-center text-xs sm:text-sm font-semibold text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${homeClub.primaryColor}, ${homeClub.secondaryColor})`,
                }}
              >
                {homeClub.shortName}
              </div>
              <div className="min-w-0 w-full">
                <h4 className="font-display font-semibold text-xs sm:text-sm text-[var(--ink-primary)] line-clamp-2 leading-snug">
                  {getEffectiveClubName(homeClub, save.club)}
                </h4>
                <span className="block text-xs text-[var(--ink-muted)] mt-0.5">
                  {isUserHome ? (
                    'You · Home'
                  ) : (
                    'Home'
                  )}
                </span>
              </div>
            </div>

            {/* Score / VS Display */}
            <div className="flex flex-col items-center justify-center shrink-0 px-1.5 sm:px-2 space-y-1">
              {fixture.played ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5">
                    <div className="font-display font-bold text-2xl sm:text-3xl text-[var(--ink-primary)] tabular-nums tracking-tight">
                      {fixture.homeScore} - {fixture.awayScore}
                    </div>
                    {fixture.afterExtraTime && (
                      <span className="text-xs text-[var(--ink-muted)]">AET</span>
                    )}
                  </div>
                  {cupFixture?.penalties && (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs text-[var(--ink-secondary)] tabular-nums">
                        ({cupFixture.penalties.homePenalties} - {cupFixture.penalties.awayPenalties} pens)
                      </span>
                      {cupFixture.penalties.kicks && cupFixture.penalties.kicks.length > 0 && (
                        <div className="flex items-center gap-1 mt-0.5" title="Penalty shootout kicks">
                          {cupFixture.penalties.kicks.map((k, i) => (
                            <span
                              key={i}
                              className={`w-2 h-2 rounded-full inline-block ${
                                k.scored ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {isUserMatch && (
                    <Tag tone={userWon ? 'success' : isDraw ? 'warning' : 'danger'}>
                      {userWon ? 'Victory' : isDraw ? 'Draw' : 'Defeat'}
                    </Tag>
                  )}
                </div>
              ) : (
                <span className="text-sm font-medium text-[var(--ink-muted)] pt-3">v</span>
              )}
            </div>

            {/* Away Club */}
            <div className="flex-1 flex flex-col items-center text-center space-y-1.5 min-w-0">
              <div
                data-force-white="true"
                className="club-crest w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-[var(--border-subtle)] flex items-center justify-center text-xs sm:text-sm font-semibold text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${awayClub.primaryColor}, ${awayClub.secondaryColor})`,
                }}
              >
                {awayClub.shortName}
              </div>
              <div className="min-w-0 w-full">
                <h4 className="font-display font-semibold text-xs sm:text-sm text-[var(--ink-primary)] line-clamp-2 leading-snug">
                  {getEffectiveClubName(awayClub, save.club)}
                </h4>
                <span className="block text-xs text-[var(--ink-muted)] mt-0.5">
                  {isUserAway ? (
                    'You · Away'
                  ) : (
                    'Away'
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-[var(--ink-muted)] pt-2 border-t border-[var(--border-subtle)]">
            <span className="min-w-0 truncate">{venueDisplay}</span>
            <span>{formatCareerDate(fixture.date, save.settings.dateFormat, 'long')}</span>
          </div>
        </div>

        {/* MODE A: PLAYED MATCH RESULTS & STATISTICS */}
        {type === 'result' && (
          <div className="space-y-4">
            {/* Goalscorers Grid */}
            <div className="office-subcard rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-medium text-[var(--ink-muted)]">Goalscorers</h3>

              {(fixture.homeScore || 0) + (fixture.awayScore || 0) === 0 ? (
                <div className="text-xs text-[var(--ink-secondary)]">
                  No goals.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-xs divide-x divide-[var(--border-subtle)] pt-1">
                  {/* Home Scorers */}
                  <div className="space-y-1.5 pr-2 min-w-0">
                    <span className="text-xs font-medium text-[var(--ink-secondary)] block truncate">
                      {getEffectiveClubName(homeClub, save.club)} ({homeScorers.length})
                    </span>
                    {homeScorers.length > 0 ? (
                      homeScorers.map((s, idx) => (
                        <div key={idx} className="flex flex-col text-xs text-[var(--ink-primary)]">
                          <div className="flex items-center gap-1 min-w-0">
                                                        <span className="font-medium truncate">{s.name}</span>
                            <span className="text-[var(--ink-muted)] text-xs shrink-0 tabular-nums">
                              {s.minute}&apos;{s.isPenalty ? ' pen' : ''}
                            </span>
                          </div>
                          {s.assisterName && (
                            <span className="text-xs text-[var(--ink-muted)] truncate">
                              Assist: {s.assisterName}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-[var(--ink-muted)]">—</span>
                    )}
                  </div>

                  {/* Away Scorers */}
                  <div className="space-y-1.5 pl-3 min-w-0">
                    <span className="text-xs font-medium text-[var(--ink-secondary)] block truncate">
                      {getEffectiveClubName(awayClub, save.club)} ({awayScorers.length})
                    </span>
                    {awayScorers.length > 0 ? (
                      awayScorers.map((s, idx) => (
                        <div key={idx} className="flex flex-col text-xs text-[var(--ink-primary)]">
                          <div className="flex items-center gap-1 min-w-0">
                                                        <span className="font-medium truncate">{s.name}</span>
                            <span className="text-[var(--ink-muted)] text-xs shrink-0 tabular-nums">
                              {s.minute}&apos;{s.isPenalty ? ' pen' : ''}
                            </span>
                          </div>
                          {s.assisterName && (
                            <span className="text-xs text-[var(--ink-muted)] truncate">
                              Assist: {s.assisterName}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-[var(--ink-muted)]">—</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Man of the Match */}
            <div className="office-subcard rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-medium text-[var(--ink-muted)] block">Man of the match</span>
                <span className="text-sm text-[var(--ink-primary)] block truncate">
                  <span className="font-semibold">{motm.name}</span>
                  <span className="text-[var(--ink-muted)]"> · {getEffectiveClubName(motmClub, save.club)}</span>
                </span>
              </div>
              <span className="font-display font-semibold text-base text-[var(--ink-primary)] tabular-nums shrink-0">{motm.rating.toFixed(1)}</span>
            </div>

            {/* Tab switch if player ratings exist */}
            {hasPlayerRatings && (
              <div className="flex bg-[var(--surface-elevated)] p-1 rounded-lg gap-1" role="group" aria-label="Result view">
                <button
                  type="button"
                  onClick={() => setActiveTab('stats')}
                  className={`flex-1 min-h-9 text-xs font-medium rounded-md transition-colors inline-flex items-center justify-center cursor-pointer ${
                    activeTab === 'stats'
                      ? 'bg-[var(--surface-card)] text-[var(--ink-primary)] font-semibold'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  <span>Match stats</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ratings')}
                  className={`flex-1 min-h-9 text-xs font-medium rounded-md transition-colors inline-flex items-center justify-center cursor-pointer ${
                    activeTab === 'ratings'
                      ? 'bg-[var(--surface-card)] text-[var(--ink-primary)] font-semibold'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  <span>Player ratings</span>
                </button>
              </div>
            )}

            {/* Player Ratings Tab Content */}
            {activeTab === 'ratings' && hasPlayerRatings && (
              <div className="office-subcard rounded-xl px-4 py-2 sm:px-5">
                <div className="divide-y divide-[var(--border-subtle)]">
                  {Object.entries(fixture.playerRatings || {})
                    .map(([id, rating]) => {
                      const p = playerMap.get(id);
                      const isStarter = (fixture.starterPlayerIds || []).includes(id);
                      return {
                        id,
                        rating: Number(rating),
                        name: p ? p.name : id,
                        position: p ? p.position : 'SUB',
                        isStarter,
                        isMotm: motm.name.toLowerCase() === (p ? p.name.toLowerCase() : id.toLowerCase()),
                      };
                    })
                    .sort((a, b) => b.rating - a.rating)
                    .map((item) => (
                      <div key={item.id} className="py-2 flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-8 text-xs text-[var(--ink-muted)] shrink-0">
                            {item.position}
                          </span>
                          <span className="font-medium text-[var(--ink-primary)] truncate">
                            {item.name}
                          </span>
                          {!item.isStarter && (
                            <span className="text-xs text-[var(--ink-muted)] shrink-0">Sub</span>
                          )}
                          {item.isMotm && (
                            <IconStar className="w-3 h-3 text-amber-500 shrink-0" filled />
                          )}
                        </div>
                        <span
                          className={`font-semibold text-sm tabular-nums shrink-0 ${
                            item.rating >= 8.0
                              ? 'text-emerald-700'
                              : item.rating >= 6.0
                              ? 'text-[var(--ink-primary)]'
                              : 'text-rose-700'
                          }`}
                        >
                          {item.rating.toFixed(1)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Manager Match Statistics (shown if stats active or no ratings) */}
            {(activeTab === 'stats' || !hasPlayerRatings) && (
              <div className="office-subcard rounded-xl p-4 sm:p-5 space-y-3">
                {!hasPlayerRatings && (
                  <h3 className="text-xs font-medium text-[var(--ink-muted)]">Match stats</h3>
                )}

                {/* Possession Comparison Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs tabular-nums font-bold">
                    <span className="text-[#1d5eff]">{stats.homePossession}%</span>
                    <span className="text-xs font-sans font-normal text-[var(--ink-secondary)]">Possession</span>
                    <span className="text-[#7c3aed]">{stats.awayPossession}%</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--surface-elevated)] rounded-full overflow-hidden flex">
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
                    ...(stats.homeXg !== undefined && stats.awayXg !== undefined
                      ? [{ label: 'xG', home: stats.homeXg.toFixed(2), away: stats.awayXg.toFixed(2) }]
                      : []),
                    { label: 'Shots', home: stats.homeShots, away: stats.awayShots },
                    { label: 'Shots on target', home: stats.homeShotsOnTarget, away: stats.awayShotsOnTarget },
                    ...(stats.homeBigChances !== undefined && stats.awayBigChances !== undefined
                      ? [{ label: 'Big chances', home: stats.homeBigChances, away: stats.awayBigChances }]
                      : []),
                    ...(stats.homeSaves !== undefined && stats.awaySaves !== undefined
                      ? [{ label: 'Saves', home: stats.homeSaves, away: stats.awaySaves }]
                      : []),
                    { label: 'Corners', home: stats.homeCorners, away: stats.awayCorners },
                    { label: 'Fouls', home: stats.homeFouls, away: stats.awayFouls },
                  ].map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)] last:border-b-0">
                      <span className="font-medium text-[var(--ink-primary)] tabular-nums w-12 text-left">{row.home}</span>
                      <span className="text-xs text-[var(--ink-secondary)]">{row.label}</span>
                      <span className="font-medium text-[var(--ink-primary)] tabular-nums w-12 text-right">{row.away}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE B: PRE-MATCH TACTICAL DOSSIER */}
        {type === 'preview' && (
          <div className="space-y-4">
            {/* Standings & Head-to-Head Form Comparison */}
            <div className="office-subcard rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-medium text-[var(--ink-muted)]">League table and form</h3>

              <div className="grid grid-cols-2 gap-3 text-xs divide-x divide-[var(--border-subtle)]">
                {/* Home Club Standing */}
                <div className="space-y-1.5 pr-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--ink-secondary)]">Position</span>
                    <span className="font-semibold text-[var(--ink-primary)] tabular-nums">#{homeRank || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--ink-secondary)]">Points</span>
                    <span className="font-medium text-[var(--ink-primary)] tabular-nums">{homeStanding?.points ?? 0} pts</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--ink-secondary)]">Goal diff</span>
                    <span className="font-medium text-[var(--ink-primary)] tabular-nums">
                      {(homeStanding?.goalDifference ?? 0) > 0 ? `+${homeStanding?.goalDifference}` : homeStanding?.goalDifference ?? 0}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-xs text-[var(--ink-secondary)] block mb-1">Form</span>
                    <div className="flex gap-1">
                      {(homeStanding?.form || ['W', 'D', 'W', 'L', 'W']).map((f, i) => (
                        <span
                          key={i}
                          className={`w-5 h-5 rounded text-2xs font-semibold flex items-center justify-center ${
                            f === 'W' ? 'bg-emerald-50 text-emerald-800' : f === 'D' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-800'
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
                    <span className="text-xs text-[var(--ink-secondary)]">Position</span>
                    <span className="font-semibold text-[var(--ink-primary)] tabular-nums">#{awayRank || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--ink-secondary)]">Points</span>
                    <span className="font-medium text-[var(--ink-primary)] tabular-nums">{awayStanding?.points ?? 0} pts</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--ink-secondary)]">Goal diff</span>
                    <span className="font-medium text-[var(--ink-primary)] tabular-nums">
                      {(awayStanding?.goalDifference ?? 0) > 0 ? `+${awayStanding?.goalDifference}` : awayStanding?.goalDifference ?? 0}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-xs text-[var(--ink-secondary)] block mb-1">Form</span>
                    <div className="flex gap-1">
                      {(awayStanding?.form || ['D', 'W', 'L', 'W', 'D']).map((f, i) => (
                        <span
                          key={i}
                          className={`w-5 h-5 rounded text-2xs font-semibold flex items-center justify-center ${
                            f === 'W' ? 'bg-emerald-50 text-emerald-800' : f === 'D' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-800'
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

            {/* Opponent danger man */}
            <div className="office-subcard rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-medium text-[var(--ink-muted)] block">Danger man</span>
                <span className="text-sm text-[var(--ink-primary)] block truncate">
                  <span className="font-semibold">{dangerPlayer.name}</span>
                  <span className="text-[var(--ink-muted)]"> · {dangerPlayer.position}</span>
                </span>
              </div>
              <span className="font-semibold text-sm text-[var(--ink-primary)] tabular-nums shrink-0">{dangerPlayer.rating} OVR</span>
            </div>

            {/* Matchday Action Buttons */}
            {onPlayInteractiveMatch && onPlayInstantMatch && (
              <div className="grid grid-cols-2 gap-2 pt-1 pb-0.5">
                <Button
                  variant="primary"
                  className="min-h-11 px-3"
                  data-office-ui="true"
                  onClick={() => {
                    onClose();
                    onPlayInteractiveMatch();
                  }}
                >
                  Play match
                </Button>
                <Button
                  variant="secondary"
                  className="min-h-11 px-3"
                  data-office-ui="true"
                  onClick={() => {
                    onClose();
                    onPlayInstantMatch();
                  }}
                >
                  Instant result
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
