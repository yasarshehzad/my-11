export type AchievementCategory = 'draft' | 'daily' | 'career' | 'collection';
export type AchievementTier = 'bronze' | 'silver' | 'gold';

export type AchievementMetric =
  | 'draftsCompleted'
  | 'quickDrafts'
  | 'mysteryDrafts'
  | 'bestPoints'
  | 'bestWins'
  | 'bestOverall'
  | 'bestChemistry'
  | 'perfectSeasons'
  | 'topFourFinishes'
  | 'leagueTitles'
  | 'maxLegendsInXi'
  | 'dailyCompleted'
  | 'dailyCleared'
  | 'bestChallengeStreak'
  | 'careerCreated'
  | 'careerSeasons'
  | 'careerMatches'
  | 'careerWins'
  | 'careerTrophies'
  | 'uniquePlayers'
  | 'clubsDrafted'
  | 'erasDrafted'
  | 'nationsDrafted'
  | 'shares';

export type AchievementIcon =
  | 'ball'
  | 'flame'
  | 'trophy'
  | 'crown'
  | 'star'
  | 'shield'
  | 'bolt'
  | 'globe'
  | 'calendar'
  | 'users'
  | 'target'
  | 'sparkles'
  | 'whistle'
  | 'medal'
  | 'megaphone';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  xp: number;
  metric: AchievementMetric;
  target: number;
  icon: AchievementIcon;
}

/**
 * A tight list of goals that can all be reached with the current game modes.
 * Thresholds are deliberately visible in the description so progress feels fair.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  // Draft milestones
  {
    id: 'first_xi',
    title: 'First Eleven',
    description: 'Complete your first draft.',
    category: 'draft',
    tier: 'bronze',
    xp: 25,
    metric: 'draftsCompleted',
    target: 1,
    icon: 'ball',
  },
  {
    id: 'ten_xi',
    title: 'Regular',
    description: 'Complete 10 drafts.',
    category: 'draft',
    tier: 'silver',
    xp: 100,
    metric: 'draftsCompleted',
    target: 10,
    icon: 'calendar',
  },
  {
    id: 'fifty_xi',
    title: 'Draft Room Veteran',
    description: 'Complete 50 drafts.',
    category: 'draft',
    tier: 'gold',
    xp: 300,
    metric: 'draftsCompleted',
    target: 50,
    icon: 'crown',
  },
  {
    id: 'quick_fire',
    title: 'Quick Fire',
    description: 'Complete a Quick draft.',
    category: 'draft',
    tier: 'bronze',
    xp: 25,
    metric: 'quickDrafts',
    target: 1,
    icon: 'bolt',
  },
  {
    id: 'mystery_solver',
    title: 'Mystery Solver',
    description: 'Complete a Mystery draft.',
    category: 'draft',
    tier: 'bronze',
    xp: 25,
    metric: 'mysteryDrafts',
    target: 1,
    icon: 'target',
  },
  {
    id: 'ninety_club',
    title: 'Ninety Club',
    description: 'Draft an XI with a 90+ overall rating.',
    category: 'draft',
    tier: 'silver',
    xp: 100,
    metric: 'bestOverall',
    target: 90,
    icon: 'star',
  },
  {
    id: 'ninety_five_club',
    title: 'Five-Star Squad',
    description: 'Draft an XI with a 95+ overall rating.',
    category: 'draft',
    tier: 'gold',
    xp: 300,
    metric: 'bestOverall',
    target: 95,
    icon: 'sparkles',
  },
  {
    id: 'perfect_chem',
    title: 'Perfect Ten',
    description: 'Reach 90 chemistry in a draft.',
    category: 'draft',
    tier: 'silver',
    xp: 100,
    metric: 'bestChemistry',
    target: 90,
    icon: 'shield',
  },
  {
    id: 'century_points',
    title: 'Centurions',
    description: 'Reach 100 points in a 38-game season.',
    category: 'draft',
    tier: 'gold',
    xp: 250,
    metric: 'bestPoints',
    target: 100,
    icon: 'trophy',
  },
  {
    id: 'invincible',
    title: 'Invincible',
    description: 'Win all 38 league matches.',
    category: 'draft',
    tier: 'gold',
    xp: 400,
    metric: 'bestWins',
    target: 38,
    icon: 'crown',
  },
  {
    id: 'champions',
    title: 'Champions',
    description: 'Finish first in a simulated season.',
    category: 'draft',
    tier: 'silver',
    xp: 150,
    metric: 'leagueTitles',
    target: 1,
    icon: 'trophy',
  },
  {
    id: 'top_four',
    title: 'Top Four',
    description: 'Finish in the top four.',
    category: 'draft',
    tier: 'bronze',
    xp: 50,
    metric: 'topFourFinishes',
    target: 1,
    icon: 'target',
  },
  {
    id: 'legend_xi',
    title: 'Legend XI',
    description: 'Draft 11 Legends in one starting XI.',
    category: 'draft',
    tier: 'gold',
    xp: 250,
    metric: 'maxLegendsInXi',
    target: 11,
    icon: 'star',
  },

  // Daily ritual
  {
    id: 'daily_debut',
    title: 'Daily Habit',
    description: 'Clear your first daily scenario.',
    category: 'daily',
    tier: 'bronze',
    xp: 25,
    metric: 'dailyCleared',
    target: 1,
    icon: 'flame',
  },
  {
    id: 'daily_ten',
    title: 'Ten Out of Ten',
    description: 'Clear 10 daily scenarios.',
    category: 'daily',
    tier: 'silver',
    xp: 150,
    metric: 'dailyCleared',
    target: 10,
    icon: 'calendar',
  },
  {
    id: 'streak_three',
    title: 'On a Run',
    description: 'Reach a 3-day daily challenge streak.',
    category: 'daily',
    tier: 'bronze',
    xp: 50,
    metric: 'bestChallengeStreak',
    target: 3,
    icon: 'flame',
  },
  {
    id: 'streak_seven',
    title: 'Week of Wins',
    description: 'Reach a 7-day daily challenge streak.',
    category: 'daily',
    tier: 'silver',
    xp: 150,
    metric: 'bestChallengeStreak',
    target: 7,
    icon: 'flame',
  },
  {
    id: 'streak_thirty',
    title: 'Month of Madness',
    description: 'Reach a 30-day daily challenge streak.',
    category: 'daily',
    tier: 'gold',
    xp: 500,
    metric: 'bestChallengeStreak',
    target: 30,
    icon: 'crown',
  },

  // Collection
  {
    id: 'era_traveller',
    title: 'Era Traveller',
    description: 'Draft a player from all four eras.',
    category: 'collection',
    tier: 'silver',
    xp: 100,
    metric: 'erasDrafted',
    target: 4,
    icon: 'globe',
  },
  {
    id: 'club_collector',
    title: 'Club Collector',
    description: 'Draft a player from 20 different clubs.',
    category: 'collection',
    tier: 'gold',
    xp: 200,
    metric: 'clubsDrafted',
    target: 20,
    icon: 'shield',
  },
  {
    id: 'nation_collector',
    title: 'United Nations',
    description: 'Draft players from 10 different nations.',
    category: 'collection',
    tier: 'silver',
    xp: 100,
    metric: 'nationsDrafted',
    target: 10,
    icon: 'globe',
  },
  {
    id: 'hundred_players',
    title: "Scout's Eye",
    description: 'Collect 100 unique players.',
    category: 'collection',
    tier: 'silver',
    xp: 100,
    metric: 'uniquePlayers',
    target: 100,
    icon: 'users',
  },
  {
    id: 'five_hundred_players',
    title: 'Database Deep Dive',
    description: 'Collect 500 unique players.',
    category: 'collection',
    tier: 'gold',
    xp: 300,
    metric: 'uniquePlayers',
    target: 500,
    icon: 'users',
  },

  // Career mode
  {
    id: 'career_created',
    title: 'The Gaffer',
    description: 'Start a Career Mode save.',
    category: 'career',
    tier: 'bronze',
    xp: 25,
    metric: 'careerCreated',
    target: 1,
    icon: 'whistle',
  },
  {
    id: 'career_ten_matches',
    title: 'Touchline',
    description: 'Play 10 career matches.',
    category: 'career',
    tier: 'bronze',
    xp: 50,
    metric: 'careerMatches',
    target: 10,
    icon: 'ball',
  },
  {
    id: 'career_hundred_matches',
    title: 'Seasoned',
    description: 'Play 100 career matches.',
    category: 'career',
    tier: 'silver',
    xp: 200,
    metric: 'careerMatches',
    target: 100,
    icon: 'calendar',
  },
  {
    id: 'career_first_trophy',
    title: 'Silverware',
    description: 'Win your first trophy in Career Mode.',
    category: 'career',
    tier: 'silver',
    xp: 150,
    metric: 'careerTrophies',
    target: 1,
    icon: 'trophy',
  },
  {
    id: 'career_five_trophies',
    title: 'Serial Winner',
    description: 'Win five trophies in Career Mode.',
    category: 'career',
    tier: 'gold',
    xp: 400,
    metric: 'careerTrophies',
    target: 5,
    icon: 'trophy',
  },
  {
    id: 'career_three_seasons',
    title: 'Dynasty',
    description: 'Reach season 3 in one career.',
    category: 'career',
    tier: 'silver',
    xp: 150,
    metric: 'careerSeasons',
    target: 3,
    icon: 'crown',
  },
  {
    id: 'career_five_seasons',
    title: 'Legacy',
    description: 'Reach season 5 in one career.',
    category: 'career',
    tier: 'gold',
    xp: 350,
    metric: 'careerSeasons',
    target: 5,
    icon: 'crown',
  },
  {
    id: 'career_ten_seasons',
    title: 'Immortal',
    description: 'Reach season 10 in one career.',
    category: 'career',
    tier: 'gold',
    xp: 600,
    metric: 'careerSeasons',
    target: 10,
    icon: 'sparkles',
  },
  {
    id: 'career_hundred_wins',
    title: 'Century Manager',
    description: 'Win 100 career matches.',
    category: 'career',
    tier: 'gold',
    xp: 300,
    metric: 'careerWins',
    target: 100,
    icon: 'medal',
  },
  {
    id: 'first_share',
    title: 'Spread the Word',
    description: 'Share or challenge a friend with a result.',
    category: 'draft',
    tier: 'bronze',
    xp: 25,
    metric: 'shares',
    target: 1,
    icon: 'megaphone',
  },
];

export const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));

export const TIER_ORDER: Record<AchievementTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
};

export function getAchievementIconName(icon: AchievementIcon): string {
  return icon;
}
