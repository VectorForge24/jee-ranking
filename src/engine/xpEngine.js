// ── XP Engine ─────────────────────────────────────────────────────────────────

export const XP_PER_SUBRANK = 1500;
export const XP_PER_HOUR    = 100;
export const TOTAL_SUBRANKS  = 18;
export const MAX_XP          = XP_PER_SUBRANK * TOTAL_SUBRANKS; // 27,000 = Conqueror I full

export const RANKS = [
  { tier:'Bronze',    sub:'III', color:'#CD7F32', glow:'#E8A050', bg:'#1C1008' },
  { tier:'Bronze',    sub:'II',  color:'#CD7F32', glow:'#E8A050', bg:'#1C1008' },
  { tier:'Bronze',    sub:'I',   color:'#CD7F32', glow:'#E8A050', bg:'#1C1008' },
  { tier:'Silver',    sub:'III', color:'#B8C4CC', glow:'#D8E4EC', bg:'#101418' },
  { tier:'Silver',    sub:'II',  color:'#B8C4CC', glow:'#D8E4EC', bg:'#101418' },
  { tier:'Silver',    sub:'I',   color:'#B8C4CC', glow:'#D8E4EC', bg:'#101418' },
  { tier:'Gold',      sub:'III', color:'#F5C400', glow:'#FFE066', bg:'#141000' },
  { tier:'Gold',      sub:'II',  color:'#F5C400', glow:'#FFE066', bg:'#141000' },
  { tier:'Gold',      sub:'I',   color:'#F5C400', glow:'#FFE066', bg:'#141000' },
  { tier:'Platinum',  sub:'III', color:'#00C8D0', glow:'#60E8F0', bg:'#001418' },
  { tier:'Platinum',  sub:'II',  color:'#00C8D0', glow:'#60E8F0', bg:'#001418' },
  { tier:'Platinum',  sub:'I',   color:'#00C8D0', glow:'#60E8F0', bg:'#001418' },
  { tier:'Diamond',   sub:'III', color:'#60C8FF', glow:'#A0E0FF', bg:'#001018' },
  { tier:'Diamond',   sub:'II',  color:'#60C8FF', glow:'#A0E0FF', bg:'#001018' },
  { tier:'Diamond',   sub:'I',   color:'#60C8FF', glow:'#A0E0FF', bg:'#001018' },
  { tier:'Conqueror', sub:'III', color:'#FF5030', glow:'#FF8060', bg:'#180800' },
  { tier:'Conqueror', sub:'II',  color:'#FF5030', glow:'#FF8060', bg:'#180800' },
  { tier:'Conqueror', sub:'I',   color:'#FF5030', glow:'#FF8060', bg:'#180800' },
];

// Conqueror I "beyond max" sentinel — shown when totalXP > 27000
export const CONQUEROR_MAX = { tier:'Conqueror', sub:'I ★', color:'#FF5030', glow:'#FFB090', bg:'#180800' };

export const TIERS = [
  { name:'ELITE',   emoji:'🔥', min:90,  mult: 1.50 },
  { name:'GREAT',   emoji:'⚡', min:75,  mult: 1.20 },
  { name:'SOLID',   emoji:'✅', min:55,  mult: 0.90 },
  { name:'WEAK',    emoji:'⚠️', min:35,  mult: 0.55 },
  { name:'POOR',    emoji:'🔻', min:15,  mult: 0.20 },
  { name:'PENALTY', emoji:'💀', min:0,   mult:-0.40 },
];

export const POSITIVE_STREAK_BONUSES = [
  { days:3,  bonus:300,  name:'Hot Streak',  emoji:'🔥' },
  { days:5,  bonus:600,  name:'On Fire',     emoji:'⚡' },
  { days:7,  bonus:1000, name:'Unstoppable', emoji:'👑' },
  { days:10, bonus:1500, name:'Legendary',   emoji:'💎' },
];

export const NEGATIVE_STREAK_BONUSES = [
  { days:3, penalty:500,  name:'Slump',    emoji:'🌧️' },
  { days:5, penalty:1000, name:'Freefall', emoji:'🌩️' },
  { days:7, penalty:1500, name:'Collapse', emoji:'💀' },
];

export const ACHIEVEMENTS = [
  { id:'first_blood',   name:'First Blood',   emoji:'🌟', desc:'Earn your first ELITE day (≥90% tasks done)',      bonus:200 },
  { id:'perfectionist', name:'Perfectionist', emoji:'💯', desc:'Complete 100% of tasks in a single day',           bonus:250 },
  { id:'perfect_5',     name:'Perfect Week',  emoji:'🏆', desc:'5 consecutive days with 100% completion',          bonus:800 },
  { id:'triple_threat', name:'Triple Threat', emoji:'📚', desc:'Complete tasks from all 3 subjects in one day',    bonus:100 },
  { id:'breakthrough',  name:'Breakthrough',  emoji:'🎖️', desc:'Reach a brand-new rank tier for the first time',  bonus:500 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function parseDayFromEvents(events, dateStr) {
  const day = events.filter(e => !e.allDay && e.start?.startsWith(dateStr));
  let totalHrs = 0, doneHrs = 0, doneCount = 0;
  const subjects = new Set();
  for (const e of day) {
    const hrs = (new Date(e.end) - new Date(e.start)) / 3_600_000;
    totalHrs += hrs;
    if (e.done) { doneHrs += hrs; doneCount++; }
    if (e.subject) subjects.add(e.subject);
  }
  return {
    totalHrs:  Math.round(totalHrs * 100) / 100,
    doneHrs:   Math.round(doneHrs  * 100) / 100,
    taskCount: day.length,
    doneCount,
    subjects:  [...subjects],
    hasData:   day.length > 0,
  };
}

export function getTier(pct) {
  for (const t of TIERS) if (pct >= t.min) return t;
  return TIERS[TIERS.length - 1];
}

/**
 * Calculate XP for a day.
 * KEY FIX: isFinalised flag.
 * - Past days (yesterday and before) → always compute including penalties.
 * - Today (in progress) → only award positive XP. No penalty until day ends.
 *   If 0% done mid-day, show 0 XP not -520.
 */
export function calcDayXP(doneHrs, totalHrs, isFinalised = true) {
  if (totalHrs === 0) return { xp: 0, tier: null, pct: 0, baseXP: 0 };
  const pct    = (doneHrs / totalHrs) * 100;
  const baseXP = totalHrs * XP_PER_HOUR;
  const tier   = getTier(pct);

  // Mid-day: don't penalise yet — student is still working
  if (!isFinalised && tier.mult < 0) {
    return { xp: 0, tier: { ...tier, name:'IN PROGRESS', emoji:'⏳' }, pct: Math.round(pct*10)/10, baseXP: Math.round(baseXP) };
  }

  const xp = Math.round(baseXP * tier.mult);
  return { xp, tier, pct: Math.round(pct * 10) / 10, baseXP: Math.round(baseXP) };
}

export function evalStreaks(recentDays) {
  let posStreak = 0, negStreak = 0;
  for (let i = recentDays.length - 1; i >= 0; i--) {
    const d = recentDays[i];
    if (!d.hasData) break;
    if (d.pct >= 85) posStreak++; else break;
  }
  for (let i = recentDays.length - 1; i >= 0; i--) {
    const d = recentDays[i];
    if (!d.hasData) break;
    if (d.pct < 20) negStreak++; else break;
  }
  let positiveBonus = 0, negativePenalty = 0;
  const bonusEvents = [];
  for (const s of POSITIVE_STREAK_BONUSES) {
    if (posStreak === s.days) { positiveBonus += s.bonus; bonusEvents.push({ type:'streak_bonus', ...s }); }
  }
  for (const s of NEGATIVE_STREAK_BONUSES) {
    if (negStreak === s.days) { negativePenalty += s.penalty; bonusEvents.push({ type:'streak_penalty', ...s }); }
  }
  return { positiveBonus, negativePenalty, posStreak, negStreak, bonusEvents };
}

export function checkAchievements(dayStats, dayXP, state) {
  const earned = new Set(state.achievements || []);
  const unlocked = [];
  const add = id => { if (!earned.has(id)) { const a = ACHIEVEMENTS.find(x=>x.id===id); if(a) unlocked.push(a); }};
  if (dayXP.tier?.name === 'ELITE') add('first_blood');
  if (dayXP.pct === 100) add('perfectionist');
  if (dayStats.subjects.length >= 3) add('triple_threat');
  const last5 = [...(state.history||[]).slice(-4), { pct: dayXP.pct }];
  if (last5.length === 5 && last5.every(d => d.pct === 100)) add('perfect_5');
  return unlocked;
}

/**
 * Convert totalXP → rank.
 * Beyond 27,000: stays at Conqueror I ★ with subXP continuing to grow.
 */
export function xpToRank(totalXP) {
  const safeXP = Math.max(0, totalXP); // allow > MAX_XP
  if (safeXP >= MAX_XP) {
    return {
      rank:    CONQUEROR_MAX,
      rankIdx: TOTAL_SUBRANKS - 1,
      subXP:   safeXP - MAX_XP + 1500, // overflow shown as bonus progress
    };
  }
  const idx   = Math.min(Math.floor(safeXP / XP_PER_SUBRANK), TOTAL_SUBRANKS - 1);
  const subXP = safeXP % XP_PER_SUBRANK;
  return { rank: RANKS[idx], rankIdx: idx, subXP };
}

export function applyXP(state, xpDelta) {
  const prevIdx  = state.rankIdx ?? 0;
  // No upper cap — XP can grow beyond 27,000
  const newTotal = Math.max(0, (state.totalXP || 0) + xpDelta);
  const { rank, rankIdx, subXP } = xpToRank(newTotal);
  const events = [];
  if (rankIdx > prevIdx) events.push({ type:'promote', from: RANKS[prevIdx] || RANKS[0], to: rank });
  if (rankIdx < prevIdx) events.push({ type:'demote',  from: RANKS[prevIdx] || RANKS[0], to: rank });
  return { newState: { ...state, totalXP: newTotal, rankIdx, subXP, rank }, events };
}

/**
 * Process one day.
 * @param isFinalised - true for past days, false for today (in-progress)
 */
export function processDay(dayStats, state, history, dateStr, isFinalised = true) {
  const dayXP        = calcDayXP(dayStats.doneHrs, dayStats.totalHrs, isFinalised);
  const recentDays   = [...history, { pct: dayXP.pct, hasData: dayStats.hasData }];
  const streakResult = evalStreaks(recentDays);
  const newAch       = checkAchievements(dayStats, dayXP, state);
  const achBonus     = newAch.reduce((s,a) => s + a.bonus, 0);

  // Mid-day: don't apply streak penalties yet either
  const streakPenalty = isFinalised ? streakResult.negativePenalty : 0;
  const xpDelta = dayXP.xp + streakResult.positiveBonus - streakPenalty + achBonus;

  const { newState, events } = applyXP(state, xpDelta);

  if (events.find(e=>e.type==='promote') && newState.rank.tier !== (RANKS[state.rankIdx]?.tier)) {
    events.push({ type:'breakthrough', tier: newState.rank.tier });
  }

  const finalState = {
    ...newState,
    achievements: [...new Set([...(state.achievements||[]), ...newAch.map(a=>a.id)])],
    history: [...history, {
      date:      dateStr || new Date().toISOString().slice(0,10),
      pct:       dayXP.pct,
      xp:        xpDelta,
      hasData:   dayStats.hasData,
      tier:      dayXP.tier?.name || null,
      doneHrs:   dayStats.doneHrs,
      totalHrs:  dayStats.totalHrs,
      finalised: isFinalised,
    }].slice(-90),
  };

  return {
    xpDelta, dayXP, streakResult, newAchievements: newAch, achBonus, events,
    newState: finalState,
    summary: {
      pct:           dayXP.pct,
      tier:          dayXP.tier,
      baseXP:        dayXP.xp,
      streakBonus:   streakResult.positiveBonus,
      streakPenalty,
      achievementXP: achBonus,
      posStreak:     streakResult.posStreak,
      negStreak:     streakResult.negStreak,
      bonusEvents:   streakResult.bonusEvents,
      isFinalised,
    },
  };
}

export const INITIAL_STATE = {
  totalXP: 0, rankIdx: 0, subXP: 0,
  rank: RANKS[0], achievements: [], history: [],
};
