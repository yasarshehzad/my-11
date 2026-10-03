import { describe, it, expect } from 'vitest';
import { 
  calculateSquadStats, 
  FORMATION_SLOTS, 
  isNaturalPositionFit,
  getDetailedChemistryLogs
} from '../src/utils/gameLogic';
import { Player, Position } from '../src/types/game';

describe('Squad Calculation Logic', () => {
  const slots433 = FORMATION_SLOTS['4-3-3'];

  const makeMockPlayer = (
    id: string,
    pos: Position,
    secondaries: Position[] = [],
    rating = 85,
    club = 'Arsenal',
    nationality = 'England',
    era: '90s' | '00s' | '10s' | 'Modern' = '00s'
  ): Player => ({
    id,
    playerName: `Player ${id}`,
    displayName: `Display ${id}`,
    season: '2004',
    club,
    league: 'Premier League',
    nationality,
    primaryPosition: pos,
    secondaryPositions: secondaries,
    era,
    rating,
    attack: rating,
    midfield: rating,
    defence: rating,
    pace: rating,
    technique: rating,
    physical: rating,
    mentality: rating,
    finishing: rating,
    creativity: rating,
    passing: rating,
    dribbling: rating,
    defending: rating,
    aerial: rating,
    pressing: rating,
    leadership: rating,
    bigGame: rating,
    consistency: rating,
    chemistryTags: [club, nationality, era],
    clubTags: [club],
    nationalityTag: nationality,
    eraTag: era,
    playStyleTags: [],
    rivalryTags: [],
    rarity: 'rare',
    specialTrait: 'Solid',
    shortBio: 'Bio',
    whyIncluded: 'Included',
    dataConfidence: 'high',
    seasonLabel: '2004',
    clubSeasonLabel: `${club} 2004`,
    oneLineDescription: 'Description',
    strengths: [],
    weaknesses: [],
    bestRole: 'Role',
    chemistryBoosts: [],
  });

  it('keeps attack, midfield, defence, chemistry, and overall within valid ranges', () => {
    const squad: Player[] = slots433.map((s, idx) =>
      makeMockPlayer(`p_${idx}`, s.position, [], 80)
    );

    const stats = calculateSquadStats(squad, slots433);

    expect(stats.attack).toBeGreaterThanOrEqual(50);
    expect(stats.attack).toBeLessThanOrEqual(99);
    expect(stats.midfield).toBeGreaterThanOrEqual(50);
    expect(stats.midfield).toBeLessThanOrEqual(99);
    expect(stats.defence).toBeGreaterThanOrEqual(50);
    expect(stats.defence).toBeLessThanOrEqual(99);
    expect(stats.chemistry).toBeGreaterThanOrEqual(10);
    expect(stats.chemistry).toBeLessThanOrEqual(100);
    expect(stats.overall).toBeGreaterThanOrEqual(50);
    expect(stats.overall).toBeLessThanOrEqual(99);
  });

  it('recognizes sister positions as natural fits without out-of-position penalties', () => {
    // LW in LM slot or LM in LW slot
    const lwPlayer = makeMockPlayer('lw', 'LW', []);
    expect(isNaturalPositionFit(lwPlayer, 'LM')).toBe(true);

    const rwPlayer = makeMockPlayer('rw', 'RW', []);
    expect(isNaturalPositionFit(rwPlayer, 'RM')).toBe(true);

    const stPlayer = makeMockPlayer('st', 'ST', []);
    expect(isNaturalPositionFit(stPlayer, 'CF')).toBe(true);

    const cdmPlayer = makeMockPlayer('cdm', 'CDM', []);
    expect(isNaturalPositionFit(cdmPlayer, 'CM')).toBe(true);
  });

  it('applies out of position penalties to genuinely misplaced players', () => {
    // ST playing at CB
    const stPlayer = makeMockPlayer('st_at_cb', 'ST', []);
    expect(isNaturalPositionFit(stPlayer, 'CB')).toBe(false);

    // GK playing at ST
    const gkPlayer = makeMockPlayer('gk_at_st', 'GK', []);
    expect(isNaturalPositionFit(gkPlayer, 'ST')).toBe(false);

    const squad: Player[] = slots433.map((s, idx) =>
      idx === 1 ? makeMockPlayer('st_at_cb', 'ST', [], 80, `Club_${idx}`) : makeMockPlayer(`p_${idx}`, s.position, [], 80, `Club_${idx}`)
    );
    const logs = getDetailedChemistryLogs(squad, slots433);
    const oopLog = logs.find((l) => l.reason.toLowerCase().includes('out of position'));
    expect(oopLog).toBeDefined();
    expect(oopLog!.type).toBe('negative');
  });

  it('accurately detects single and double pivot in midfield', () => {
    const slots4231 = FORMATION_SLOTS['4-2-3-1'];
    
    // Squad with 2 CDMs
    const squadWithDoublePivot: Player[] = slots4231.map((s, idx) =>
      makeMockPlayer(`p_${idx}`, s.position, [], 85)
    );
    const statsDouble = calculateSquadStats(squadWithDoublePivot, slots4231);
    expect(statsDouble.hasPivot).toBe(true);
    expect(statsDouble.hasDoublePivot).toBe(true);

    // Squad with 0 CDMs (all CM/CAM)
    const squadNoPivot: Player[] = slots4231.map((s, idx) => {
      const pos = s.position === 'CDM' ? 'CAM' : s.position;
      const p = makeMockPlayer(`p_${idx}`, pos, [], 85);
      p.defence = 60;
      p.defending = 60;
      return p;
    });
    const statsNoPivot = calculateSquadStats(squadNoPivot, slots4231);
    expect(statsNoPivot.hasDoublePivot).toBe(false);
  });

  it('evaluates GK based on defensive attributes, not attacking stats', () => {
    const gk1 = makeMockPlayer('gk1', 'GK', [], 90);
    gk1.defence = 95;
    gk1.defending = 95;
    gk1.attack = 40;
    gk1.finishing = 30;

    const gk2 = makeMockPlayer('gk2', 'GK', [], 90);
    gk2.defence = 70;
    gk2.defending = 70;
    gk2.attack = 95;
    gk2.finishing = 95;

    const squad1 = slots433.map((s, i) => (i === 0 ? gk1 : makeMockPlayer(`p_${i}`, s.position, [], 85)));
    const squad2 = slots433.map((s, i) => (i === 0 ? gk2 : makeMockPlayer(`p_${i}`, s.position, [], 85)));

    const stats1 = calculateSquadStats(squad1, slots433);
    const stats2 = calculateSquadStats(squad2, slots433);

    expect(stats1.gkRating).toBe(95);
    expect(stats2.gkRating).toBe(70);
    expect(stats1.defence).toBeGreaterThan(stats2.defence);
  });
});
