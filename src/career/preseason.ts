import {
  CareerSaveFile,
  CupTournament,
  CupFixture,
  PreseasonTourOption,
  PreseasonTourId,
  ManagerMessage,
  CalendarEvent,
} from './types';
import { CUP_IDS, simulateKnockoutCupFixture, findAnyClub } from './cups';
import { formatCurrency } from './finance';
import { getEffectiveClubName } from './clubs';

export const PRESEASON_TOUR_OPTIONS: PreseasonTourOption[] = [
  {
    id: 'usa',
    title: 'North American Champions Cup',
    region: 'United States',
    destinationCity: 'New York & Los Angeles',
    description: 'High-profile stadium tour across the USA facing elite European heavyweights. Generates massive commercial revenue and global brand expansion.',
    prizeMoney: 4_500_000,
    commercialBoost: 1_200_000,
    fitnessBonusDescription: '+£4.5M Commercial Funds • High Match Fitness • Global Media Spotlight',
    badgeEmoji: '🇺🇸',
    opponents: [
      { clubId: 'madrid_royal', name: 'Madrid Royal', tier: 'elite', country: 'Spain' },
      { clubId: 'bavarian_munich', name: 'Bavarian Munich', tier: 'elite', country: 'Germany' },
      { clubId: 'milan_blue', name: 'Milan Blue & Black', tier: 'upper', country: 'Italy' },
    ],
  },
  {
    id: 'asia',
    title: 'Asian Super Showcase',
    region: 'East Asia',
    destinationCity: 'Tokyo, Seoul & Singapore',
    description: 'Spectacular fan tour across Asia with roaring sellout crowds. Perfect balance of commercial appeal and tactical experimentation.',
    prizeMoney: 3_500_000,
    commercialBoost: 800_000,
    fitnessBonusDescription: '+£3.5M Commercial Funds • Tactical Synergy Boost • Rapid Fanbase Growth',
    badgeEmoji: '🇯🇵',
    opponents: [
      { clubId: 'paris_red_blue', name: 'Paris Red & Blue', tier: 'elite', country: 'France' },
      { clubId: 'dortmund_yellow', name: 'Dortmund Yellow', tier: 'upper', country: 'Germany' },
      { clubId: 'barcelona_blaugrana', name: 'Barcelona Blaugrana', tier: 'elite', country: 'Spain' },
    ],
  },
  {
    id: 'europe',
    title: 'Alpine Elite Conditioning Retreat',
    region: 'Austria & Switzerland',
    destinationCity: 'Salzburg & Zurich',
    description: 'Intense high-altitude training camp focused on tactical discipline, stamina conditioning, and reduced travel fatigue.',
    prizeMoney: 2_000_000,
    commercialBoost: 400_000,
    fitnessBonusDescription: '+£2.0M Funds • +15% Stamina & Injury Resilience in Early Season',
    badgeEmoji: '🇦🇹',
    opponents: [
      { clubId: 'ajax_amsterdam', name: 'Amsterdam Red & White', tier: 'upper', country: 'Netherlands' },
      { clubId: 'lisbon_eagles', name: 'Lisbon Eagles', tier: 'upper', country: 'Portugal' },
      { clubId: 'turin_stripes', name: 'Turin Stripes', tier: 'upper', country: 'Italy' },
    ],
  },
];

export function getPreseasonOption(id: PreseasonTourId): PreseasonTourOption {
  return PRESEASON_TOUR_OPTIONS.find((t) => t.id === id) || PRESEASON_TOUR_OPTIONS[0];
}

export function shouldShowPreseasonPrompt(save: CareerSaveFile): boolean {
  if (save.preseasonState?.hasChosenTour) return false;
  const yearStart = save.season?.yearStart || 2026;
  const cutoff = `${yearStart}-07-15`;
  return save.season.currentDate <= cutoff;
}

export function applyPreseasonTourChoice(
  save: CareerSaveFile,
  tourId: PreseasonTourId,
  delegateToAssistant: boolean
): CareerSaveFile {
  const tour = getPreseasonOption(tourId);
  const yearStart = save.season?.yearStart || 2026;
  const userClub = save.club;

  // 1. Generate 3 Friendly fixtures in July
  const venues = tour.id === 'usa'
    ? ['MetLife Stadium, New York', 'Rose Bowl, Los Angeles', 'Hard Rock Stadium, Miami']
    : tour.id === 'asia'
    ? ['Japan National Stadium, Tokyo', 'Seoul World Cup Stadium, Seoul', 'Singapore National Stadium']
    : ['Red Bull Arena, Salzburg', 'Letzigrund Stadium, Zurich', 'Tivoli Stadion, Innsbruck'];

  const matchDates = [
    `${yearStart}-07-16`,
    `${yearStart}-07-21`,
    `${yearStart}-07-26`,
  ];

  const fixtures: CupFixture[] = tour.opponents.map((opp, idx) => ({
    id: `fix_preseason_${tour.id}_${idx + 1}`,
    competitionId: CUP_IDS.PRESEASON,
    competitionName: tour.title,
    round: idx + 1,
    roundName: `Match ${idx + 1} of 3`,
    date: matchDates[idx],
    homeClubId: userClub.id,
    awayClubId: opp.clubId,
    played: false,
    isKnockout: false,
    isFriendly: true,
    venue: `${venues[idx]} (Neutral)`,
  }));

  const tournament: CupTournament = {
    id: CUP_IDS.PRESEASON,
    name: tour.title,
    currentRound: 'Match 1 of 3',
    fixtures,
    isCompleted: false,
    isFriendly: true,
    prizeMoney: tour.prizeMoney,
    drawCompleted: true,
  };

  // 2. Financial injection (commercial earnings credited to club balance and transfer funds)
  const currentBudget = save.finances.transferBudget || 0;
  const currentBalance = save.finances.balance || 0;
  const updatedFinances = {
    ...save.finances,
    transferBudget: currentBudget + tour.prizeMoney,
    balance: currentBalance + tour.prizeMoney + tour.commercialBoost,
  };

  // 3. Calendar events
  const newCalendarEvents: CalendarEvent[] = fixtures.map((f, i) => ({
    id: `evt_preseason_m${i + 1}`,
    date: f.date,
    type: 'friendly' as const,
    title: `Pre-Season: ${userClub.shortName} vs ${tour.opponents[i].name}`,
    fixtureId: f.id,
    processed: false,
  }));

  const existingCalendar = (save.calendar || []).filter(
    (e) => !e.id.startsWith('evt_preseason_') && !e.id.startsWith('evt_friendly_')
  );
  const updatedCalendar = [...existingCalendar, ...newCalendarEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // 4. Board confirmation inbox message
  const confirmationMsg: ManagerMessage = {
    id: `msg_preseason_confirm_${Date.now()}`,
    date: save.season.currentDate,
    sender: 'Board of Directors & Commercial Office',
    senderRole: 'Chief Executive & Commercial Director',
    subject: `Official Confirmation: ${tour.title} Itinerary & Commercial Revenue`,
    body: `We are delighted to confirm our participation in the ${tour.title} (${tour.region})!\n\n` +
      `Our commercial partners have wired £${(tour.prizeMoney / 1_000_000).toFixed(1)}M directly into our club funds. ` +
      `The team will travel to ${tour.destinationCity} to play three competitive pre-season friendlies against ` +
      `${tour.opponents.map((o) => o.name).join(', ')}.\n\n` +
      (delegateToAssistant
        ? `As requested, your Assistant Manager has been instructed to handle squad rotations and friendly match preparations for the tour.`
        : `You will be in direct personal charge of the tour matches and tactical preparations.`) +
      `\n\nBest of luck with pre-season preparations!`,
    type: 'board',
    isRead: false,
    priority: 'urgent',
    classification: 'info',
  };

  return {
    ...save,
    cups: {
      ...(save.cups || {}),
      [CUP_IDS.PRESEASON]: tournament,
    },
    calendar: updatedCalendar,
    finances: updatedFinances,
    inbox: [confirmationMsg, ...(save.inbox || [])],
    preseasonState: {
      hasChosenTour: true,
      selectedTourId: tourId,
      delegatedToAssistant: delegateToAssistant,
      completed: false,
      tournamentName: tour.title,
    },
  };
}

/**
 * Simulates a pre-season match when delegated to Assistant Manager.
 */
export function simulateAssistantPreseasonMatch(
  save: CareerSaveFile,
  fixtureId: string
): CareerSaveFile {
  const cups = save.cups || {};
  const tourney = cups[CUP_IDS.PRESEASON];
  if (!tourney) return save;

  const fixIdx = tourney.fixtures.findIndex((f) => f.id === fixtureId);
  if (fixIdx === -1) return save;

  const fix = tourney.fixtures[fixIdx];
  if (fix.played) return save;

  const oppClub = findAnyClub(fix.awayClubId) || {
    id: fix.awayClubId,
    defaultName: 'Opponent Club',
    shortName: fix.awayClubId.slice(0, 3).toUpperCase(),
    reputation: 80,
    stadiumCapacity: 50000,
    primaryColor: '#3b82f6',
    secondaryColor: '#ffffff',
    wageBudgetWeekly: 100000,
    startingBudget: 50000000,
    tier: 'upper' as const,
    stadiumName: 'National Stadium',
  };

  // Simulate fixture
  const simmed = simulateKnockoutCupFixture(
    fix,
    save.club,
    oppClub,
    save.squad,
    undefined
  );

  const updatedFixtures = [...tourney.fixtures];
  updatedFixtures[fixIdx] = simmed;

  const allPlayed = updatedFixtures.every((f) => f.played);
  const nextUnplayed = updatedFixtures.find((f) => !f.played);

  const updatedTourney: CupTournament = {
    ...tourney,
    fixtures: updatedFixtures,
    isCompleted: allPlayed,
    currentRound: nextUnplayed ? nextUnplayed.roundName : 'Completed',
  };

  const oppName = getEffectiveClubName(oppClub);
  const reportMsg: ManagerMessage = {
    id: `msg_asst_report_${Date.now()}`,
    date: fix.date,
    sender: 'Assistant Manager',
    senderRole: 'First Team Coach',
    subject: `Assistant Match Report: Pre-Season vs ${oppName}`,
    body: `We have completed our pre-season fixture against ${oppName}.\n\n` +
      `Final Score: ${simmed.homeScore} - ${simmed.awayScore}\n` +
      `I rotated the squad to maximize player match sharpness while managing fatigue. ` +
      `All squad members gained valuable match minutes ahead of the season opener.`,
    type: 'match_report',
    isRead: false,
    priority: 'normal',
    classification: 'info',
  };

  return {
    ...save,
    cups: {
      ...cups,
      [CUP_IDS.PRESEASON]: updatedTourney,
    },
    inbox: [reportMsg, ...(save.inbox || [])],
    preseasonState: {
      ...(save.preseasonState || { hasChosenTour: true }),
      completed: allPlayed,
    },
  };
}
