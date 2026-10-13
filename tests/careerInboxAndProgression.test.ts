import { describe, it, expect } from 'vitest';
import { createNewCareerSave } from '../src/career/saves';
import { getClubById } from '../src/career/clubs';
import { getPresetSettings } from '../src/career/settings';
import {
  getNextScheduledMatch,
  getPreviousPlayedMatch,
  isDateInInternationalBreak,
} from '../src/career/calendar';
import {
  getInitialInboxMessages,
  addInboxMessage,
  markMessageRead,
  markAllMessagesRead,
} from '../src/career/inbox';
import {
  isSeasonComplete,
  advanceToNextSeason,
  getSeasonReviewSummary,
} from '../src/career/seasons';
import { CUP_IDS, advanceCupTournament, simulateKnockoutCupFixture } from '../src/career/cups';
import { CupFixture, LeagueFixture } from '../src/career/types';

describe('Career Inbox and Multi-Competition Match Progression', () => {
  const getTestClub = (id: string = 'merseyside_red') => getClubById(id)!;

  it('initializes a new save with FM-style starter inbox messages', () => {
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Arne Slot', nationality: 'Netherlands' },
      club: getTestClub('merseyside_red'),
      settings: getPresetSettings('custom'),
    });
    expect(save.inbox).toBeDefined();
    expect(save.inbox!.length).toBeGreaterThanOrEqual(4);

    const boardMsg = save.inbox!.find((m) => m.type === 'board');
    expect(boardMsg).toBeDefined();
    expect(boardMsg?.isRead).toBe(false);
    expect(boardMsg?.priority).toBe('urgent');
    expect(boardMsg?.actionTab).toBe('settings');

    const physioMsg = save.inbox!.find((m) => m.type === 'injury');
    expect(physioMsg).toBeDefined();
    expect(physioMsg?.sender).toContain('Vance');
  });

  it('marks individual and all inbox messages as read', () => {
    let save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Mikel Arteta', nationality: 'Spain' },
      club: getTestClub('london_red'),
      settings: getPresetSettings('hard'),
    });
    const firstMsgId = save.inbox![0].id;

    save = markMessageRead(save, firstMsgId);
    expect(save.inbox![0].isRead).toBe(true);

    save = markAllMessagesRead(save);
    expect(save.inbox!.every((m) => m.isRead)).toBe(true);
  });

  it('adds incoming high priority messages to inbox', () => {
    let save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Enzo Maresca', nationality: 'Italy' },
      club: getTestClub('london_west'),
      settings: getPresetSettings('easy'),
    });
    const initialLen = save.inbox!.length;

    save = addInboxMessage(save, {
      date: '2026-08-10',
      sender: 'Chief Scout',
      senderRole: 'Transfer Intel',
      subject: 'Bid Accepted for Target Player',
      body: 'The club has accepted your £45m bid.',
      type: 'transfer',
      isRead: false,
      priority: 'urgent',
      actionLabel: 'Finalize Contract',
      actionTab: 'transfers',
    });

    expect(save.inbox!.length).toBe(initialLen + 1);
    expect(save.inbox![0].subject).toBe('Bid Accepted for Target Player');
    expect(save.inbox![0].isRead).toBe(false);
  });

  it('picks chronologically earliest match across league and cup competitions', () => {
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Pep Guardiola', nationality: 'Spain' },
      club: getTestClub('man_blue'),
      settings: getPresetSettings('hard'),
    });
    const nextMatch = getNextScheduledMatch(save);

    expect(nextMatch).not.toBeNull();
    // Season Opener Shield takes place on August 8, earlier than Premier League Matchday 1 (August 15)
    expect(nextMatch?.isCup).toBe(true);
    expect(nextMatch?.cupName).toBe('Season Opener Shield');
    expect(nextMatch?.fixture.date).toBe('2026-08-08');
  });

  it('correctly reports previous played match with cup shootout scores if applicable', () => {
    let save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Pep Guardiola', nationality: 'Spain' },
      club: getTestClub('man_blue'),
      settings: getPresetSettings('hard'),
    });
    expect(getPreviousPlayedMatch(save)).toBeNull();

    // Mark the Shield as played with a shootout
    const shieldCup = save.cups[CUP_IDS.SHIELD];
    expect(shieldCup).toBeDefined();

    const playedShieldFixture: CupFixture = {
      ...shieldCup.fixtures[0],
      played: true,
      homeScore: 2,
      awayScore: 2,
      penalties: { homePenalties: 5, awayPenalties: 4 },
    };

    save = {
      ...save,
      cups: {
        ...save.cups,
        [CUP_IDS.SHIELD]: {
          ...shieldCup,
          fixtures: [playedShieldFixture],
        },
      },
    };

    const prevMatch = getPreviousPlayedMatch(save);
    expect(prevMatch).not.toBeNull();
    expect(prevMatch?.isCup).toBe(true);
    expect(prevMatch?.cupName).toBe('Season Opener Shield');
    expect((prevMatch?.fixture as CupFixture).penalties?.homePenalties).toBe(5);
  });

  it('detects FIFA International Windows accurately', () => {
    expect(isDateInInternationalBreak('2026-09-05').isActive).toBe(true);
    expect(isDateInInternationalBreak('2026-09-05').resumeDate).toBe('2026-09-13');

    expect(isDateInInternationalBreak('2026-10-10').isActive).toBe(true);
    expect(isDateInInternationalBreak('2026-10-10').resumeDate).toBe('2026-10-17');

    expect(isDateInInternationalBreak('2026-11-15').isActive).toBe(true);
    expect(isDateInInternationalBreak('2026-11-15').resumeDate).toBe('2026-11-21');

    expect(isDateInInternationalBreak('2027-03-25').isActive).toBe(true);
    expect(isDateInInternationalBreak('2027-03-25').resumeDate).toBe('2027-03-30');

    // Normal club matchday in December
    expect(isDateInInternationalBreak('2026-12-26').isActive).toBe(false);
  });

  it('advances season, awards prizes, heals injuries, and sends a new season inbox message', () => {
    let save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Arne Slot', nationality: 'Netherlands' },
      club: getTestClub('merseyside_red'),
      settings: getPresetSettings('custom'),
    });

    // Add an injury
    save = {
      ...save,
      squad: save.squad.map((p, idx) =>
        idx === 0
          ? { ...p, injured: true, injuryWeeks: 4, injuryDescription: 'Hamstring Tear' }
          : p
      ),
    };
    expect(save.squad.filter((p) => p.injured).length).toBe(1);

    // Simulate completion of all 38 league matches
    save = {
      ...save,
      fixtures: save.fixtures.map((f) => ({
        ...f,
        played: true,
        homeScore: 2,
        awayScore: 1,
      })),
    };
    expect(isSeasonComplete(save.fixtures)).toBe(true);

    const oldBudget = save.finances.transferBudget;
    const { updatedSave, summary } = advanceToNextSeason(save);

    expect(updatedSave.season.seasonNumber).toBe(2);
    expect(updatedSave.season.yearStart).toBe(2027);
    expect(updatedSave.season.currentDate).toBe('2027-07-01');
    expect(updatedSave.season.transferWindowOpen).toBe(true);

    // Injuries healed
    expect(updatedSave.squad.filter((p) => p.injured).length).toBe(0);
    expect(updatedSave.squad.every((p) => p.fitness === 100)).toBe(true);

    // Prize money awarded
    expect(updatedSave.finances.transferBudget).toBeGreaterThan(oldBudget);

    // New season inbox message received
    const newSeasonMsg = updatedSave.inbox?.find((m) =>
      m.subject.includes('Season 2 Campaign Kickoff')
    );
    expect(newSeasonMsg).toBeDefined();
    expect(newSeasonMsg?.isRead).toBe(false);
  });
});
