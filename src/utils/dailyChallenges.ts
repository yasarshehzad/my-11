import { ChallengeTemplate } from '../types/game';

// Daily challenges templates rotating by day-of-week (0 = Sun, 1 = Mon, ..., 6 = Sat)
export const DAILY_CHALLENGES: ChallengeTemplate[] = [
  {
    id: 'sunday_golden_era',
    title: 'The Golden Era',
    description: 'Win the league qualification (60+ pts) using ONLY players from the 2000s.',
    rule: 'only_2000s',
  },
  {
    id: 'monday_underdog',
    title: 'Underdog Story',
    description: 'Finish respectably (50+ pts) using ONLY Common and Rare players.',
    rule: 'underdog_xi',
  },
  {
    id: 'tuesday_no_legends',
    title: 'No Legends Allowed',
    description: 'Win the league qualification (60+ pts) with absolutely zero Legends.',
    rule: 'no_legends',
  },
  {
    id: 'wednesday_defence',
    title: 'The Great Wall',
    description: 'Score 60+ pts and achieve a final team Defence rating of 88 or higher.',
    rule: 'best_defence',
  },
  {
    id: 'thursday_galactico',
    title: 'Galáctico Blueprint',
    description: 'Win the league qualification (60+ pts) built around exactly 1 Legend player.',
    rule: 'one_superstar',
  },
  {
    id: 'friday_budget',
    title: 'Budget Masterclass',
    description: 'Draft a team where no player is rated 90 or above, and qualify (60+ pts).',
    rule: 'under_90_rating',
  },
  {
    id: 'saturday_modern',
    title: 'Modern Dominance',
    description: 'Draft a squad using ONLY players from the Modern era, and qualify (60+ pts).',
    rule: 'only_modern',
  },
];

export function getTodayChallenge(date: Date = new Date()): ChallengeTemplate {
  const day = date.getDay();
  return DAILY_CHALLENGES[day] || DAILY_CHALLENGES[0];
}
