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
import { IconArrowRight, IconChevronDown } from './GameIcons';
import { Button, SectionHeader, Tag } from '../ui';

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
  const [showFixtureReleaseCeremonyModal, setShowFixtureReleaseCeremonyModal] = useState(false);

  const fixtures = save.fixtures || [];
  const userClubId = save.club.id;
  const userSquad = save.squad || [];

  const isFixturesReleased = Boolean(save.fixtureReleaseState?.released);
  const releaseDate = save.fixtureReleaseState?.releaseDate || `${save.season.yearStart}-07-08`;
  const isReleaseDateReached = save.season.currentDate >= releaseDate;
  const preseasonCup = save.cups?.[CUP_IDS.PRESEASON];

  const allClubs = getClubsWithUserClub(save.club, save.activeLeagueClubIds);
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));

  const nextFixture = getNextClubFixture(fixtures, userClubId);
  const seasonFinished = isSeasonComplete(fixtures, userClubId);
  const seasonSummary = seasonFinished ? getSeasonReviewSummary(save) : null;

  const handleAdvanceSeason = () => {
    const { updatedSave } = advanceToNextSeason(save);
    onUpdateSave(updatedSave);
    if (onNotification) {
      onNotification(
        `Season ${updatedSave.season.seasonNumber} has started. The summer transfer window is open.`
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
      <SectionHeader
        as="h2"
        title={`Season ${save.season.seasonNumber} fixtures`}
        className="px-1 items-center"
        action={
          onNavigateOffice && (
            <Button variant="secondary" onClick={onNavigateOffice}>
              <span>Office</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </Button>
          )
        }
      />

      {/* Season Complete & Transition Spotlight */}
      {seasonFinished && seasonSummary && (
        <section className="office-floating-card rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-0.5 min-w-0">
              <h3 className="text-base font-display font-semibold text-[var(--ink-primary)]">
                {seasonSummary.leagueTitle
                  ? 'League champions'
                  : `Season complete · Finished #${seasonSummary.finalPosition}`}
              </h3>
              <p className="text-sm text-[var(--ink-secondary)]">
                Prize money: <span className="font-semibold text-[var(--ink-primary)]">{formatCurrency(seasonSummary.prizeMoney)}</span> · Europe: <span className="font-semibold text-[var(--ink-primary)]">{seasonSummary.europeanQualification}</span>
              </p>
            </div>

            {/* The season review lives on the Office tab; without that route, advance directly. */}
            <Button
              variant="primary"
              className="w-full sm:w-auto"
              onClick={() => (onNavigateOffice ? onNavigateOffice() : handleAdvanceSeason())}
            >
              {onNavigateOffice ? 'Review season in Office' : `Advance to season ${save.season.seasonNumber + 1}`}
            </Button>
          </div>
        </section>
      )}

      {/* Pre-Season / Embargo State: Shown when Premier League fixtures are not released yet */}
      {!isFixturesReleased && (
        <section className="space-y-3.5">
          {!isReleaseDateReached ? (
            /* BEFORE RELEASE DAY (July 1 - July 7) */
            <div className="office-floating-card rounded-xl p-5 space-y-3 text-left">
              <h3 className="text-base font-display font-semibold text-[var(--ink-primary)]">
                Fixtures released on 8 July {save.season.yearStart}
              </h3>
              <p className="text-sm text-[var(--ink-secondary)]">Advance through pre-season from the Office.</p>
              {onNavigateOffice && (
                <Button variant="primary" onClick={onNavigateOffice}>
                  <span>Go to Office</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ) : (
            /* ON OR AFTER RELEASE DAY (July 8+) BUT UNREVEALED */
            <div className="office-floating-card rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-base font-display font-semibold text-[var(--ink-primary)] min-w-0">
                {save.season.yearStart}/{String(save.season.yearStart + 1).slice(2)} fixtures are ready
              </h3>

              <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
                <Button variant="primary" onClick={() => setShowFixtureReleaseCeremonyModal(true)}>
                  Live reveal
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    onUpdateSave({
                      ...save,
                      fixtureReleaseState: {
                        released: true,
                        releaseDate,
                        hasSeenCeremony: true,
                      },
                    });
                    if (onNotification) onNotification('Full 38-match league schedule revealed.');
                  }}
                >
                  Skip reveal
                </Button>
              </div>
            </div>
          )}

          {/* Pre-Season Tour Friendlies (if scheduled in July) */}
          {preseasonCup && preseasonCup.fixtures && preseasonCup.fixtures.length > 0 && (
            <div className="office-floating-card rounded-xl p-3.5 sm:p-4 space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="font-display font-semibold text-sm text-[var(--ink-primary)] truncate">
                  {preseasonCup.name} · Friendlies
                </h4>
                <span className="text-xs text-[var(--ink-muted)] tabular-nums whitespace-nowrap shrink-0">
                  {preseasonCup.fixtures.filter((f) => f.played).length} of {preseasonCup.fixtures.length} played
                </span>
              </div>

              <div className="divide-y divide-[var(--border-subtle)]">
                {preseasonCup.fixtures.map((fix) => {
                  const oppClub = clubsMap.get(fix.awayClubId) || getClubById(fix.awayClubId);
                  return (
                    <div
                      key={fix.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-xs text-[var(--ink-muted)] block">
                          {fix.roundName} · {formatCareerDate(fix.date, 'uk', 'medium')}
                        </span>
                        <div className="text-sm font-semibold text-[var(--ink-primary)] truncate">
                          {getEffectiveClubName(save.club)} v {oppClub ? getEffectiveClubName(oppClub) : 'Opponent'}
                        </div>
                        {fix.venue && <div className="text-xs text-[var(--ink-muted)] truncate">{fix.venue}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        {fix.played ? (
                          <span className="font-display font-semibold text-sm text-[var(--ink-primary)] tabular-nums">
                            {fix.homeScore} - {fix.awayScore}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--ink-muted)]">Scheduled</span>
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Timeline: Upcoming | Recent | All */}
            <nav aria-label="Timeline filters" className="flex items-center gap-1.5">
              {(['upcoming', 'recent', 'all'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={timelineFilter === key}
                  onClick={() => {
                    if (timelineFilter === key) {
                      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                    } else {
                      setTimelineFilter(key);
                      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                    }
                  }}
                  className={`min-h-9 px-3 rounded-full border text-xs whitespace-nowrap transition-colors cursor-pointer ${
                    timelineFilter === key
                      ? 'bg-[var(--surface-elevated)] border-[var(--border-crisp)] font-semibold text-[var(--ink-primary)]'
                      : 'bg-[var(--surface-card)] border-[var(--border-subtle)] font-medium text-[var(--ink-secondary)] hover:bg-[var(--surface-subcard)]'
                  }`}
                >
                  {key === 'upcoming' ? `Upcoming (${upcomingCount})` : key === 'recent' ? `Recent (${playedCount})` : 'All'}
                </button>
              ))}
            </nav>

            {/* Club scope & matchday dropdowns */}
            <div className="flex items-center gap-1.5 ml-auto">
              {timelineFilter === 'all' && (
                <select
                  value={selectedRound}
                  onChange={(e) =>
                    setSelectedRound(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
                  }
                  className="min-h-9 bg-[var(--surface-card)] border border-[var(--border-crisp)] rounded-lg px-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                  aria-label="Filter by Matchday Round"
                >
                  <option value="all">All rounds</option>
                  {Array.from({ length: 38 }, (_, i) => i + 1).map((r) => (
                    <option key={r} value={r}>
                      Matchday {r}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={filterScope}
                onChange={(e) => setFilterScope(e.target.value === 'all' ? 'all' : 'my_club')}
                className="min-h-9 bg-[var(--surface-card)] border border-[var(--border-crisp)] rounded-lg px-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                aria-label="Show fixtures for"
              >
                <option value="my_club">My club</option>
                <option value="all">All clubs</option>
              </select>
            </div>
          </div>

          {/* Fixtures List */}
          {displayedFixtures.length === 0 ? (
            <div className="office-subcard rounded-xl p-8 text-center text-[var(--ink-muted)] text-sm">
              {timelineFilter === 'upcoming'
                ? 'No upcoming fixtures. All league games have been played.'
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
                let cardAccent = 'border-[var(--border-subtle)] bg-[var(--surface-card)]';
                if (isUpcoming) {
                  cardAccent = 'border-[var(--border-crisp)] bg-[var(--surface-subcard)]';
                }

                const hasScorers = isPlayed && !!fixture.scorers && fixture.scorers.length > 0;
                const isExpanded = expandedFixtureIds.has(fixture.id);
                const openOverview = () =>
                  setMatchOverviewModal({ type: isPlayed ? 'result' : 'preview', fixture });
                const trailingActionClass =
                  'inline-flex items-center gap-1 min-h-8 px-2 -mr-2 text-blue-700 hover:text-blue-800 font-medium text-xs cursor-pointer';

                return (
                  <article
                    key={fixture.id}
                    className={`p-2.5 sm:p-3 rounded-xl border ${cardAccent}`}
                  >
                    {/* Teams & scoreline first */}
                    <div
                      onClick={() => {
                        if (isPlayed || isUpcoming) openOverview();
                      }}
                      className="flex items-center justify-between text-xs cursor-pointer select-none py-0.5"
                    >
                      {/* Home Team */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          data-force-white="true"
                          className="club-crest w-4 h-4 rounded-full border border-[var(--border-crisp)] shrink-0"
                          style={{ background: home.primaryColor }}
                        />
                        <span
                          className={`truncate text-sm text-[var(--ink-primary)] ${
                            fixture.homeClubId === userClubId ? 'font-semibold' : 'font-medium'
                          }`}
                        >
                          {getEffectiveClubName(home, save.club)}
                        </span>
                      </div>

                      {/* Score / VS */}
                      <div className="px-2 text-center shrink-0">
                        {fixture.played ? (
                          <span className="font-display font-semibold text-sm text-[var(--ink-primary)] tabular-nums">
                            {fixture.homeScore} - {fixture.awayScore}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--ink-muted)]">v</span>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="flex items-center gap-2 flex-1 justify-end min-w-0 text-right">
                        <span
                          className={`truncate text-sm text-[var(--ink-primary)] ${
                            fixture.awayClubId === userClubId ? 'font-semibold' : 'font-medium'
                          }`}
                        >
                          {getEffectiveClubName(away, save.club)}
                        </span>
                        <div
                          data-force-white="true"
                          className="club-crest w-4 h-4 rounded-full border border-[var(--border-crisp)] shrink-0"
                          style={{ background: away.primaryColor }}
                        />
                      </div>
                    </div>

                    {/* Secondary line: matchday, date, one status marker, one trailing action */}
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[var(--ink-muted)]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">
                          Matchday {fixture.round} · {formatCareerDate(fixture.date, save.settings?.dateFormat)}
                        </span>
                        {isUpcoming && (
                          <Tag tone="info" className="shrink-0">Next up</Tag>
                        )}
                        {userResult && (
                          <Tag
                            tone={userResult === 'W' ? 'success' : userResult === 'D' ? 'warning' : 'danger'}
                            className="shrink-0"
                          >
                            {userResult === 'W' ? 'Win' : userResult === 'D' ? 'Draw' : 'Loss'}
                          </Tag>
                        )}
                      </div>

                      {hasScorers ? (
                        <button
                          type="button"
                          onClick={() => toggleFixtureExpanded(fixture.id)}
                          aria-expanded={isExpanded}
                          className={`${trailingActionClass} shrink-0`}
                        >
                          <span>Details</span>
                          <IconChevronDown className={`w-3.5 h-3.5 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      ) : isPlayed || isUpcoming ? (
                        <button type="button" onClick={openOverview} className={`${trailingActionClass} shrink-0`}>
                          {isPlayed ? 'Stats' : 'Dossier'}
                        </button>
                      ) : null}
                    </div>

                    {/* Expanded details: goalscorers and link to full stats */}
                    {hasScorers && isExpanded && (
                      <div className="mt-1.5 pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--ink-secondary)] space-y-1.5">
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {(fixture.scorers || []).map((s, i) => (
                            <span key={i}>
                              {s.name} <span className="tabular-nums text-[var(--ink-muted)]">{s.minute}&apos;</span>
                            </span>
                          ))}
                        </div>
                        <button type="button" onClick={openOverview} className={trailingActionClass.replace(' -mr-2', ' -ml-2')}>
                          Full match stats
                        </button>
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
            if (onNotification) onNotification('League fixtures released.');
          }}
          onClose={() => setShowFixtureReleaseCeremonyModal(false)}
        />
      )}
    </div>
  );
}
