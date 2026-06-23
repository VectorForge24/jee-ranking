/**
 * JEE Ranking — XP Engine
 * Pure functions, no side effects, fully testable.
 * All XP logic lives here. Nothing else should compute XP.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const XP_PER_HOUR = 100;          // Base XP per registered hour
export const XP_PER_SUBRANK = 1500;      // XP needed per sub-rank
export const TOTAL_SUBRANKS = 18;        // Bronze III → Conqueror I
export const MAX_XP = XP_PER_SUBRANK * TOTAL_SUBRANKS; // 27,000

// Completion tiers
export const TIERS = [
  { name: 'ELITE',   min: 90,  multiplier:  1.50, emoji: '🔥' },
  { name: 'GREAT',   min: 75,  multiplier:  1.20, emoji: '⚡' },
  { name: 'SOLID',   min: 55,  multiplier:  0.90, emoji: '✅' },
  { name: 'WEAK',    min: 35,  multiplier:  0.55, emoji: '⚠️' },
  { name: 'POOR',    min: 15,  multiplier:  0.20, emoji: '🔻' },
  { name: 'PENALTY', min: 0,   multiplier: -0.40, emoji: '💀' },
];

// Rank definitions — index 0 = Bronze III, index 17 = Conqueror I
export const RANKS = [
  { tier: 'Bronze',    sub: 'III', color: '#CD7F32', glow: '#8B4513', bg: '#1a0f00' },
  { tier: 'Bronze',    sub: 'II',  color: '#CD7F32', glow: '#8B4513', bg: '#1a0f00' },
  { tier: 'Bronze',    sub: 'I',   color: '#CD7F32', glow: '#8B4513', bg: '#1a0f00' },
  { tier: 'Silver',    sub: 'III', color: '#C0C0C0', glow: '#A8A8A8', bg: '#111111' },
  { tier: 'Silver',    sub: 'II',  color: '#C0C0C0', glow: '#A8A8A8', bg: '#111111' },
  { tier: 'Silver',    sub: 'I',   color: '#C0C0C0', glow: '#A8A8A8', bg: '#111111' },
  { tier: 'Gold',      sub: 'III', color: '#FFD700', glow: '#FFA500', bg: '#0f0c00' },
  { tier: 'Gold',      sub: 'II',  color: '#FFD700', glow: '#FFA500', bg: '#0f0c00' },
  { tier: 'Gold',      sub: 'I',   color: '#FFD700', glow: '#FFA500', bg: '#0f0c00' },
  { tier: 'Platinum',  sub: 'III', color: '#00CED1', glow: '#48D1CC', bg: '#00100f' },
  { tier: 'Platinum',  sub: 'II',  color: '#00CED1', glow: '#48D1CC', bg: '#00100f' },
  { tier: 'Platinum',  sub: 'I',   color: '#00CED1', glow: '#48D1CC', bg: '#00100f' },
  { tier: 'Diamond',   sub: 'III', color: '#B9F2FF', glow: '#00BFFF', bg: '#000d14' },
  { tier: 'Diamond',   sub: 'II',  color: '#B9F2FF', glow: '#00BFFF', bg: '#000d14' },
  { tier: 'Diamond',   sub: 'I',   color: '#B9F2FF', glow: '#00BFFF', bg: '#000d14' },
  { tier: 'Conqueror', sub: 'III', color: '#FF4500', glow: '#DC143C', bg: '#140000' },
  { tier: 'Conqueror', sub: 'II',  color: '#FF4500', glow: '#DC143C', bg: '#140000' },
  { tier: 'Conqueror', sub: 'I',   color: '#FF4500', glow: '#DC143C', bg: '#140000' },
];

// Streak bonuses — positive
export const POSITIVE_STREAK_BONUSES = [
  { days: 3,  bonus: 300,  name: 'Hot Streak',    emoji: '🔥' },
  { days: 5,  bonus: 600,  name: 'On Fire',       emoji: '⚡' },
  { days: 7,  bonus: 1000, name: 'Unstoppable',   emoji: '👑' },
  { days: 10, bonus: 1500, name: 'Legendary',     emoji: '💎' },
];

// Streak bonuses — negative (cumulative on top of daily penalty)
export const NEGATIVE_STREAK_BONUSES = [
  { days: 3,  penalty: 500,  name: 'Slump',    emoji: '🌧️' },
  { days: 5,  penalty: 1000, name: 'Freefall', emoji: '🌩️' },
  { days: 7,  penalty: 1500, name: 'Collapse', emoji: '💀' },
];

// One-time achievements
export const ACHIEVEMENTS = [
  { id: 'first_blood',    name: 'First Blood',    emoji: '🌟', desc: 'First ever ELITE day',           bonus: 200  },
  { id: 'perfectionist',  name: 'Perfectionist',  emoji: '💯', desc: 'First 100% completion day',       bonus: 250  },
  { id: 'perfect_5',      name: 'Perfect Week',   emoji: '🏆', desc: '5 consecutive 100% days',         bonus: 800  },
  { id: 'triple_threat',  name: 'Triple Threat',  emoji: '📚', desc: 'All 3 subjects in one day',       bonus: 100  },
  { id: 'breakthrough',   name: 'Breakthrough',   emoji: '🎖️', desc: 'First time reaching a new tier',  bonus: 500  },
];

// ─── Core calculations ─────────────────────────────────────────────────────────

/**
 * Parse events for a specific date from the tracker JSON.
 * @param {Array} events - tracker-events array
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {{ totalHrs, doneHrs, subjects, taskCount, doneCount }}
 */
export function parseDayFromEvents(events, dateStr) {
  const dayEvents = events.filter(e =>
    !e.allDay &&
    e.start &&
    e.start.startsWith(dateStr)
  );

  let totalHrs = 0;
  let doneHrs = 0;
  const subjectsToday = new Set();
  let doneCount = 0;

  for (const e of dayEvents) {
    const start = new Date(e.start);
    const end = new Date(e.end);
    const hrs = (end - start) / 3_600_000;
    totalHrs += hrs;
    if (e.done) {
      doneHrs += hrs;
      doneCount++;
    }
    if (e.subject) subjectsToday.add(e.subject);
  }

  return {
    totalHrs: Math.round(totalHrs * 100) / 100,
    doneHrs:  Math.round(doneHrs * 100) / 100,
    subjects: [...subjectsToday],
    taskCount: dayEvents.length,
    doneCount,
    hasData: dayEvents.length > 0,
  };
}

/**
 * Determine completion tier for a given completion %.
 */
export function getTier(pct) {
  for (const tier of TIERS) {
    if (pct >= tier.min) return tier;
  }
  return TIERS[TIERS.length - 1]; // PENALTY
}

/**
 * Calculate raw XP for a single day (before streak bonuses).
 * @param {number} doneHrs
 * @param {number} totalHrs
 * @returns {{ xp, tier, pct, baseXP }}
 */
export function calcDayXP(doneHrs, totalHrs) {
  if (totalHrs === 0) return { xp: 0, tier: null, pct: 0, baseXP: 0 };

  const pct = (doneHrs / totalHrs) * 100;
  const baseXP = totalHrs * XP_PER_HOUR;
  const tier = getTier(pct);
  const xp = Math.round(baseXP * tier.multiplier);

  return { xp, tier, pct: Math.round(pct * 10) / 10, baseXP: Math.round(baseXP) };
}

/**
 * Evaluate streak bonuses given an array of recent daily results.
 * @param {Array<{pct, hasData}>} recentDays - ordered oldest → newest
 * @returns {{ positiveBonus, negativePenalty, positiveStreak, negativeStreak, bonusEvents }}
 */
export function evalStreaks(recentDays) {
  // Count current positive streak (≥85% days, backwards from today)
  let posStreak = 0;
  for (let i = recentDays.length - 1; i >= 0; i--) {
    const d = recentDays[i];
    if (!d.hasData) break; // days with no tasks don't count either way
    if (d.pct >= 85) posStreak++;
    else break;
  }

  // Count current negative streak (<20% on days with tasks)
  let negStreak = 0;
  for (let i = recentDays.length - 1; i >= 0; i--) {
    const d = recentDays[i];
    if (!d.hasData) break;
    if (d.pct < 20) negStreak++;
    else break;
  }

  const bonusEvents = [];
  let positiveBonus = 0;
  let negativePenalty = 0;

  // Check which positive milestones are hit TODAY (exact match to avoid double-counting)
  for (const sb of POSITIVE_STREAK_BONUSES) {
    if (posStreak === sb.days) {
      positiveBonus += sb.bonus;
      bonusEvents.push({ type: 'streak_bonus', ...sb });
    }
  }

  // Check which negative milestones are hit TODAY
  for (const sb of NEGATIVE_STREAK_BONUSES) {
    if (negStreak === sb.days) {
      negativePenalty += sb.penalty;
      bonusEvents.push({ type: 'streak_penalty', ...sb, bonus: -sb.penalty });
    }
  }

  return { positiveBonus, negativePenalty, posStreak, negStreak, bonusEvents };
}

/**
 * Check one-time achievements for today.
 * @param {object} dayStats - from parseDayFromEvents
 * @param {object} dayXP    - from calcDayXP
 * @param {object} state    - current ranking state (achievements, history)
 * @returns {Array} newly unlocked achievements
 */
export function checkAchievements(dayStats, dayXP, state) {
  const unlocked = [];
  const earned = new Set(state.achievements || []);

  const add = (id) => {
    if (!earned.has(id)) {
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (ach) unlocked.push(ach);
    }
  };

  if (dayXP.tier?.name === 'ELITE') add('first_blood');
  if (dayXP.pct === 100) add('perfectionist');
  if (dayStats.subjects.length >= 3) add('triple_threat');

  // Perfect 5 streak
  const history = state.history || [];
  const last5 = history.slice(-4).concat([{ pct: dayXP.pct }]);
  if (last5.length === 5 && last5.every(d => d.pct === 100)) add('perfect_5');

  return unlocked;
}

// ─── Rank math ─────────────────────────────────────────────────────────────────

/**
 * Convert total cumulative XP → rank index + sub-rank XP.
 */
export function xpToRank(totalXP) {
  const clamped = Math.max(0, Math.min(totalXP, MAX_XP));
  const rankIdx = Math.min(Math.floor(clamped / XP_PER_SUBRANK), TOTAL_SUBRANKS - 1);
  const subXP   = clamped % XP_PER_SUBRANK;
  return { rank: RANKS[rankIdx], rankIdx, subXP };
}

/**
 * Apply a day's XP delta to the current state, handling promotions and demotions.
 * @param {object} state - { totalXP, rankIdx, subXP, history, achievements }
 * @param {number} xpDelta - positive or negative
 * @returns {{ newState, events: Array<'promote'|'demote'> }}
 */
export function applyXP(state, xpDelta) {
  const prevRankIdx = state.rankIdx;
  let newTotalXP = Math.max(0, Math.min(state.totalXP + xpDelta, MAX_XP));

  const { rank, rankIdx, subXP } = xpToRank(newTotalXP);

  const events = [];
  if (rankIdx > prevRankIdx) {
    events.push({ type: 'promote', from: RANKS[prevRankIdx], to: rank });
    // Check breakthrough (tier change, not just sub-rank)
    if (rank.tier !== RANKS[prevRankIdx].tier) {
      events.push({ type: 'breakthrough', tier: rank.tier });
    }
  } else if (rankIdx < prevRankIdx) {
    events.push({ type: 'demote', from: RANKS[prevRankIdx], to: rank });
  }

  const newState = {
    ...state,
    totalXP:  newTotalXP,
    rankIdx,
    subXP,
    rank,
  };

  return { newState, events };
}

/**
 * Master function: process a day's tracker data → full XP result.
 * @param {object} dayStats  - from parseDayFromEvents
 * @param {object} state     - current ranking state
 * @param {Array}  history   - array of past daily results for streak calc
 * @returns {object} { xpDelta, dayXP, streakResult, achievements, events, newState }
 */
export function processDay(dayStats, state, history) {
  // 1. Base daily XP
  const dayXP = calcDayXP(dayStats.doneHrs, dayStats.totalHrs);

  // 2. Streak bonuses
  const recentDays = [...history, { pct: dayXP.pct, hasData: dayStats.hasData }];
  const streakResult = evalStreaks(recentDays);

  // 3. Achievements
  const newAchievements = checkAchievements(dayStats, dayXP, state);
  const achievementBonus = newAchievements.reduce((sum, a) => sum + a.bonus, 0);

  // 4. Total XP delta
  const xpDelta = dayXP.xp
    + streakResult.positiveBonus
    - streakResult.negativePenalty
    + achievementBonus;

  // 5. Apply to rank state
  const { newState, events } = applyXP(state, xpDelta);

  // 6. Update state
  const finalState = {
    ...newState,
    achievements: [
      ...(state.achievements || []),
      ...newAchievements.map(a => a.id),
    ],
    history: [
      ...history,
      {
        date:     new Date().toISOString().slice(0, 10),
        pct:      dayXP.pct,
        xp:       xpDelta,
        hasData:  dayStats.hasData,
        tier:     dayXP.tier?.name || null,
      },
    ].slice(-60), // keep last 60 days
  };

  return {
    xpDelta,
    dayXP,
    streakResult,
    newAchievements,
    achievementBonus,
    events,        // promote/demote events
    newState: finalState,
    summary: {
      baseXP:         dayXP.xp,
      streakBonus:    streakResult.positiveBonus,
      streakPenalty:  streakResult.negativePenalty,
      achievementXP:  achievementBonus,
      tier:           dayXP.tier,
      pct:            dayXP.pct,
      posStreak:      streakResult.posStreak,
      negStreak:      streakResult.negStreak,
    },
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function getRankDisplayName(rank) {
  return `${rank.tier} ${rank.sub}`;
}

export function getProgressPercent(subXP) {
  return Math.round((subXP / XP_PER_SUBRANK) * 100);
}

export const INITIAL_STATE = {
  totalXP:      0,
  rankIdx:      0,
  subXP:        0,
  rank:         RANKS[0],
  achievements: [],
  history:      [],
};
