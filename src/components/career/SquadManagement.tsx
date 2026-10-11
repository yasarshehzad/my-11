'use client';

import React, { useState } from 'react';
import { CareerPlayer, CareerSaveFile, CareerLineup } from '../../career/types';
import {
  validateSquad,
  categorizePosition,
  calculatePositionFit,
  getBestStartingLineup,
  SUPPORTED_CAREER_FORMATIONS,
  GeneralPositionGroup,
  isHomegrownPlayer,
} from '../../career/squad';
import { formatCurrency, formatWage } from '../../career/finance';

interface SquadManagementProps {
  save: CareerSaveFile;
  onUpdateSave: (updated: CareerSaveFile) => void;
}

export function SquadManagement({ save, onUpdateSave }: SquadManagementProps) {
  const [viewMode, setViewMode] = useState<'pitch' | 'list'>('pitch');
  const [filterGroup, setFilterGroup] = useState<'ALL' | GeneralPositionGroup>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<CareerPlayer | null>(null);
  const [swapSourceId, setSwapSourceId] = useState<string | null>(null);

  const squad = save.squad || [];
  const lineup: CareerLineup = save.lineup || getBestStartingLineup(squad);
  const currentFormation = lineup.formation || '4-3-3';

  const validation = validateSquad(squad, save.settings);

  // Group helpers
  const starterIdsSet = new Set(lineup.starterIds);
  const benchIdsSet = new Set(lineup.benchIds);

  const starters = squad.filter((p) => starterIdsSet.has(p.id));
  const bench = squad.filter((p) => benchIdsSet.has(p.id));
  const reserves = squad.filter((p) => !starterIdsSet.has(p.id) && !benchIdsSet.has(p.id));

  // Formation config
  const activeFormationConfig =
    SUPPORTED_CAREER_FORMATIONS.find((f) => f.name === currentFormation) ||
    SUPPORTED_CAREER_FORMATIONS[0];

  const handleFormationChange = (newFormation: string) => {
    const updatedLineup = getBestStartingLineup(squad, newFormation);
    onUpdateSave({
      ...save,
      lineup: updatedLineup,
    });
  };

  const handleAutoPick = () => {
    const updatedLineup = getBestStartingLineup(squad, currentFormation);
    onUpdateSave({
      ...save,
      lineup: updatedLineup,
    });
  };

  const handleRoleChange = (player: CareerPlayer, newRole: 'starter' | 'bench' | 'reserve') => {
    let nextStarters = [...lineup.starterIds];
    let nextBench = [...lineup.benchIds];

    // Remove from current
    nextStarters = nextStarters.filter((id) => id !== player.id);
    nextBench = nextBench.filter((id) => id !== player.id);

    if (newRole === 'starter') {
      if (nextStarters.length >= 11) {
        // Swap with the last starter
        const evicted = nextStarters.pop();
        if (evicted) nextBench.push(evicted);
      }
      nextStarters.push(player.id);
    } else if (newRole === 'bench') {
      if (nextBench.length >= 9) {
        nextBench.pop();
      }
      nextBench.push(player.id);
    }

    onUpdateSave({
      ...save,
      lineup: {
        ...lineup,
        starterIds: nextStarters,
        benchIds: nextBench,
      },
    });
  };

  const handlePlayerClick = (player: CareerPlayer) => {
    if (swapSourceId) {
      if (swapSourceId === player.id) {
        setSwapSourceId(null);
        return;
      }

      // Execute swap
      const sourceIsStarter = starterIdsSet.has(swapSourceId);
      const targetIsStarter = starterIdsSet.has(player.id);
      const sourceIsBench = benchIdsSet.has(swapSourceId);
      const targetIsBench = benchIdsSet.has(player.id);

      let nextStarters = [...lineup.starterIds];
      let nextBench = [...lineup.benchIds];

      if (sourceIsStarter && targetIsStarter) {
        // Swap slots inside starters
        const idx1 = nextStarters.indexOf(swapSourceId);
        const idx2 = nextStarters.indexOf(player.id);
        nextStarters[idx1] = player.id;
        nextStarters[idx2] = swapSourceId;
      } else if (sourceIsStarter && !targetIsStarter) {
        nextStarters = nextStarters.map((id) => (id === swapSourceId ? player.id : id));
        if (targetIsBench) {
          nextBench = nextBench.map((id) => (id === player.id ? swapSourceId : id));
        } else {
          nextBench = nextBench.filter((id) => id !== player.id);
        }
      } else if (!sourceIsStarter && targetIsStarter) {
        nextStarters = nextStarters.map((id) => (id === player.id ? swapSourceId : id));
        if (sourceIsBench) {
          nextBench = nextBench.map((id) => (id === swapSourceId ? player.id : id));
        }
      } else {
        // Both are bench or reserve
        if (sourceIsBench && !targetIsBench) {
          nextBench = nextBench.map((id) => (id === swapSourceId ? player.id : id));
        } else if (!sourceIsBench && targetIsBench) {
          nextBench = nextBench.map((id) => (id === player.id ? swapSourceId : id));
        }
      }

      onUpdateSave({
        ...save,
        lineup: {
          ...lineup,
          starterIds: nextStarters,
          benchIds: nextBench,
        },
      });
      setSwapSourceId(null);
    } else {
      setSelectedPlayer(player);
    }
  };

  const filteredSquad = squad.filter((p) => {
    if (filterGroup === 'ALL') return true;
    return categorizePosition(p.position) === filterGroup;
  });

  return (
    <div className="space-y-6">
      {/* Vitals Summary Strip */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3" aria-label="Squad vitals">
        <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-3.5 space-y-1">
          <div className="text-[9px] font-bold uppercase text-slate-500">Squad Size</div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-display font-black text-white">
              {squad.length}
            </span>
            <span className="text-xs text-slate-500">/ 25</span>
            {squad.length >= 18 && squad.length <= 25 ? (
              <span className="text-xs text-emerald-400" title="Squad size compliant">✓</span>
            ) : (
              <span className="text-xs text-rose-400" title="Invalid squad size">⚠️</span>
            )}
          </div>
          <div className="text-[9px] text-slate-400 font-medium">Min 18 • Max 25</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-3.5 space-y-1">
          <div className="text-[9px] font-bold uppercase text-slate-500">Average OVR</div>
          <div className="text-base font-display font-black text-emerald-400">
            {validation.averageRating}
          </div>
          <div className="text-[9px] text-slate-400 font-medium">Team Quality Rating</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-3.5 space-y-1">
          <div className="text-[9px] font-bold uppercase text-slate-500">Homegrown</div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-display font-black text-white">
              {validation.homegrownCount}
            </span>
            <span className="text-xs text-slate-500">/ 8</span>
            {validation.homegrownCount >= 8 ? (
              <span className="text-xs text-emerald-400" title="Homegrown compliant">✓</span>
            ) : (
              <span className="text-xs text-amber-400" title="Under quota">⚠️</span>
            )}
          </div>
          <div className="text-[9px] text-slate-400 font-medium">Domestic Quota</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-3.5 space-y-1">
          <div className="text-[9px] font-bold uppercase text-slate-500">Squad Value</div>
          <div className="text-base font-display font-black text-white">
            {formatCurrency(validation.totalSquadValue)}
          </div>
          <div className="text-[9px] text-slate-400 font-medium">Total Transfer Asset</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-3.5 space-y-1 col-span-2 sm:col-span-1">
          <div className="text-[9px] font-bold uppercase text-slate-500">Weekly Wages</div>
          <div className="text-base font-display font-black text-slate-200">
            {formatWage(validation.totalWagesWeekly)}
          </div>
          <div className="text-[9px] text-slate-400 font-medium">
            Limit: {formatWage(save.finances.weeklyWageBudget)}
          </div>
        </div>
      </section>

      {/* Validation Warnings / Errors if any */}
      {validation.errors.length > 0 && (
        <aside
          role="alert"
          className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-4 text-xs space-y-1 text-rose-300"
        >
          <div className="font-display font-black uppercase flex items-center gap-1.5 text-rose-200">
            <span>⚠️</span> Squad Registration Issues
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </aside>
      )}

      {/* Controls Bar: Formation, Auto Pick, View Mode */}
      <section className="flex flex-wrap justify-between items-center gap-3 bg-slate-900/40 border border-slate-850 p-3.5 rounded-2xl">
        <div className="flex items-center gap-3">
          <label className="text-[11px] font-bold uppercase text-slate-400">Formation:</label>
          <select
            value={currentFormation}
            onChange={(e) => handleFormationChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-display font-black text-white focus:outline-none focus:border-emerald-500"
          >
            {SUPPORTED_CAREER_FORMATIONS.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleAutoPick}
            className="py-1.5 px-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-300 hover:text-white text-xs font-display font-black uppercase tracking-wider transition-all"
            title="Automatically pick highest-rated team sheet"
          >
            ⚡ Auto-Pick XI
          </button>
        </div>

        <div className="flex items-center gap-2">
          {swapSourceId && (
            <button
              onClick={() => setSwapSourceId(null)}
              className="py-1.5 px-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold"
            >
              Cancel Swap
            </button>
          )}

          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('pitch')}
              className={`py-1 px-3 rounded-lg text-xs font-display font-black uppercase transition-all ${
                viewMode === 'pitch'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pitch
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`py-1 px-3 rounded-lg text-xs font-display font-black uppercase transition-all ${
                viewMode === 'list'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </section>

      {/* PITCH VIEW */}
      {viewMode === 'pitch' && (
        <section className="space-y-6">
          {/* Virtual Pitch Canvas */}
          <div className="relative rounded-3xl border border-emerald-900/50 bg-gradient-to-b from-[#064e3b] via-[#022c22] to-[#011c15] p-6 shadow-2xl overflow-hidden min-h-[480px] flex flex-col justify-between">
            {/* Pitch Marking Lines */}
            <div className="absolute inset-4 border-2 border-emerald-500/15 rounded-2xl pointer-events-none" />
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-emerald-500/15 -translate-y-1/2 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-2 border-emerald-500/15 rounded-full pointer-events-none" />

            {/* Formation Title Overlay */}
            <div className="absolute top-6 left-6 text-[10px] font-black uppercase tracking-widest text-emerald-400/60 font-display">
              {currentFormation} • MATCHDAY XI
            </div>

            {/* Starting XI Placed in Tactical Zones */}
            <div className="relative z-10 w-full flex flex-col justify-between h-full min-h-[440px] py-4">
              {/* Forwards Line */}
              <div className="flex justify-around items-center w-full px-4">
                {activeFormationConfig.slots
                  .map((slotPos, index) => ({ slotPos, index, playerId: lineup.starterIds[index] }))
                  .filter((item) => categorizePosition(item.slotPos) === 'FWD')
                  .map((item) => {
                    const player = squad.find((p) => p.id === item.playerId);
                    return renderPitchSlot(item.slotPos, player, item.playerId);
                  })}
              </div>

              {/* Midfielders Line */}
              <div className="flex justify-around items-center w-full px-2">
                {activeFormationConfig.slots
                  .map((slotPos, index) => ({ slotPos, index, playerId: lineup.starterIds[index] }))
                  .filter((item) => categorizePosition(item.slotPos) === 'MID')
                  .map((item) => {
                    const player = squad.find((p) => p.id === item.playerId);
                    return renderPitchSlot(item.slotPos, player, item.playerId);
                  })}
              </div>

              {/* Defenders Line */}
              <div className="flex justify-around items-center w-full px-2">
                {activeFormationConfig.slots
                  .map((slotPos, index) => ({ slotPos, index, playerId: lineup.starterIds[index] }))
                  .filter((item) => categorizePosition(item.slotPos) === 'DEF')
                  .map((item) => {
                    const player = squad.find((p) => p.id === item.playerId);
                    return renderPitchSlot(item.slotPos, player, item.playerId);
                  })}
              </div>

              {/* Goalkeeper */}
              <div className="flex justify-center items-center w-full">
                {activeFormationConfig.slots
                  .map((slotPos, index) => ({ slotPos, index, playerId: lineup.starterIds[index] }))
                  .filter((item) => categorizePosition(item.slotPos) === 'GK')
                  .map((item) => {
                    const player = squad.find((p) => p.id === item.playerId);
                    return renderPitchSlot(item.slotPos, player, item.playerId);
                  })}
              </div>
            </div>
          </div>

          {/* Bench Row (Substitutes) */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-3xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-display font-black uppercase text-slate-300">
                Matchday Substitutes ({bench.length}/9)
              </h4>
              <span className="text-[10px] text-slate-500 font-medium">
                Click a sub, then click a starter to swap
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {bench.map((player) => (
                <div
                  key={player.id}
                  onClick={() => handlePlayerClick(player)}
                  className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                    swapSourceId === player.id
                      ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                    <span className="text-emerald-400">{player.position}</span>
                    <span className="text-white font-display font-black">{player.rating}</span>
                  </div>
                  <div className="text-xs font-display font-black text-white truncate">
                    {player.name}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    {formatCurrency(player.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reserves (Non-Matchday Squad) */}
          {reserves.length > 0 && (
            <div className="bg-slate-900/20 border border-slate-850/60 rounded-3xl p-5 space-y-3">
              <h4 className="text-xs font-display font-black uppercase text-slate-400">
                Reserves ({reserves.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {reserves.map((player) => (
                  <div
                    key={player.id}
                    onClick={() => handlePlayerClick(player)}
                    className="p-2.5 rounded-xl border border-slate-850/60 bg-slate-950/40 text-center cursor-pointer hover:border-slate-700 transition-all opacity-80 hover:opacity-100"
                  >
                    <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                      <span className="text-slate-400">{player.position}</span>
                      <span className="text-slate-300 font-display font-black">{player.rating}</span>
                    </div>
                    <div className="text-xs font-display font-black text-slate-200 truncate">
                      {player.name}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1">
                      {formatCurrency(player.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <section className="space-y-4">
          {/* Group Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((group) => (
              <button
                key={group}
                onClick={() => setFilterGroup(group)}
                className={`py-1.5 px-3 rounded-xl text-xs font-display font-black uppercase tracking-wider transition-all ${
                  filterGroup === group
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {group}
              </button>
            ))}
          </div>

          {/* Player Table / Cards */}
          <div className="rounded-2xl border border-slate-850 overflow-hidden bg-slate-900/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-850 select-none">
                  <tr>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3 text-center">Pos</th>
                    <th className="py-3 px-3 text-center">OVR</th>
                    <th className="py-3 px-3 text-center">Age</th>
                    <th className="py-3 px-3">Value</th>
                    <th className="py-3 px-3">Wage</th>
                    <th className="py-3 px-3 text-center">Contract</th>
                    <th className="py-3 px-3 text-center">HG</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60">
                  {filteredSquad.map((player) => {
                    const isStarter = starterIdsSet.has(player.id);
                    const isBench = benchIdsSet.has(player.id);
                    const roleLabel = isStarter ? 'Starter' : isBench ? 'Bench' : 'Reserve';

                    return (
                      <tr
                        key={player.id}
                        className="hover:bg-slate-850/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-white">
                          <button
                            onClick={() => setSelectedPlayer(player)}
                            className="hover:text-emerald-400 text-left font-display font-black text-sm"
                          >
                            {player.name}
                          </button>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {player.nationality}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              isStarter
                                ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                                : isBench
                                ? 'bg-blue-950/60 border-blue-800/60 text-blue-300'
                                : 'bg-slate-950 border-slate-800 text-slate-500'
                            }`}
                          >
                            {roleLabel}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-slate-300">
                          {player.position}
                        </td>

                        <td className="py-3 px-3 text-center font-display font-black text-sm text-emerald-400">
                          {player.rating}
                        </td>

                        <td className="py-3 px-3 text-center text-slate-400">
                          {player.age}
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-200">
                          {formatCurrency(player.value)}
                        </td>

                        <td className="py-3 px-3 text-slate-400">
                          {formatWage(player.wageWeekly)}
                        </td>

                        <td className="py-3 px-3 text-center text-slate-400">
                          {player.contractYears}y
                        </td>

                        <td className="py-3 px-3 text-center">
                          {player.isHomegrown ? (
                            <span className="text-emerald-400 font-bold" title="Homegrown">✓</span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleRoleChange(player, 'starter')}
                              disabled={isStarter}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${
                                isStarter
                                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                  : 'bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300'
                              }`}
                            >
                              XI
                            </button>
                            <button
                              onClick={() => handleRoleChange(player, 'bench')}
                              disabled={isBench}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${
                                isBench
                                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                  : 'bg-blue-950/80 hover:bg-blue-900 border border-blue-800/60 text-blue-300'
                              }`}
                            >
                              Sub
                            </button>
                            <button
                              onClick={() => handleRoleChange(player, 'reserve')}
                              disabled={!isStarter && !isBench}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${
                                !isStarter && !isBench
                                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                  : 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400'
                              }`}
                            >
                              Res
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* PLAYER DETAIL MODAL */}
      {selectedPlayer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedPlayer(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white text-sm"
            >
              ✕
            </button>

            <header className="space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                {selectedPlayer.position} • {selectedPlayer.nationality}
              </span>
              <h3 className="text-xl font-display font-black text-white">
                {selectedPlayer.name}
              </h3>
              <p className="text-xs text-slate-400">
                Age: {selectedPlayer.age} • Contract: {selectedPlayer.contractYears} Years Remaining
              </p>
            </header>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl">
                <div className="text-[9px] uppercase font-bold text-slate-500">Rating</div>
                <div className="text-xl font-display font-black text-emerald-400">
                  {selectedPlayer.rating}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl">
                <div className="text-[9px] uppercase font-bold text-slate-500">Market Value</div>
                <div className="text-sm font-display font-black text-white">
                  {formatCurrency(selectedPlayer.value)}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl">
                <div className="text-[9px] uppercase font-bold text-slate-500">Weekly Wage</div>
                <div className="text-sm font-display font-bold text-slate-200">
                  {formatWage(selectedPlayer.wageWeekly)}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl">
                <div className="text-[9px] uppercase font-bold text-slate-500">Homegrown</div>
                <div className="text-sm font-display font-bold text-slate-200">
                  {selectedPlayer.isHomegrown ? 'Domestic (HG)' : 'International'}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setSwapSourceId(selectedPlayer.id);
                  setSelectedPlayer(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-amber-500/40 bg-amber-950/30 hover:bg-amber-950/60 text-amber-300 font-display font-black text-xs uppercase tracking-wider"
              >
                🔄 Swap on Pitch
              </button>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderPitchSlot(slotPos: string, player: CareerPlayer | undefined, playerId: string | undefined) {
    if (!player) {
      return (
        <div
          key={slotPos}
          className="w-16 sm:w-20 rounded-xl border-2 border-dashed border-emerald-500/30 p-2 text-center text-emerald-400/60 text-[10px] font-bold"
        >
          {slotPos} (Empty)
        </div>
      );
    }

    const fit = calculatePositionFit(player, slotPos);
    const isSwapping = swapSourceId === player.id;

    return (
      <div
        key={player.id}
        onClick={() => handlePlayerClick(player)}
        className={`w-18 sm:w-22 p-2 rounded-2xl border backdrop-blur-md text-center cursor-pointer transition-all transform hover:scale-105 select-none ${
          isSwapping
            ? 'border-amber-400 bg-amber-950/80 ring-4 ring-amber-400/50 shadow-2xl'
            : 'border-slate-800/80 bg-slate-950/80 hover:border-emerald-400/80 shadow-lg'
        }`}
      >
        <div className="flex justify-between items-center text-[9px] font-black leading-none mb-1">
          <span
            className={`px-1 rounded ${
              fit === 'natural'
                ? 'bg-emerald-950 text-emerald-300'
                : fit === 'competent'
                ? 'bg-amber-950 text-amber-300'
                : 'bg-rose-950 text-rose-300'
            }`}
          >
            {slotPos}
          </span>
          <span className="font-display text-white text-xs">{player.rating}</span>
        </div>
        <div className="text-[11px] font-display font-black text-white truncate leading-tight">
          {player.name}
        </div>
        <div className="text-[8px] text-slate-400 truncate mt-0.5">
          {player.position}
        </div>
      </div>
    );
  }
}
