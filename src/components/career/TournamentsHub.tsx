'use client';

import React, { useState, useEffect } from 'react';
import {
  CareerSaveFile,
  CupTournament,
  CupFixture,
} from '../../career/types';
import {
  CUP_IDS,
  findAnyClub,
  simulateKnockoutCupFixture,
  advanceCupTournament,
  simulateAiFixturesInCupRound,
  conductCupDraw,
} from '../../career/cups';
import { getEffectiveClubName } from '../../career/clubs';
import { formatCareerDate } from '../../career/formatters';
import { MatchDayModal } from './MatchDayModal';
import {
  IconTrophy,
  IconChevronDown,
  IconChevronUp,
  IconPlay,
} from './GameIcons';
import { Button, Tag } from '../ui';

interface TournamentsHubProps {
  save: CareerSaveFile;
  onUpdateSave: (updatedSave: CareerSaveFile) => void;
  onNotification?: (msg: string) => void;
}

export function TournamentsHub({
  save,
  onUpdateSave,
  onNotification,
}: TournamentsHubProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>(
    CUP_IDS.EURO_CHAMPIONS
  );
  const [activeCupMatch, setActiveCupMatch] = useState<CupFixture | null>(null);
  const [showEntrants, setShowEntrants] = useState(false);

  const cups = save.cups || {};
  const currentTournament: CupTournament | undefined = cups[selectedTournamentId];
  const userClubId = save.club.id;

  // Conduct scheduled draws and simulate AI matches in the active round when their scheduled date arrives
  useEffect(() => {
    if (!currentTournament || currentTournament.isCompleted) return;

    // 1. Conduct scheduled draw if draw date has arrived and draw not completed
    if (
      !currentTournament.drawCompleted &&
      currentTournament.drawDate &&
      save.season.currentDate >= currentTournament.drawDate
    ) {
      const drawn = conductCupDraw(currentTournament, undefined, userClubId);
      onUpdateSave({
        ...save,
        cups: {
          ...cups,
          [selectedTournamentId]: drawn,
        },
      });
      return;
    }

    const roundFixtures = currentTournament.fixtures.filter(
      (f) => f.roundName === currentTournament.currentRound
    );
    const unplayedAi = roundFixtures.filter(
      (f) =>
        !f.played &&
        f.homeClubId !== 'tbc' &&
        f.awayClubId !== 'tbc' &&
        f.homeClubId !== userClubId &&
        f.awayClubId !== userClubId &&
        f.date <= save.season.currentDate
    );
    if (unplayedAi.length > 0) {
      const updatedTourney = simulateAiFixturesInCupRound(
        currentTournament,
        currentTournament.currentRound,
        userClubId
      );
      const adv = advanceCupTournament(updatedTourney, save.season.yearStart);
      const nextCups = {
        ...cups,
        [selectedTournamentId]: adv.updatedTournament,
      };
      onUpdateSave({
        ...save,
        cups: nextCups,
      });
    }
  }, [selectedTournamentId, save.season.currentDate]);

  const tournamentList = [
    { id: CUP_IDS.EURO_CHAMPIONS, name: 'Champions Cup' },
    { id: CUP_IDS.EURO_CHALLENGE, name: 'Challenge Cup' },
    { id: CUP_IDS.EURO_PLATE, name: 'European Plate' },
    { id: CUP_IDS.ENGLISH_CUP, name: 'The English Cup' },
    { id: CUP_IDS.LEAGUE_CUP, name: 'League Cup' },
    { id: CUP_IDS.SHIELD, name: 'Season Opener Shield' },
  ];

  return (
    <div id="tournaments-hub" data-office-ui="true" className="space-y-4 w-full scroll-mt-20">
      {/* Tournament Selection Bar with Scroll Affordances */}
      <div className="relative">
        <nav
          aria-label="Cup Tournaments Selector"
          data-no-swipe="true"
          className="flex items-center gap-4 px-1 border-b border-[var(--border-subtle)] overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x"
        >
          {tournamentList.map((t) => {
            const isSelected = selectedTournamentId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  if (selectedTournamentId === t.id) {
                    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                  } else {
                    setSelectedTournamentId(t.id);
                    setShowEntrants(false);
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                  }
                }}
                className={`min-h-10 px-0.5 text-sm whitespace-nowrap cursor-pointer transition-colors shrink-0 border-b-2 ${
                  isSelected
                    ? 'border-[var(--accent-primary)] font-semibold text-[var(--ink-primary)]'
                    : 'border-transparent font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </nav>
      </div>

      {!currentTournament ? (
        <div className="office-subcard rounded-xl p-8 text-center text-[var(--ink-muted)] text-sm">
          Tournament data not available.
        </div>
      ) : (
        /* VIEW 2: TOURNAMENT BRACKET & FIXTURES */
        <section id={`cup-tournament-${selectedTournamentId}`} className="space-y-3.5 scroll-mt-20">
          {/* Header Card: name, round and prize stated once */}
          <header className="px-1 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2">
            <div className="min-w-0">
              <h2 className="text-lg font-display font-semibold text-[var(--ink-primary)] truncate">
                {currentTournament.name}
              </h2>
              <p className="text-sm text-[var(--ink-secondary)] mt-0.5">
                {currentTournament.currentRound} · Prize £{(currentTournament.prizeMoney / 1_000_000).toFixed(1)}M
              </p>
            </div>

            {currentTournament.isCompleted && currentTournament.winnerClubId && (
              <div className="flex items-center gap-2 ml-auto shrink-0">
                <IconTrophy className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="text-xs text-[var(--ink-muted)] block">
                    Champion
                  </span>
                  <span className="text-sm font-display font-semibold text-[var(--ink-primary)]">
                    {(() => {
                      const w = findAnyClub(currentTournament.winnerClubId);
                      return w ? getEffectiveClubName(w, save.club) : currentTournament.winnerClubId;
                    })()}
                  </span>
                </div>
              </div>
            )}
          </header>

          {/* Group Fixtures by Round */}
          {(() => {
            const roundsMap = new Map<string, CupFixture[]>();
            currentTournament.fixtures.forEach((f) => {
              const list = roundsMap.get(f.roundName) || [];
              list.push(f);
              roundsMap.set(f.roundName, list);
            });

            const roundEntries = Array.from(roundsMap.entries());

            return (
              <div className="space-y-3.5">
                {roundEntries.map(([roundName, roundFixtures], roundIndex) => {
                  const isFinal = roundName.toLowerCase().includes('final') && !roundName.toLowerCase().includes('semi') && !roundName.toLowerCase().includes('quarter');
                  const userTie = roundFixtures.find(
                    (f) => f.homeClubId === userClubId || f.awayClubId === userClubId
                  );
                  const otherTies = roundFixtures.filter((f) => f.id !== userTie?.id);

                  return (
                    <div key={roundName} className="space-y-2">
                      <div className="flex items-baseline justify-between border-b border-[var(--border-subtle)] pb-1 px-1 gap-2">
                        <h3 className="text-sm font-display font-semibold text-[var(--ink-primary)] min-w-0 truncate">
                          {roundName}
                        </h3>
                        <span className="text-xs text-[var(--ink-muted)] tabular-nums shrink-0">
                          {roundFixtures.filter((f) => f.played).length} of {roundFixtures.length} played
                        </span>
                      </div>

                      {/* Draw pending (shown once on the first undrawn round) */}
                      {!currentTournament.drawCompleted && currentTournament.drawDate && roundIndex === 0 && (
                        <div className="rounded-xl px-3 py-1 bg-[var(--surface-card)] border border-[var(--border-subtle)]">
                          <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                            <Tag tone="warning">Draw pending</Tag>
                            <span className="text-[var(--ink-secondary)] tabular-nums">
                              Draw on {formatCareerDate(currentTournament.drawDate, save.settings?.dateFormat)}
                            </span>
                          </div>
                          {currentTournament.qualifyingClubs && currentTournament.qualifyingClubs.length > 0 && (
                            <div className="border-t border-[var(--border-subtle)]">
                              <button
                                type="button"
                                aria-expanded={showEntrants}
                                onClick={() => setShowEntrants((open) => !open)}
                                className="w-full min-h-10 flex items-center justify-between gap-2 text-xs font-semibold text-[var(--ink-secondary)] cursor-pointer"
                              >
                                <span>
                                  {showEntrants ? 'Hide' : 'Show'} entrants ({currentTournament.qualifyingClubs.length})
                                </span>
                                {showEntrants ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
                              </button>
                              {showEntrants && (
                                <p className="pb-2.5 text-xs leading-relaxed text-[var(--ink-secondary)]">
                                  {currentTournament.qualifyingClubs.map((cId, i) => {
                                    const club = findAnyClub(cId);
                                    const name = club
                                      ? getEffectiveClubName(club, save.club)
                                      : cId
                                          .split('_')
                                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                          .join(' ');
                                    return (
                                      <React.Fragment key={cId}>
                                        {i > 0 && ', '}
                                        {cId === userClubId ? <strong className="text-[var(--ink-primary)]">{name}</strong> : name}
                                      </React.Fragment>
                                    );
                                  })}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* User Fixture Spotlight (Always on Top) */}
                      {userTie && (() => {
                        const home = findAnyClub(userTie.homeClubId);
                        const away = findAnyClub(userTie.awayClubId);
                        const isUserHome = userTie.homeClubId === userClubId;

                        return (
                          <article className="p-3 sm:p-3.5 rounded-xl border border-[var(--border-crisp)] bg-[var(--surface-card)]">
                            <p className="text-xs text-[var(--ink-muted)] mb-2">
                              <span className="font-semibold text-[var(--ink-secondary)]">
                                {isFinal ? 'The cup final' : 'Your cup fixture'}
                              </span>
                              {' · '}
                              {isUserHome ? 'Home' : 'Away'}
                              {' · '}
                              {formatCareerDate(userTie.date, save.settings?.dateFormat)}
                            </p>

                            <div className="flex items-center justify-between gap-3 my-1">
                              {/* Home Team */}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                  data-force-white="true"
                                  className="club-crest w-4 h-4 rounded-full border border-[var(--border-crisp)] shrink-0"
                                  style={{ background: home?.primaryColor || '#555' }}
                                />
                                <span
                                  className={`text-sm truncate text-[var(--ink-primary)] ${
                                    userTie.homeClubId === userClubId ? 'font-semibold' : 'font-medium'
                                  }`}
                                >
                                  {home ? getEffectiveClubName(home, save.club) : userTie.homeClubId === 'tbc' ? 'TBC' : userTie.homeClubId}
                                </span>
                              </div>

                              {/* Scoreline */}
                              <div className="px-1 text-center shrink-0">
                                {userTie.played ? (
                                  <div>
                                    <span className="font-display font-semibold text-base text-[var(--ink-primary)] tabular-nums">
                                      {userTie.homeScore} - {userTie.awayScore}
                                    </span>
                                    {userTie.leg === 2 && (
                                      <span className="block text-xs text-[var(--ink-secondary)] tabular-nums">
                                        (Agg {(userTie.aggregateHomeScore ?? 0) + (userTie.homeScore ?? 0)}-{(userTie.aggregateAwayScore ?? 0) + (userTie.awayScore ?? 0)})
                                      </span>
                                    )}
                                    {userTie.penalties && (
                                      <span className="block text-xs text-[var(--ink-secondary)] tabular-nums">
                                        (Pens {userTie.penalties.homePenalties}-{userTie.penalties.awayPenalties})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-sm text-[var(--ink-muted)]">v</span>
                                    {userTie.leg === 2 && (
                                      <span className="block text-xs text-[var(--ink-secondary)] tabular-nums">
                                        Agg {userTie.aggregateHomeScore ?? 0}-{userTie.aggregateAwayScore ?? 0}
                                      </span>
                                    )}
                                    {userTie.leg === 1 && (
                                      <span className="block text-xs text-[var(--ink-muted)]">
                                        Leg 1
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Away Team */}
                              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                                <span
                                  className={`text-sm truncate text-[var(--ink-primary)] ${
                                    userTie.awayClubId === userClubId ? 'font-semibold' : 'font-medium'
                                  }`}
                                >
                                  {away ? getEffectiveClubName(away, save.club) : userTie.awayClubId === 'tbc' ? 'TBC' : userTie.awayClubId}
                                </span>
                                <div
                                  data-force-white="true"
                                  className="club-crest w-4 h-4 rounded-full border border-[var(--border-crisp)] shrink-0"
                                  style={{ background: away?.primaryColor || '#555' }}
                                />
                              </div>
                            </div>

                            {/* User Action for Unplayed Match */}
                            {!userTie.played && (
                              <div className="mt-2.5 pt-2.5 border-t border-[var(--border-subtle)]">
                                <Button variant="primary" fullWidth onClick={() => setActiveCupMatch(userTie)}>
                                  <IconPlay className="w-3.5 h-3.5" />
                                  <span>Open matchday</span>
                                </Button>
                              </div>
                            )}
                          </article>
                        );
                      })()}

                      {/* Other Ties (Compact Rows) */}
                      {otherTies.length > 0 && (
                        <div className="space-y-1">
                          {userTie && (
                            <span className="text-xs text-[var(--ink-muted)] block pt-1 px-1">
                              Other matches in this round ({otherTies.length})
                            </span>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {otherTies.map((fixture) => {
                              const isTbc = fixture.homeClubId === 'tbc' || fixture.awayClubId === 'tbc';
                              const home = findAnyClub(fixture.homeClubId);
                              const away = findAnyClub(fixture.awayClubId);

                              return (
                                <div
                                  key={fixture.id}
                                  className={`px-2.5 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] flex items-center justify-between text-xs ${
                                    isTbc ? 'opacity-70' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <div
                                      data-force-white="true"
                                      className="club-crest w-3.5 h-3.5 rounded-full border border-[var(--border-crisp)] shrink-0"
                                      style={{ background: isTbc ? '#94a3b8' : home?.primaryColor || '#555' }}
                                    />
                                    <span className="truncate text-xs text-[var(--ink-primary)] font-medium">
                                      {home ? getEffectiveClubName(home, save.club) : isTbc ? 'TBC' : fixture.homeClubId}
                                    </span>
                                  </div>

                                  <div className="px-2 text-xs text-center shrink-0 tabular-nums">
                                    {fixture.played ? (
                                      <span className="font-semibold text-[var(--ink-primary)] inline-block">
                                        {fixture.homeScore} - {fixture.awayScore}
                                        {fixture.leg === 2 && (
                                          <span className="text-xs text-[var(--ink-secondary)] font-normal block">
                                            Agg {(fixture.aggregateHomeScore ?? 0) + (fixture.homeScore ?? 0)}-{(fixture.aggregateAwayScore ?? 0) + (fixture.awayScore ?? 0)}
                                          </span>
                                        )}
                                        {fixture.penalties && (
                                          <span className="text-xs text-[var(--ink-secondary)] font-normal block">
                                            ({fixture.penalties.homePenalties}-{fixture.penalties.awayPenalties}p)
                                          </span>
                                        )}
                                      </span>
                                    ) : isTbc ? (
                                      <Tag tone="neutral">Awaiting draw</Tag>
                                    ) : (
                                      <div>
                                        <span className="text-[var(--ink-muted)] text-xs">v</span>
                                        {fixture.leg === 2 && (
                                          <span className="text-xs text-[var(--ink-secondary)] block">
                                            Agg {fixture.aggregateHomeScore ?? 0}-{fixture.aggregateAwayScore ?? 0}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end text-right">
                                    <span className="truncate text-xs text-[var(--ink-primary)] font-medium">
                                      {away ? getEffectiveClubName(away, save.club) : isTbc ? 'TBC' : fixture.awayClubId}
                                    </span>
                                    <div
                                      data-force-white="true"
                                      className="club-crest w-3.5 h-3.5 rounded-full border border-[var(--border-crisp)] shrink-0"
                                      style={{ background: isTbc ? '#94a3b8' : away?.primaryColor || '#555' }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>
      )}

      <p className="text-xs text-[var(--ink-muted)] text-center">Trophies you have won are listed in the Legacy tab.</p>

      {/* MatchDay Interactive Modal for Cup Ties */}
      {activeCupMatch && (
        <MatchDayModal
          fixture={activeCupMatch}
          save={save}
          onClose={() => setActiveCupMatch(null)}
          onSaveMatchResult={(updatedSave) => {
            onUpdateSave(updatedSave);
            setActiveCupMatch(null);
            onNotification?.('Cup matchday concluded.');
          }}
        />
      )}
    </div>
  );
}
