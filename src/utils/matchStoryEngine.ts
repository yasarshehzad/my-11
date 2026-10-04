import { 
  Player, 
  MatchSimResult, 
  MatchEvent, 
  GoalDetail, 
  MOTMInfo, 
  SeasonHighlight, 
  SeasonStory, 
  HighlightCategory 
} from '../types/game';

interface MatchStoryInput {
  opponent: string;
  opponentRating: number;
  ourScore: number;
  opponentScore: number;
  outcome: 'W' | 'D' | 'L';
  scorers: { player: Player; count: number }[];
  selectedPlayers: Player[];
  rand: () => number;
  isClutchWinner?: boolean;
}

/**
 * Assigns realistic goal timing and creates structured events, MOTM, headline, and summary.
 * Must NOT change ourScore, opponentScore, or outcome!
 */
export function generateMatchStory({
  opponent,
  opponentRating,
  ourScore,
  opponentScore,
  outcome,
  scorers,
  selectedPlayers,
  rand,
  isClutchWinner = false,
}: MatchStoryInput): {
  goalDetails: GoalDetail[];
  keyEvents: MatchEvent[];
  motm: MOTMInfo;
  headline: string;
  summary: string;
  formattedScorers: string[];
} {
  const goalDetails: GoalDetail[] = [];
  const keyEvents: MatchEvent[] = [];

  // 1. Assign goal minutes
  const totalGoals = ourScore + opponentScore;
  const minutesSet = new Set<number>();

  const getUniqueMinute = (isClutch: boolean): { minute: number; display: string } => {
    let min: number;
    let attempts = 0;
    do {
      attempts++;
      if (isClutch && attempts <= 3) {
        min = 88 + Math.floor(rand() * 4); // 88, 89, 90, 91
      } else {
        min = Math.floor(rand() * 88) + 3; // 3 to 90
      }
    } while (minutesSet.has(min) && attempts < 20);

    minutesSet.add(min);

    let display = `${min}'`;
    if (min >= 90) {
      const extra = Math.min(4, Math.floor(rand() * 3) + 1);
      display = `90+${extra}'`;
    }
    return { minute: min, display };
  };

  // Assign our goals
  const ourGoalList: { minute: number; display: string; scorerName: string; player: Player }[] = [];
  scorers.forEach(({ player, count }) => {
    const lastName = player.displayName.split(' ').pop() || player.displayName;
    for (let c = 0; c < count; c++) {
      const isClutchGoal = isClutchWinner && ourGoalList.length === ourScore - 1;
      const { minute, display } = getUniqueMinute(isClutchGoal);
      ourGoalList.push({ minute, display, scorerName: lastName, player });
      goalDetails.push({
        minute,
        displayMinute: display,
        scorer: lastName,
        isOpponent: false,
      });
    }
  });

  // Assign opponent goals
  for (let g = 0; g < opponentScore; g++) {
    const { minute, display } = getUniqueMinute(false);
    goalDetails.push({
      minute,
      displayMinute: display,
      scorer: opponent,
      isOpponent: true,
    });
  }

  // Sort goalDetails chronologically
  goalDetails.sort((a, b) => a.minute - b.minute);

  // Formatted scorer strings for match displays
  ourGoalList.sort((a, b) => a.minute - b.minute);
  const formattedScorers = ourGoalList.map((g) => `${g.scorerName} ${g.display}`);

  // 2. Generate Key Match Moments (2-5 moments)
  let ourRunning = 0;
  let oppRunning = 0;

  goalDetails.forEach((goal) => {
    if (!goal.isOpponent) {
      ourRunning++;
      let desc = '';
      if (ourRunning === 1 && oppRunning === 0) {
        desc = `${goal.scorer} breaks the deadlock with a clinical finish.`;
      } else if (ourRunning === oppRunning) {
        desc = `${goal.scorer} curls home a crucial equaliser!`;
      } else if (ourRunning > oppRunning && ourRunning - oppRunning === 1) {
        desc = `${goal.scorer} fires MY-11 into the lead!`;
      } else {
        desc = `${goal.scorer} extends the advantage with an emphatic strike.`;
      }
      keyEvents.push({
        minute: goal.minute,
        displayMinute: goal.displayMinute,
        type: 'goal',
        description: desc,
        playerName: goal.scorer,
      });
    } else {
      oppRunning++;
      let desc = '';
      if (oppRunning === 1 && ourRunning === 0) {
        desc = `${opponent} capitalise on a turnover to strike first.`;
      } else if (oppRunning === ourRunning) {
        desc = `${opponent} draw level from a dangerous cross.`;
      } else {
        desc = `${opponent} convert a quick counter-attack.`;
      }
      keyEvents.push({
        minute: goal.minute,
        displayMinute: goal.displayMinute,
        type: 'goal',
        description: desc,
      });
    }
  });

  // Add 1-2 non-goal key moments from player attributes (defensive stand, keeper save, playmaker chance)
  const gk = selectedPlayers.find((p) => p.primaryPosition === 'GK');
  const creativeMid = selectedPlayers.find(
    (p) => p.creativity >= 86 || p.technique >= 86 || p.primaryPosition === 'CAM'
  );
  const topDefender = selectedPlayers
    .filter((p) => ['CB', 'LB', 'RB'].includes(p.primaryPosition))
    .sort((a, b) => b.defending - a.defending)[0];

  if (gk && (opponentScore === 0 || rand() < 0.45)) {
    const min = Math.floor(rand() * 70) + 15;
    const gkLastName = gk.displayName.split(' ').pop() || gk.displayName;
    keyEvents.push({
      minute: min,
      displayMinute: `${min}'`,
      type: 'save',
      description: `${gkLastName} produces an acrobatic reflex stop to deny ${opponent}.`,
      playerName: gkLastName,
    });
  }

  if (creativeMid && rand() < 0.50) {
    const min = Math.floor(rand() * 60) + 10;
    const cmLastName = creativeMid.displayName.split(' ').pop() || creativeMid.displayName;
    keyEvents.push({
      minute: min,
      displayMinute: `${min}'`,
      type: 'chance',
      description: `${cmLastName} threads an eye-of-the-needle through ball to slice open the defence.`,
      playerName: cmLastName,
    });
  } else if (topDefender && rand() < 0.45) {
    const min = Math.floor(rand() * 75) + 12;
    const defLastName = topDefender.displayName.split(' ').pop() || topDefender.displayName;
    keyEvents.push({
      minute: min,
      displayMinute: `${min}'`,
      type: 'tackle',
      description: `${defLastName} executes a perfectly timed last-ditch slide tackle inside the box.`,
      playerName: defLastName,
    });
  }

  // Sort all events chronologically
  keyEvents.sort((a, b) => a.minute - b.minute);

  // 3. Man of the Match (MOTM) Selection
  let bestPlayer: Player = selectedPlayers[0];
  let bestScore = -1;
  let motmReason = 'Consistent work rate and tactical contribution.';

  // Check goalscorers
  const scorerCounts = new Map<string, { player: Player; count: number; late: boolean }>();
  ourGoalList.forEach((g) => {
    const curr = scorerCounts.get(g.player.id) || { player: g.player, count: 0, late: false };
    curr.count += 1;
    if (g.minute >= 80) curr.late = true;
    scorerCounts.set(g.player.id, curr);
  });

  scorerCounts.forEach(({ player, count, late }) => {
    let score = count * 35 + player.rating * 0.4;
    if (late && outcome === 'W') score += 25;
    if (score > bestScore) {
      bestScore = score;
      bestPlayer = player;
      if (count >= 2) {
        motmReason = `Decisive brace with ${count} clinical finishes.`;
      } else if (late && outcome === 'W') {
        motmReason = 'Clutch match-winner in the final minutes.';
      } else {
        motmReason = 'Crucial goal and constant attacking sharpness.';
      }
    }
  });

  // If clean sheet against strong opponent or low-scoring win
  if (opponentScore === 0 && gk) {
    const gkScore = 32 + gk.defence * 0.5 + (opponentRating >= 80 ? 25 : 0);
    if (gkScore > bestScore || ourScore === 0) {
      bestScore = gkScore;
      bestPlayer = gk;
      motmReason = 'Commanding clean sheet with decisive stops.';
    }
  }

  // If clean sheet and top defender was standout
  if (opponentScore === 0 && topDefender && bestPlayer === selectedPlayers[0] && ourScore <= 1) {
    const defScore = 30 + topDefender.defending * 0.5;
    if (defScore > bestScore) {
      bestScore = defScore;
      bestPlayer = topDefender;
      motmReason = 'Faultless defensive leadership and dominant clearances.';
    }
  }

  // Fallback to creative playmaker if draw/loss and high rating
  if (outcome !== 'W' && creativeMid && creativeMid.rating > bestPlayer.rating) {
    bestPlayer = creativeMid;
    motmReason = 'Dictated tempo in midfield despite tough resistance.';
  }

  const motm: MOTMInfo = {
    player: bestPlayer,
    reason: motmReason,
  };

  // 4. Match Headline and Short Story
  const motmLastName = bestPlayer.displayName.split(' ').pop() || bestPlayer.displayName;
  let headline = '';
  let summary = '';

  if (outcome === 'W') {
    if (ourScore >= 5) {
      headline = `${motmLastName} inspires five-star rout of ${opponent}`;
      summary = `MY-11 turned on the style in an unstoppable attacking display, overwhelming ${opponent} with wave after wave of incisive counters.`;
    } else if (ourScore === 4) {
      headline = `${motmLastName} inspires four-goal masterclass against ${opponent}`;
      summary = `A ruthless four-goal display saw MY-11 take full control, tearing through ${opponent} with incisive passing and sharp finishing.`;
    } else if (isClutchWinner || ourGoalList.some((g) => g.minute >= 85)) {
      headline = `Late drama! ${motmLastName} snatches dramatic winner against ${opponent}`;
      summary = `In a nail-biting finish, MY-11 held their nerve as ${motmLastName} struck in the dying moments to send the travelling support into raptures.`;
    } else if (ourScore - opponentScore >= 2) {
      headline = `Controlled masterclass secures comfortable win over ${opponent}`;
      summary = `A polished all-round performance saw MY-11 dictate possession and nullify ${opponent}'s threats with tactical maturity.`;
    } else if (opponentScore === 0) {
      headline = `Defensive resilience and ${motmLastName} strike edge past ${opponent}`;
      summary = `A disciplined defensive block and an alert showing from the backline preserved all three points against a stubborn ${opponent} side.`;
    } else {
      headline = `MY-11 battle past ${opponent} in thrilling contest`;
      summary = `An end-to-end clash settled by clinical finishing in the vital moments as MY-11 claimed a hard-earned victory.`;
    }
  } else if (outcome === 'D') {
    if (ourScore === 0) {
      headline = `Stalemate: Defences on top in cagey battle with ${opponent}`;
      summary = `Clear-cut chances were at a premium as both midfields cancelled each other out in a tight tactical arm-wrestle.`;
    } else {
      headline = `Honours even after pulsating ${ourScore}-${opponentScore} draw with ${opponent}`;
      summary = `Neither side could be separated in a high-octane encounter filled with momentum swings and determined attacking play.`;
    }
  } else {
    // Loss
    if (opponentScore - ourScore >= 3) {
      headline = `Bruising afternoon as ${opponent} capitalise on defensive errors`;
      summary = `A disjointed showing saw MY-11 punished ruthlessly by ${opponent}, who exploited transitions to inflict heavy damage.`;
    } else {
      headline = `Narrow defeat: MY-11 edged out by ${opponent}`;
      summary = `A contest decided by fine margins where ${opponent} took their chances and resisted late MY-11 pressure.`;
    }
  }

  return {
    goalDetails,
    keyEvents,
    motm,
    headline,
    summary,
    formattedScorers,
  };
}

/**
 * Identifies 4 to 7 notable fixtures across the 38-game campaign to highlight.
 * Guarantees zero duplicate matches and only authentic qualifying fixtures.
 */
export function generateSeasonHighlights(matches: MatchSimResult[]): SeasonHighlight[] {
  const highlights: SeasonHighlight[] = [];
  const usedMatchIndices = new Set<number>();

  // Helper: check if index already used
  const addHighlight = (
    matchIndex: number,
    category: HighlightCategory,
    categoryLabel: string,
    description: string
  ) => {
    if (matchIndex < 0 || matchIndex >= matches.length || usedMatchIndices.has(matchIndex)) return;
    usedMatchIndices.add(matchIndex);
    highlights.push({
      category,
      categoryLabel,
      matchIndex,
      match: matches[matchIndex],
      description,
    });
  };

  // 1. Biggest Win
  let bestWinIndex = -1;
  let maxWinDiff = 0;
  matches.forEach((m, idx) => {
    if (m.outcome === 'W') {
      const diff = m.ourScore - m.opponentScore;
      if (diff > maxWinDiff) {
        maxWinDiff = diff;
        bestWinIndex = idx;
      }
    }
  });
  if (bestWinIndex !== -1 && maxWinDiff >= 2) {
    const m = matches[bestWinIndex];
    addHighlight(
      bestWinIndex,
      'biggest_win',
      'Biggest Win of the Season',
      `An emphatic ${m.ourScore}-${m.opponentScore} victory over ${m.opponent} that showcased the full potency of your attack.`
    );
  }

  // 2. Giant Killing (Upset over highest rated opponent)
  let bestGiantIndex = -1;
  let maxOppRating = 0;
  matches.forEach((m, idx) => {
    if (m.outcome === 'W' && m.opponentRating >= 82 && m.opponentRating > maxOppRating) {
      maxOppRating = m.opponentRating;
      bestGiantIndex = idx;
    }
  });
  if (bestGiantIndex !== -1) {
    const m = matches[bestGiantIndex];
    addHighlight(
      bestGiantIndex,
      'giant_killing',
      'Statement Victory',
      `Tactical masterclass to take down high-flying ${m.opponent} (${m.opponentRating} OVR) with a resolute ${m.ourScore}-${m.opponentScore} win.`
    );
  }

  // 3. Late Winner
  let lateWinnerIndex = -1;
  matches.forEach((m, idx) => {
    if (m.outcome === 'W' && m.goalDetails) {
      const hasLateGoal = m.goalDetails.some((g) => !g.isOpponent && g.minute >= 85);
      if (hasLateGoal && lateWinnerIndex === -1) {
        lateWinnerIndex = idx;
      }
    }
  });
  if (lateWinnerIndex !== -1) {
    const m = matches[lateWinnerIndex];
    addHighlight(
      lateWinnerIndex,
      'late_winner',
      'Dramatic Late Winner',
      `Unbelievable late drama against ${m.opponent} as your XI struck in the dying minutes to seal all three points.`
    );
  }

  // 4. Clean Sheet Masterclass (Clean sheet vs strong opponent)
  let cleanSheetIndex = -1;
  let topCleanRating = 0;
  matches.forEach((m, idx) => {
    if (m.opponentScore === 0 && m.opponentRating > topCleanRating) {
      topCleanRating = m.opponentRating;
      cleanSheetIndex = idx;
    }
  });
  if (cleanSheetIndex !== -1 && topCleanRating >= 79) {
    const m = matches[cleanSheetIndex];
    addHighlight(
      cleanSheetIndex,
      'clean_sheet_masterclass',
      'Defensive Masterclass',
      `A defensive clinic shutting out ${m.opponent} (${m.opponentRating} OVR) to record a flawless clean sheet.`
    );
  }

  // 5. Highest Scoring Match
  let highestScoreIndex = -1;
  let maxTotalGoals = 0;
  matches.forEach((m, idx) => {
    const total = m.ourScore + m.opponentScore;
    if (total > maxTotalGoals && total >= 4) {
      maxTotalGoals = total;
      highestScoreIndex = idx;
    }
  });
  if (highestScoreIndex !== -1) {
    const m = matches[highestScoreIndex];
    addHighlight(
      highestScoreIndex,
      'highest_scoring',
      'High-Scoring Thriller',
      `An exhilarating end-to-end spectacle featuring ${maxTotalGoals} goals against ${m.opponent} (${m.ourScore}-${m.opponentScore}).`
    );
  }

  // 6. Title Defining Match (Matchday 30-38 crucial win)
  for (let idx = 37; idx >= 29; idx--) {
    const m = matches[idx];
    if (m && m.outcome === 'W') {
      addHighlight(
        idx,
        'title_defining',
        'Crucial Run-in Triumph',
        `A high-pressure Matchday ${idx + 1} win over ${m.opponent} that kept campaign ambitions alive.`
      );
      break;
    }
  }

  // 7. Worst Defeat or Dropped Points (if any losses occurred)
  let worstLossIndex = -1;
  let maxLossDiff = 0;
  matches.forEach((m, idx) => {
    if (m.outcome === 'L') {
      const diff = m.opponentScore - m.ourScore;
      if (diff > maxLossDiff) {
        maxLossDiff = diff;
        worstLossIndex = idx;
      }
    }
  });
  if (worstLossIndex !== -1) {
    const m = matches[worstLossIndex];
    addHighlight(
      worstLossIndex,
      'worst_defeat',
      'Costly Stumble',
      `A tough day at the office as ${m.opponent} capitalized on defensive lapses in a ${m.ourScore}-${m.opponentScore} defeat.`
    );
  }

  return highlights.slice(0, 6);
}

interface SeasonNarrativeInput {
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  leaguePosition: number;
  matches: MatchSimResult[];
  selectedPlayers: Player[];
  stats: { attack: number; midfield: number; defence: number; chemistry: number; overall: number };
  weakLink: Player;
}

/**
 * Synthesizes an authentic, football-grounded season review and streak analysis.
 */
export function generateSeasonNarrative({
  wins,
  draws,
  losses,
  points,
  goalsFor,
  goalsAgainst,
  cleanSheets,
  leaguePosition,
  matches,
  selectedPlayers,
  stats,
  weakLink,
}: SeasonNarrativeInput): SeasonStory {
  // 1. Calculate streaks
  let maxWinStreak = 0;
  let currWinStreak = 0;
  let winStreakEndIdx = 0;

  let maxUnbeatenStreak = 0;
  let currUnbeatenStreak = 0;
  let unbeatenEndIdx = 0;

  let maxCleanSheetsStreak = 0;
  let currCleanStreak = 0;
  let cleanEndIdx = 0;

  matches.forEach((m, idx) => {
    // Win streak
    if (m.outcome === 'W') {
      currWinStreak++;
      if (currWinStreak > maxWinStreak) {
        maxWinStreak = currWinStreak;
        winStreakEndIdx = idx;
      }
    } else {
      currWinStreak = 0;
    }

    // Unbeaten streak
    if (m.outcome === 'W' || m.outcome === 'D') {
      currUnbeatenStreak++;
      if (currUnbeatenStreak > maxUnbeatenStreak) {
        maxUnbeatenStreak = currUnbeatenStreak;
        unbeatenEndIdx = idx;
      }
    } else {
      currUnbeatenStreak = 0;
    }

    // Clean sheet streak
    if (m.opponentScore === 0) {
      currCleanStreak++;
      if (currCleanStreak > maxCleanSheetsStreak) {
        maxCleanSheetsStreak = currCleanStreak;
        cleanEndIdx = idx;
      }
    } else {
      currCleanStreak = 0;
    }
  });

  // Longest streak summary
  let longestStreak: SeasonStory['longestStreak'];
  if (maxWinStreak >= 4) {
    const startMD = winStreakEndIdx - maxWinStreak + 2;
    const endMD = winStreakEndIdx + 1;
    longestStreak = {
      type: 'win',
      count: maxWinStreak,
      description: `${maxWinStreak}-Match Winning Streak (Matchdays ${startMD}–${endMD})`,
    };
  } else if (maxUnbeatenStreak >= 6) {
    const startMD = unbeatenEndIdx - maxUnbeatenStreak + 2;
    const endMD = unbeatenEndIdx + 1;
    longestStreak = {
      type: 'unbeaten',
      count: maxUnbeatenStreak,
      description: `${maxUnbeatenStreak}-Match Unbeaten Run (Matchdays ${startMD}–${endMD})`,
    };
  } else if (maxCleanSheetsStreak >= 3) {
    const startMD = cleanEndIdx - maxCleanSheetsStreak + 2;
    const endMD = cleanEndIdx + 1;
    longestStreak = {
      type: 'clean_sheet',
      count: maxCleanSheetsStreak,
      description: `${maxCleanSheetsStreak} Consecutive Clean Sheets (Matchdays ${startMD}–${endMD})`,
    };
  } else {
    longestStreak = {
      type: 'win',
      count: maxWinStreak,
      description: `Best Run: ${maxWinStreak} Consecutive Wins`,
    };
  }

  // 2. Expected Performance & Verdict
  // Realistic expected wins band based on overall and chemistry
  let minExpected = 16;
  let maxExpected = 20;

  if (stats.overall >= 88) {
    minExpected = 23;
    maxExpected = 27;
  } else if (stats.overall >= 85) {
    minExpected = 20;
    maxExpected = 24;
  } else if (stats.overall >= 82) {
    minExpected = 17;
    maxExpected = 21;
  } else if (stats.overall >= 79) {
    minExpected = 14;
    maxExpected = 18;
  } else {
    minExpected = 11;
    maxExpected = 15;
  }

  // Adjust for high/low chemistry
  if (stats.chemistry >= 85) {
    minExpected += 1;
    maxExpected += 1;
  } else if (stats.chemistry < 70) {
    minExpected -= 1;
    maxExpected -= 1;
  }

  const expectedWinsBand = `${minExpected}–${maxExpected} Wins`;
  let verdict: SeasonStory['verdict'];
  if (wins > maxExpected) {
    verdict = 'Exceeded expectations';
  } else if (wins < minExpected) {
    verdict = 'Underperformed';
  } else {
    verdict = 'About as expected';
  }

  // 3. Narrative Title Theme
  let title = 'MID-TABLE STABILITY';
  if (wins === 38) {
    title = 'THE INVINCIBLES';
  } else if (wins >= 30 || points >= 92) {
    title = 'THE TITLE CHARGE';
  } else if (losses <= 2 && points >= 82) {
    title = 'THE NEAR-INVINCIBLES';
  } else if (leaguePosition <= 4) {
    title = 'CHAMPIONS LEAGUE QUALIFIERS';
  } else if (goalsFor >= 72 && goalsAgainst >= 40) {
    title = 'GREAT ATTACK, LEAKY DEFENCE';
  } else if (cleanSheets >= 16 && goalsAgainst <= 28) {
    title = 'BUILT ON THE BACK FOUR';
  } else if (leaguePosition <= 7) {
    title = 'EUROPEAN CHALLENGERS';
  } else {
    title = 'REBUILDING CAMPAIGN';
  }

  // 4. Structured Narrative Sections
  // Opening 10 games
  const opening10 = matches.slice(0, 10);
  const openWins = opening10.filter((m) => m.outcome === 'W').length;
  const openPoints = openWins * 3 + opening10.filter((m) => m.outcome === 'D').length;

  let howStarted = '';
  if (openWins >= 8) {
    howStarted = `MY-11 flew out of the blocks with ${openWins} victories in their opening 10 matches (${openPoints} pts), establishing immediate authority at the summit.`;
  } else if (openWins >= 5) {
    howStarted = `A solid start saw your XI take ${openPoints} points from the first 10 fixtures, laying down a dependable platform for the season ahead.`;
  } else {
    howStarted = `A stuttering opening period yielded only ${openWins} wins in the first 10 matchdays, requiring tactical adjustments to steady the ship.`;
  }

  // Turning Point
  let turningPoint = '';
  if (maxWinStreak >= 4) {
    const startMD = winStreakEndIdx - maxWinStreak + 2;
    const endMD = winStreakEndIdx + 1;
    turningPoint = `A decisive ${maxWinStreak}-game winning streak between Matchdays ${startMD} and ${endMD} transformed the campaign's momentum.`;
  } else if (maxUnbeatenStreak >= 6) {
    const startMD = unbeatenEndIdx - maxUnbeatenStreak + 2;
    const endMD = unbeatenEndIdx + 1;
    turningPoint = `An uninterrupted ${maxUnbeatenStreak}-match unbeaten run anchored your season and built unshakeable dressing room resilience.`;
  } else {
    turningPoint = `Consistent week-to-week battling kept points ticking over without major collapses across the 38 rounds.`;
  }

  // Why It Worked (connect drafted attributes to outcomes)
  let whyItWorked = '';
  if (stats.chemistry >= 85) {
    whyItWorked = `Exceptional squad chemistry (${stats.chemistry}/100) connected your core departments, enabling fluid passing combinations and coordinated transitions.`;
  } else if (stats.attack >= 86) {
    whyItWorked = `Lethal firepower in the final third delivered ${goalsFor} goals, with your forward line consistently bailing the team out in tight contests.`;
  } else if (stats.defence >= 86 && cleanSheets >= 14) {
    whyItWorked = `A resolute defensive structure kept ${cleanSheets} clean sheets, suffocating opposition space and turning narrow leads into secure victories.`;
  } else if (stats.midfield >= 85) {
    whyItWorked = `Midfield dominance allowed your XI to dictate the tempo of matches and shield the back four from sustained pressure.`;
  } else {
    whyItWorked = `A balanced team framework and timely individual moments yielded valuable points throughout a competitive 38-game marathon.`;
  }

  // What Held You Back (connect drafted weaknesses/conceded goals)
  let whatHeldBack = '';
  if (stats.chemistry < 75) {
    whatHeldBack = `Fractured team chemistry (${stats.chemistry}/100) led to occasional miscommunications and dropped points in games that should have been closed out.`;
  } else if (goalsAgainst >= 40) {
    whatHeldBack = `Defensive vulnerability proved costly, as conceding ${goalsAgainst} goals undermined several high-scoring performances.`;
  } else if (stats.attack < 80) {
    whatHeldBack = `A lack of cutting edge upfront limited the side to ${goalsFor} goals, converting potential victories into frustrating draws.`;
  } else if (weakLink && weakLink.rating < 82) {
    const weakLastName = weakLink.displayName.split(' ').pop() || weakLink.displayName;
    whatHeldBack = `Individual drop-off at ${weakLink.primaryPosition} (${weakLastName}, ${weakLink.rating} OVR) was targeted by top opposition sides.`;
  } else {
    whatHeldBack = `Occasional lapses in concentration in tight away fixtures prevented an even higher points tally.`;
  }

  // How Ended
  const final8 = matches.slice(30);
  const finalWins = final8.filter((m) => m.outcome === 'W').length;
  let howEnded = '';
  if (finalWins >= 6) {
    howEnded = `A blistering run-in with ${finalWins} wins from the final 8 matches propelled MY-11 across the finish line with ${points} points (#${leaguePosition}).`;
  } else if (leaguePosition <= 4) {
    howEnded = `Holding firm under intense pressure, MY-11 crossed the line with ${points} points to secure a prestigious #${leaguePosition} league finish.`;
  } else {
    howEnded = `The season concluded with ${points} points and a #${leaguePosition} finish, completing a hard-fought 38-match campaign.`;
  }

  return {
    title,
    verdict,
    expectedWinsBand,
    howStarted,
    turningPoint,
    longestStreak,
    whyItWorked,
    whatHeldBack,
    howEnded,
  };
}
