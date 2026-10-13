import { CareerSaveFile, ManagerMessage } from './types';
import { getEffectiveClubName } from './clubs';
import { formatCareerCurrency } from './formatters';

export function getInitialInboxMessages(save: CareerSaveFile): ManagerMessage[] {
  const clubName = getEffectiveClubName(save.club);
  const managerName = save.manager.name;
  const date = save.season.currentDate || '2026-07-01';

  return [
    {
      id: 'msg_welcome_board',
      date,
      sender: 'Board of Directors',
      senderRole: 'Club Executive Committee',
      subject: `Welcome to ${clubName} - Managerial Contract Confirmed`,
      body: `Dear ${managerName},\n\nThe Board is delighted to welcome you as our new first-team manager. We have approved a starting transfer budget of ${formatCareerCurrency(save.finances.transferBudget, save.settings.currency)}. The supporters have high expectations for the coming campaign. Good luck!`,
      type: 'board',
      isRead: false,
      priority: 'urgent',
      actionLabel: 'Review Club Vision & Rules',
      actionTab: 'settings',
    },
    {
      id: 'msg_physio_preseason',
      date,
      sender: 'Dr. Marcus Vance',
      senderRole: 'Head of Sports Science & Medicine',
      subject: 'Medical Room & Squad Physical Baseline Report',
      body: `Boss,\n\nThe senior squad has completed physical screenings. Current overall fitness stands at 100%. We will monitor fatigue levels during matches. Should any player suffer muscular or contact injuries, our medical staff will notify you immediately with expected recovery timelines.`,
      type: 'injury',
      isRead: false,
      priority: 'normal',
      actionLabel: 'Inspect Squad Fitness',
      actionTab: 'squad',
    },
    {
      id: 'msg_scout_window',
      date,
      sender: 'David Gallagher',
      senderRole: 'Chief Scout',
      subject: 'Summer Transfer Window Scouting Intel',
      body: `Boss,\n\nThe summer transfer window is officially open. We have prepared market intelligence on domestic talent and elite international players. Our scouting database allows filtering by position, age, rating, and value. Let us know when you wish to lodge incoming bids.`,
      type: 'transfer',
      isRead: false,
      priority: 'normal',
      actionLabel: 'Open Transfer Market',
      actionTab: 'transfers',
    },
    {
      id: 'msg_fa_cups',
      date,
      sender: 'Competitions Committee',
      senderRole: 'Football Association & UEFA',
      subject: 'Season Fixtures & Tournament Draws Confirmed',
      body: `The official calendar for Season ${save.season.seasonNumber} has been sanctioned. In addition to the 38-game league campaign, your club will compete in the domestic cup competitions (League Cup & The English Cup) as well as European tournament action. All dates are synchronized on your management desk.`,
      type: 'cup_draw',
      isRead: false,
      priority: 'normal',
      actionLabel: 'Inspect Cups & Europe',
      actionTab: 'cups',
    },
  ];
}

export function addInboxMessage(
  save: CareerSaveFile,
  msg: Omit<ManagerMessage, 'id'>
): CareerSaveFile {
  const newMsg: ManagerMessage = {
    ...msg,
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  };

  const existing = save.inbox || [];
  return {
    ...save,
    inbox: [newMsg, ...existing],
  };
}

export function markMessageRead(
  save: CareerSaveFile,
  messageId: string
): CareerSaveFile {
  const existing = save.inbox || [];
  return {
    ...save,
    inbox: existing.map((m) => (m.id === messageId ? { ...m, isRead: true } : m)),
  };
}

export function markAllMessagesRead(save: CareerSaveFile): CareerSaveFile {
  const existing = save.inbox || [];
  return {
    ...save,
    inbox: existing.map((m) => ({ ...m, isRead: true })),
  };
}
