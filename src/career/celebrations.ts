import {
  CareerSaveFile,
  CupTournament,
  CupFixture,
  LeagueFixture,
  CareerPlayer,
  ManagerMessage,
} from './types';
import { calculateStandings } from './table';
import { getAllClubs } from './clubs';
import { getCupWinner, isFriendlyTournament, isFriendlyFixture } from './cups';
import { formatCareerCurrency } from './formatters';

export type CelebrationCategory = 'title_win' | 'cup_win' | 'knockout_advancement' | 'continental_qualification';

export interface CelebrationEvent {
  id: string; // unique milestone key e.g. "2026_cup_trophy_cup_league_cup"
  category: CelebrationCategory;
  title: string;
  badge: string; // 🏆, 🥇, 🦁, ⭐, 🎯
  competitionName: string;
  stageName?: string;
  headline: string;
  subheadline: string;
  boardReaction: {
    sender: string;
    role: string;
    statement: string;
  };
  playerReaction: {
    player: {
      id: string;
      name: string;
      rating: number;
      position: string;
      isCaptain?: boolean;
    };
    quote: string;
  };
  rewards?: {
    prizeMoney?: number;
    confidenceBoost?: number;
    trophyName?: string;
  };
}

/**
 * Finds the squad captain or the highest-rated star player to deliver a celebration quote.
 */
function getStarPlayerForReaction(squad: CareerPlayer[]): {
  id: string;
  name: string;
  rating: number;
  position: string;
  isCaptain?: boolean;
} {
  if (!squad || squad.length === 0) {
    return {
      id: 'captain_placeholder',
      name: 'Team Captain',
      rating: 85,
      position: 'MID',
      isCaptain: true,
    };
  }

  const sorted = [...squad].sort((a, b) => b.rating - a.rating);
  const leader = sorted[0];
  return {
    id: leader.id,
    name: leader.name,
    rating: leader.rating,
    position: leader.position,
    isCaptain: true,
  };
}

/**
 * Inspects a saved state and checks if any major milestone was just achieved that has not yet
 * been celebrated:
 * 1. Winning a Cup Final (Carabao Cup, FA Cup, Champions League, Shield, etc.)
 * 2. Advancing past a knockout cup round (Quarter-Final -> Semi-Final, etc.)
 * 3. Clinching the League Title (Premier League Champions)
 */
export function detectCelebrationEvent(
  save: CareerSaveFile,
  recentFixture?: CupFixture | LeagueFixture
): { event: CelebrationEvent; updatedSave: CareerSaveFile } | null {
  // If the fixture just completed was a friendly / exhibition / pre-season fixture,
  // do not trigger any celebration modal.
  if (recentFixture && isFriendlyFixture(recentFixture)) {
    return null;
  }

  const celebrated = new Set(save.celebratedMilestones || []);
  const yearStart = save.season?.yearStart || 2026;
  const userClubId = save.club.id;
  const userClubName = save.club.customName || save.club.defaultName;
  const starPlayer = getStarPlayerForReaction(save.squad || []);

  // 1. Check Cup Finals / Trophies Won
  if (save.cups) {
    for (const [tId, tourney] of Object.entries(save.cups)) {
      if (isFriendlyTournament(tId, tourney)) {
        continue;
      }
      if (tourney.isCompleted && tourney.winnerClubId === userClubId) {
        const milestoneKey = `${yearStart}_cup_trophy_${tId}`;
        if (!celebrated.has(milestoneKey)) {
          const event: CelebrationEvent = {
            id: milestoneKey,
            category: 'cup_win',
            title: `${tourney.name.toUpperCase()} CHAMPIONS!`,
            badge: '🏆',
            competitionName: tourney.name,
            stageName: 'Final',
            headline: `Champions of the ${tourney.name}!`,
            subheadline: `Silverware brought back to the trophy cabinet!`,
            boardReaction: {
              sender: 'Board of Directors',
              role: 'Executive Committee',
              statement: `A magnificent, historic victory! On behalf of the entire board, our shareholders, and our millions of supporters worldwide, congratulations on guiding ${userClubName} to triumph in the ${tourney.name}. This glorious moment affirms your stature at the club.`,
            },
            playerReaction: {
              player: starPlayer,
              quote: `Lifting the ${tourney.name} trophy is what every footballer dreams about as a kid! The gaffer gave us the belief, the tactics were spot-on, and every lad in that dressing room gave 100%. We're bringing the silverware home for the fans!`,
            },
            rewards: {
              prizeMoney: tourney.prizeMoney,
              confidenceBoost: 15,
              trophyName: tourney.name,
            },
          };

          // Record commemorative message in inbox
          const inboxMsg: ManagerMessage = {
            id: `msg_celebration_${milestoneKey}_${Date.now()}`,
            date: save.season.currentDate,
            sender: 'Board Chairman',
            senderRole: 'Club Executive Committee',
            subject: `🏆 CONGRATULATIONS: ${tourney.name} Winners!`,
            body: `Dear Manager,\n\nThe Board is ecstatic following our triumph in the ${tourney.name} final. Winning major silverware is the ultimate testament to the team's relentless ambition and tactical masterclass.\n\nA celebratory prize bonus of ${formatCareerCurrency(tourney.prizeMoney)} has been credited to our accounts, and your standing with the board is at an all-time high.\n\nEnjoy this unforgettable milestone!\n\nYours faithfully,\nThe Board of Directors`,
            type: 'board',
            isRead: false,
            classification: 'important',
            actionLabel: 'View Silverware Desk',
            actionTab: 'cups',
            actionType: 'open_cups',
          };

          const newBoardConfidence = Math.min(100, (save.boardStatus?.confidence || 85) + 15);
          const updatedSave: CareerSaveFile = {
            ...save,
            celebratedMilestones: [...celebrated, milestoneKey],
            boardStatus: save.boardStatus
              ? {
                  ...save.boardStatus,
                  confidence: newBoardConfidence,
                  status: 'secure',
                  formContext: 'Delighted (Silverware Champions)',
                }
              : undefined,
            inbox: [inboxMsg, ...(save.inbox || [])],
          };

          return { event, updatedSave };
        }
      }
    }
  }

  // 2. Check Cup Knockout Stage Advancement (User won a match in a cup tie before the final)
  if (save.cups) {
    for (const [tId, tourney] of Object.entries(save.cups)) {
      if (isFriendlyTournament(tId, tourney)) {
        continue;
      }
      // Find all fixtures involving user club that have been played and won
      const userPlayedFixtures = tourney.fixtures.filter(
        (f) =>
          f.played &&
          (f.homeClubId === userClubId || f.awayClubId === userClubId) &&
          getCupWinner(f) === userClubId
      );

      for (const fix of userPlayedFixtures) {
        if (fix.roundName === 'Final') {
          // Finals handled by trophy logic above
          continue;
        }

        const milestoneKey = `${yearStart}_cup_adv_${tId}_${fix.roundName}`;
        if (!celebrated.has(milestoneKey)) {
          // Determine next round name
          let nextRound = 'Next Round';
          if (fix.roundName.toLowerCase().includes('semi')) {
            nextRound = 'The Final at Wembley';
          } else if (fix.roundName.toLowerCase().includes('quarter')) {
            nextRound = 'Semi-Finals';
          } else if (fix.roundName.toLowerCase().includes('5th') || fix.roundName.toLowerCase().includes('16')) {
            nextRound = 'Quarter-Finals';
          } else if (fix.roundName.toLowerCase().includes('4th')) {
            nextRound = 'Round of 16';
          } else if (fix.roundName.toLowerCase().includes('3rd')) {
            nextRound = '4th Round';
          }

          const event: CelebrationEvent = {
            id: milestoneKey,
            category: 'knockout_advancement',
            title: `THROUGH TO THE ${nextRound.toUpperCase()}!`,
            badge: '🎯',
            competitionName: tourney.name,
            stageName: fix.roundName,
            headline: `Victory in the ${fix.roundName}!`,
            subheadline: `${userClubName} advance into ${nextRound}!`,
            boardReaction: {
              sender: 'Sporting Director',
              role: 'Football Operations',
              statement: `Fantastic resilience and match management today. Advancing into ${nextRound} of the ${tourney.name} keeps our silverware aspirations burning brightly and brings vital momentum to our campaign.`,
            },
            playerReaction: {
              player: starPlayer,
              quote: `Cup football is all about nerves of steel and stepping up when it matters most. We stayed disciplined, executed the game plan, and now we're buzzing for ${nextRound}!`,
            },
            rewards: {
              confidenceBoost: 3,
            },
          };

          const inboxMsg: ManagerMessage = {
            id: `msg_adv_${milestoneKey}_${Date.now()}`,
            date: save.season.currentDate,
            sender: 'Sporting Director',
            senderRole: 'Football Operations',
            subject: `🎯 Cup Progression: Through to ${nextRound}!`,
            body: `Boss,\n\nSuperb result in the ${fix.roundName} of the ${tourney.name}. The dressing room atmosphere is electric, and the board is very pleased with our progress into ${nextRound}.\n\nKeep this momentum going!\n\nSporting Director`,
            type: 'match_report',
            isRead: false,
            classification: 'info',
            actionLabel: 'View Cup Bracket',
            actionTab: 'cups',
            actionType: 'open_cups',
          };

          const newBoardConfidence = Math.min(100, (save.boardStatus?.confidence || 85) + 3);
          const updatedSave: CareerSaveFile = {
            ...save,
            celebratedMilestones: [...celebrated, milestoneKey],
            boardStatus: save.boardStatus
              ? {
                  ...save.boardStatus,
                  confidence: newBoardConfidence,
                }
              : undefined,
            inbox: [inboxMsg, ...(save.inbox || [])],
          };

          return { event, updatedSave };
        }
      }
    }
  }

  // 3. Check League Title (Premier League Champions)
  if (save.fixtures && save.fixtures.length > 0) {
    const standings = calculateStandings(save.fixtures, getAllClubs());
    const userStanding = standings.find((s) => s.clubId === userClubId);
    const secondStanding = standings.find((s) => s.clubId !== userClubId);

    if (userStanding && secondStanding && userStanding.played >= 25) {
      const remainingMatchesSecond = 38 - secondStanding.played;
      const maxPossiblePointsSecond = secondStanding.points + remainingMatchesSecond * 3;
      const isMathematicallyChampion = userStanding.points > maxPossiblePointsSecond;
      const isSeasonEndChampion = userStanding.played === 38 && standings[0].clubId === userClubId;

      if (isMathematicallyChampion || isSeasonEndChampion) {
        const milestoneKey = `${yearStart}_league_champions`;
        if (!celebrated.has(milestoneKey)) {
          const event: CelebrationEvent = {
            id: milestoneKey,
            category: 'title_win',
            title: 'CHAMPIONS OF ENGLAND! 🏆',
            badge: '👑',
            competitionName: 'English Top Flight',
            stageName: 'League Champions',
            headline: `Premier League Champions ${yearStart}/${yearStart + 1}!`,
            subheadline: `The ultimate crown: ${userClubName} are champions of England!`,
            boardReaction: {
              sender: 'Board of Directors',
              role: 'Executive Committee',
              statement: `AN UNFORGETTABLE, CROWNING ACHIEVEMENT! You have etched your name into the immortal history of ${userClubName}. To conquer the most competitive league in world football is an extraordinary feat. You have our deepest gratitude and eternal respect!`,
            },
            playerReaction: {
              player: starPlayer,
              quote: `We gave our heart and soul across this grueling season for this exact moment! To stand here as Premier League Champions with this group of brothers is the greatest feeling in world football. Thank you gaffer!`,
            },
            rewards: {
              prizeMoney: 38_000_000,
              confidenceBoost: 100,
              trophyName: 'Premier League Trophy',
            },
          };

          const inboxMsg: ManagerMessage = {
            id: `msg_title_${milestoneKey}_${Date.now()}`,
            date: save.season.currentDate,
            sender: 'Club Owner & Board',
            senderRole: 'Executive Committee',
            subject: '👑 CHAMPIONS OF ENGLAND: Legendary Triumph!',
            body: `Dear Manager,\n\nWords cannot capture the pure ecstasy across the entire club today. You have guided ${userClubName} to the Premier League Title!\n\nA record championship merit payout of ${formatCareerCurrency(38_000_000)} has been awarded to the club finances. Your managerial legacy is forever cemented in club folklore.\n\nEnjoy every moment of this well-earned glory!\n\nYours faithfully,\nThe Board of Directors`,
            type: 'board',
            isRead: false,
            classification: 'important',
            actionLabel: 'View League Table',
            actionTab: 'table',
          };

          const updatedTrophies = [...(save.trophies || [])];
          const trophyYear = yearStart + 1;
          if (!updatedTrophies.some((t) => t.competitionId === 'league_top_flight' && t.year === trophyYear)) {
            updatedTrophies.push({
              competitionId: 'league_top_flight',
              competitionName: 'English Top Flight',
              year: trophyYear,
            });
          }

          const updatedFinances = {
            ...save.finances,
            transferBudget: save.finances.transferBudget + 38_000_000,
            balance: save.finances.balance + 38_000_000,
          };

          const updatedSave: CareerSaveFile = {
            ...save,
            celebratedMilestones: [...celebrated, milestoneKey],
            trophies: updatedTrophies,
            finances: updatedFinances,
            boardStatus: save.boardStatus
              ? {
                  ...save.boardStatus,
                  confidence: 100,
                  status: 'secure',
                  formContext: 'Untouchable (League Champions)',
                }
              : undefined,
            inbox: [inboxMsg, ...(save.inbox || [])],
          };

          return { event, updatedSave };
        }
      }
    }
  }

  return null;
}
