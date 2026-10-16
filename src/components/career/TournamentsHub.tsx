'use client';

import React, { useState, useEffect } from 'react';
import {
  CareerSaveFile,
  CupTournament,
  CupFixture,
  Club,
} from '../../career/types';
import {
  CUP_IDS,
  findAnyClub,
  simulateKnockoutCupFixture,
  advanceCupTournament,
  simulateAiFixturesInCupRound,
  conductCupDraw,
} from '../../career/cups';
import { getAllClubs, getEffectiveClubName } from '../../career/clubs';
import { formatCareerDate } from '../../career/formatters';
import { MatchDayModal } from './MatchDayModal';

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
    { id: CUP_IDS.EURO_CHAMPIONS, name: 'Champions Cup', icon: '⭐', prize: '£45M' },
    { id: CUP_IDS.EURO_CHALLENGE, name: 'Challenge Cup', icon: '🌍', prize: '£22M' },
    { id: CUP_IDS.EURO_PLATE, name: 'European Plate', icon: '🏅', prize: '£12M' },
    { id: CUP_IDS.ENGLISH_CUP, name: 'The English Cup', icon: '👑', prize: '£16M' },
    { id: CUP_IDS.LEAGUE_CUP, name: 'League Cup', icon: '🏆', prize: '£8M' },
    { id: CUP_IDS.SHIELD, name: 'Season Opener Shield', icon: '🛡️', prize: '£2.5M' },
    { id: 'cabinet', name: 'Trophy Cabinet', icon: '🏛️', prize: `${save.trophies?.length || 0} Won` },
  ];

  const handleQuickSimulateFixture = (fixture: CupFixture) => {
    if (!currentTournament) return;

    const homeClub = findAnyClub(fixture.homeClubId) || getAllClubs()[0];
    const awayClub = findAnyClub(fixture.awayClubId) || getAllClubs()[1];

    const isUserHome = fixture.homeClubId === userClubId;
    const isUserAway = fixture.awayClubId === userClubId;

    const simmed = simulateKnockoutCupFixture(
      fixture,
      homeClub,
      awayClub,
      isUserHome ? save.squad : undefined,
      isUserAway ? save.squad : undefined
    );

    const updatedFixtures = currentTournament.fixtures.map((f) =>
      f.id === fixture.id ? simmed : f
    );

    let updatedTourney: CupTournament = {
      ...currentTournament,
      fixtures: updatedFixtures,
    };

    // Advance tournament if round is complete
    const adv = advanceCupTournament(updatedTourney, save.season.yearStart);
    updatedTourney = adv.updatedTournament;

    const updatedCups = {
      ...cups,
      [selectedTournamentId]: updatedTourney,
    };

    const trophies = [...(save.trophies || [])];
    const finances = { ...save.finances };

    if (adv.updatedTournament.isCompleted && adv.updatedTournament.winnerClubId === userClubId) {
      const trophyYear = save.season.yearStart + 1;
      if (!trophies.some((t) => t.competitionId === selectedTournamentId && t.year === trophyYear)) {
        trophies.push({
          competitionId: selectedTournamentId,
          competitionName: adv.updatedTournament.name,
          year: trophyYear,
        });
        finances.transferBudget += adv.updatedTournament.prizeMoney;
        finances.balance += adv.updatedTournament.prizeMoney;
        onNotification?.(`🏆 Silverware! ${getEffectiveClubName(save.club)} won the ${adv.updatedTournament.name}!`);
      }
    } else {
      onNotification?.(`Match completed: ${homeClub.shortName} ${simmed.homeScore} - ${simmed.awayScore} ${awayClub.shortName}`);
    }

    onUpdateSave({
      ...save,
      cups: updatedCups,
      trophies,
      finances,
    });
  };

  return (
    <div id="tournament-desk-section" className="space-y-6 w-full scroll-mt-20">
      {/* Tournament Selection Pills */}
      <nav
        aria-label="Cup Tournaments Selector"
        data-no-swipe="true"
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800"
      >
        {tournamentList.map((t) => {
          const isSelected = selectedTournamentId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                if (selectedTournamentId === t.id) {
                  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                } else {
                  setSelectedTournamentId(t.id);
                  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                }
              }}
              className={`py-2 px-3.5 rounded-xl text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                isSelected
                  ? 'office-nav-tab-active shadow-sm'
                  : 'office-nav-tab'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.name}</span>
              <span className="text-[10px] font-mono font-normal opacity-75">({t.prize})</span>
            </button>
          );
        })}
      </nav>

      {/* VIEW 1: TROPHY CABINET */}
      {selectedTournamentId === 'cabinet' ? (
        <section id="cup-tournament-cabinet" className="space-y-4 scroll-mt-20">
          <header className="bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏛️</span>
              <div>
                <h2 className="text-sm font-display font-black text-white uppercase tracking-tight">
                  Trophy Cabinet
                </h2>
                <p className="text-[10px] text-slate-400">
                  {getEffectiveClubName(save.club)} Honours
                </p>
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-xl text-center">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Total</span>
              <span className="text-base font-display font-black text-amber-400">
                {save.trophies?.length || 0}
              </span>
            </div>
          </header>

          {(!save.trophies || save.trophies.length === 0) ? (
            <div className="bg-slate-900/20 border border-slate-850 rounded-2xl p-8 text-center space-y-2">
              <span className="text-3xl block">🏆</span>
              <h3 className="text-xs font-display font-black text-slate-300 uppercase">
                The Cabinet is Empty
              </h3>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Win domestic cups or European competitions to lift your first piece of silverware.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {save.trophies.map((trophy, idx) => (
                <article
                  key={`${trophy.competitionId}_${trophy.year}_${idx}`}
                  className="bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-900/70 border border-amber-500/30 rounded-xl p-3 space-y-1.5 shadow-sm text-center relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🏆</span>
                    <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-950/70 border border-amber-800/60 px-1.5 py-0.2 rounded-full">
                      {trophy.year}
                    </span>
                  </div>
                  <h4 className="text-xs font-display font-black text-white uppercase tracking-tight truncate">
                    {trophy.competitionName}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">
                    {getEffectiveClubName(save.club)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : !currentTournament ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
          Tournament data not available.
        </div>
      ) : (
        /* VIEW 2: TOURNAMENT BRACKET & FIXTURES */
        <section id={`cup-tournament-${selectedTournamentId}`} className="space-y-4 scroll-mt-20">
          {/* Header Card */}
          <header className="bg-slate-900/50 border border-slate-800 rounded-2xl px-4 py-2.5 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 shadow-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-950/60 border border-blue-900/60 px-2 py-0.2 rounded-full font-display">
                  Prize: £{(currentTournament.prizeMoney / 1_000_000).toFixed(1)}M
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {currentTournament.currentRound}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-display font-black text-white uppercase tracking-tight truncate mt-0.5">
                {currentTournament.name}
              </h2>
            </div>

            {currentTournament.isCompleted && currentTournament.winnerClubId && (
              <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl px-3 py-1.5 flex items-center gap-2 ml-auto">
                <span className="text-xl">🏆</span>
                <div>
                  <span className="text-[8px] uppercase font-bold text-blue-400 block tracking-wider">
                    Champion
                  </span>
                  <span className="text-xs font-display font-black text-white uppercase">
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
              <div className="space-y-4">
                {roundEntries.map(([roundName, roundFixtures]) => {
                  const userTie = roundFixtures.find(
                    (f) => f.homeClubId === userClubId || f.awayClubId === userClubId
                  );
                  const otherTies = roundFixtures.filter((f) => f.id !== userTie?.id);

                  return (
                    <div key={roundName} className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                        <h3 className="text-xs font-display font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <span>⚔️</span> {roundName}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-500">
                          {roundFixtures.filter((f) => f.played).length} / {roundFixtures.length} Completed
                        </span>
                      </div>

                      {/* Draw Pending Banner when round has not been drawn */}
                      {!currentTournament.drawCompleted && currentTournament.drawDate && (
                        <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-3.5 space-y-2 mb-2">
                          <div className="flex items-center justify-between text-xs font-display font-black text-amber-300 uppercase">
                            <span>🎲 Tournament Draw Scheduled</span>
                            <span className="font-mono text-[10px] text-amber-400">
                              📅 {formatCareerDate(currentTournament.drawDate, save.settings?.dateFormat)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            Qualified clubs are confirmed for the {currentTournament.currentRound}. Knockout pairings will be officially drawn on {formatCareerDate(currentTournament.drawDate, save.settings?.dateFormat)}.
                          </p>
                          {currentTournament.qualifyingClubs && currentTournament.qualifyingClubs.length > 0 && (
                            <div className="pt-1">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1.5">
                                Confirmed Participants ({currentTournament.qualifyingClubs.length}):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {currentTournament.qualifyingClubs.map((cId) => {
                                  const club = findAnyClub(cId);
                                  const isUser = cId === userClubId;
                                  return (
                                    <span
                                      key={cId}
                                      className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${
                                        isUser
                                          ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-500 text-blue-700 dark:text-blue-300 font-bold'
                                          : 'bg-slate-900 border-slate-800 text-slate-300'
                                      }`}
                                    >
                                      {club ? getEffectiveClubName(club, save.club) : cId}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* User Fixture Spotlight (Always Top) */}
                      {userTie && (() => {
                        const home = findAnyClub(userTie.homeClubId);
                        const away = findAnyClub(userTie.awayClubId);

                        return (
                          <article className="p-3.5 rounded-2xl border border-blue-500/70 bg-gradient-to-r from-blue-500/10 via-slate-900/80 to-slate-950 shadow-md ring-1 ring-blue-500/30">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-2">
                              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-display font-black px-2 py-0.2 rounded text-[9px] uppercase tracking-wider shadow-sm">
                                ⭐ Your Cup Fixture
                              </span>
                              <span>📅 {formatCareerDate(userTie.date, save.settings?.dateFormat)}</span>
                            </div>

                            <div className="flex items-center justify-between gap-3 my-1">
                              {/* Home Team */}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                  className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                                  style={{
                                    background: `linear-gradient(135deg, ${home?.primaryColor || '#555'}, ${home?.secondaryColor || '#222'})`,
                                  }}
                                />
                                <span
                                  className={`text-xs font-bold truncate ${
                                    userTie.homeClubId === userClubId
                                      ? 'text-blue-400 font-black'
                                      : 'text-white'
                                  }`}
                                >
                                  {home ? getEffectiveClubName(home, save.club) : userTie.homeClubId === 'tbc' ? 'TBC' : userTie.homeClubId}
                                </span>
                              </div>

                              {/* Scoreline */}
                              <div className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-center shrink-0">
                                {userTie.played ? (
                                  <div>
                                    <span className="font-display font-black text-xs sm:text-sm text-white">
                                      {userTie.homeScore} - {userTie.awayScore}
                                    </span>
                                    {userTie.penalties && (
                                      <span className="block text-[8px] font-mono text-amber-400 leading-none">
                                        (P: {userTie.penalties.homePenalties}-{userTie.penalties.awayPenalties})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-display font-black text-slate-500 uppercase">
                                    VS
                                  </span>
                                )}
                              </div>

                              {/* Away Team */}
                              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                                <span
                                  className={`text-xs font-bold truncate ${
                                    userTie.awayClubId === userClubId
                                      ? 'text-blue-400 font-black'
                                      : 'text-white'
                                  }`}
                                >
                                  {away ? getEffectiveClubName(away, save.club) : userTie.awayClubId === 'tbc' ? 'TBC' : userTie.awayClubId}
                                </span>
                                <div
                                  className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                                  style={{
                                    background: `linear-gradient(135deg, ${away?.primaryColor || '#555'}, ${away?.secondaryColor || '#222'})`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* User Action for Unplayed Match */}
                            {!userTie.played && (
                              <div className="mt-2.5 pt-2 border-t border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => setActiveCupMatch(userTie)}
                                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white font-display font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md shadow-blue-500/20 cursor-pointer transition-all"
                                >
                                  <span>🎮</span> Play Matchday Command Center
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
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block pt-1">
                              Other {roundName} Ties ({otherTies.length})
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
                                  className={`px-2.5 py-1.5 rounded-xl border border-slate-850 bg-slate-950/60 flex items-center justify-between text-xs ${
                                    isTbc ? 'opacity-70' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <div
                                      className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                                      style={{
                                        background: isTbc
                                          ? '#334155'
                                          : `linear-gradient(135deg, ${home?.primaryColor || '#555'}, ${home?.secondaryColor || '#222'})`,
                                      }}
                                    />
                                    <span className="truncate text-[11px] text-slate-300">
                                      {home ? getEffectiveClubName(home, save.club) : isTbc ? 'TBC' : fixture.homeClubId}
                                    </span>
                                  </div>

                                  <div className="px-2 font-mono text-[11px] text-center shrink-0">
                                    {fixture.played ? (
                                      <span className="font-bold text-white">
                                        {fixture.homeScore} - {fixture.awayScore}
                                        {fixture.penalties && (
                                          <span className="text-[8px] text-amber-400 block leading-none">
                                            ({fixture.penalties.homePenalties}-{fixture.penalties.awayPenalties}p)
                                          </span>
                                        )}
                                      </span>
                                    ) : isTbc ? (
                                      <span className="text-amber-400/80 text-[9.5px] uppercase font-mono">Awaiting Draw</span>
                                    ) : (
                                      <span className="text-slate-500 text-[10px]">VS</span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end text-right">
                                    <span className="truncate text-[11px] text-slate-300">
                                      {away ? getEffectiveClubName(away, save.club) : isTbc ? 'TBC' : fixture.awayClubId}
                                    </span>
                                    <div
                                      className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                                      style={{
                                        background: isTbc
                                          ? '#334155'
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
