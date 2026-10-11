'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CareerSaveFile,
  LeagueFixture,
  CupFixture,
  CupTournament,
  CareerPlayer,
  TacticalMentality,
  Club,
} from '../../career/types';
import { getAllClubs, getEffectiveClubName } from '../../career/clubs';
import { findAnyClub, advanceCupTournament } from '../../career/cups';
import {
  simulateFullMatch,
  applyPostMatchSquadImpact,
  MatchSimulationResult,
  InGamePlayerState,
} from '../../career/matchEngine';
import { calculateStandings } from '../../career/table';
import { formatCurrency } from '../../career/finance';

interface MatchDayModalProps {
  fixture: LeagueFixture;
  save: CareerSaveFile;
  onClose: () => void;
  onSaveMatchResult: (updatedSave: CareerSaveFile) => void;
}

export function MatchDayModal({
  fixture,
  save,
  onClose,
  onSaveMatchResult,
}: MatchDayModalProps) {
  const [mentality, setMentality] = useState<TacticalMentality>('balanced');
  const [matchState, setMatchState] = useState<'prematch' | 'live' | 'fulltime'>('prematch');
  const [currentMinute, setCurrentMinute] = useState(0);
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 5>(2);
  const [simResult, setSimResult] = useState<MatchSimulationResult | null>(null);

  // In-match interactive substitution state
  const [subsRemaining, setSubsRemaining] = useState(5);
  const [selectedPitchPlayerId, setSelectedPitchPlayerId] = useState<string | null>(null);
  const [livePlayerStates, setLivePlayerStates] = useState<InGamePlayerState[]>([]);

  const allClubs = getAllClubs();
  const clubsMap = new Map(allClubs.map((c) => [c.id, c]));

  const homeClub = findAnyClub(fixture.homeClubId) || allClubs[0];
  const awayClub = findAnyClub(fixture.awayClubId) || allClubs[1];

  const isUserHome = fixture.homeClubId === save.club.id;
  const userClub = isUserHome ? homeClub : awayClub;
  const opponentClub = isUserHome ? awayClub : homeClub;

  const squad = save.squad || [];
  const starterIdsSet = new Set(save.lineup?.starterIds || []);
  const benchIdsSet = new Set(save.lineup?.benchIds || []);

  const starters = squad.filter((p) => starterIdsSet.has(p.id));
  const bench = squad.filter((p) => benchIdsSet.has(p.id));

  // Run full match calculation on kick-off
  const handleKickOff = () => {
    const result = simulateFullMatch(fixture, {
      homeClub,
      awayClub,
      homeStarters: isUserHome ? starters : generateProceduralStarters(homeClub),
      homeBench: isUserHome ? bench : [],
      awayStarters: !isUserHome ? starters : generateProceduralStarters(awayClub),
      awayBench: !isUserHome ? bench : [],
      homeMentality: isUserHome ? mentality : 'balanced',
      awayMentality: !isUserHome ? mentality : 'balanced',
      settings: save.settings,
    });

    setSimResult(result);
    setLivePlayerStates(isUserHome ? result.homePlayerStates : result.awayPlayerStates);
    setMatchState('live');
    setCurrentMinute(1);
  };

  // Live match ticker timer
  useEffect(() => {
    if (matchState !== 'live') return;

    if (currentMinute >= 90) {
      setMatchState('fulltime');
      return;
    }

    const intervalMs = Math.round(180 / simSpeed);
    const timer = setTimeout(() => {
      setCurrentMinute((prev) => Math.min(90, prev + 1));
    }, intervalMs);

    return () => clearTimeout(timer);
  }, [matchState, currentMinute, simSpeed]);

  const handleSkipToFullTime = () => {
    setCurrentMinute(90);
    setMatchState('fulltime');
  };

  // User interactive in-match substitution (max 5)
  const handleMakeSubstitution = (benchPlayer: CareerPlayer) => {
    if (!selectedPitchPlayerId || subsRemaining <= 0) return;

    setLivePlayerStates((prev) =>
      prev.map((s) => {
        if (s.player.id === selectedPitchPlayerId) {
          return { ...s, isOnPitch: false };
        }
        if (s.player.id === benchPlayer.id) {
          return { ...s, isOnPitch: true, minutesPlayed: 90 - currentMinute };
        }
        return s;
      })
    );

    setSubsRemaining((prev) => Math.max(0, prev - 1));
    setSelectedPitchPlayerId(null);
  };

  // Finalize & save match result to career save
  const handleFinalizeMatch = () => {
    if (!simResult) return;

    const userWon = isUserHome
      ? simResult.homeScore > simResult.awayScore
      : simResult.awayScore > simResult.homeScore;

    // Apply fitness drain, form, morale
    const updatedSquad = applyPostMatchSquadImpact(
      squad,
      livePlayerStates,
      userWon,
      save.settings
    );

    // Update fixture in league fixtures OR cup tournament
    const updatedFixtures = (save.fixtures || []).map((f) =>
      f.id === fixture.id ? simResult.fixture : f
    );

    const cups: Record<string, CupTournament> = {};
    if (save.cups) {
      for (const [k, v] of Object.entries(save.cups)) {
        cups[k] = { ...v, fixtures: [...v.fixtures] };
      }
    }

    const trophies = [...(save.trophies || [])];
    const finances = { ...(save.finances) };

    for (const [tId, tourney] of Object.entries(cups)) {
      const idx = tourney.fixtures.findIndex((f) => f.id === fixture.id);
      if (idx >= 0) {
        let cupSimFix: CupFixture = {
          ...tourney.fixtures[idx],
          ...simResult.fixture,
          isKnockout: true,
        };

        if (cupSimFix.homeScore === cupSimFix.awayScore) {
          let hp = Math.floor(Math.random() * 2) + 4;
          let ap = Math.floor(Math.random() * 2) + 3;
          if (hp === ap) {
            if (Math.random() < 0.5) hp += 1;
            else ap += 1;
          }
          cupSimFix.penalties = { homePenalties: hp, awayPenalties: ap };
        }

        tourney.fixtures[idx] = cupSimFix;
        const adv = advanceCupTournament(tourney, save.season.yearStart);
        cups[tId] = adv.updatedTournament;

        if (adv.updatedTournament.isCompleted && adv.updatedTournament.winnerClubId === save.club.id) {
          const trophyYear = save.season.yearStart + 1;
          if (!trophies.some((t) => t.competitionId === tId && t.year === trophyYear)) {
            trophies.push({
              competitionId: tId,
              competitionName: adv.updatedTournament.name,
              year: trophyYear,
            });
            finances.transferBudget += adv.updatedTournament.prizeMoney;
            finances.balance += adv.updatedTournament.prizeMoney;
          }
        }
        break;
      }
    }

    // Recalculate standings
    const updatedStandings = calculateStandings(updatedFixtures, allClubs);

    const updatedSave: CareerSaveFile = {
      ...save,
      squad: updatedSquad,
      fixtures: updatedFixtures,
      standings: updatedStandings,
      cups,
      trophies,
      finances,
      season: {
        ...save.season,
        currentDate: fixture.date,
      },
    };

    onSaveMatchResult(updatedSave);
    onClose();
  };

  // Replay match (if allowed by settings)
  const handleRetryMatch = () => {
    if (!save.settings.retryMatch) return;
    setMatchState('prematch');
    setCurrentMinute(0);
    setSimResult(null);
    setSubsRemaining(5);
    setSelectedPitchPlayerId(null);
  };

  // Events filtered up to the current live clock minute
  const visibleEvents = (simResult?.events || []).filter((e) => e.minute <= currentMinute);

  const homeLiveGoals = visibleEvents.filter((e) => e.type === 'goal' && e.clubId === homeClub.id).length;
  const awayLiveGoals = visibleEvents.filter((e) => e.type === 'goal' && e.clubId === awayClub.id).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-7 space-y-6 shadow-2xl relative my-auto">
        {/* Header Bar */}
        <header className="flex justify-between items-center border-b border-slate-900 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-display font-black text-xs uppercase tracking-wider">
              {'competitionName' in fixture
                ? (fixture as CupFixture).roundName
                : `Matchday ${fixture.round}`}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400 font-medium">
              {'competitionName' in fixture
                ? (fixture as CupFixture).competitionName
                : 'English Top Flight'}
            </span>
          </div>

          {matchState === 'prematch' && (
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white text-xs font-bold"
            >
              ✕ Exit
            </button>
          )}
        </header>

        {/* PREMATCH VIEW */}
        {matchState === 'prematch' && (
          <div className="space-y-6">
            {/* Clash Presentation */}
            <div className="grid grid-cols-3 gap-2 items-center text-center py-4 bg-slate-900/40 border border-slate-850 rounded-2xl p-4">
              {/* Home */}
              <div className="flex flex-col items-center space-y-1.5">
                <div
                  className="w-12 h-12 rounded-full border-2 border-white/20 shadow-md flex items-center justify-center text-base font-black text-white"
                  style={{
                    background: `linear-gradient(135deg, ${homeClub.primaryColor}, ${homeClub.secondaryColor})`,
                  }}
                >
                  {homeClub.shortName}
                </div>
                <div className="font-display font-black text-sm text-white leading-tight">
                  {getEffectiveClubName(homeClub)}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">
                  {isUserHome ? 'YOU • HOME' : 'Home'}
                </div>
              </div>

              {/* VS & Venue */}
              <div className="space-y-1">
                <div className="text-xl font-display font-black text-emerald-400">VS</div>
                <div className="text-[10px] text-slate-400 truncate">
                  🏟️ {homeClub.stadiumName}
                </div>
              </div>

              {/* Away */}
              <div className="flex flex-col items-center space-y-1.5">
                <div
                  className="w-12 h-12 rounded-full border-2 border-white/20 shadow-md flex items-center justify-center text-base font-black text-white"
                  style={{
                    background: `linear-gradient(135deg, ${awayClub.primaryColor}, ${awayClub.secondaryColor})`,
                  }}
                >
                  {awayClub.shortName}
                </div>
                <div className="font-display font-black text-sm text-white leading-tight">
                  {getEffectiveClubName(awayClub)}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">
                  {!isUserHome ? 'YOU • AWAY' : 'Away'}
                </div>
              </div>
            </div>

            {/* Tactical Mentality Selection */}
            <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl space-y-2">
              <label className="block text-xs font-display font-black uppercase text-slate-300">
                Team Tactical Mentality
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['defensive', 'balanced', 'attacking'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMentality(m)}
                    className={`py-2 px-3 rounded-xl text-xs font-display font-black uppercase tracking-wider transition-all ${
                      mentality === m
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Starting 11 Confirmation */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-display font-black uppercase text-slate-300">
                  Confirmed Starting XI ({starters.length})
                </span>
                <span className="text-slate-500 text-[10px]">Bench: {bench.length} subs</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {starters.slice(0, 11).map((p) => (
                  <div
                    key={p.id}
                    className="p-2 rounded-xl border border-slate-800 bg-slate-950/60 flex justify-between items-center"
                  >
                    <div className="truncate">
                      <div className="font-bold text-white truncate text-[11px]">{p.name}</div>
                      <div className="text-[9px] text-slate-400">{p.position}</div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-1">
                      <div className="font-display font-black text-emerald-400 text-xs">{p.rating}</div>
                      <div className="text-[8px] text-slate-400">{p.fitness}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kick Off Button */}
            <button
              onClick={handleKickOff}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-display font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/20 transition-all hover:scale-101 cursor-pointer"
            >
              ⚽ Kick Off Match
            </button>
          </div>
        )}

        {/* LIVE MATCH & FULLTIME VIEW */}
        {(matchState === 'live' || matchState === 'fulltime') && (
          <div className="space-y-6">
            {/* Live Scoreboard */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 text-center space-y-2 shadow-xl">
              <div className="flex justify-center items-center gap-2">
                <span className="text-[11px] font-mono font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-3 py-0.5 rounded-full border border-emerald-900/60 animate-pulse">
                  {matchState === 'fulltime' ? 'FULL TIME (90\')' : `${currentMinute}'`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <div className="font-display font-black text-base text-white truncate">
                  {getEffectiveClubName(homeClub)}
                </div>

                <div className="font-display font-black text-3xl sm:text-4xl text-white tracking-widest">
                  {homeLiveGoals} - {awayLiveGoals}
                </div>

                <div className="font-display font-black text-base text-white truncate">
                  {getEffectiveClubName(awayClub)}
                </div>
              </div>

              {/* Speed / Skip Controls during Live match */}
              {matchState === 'live' && (
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => setSimSpeed(1)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      simSpeed === 1 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    1x
                  </button>
                  <button
                    onClick={() => setSimSpeed(2)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      simSpeed === 2 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    2x
                  </button>
                  <button
                    onClick={() => setSimSpeed(5)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      simSpeed === 5 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    5x
                  </button>
                  <button
                    onClick={handleSkipToFullTime}
                    className="px-3 py-1 rounded-lg text-[10px] font-display font-black uppercase bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Skip to FT ⏩
                  </button>
                </div>
              )}
            </div>

            {/* Live Events Timeline Feed */}
            <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-4 max-h-48 overflow-y-auto space-y-2 text-xs">
              <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                Match Events Feed
              </div>
              {visibleEvents.length === 0 ? (
                <div className="text-slate-500 text-center py-4 text-[11px]">
                  Match underway. Both teams feeling each other out...
                </div>
              ) : (
                visibleEvents.map((evt, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[11px] p-1.5 rounded-lg bg-slate-950/60 border border-slate-900"
                  >
                    <span className="font-mono font-bold text-emerald-400 w-8">{evt.minute}'</span>
                    <span>
                      {evt.type === 'goal'
                        ? '⚽'
                        : evt.type === 'yellow_card'
                        ? '🟨'
                        : evt.type === 'red_card'
                        ? '🟥'
                        : evt.type === 'substitution'
                        ? '🔄'
                        : '🩹'}
                    </span>
                    <span className="font-semibold text-slate-200">{evt.detail}</span>
                  </div>
                ))
              )}
            </div>

            {/* In-Match Dugout & Substitutions (Max 5) */}
            {matchState === 'live' && (
              <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div className="font-display font-black uppercase text-slate-300">
                    Dugout Substitutions (Remaining: {subsRemaining}/5)
                  </div>
                  {selectedPitchPlayerId && (
                    <span className="text-[10px] text-amber-400 font-bold">
                      Now pick a sub to bring on:
                    </span>
                  )}
                </div>

                {/* On-pitch players selector */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {livePlayerStates
                    .filter((s) => s.isOnPitch)
                    .slice(0, 11)
                    .map((s) => (
                      <div
                        key={s.player.id}
                        onClick={() => setSelectedPitchPlayerId(s.player.id)}
                        className={`p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedPitchPlayerId === s.player.id
                            ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400'
                            : 'border-slate-850 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-white truncate text-[11px]">{s.player.name}</div>
                        <div className="flex justify-between items-center text-[9px] text-slate-400 mt-0.5">
                          <span>{s.player.position}</span>
                          <span className="text-emerald-400">{s.currentFitness}% Stamina</span>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Bench options */}
                {selectedPitchPlayerId && subsRemaining > 0 && (
                  <div className="pt-2 border-t border-slate-850 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Available Substitutes:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {livePlayerStates
                        .filter((s) => !s.isOnPitch)
                        .map((s) => (
                          <button
                            key={s.player.id}
                            onClick={() => handleMakeSubstitution(s.player)}
                            className="p-2 rounded-xl border border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-950/50 text-left text-xs transition-all cursor-pointer"
                          >
                            <div className="font-bold text-emerald-300 truncate text-[11px]">
                              + {s.player.name}
                            </div>
                            <div className="text-[9px] text-slate-400">
                              {s.player.position} • {s.player.rating} OVR
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FULL TIME WRAPUP & STATS */}
            {matchState === 'fulltime' && simResult && (
              <div className="space-y-4">
                {/* MOTM */}
                <div className="bg-emerald-950/30 border border-emerald-500/30 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
                      ⭐ Man of the Match
                    </span>
                    <div className="font-display font-black text-white text-sm">
                      {simResult.manOfTheMatch.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Match Rating</div>
                    <div className="font-display font-black text-emerald-400 text-sm">
                      {simResult.manOfTheMatch.rating}
                    </div>
                  </div>
                </div>

                {/* Match Stats Table */}
                <div className="grid grid-cols-3 gap-2 bg-slate-900/40 border border-slate-850 p-4 rounded-2xl text-xs text-center">
                  <div className="text-slate-300 font-bold">{simResult.stats.homePossession}%</div>
                  <div className="text-slate-500 font-bold uppercase text-[10px]">Possession</div>
                  <div className="text-slate-300 font-bold">{simResult.stats.awayPossession}%</div>

                  <div className="text-slate-300 font-bold">{simResult.stats.homeShots}</div>
                  <div className="text-slate-500 font-bold uppercase text-[10px]">Total Shots</div>
                  <div className="text-slate-300 font-bold">{simResult.stats.awayShots}</div>

                  <div className="text-slate-300 font-bold">{simResult.stats.homeShotsOnTarget}</div>
                  <div className="text-slate-500 font-bold uppercase text-[10px]">Shots on Target</div>
                  <div className="text-slate-300 font-bold">{simResult.stats.awayShotsOnTarget}</div>

                  <div className="text-slate-300 font-bold">{simResult.stats.homeCorners}</div>
                  <div className="text-slate-500 font-bold uppercase text-[10px]">Corners</div>
                  <div className="text-slate-300 font-bold">{simResult.stats.awayCorners}</div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  {save.settings.retryMatch ? (
                    <button
                      onClick={handleRetryMatch}
                      className="py-3 px-4 rounded-xl border border-amber-500/40 bg-amber-950/30 hover:bg-amber-950/60 text-amber-300 font-display font-black text-xs uppercase tracking-wider"
                      title="Retry match (allowed on Easy preset / Custom)"
                    >
                      🔄 Replay Match
                    </button>
                  ) : (
                    <div
                      className="py-3 px-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-600 text-[10px] font-bold flex items-center gap-1 select-none"
                      title="Match replay locked on Hard difficulty"
                    >
                      🔒 Replay Locked
                    </div>
                  )}

                  <button
                    onClick={handleFinalizeMatch}
                    className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20"
                  >
                    Confirm & Update Standings →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function generateProceduralStarters(club: Club): CareerPlayer[] {
  return Array.from({ length: 11 }, (_, i) => ({
    id: `opp_${club.id}_${i + 1}`,
    cardId: `opp_card_${i + 1}`,
    name: `${club.shortName} Player ${i + 1}`,
    rating: Math.round(club.reputation * 0.85 + (Math.random() * 6 - 3)),
    position: i === 0 ? 'GK' : i <= 4 ? 'CB' : i <= 8 ? 'CM' : 'ST',
    age: 26,
    value: 20_000_000,
    wageWeekly: 60_000,
    contractYears: 3,
    fitness: 100,
    morale: 85,
    form: 7.0,
    injured: false,
    isHomegrown: true,
    club: club.id,
    nationality: 'England',
  }));
}
