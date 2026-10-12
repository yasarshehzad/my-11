'use client';

import React, { useState } from 'react';
import {
  CareerSaveFile,
  LeagueFixture,
  Club,
} from '../../career/types';
import { getAllClubs, getEffectiveClubName } from '../../career/clubs';
import { getNextClubFixture } from '../../career/calendar';
import {
  simulateMatchFixture,
  advanceTimeSkip,
  TimeSkipTarget,
  simulateRound,
} from '../../career/sim';
import { calculateStandings } from '../../career/table';
import { formatCurrency } from '../../career/finance';
import { isSeasonComplete, getSeasonReviewSummary, advanceToNextSeason } from '../../career/seasons';
import { MatchDayModal } from './MatchDayModal';

interface FixturesCalendarProps {
  save: CareerSaveFile;
  onUpdateSave: (updated: CareerSaveFile) => void;
  onNotification?: (msg: string) => void;
  onNavigateOffice?: () => void;
}

export function FixturesCalendar({ save, onUpdateSave, onNotification, onNavigateOffice }: FixturesCalendarProps) {
  const [filterScope, setFilterScope] = useState<'my_club' | 'all'>('my_club');
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all');
  const [simulating, setSimulating] = useState(false);
  const [activeMatchFixture, setActiveMatchFixture] = useState<LeagueFixture | null>(null);
  const [showSeasonReviewModal, setShowSeasonReviewModal] = useState(false);

  const fixtures = save.fixtures || [];
  const userClubId = save.club.id;
  const userSquad = save.squad || [];

  const allClubs = getAllClubs();
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));

  const nextFixture = getNextClubFixture(fixtures, userClubId);
  const seasonFinished = isSeasonComplete(fixtures);
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

    onUpdateSave(updatedSave);
    setSimulating(false);

    if (onNotification) {
      const userWon = isUserHome
        ? simmed.homeScore! > simmed.awayScore!
        : simmed.awayScore! > simmed.homeScore!;
      const isDraw = simmed.homeScore === simmed.awayScore;

      const resultText = userWon ? 'Victory!' : isDraw ? 'Draw' : 'Defeat';
      onNotification(
        `Matchday ${nextFixture.round} Result: ${simmed.homeScore} - ${simmed.awayScore} (${resultText})`
      );
    }
  };

  // Time-skip advancement
  const handleTimeSkip = (target: TimeSkipTarget) => {
    setSimulating(true);
    const res = advanceTimeSkip(save, target);
    onUpdateSave(res.updatedSave);
    setSimulating(false);

    if (onNotification) {
      if (res.pausedReason) {
        onNotification(res.pausedReason);
      } else {
        onNotification(`Advanced calendar (${res.matchesPlayedCount} matches simulated)`);
      }
    }
  };

  // Filter fixtures
  let displayedFixtures = fixtures;

  if (filterScope === 'my_club') {
    displayedFixtures = displayedFixtures.filter(
      (f) => f.homeClubId === userClubId || f.awayClubId === userClubId
    );
  }

  if (selectedRound !== 'all') {
    displayedFixtures = displayedFixtures.filter((f) => f.round === selectedRound);
  }

  return (
    <div className="space-y-6">
      {/* Calendar Schedule Browser Notice */}
      <section className="bg-slate-900/60 border border-slate-850 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
        <div className="space-y-0.5">
          <div className="text-xs font-display font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <span>📅</span>
            <span>League Fixtures & Calendar Schedule</span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold ml-2">
              (In-Game: {save.season.currentDate})
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            View completed match results and upcoming fixtures across all 38 rounds. Matchday simulations and calendar advancement are run directly from the <strong className="text-emerald-400">Office</strong> command hub.
          </p>
        </div>
        {onNavigateOffice && (
          <button
            onClick={onNavigateOffice}
            className="py-2 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider transition-all shadow-md shrink-0 cursor-pointer"
          >
            Go to Office / Play Match ➔
          </button>
        )}
      </section>

      {/* Season Complete & Transition Spotlight */}
      {seasonFinished && seasonSummary && (
        <section className="bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-emerald-950/40 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-950/60 border border-amber-800/60 px-3 py-1 rounded-full font-display">
              Season {save.season.seasonNumber} Complete • All 38 Matchdays Played
            </span>
            <span className="text-xs text-amber-300 font-bold">🏆 Season Review</span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-black text-white">
                {seasonSummary.leagueTitle ? '👑 League Champions!' : `Season Completed • Finished #${seasonSummary.finalPosition}`}
              </h3>
              <p className="text-xs text-slate-300">
                Prize Money: <span className="text-emerald-400 font-bold">{formatCurrency(seasonSummary.prizeMoney)}</span> • Continental Status: <span className="text-blue-400 font-bold">{seasonSummary.europeanQualification}</span>
              </p>
            </div>

            <button
              onClick={() => setShowSeasonReviewModal(true)}
              className="py-3 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-xl transition-all cursor-pointer"
            >
              🎉 Review & Advance to Season {save.season.seasonNumber + 1}
            </button>
          </div>
        </section>
      )}

      {/* Filter and Round Selector */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterScope('my_club')}
            className={`py-1.5 px-3 rounded-xl text-xs font-display font-black uppercase tracking-wider transition-all ${
              filterScope === 'my_club'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            My Fixtures ({fixtures.filter((f) => f.homeClubId === userClubId || f.awayClubId === userClubId).length})
          </button>
          <button
            onClick={() => setFilterScope('all')}
            className={`py-1.5 px-3 rounded-xl text-xs font-display font-black uppercase tracking-wider transition-all ${
              filterScope === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All League Games
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Round:</label>
          <select
            value={selectedRound}
            onChange={(e) =>
              setSelectedRound(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
            }
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
          >
            <option value="all">All 38 Rounds</option>
            {Array.from({ length: 38 }, (_, i) => i + 1).map((r) => (
              <option key={r} value={r}>
                Round {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fixtures List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displayedFixtures.map((fixture) => {
          const home = clubsMap.get(fixture.homeClubId) || allClubs[0];
          const away = clubsMap.get(fixture.awayClubId) || allClubs[1];
          const isUserMatch =
            fixture.homeClubId === userClubId || fixture.awayClubId === userClubId;

          return (
            <div
              key={fixture.id}
              className={`p-4 rounded-2xl border transition-all ${
                isUserMatch
                  ? 'border-emerald-500/40 bg-slate-900/60 shadow-lg'
                  : 'border-slate-850 bg-slate-950/40'
              }`}
            >
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mb-2">
                <span>Round {fixture.round}</span>
                <span>{fixture.date}</span>
              </div>

              {/* Clubs & Result */}
              <div className="flex justify-between items-center text-xs">
                {/* Home */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${home.primaryColor}, ${home.secondaryColor})`,
                    }}
                  />
                  <span
                    className={`truncate font-semibold ${
                      fixture.homeClubId === userClubId ? 'text-emerald-300 font-bold' : 'text-white'
                    }`}
                  >
                    {getEffectiveClubName(home)}
                  </span>
                </div>

                {/* Score or Status */}
                <div className="px-3 text-center flex-shrink-0">
                  {fixture.played ? (
                    <div className="font-display font-black text-sm text-white px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                      {fixture.homeScore} - {fixture.awayScore}
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-slate-500 uppercase px-2 py-0.5 rounded bg-slate-950 border border-slate-850">
                      VS
                    </div>
                  )}
                </div>

                {/* Away */}
                <div className="flex items-center gap-2 flex-1 justify-end min-w-0 text-right">
                  <span
                    className={`truncate font-semibold ${
                      fixture.awayClubId === userClubId ? 'text-emerald-300 font-bold' : 'text-white'
                    }`}
                  >
                    {getEffectiveClubName(away)}
                  </span>
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${away.primaryColor}, ${away.secondaryColor})`,
                    }}
                  />
                </div>
              </div>

              {/* Scorers if played */}
              {fixture.played && fixture.scorers && fixture.scorers.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-900/60 text-[10px] text-slate-400 flex flex-wrap gap-x-2 gap-y-1">
                  {fixture.scorers.map((s, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span>⚽</span>
                      <span>{s.name} ({s.minute}&apos;)</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

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

      {/* Season Review & Progression Modal */}
      {showSeasonReviewModal && seasonSummary && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-slate-950 border border-amber-500/40 rounded-3xl p-6 max-w-xl w-full space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowSeasonReviewModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white text-sm cursor-pointer"
            >
              ✕
            </button>

            <header className="text-center space-y-2">
              <span className="text-4xl block">🏆</span>
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                Season {save.season.seasonNumber} Review & Dynasty Awards
              </span>
              <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                {seasonSummary.leagueTitle ? 'Premier League Champions' : `Finished #${seasonSummary.finalPosition} in the Top Flight`}
              </h3>
              <p className="text-xs text-slate-400">
                Congratulations on completing the 38-game campaign with {getEffectiveClubName(save.club)}!
              </p>
            </header>

            {/* Vitals Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl text-center space-y-1">
                <div className="text-[9px] uppercase font-bold text-slate-500">League Finish</div>
                <div className="text-lg font-display font-black text-amber-400">
                  #{seasonSummary.finalPosition}
                </div>
                <div className="text-[9px] text-slate-400 font-medium">38 Matches Played</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl text-center space-y-1">
                <div className="text-[9px] uppercase font-bold text-slate-500">Prize Revenue</div>
                <div className="text-lg font-display font-black text-emerald-400">
                  {formatCurrency(seasonSummary.prizeMoney)}
                </div>
                <div className="text-[9px] text-slate-400 font-medium">Added to Budget</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl text-center space-y-1 col-span-2 sm:col-span-1">
                <div className="text-[9px] uppercase font-bold text-slate-500">Continental Spot</div>
                <div className="text-xs font-display font-black text-blue-400 truncate">
                  {seasonSummary.europeanQualification.split('(')[0]}
                </div>
                <div className="text-[9px] text-slate-400 font-medium">Next Season</div>
              </div>
            </div>

            {/* Trophies Cabinet Added */}
            {seasonSummary.trophiesWon.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <span>✨</span> Trophies Hoisted This Season
                </div>
                <div className="flex flex-wrap gap-2">
                  {seasonSummary.trophiesWon.map((tName, i) => (
                    <span
                      key={i}
                      className="bg-amber-500/20 text-amber-200 border border-amber-500/40 px-3 py-1 rounded-xl text-xs font-display font-black flex items-center gap-1.5"
                    >
                      <span>🏆</span> {tName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Squad Seasonal Progression Logs */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 space-y-2">
              <div className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <span>🌱</span> Squad Development & Veteran Aging
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Players will now age by 1 year. Under-23 wonderkids experience rapid attribute development, while veterans gradually decline. Summer fitness resets to 100%.
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] text-slate-300 divide-y divide-slate-850/60 pt-1">
                {seasonSummary.progressionReport.logs.slice(0, 6).map((log, idx) => (
                  <div key={idx} className="py-1">
                    {log}
                  </div>
                ))}
                {seasonSummary.progressionReport.logs.length > 6 && (
                  <div className="text-[10px] text-slate-500 pt-1">
                    + {seasonSummary.progressionReport.logs.length - 6} more player development reports
                  </div>
                )}
              </div>
            </div>

            {/* Advance Confirmation Action */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSeasonReviewModal(false)}
                className="py-3 px-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-400 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAdvanceSeason}
                className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚀 Kick Off Season {save.season.seasonNumber + 1}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
