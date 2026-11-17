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
  IconStar,
  IconGlobe,
  IconMedal,
  IconCrown,
  IconTrophy,
  IconShield,
  IconBolt,
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
  IconPlay,
} from './GameIcons';

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
    { id: CUP_IDS.EURO_CHAMPIONS, name: 'Champions Cup', icon: 'star' },
    { id: CUP_IDS.EURO_CHALLENGE, name: 'Challenge Cup', icon: 'globe' },
    { id: CUP_IDS.EURO_PLATE, name: 'European Plate', icon: 'medal' },
    { id: CUP_IDS.ENGLISH_CUP, name: 'The English Cup', icon: 'crown' },
    { id: CUP_IDS.LEAGUE_CUP, name: 'League Cup', icon: 'trophy' },
    { id: CUP_IDS.SHIELD, name: 'Season Opener Shield', icon: 'shield' },
  ];

  const renderTournamentIcon = (key: string) => {
    switch (key) {
      case 'star':
        return <IconStar className="w-3.5 h-3.5 shrink-0" filled />;
      case 'globe':
        return <IconGlobe className="w-3.5 h-3.5 shrink-0" />;
      case 'medal':
        return <IconMedal className="w-3.5 h-3.5 shrink-0" />;
      case 'crown':
        return <IconCrown className="w-3.5 h-3.5 shrink-0" />;
      case 'trophy':
        return <IconTrophy className="w-3.5 h-3.5 shrink-0" />;
      case 'shield':
      default:
        return <IconShield className="w-3.5 h-3.5 shrink-0" />;
    }
  };

  return (
    <div id="tournaments-hub" data-office-ui="true" className="space-y-4 w-full scroll-mt-20">
      {/* Tournament Selection Bar with Scroll Affordances */}
      <div className="relative">
        <nav
          aria-label="Cup Tournaments Selector"
          data-no-swipe="true"
          className="office-floating-card p-1.5 rounded-2xl shadow-xs flex items-center gap-1.5 overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x"
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
                className={`min-h-[40px] py-1.5 px-3 rounded-xl text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all shrink-0 ${
                  isSelected ? 'office-nav-tab-active shadow-xs' : 'office-nav-tab-inactive'
                }`}
              >
                {renderTournamentIcon(t.icon)}
                <span>{t.name}</span>
              </button>
            );
          })}
        </nav>
        {/* Subtle right-edge scroll fade indicator on mobile screens */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#f8fafc] to-transparent sm:hidden" />
      </div>

      {!currentTournament ? (
        <div className="office-subcard rounded-2xl p-8 text-center text-slate-500 text-xs shadow-xs">
          Tournament data not available.
        </div>
      ) : (
        /* VIEW 2: TOURNAMENT BRACKET & FIXTURES */
        <section id={`cup-tournament-${selectedTournamentId}`} className="space-y-3.5 scroll-mt-20">
          {/* Header Card: name, round and prize stated once */}
          <header className="office-floating-card rounded-2xl px-4 py-3 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 shadow-xs border border-slate-200/90">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-display font-black text-[#0b1536] uppercase tracking-tight truncate">
                {currentTournament.name}
              </h2>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                {currentTournament.currentRound} · Prize £{(currentTournament.prizeMoney / 1_000_000).toFixed(1)}M
              </p>
            </div>

            {currentTournament.isCompleted && currentTournament.winnerClubId && (
              <div className="flex items-center gap-2 ml-auto shrink-0">
                <IconTrophy className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-black text-amber-800 block font-display tracking-wider">
                    Champion
                  </span>
                  <span className="text-xs font-display font-black text-[#0b1536] uppercase">
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
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-1 px-1 gap-2">
                        <h3 className="text-xs font-display font-black uppercase tracking-wider text-[#0b1536] flex items-center gap-1.5 min-w-0">
                          {isFinal ? (
                            <IconTrophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          ) : (
                            <IconBolt className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          )}
                          <span className="truncate">{roundName}</span>
                          {isFinal && (
                            <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-1.5 py-0.2 rounded font-black shrink-0">
                              FINAL
                            </span>
                          )}
                        </h3>
                        <span className="text-[10.5px] font-mono text-slate-500 font-bold shrink-0">
                          {roundFixtures.filter((f) => f.played).length} / {roundFixtures.length} Completed
                        </span>
                      </div>

                      {/* Draw pending (shown once on the first undrawn round) */}
                      {!currentTournament.drawCompleted && currentTournament.drawDate && roundIndex === 0 && (
                        <div className="office-subcard rounded-2xl px-3 py-1 border border-amber-300 shadow-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs font-display font-black text-amber-900 uppercase">
                            <span>Draw pending</span>
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-800 font-bold">
                              <IconCalendar className="w-3 h-3" />
                              <span>{formatCareerDate(currentTournament.drawDate, save.settings?.dateFormat)}</span>
                            </span>
                          </div>
                          {currentTournament.qualifyingClubs && currentTournament.qualifyingClubs.length > 0 && (
                            <div className="border-t border-amber-200">
                              <button
                                type="button"
                                aria-expanded={showEntrants}
                                onClick={() => setShowEntrants((open) => !open)}
                                className="w-full min-h-[40px] flex items-center justify-between gap-2 text-xs font-bold text-zinc-700 cursor-pointer"
                              >
                                <span>
                                  {showEntrants ? 'Hide' : 'Show'} entrants ({currentTournament.qualifyingClubs.length})
                                </span>
                                {showEntrants ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
                              </button>
                              {showEntrants && (
                                <p className="pb-2.5 text-[11px] leading-relaxed text-zinc-700">
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
                                        {cId === userClubId ? <strong className="text-zinc-950">{name}</strong> : name}
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
                          <article className={`p-3 sm:p-3.5 rounded-2xl border ${
                            isFinal
                              ? 'border-2 border-amber-400 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 shadow-sm'
                              : 'border-2 border-amber-500/80 bg-white shadow-sm'
                          }`}>
                            <div className="flex flex-wrap justify-between items-center text-[10px] text-zinc-500 font-bold mb-2 gap-1.5">
                              <span className={`inline-flex items-center gap-1 font-display font-black px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider shadow-2xs ${
                                isFinal
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                                  : 'office-nav-tab-active text-white'
                              }`}>
                                {isFinal ? (
                                  <>
                                    <IconTrophy className="w-3 h-3" />
                                    <span>The Cup Final</span>
                                  </>
                                ) : (
                                  <>
                                    <IconStar className="w-3 h-3" filled />
                                    <span>Your Cup Fixture</span>
                                  </>
                                )}
                              </span>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                  isUserHome
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                                }`}>
                                  {isUserHome ? 'Home' : 'Away'}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <IconCalendar className="w-3 h-3" />
                                  <span>{formatCareerDate(userTie.date, save.settings?.dateFormat)}</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 my-1">
                              {/* Home Team */}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                  data-force-white="true"
                                  className="club-crest w-4 h-4 rounded-full border border-slate-300 shrink-0 shadow-2xs"
                                  style={{
                                    background: `linear-gradient(135deg, ${home?.primaryColor || '#555'}, ${home?.secondaryColor || '#222'})`,
                                  }}
                                />
                                <span
                                  className={`text-xs font-bold truncate ${
                                    userTie.homeClubId === userClubId
                                      ? 'text-blue-700 font-black'
                                      : 'text-[#0b1536]'
                                  }`}
                                >
                                  {home ? getEffectiveClubName(home, save.club) : userTie.homeClubId === 'tbc' ? 'TBC' : userTie.homeClubId}
                                </span>
                              </div>

                              {/* Scoreline */}
                              <div className="px-3 py-1 bg-white border border-slate-200/90 rounded-xl text-center shrink-0 shadow-2xs">
                                {userTie.played ? (
                                  <div>
                                    <span className="font-display font-black text-xs sm:text-sm text-[#0b1536]">
                                      {userTie.homeScore} - {userTie.awayScore}
                                    </span>
                                    {userTie.leg === 2 && (
                                      <span className="block text-[10px] font-mono text-amber-700 font-bold leading-none mt-0.5">
                                        (Agg: {(userTie.aggregateHomeScore ?? 0) + (userTie.homeScore ?? 0)}-{(userTie.aggregateAwayScore ?? 0) + (userTie.awayScore ?? 0)})
                                      </span>
                                    )}
                                    {userTie.penalties && (
                                      <span className="block text-[10px] font-mono text-amber-700 font-bold leading-none mt-0.5">
                                        (Pens: {userTie.penalties.homePenalties}-{userTie.penalties.awayPenalties})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-[10px] font-display font-black text-slate-500 uppercase">
                                      VS
                                    </span>
                                    {userTie.leg === 2 && (
                                      <span className="block text-[10px] font-mono text-amber-700 font-bold leading-none mt-0.5">
                                        Agg: {userTie.aggregateHomeScore ?? 0}-{userTie.aggregateAwayScore ?? 0}
                                      </span>
                                    )}
                                    {userTie.leg === 1 && (
                                      <span className="block text-[10px] font-mono text-slate-400 font-semibold leading-none mt-0.5">
                                        Leg 1
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Away Team */}
                              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                                <span
                                  className={`text-xs font-bold truncate ${
                                    userTie.awayClubId === userClubId
                                      ? 'text-blue-700 font-black'
                                      : 'text-[#0b1536]'
                                  }`}
                                >
                                  {away ? getEffectiveClubName(away, save.club) : userTie.awayClubId === 'tbc' ? 'TBC' : userTie.awayClubId}
                                </span>
                                <div
                                  data-force-white="true"
                                  className="club-crest w-4 h-4 rounded-full border border-slate-300 shrink-0 shadow-2xs"
                                  style={{
                                    background: `linear-gradient(135deg, ${away?.primaryColor || '#555'}, ${away?.secondaryColor || '#222'})`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* User Action for Unplayed Match */}
                            {!userTie.played && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setActiveCupMatch(userTie)}
                                  className="office-action-btn-primary w-full py-2.5 px-3 rounded-xl text-white font-display font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                                >
                                  <IconPlay className="w-3.5 h-3.5" />
                                  <span>Matchday Command Center</span>
                                </button>
                              </div>
                            )}
                          </article>
                        );
                      })()}

                      {/* Other Ties (Compact Rows) */}
                      {otherTies.length > 0 && (
                        <div className="space-y-1">
                          {userTie && (
                            <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block pt-1 font-display px-1">
                              Other {roundName} Matches ({otherTies.length})
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
                                  className={`px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-white flex items-center justify-between text-xs shadow-2xs hover:border-slate-300 transition-colors ${
                                    isTbc ? 'opacity-70 bg-slate-50/60' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <div
                                      data-force-white="true"
                                      className="club-crest w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                                      style={{
                                        background: isTbc
                                          ? '#94a3b8'
                                          : `linear-gradient(135deg, ${home?.primaryColor || '#555'}, ${home?.secondaryColor || '#222'})`,
                                      }}
                                    />
                                    <span className="truncate text-[11px] text-[#0b1536] font-medium">
                                      {home ? getEffectiveClubName(home, save.club) : isTbc ? 'TBC' : fixture.homeClubId}
                                    </span>
                                  </div>

                                  <div className="px-2 font-mono text-[11px] text-center shrink-0">
                                    {fixture.played ? (
                                      <span className="font-bold text-[#0b1536] bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 inline-block">
                                        {fixture.homeScore} - {fixture.awayScore}
                                        {fixture.leg === 2 && (
                                          <span className="text-[10px] text-amber-700 font-bold block leading-none">
                                            Agg: {(fixture.aggregateHomeScore ?? 0) + (fixture.homeScore ?? 0)}-{(fixture.aggregateAwayScore ?? 0) + (fixture.awayScore ?? 0)}
                                          </span>
                                        )}
                                        {fixture.penalties && (
                                          <span className="text-[10px] text-amber-700 font-bold block leading-none">
                                            ({fixture.penalties.homePenalties}-{fixture.penalties.awayPenalties}p)
                                          </span>
                                        )}
                                      </span>
                                    ) : isTbc ? (
                                      <span className="text-amber-700 text-[10px] uppercase font-mono font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                        Awaiting Draw
                                      </span>
                                    ) : (
                                      <div>
                                        <span className="text-slate-500 text-[10px] font-bold">VS</span>
                                        {fixture.leg === 2 && (
                                          <span className="text-[10px] text-amber-700 font-bold block leading-none">
                                            Agg: {fixture.aggregateHomeScore ?? 0}-{fixture.aggregateAwayScore ?? 0}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end text-right">
                                    <span className="truncate text-[11px] text-[#0b1536] font-medium">
                                      {away ? getEffectiveClubName(away, save.club) : isTbc ? 'TBC' : fixture.awayClubId}
                                    </span>
                                    <div
                                      data-force-white="true"
                                      className="club-crest w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                                      style={{
                                        background: isTbc
                                          ? '#94a3b8'
                                          : `linear-gradient(135deg, ${away?.primaryColor || '#555'}, ${away?.secondaryColor || '#222'})`,
                                      }}
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

      <p className="text-[11px] text-slate-500 text-center">Trophies you have won are listed in the Legacy tab.</p>

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
