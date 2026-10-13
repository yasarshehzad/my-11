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

  // Automatically simulate other AI matches in the active round when their scheduled date arrives or user fixture was played
  useEffect(() => {
    if (!currentTournament || currentTournament.isCompleted) return;
    const roundFixtures = currentTournament.fixtures.filter(
      (f) => f.roundName === currentTournament.currentRound
    );
    const unplayedAi = roundFixtures.filter(
      (f) =>
        !f.played &&
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
    <div className="space-y-6 w-full">
      {/* Tournament Selection Pills */}
      <nav
        aria-label="Cup Tournaments Selector"
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800"
      >
        {tournamentList.map((t) => {
          const isSelected = selectedTournamentId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTournamentId(t.id)}
              className={`py-2 px-3.5 rounded-xl border text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-md shadow-emerald-950/50'
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:border-slate-700'
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
        <section className="space-y-6">
          <header className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 font-display">
                Club Honours
              </span>
              <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span>🏛️</span> Trophy Cabinet
              </h2>
              <p className="text-xs text-slate-400">
                Silverware accumulated during your managerial tenure at {getEffectiveClubName(save.club)}.
              </p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 px-5 py-3 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Honours</span>
              <span className="text-2xl font-display font-black text-emerald-400">
                {save.trophies?.length || 0}
              </span>
            </div>
          </header>

          {(!save.trophies || save.trophies.length === 0) ? (
            <div className="bg-slate-900/20 border border-slate-850 rounded-3xl p-12 text-center space-y-3">
              <span className="text-4xl block">🏆</span>
              <h3 className="text-base font-display font-black text-slate-300 uppercase">
                The Cabinet is Empty
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Win domestic competitions like The English Cup or compete against continental giants in the European Champions Cup to lift your first trophy.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {save.trophies.map((trophy, idx) => (
                <article
                  key={`${trophy.competitionId}_${trophy.year}_${idx}`}
                  className="bg-gradient-to-br from-slate-900/70 to-slate-950 border border-emerald-900/40 rounded-2xl p-5 space-y-3 shadow-lg relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-3xl">🏆</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-2 py-0.5 rounded-full">
                      {trophy.year}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-display font-black text-white uppercase tracking-tight">
                      {trophy.competitionName}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Champions • {getEffectiveClubName(save.club)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : !currentTournament ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
          Tournament data not available.
        </div>
      ) : (
        /* VIEW 2: TOURNAMENT BRACKET & FIXTURES */
        <section className="space-y-6">
          {/* Header Card */}
          <header className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-2.5 py-0.5 rounded-full font-display">
                  Prize: £{(currentTournament.prizeMoney / 1_000_000).toFixed(1)}M
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Current Stage: {currentTournament.currentRound}
                </span>
              </div>
              <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                {currentTournament.name}
              </h2>
            </div>

            {currentTournament.isCompleted && currentTournament.winnerClubId && (
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl px-5 py-3 flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <span className="text-[9px] uppercase font-bold text-emerald-400 block tracking-widest">
                    Tournament Champion
                  </span>
                  <span className="text-sm font-display font-black text-white uppercase">
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
            // Group fixtures by roundName
            const roundsMap = new Map<string, CupFixture[]>();
            currentTournament.fixtures.forEach((f) => {
              const list = roundsMap.get(f.roundName) || [];
              list.push(f);
              roundsMap.set(f.roundName, list);
            });

            const roundEntries = Array.from(roundsMap.entries());

            return (
              <div className="space-y-6">
                {roundEntries.map(([roundName, roundFixtures]) => (
                  <div key={roundName} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <h3 className="text-xs font-display font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <span>⚔️</span> {roundName}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-500">
                        {roundFixtures.filter((f) => f.played).length} / {roundFixtures.length} Completed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {roundFixtures.map((fixture) => {
                        const home = findAnyClub(fixture.homeClubId);
                        const away = findAnyClub(fixture.awayClubId);
                        const isUserInTie =
                          fixture.homeClubId === userClubId || fixture.awayClubId === userClubId;

                        return (
                          <article
                            key={fixture.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              isUserInTie
                                ? 'bg-slate-900/80 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                                : 'bg-slate-900/30 border-slate-850 hover:border-slate-800'
                            }`}
                          >
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-2">
                              <span>📅 {formatCareerDate(fixture.date, save.settings?.dateFormat)}</span>
                              {isUserInTie && (
                                <span className="bg-emerald-500 text-slate-950 font-display font-black px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                                  Your Fixture
                                </span>
                              )}
                            </div>

                            {/* Home vs Away Match Row */}
                            <div className="flex items-center justify-between gap-3 my-2">
                              {/* Home Team */}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                  className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                                  style={{
                                    background: `linear-gradient(135deg, ${home?.primaryColor || '#555'}, ${home?.secondaryColor || '#222'})`,
                                  }}
                                />
                                <span
                                  className={`text-xs font-bold truncate ${
                                    fixture.homeClubId === userClubId
                                      ? 'text-emerald-400 font-display'
                                      : 'text-white'
                                  }`}
                                >
                                  {home ? getEffectiveClubName(home, save.club) : fixture.homeClubId}
                                </span>
                              </div>

                              {/* Scoreline */}
                              <div className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-center shrink-0 min-w-16">
                                {fixture.played ? (
                                  <div>
                                    <span className="font-display font-black text-xs text-white">
                                      {fixture.homeScore} - {fixture.awayScore}
                                    </span>
                                    {fixture.penalties && (
                                      <span className="block text-[9px] font-mono text-amber-400">
                                        (P: {fixture.penalties.homePenalties}-{fixture.penalties.awayPenalties})
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
                              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                <span
                                  className={`text-xs font-bold truncate text-right ${
                                    fixture.awayClubId === userClubId
                                      ? 'text-emerald-400 font-display'
                                      : 'text-white'
                                  }`}
                                >
                                  {away ? getEffectiveClubName(away, save.club) : fixture.awayClubId}
                                </span>
                                <div
                                  className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                                  style={{
                                    background: `linear-gradient(135deg, ${away?.primaryColor || '#555'}, ${away?.secondaryColor || '#222'})`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Action Buttons for Unplayed Matches */}
                            {!fixture.played && (
                              <div className="mt-3 pt-2 border-t border-slate-850 flex items-center justify-between gap-2">
                                {isUserInTie ? (
                                  <button
                                    onClick={() => setActiveCupMatch(fixture)}
                                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
                                  >
                                    <span>🎮</span> Play Matchday Command Center
                                  </button>
                                ) : (
                                  <div className="flex-1 py-1.5 px-3 rounded-xl bg-slate-950/60 border border-slate-850/80 text-slate-400 font-mono text-[10px] flex items-center justify-center gap-1.5">
                                    <span>⏱️</span>
                                    <span>Simulates automatically on matchday</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))}
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
