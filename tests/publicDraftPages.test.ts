import { describe, expect, it } from 'vitest';
import { getXiPage, getXiPages } from '../src/content/xiPages';

describe('public draft pages', () => {
  const pages = getXiPages();

  it('builds a useful number of club, era and nation pages', () => {
    expect(pages.length).toBeGreaterThanOrEqual(30);
    expect(pages.some((page) => page.kind === 'club')).toBe(true);
    expect(pages.some((page) => page.kind === 'era')).toBe(true);
    expect(pages.some((page) => page.kind === 'nation')).toBe(true);
  });

  it('has unique slugs and the featured pages exist', () => {
    const slugs = pages.map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of [
      'liverpool',
      'manchester-united',
      'arsenal',
      'premier-league-2000s',
      'england',
      'brazil',
    ]) {
      expect(getXiPage(slug)).toBeTruthy();
    }
  });

  it('builds a legal XI with no duplicate players on every page', () => {
    for (const page of pages) {
      expect(page.bestXI).toHaveLength(11);
      const names = page.bestXI.map((pick) => pick.player.playerName);
      expect(new Set(names).size).toBe(11);
      expect(new Set(page.topPlayers.map((player) => player.playerName)).size).toBe(page.topPlayers.length);

      for (const pick of page.bestXI) {
        if (page.kind === 'club') {
          expect(pick.player.club).toBe(page.subject);
        } else if (page.kind === 'nation') {
          expect(pick.player.nationality).toBe(page.subject);
        } else {
          expect(pick.player.league).toBe('Premier League');
        }
      }
    }
  });

  it('links to a playable themed draft and four related pages', () => {
    for (const page of pages) {
      expect(page.href.startsWith('/draft?')).toBe(true);
      expect(page.related).toHaveLength(4);
      for (const related of page.related) {
        expect(getXiPage(related)).toBeTruthy();
      }
    }
  });
});
