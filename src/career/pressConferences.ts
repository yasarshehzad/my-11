import {
  BoardStatus,
  CareerSaveFile,
  CupFixture,
  LeagueFixture,
  MediaHeadlineEntry,
  PressConferenceEvent,
  PressContext,
  PressMediaState,
  PressResponseOption,
} from './types';
import { getCleanClubName } from './clubs';
import { addInboxMessage } from './inbox';

const JOURNALISTS: Array<{ name: string; outlet: string }> = [
  { name: 'Sarah Jenkins', outlet: 'Sky Sports' },
  { name: 'Marcus Vance', outlet: 'The Athletic' },
  { name: 'Elena Rostova', outlet: 'BBC Sport' },
  { name: "Liam O'Connor", outlet: 'Daily Telegraph' },
  { name: 'Tariq Mahmood', outlet: 'Guardian Football' },
];

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function resolveBoardTierStatus(
  confidence: number,
  currentStatus?: BoardStatus['status']
): BoardStatus['status'] {
  if (currentStatus === 'sacked') return 'sacked';
  if (confidence >= 75) return 'secure';
  if (confidence >= 55) return 'stable';
  if (confidence >= 38) return 'under_pressure';
  return 'critical';
}

export function getInitialPressState(): PressMediaState {
  return {
    mediaRelationshipScore: 62,
    mediaHistory: [],
  };
}

function findNextUpcomingOpponent(
  save: CareerSaveFile,
  afterDate: string
): { clubId: string; clubName: string; fixtureId?: string } {
  const upcoming = (save.fixtures || [])
    .filter(
      (f) =>
        !f.played &&
        f.date >= afterDate &&
        (f.homeClubId === save.club.id || f.awayClubId === save.club.id)
    )
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  if (!upcoming) {
    return {
      clubId: '',
      clubName: 'our upcoming title rivals',
    };
  }

  const opponentClubId =
    upcoming.homeClubId === save.club.id ? upcoming.awayClubId : upcoming.homeClubId;
  return {
    clubId: opponentClubId,
    clubName: getCleanClubName(opponentClubId),
    fixtureId: upcoming.id,
  };
}

function buildPostMatchOptions(
  clubName: string,
  opponentName: string,
  outcome: 'W' | 'D' | 'L',
  scoreline: string,
  nextOpponent: { clubId: string; clubName: string }
): PressResponseOption[] {
  const targetName = nextOpponent.clubName || opponentName;
  const targetId = nextOpponent.clubId || undefined;

  if (outcome === 'W') {
    return [
      {
        id: 'opt_confident',
        tone: 'confident',
        label: 'Assertive Ambition',
        quote: `"A ${scoreline} victory over ${opponentName} proves ${clubName} belongs at the very top. Nobody wants to face our tempo right now."`,
        moraleDelta: 4,
        boardConfidenceDelta: 2,
        mediaRelationDelta: 3,
        headlinePreview: `BACK PAGE: "${clubName} boss lays down fierce marker after ${scoreline} triumph!"`,
      },
      {
        id: 'opt_humble',
        tone: 'humble',
        label: 'Credit the Dressing Room',
        quote: `"Credit goes strictly to the players for executing our gameplan against ${opponentName}. We stay grounded and go again tomorrow."`,
        moraleDelta: 3,
        boardConfidenceDelta: 3,
        mediaRelationDelta: 4,
        headlinePreview: `MEDIA WATCH: "Cool-headed ${clubName} manager wins praise for humble unity after ${scoreline} win"`,
      },
      {
        id: 'opt_deflect_pressure',
        tone: 'deflect_pressure',
        label: 'Protect Young Squad',
        quote: `"Forget the league table talk for now — it is only three points. Our focus is recovery and protecting the lads from hype."`,
        moraleDelta: 2,
        boardConfidenceDelta: 1,
        mediaRelationDelta: -2,
        headlinePreview: `PRESS ROOM: "${clubName} gaffer shuts down title questions despite crisp ${scoreline} win"`,
      },
      {
        id: 'opt_mind_games',
        tone: 'mind_games',
        label: `Rattle ${targetName}`,
        quote: `"After dismantling ${opponentName}, I suspect ${targetName} are already feeling the heat ahead of meeting us next."`,
        moraleDelta: 3,
        boardConfidenceDelta: 1,
        mediaRelationDelta: 2,
        mindGamesEffect: {
          attackBonus: 3,
          opponentMoralePenalty: 4,
          opponentClubId: targetId,
        },
        headlinePreview: ` MIND GAMES: "${clubName} boss turns psychological screw on ${targetName}!"`,
      },
    ];
  }

  if (outcome === 'D') {
    return [
      {
        id: 'opt_confident',
        tone: 'confident',
        label: 'Back Our Quality',
        quote: `"A ${scoreline} stalemate against ${opponentName} shows our resilience. On another afternoon we put three past them."`,
        moraleDelta: 2,
        boardConfidenceDelta: 1,
        mediaRelationDelta: 1,
        headlinePreview: `BACK PAGE: "Unfazed ${clubName} chief insists wins are coming after ${opponentName} draw"`,
      },
      {
        id: 'opt_humble',
        tone: 'humble',
        label: 'Measured Assessment',
        quote: `"It was a tight ${scoreline} contest and both sides cancelled each other out. We take the point and fix our final third."`,
        moraleDelta: 1,
        boardConfidenceDelta: 2,
        mediaRelationDelta: 3,
        headlinePreview: `MATCH REPORT: "Honest verdict from ${clubName} touchline following ${scoreline} draw"`,
      },
      {
        id: 'opt_deflect_pressure',
        tone: 'deflect_pressure',
        label: 'Blast Schedule & Officials',
        quote: `"With this fixture congestion and two huge penalty calls waved away, taking anything from ${opponentName} is heroic."`,
        moraleDelta: 3,
        boardConfidenceDelta: -2,
        mediaRelationDelta: -4,
        headlinePreview: `TOUCHLINE ROW: "${clubName} manager fumes over officiating after ${opponentName} stalemate"`,
      },
      {
        id: 'opt_mind_games',
        tone: 'mind_games',
        label: `Target ${targetName}`,
        quote: `"Teams park the bus against us now out of fear. Let's see if ${targetName} are brave enough to open up next match."`,
        moraleDelta: 2,
        boardConfidenceDelta: 0,
        mediaRelationDelta: 2,
        mindGamesEffect: {
          attackBonus: 3,
          opponentMoralePenalty: 3,
          opponentClubId: targetId,
        },
        headlinePreview: `WAR OF WORDS: "${clubName} throws gauntlet down to cautious ${targetName}"`,
      },
    ];
  }

  // Loss ('L')
  return [
    {
      id: 'opt_confident',
      tone: 'confident',
      label: 'Defiant Rally Cry',
      quote: `"Defeat hurts, especially ${scoreline} to ${opponentName}, but this dressing room has steel. Watch how fiercely we respond."`,
      moraleDelta: 3,
      boardConfidenceDelta: 0,
      mediaRelationDelta: 1,
      headlinePreview: `DEFANT STAND: "${clubName} manager demands instant reaction after ${opponentName} setback"`,
    },
    {
      id: 'opt_humble',
      tone: 'humble',
      label: 'Own Tactical Errors',
      quote: `"I pick the XI and set the shape — today ${opponentName} outworked us at ${scoreline}. I take full responsibility."`,
      moraleDelta: 0,
      boardConfidenceDelta: 3,
      mediaRelationDelta: 4,
      headlinePreview: `ACCOUNTABILITY: "Candid ${clubName} boss shoulders blame after ${scoreline} loss"`,
    },
    {
      id: 'opt_deflect_pressure',
      tone: 'deflect_pressure',
      label: 'Siege Mentality',
      quote: `"The narrative outside this building is waiting for us to stumble. My players gave everything and won't be broken by noise."`,
      moraleDelta: 4,
      boardConfidenceDelta: -3,
      mediaRelationDelta: -4,
      headlinePreview: `SIEGE MENTALITY: "${clubName} boss hits back at critics in tense briefing"`,
    },
    {
      id: 'opt_mind_games',
      tone: 'mind_games',
      label: `Warning to ${targetName}`,
      quote: `"Enjoy tonight's headlines — ${targetName} are catching a wounded animal next match and we have a score to settle."`,
      moraleDelta: 2,
      boardConfidenceDelta: -1,
      mediaRelationDelta: 2,
      mindGamesEffect: {
        attackBonus: 4,
        opponentMoralePenalty: 4,
        opponentClubId: targetId,
      },
      headlinePreview: `FIERY WARNING: "${clubName} boss promises backlash for ${targetName} after loss"`,
    },
  ];
}

/**
 * Generates an interactive post-match press conference and delivers a media inbox alert.
 */
export function generatePostMatchPressConference(
  save: CareerSaveFile,
  fixture: LeagueFixture | CupFixture
): CareerSaveFile {
  const isUserHome = fixture.homeClubId === save.club.id;
  const isUserAway = fixture.awayClubId === save.club.id;
  if (!isUserHome && !isUserAway) return save;

  const userScore = (isUserHome ? fixture.homeScore : fixture.awayScore) ?? 0;
  const oppScore = (isUserHome ? fixture.awayScore : fixture.homeScore) ?? 0;
  const opponentClubId = isUserHome ? fixture.awayClubId : fixture.homeClubId;
  const opponentClubName = getCleanClubName(opponentClubId);
  const clubName = save.club.customName || save.club.defaultName;

  const matchOutcome: 'W' | 'D' | 'L' =
    userScore > oppScore ? 'W' : userScore < oppScore ? 'L' : 'D';
  const scoreline = `${userScore}-${oppScore}`;

  const journalist =
    JOURNALISTS[(fixture.round + scoreline.length) % JOURNALISTS.length];
  const nextOpp = findNextUpcomingOpponent(save, fixture.date);

  let question = '';
  let context: PressContext = 'post_match';

  if (matchOutcome === 'W') {
    question = `A commanding ${scoreline} victory over ${opponentClubName} today. Does this performance signal a statement to the rest of the division?`;
  } else if (matchOutcome === 'D') {
    question = `It finished ${scoreline} against ${opponentClubName}. Are you satisfied with sharing the spoils or did your side leave two points behind?`;
  } else {
    context = (save.boardStatus?.confidence ?? 72) < 48 ? 'crisis' : 'post_match';
    question = `A tough ${scoreline} defeat against ${opponentClubName}. Supporters are questioning the tactical intensity — how do you steady the ship?`;
  }

  const prevPress = save.pressState || getInitialPressState();

  // Clear active buff if it was already used on this fixture
  const clearedBuff =
    prevPress.mindGamesBuffNextMatch &&
    (prevPress.mindGamesBuffNextMatch.opponentClubId === opponentClubId ||
      prevPress.mindGamesBuffNextMatch.expiresAfterFixtureId === fixture.id)
      ? undefined
      : prevPress.mindGamesBuffNextMatch;

  const event: PressConferenceEvent = {
    id: `press_post_${fixture.id}_${Date.now()}`,
    date: fixture.date || save.season.currentDate,
    context,
    journalistName: journalist.name,
    outlet: journalist.outlet,
    question,
    fixtureId: fixture.id,
    opponentClubId,
    opponentClubName,
    matchOutcome,
    scoreline,
    options: buildPostMatchOptions(clubName, opponentClubName, matchOutcome, scoreline, nextOpp),
    answered: false,
  };

  let updatedSave: CareerSaveFile = {
    ...save,
    pressState: {
      ...prevPress,
      activeConference: event,
      mindGamesBuffNextMatch: clearedBuff,
    },
  };

  updatedSave = addInboxMessage(updatedSave, {
    date: event.date,
    sender: `${journalist.name} (${journalist.outlet})`,
    senderRole: 'Press Corps Desk',
    subject: `Press Briefing: ${clubName} ${scoreline} ${opponentClubName}`,
    body: `The written and broadcast media are waiting in the auditorium following the ${scoreline} result against ${opponentClubName}.\n\n"${question}"\n\nEnter the Press Room to shape squad morale, board confidence, and psychological pressure before your next match.`,
    type: 'media',
    isRead: false,
    priority: matchOutcome === 'L' ? 'urgent' : 'normal',
    actionLabel: 'Enter Press Room',
    actionTab: 'transfers',
    actionType: 'open_press_conference',
    targetId: event.id,
  });

  return updatedSave;
}

/**
 * Generates an on-demand pre-match mind-games press conference ahead of the next fixture.
 */
export function generatePreMatchMindGamesPressConference(
  save: CareerSaveFile,
  upcomingFixture?: LeagueFixture | CupFixture
): CareerSaveFile {
  const clubName = save.club.customName || save.club.defaultName;
  const nextFixture =
    upcomingFixture ||
    (save.fixtures || [])
      .filter(
        (f) =>
          !f.played &&
          (f.homeClubId === save.club.id || f.awayClubId === save.club.id)
      )
      .sort((a, b) => a.date.localeCompare(b.date))[0];

  const opponentClubId = nextFixture
    ? nextFixture.homeClubId === save.club.id
      ? nextFixture.awayClubId
      : nextFixture.homeClubId
    : '';
  const opponentClubName = opponentClubId ? getCleanClubName(opponentClubId) : 'our next opponents';

  const journalist = JOURNALISTS[(save.squad.length + (nextFixture?.round || 1)) % JOURNALISTS.length];
  const prevPress = save.pressState || getInitialPressState();

  const question = `Ahead of your upcoming clash with ${opponentClubName}, critics say their tactical setup could stifle your midfield. What is your message to their dugout?`;

  const options: PressResponseOption[] = [
    {
      id: 'opt_mind_games',
      tone: 'mind_games',
      label: `Psychological Ambush (+Attack Buff)`,
      quote: `"${opponentClubName} rely on predictability. If they try to press us high on matchday, we will expose every gap behind them."`,
      moraleDelta: 3,
      boardConfidenceDelta: 1,
      mediaRelationDelta: 2,
      mindGamesEffect: {
        attackBonus: 4,
        opponentMoralePenalty: 5,
        opponentClubId: opponentClubId || 'next_opponent',
      },
      headlinePreview: `PRE-MATCH MIND GAMES: "${clubName} boss targets ${opponentClubName}'s soft underbelly!"`,
    },
    {
      id: 'opt_confident',
      tone: 'confident',
      label: 'Demand Sharpness',
      quote: `"Preparation has been electric all week. When our front line hits top gear, ${opponentClubName} cannot live with us."`,
      moraleDelta: 4,
      boardConfidenceDelta: 2,
      mediaRelationDelta: 2,
      headlinePreview: `FIGHTING TALK: "${clubName} camp brimming with belief before ${opponentClubName} test"`,
    },
    {
      id: 'opt_humble',
      tone: 'humble',
      label: 'Show Tactical Respect',
      quote: `"We hold total respect for ${opponentClubName}'s manager and quality. We will need 95 minutes of disciplined focus."`,
      moraleDelta: 2,
      boardConfidenceDelta: 2,
      mediaRelationDelta: 4,
      headlinePreview: `TOUCHLINE CLASS: "${clubName} manager praises ${opponentClubName} setup before showdown"`,
    },
    {
      id: 'opt_deflect_pressure',
      tone: 'deflect_pressure',
      label: 'Play the Underdog Card',
      quote: `"Nobody expects an easy ride away from the spotlight. Pressure is squarely on ${opponentClubName}, not my dressing room."`,
      moraleDelta: 3,
      boardConfidenceDelta: -1,
      mediaRelationDelta: -2,
      headlinePreview: `UNDERDOG ANGLE: "${clubName} deflects expectation squarely onto ${opponentClubName}"`,
    },
  ];

  const event: PressConferenceEvent = {
    id: `press_pre_${nextFixture?.id || 'next'}_${Date.now()}`,
    date: save.season.currentDate,
    context: 'pre_match_mind_games',
    journalistName: journalist.name,
    outlet: journalist.outlet,
    question,
    fixtureId: nextFixture?.id,
    opponentClubId: opponentClubId || undefined,
    opponentClubName,
    options,
    answered: false,
  };

  return {
    ...save,
    pressState: {
      ...prevPress,
      activeConference: event,
    },
  };
}

/**
 * Answers the active press conference question and applies all morale, board, media, and mind-games impacts.
 */
export function answerPressConference(
  save: CareerSaveFile,
  optionId: string
): {
  success: boolean;
  updatedSave: CareerSaveFile;
  headline?: MediaHeadlineEntry;
  error?: string;
} {
  const press = save.pressState || getInitialPressState();
  const active = press.activeConference;

  if (!active || active.answered) {
    return {
      success: false,
      updatedSave: save,
      error: 'There is no unanswered press conference waiting in the Press Room.',
    };
  }

  const chosen = active.options.find((o) => o.id === optionId);
  if (!chosen) {
    return {
      success: false,
      updatedSave: save,
      error: 'Selected press response option was not found.',
    };
  }

  const updatedSquad = save.squad.map((player) => ({
    ...player,
    morale: clamp((player.morale ?? 70) + chosen.moraleDelta, 30, 100),
  }));

  const prevBoard = save.boardStatus;
  const newConfidence = clamp(
    (prevBoard?.confidence ?? 70) + chosen.boardConfidenceDelta,
    0,
    100
  );
  const updatedBoard: BoardStatus = {
    expectation: prevBoard?.expectation ?? 'Top Half Finish',
    warningsCount: prevBoard?.warningsCount ?? 0,
    ...prevBoard,
    confidence: newConfidence,
    status: resolveBoardTierStatus(newConfidence, prevBoard?.status),
  };

  const newMediaScore = clamp(
    (press.mediaRelationshipScore ?? 62) + chosen.mediaRelationDelta,
    0,
    100
  );

  const impactParts: string[] = [];
  if (chosen.moraleDelta !== 0) {
    impactParts.push(`${chosen.moraleDelta > 0 ? '+' : ''}${chosen.moraleDelta} Squad Morale`);
  }
  if (chosen.boardConfidenceDelta !== 0) {
    impactParts.push(
      `${chosen.boardConfidenceDelta > 0 ? '+' : ''}${chosen.boardConfidenceDelta}% Board Trust`
    );
  }
  if (chosen.mediaRelationDelta !== 0) {
    impactParts.push(
      `${chosen.mediaRelationDelta > 0 ? '+' : ''}${chosen.mediaRelationDelta} Media Standing`
    );
  }
  if (chosen.mindGamesEffect) {
    impactParts.push(`+${chosen.mindGamesEffect.attackBonus}% Attack Edge vs Next Rival`);
  }

  const headline: MediaHeadlineEntry = {
    id: `headline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: active.date || save.season.currentDate,
    outlet: active.outlet,
    headline: chosen.headlinePreview.replace(/^[^:]+:\s*"?|"?$/g, '').trim() || chosen.headlinePreview,
    quote: chosen.quote,
    tone: chosen.tone,
    impactSummary: impactParts.join(' • ') || 'Steady Media Briefing',
  };

  const nextOpp = findNextUpcomingOpponent(save, save.season.currentDate);
  const buffTargetId = chosen.mindGamesEffect?.opponentClubId || nextOpp.clubId || active.opponentClubId || '';
  const buffTargetName = buffTargetId ? getCleanClubName(buffTargetId) : nextOpp.clubName;

  const mindGamesBuff = chosen.mindGamesEffect
    ? {
        attackBonus: chosen.mindGamesEffect.attackBonus,
        opponentClubId: buffTargetId,
        opponentClubName: buffTargetName,
        expiresAfterFixtureId: nextOpp.fixtureId,
        description: `+${chosen.mindGamesEffect.attackBonus}% Matchday Edge vs ${buffTargetName}`,
      }
    : press.mindGamesBuffNextMatch;

  const updatedHistory = [headline, ...(press.mediaHistory || [])].slice(0, 25);

  const resolvedInbox = (save.inbox || []).map((msg) =>
    msg.actionType === 'open_press_conference' && !msg.resolved
      ? { ...msg, isRead: true, resolved: true }
      : msg
  );

  const updatedSave: CareerSaveFile = {
    ...save,
    squad: updatedSquad,
    boardStatus: updatedBoard,
    inbox: resolvedInbox,
    pressState: {
      mediaRelationshipScore: newMediaScore,
      activeConference: {
        ...active,
        answered: true,
        chosenOptionId: chosen.id,
      },
      mindGamesBuffNextMatch: mindGamesBuff,
      mediaHistory: updatedHistory,
    },
  };

  return {
    success: true,
    updatedSave,
    headline,
  };
}
