'use client';

import React, { useState } from 'react';
import {
  CareerSaveFile,
  LeagueFixture,
  Club,
} from '../../career/types';
import { getAllClubs, getEffectiveClubName, getClubsWithUserClub, getClubById } from '../../career/clubs';
import { CUP_IDS } from '../../career/cups';
import { formatCareerDate } from '../../career/formatters';
import { getNextClubFixture } from '../../career/calendar';
import {
  simulateMatchFixture,
  advanceTimeSkip,
  TimeSkipTarget,
} from '../../career/sim';
import { calculateStandings } from '../../career/table';
import { formatCurrency } from '../../career/finance';
import { isSeasonComplete, getSeasonReviewSummary, advanceToNextSeason } from '../../career/seasons';
import { MatchDayModal } from './MatchDayModal';
import { MatchOverviewModal } from './MatchOverviewModal';
import { InstantMatchSummaryModal } from './InstantMatchSummaryModal';
import { InstantSimLoadingModal } from './InstantSimLoadingModal';
import { FixtureReleaseModal } from './FixtureReleaseModal';

interface FixturesCalendarProps {
  save: CareerSaveFile;
  onUpdateSave: (updated: CareerSaveFile) => void;
  onNotification?: (msg: string) => void;
  onNavigateOffice?: () => void;
}

export function FixturesCalendar({ save, onUpdateSave, onNotification, onNavigateOffice }: FixturesCalendarProps) {
  const [filterScope, setFilterScope] = useState<'my_club' | 'all'>('my_club');
  const [timelineFilter, setTimelineFilter] = useState<'upcoming' | 'recent' | 'all'>('upcoming');
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all');
  const [expandedFixtureIds, setExpandedFixtureIds] = useState<Set<string>>(new Set());
  const [simulating, setSimulating] = useState(false);
  const [activeMatchFixture, setActiveMatchFixture] = useState<LeagueFixture | null>(null);
  const [matchOverviewModal, setMatchOverviewModal] = useState<{
    type: 'result' | 'preview';
    fixture: LeagueFixture;
  } | null>(null);
  const [instantSimResultModal, setInstantSimResultModal] = useState<LeagueFixture | null>(null);
  const [instantSimLoadingData, setInstantSimLoadingData] = useState<{
    simmedFixture: LeagueFixture;
    updatedSave: CareerSaveFile;
    homeClub: Club;
    awayClub: Club;
    competitionTitle: string;
    roundTitle: string;
  } | null>(null);
  const [showSeasonReviewModal, setShowSeasonReviewModal] = useState(false);
  const [showFixtureReleaseCeremonyModal, setShowFixtureReleaseCeremonyModal] = useState(false);

  const fixtures = save.fixtures || [];
  const userClubId = save.club.id;
  const userSquad = save.squad || [];

  const isFixturesReleased = Boolean(save.fixtureReleaseState?.released);
  const releaseDate = save.fixtureReleaseState?.releaseDate || `${save.season.yearStart}-07-08`;
  const isReleaseDateReached = save.season.currentDate >= releaseDate;
  const preseasonCup = save.cups?.[CUP_IDS.PRESEASON];

  const allClubs = getClubsWithUserClub(save.club);
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));

  const nextFixture = getNextClubFixture(fixtures, userClubId);
  const seasonFinished = isSeasonComplete(fixtures, userClubId);
  const seasonSummary = seasonFinished ? getSeasonReviewSummary(save) : null;

  const handleAdvanceSeason = () => {
    const { updatedSave } = advanceToNextSeason(save);
    onUpdateSave(updatedSave);
    setShowSeasonReviewModal(false);
    if (onNotification) {
      onNotification(
        `Welcome to Season ${updatedSave.season.seasonNumber}! Summer transfer window is now open.`
      );
    }
  };

  // Play next user fixture
  const handlePlayNextMatch = () => {
    if (!nextFixture) return;
    setSimulating(true);

    const homeClub = clubsMap.get(nextFixture.homeClubId) || allClubs[0];
    const awayClub = clubsMap.get(nextFixture.awayClubId) || allClubs[1];

    const isUserHome = nextFixture.homeClubId === userClubId;

    // Simulate user match
    const simmed = simulateMatchFixture(
      nextFixture,
      homeClub,
      awayClub,
      isUserHome ? userSquad : undefined,
      !isUserHome ? userSquad : undefined
    );

    // Also simulate other games in this round
    const updatedFixtures = fixtures.map((f) => {
      if (f.id === simmed.id) return simmed;
      if (f.round === nextFixture.round && !f.played) {
        const h = clubsMap.get(f.homeClubId) || allClubs[0];
        const a = clubsMap.get(f.awayClubId) || allClubs[1];
        return simulateMatchFixture(f, h, a);
      }
      return f;
    });

    const updatedStandings = calculateStandings(updatedFixtures, allClubs);

    const updatedSave: CareerSaveFile = {
      ...save,
      season: {
        ...save.season,
        currentDate: nextFixture.date,
      },
      fixtures: updatedFixtures,
      standings: updatedStandings,
    };

    setInstantSimLoadingData({
      simmedFixture: simmed,
      updatedSave,
      homeClub,
      awayClub,
      competitionTitle: 'English Top Flight',
      roundTitle: `Matchday ${nextFixture.round} of 38`,
    });
  };

  const toggleFixtureExpanded = (id: string) => {
    setExpandedFixtureIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Base scope filter (My Fixtures vs All)
  let baseFixtures = fixtures;
  if (filterScope === 'my_club') {
    baseFixtures = baseFixtures.filter(
      (f) => f.homeClubId === userClubId || f.awayClubId === userClubId
    );
  }

  // Timeline filter (Upcoming vs Recent vs All)
  let displayedFixtures = [...baseFixtures];
  if (timelineFilter === 'upcoming') {
    displayedFixtures = displayedFixtures.filter((f) => !f.played);
    displayedFixtures.sort((a, b) => a.round - b.round);
  } else if (timelineFilter === 'recent') {
    displayedFixtures = displayedFixtures.filter((f) => f.played);
    displayedFixtures.sort((a, b) => b.round - a.round);
  } else {
    if (selectedRound !== 'all') {
      displayedFixtures = displayedFixtures.filter((f) => f.round === selectedRound);
    }
  }

  const upcomingCount = baseFixtures.filter((f) => !f.played).length;
  const playedCount = baseFixtures.filter((f) => f.played).length;

  return (
    <div id="fixtures-calendar-root" data-office-ui="true" className="space-y-3.5 w-full">
      {/* Calendar Header Bar */}
      <section className="office-subcard p-2 sm:p-2.5 rounded-2xl flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-xs shadow-2xs shrink-0">
            📅
          </span>
          <div className="min-w-0">
            <span className="text-xs font-display font-black text-[#0b1536] uppercase tracking-wider block truncate">
              Season {save.season.seasonNumber} Fixture Calendar
            </span>
            <span className="text-[10px] font-mono font-bold text-blue-600 block">
              {formatCareerDate(save.season.currentDate, save.settings?.dateFormat)}
            </span>
          </div>
        </div>
        {onNavigateOffice && (
          <button
            onClick={onNavigateOffice}
            className="office-action-btn-primary py-1 px-3 rounded-xl text-white font-display font-black text-[11px] uppercase tracking-wider transition-all shadow-xs shrink-0 cursor-pointer ml-auto flex items-center gap-1 active:scale-95"
          >
            <span>Office / Play</span>
            <span>➔</span>
          </button>
        )}
      </section>

      {/* Season Complete & Transition Spotlight */}
      {seasonFinished && seasonSummary && (
        <section className="office-floating-card border-2 border-amber-400/80 rounded-2xl p-4 sm:p-5 shadow-md space-y-3 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full font-display">
              Season {save.season.seasonNumber} Complete • All 38 Matchdays Played
            </span>
            <span className="text-xs text-amber-700 font-bold flex items-center gap-1">
              <span>🏆</span>
              <span>Season Review</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-0.5">
              <h3 className="text-base sm:text-lg font-display font-black text-[#0b1536]">
                {seasonSummary.leagueTitle ? '👑 League Champions!' : `Season Completed • Finished #${seasonSummary.finalPosition}`}
              </h3>
              <p className="text-xs text-slate-600">
                Prize Money: <span className="text-emerald-700 font-bold">{formatCurrency(seasonSummary.prizeMoney)}</span> • Continental Status: <span className="text-blue-700 font-bold">{seasonSummary.europeanQualification}</span>
              </p>
            </div>

            <button
              onClick={() => setShowSeasonReviewModal(true)}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-display font-black text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer active:scale-95"
            >
              🎉 Review &amp; Advance to Season {save.season.seasonNumber + 1}
            </button>
          </div>
        </section>
      )}

      {/* Pre-Season / Embargo State: Shown when Premier League fixtures are not released yet */}
      {!isFixturesReleased && (
        <section className="space-y-3.5">
          {!isReleaseDateReached ? (
            /* BEFORE RELEASE DAY (July 1 - July 7) */
            <div className="office-floating-card rounded-2xl p-5 sm:p-6 text-center space-y-3 shadow-xs border border-blue-200/80">
              <span className="text-3xl block">🔒</span>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-200 px-3 py-0.5 rounded-full font-display inline-block">
                  Embargo Active • Calendar Compilation
                </span>
                <h3 className="text-base sm:text-lg font-display font-black text-[#0b1536] uppercase tracking-tight mt-1">
                  Official Fixtures Released on 8 July {save.season.yearStart}
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed pt-0.5">
                  The Premier League computer is currently compiling the official 38-game schedule. Advance day-by-day through pre-season in your Office until Fixture Release Day.
                </p>
              </div>

              {onNavigateOffice && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onNavigateOffice}
                    className="office-action-btn-primary py-2 px-4 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                  >
                    <span>➔ Go to Manager Office</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ON OR AFTER RELEASE DAY (July 8+) BUT UNREVEALED */
            <div className="office-floating-card rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 border border-blue-300 bg-gradient-to-br from-blue-50/60 via-white to-purple-50/40">
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-100/80 border border-blue-200 px-2.5 py-0.5 rounded-full font-display">
                  Official Announcement Day • 8 July
                </span>
                <span className="text-xs font-mono font-bold text-slate-600">38 Matches Ready</span>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <h3 className="text-base font-display font-black text-[#0b1536]">
                    📅 Premier League {save.season.yearStart}/{String(save.season.yearStart + 1).slice(2)} Schedule Confirmed!
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md leading-relaxed">
                    The fixture computer has finalized the complete schedule. Launch the animated reveal ceremony to inspect key derbies and opening day, or unlock the calendar immediately.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowFixtureReleaseCeremonyModal(true)}
                    className="office-action-btn-primary py-2 px-3.5 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    🎉 Live Reveal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSave({
                        ...save,
                        fixtureReleaseState: {
                          released: true,
                          releaseDate,
                          hasSeenCeremony: true,
                        },
                      });
                      if (onNotification) onNotification('📅 Full 38-match Premier League schedule revealed!');
                    }}
                    className="py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-display font-bold text-xs uppercase cursor-pointer transition-all active:scale-95 shadow-2xs"
                  >
                    ⏩ Unlock Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pre-Season Tour Friendlies (if scheduled in July) */}
          {preseasonCup && preseasonCup.fixtures && preseasonCup.fixtures.length > 0 && (
            <div className="office-subcard rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">✈️</span>
                  <div>
                    <h4 className="font-display font-black text-xs sm:text-sm text-[#0b1536] uppercase tracking-wider">
                      {preseasonCup.name} • Summer Friendlies
                    </h4>
                    <p className="text-[10px] text-slate-500">Pre-season conditioning tour matches</p>
                  </div>
                </div>
                <span className="text-[10px] text-blue-700 font-mono font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  {preseasonCup.fixtures.filter((f) => f.played).length} / {preseasonCup.fixtures.length} Played
                </span>
              </div>

              <div className="space-y-1.5">
                {preseasonCup.fixtures.map((fix) => {
                  const oppClub = clubsMap.get(fix.awayClubId) || getClubById(fix.awayClubId);
                  return (
                    <div
                      key={fix.id}
                      className="bg-white border border-slate-200/90 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs shadow-2xs hover:border-blue-200 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[9.5px] uppercase font-bold text-blue-600 block">
                          {fix.roundName} • {formatCareerDate(fix.date, 'uk', 'medium')}
                        </span>
                        <div className="font-display font-bold text-[#0b1536] truncate">
                          {getEffectiveClubName(save.club)} vs {oppClub ? getEffectiveClubName(oppClub) : 'Opponent'}
                        </div>
                        {fix.venue && <div className="text-[10px] text-slate-500 font-mono truncate">{fix.venue}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        {fix.played ? (
                          <span className="font-display font-black text-xs sm:text-sm text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                            {fix.homeScore} - {fix.awayScore}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            Scheduled
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* FULL LEAGUE FIXTURES TIMELINE: Visible once released */}
      {isFixturesReleased && (
        <section aria-label="Fixtures list" className="space-y-3">
          {/* Timeline Tabs & Scope Filter */}
          <div className="office-floating-card p-2 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-2">
            {/* Timeline Quick Jump: Upcoming | Recent | All */}
            <nav aria-label="Timeline filters" className="flex items-center gap-0.5 bg-slate-100 border border-slate-200/80 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => {
                  if (timelineFilter === 'upcoming') {
                    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                  } else {
                    setTimelineFilter('upcoming');
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                  }
                }}
                className={`py-1 px-2.5 rounded-lg text-xs font-display font-black uppercase tracking-wider transition-all cursor-pointer ${
                  timelineFilter === 'upcoming'
                    ? 'office-nav-tab-active shadow-xs font-black'
                    : 'office-nav-tab-inactive'
                }`}
              >
                Upcoming ({upcomingCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  if (timelineFilter === 'recent') {
                    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                  } else {
                    setTimelineFilter('recent');
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                  }
                }}
                className={`py-1 px-2.5 rounded-lg text-xs font-display font-black uppercase tracking-wider transition-all cursor-pointer ${
                  timelineFilter === 'recent'
                    ? 'office-nav-tab-active shadow-xs font-black'
                    : 'office-nav-tab-inactive'
                }`}
              >
                Recent ({playedCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  if (timelineFilter === 'all') {
                    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                  } else {
                    setTimelineFilter('all');
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                  }
                }}
                className={`py-1 px-2.5 rounded-lg text-xs font-display font-black uppercase tracking-wider transition-all cursor-pointer ${
                  timelineFilter === 'all'
                    ? 'office-nav-tab-active shadow-xs font-black'
                    : 'office-nav-tab-inactive'
                }`}
              >
                All (38)
              </button>
            </nav>

            {/* Club Scope & Round Dropdown */}
            <div className="flex items-center gap-1.5 ml-auto">
              {timelineFilter === 'all' && (
                <select
                  value={selectedRound}
                  onChange={(e) =>
                    setSelectedRound(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
                  }
                  className="bg-white border border-slate-300 rounded-xl px-2 py-1 text-xs text-[#0b1536] focus:outline-none focus:border-blue-500 font-display font-bold shadow-2xs cursor-pointer"
                  aria-label="Filter by Matchday Round"
                >
                  <option value="all">All Rounds</option>
                  {Array.from({ length: 38 }, (_, i) => i + 1).map((r) => (
                    <option key={r} value={r}>
                      Matchday {r}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200/80 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setFilterScope('my_club')}
                  className={`py-1 px-2.5 rounded-lg text-[11px] font-display font-black uppercase tracking-wider transition-all cursor-pointer ${
                    filterScope === 'my_club'
                      ? 'office-nav-tab-active shadow-xs'
                      : 'office-nav-tab-inactive'
                  }`}
                >
                  My Club
                </button>
                <button
                  type="button"
                  onClick={() => setFilterScope('all')}
                  className={`py-1 px-2.5 rounded-lg text-[11px] font-display font-black uppercase tracking-wider transition-all cursor-pointer ${
                    filterScope === 'all'
                      ? 'office-nav-tab-active shadow-xs'
                      : 'office-nav-tab-inactive'
                  }`}
                >
                  All Clubs
                </button>
              </div>
            </div>
          </div>

          {/* Fixtures List */}
          {displayedFixtures.length === 0 ? (
            <div className="office-subcard rounded-2xl p-8 text-center text-slate-500 text-xs shadow-xs">
              {timelineFilter === 'upcoming'
                ? 'No more upcoming fixtures this season! All league games have been played.'
                : 'No played fixtures found for this selection.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {displayedFixtures.map((fixture) => {
                const home = clubsMap.get(fixture.homeClubId) || allClubs[0];
                const away = clubsMap.get(fixture.awayClubId) || allClubs[1];
                const isUserMatch =
                  fixture.homeClubId === userClubId || fixture.awayClubId === userClubId;
                const isUserHome = fixture.homeClubId === userClubId;
                const isPlayed = fixture.played;
                const isUpcoming = !fixture.played && nextFixture?.id === fixture.id;

                // User Result Distinction: Win, Draw, Loss
                let userResult: 'W' | 'D' | 'L' | null = null;
                if (isPlayed && isUserMatch && fixture.homeScore !== undefined && fixture.awayScore !== undefined) {
                  const userScore = isUserHome ? fixture.homeScore : fixture.awayScore;
                  const oppScore = isUserHome ? fixture.awayScore : fixture.homeScore;
                  if (userScore > oppScore) userResult = 'W';
                  else if (userScore === oppScore) userResult = 'D';
                  else userResult = 'L';
                }

                // Visual Accents depending on outcome or state
                let cardAccent = 'border-slate-200/90 bg-white hover:border-slate-300';
                if (isUpcoming) {
                  cardAccent = 'border-blue-500 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white shadow-xs ring-1 ring-blue-500/30';
                } else if (userResult === 'W') {
                  cardAccent = 'border-l-4 border-l-emerald-500 border-slate-200/90 bg-white hover:border-slate-300';
                } else if (userResult === 'D') {
                  cardAccent = 'border-l-4 border-l-amber-500 border-slate-200/90 bg-white hover:border-slate-300';
                } else if (userResult === 'L') {
                  cardAccent = 'border-l-4 border-l-rose-500 border-slate-200/90 bg-white hover:border-slate-300';
                } else if (isUserMatch) {
                  cardAccent = 'border-l-4 border-l-blue-400 border-slate-200/90 bg-white hover:border-slate-300';
                }

                return (
                  <article
                    key={fixture.id}
                    className={`p-2.5 sm:p-3 rounded-2xl border transition-all ${cardAccent} shadow-2xs`}
                  >
                    {/* Top metadata line: Round + Home/Away Badge + Date + Result Badge + Actions */}
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mb-1.5 gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-bold">
                          R{fixture.round}
                        </span>

                        {/* Home / Away distinction for user matches */}
                        {isUserMatch && (
                          <span
                            className={`text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded font-display ${
                              isUserHome
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                            title={isUserHome ? 'Home Match' : 'Away Match'}
                          >
                            {isUserHome ? '🏠 Home' : '✈️ Away'}
                          </span>
                        )}

                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">
                          {formatCareerDate(fixture.date, save.settings?.dateFormat)}
                        </span>

                        {/* Next Up badge */}
                        {isUpcoming && (
                          <span className="office-nav-tab-active text-white text-[9px] font-black uppercase px-2 py-0.2 rounded font-display shadow-2xs">
                            Next Up
                          </span>
                        )}

                        {/* W / D / L result badge for user */}
                        {userResult && (
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded font-display shadow-2xs ${
                              userResult === 'W'
                                ? 'bg-emerald-600 text-white'
                                : userResult === 'D'
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {userResult === 'W' ? '✓ Win' : userResult === 'D' ? 'Draw' : 'Loss'}
                          </span>
                        )}
                      </div>

                      {/* Right quick actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPlayed ? (
                          <button
                            type="button"
                            onClick={() => setMatchOverviewModal({ type: 'result', fixture })}
                            className="text-blue-700 hover:text-blue-800 font-display font-black text-[10.5px] cursor-pointer bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80 px-2 py-0.5 rounded-lg transition-colors"
                          >
                            📊 Stats
                          </button>
                        ) : isUpcoming ? (
                          <button
                            type="button"
                            onClick={() => setMatchOverviewModal({ type: 'preview', fixture })}
                            className="text-blue-700 hover:text-blue-800 font-display font-black text-[10.5px] cursor-pointer bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80 px-2 py-0.5 rounded-lg transition-colors"
                          >
                            📋 Dossier
                          </button>
                        ) : null}

                        {isPlayed && fixture.scorers && fixture.scorers.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleFixtureExpanded(fixture.id)}
                            className="text-slate-500 hover:text-slate-800 text-[10px] px-1 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 cursor-pointer transition-colors"
                            title="Toggle goalscorers"
                            aria-expanded={expandedFixtureIds.has(fixture.id)}
                          >
                            {expandedFixtureIds.has(fixture.id) ? '▲' : '▼'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Compact Clubs & Scoreline Bar */}
                    <div
                      onClick={() => {
                        if (isPlayed) {
                          setMatchOverviewModal({ type: 'result', fixture });
                        } else if (isUpcoming) {
                          setMatchOverviewModal({ type: 'preview', fixture });
                        } else if (isPlayed && fixture.scorers && fixture.scorers.length > 0) {
                          toggleFixtureExpanded(fixture.id);
                        }
                      }}
                      className="flex items-center justify-between text-xs cursor-pointer select-none py-0.5"
                    >
                      {/* Home Team */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          data-force-white="true"
                          className="club-crest w-4 h-4 rounded-full border border-slate-300 shadow-2xs shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${home.primaryColor}, ${home.secondaryColor})`,
                          }}
                        />
                        <span
                          className={`truncate text-xs ${
                            fixture.homeClubId === userClubId
                              ? 'text-blue-700 font-black'
                              : 'text-[#0b1536] font-semibold'
                          }`}
                        >
                          {getEffectiveClubName(home, save.club)}
                        </span>
                      </div>

                      {/* Score / VS Pill */}
                      <div className="px-2 text-center shrink-0">
                        {fixture.played ? (
                          <span className="font-display font-black text-xs sm:text-sm text-[#0b1536] px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200/90 shadow-2xs inline-block">
                            {fixture.homeScore} - {fixture.awayScore}
                          </span>
                        ) : (
                          <span className="text-[10px] font-display font-black text-slate-500 uppercase px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 inline-block">
                            VS
                          </span>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="flex items-center gap-2 flex-1 justify-end min-w-0 text-right">
                        <span
                          className={`truncate text-xs ${
                            fixture.awayClubId === userClubId
                              ? 'text-blue-700 font-black'
                              : 'text-[#0b1536] font-semibold'
                          }`}
                        >
                          {getEffectiveClubName(away, save.club)}
                        </span>
                        <div
                          data-force-white="true"
                          className="club-crest w-4 h-4 rounded-full border border-slate-300 shadow-2xs shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${away.primaryColor}, ${away.secondaryColor})`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Expandable Scorers List */}
                    {isPlayed && fixture.scorers && fixture.scorers.length > 0 && expandedFixtureIds.has(fixture.id) && (
                      <div className="mt-2 pt-2 border-t border-slate-100 text-[10.5px] text-slate-600 flex flex-wrap gap-x-3 gap-y-1 bg-slate-50/70 p-2 rounded-xl">
                        {fixture.scorers.map((s, i) => (
                          <span key={i} className="flex items-center gap-1 font-medium">
                            <span className="text-xs">⚽</span>
                            <span>{s.name} <strong className="font-mono text-slate-700">({s.minute}&apos;)</strong></span>
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Live Matchday Interactive Command Center */}
      {activeMatchFixture && (
        <MatchDayModal
          fixture={activeMatchFixture}
          save={save}
          onClose={() => setActiveMatchFixture(null)}
          onSaveMatchResult={(updated) => {
            onUpdateSave(updated);
            setActiveMatchFixture(null);
          }}
        />
      )}

      {/* Match Overview / Statistics / Pre-Match Dossier Modal */}
      {matchOverviewModal && (
        <MatchOverviewModal
          type={matchOverviewModal.type}
          fixture={matchOverviewModal.fixture}
          save={save}
          onClose={() => setMatchOverviewModal(null)}
          onPlayInteractiveMatch={() => {
            setActiveMatchFixture(matchOverviewModal.fixture);
            setMatchOverviewModal(null);
          }}
          onPlayInstantMatch={() => {
            setMatchOverviewModal(null);
            handlePlayNextMatch();
          }}
        />
      )}

      {/* Short Instant Simulation Loading Suspense Modal */}
      {instantSimLoadingData && (
        <InstantSimLoadingModal
          homeClub={instantSimLoadingData.homeClub}
          awayClub={instantSimLoadingData.awayClub}
          userClub={save.club}
          competitionTitle={instantSimLoadingData.competitionTitle}
          roundTitle={instantSimLoadingData.roundTitle}
          durationMs={1200}
          onComplete={() => {
            const { updatedSave, simmedFixture } = instantSimLoadingData;
            onUpdateSave(updatedSave);
            setSimulating(false);
            setInstantSimLoadingData(null);
            setInstantSimResultModal(simmedFixture);
          }}
        />
      )}

      {/* Instant Match Summary Takeover Modal */}
      {instantSimResultModal && (
        <InstantMatchSummaryModal
          fixture={instantSimResultModal}
          save={save}
          onClose={() => setInstantSimResultModal(null)}
          onViewDetailedDossier={() => {
            const fix = instantSimResultModal;
            setInstantSimResultModal(null);
            setMatchOverviewModal({ type: 'result', fixture: fix });
          }}
        />
      )}

      {/* Animated Live Fixture Release Ceremony Modal */}
      {showFixtureReleaseCeremonyModal && (
        <FixtureReleaseModal
          isOpen={true}
          save={save}
          onFinishRelease={() => {
            onUpdateSave({
              ...save,
              fixtureReleaseState: {
                released: true,
                releaseDate,
                hasSeenCeremony: true,
              },
            });
            setShowFixtureReleaseCeremonyModal(false);
            if (onNotification) onNotification('📅 Official Premier League fixtures unlocked!');
          }}
          onClose={() => setShowFixtureReleaseCeremonyModal(false)}
        />
      )}
    </div>
  );
}
