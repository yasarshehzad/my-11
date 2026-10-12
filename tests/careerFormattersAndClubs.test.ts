import { describe, it, expect } from 'vitest';
import {
  formatCareerDate,
  formatNumber,
  formatCareerCurrency,
  formatCareerWage,
  formatCareerHeight,
  formatCareerWeight,
  getPlayerPhysicals,
} from '../src/career/formatters';
import { getAllClubs, getClubsWithUserClub, getEffectiveClubName } from '../src/career/clubs';
import { Club } from '../src/career/types';

describe('Career Mode Regional Formatters (UK default & FM style)', () => {
  it('formats dates in UK format (DD/MM/YYYY) by default', () => {
    // 2026-08-14
    expect(formatCareerDate('2026-08-14', 'uk', 'short')).toBe('14/08/2026');
    expect(formatCareerDate('2026-08-14', 'uk', 'medium')).toBe('14 Aug 2026');
    expect(formatCareerDate('2026-08-14', 'uk', 'long')).toBe('Friday, 14 August 2026');
  });

  it('formats dates in ISO and US formats when configured', () => {
    expect(formatCareerDate('2026-08-14', 'iso', 'short')).toBe('2026-08-14');
    expect(formatCareerDate('2026-08-14', 'us', 'short')).toBe('08/14/2026');
    expect(formatCareerDate('2026-08-14', 'us', 'medium')).toBe('Aug 14, 2026');
  });

  it('formats currencies across GBP (£), EUR (€), USD ($)', () => {
    expect(formatCareerCurrency(150_000_000, 'GBP')).toBe('£150M');
    expect(formatCareerCurrency(15_500_000, 'GBP')).toBe('£15.5M');
    expect(formatCareerCurrency(450_000, 'GBP')).toBe('£450k');
    expect(formatCareerCurrency(150_000_000, 'EUR')).toBe('€173M');
    expect(formatCareerCurrency(150_000_000, 'USD')).toBe('$188M');
  });

  it('formats wages across frequencies: weekly, monthly, annual', () => {
    // 100,000 weekly wage
    expect(formatCareerWage(100_000, 'weekly', 'GBP')).toBe('£100k/w');
    // monthly: 100k * 52 / 12 = 433,333.33 -> 433k
    expect(formatCareerWage(100_000, 'monthly', 'GBP')).toBe('£433k/mo');
    // annual: 100k * 52 = 5.2M
    expect(formatCareerWage(100_000, 'annual', 'GBP')).toBe('£5.2M/yr');
  });

  it('formats heights across ft_in, cm, m', () => {
    // 180 cm = 5' 11"
    expect(formatCareerHeight(180, 'cm')).toBe('180 cm');
    expect(formatCareerHeight(180, 'm')).toBe('1.80 m');
    expect(formatCareerHeight(180, 'ft_in')).toBe(`5' 11"`);
  });

  it('formats weights across kg, st_lbs, lbs', () => {
    expect(formatCareerWeight(75, 'kg')).toBe('75 kg');
    expect(formatCareerWeight(75, 'lbs')).toBe('165 lbs');
    expect(formatCareerWeight(75, 'st_lbs')).toBe('11st 11lbs');
  });

  it('formats numbers with comma, dot, and space digit groupings', () => {
    expect(formatNumber(1250500, 'comma')).toBe('1,250,500');
    expect(formatNumber(1250500, 'dot')).toBe('1.250.500');
    expect(formatNumber(1250500, 'space')).toBe('1 250 500');
  });

  it('generates deterministic physical attributes for any player', () => {
    const phys1 = getPlayerPhysicals('p_salah_123', 'FWD');
    const phys2 = getPlayerPhysicals('p_salah_123', 'FWD');
    expect(phys1.heightCm).toBe(phys2.heightCm);
    expect(phys1.weightKg).toBe(phys2.weightKg);
    expect(phys1.preferredFoot).toBe(phys2.preferredFoot);
    expect(phys1.heightCm).toBeGreaterThanOrEqual(165);
    expect(phys1.heightCm).toBeLessThanOrEqual(202);
  });
});

describe('Custom Club Naming Consistency across All Lookups', () => {
  it('getClubsWithUserClub replaces user club and retains customName in catalog', () => {
    const defaultClubs = getAllClubs();
    const target = defaultClubs.find((c) => c.id === 'merseyside_red')!;

    const customUserClub: Club = {
      ...target,
      customName: 'Liverpool FC Official',
    };

    const clubsList = getClubsWithUserClub(customUserClub);
    const found = clubsList.find((c) => c.id === 'merseyside_red');
    expect(found).toBeDefined();
    expect(found?.customName).toBe('Liverpool FC Official');
    expect(getEffectiveClubName(found!)).toBe('Liverpool FC Official');
  });

  it('getEffectiveClubName returns customName when userClub override is provided', () => {
    const defaultClubs = getAllClubs();
    const staticClub = defaultClubs.find((c) => c.id === 'merseyside_red')!;
    expect(staticClub.customName).toBeUndefined();

    const userClub: Club = {
      ...staticClub,
      customName: 'Liverpool Custom Dyn',
    };

    expect(getEffectiveClubName(staticClub, userClub)).toBe('Liverpool Custom Dyn');
  });
});
