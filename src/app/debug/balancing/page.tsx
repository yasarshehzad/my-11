'use client';

import React, { useState, useMemo } from 'react';
import { players } from '../../../data/players';
import { 
  FORMATION_SLOTS, 
  getDraftOptions, 
  calculateSquadStats, 
  simulateLeagueSeason 
} from '../../../utils/gameLogic';
import { FormationType, Player, Rarity } from '../../../types/game';

interface SimStats {
  totalDrafts: number;
  avgWins: number;
  medianWins: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  perfectSeasons: number;
  unbeatenSeasons: number;
  w35Plus: number;
  w30Plus: number;
  w25Plus: number;
  wUnder20: number;
  wUnder15: number;
  winHistogram: number[]; // 0 to 38
  offeredRarities: Record<Rarity, number>;
  selectedRarities: Record<Rarity, number>;
  offeredPlayerNames: Record<string, number>;
  offeredCards: Record<string, number>;
  formationResults: Record<FormationType, {
    runs: number;
    avgWins: number;
    medianWins: number;
    avgOvr: number;
    avgChem: number;
    w30Plus: number;
    w35Plus: number;
    perfect: number;
  }>;
  dupeChoices: number;
  dupeSquads: number;
}

export default function DebugBalancingPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [simProgress, setSimProgress] = useState<number>(0);
  const [simTarget, setSimTarget] = useState<number>(0);
  const [simStats, setSimStats] = useState<SimStats | null>(null);

  // Static database audit
  const dbMetrics = useMemo(() => {
    const totalCards = players.length;
    const byPlayer: Record<string, number> = {};
    const byRarity: Record<Rarity, number> = {
      common: 0,
      solid: 0,
      rare: 0,
      elite: 0,
      cult: 0,
      legend: 0,
    };
    const byPos: Record<string, number> = {};
    const byEra: Record<string, number> = { '90s': 0, '00s': 0, '10s': 0, Modern: 0 };
    const byTier: Record<string, number> = {
      '70-77 (Modest)': 0,
      '78-83 (Solid)': 0,
      '84-88 (Strong)': 0,
      '89-92 (Elite)': 0,
      '93-95 (Exceptional)': 0,
      '96-99 (Historic)': 0,
    };

    players.forEach((p) => {
      byPlayer[p.playerName] = (byPlayer[p.playerName] || 0) + 1;
      if (byRarity[p.rarity] !== undefined) byRarity[p.rarity]++;
      byPos[p.primaryPosition] = (byPos[p.primaryPosition] || 0) + 1;
      if (byEra[p.era] !== undefined) byEra[p.era]++;

      if (p.rating <= 77) byTier['70-77 (Modest)']++;
      else if (p.rating <= 83) byTier['78-83 (Solid)']++;
      else if (p.rating <= 88) byTier['84-88 (Strong)']++;
      else if (p.rating <= 92) byTier['89-92 (Elite)']++;
      else if (p.rating <= 95) byTier['93-95 (Exceptional)']++;
      else byTier['96-99 (Historic)']++;
    });

    const uniquePlayers = Object.keys(byPlayer).length;
    const cardsPerPlayer = Object.values(byPlayer);
    const minCards = Math.min(...cardsPerPlayer);
    const maxCards = Math.max(...cardsPerPlayer);
    const avgCards = (totalCards / uniquePlayers).toFixed(1);

    return {
      totalCards,
      uniquePlayers,
      minCards,
      maxCards,
      avgCards,
      byRarity,
      byPos,
      byEra,
      byTier,
    };
  }, []);

  const runSimulation = (count: number) => {
    if (isRunning) return;
    setIsRunning(true);
    setSimProgress(0);
    setSimTarget(count);

    const formations: FormationType[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'];
    const winsArr: number[] = [];
    const winHist = Array(39).fill(0);
    const offeredRarities: Record<Rarity, number> = {
      common: 0,
      solid: 0,
      rare: 0,
      elite: 0,
      cult: 0,
      legend: 0,
    };
    const selectedRarities: Record<Rarity, number> = {
      common: 0,
      solid: 0,
      rare: 0,
      elite: 0,
      cult: 0,
      legend: 0,
    };
    const offeredPlayerNames: Record<string, number> = {};
    const offeredCards: Record<string, number> = {};

    const formationResults: Record<FormationType, {
      runs: number;
      totalWins: number;
      winsList: number[];
      totalOvr: number;
      totalChem: number;
      w30Plus: number;
      w35Plus: number;
      perfect: number;
    }> = {
      '4-3-3': { runs: 0, totalWins: 0, winsList: [], totalOvr: 0, totalChem: 0, w30Plus: 0, w35Plus: 0, perfect: 0 },
      '4-4-2': { runs: 0, totalWins: 0, winsList: [], totalOvr: 0, totalChem: 0, w30Plus: 0, w35Plus: 0, perfect: 0 },
      '3-5-2': { runs: 0, totalWins: 0, winsList: [], totalOvr: 0, totalChem: 0, w30Plus: 0, w35Plus: 0, perfect: 0 },
      '4-2-3-1': { runs: 0, totalWins: 0, winsList: [], totalOvr: 0, totalChem: 0, w30Plus: 0, w35Plus: 0, perfect: 0 },
    };

    let dupeChoices = 0;
    let dupeSquads = 0;
    let perfectSeasons = 0;
    let unbeatenSeasons = 0;

    const BATCH_SIZE = 250;
    let currentIteration = 0;

    const executeBatch = () => {
      const batchLimit = Math.min(count, currentIteration + BATCH_SIZE);

      for (; currentIteration < batchLimit; currentIteration++) {
        const form = formations[currentIteration % formations.length];
        const slots = FORMATION_SLOTS[form];
        const squad: (Player | null)[] = Array(11).fill(null);

        const activeClubs = new Set<string>();
        const activeNations = new Set<string>();
        const activeEras = new Set<string>();

        for (let s = 0; s < 11; s++) {
          const options = getDraftOptions(slots[s].position, squad);

          const optionNames = new Set<string>();
          options.forEach((opt) => {
            offeredRarities[opt.rarity]++;
            offeredPlayerNames[opt.playerName] = (offeredPlayerNames[opt.playerName] || 0) + 1;
            offeredCards[opt.displayName] = (offeredCards[opt.displayName] || 0) + 1;

            if (optionNames.has(opt.playerName)) dupeChoices++;
            optionNames.add(opt.playerName);
          });

          // Intelligent user pick (balances rating + chemistry synergy)
          let bestOpt = options[0];
          let bestScore = -999;
          options.forEach((opt) => {
            let score = opt.rating;
            if (activeClubs.has(opt.club)) score += 4;
            if (activeNations.has(opt.nationality)) score += 3;
            if (activeEras.has(opt.era)) score += 1;
            if (score > bestScore) {
              bestScore = score;
              bestOpt = opt;
            }
          });

          squad[s] = bestOpt;
          selectedRarities[bestOpt.rarity]++;
          activeClubs.add(bestOpt.club);
          activeNations.add(bestOpt.nationality);
          activeEras.add(bestOpt.era);
        }

        // Check duplicate player in squad
        const squadNames = new Set<string>();
        squad.forEach((p) => {
          if (p) {
            if (squadNames.has(p.playerName)) dupeSquads++;
            squadNames.add(p.playerName);
          }
        });

        const activeSquad = squad.filter((p): p is Player => p !== null);
        const stats = calculateSquadStats(activeSquad, slots);
        const sim = simulateLeagueSeason(activeSquad, stats, 'english', undefined, slots);

        winsArr.push(sim.wins);
        winHist[sim.wins] = (winHist[sim.wins] || 0) + 1;

        if (sim.wins === 38) perfectSeasons++;
        if (sim.losses === 0) unbeatenSeasons++;

        const fRec = formationResults[form];
        fRec.runs++;
        fRec.totalWins += sim.wins;
        fRec.winsList.push(sim.wins);
        fRec.totalOvr += stats.overall;
        fRec.totalChem += stats.chemistry;
        if (sim.wins >= 30) fRec.w30Plus++;
        if (sim.wins >= 35) fRec.w35Plus++;
        if (sim.wins === 38) fRec.perfect++;
      }

      setSimProgress(currentIteration);

      if (currentIteration < count) {
        setTimeout(executeBatch, 0);
      } else {
        // Compile summary statistics
        winsArr.sort((a, b) => a - b);
        const total = winsArr.length;
        const avgWins = Number((winsArr.reduce((a, b) => a + b, 0) / total).toFixed(2));
        const medianWins = winsArr[Math.floor(total / 2)];
        const p10 = winsArr[Math.floor(total * 0.1)];
        const p25 = winsArr[Math.floor(total * 0.25)];
        const p75 = winsArr[Math.floor(total * 0.75)];
        const p90 = winsArr[Math.floor(total * 0.9)];
        const p95 = winsArr[Math.floor(total * 0.95)];
        const p99 = winsArr[Math.floor(total * 0.99)];

        const compiledFormationResults: any = {};
        formations.forEach((f) => {
          const rec = formationResults[f];
          rec.winsList.sort((a, b) => a - b);
          compiledFormationResults[f] = {
            runs: rec.runs,
            avgWins: Number((rec.totalWins / Math.max(1, rec.runs)).toFixed(2)),
            medianWins: rec.winsList[Math.floor(rec.runs / 2)] || 0,
            avgOvr: Number((rec.totalOvr / Math.max(1, rec.runs)).toFixed(1)),
            avgChem: Number((rec.totalChem / Math.max(1, rec.runs)).toFixed(1)),
            w30Plus: rec.w30Plus,
            w35Plus: rec.w35Plus,
            perfect: rec.perfect,
          };
        });

        setSimStats({
          totalDrafts: total,
          avgWins,
          medianWins,
          p10,
          p25,
          p75,
          p90,
          p95,
          p99,
          perfectSeasons,
          unbeatenSeasons,
          w35Plus: winsArr.filter((w) => w >= 35).length,
          w30Plus: winsArr.filter((w) => w >= 30).length,
          w25Plus: winsArr.filter((w) => w >= 25).length,
          wUnder20: winsArr.filter((w) => w < 20).length,
          wUnder15: winsArr.filter((w) => w < 15).length,
          winHistogram: winHist,
          offeredRarities,
          selectedRarities,
          offeredPlayerNames,
          offeredCards,
          formationResults: compiledFormationResults,
          dupeChoices,
          dupeSquads,
        });

        setIsRunning(false);
      }
    };

    setTimeout(executeBatch, 0);
  };

  const topOfferedPlayers = useMemo(() => {
    if (!simStats) return [];
    return Object.entries(simStats.offeredPlayerNames)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [simStats]);

  const bottomOfferedPlayers = useMemo(() => {
    if (!simStats) return [];
    return Object.entries(simStats.offeredPlayerNames)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 5);
  }, [simStats]);

  const maxHistCount = useMemo(() => {
    if (!simStats) return 1;
    return Math.max(...simStats.winHistogram, 1);
  }, [simStats]);

  return (
    <main style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', color: '#f3f4f6', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: '32px', borderBottom: '1px solid #374151', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#f9fafb' }}>
              ⚙️ MY-11 Game Balance & Monte Carlo QA
            </h1>
            <p style={{ margin: '6px 0 0 0', color: '#9ca3af', fontSize: '14px' }}>
              Internal simulation dashboard for draft appearance distribution, formation fairness, and 38-game season engine verification.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => runSimulation(1000)}
              disabled={isRunning}
              style={{
                background: '#374151',
                color: '#fff',
                border: '1px solid #4b5563',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                fontWeight: '600',
              }}
            >
              Run 1,000 Sims
            </button>
            <button
              onClick={() => runSimulation(5000)}
              disabled={isRunning}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                fontWeight: '600',
              }}
            >
              Run 5,000 Sims
            </button>
            <button
              onClick={() => runSimulation(10000)}
              disabled={isRunning}
              style={{
                background: '#10b981',
                color: '#fff',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '8px',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                fontWeight: '700',
              }}
            >
              Run 10,000 Sims
            </button>
          </div>
        </div>

        {isRunning && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#d1d5db', marginBottom: '6px' }}>
              <span>Simulating drafts...</span>
              <span>{simProgress} / {simTarget} ({((simProgress / simTarget) * 100).toFixed(0)}%)</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#374151', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${(simProgress / simTarget) * 100}%`,
                  height: '100%',
                  background: '#10b981',
                  transition: 'width 0.1s linear',
                }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Section 1: Database Overview */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', color: '#e5e7eb' }}>
          1. Player Database Audit ({dbMetrics.totalCards.toLocaleString()} Season Cards / {dbMetrics.uniquePlayers} Base Players)
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
            <h3 style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 12px 0' }}>RATING TIERS (Anti-inflation)</h3>
            {Object.entries(dbMetrics.byTier).map(([tier, count]) => (
              <div key={tier} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: '#d1d5db' }}>{tier}</span>
                <span style={{ fontWeight: '600' }}>{count} ({((count / dbMetrics.totalCards) * 100).toFixed(1)}%)</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
            <h3 style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 12px 0' }}>DATABASE RARITY POOL</h3>
            {Object.entries(dbMetrics.byRarity).map(([rarity, count]) => (
              <div key={rarity} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ textTransform: 'capitalize', color: '#d1d5db' }}>{rarity}</span>
                <span style={{ fontWeight: '600' }}>{count} ({((count / dbMetrics.totalCards) * 100).toFixed(1)}%)</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
            <h3 style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 12px 0' }}>ERA DISTRIBUTION</h3>
            {Object.entries(dbMetrics.byEra).map(([era, count]) => (
              <div key={era} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: '#d1d5db' }}>{era}</span>
                <span style={{ fontWeight: '600' }}>{count} ({((count / dbMetrics.totalCards) * 100).toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Simulation Results */}
      {simStats ? (
        <>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', color: '#e5e7eb' }}>
              2. Monte Carlo Results ({simStats.totalDrafts.toLocaleString()} Full Seasons Simulated)
            </h2>

            {/* Scorecard KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600' }}>AVG / MEDIAN WINS</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>
                  {simStats.avgWins} <span style={{ fontSize: '16px', color: '#9ca3af' }}>/ {simStats.medianWins}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>p25: {simStats.p25} | p75: {simStats.p75}</div>
              </div>

              <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600' }}>38-0-0 (THE IMMORTALS)</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: simStats.perfectSeasons > 0 ? '#f59e0b' : '#9ca3af', marginTop: '4px' }}>
                  {simStats.perfectSeasons}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  {((simStats.perfectSeasons / simStats.totalDrafts) * 100).toFixed(4)}% occurrence
                </div>
              </div>

              <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600' }}>UNBEATEN (0 LOSSES)</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#60a5fa', marginTop: '4px' }}>
                  {simStats.unbeatenSeasons}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  {((simStats.unbeatenSeasons / simStats.totalDrafts) * 100).toFixed(3)}% occurrence
                </div>
              </div>

              <div style={{ background: '#1f2937', padding: '16px', borderRadius: '12px', border: '1px solid #374151' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600' }}>30+ WINS (ELITE RUNS)</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#a78bfa', marginTop: '4px' }}>
                  {simStats.w30Plus}
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  {((simStats.w30Plus / simStats.totalDrafts) * 100).toFixed(2)}% occurrence
                </div>
              </div>
            </div>

            {/* Win Distribution Histogram */}
            <div style={{ background: '#1f2937', padding: '20px', borderRadius: '12px', border: '1px solid #374151', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', color: '#f3f4f6', margin: '0 0 16px 0' }}>Win Frequency Histogram (0 to 38 Wins)</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '160px', gap: '3px', paddingTop: '10px' }}>
                {simStats.winHistogram.map((count, w) => {
                  const heightPct = (count / maxHistCount) * 100;
                  return (
                    <div
                      key={w}
                      title={`Wins: ${w} (${count} teams, ${((count / simStats.totalDrafts) * 100).toFixed(1)}%)`}
                      style={{
                        flex: 1,
                        height: `${Math.max(2, heightPct)}%`,
                        background: w === 38 ? '#f59e0b' : w >= 30 ? '#10b981' : w >= 20 ? '#3b82f6' : '#6b7280',
                        borderRadius: '2px 2px 0 0',
                        position: 'relative',
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>
                <span>0 Wins</span>
                <span>10 Wins</span>
                <span>20 Wins</span>
                <span>30 Wins</span>
                <span>38 Wins</span>
              </div>
            </div>

            {/* Formation Fairness Comparison */}
            <div style={{ background: '#1f2937', padding: '20px', borderRadius: '12px', border: '1px solid #374151', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', color: '#f3f4f6', margin: '0 0 16px 0' }}>Formation Fairness Comparison</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                      <th style={{ padding: '8px 12px' }}>Formation</th>
                      <th style={{ padding: '8px 12px' }}>Simulated Runs</th>
                      <th style={{ padding: '8px 12px' }}>Avg Wins</th>
                      <th style={{ padding: '8px 12px' }}>Median Wins</th>
                      <th style={{ padding: '8px 12px' }}>Avg OVR</th>
                      <th style={{ padding: '8px 12px' }}>Avg Chemistry</th>
                      <th style={{ padding: '8px 12px' }}>30+ Wins %</th>
                      <th style={{ padding: '8px 12px' }}>35+ Wins</th>
                      <th style={{ padding: '8px 12px' }}>38-0 Perfect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(simStats.formationResults).map(([form, res]) => (
                      <tr key={form} style={{ borderBottom: '1px solid #2d3748' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#60a5fa' }}>{form}</td>
                        <td style={{ padding: '10px 12px' }}>{res.runs.toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '600' }}>{res.avgWins}</td>
                        <td style={{ padding: '10px 12px' }}>{res.medianWins}</td>
                        <td style={{ padding: '10px 12px' }}>{res.avgOvr}</td>
                        <td style={{ padding: '10px 12px' }}>{res.avgChem}</td>
                        <td style={{ padding: '10px 12px' }}>{((res.w30Plus / Math.max(1, res.runs)) * 100).toFixed(2)}%</td>
                        <td style={{ padding: '10px 12px' }}>{res.w35Plus}</td>
                        <td style={{ padding: '10px 12px', fontWeight: res.perfect > 0 ? '700' : 'normal', color: res.perfect > 0 ? '#f59e0b' : '#9ca3af' }}>{res.perfect}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rarity & Player Frequency */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#1f2937', padding: '20px', borderRadius: '12px', border: '1px solid #374151' }}>
                <h3 style={{ fontSize: '15px', color: '#f3f4f6', margin: '0 0 16px 0' }}>Draft Choices Rarity (Offered vs Selected)</h3>
                {Object.entries(simStats.offeredRarities).map(([rarity, offCount]) => {
                  const totalOff = Object.values(simStats.offeredRarities).reduce((a, b) => a + b, 0);
                  const totalSel = Object.values(simStats.selectedRarities).reduce((a, b) => a + b, 0);
                  const selCount = simStats.selectedRarities[rarity as Rarity] || 0;
                  const offPct = ((offCount / totalOff) * 100).toFixed(1);
                  const selPct = ((selCount / totalSel) * 100).toFixed(1);

                  return (
                    <div key={rarity} style={{ marginBottom: '10px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{rarity}</span>
                        <span style={{ color: '#9ca3af' }}>Offered: {offPct}% | Selected: {selPct}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: '#374151', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${offPct}%`, height: '100%', background: '#3b82f6' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: '#1f2937', padding: '20px', borderRadius: '12px', border: '1px solid #374151' }}>
                <h3 style={{ fontSize: '15px', color: '#f3f4f6', margin: '0 0 16px 0' }}>Player Name Appearance Balance</h3>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
                  Verification that cards per player does not bias appearance frequency.
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#e5e7eb', marginBottom: '8px' }}>Top 5 Most Offered:</div>
                {topOfferedPlayers.slice(0, 5).map(([name, count]) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: '#d1d5db' }}>
                    <span>{name}</span>
                    <span>{count.toLocaleString()} times</span>
                  </div>
                ))}
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#e5e7eb', marginTop: '12px', marginBottom: '8px' }}>Bottom 5 Least Offered:</div>
                {bottomOfferedPlayers.map(([name, count]) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: '#9ca3af' }}>
                    <span>{name}</span>
                    <span>{count.toLocaleString()} times</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <div style={{ background: '#1f2937', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '1px dashed #374151' }}>
          <p style={{ margin: 0, fontSize: '16px', color: '#9ca3af' }}>
            Click one of the buttons above to run an automated Monte Carlo simulation (1,000, 5,000, or 10,000 drafts) and inspect live balance telemetry.
          </p>
        </div>
      )}
    </main>
  );
}
