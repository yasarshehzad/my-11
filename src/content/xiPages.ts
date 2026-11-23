import { players } from '../data/players';
import type { Player, Position } from '../types/game';

export type XiPageKind = 'club' | 'era' | 'nation';

export interface XiPick {
  slot: string;
  player: Player;
}

export interface XiPage {
  slug: string;
  kind: XiPageKind;
  subject: string;
  title: string;
  description: string;
  intro: string;
  poolSize: number;
  eraCount: number;
  topPlayer: Player;
  topPlayers: Player[];
  bestXI: XiPick[];
  href: string;
  related: string[];
}

const CLUBS = [
  'Manchester United',
  'Liverpool',
  'Arsenal',
  'Chelsea',
  'Manchester City',
  'Tottenham',
  'Newcastle',
  'Aston Villa',
  'Everton',
  'Blackburn',
  'Leicester',
  'Barcelona',
  'Real Madrid',
  'AC Milan',
  'Inter Milan',
  'Juventus',
  'Bayern Munich',
  'Dortmund',
  'PSG',
  'Ajax',
];

const ERAS: { era: Player['era']; label: string; slug: string }[] = [
  { era: '90s', label: '1990s', slug: 'premier-league-1990s' },
  { era: '00s', label: '2000s', slug: 'premier-league-2000s' },
  { era: '10s', label: '2010s', slug: 'premier-league-2010s' },
  { era: 'Modern', label: 'modern era', slug: 'premier-league-modern' },
];

const NATIONS = [
  'England',
  'France',
  'Spain',
  'Germany',
  'Italy',
  'Brazil',
  'Argentina',
  'Portugal',
  'Netherlands',
  'Belgium',
  'Croatia',
  'Denmark',
];

const XI_SLOTS: { label: string; position: Position }[] = [
  { label: 'GK', position: 'GK' },
  { label: 'LB', position: 'LB' },
  { label: 'CB', position: 'CB' },
  { label: 'CB', position: 'CB' },
  { label: 'RB', position: 'RB' },
  { label: 'CM', position: 'CM' },
  { label: 'CM', position: 'CM' },
  { label: 'CAM', position: 'CAM' },
  { label: 'LW', position: 'LW' },
  { label: 'ST', position: 'ST' },
  { label: 'RW', position: 'RW' },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function positionFitScore(player: Player, position: Position): number {
  if (player.primaryPosition === position) return 3;
  if (player.secondaryPositions?.includes(position)) return 2;
  if (player.naturalPositions?.includes(position)) return 2;

  const departmentOf = (pos: Position): 'GK' | 'DEF' | 'MID' | 'ATT' => {
    if (pos === 'GK') return 'GK';
    if (pos === 'LB' || pos === 'CB' || pos === 'RB') return 'DEF';
    if (pos === 'CDM' || pos === 'CM' || pos === 'CAM' || pos === 'LM' || pos === 'RM') return 'MID';
    return 'ATT';
  };

  return departmentOf(player.primaryPosition) === departmentOf(position) ? 1 : 0;
}

function pickBestXI(pool: Player[]): XiPick[] {
  const used = new Set<string>();
  const picks: XiPick[] = [];

  for (const slot of XI_SLOTS) {
    const ranked = pool
      .filter((player) => !used.has(player.playerName))
      .map((player) => ({ player, fit: positionFitScore(player, slot.position) }))
      .filter((entry) => entry.fit > 0)
      .sort((a, b) => b.fit - a.fit || b.player.rating - a.player.rating);

    const fallback = pool
      .filter((player) => !used.has(player.playerName))
      .sort((a, b) => b.rating - a.rating);

    const chosen = ranked[0]?.player || fallback[0];
    if (!chosen) break;
    used.add(chosen.playerName);
    picks.push({ slot: slot.label, player: chosen });
  }

  return picks;
}

function topUniquePlayers(pool: Player[], count: number): Player[] {
  const seen = new Set<string>();
  const unique: Player[] = [];
  for (const player of pool) {
    if (seen.has(player.playerName)) continue;
    seen.add(player.playerName);
    unique.push(player);
    if (unique.length >= count) break;
  }
  return unique;
}

function uniqueEraCount(pool: Player[]): number {
  return new Set(pool.map((player) => player.era)).size;
}

function buildIntro(kind: XiPageKind, subject: string, pool: Player[], top: Player, eraLabel?: string): string {
  if (kind === 'club') {
    return `${subject} have ${pool.length} player seasons in the MY-11 database. The highest-rated is ${top.playerName} (${top.season}, ${top.rating} OVR). The XI below is the strongest 4-3-3 the data can build, one season per player.`;
  }
  if (kind === 'era') {
    return `The ${eraLabel} Premier League pool contains ${pool.length} player seasons. ${top.playerName} (${top.season}, ${top.rating} OVR) is the highest-rated pick. The XI below is the strongest legal 4-3-3 from that era.`;
  }
  return `${subject} have ${pool.length} player seasons across ${uniqueEraCount(pool)} eras. ${top.playerName} (${top.season}, ${top.rating} OVR) leads the pool. The XI below is the strongest 4-3-3 the database can build.`;
}

function buildPages(): XiPage[] {
  const pages: Omit<XiPage, 'related'>[] = [];

  for (const club of CLUBS) {
    const pool = players.filter((player) => player.club === club);
    if (pool.length < 11) continue;
    const sorted = [...pool].sort((a, b) => b.rating - a.rating);
    const top = sorted[0];
    const bestXI = pickBestXI(sorted);
    if (bestXI.length < 11) continue;
    pages.push({
      slug: slugify(club),
      kind: 'club',
      subject: club,
      title: `${club}: the greatest XI`,
      description: `Build the greatest ${club} XI from ${pool.length} player seasons, or see the best XI the MY-11 database can make. Play free.`,
      intro: buildIntro('club', club, pool, top),
      poolSize: pool.length,
      eraCount: uniqueEraCount(pool),
      topPlayer: top,
      topPlayers: topUniquePlayers(sorted, 6),
      bestXI,
      href: `/draft?club=${encodeURIComponent(club)}`,
    });
  }

  for (const era of ERAS) {
    const pool = players.filter((player) => player.era === era.era && player.league === 'Premier League');
    if (pool.length < 11) continue;
    const sorted = [...pool].sort((a, b) => b.rating - a.rating);
    const top = sorted[0];
    const bestXI = pickBestXI(sorted);
    if (bestXI.length < 11) continue;
    pages.push({
      slug: era.slug,
      kind: 'era',
      subject: `Premier League ${era.label}`,
      title: `Premier League ${era.label}: the best XI`,
      description: `Build the best Premier League XI of the ${era.label} from ${pool.length} player seasons, or see the strongest XI the MY-11 database can make. Play free.`,
      intro: buildIntro('era', `Premier League ${era.label}`, pool, top, era.label),
      poolSize: pool.length,
      eraCount: 1,
      topPlayer: top,
      topPlayers: topUniquePlayers(sorted, 6),
      bestXI,
      href: `/draft?era=${encodeURIComponent(era.era)}&poolLeague=${encodeURIComponent('Premier League')}`,
    });
  }

  for (const nation of NATIONS) {
    const pool = players.filter((player) => player.nationality === nation);
    if (pool.length < 11) continue;
    const sorted = [...pool].sort((a, b) => b.rating - a.rating);
    const top = sorted[0];
    const bestXI = pickBestXI(sorted);
    if (bestXI.length < 11) continue;
    pages.push({
      slug: slugify(nation),
      kind: 'nation',
      subject: nation,
      title: `${nation}: the greatest XI`,
      description: `Build the greatest ${nation} XI from ${pool.length} player seasons, or see the best XI the MY-11 database can make. Play free.`,
      intro: buildIntro('nation', nation, pool, top),
      poolSize: pool.length,
      eraCount: uniqueEraCount(pool),
      topPlayer: top,
      topPlayers: topUniquePlayers(sorted, 6),
      bestXI,
      href: `/draft?nation=${encodeURIComponent(nation)}`,
    });
  }

  return pages.map((page) => {
    const sameKind = pages.filter((candidate) => candidate.slug !== page.slug && candidate.kind === page.kind);
    const otherKind = pages.filter((candidate) => candidate.slug !== page.slug && candidate.kind !== page.kind);
    const related = [...sameKind, ...otherKind].slice(0, 4).map((candidate) => candidate.slug);
    return { ...page, related };
  });
}

let cachedPages: XiPage[] | null = null;

export function getXiPages(): XiPage[] {
  if (!cachedPages) cachedPages = buildPages();
  return cachedPages;
}

export function getXiPage(slug: string): XiPage | undefined {
  return getXiPages().find((page) => page.slug === slug);
}

export function getXiPageSlugs(): string[] {
  return getXiPages().map((page) => page.slug);
}
