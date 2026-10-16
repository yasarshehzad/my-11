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

  return (
    <div id="tournaments-hub" data-office-ui="true" className="space-y-4 w-full scroll-mt-20">
      {/* Tournament Selection Bar */}
      <nav
        aria-label="Cup Tournaments Selector"
        data-no-swipe="true"
        className="office-floating-card p-1.5 rounded-2xl shadow-xs flex items-center gap-1 overflow-x-auto no-scrollbar"
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
              className={`py-1.5 px-3 rounded-xl text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all shrink-0 ${
                isSelected
                  ? 'office-nav-tab-active shadow-xs'
                  : 'office-nav-tab-inactive'
              }`}
            >
              <span className="text-sm">{t.icon}</span>
              <span>{t.name}</span>
              <span className={`text-[10px] font-mono ${isSelected ? 'opacity-90' : 'text-slate-400'}`}>
                ({t.prize})
              </span>
            </button>
          );
        })}
      </nav>

      {/* VIEW 1: TROPHY CABINET */}
      {selectedTournamentId === 'cabinet' ? (
        <section id="cup-tournament-cabinet" className="space-y-3.5 scroll-mt-20">
          <header className="office-subcard rounded-2xl px-4 py-3 flex justify-between items-center shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-lg shadow-2xs">
                🏛️
              </span>
              <div>
                <h2 className="text-sm font-display font-black text-[#0b1536] uppercase tracking-tight">
                  Trophy Cabinet
                </h2>
                <p className="text-[10.5px] text-slate-500">
                  {getEffectiveClubName(save.club)} &bull; Honours &amp; Silverware
                </p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 px-3.5 py-1 rounded-xl text-center shadow-2xs">
              <span className="text-[9px] uppercase font-black text-slate-400 block font-display">Trophies</span>
              <span className="text-base font-display font-black text-amber-600">
                {save.trophies?.length || 0}
              </span>
            </div>
          </header>

          {(!save.trophies || save.trophies.length === 0) ? (
            <div className="office-floating-card rounded-2xl p-8 text-center space-y-2 shadow-xs border border-slate-200">
              <span className="text-4xl block">🏆</span>
              <h3 className="text-xs font-display font-black text-[#0b1536] uppercase tracking-wide">
                The Cabinet is Empty
              </h3>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                Win domestic cups or continental competitions to lift silverware and permanently enshrine your managerial legacy.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {save.trophies.map((trophy, idx) => (
                <article
                  key={`${trophy.competitionId}_${trophy.year}_${idx}`}
                  className="office-floating-card bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-300/80 rounded-2xl p-3.5 space-y-2 shadow-xs text-center relative overflow-hidden hover:shadow-md hover:border-amber-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl filter drop-shadow-xs">🏆</span>
                    <span className="text-[9.5px] font-mono font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                      {trophy.year}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-display font-black text-[#0b1536] uppercase tracking-tight truncate">
                      {trophy.competitionName}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium truncate">
                      {getEffectiveClubName(save.club)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : !currentTournament ? (
        <div className="office-subcard rounded-2xl p-8 text-center text-slate-500 text-xs shadow-xs">
          Tournament data not available.
        </div>
      ) : (
        /* VIEW 2: TOURNAMENT BRACKET & FIXTURES */
        <section id={`cup-tournament-${selectedTournamentId}`} className="space-y-3.5 scroll-mt-20">
          {/* Header Card */}
          <header className="office-floating-card rounded-2xl px-4 py-3 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 shadow-xs border border-slate-200/90">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-display">
                  Prize: £{(currentTournament.prizeMoney / 1_000_000).toFixed(1)}M
                </span>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  {currentTournament.currentRound}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-display font-black text-[#0b1536] uppercase tracking-tight truncate mt-0.5">
                {currentTournament.name}
              </h2>
            </div>

            {currentTournament.isCompleted && currentTournament.winnerClubId && (
              <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-300 rounded-xl px-3 py-1.5 flex items-center gap-2 ml-auto shadow-2xs">
                <span className="text-xl">🏆</span>
                <div>
                  <span className="text-[8.5px] uppercase font-black text-amber-800 block font-display tracking-wider">
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
                {roundEntries.map(([roundName, roundFixtures]) => {
                  const isFinal = roundName.toLowerCase().includes('final') && !roundName.toLowerCase().includes('semi') && !roundName.toLowerCase().includes('quarter');
                  const userTie = roundFixtures.find(
                    (f) => f.homeClubId === userClubId || f.awayClubId === userClubId
                  );
                  const otherTies = roundFixtures.filter((f) => f.id !== userTie?.id);

                  return (
                    <div key={roundName} className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-1 px-1">
                        <h3 className="text-xs font-display font-black uppercase tracking-wider text-[#0b1536] flex items-center gap-1.5">
                          <span>{isFinal ? '🏆' : '⚔️'}</span>
                          <span>{roundName}</span>
                          {isFinal && (
                            <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[9px] px-1.5 py-0.2 rounded font-black">
                              FINAL
                            </span>
                          )}
                        </h3>
                        <span className="text-[10.5px] font-mono text-slate-500 font-bold">
                          {roundFixtures.filter((f) => f.played).length} / {roundFixtures.length} Completed
                        </span>
                      </div>

                      {/* Draw Pending Banner when round has not been drawn */}
                      {!currentTournament.drawCompleted && currentTournament.drawDate && (
                        <div className="office-subcard rounded-2xl p-3 sm:p-3.5 space-y-2 border border-amber-300 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/30 shadow-xs">
                          <div className="flex items-center justify-between text-xs font-display font-black text-amber-900 uppercase">
                            <span>🎲 Official Draw Pending</span>
                            <span className="font-mono text-[10px] text-amber-700 font-bold">
                              📅 {formatCareerDate(currentTournament.drawDate, save.settings?.dateFormat)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Qualified clubs are confirmed for the {currentTournament.currentRound}. Pairings will be officially drawn on {formatCareerDate(currentTournament.drawDate, save.settings?.dateFormat)}.
                          </p>
                          {currentTournament.qualifyingClubs && currentTournament.qualifyingClubs.length > 0 && (
                            <div className="pt-0.5">
                              <span className="text-[9px] uppercase font-black text-slate-500 block mb-1 font-display">
                                Confirmed Participants ({currentTournament.qualifyingClubs.length}):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {currentTournament.qualifyingClubs.map((cId) => {
                                  const club = findAnyClub(cId);
                                  const isUser = cId === userClubId;
                                  return (
                                    <span
                                      key={cId}
                                      className={`text-[9.5px] px-2 py-0.5 rounded-lg border font-bold ${
                                        isUser
                                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-black'
                                          : 'bg-white border-slate-200 text-slate-700'
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

                      {/* User Fixture Spotlight (Always on Top) */}
                      {userTie && (() => {
                        const home = findAnyClub(userTie.homeClubId);
                        const away = findAnyClub(userTie.awayClubId);
                        const isUserHome = userTie.homeClubId === userClubId;

                        return (
                          <article className={`p-3 sm:p-3.5 rounded-2xl border ${
                            isFinal
                              ? 'border-2 border-amber-400 bg-gradient-to-br from-amber-50/70 via-white to-purple-50/40 shadow-sm'
                              : 'border-2 border-blue-500 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/40 shadow-sm'
                          }`}>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mb-2">
                              <span className={`font-display font-black px-2 py-0.5 rounded-lg text-[9.5px] uppercase tracking-wider shadow-2xs ${
                                isFinal
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                                  : 'office-nav-tab-active text-white'
                              }`}>
                                {isFinal ? '🏆 The Cup Final' : '⭐ Your Cup Fixture'}
                              </span>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                  isUserHome
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                  {isUserHome ? 'Home' : 'Away'}
                                </span>
                                <span>📅 {formatCareerDate(userTie.date, save.settings?.dateFormat)}</span>
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
                                    {userTie.penalties && (
                                      <span className="block text-[8px] font-mono text-amber-700 font-bold leading-none mt-0.5">
                                        (Pens: {userTie.penalties.homePenalties}-{userTie.penalties.awayPenalties})
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
                                  className="office-action-btn-primary w-full py-2 px-3 rounded-xl text-white font-display font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                                >
                                  <span>🎮</span>
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
                            <span className="text-[9.5px] uppercase font-black text-slate-500 tracking-wider block pt-1 font-display px-1">
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
                                        {fixture.penalties && (
                                          <span className="text-[8px] text-amber-700 font-bold block leading-none">
                                            ({fixture.penalties.homePenalties}-{fixture.penalties.awayPenalties}p)
                                          </span>
                                        )}
                                      </span>
                                    ) : isTbc ? (
                                      <span className="text-amber-700 text-[9px] uppercase font-mono font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                        Awaiting Draw
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 text-[10px] font-bold">VS</span>
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
