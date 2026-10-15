import { describe, it, expect } from 'vitest';
import { getScoutingMarketPool } from '../src/career/transfers';
import { isCurrentPlayer, isIconPlayer, getPlayerBio } from '../src/career/playerBioDatabase';

describe('Icons & Legends Audit', () => {
  it('correctly separates modern active stars from historical icons', () => {
    const allPool = getScoutingMarketPool([], { playerPoolType: 'all' });
    const modernPool = getScoutingMarketPool([], { playerPoolType: 'modern' });
    const legendsPool = getScoutingMarketPool([], { playerPoolType: 'legends' });

    // 1. Luis Suarez verification
    const suarezAll = allPool.find((p) => p.name === 'Luis Suarez');
    expect(suarezAll).toBeDefined();
    expect(suarezAll?.club).toBe('Liverpool');
    expect(suarezAll?.rating).toBe(96);
    expect(suarezAll?.age).toBe(27);
    expect(suarezAll?.isLegend).toBe(true);
    expect(suarezAll?.rarity).toBe('Legend');
    expect(suarezAll?.preferredFoot).toBe('Right');

    // Suarez must NOT be in modern pool
    expect(modernPool.find((p) => p.name === 'Luis Suarez')).toBeUndefined();
    // Suarez MUST be in legends pool
    expect(legendsPool.find((p) => p.name === 'Luis Suarez')).toBeDefined();

    // 2. Erling Haaland verification
    const haalandAll = allPool.find((p) => p.name === 'Erling Haaland');
    expect(haalandAll).toBeDefined();
    expect(haalandAll?.club).toBe('Manchester City');
    expect(haalandAll?.isLegend).toBe(false);
    expect(haalandAll?.rarity).not.toBe('Legend');
    expect(haalandAll?.rarity).not.toBe('legend');
    expect(haalandAll?.age).toBe(26);
    expect(haalandAll?.dateOfBirth).toBe('2000-07-21');
    expect(haalandAll?.preferredFoot).toBe('Left');

    // Haaland MUST be in modern pool
    expect(modernPool.find((p) => p.name === 'Erling Haaland')).toBeDefined();
    // Haaland MUST NOT be in legends pool
    expect(legendsPool.find((p) => p.name === 'Erling Haaland')).toBeUndefined();

    // 3. Other modern stars must never be icons
    const activeNames = [
      'Kylian Mbappe',
      'Bukayo Saka',
      'Phil Foden',
      'Cole Palmer',
      'Jude Bellingham',
      'Rodri Hernandez',
      'Mohamed Salah',
      'Kevin De Bruyne',
      'Virgil van Dijk',
      'Harry Kane',
    ];

    for (const name of activeNames) {
      const player = allPool.find((p) => p.name === name);
      if (player) {
        expect(player.isLegend, `${name} should not be a legend`).toBe(false);
        expect(player.rarity, `${name} should not have Legend rarity`).not.toBe('Legend');
        expect(player.rarity, `${name} should not have legend rarity`).not.toBe('legend');
        expect(legendsPool.find((p) => p.name === name), `${name} should not be in legends pool`).toBeUndefined();
        expect(modernPool.find((p) => p.name === name), `${name} should be in modern pool`).toBeDefined();
      }
    }

    // 4. Other historical legends must have peak age and be legends
    const legendNames = [
      { name: 'Thierry Henry', club: 'Arsenal', expectedAge: 26, foot: 'Right' },
      { name: 'Cristiano Ronaldo', club: 'Real Madrid', expectedAge: 29, foot: 'Right' },
      { name: 'Lionel Messi', club: 'Barcelona', expectedAge: 24, foot: 'Left' },
      { name: 'Zinedine Zidane', club: 'Real Madrid', expectedAge: 29, foot: 'Both' },
      { name: 'Ronaldinho Gaucho', club: 'Barcelona', expectedAge: 25, foot: 'Right' },
      { name: 'Paolo Maldini', club: 'AC Milan', expectedAge: 25, foot: 'Both' },
      { name: 'Alan Shearer', club: 'Blackburn', expectedAge: 24, foot: 'Right' },
    ];

    for (const leg of legendNames) {
      const player = allPool.find((p) => p.name === leg.name);
      expect(player, `Legend ${leg.name} should exist in allPool`).toBeDefined();
      if (player) {
        expect(player.isLegend, `${leg.name} should be a legend`).toBe(true);
        expect(player.club, `${leg.name} should have peak club ${leg.club}`).toBe(leg.club);
        expect(player.age, `${leg.name} should have authentic peak age ${leg.expectedAge}`).toBe(leg.expectedAge);
        expect(player.preferredFoot, `${leg.name} should have preferred foot ${leg.foot}`).toBe(leg.foot);
        expect(modernPool.find((p) => p.name === leg.name), `${leg.name} should not be in modern pool`).toBeUndefined();
        expect(legendsPool.find((p) => p.name === leg.name), `${leg.name} should be in legends pool`).toBeDefined();
      }
    }

    // 5. Zero historical legends may have age 19
    const age19Legends = legendsPool.filter((p) => p.age <= 19);
    expect(age19Legends.length, 'No legends should be 19 years old or younger').toBe(0);

    // 6. Every player in pool must have unique name (no duplicate seasons)
    const modernNames = modernPool.map((p) => p.name);
    const uniqueModernNames = new Set(modernNames);
    expect(modernNames.length).toBe(uniqueModernNames.size);

    const legendNamesList = legendsPool.map((p) => p.name);
    const uniqueLegendNames = new Set(legendNamesList);
    expect(legendNamesList.length).toBe(uniqueLegendNames.size);
  });
});
