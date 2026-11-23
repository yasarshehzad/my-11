import { ChallengeTemplate } from '../types/game';

/**
 * Daily scenarios rotate by calendar day, not weekday. Everyone who opens the
 * game on the same local date gets the same scenario and the same seeded draft
 * options, so results are comparable.
 *
 * Keep descriptions honest: the target shown here must match the evaluation in
 * `handleSaveCampaignResults` in `useDraftGame.ts`.
 */
export const DAILY_CHALLENGES: ChallengeTemplate[] = [
  {
    id: 'golden_era',
    title: 'The Golden Era',
    description: 'Qualify with 60+ points using only players from the 2000s.',
    rule: 'only_2000s',
    targetPoints: 60,
  },
  {
    id: 'underdog_story',
    title: 'Underdog Story',
    description: 'Reach 50 points using only Common and Rare players.',
    rule: 'underdog_xi',
    targetPoints: 50,
  },
  {
    id: 'no_legends',
    title: 'No Legends Allowed',
    description: 'Qualify with 60+ points and zero Legends in the XI.',
    rule: 'no_legends',
    targetPoints: 60,
  },
  {
    id: 'great_wall',
    title: 'The Great Wall',
    description: 'Reach 60 points with a final Defence rating of 88 or higher.',
    rule: 'best_defence',
    targetPoints: 60,
    targetStat: 88,
  },
  {
    id: 'galactico_blueprint',
    title: 'Galáctico Blueprint',
    description: 'Build around exactly one Legend and still reach 60 points.',
    rule: 'one_superstar',
    targetPoints: 60,
    targetLegends: 1,
  },
  {
    id: 'budget_masterclass',
    title: 'Budget Masterclass',
    description: 'No player rated 90 or above, and still reach 60 points.',
    rule: 'under_90_rating',
    targetPoints: 60,
  },
  {
    id: 'modern_dominance',
    title: 'Modern Dominance',
    description: 'Qualify with 60+ points using only Modern-era players.',
    rule: 'only_modern',
    targetPoints: 60,
  },
  {
    id: 'nineties_revival',
    title: 'Nineties Revival',
    description: 'Qualify with 60+ points using only players from the 90s.',
    rule: 'only_90s',
    targetPoints: 60,
  },
  {
    id: 'inbetweeners',
    title: 'The Inbetweeners',
    description: 'Qualify with 60+ points using only players from the 2010s.',
    rule: 'only_10s',
    targetPoints: 60,
  },
  {
    id: 'legends_only',
    title: 'Legends Only',
    description: 'Every pick must be a Legend. Reach 60 points.',
    rule: 'only_legends',
    modifier: 'mystery',
    targetPoints: 60,
  },
  {
    id: 'attack_attack',
    title: 'Attack, Attack',
    description: 'Reach 60 points with a final Attack rating of 88 or higher.',
    rule: 'best_attack',
    targetPoints: 60,
    targetStat: 88,
  },
  {
    id: 'midfield_maestros',
    title: 'Midfield Maestros',
    description: 'Reach 60 points with a final Midfield rating of 88 or higher.',
    rule: 'best_midfield',
    targetPoints: 60,
    targetStat: 88,
  },
  {
    id: 'perfect_ten',
    title: 'Perfect Ten',
    description: 'Reach 60 points with 90+ chemistry. Style matters.',
    rule: 'perfect_chemistry',
    targetPoints: 60,
    targetChemistry: 90,
  },
  {
    id: 'eighty_five_club',
    title: 'The 85 Club',
    description: 'Every player must be rated 85 or higher. Reach 60 points.',
    rule: 'only_85_plus',
    targetPoints: 60,
  },
  {
    id: 'against_the_grain',
    title: 'Against the Grain',
    description: 'Nobody above 84 OVR. Reach 60 points anyway.',
    rule: 'only_under_85',
    targetPoints: 60,
  },
  {
    id: 'solid_foundations',
    title: 'Solid Foundations',
    description: 'Only Common, Solid or Rare cards. Reach 55 points.',
    rule: 'only_solid_or_below',
    targetPoints: 55,
  },
  {
    id: 'one_man_team',
    title: 'One-Man Team',
    description: 'Exactly one Legend, and 70+ points.',
    rule: 'one_superstar',
    targetPoints: 70,
    targetLegends: 1,
  },
  {
    id: 'nineties_derby',
    title: 'The 90s Derby',
    description: 'Only 90s players. Reach 55 points with the old-school rules.',
    rule: 'only_90s',
    modifier: 'quick',
    targetPoints: 55,
  },
  {
    id: 'millennium_xi',
    title: 'Millennium XI',
    description: 'Only 2000s players. Reach 65 points.',
    rule: 'only_2000s',
    modifier: 'mystery',
    targetPoints: 65,
  },
  {
    id: 'modern_icons',
    title: 'Modern Icons',
    description: 'Only Modern players. Reach 65 points.',
    rule: 'only_modern',
    targetPoints: 65,
  },
  {
    id: 'wall_of_26',
    title: 'The Wall of 26',
    description: 'Defence rating of 90 or higher, and 55+ points.',
    rule: 'best_defence',
    targetPoints: 55,
    targetStat: 90,
  },
  {
    id: 'total_football',
    title: 'Total Football',
    description: 'Midfield rating of 90 or higher, and 55+ points.',
    rule: 'best_midfield',
    targetPoints: 55,
    targetStat: 90,
  },
  {
    id: 'counter_punch',
    title: 'Counter Punch',
    description: 'Attack rating of 90 or higher, and 55+ points.',
    rule: 'best_attack',
    targetPoints: 55,
    targetStat: 90,
  },
  {
    id: 'chemistry_lab',
    title: 'Chemistry Lab',
    description: 'Reach 92 chemistry and 50+ points. Links over ratings.',
    rule: 'perfect_chemistry',
    targetPoints: 50,
    targetChemistry: 92,
  },
  {
    id: 'no_easy_games',
    title: 'No Easy Games',
    description: 'Nobody above 84 OVR. Reach 55 points.',
    rule: 'only_under_85',
    targetPoints: 55,
  },
  {
    id: 'rare_air',
    title: 'Rare Air',
    description: 'Only Common and Rare cards. Reach 55 points.',
    rule: 'underdog_xi',
    modifier: 'quick',
    targetPoints: 55,
  },
  {
    id: 'galactico_limit',
    title: 'The Galáctico Limit',
    description: 'Exactly one Legend, and 65+ points.',
    rule: 'one_superstar',
    targetPoints: 65,
    targetLegends: 1,
  },
  {
    id: 'invincibles',
    title: 'The Invincibles',
    description: 'Go the whole 38-game season unbeaten.',
    rule: 'unbeaten',
    targetPoints: 0,
  },
];

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

export function getTodayChallenge(date: Date = new Date()): ChallengeTemplate {
  const index = getDayOfYear(date) % DAILY_CHALLENGES.length;
  return DAILY_CHALLENGES[index] || DAILY_CHALLENGES[0];
}

export function getTomorrowChallenge(date: Date = new Date()): ChallengeTemplate {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return getTodayChallenge(next);
}

export function getChallengeByRule(rule: ChallengeTemplate['rule']): ChallengeTemplate | undefined {
  return DAILY_CHALLENGES.find((challenge) => challenge.rule === rule);
}
