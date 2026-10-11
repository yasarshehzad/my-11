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

interface FixturesCalendarProps {
  save: CareerSaveFile;
  onUpdateSave: (updated: CareerSaveFile) => void;
  onNotification?: (msg: string) => void;
}

export function FixturesCalendar({ save, onUpdateSave, onNotification }: FixturesCalendarProps) {
  const [filterScope, setFilterScope] = useState<'my_club' | 'all'>('my_club');
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all');
  const [simulating, setSimulating] = useState(false);

  const fixtures = save.fixtures || [];
  const userClubId = save.club.id;
  const userSquad = save.squad || [];

  const allClubs = getAllClubs();
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));

  const nextFixture = getNextClubFixture(fixtures, userClubId);

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
      {/* Time-Skip Controller Toolbar */}
      <section className="bg-slate-900/60 border border-slate-850 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📅</span>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">In-Game Date</div>
              <div className="text-sm font-mono font-black text-white">
                {save.season.currentDate}
              </div>
            </div>
          </div>

          {/* Quick Skip Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTimeSkip('next_match')}
              disabled={simulating || !nextFixture}
              className="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20"
              title="Fast forward to your next matchday"
            >
              ⏭️ Next Match
            </button>

            <button
              onClick={() => handleTimeSkip('next_week')}
              disabled={simulating}
              className="py-2 px-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-white font-display font-bold text-xs uppercase transition-all"
              title="Advance 7 days"
            >
              +7 Days
            </button>

            <button
              onClick={() => handleTimeSkip('next_month')}
              disabled={simulating}
              className="py-2 px-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-white font-display font-bold text-xs uppercase transition-all"
              title="Advance 30 days"
            >
              +1 Month
            </button>

            <button
              onClick={() => handleTimeSkip('transfer_deadline')}
              disabled={simulating}
              className="py-2 px-3 rounded-xl border border-amber-500/40 bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 font-display font-bold text-xs uppercase transition-all"
              title="Advance directly to Deadline Day"
            >
              ⏳ Deadline Day
            </button>

            <button
              onClick={() => handleTimeSkip('season_end')}
              disabled={simulating}
              className="py-2 px-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 text-slate-400 hover:text-white font-display font-bold text-xs uppercase transition-all"
              title="Simulate remaining fixtures to season finish"
            >
              🏁 Season End
            </button>
          </div>
        </div>
      </section>

      {/* Next Fixture Spotlight Card */}
      {nextFixture && (
        <section className="bg-gradient-to-r from-emerald-950/30 via-slate-900/50 to-slate-950/70 border border-emerald-500/30 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full font-display">
              Upcoming Matchday {nextFixture.round} • {nextFixture.date}
            </span>
            <span className="text-xs text-slate-400 font-medium">English Top Flight</span>
          </div>

          {/* Match Clash Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center text-center">
            {/* Home Club */}
            {(() => {
              const home = clubsMap.get(nextFixture.homeClubId) || allClubs[0];
              const isUser = nextFixture.homeClubId === userClubId;
              return (
                <div className="flex flex-col items-center space-y-2">
                  <div
                    className="w-12 h-12 rounded-full border-2 border-white/20 shadow-lg flex items-center justify-center text-base font-black text-white"
                    style={{
                      background: `linear-gradient(135deg, ${home.primaryColor}, ${home.secondaryColor})`,
                    }}
                  >
                    {home.shortName}
                  </div>
                  <div>
                    <h4 className="font-display font-black text-base text-white">
                      {getEffectiveClubName(home)}
                    </h4>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">
                      {isUser ? '(YOU • HOME)' : 'Home'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* VS & Kickoff */}
            <div className="space-y-3">
              <div className="text-2xl font-display font-black text-emerald-400">
                VS
              </div>
              <div className="text-xs text-slate-400">
                🏟️ {clubsMap.get(nextFixture.homeClubId)?.stadiumName}
              </div>

              <div className="flex justify-center gap-2 pt-1">
                <button
                  onClick={handlePlayNextMatch}
                  disabled={simulating}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all hover:scale-102"
                >
                  ▶ Play Match
                </button>
              </div>
            </div>

            {/* Away Club */}
            {(() => {
              const away = clubsMap.get(nextFixture.awayClubId) || allClubs[1];
              const isUser = nextFixture.awayClubId === userClubId;
              return (
                <div className="flex flex-col items-center space-y-2">
                  <div
                    className="w-12 h-12 rounded-full border-2 border-white/20 shadow-lg flex items-center justify-center text-base font-black text-white"
                    style={{
                      background: `linear-gradient(135deg, ${away.primaryColor}, ${away.secondaryColor})`,
                    }}
                  >
                    {away.shortName}
                  </div>
                  <div>
                    <h4 className="font-display font-black text-base text-white">
                      {getEffectiveClubName(away)}
                    </h4>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">
                      {isUser ? '(YOU • AWAY)' : 'Away'}
                    </span>
                  </div>
                </div>
              );
            })()}
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
                      <span>{s.name} ({s.minute}')</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
