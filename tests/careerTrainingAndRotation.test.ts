import { describe, it, expect } from 'vitest';
import { autoRotateFitLineup } from '../src/career/squad';
import {
  applyWeeklySquadTraining,
  calculateEaFcFaceStats,
} from '../src/career/formAndProgression';
import {
  calculateTeamDepartmentRatings,
  createLiveMatchSession,
  stepLiveMatchMinute,
} from '../src/career/matchEngine';
import {
  CareerPlayer,
  CareerLineup,
  TrainingProgramState,
  Club,
  LeagueFixture,
} from '../src/career/types';
import { getPresetSettings } from '../src/career/settings';

describe('Training and Smart Squad Rotation Engine', () => {
  const dummySquad: CareerPlayer[] = [
    {
      id: 'p-gk',
      cardId: 'c-gk',
      name: 'Alisson Becker',
      position: 'GK',
      rating: 89,
      age: 31,
      nationality: 'Brazil',
      value: 30000000,
      wageWeekly: 180000,
      contractYears: 2,
      fitness: 100,
      morale: 85,
      form: 7.5,
      injured: false,
      isHomegrown: false,
      club: 'liv',
    },
    {
      id: 'p-cb1',
      cardId: 'c-cb1',
      name: 'Virgil van Dijk',
      position: 'CB',
      rating: 89,
      age: 32,
      nationality: 'Netherlands',
      value: 32000000,
      wageWeekly: 220000,
      contractYears: 2,
      fitness: 100,
      morale: 88,
      form: 8.0,
      injured: false,
      isHomegrown: false,
      club: 'liv',
    },
    {
      id: 'p-cb2-fatigued',
      cardId: 'c-cb2',
      name: 'Ibrahima Konate',
      position: 'CB',
      rating: 83,
      age: 25,
      nationality: 'France',
      value: 28000000,
      wageWeekly: 90000,
      contractYears: 3,
      fitness: 65, // Fatigued!
      morale: 75,
      form: 7.0,
      injured: false,
      isHomegrown: false,
      club: 'liv',
    },
    {
      id: 'p-cb-bench',
      cardId: 'c-cb3',
      name: 'Joe Gomez',
      position: 'CB',
      rating: 80,
      age: 27,
      nationality: 'England',
      value: 18000000,
      wageWeekly: 75000,
      contractYears: 2,
      fitness: 100, // Fresh bench replacement!
      morale: 80,
      form: 7.0,
      injured: false,
      isHomegrown: true,
      club: 'liv',
    },
    {
      id: 'p-st-injured',
      cardId: 'c-st1',
      name: 'Darwin Nunez',
      position: 'ST',
      rating: 82,
      age: 25,
      nationality: 'Uruguay',
      value: 40000000,
      wageWeekly: 130000,
      contractYears: 3,
      fitness: 85,
      morale: 80,
      form: 7.2,
      injured: true, // Injured!
      injuryWeeks: 2,
      isHomegrown: false,
      club: 'liv',
    },
    {
      id: 'p-st-bench',
      cardId: 'c-st2',
      name: 'Cody Gakpo',
      position: 'ST',
      rating: 83,
      age: 25,
      nationality: 'Netherlands',
      value: 42000000,
      wageWeekly: 120000,
      contractYears: 3,
      fitness: 95, // Fresh striker!
      morale: 82,
      form: 7.6,
      injured: false,
      isHomegrown: false,
      club: 'liv',
    },
    {
      id: 'p-wonderkid',
      cardId: 'c-wk1',
      name: 'Trey Nyoni',
      position: 'CAM',
      rating: 68,
      potential: 88,
      age: 18,
      nationality: 'England',
      value: 3000000,
      wageWeekly: 5000,
      contractYears: 4,
      fitness: 100,
      morale: 85,
      form: 7.0,
      injured: false,
      isHomegrown: true,
      club: 'liv',
      developmentProgress: 85, // Close to leveling up!
    },
  ];

  it('rotates fatigued and injured starters with fresh bench players', () => {
    const currentLineup: CareerLineup = {
      formation: '4-3-3',
      starterIds: [
        'p-gk',
        'p-cb1',
        'p-cb2-fatigued', // Should rotate out (fitness 65 < 78)
        'p-st-injured', // Should rotate out (injured)
      ],
      benchIds: ['p-cb-bench', 'p-st-bench'],
    };

    const rotation = autoRotateFitLineup(dummySquad, currentLineup, 78);

    expect(rotation.rotatedCount).toBe(2);
    expect(rotation.swaps.length).toBe(2);

    // Konate replaced by Gomez
    const cbSwap = rotation.swaps.find((s) => s.fatiguedPlayer.id === 'p-cb2-fatigued');
    expect(cbSwap).toBeDefined();
    expect(cbSwap?.freshPlayer.id).toBe('p-cb-bench');

    // Nunez replaced by Gakpo
    const stSwap = rotation.swaps.find((s) => s.fatiguedPlayer.id === 'p-st-injured');
    expect(stSwap).toBeDefined();
    expect(stSwap?.freshPlayer.id).toBe('p-st-bench');

    // Updated lineup has new starters
    expect(rotation.updatedLineup.starterIds).toContain('p-cb-bench');
    expect(rotation.updatedLineup.starterIds).toContain('p-st-bench');
    expect(rotation.updatedLineup.starterIds).not.toContain('p-cb2-fatigued');
    expect(rotation.updatedLineup.starterIds).not.toContain('p-st-injured');
  });

  it('keeps lineup untouched when all starters are above the fitness threshold', () => {
    const fitLineup: CareerLineup = {
      formation: '4-3-3',
      starterIds: ['p-gk', 'p-cb1', 'p-cb-bench', 'p-st-bench'],
      benchIds: [],
    };

    const rotation = autoRotateFitLineup(dummySquad, fitLineup, 78);
    expect(rotation.rotatedCount).toBe(0);
    expect(rotation.swaps).toHaveLength(0);
    expect(rotation.updatedLineup.starterIds).toEqual(fitLineup.starterIds);
  });

  it('applies weekly team recovery focus to restore squad stamina', () => {
    const trainingState: TrainingProgramState = {
      teamFocus: 'recovery',
      mentorships: {},
    };

    const result = applyWeeklySquadTraining(dummySquad, trainingState);

    // Konate was at 65 fitness -> should gain +15
    const updatedKonate = result.updatedSquad.find((p) => p.id === 'p-cb2-fatigued')!;
    expect(updatedKonate.fitness).toBe(80);
    expect(result.staminaRecoveredTotal).toBeGreaterThan(0);
  });

  it('accelerates wonderkid progression and triggers breakthrough via specialist drill', () => {
    const trainingState: TrainingProgramState = {
      teamFocus: 'balanced',
      mentorships: {
        'p-wonderkid': 'playmaking', // Specialist drill (+22 XP)
      },
    };

    // Wonderkid starts at 85 XP; +22 XP puts him over 100, triggering a +1 OVR leap!
    const result = applyWeeklySquadTraining(dummySquad, trainingState);

    expect(result.breakthroughs.length).toBe(1);
    const breakthrough = result.breakthroughs[0];
    expect(breakthrough.player.id).toBe('p-wonderkid');
    expect(breakthrough.oldRating).toBe(68);
    expect(breakthrough.newRating).toBe(69);
    expect(breakthrough.drill).toBe('playmaking');

    const updatedWonderkid = result.updatedSquad.find((p) => p.id === 'p-wonderkid')!;
    expect(updatedWonderkid.rating).toBe(69);
    expect(updatedWonderkid.developmentProgress).toBe(15); // 85 + (8 + 22) - 100 = 15
  });

  it('modifies match engine department ratings and stamina drain based on team training focus', () => {
    const baseRatings = calculateTeamDepartmentRatings(dummySquad.slice(0, 4), {
      mentality: 'balanced',
      pressing: 'balanced',
      style: 'mixed',
      isHome: true,
      trainingFocus: 'balanced',
    });

    const attackingRatings = calculateTeamDepartmentRatings(dummySquad.slice(0, 4), {
      mentality: 'balanced',
      pressing: 'balanced',
      style: 'mixed',
      isHome: true,
      trainingFocus: 'attacking',
    });

    const defensiveRatings = calculateTeamDepartmentRatings(dummySquad.slice(0, 4), {
      mentality: 'balanced',
      pressing: 'balanced',
      style: 'mixed',
      isHome: true,
      trainingFocus: 'defensive',
    });

    const matchPrepRatings = calculateTeamDepartmentRatings(dummySquad.slice(0, 4), {
      mentality: 'balanced',
      pressing: 'balanced',
      style: 'mixed',
      isHome: true,
      trainingFocus: 'match_prep',
    });

    expect(attackingRatings.attack).toBeGreaterThan(baseRatings.attack);
    expect(defensiveRatings.defense).toBeGreaterThan(baseRatings.defense);
    expect(matchPrepRatings.overall).toBeGreaterThan(baseRatings.overall);
  });
});
