export interface FeaturedDraft {
  slug: string;
  title: string;
  subtitle: string;
}

export const FEATURED_DRAFTS: FeaturedDraft[] = [
  { slug: 'liverpool', title: 'Liverpool', subtitle: 'All-time XI' },
  { slug: 'manchester-united', title: 'Manchester United', subtitle: 'All-time XI' },
  { slug: 'arsenal', title: 'Arsenal', subtitle: 'All-time XI' },
  { slug: 'premier-league-2000s', title: 'Premier League', subtitle: '2000s XI' },
  { slug: 'england', title: 'England', subtitle: 'All-time XI' },
  { slug: 'brazil', title: 'Brazil', subtitle: 'All-time XI' },
];
