/**
 * Bot Engine — generates and simulates 499 fake JEE students.
 * Uses a seeded PRNG so bots are deterministic per day (same seed = same result).
 * No external dependencies.
 */

import { RANKS, xpToRank, XP_PER_SUBRANK } from './xpEngine.js';

// ─── Seeded PRNG (Mulberry32) ──────────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seededRNG(seed) {
  const rand = mulberry32(seed);
  return {
    float:  ()        => rand(),
    range:  (lo, hi)  => lo + rand() * (hi - lo),
    int:    (lo, hi)  => Math.floor(lo + rand() * (hi - lo + 1)),
    pick:   (arr)     => arr[Math.floor(rand() * arr.length)],
    gauss:  (mean, sd) => {
      // Box-Muller
      const u1 = Math.max(1e-10, rand());
      const u2 = rand();
      return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    },
  };
}

// ─── Name pools (Indian JEE aspirant names) ───────────────────────────────────
const FIRST_NAMES = [
  'Arjun','Rohan','Aditya','Rahul','Vikram','Karan','Siddharth','Nikhil',
  'Ankit','Aman','Harsh','Prateek','Kunal','Shubham','Akash','Tushar',
  'Deepak','Gaurav','Mohit','Varun','Rishi','Ishan','Pranav','Devesh',
  'Ayush','Abhishek','Sachin','Vivek','Parth','Yash','Dhruv','Kartik',
  'Tanmay','Shreyas','Mihir','Neeraj','Shivam','Lakshay','Rishabh','Mayank',
  'Priya','Anjali','Sneha','Divya','Pooja','Neha','Riya','Kavya',
  'Shreya','Ananya','Ishita','Sanya','Kritika','Aditi','Tanvi','Nidhi',
  'Simran','Poonam','Swati','Meghna','Krati','Harshita','Dipika','Tanya',
  'Navya','Aishwarya','Sonam','Surbhi','Vrinda','Monika','Pallavi','Shivani',
  'Niharika','Aparna','Bhavna','Ruhi','Sakshi','Ridhi','Mansi','Charu',
];
const LAST_NAMES = [
  'Sharma','Singh','Verma','Gupta','Kumar','Mishra','Tiwari','Yadav',
  'Agarwal','Joshi','Pandey','Srivastava','Chauhan','Mehta','Patel',
  'Nair','Pillai','Menon','Reddy','Rao','Iyer','Krishnan','Venkat',
  'Dubey','Chaudhary','Bansal','Goel','Bajaj','Kapoor','Malhotra',
  'Saxena','Tripathi','Shukla','Dwivedi','Upadhyay','Kulkarni','Desai',
  'Jain','Shah','Bose','Chatterjee','Ghosh','Mukherjee','Dutta',
];
const SUFFIXES = ['26','27','JEE','IIT','Phy','Math','Chem','Pro','XP','V2','_1'];

// ─── Bot persona archetypes ────────────────────────────────────────────────────
const ARCHETYPES = [
  // [weight, name, meanXP/day, stddev, badDayChance]
  { weight: 0.40, name: 'Grinder',    mean: 850,  sd: 180, badDay: 0.08 },
  { weight: 0.25, name: 'Consistent', mean: 700,  sd: 120, badDay: 0.06 },
  { weight: 0.15, name: 'Rocket',     mean: 1100, sd: 300, badDay: 0.20 },
  { weight: 0.10, name: 'Slacker',    mean: 400,  sd: 250, badDay: 0.35 },
  { weight: 0.10, name: 'Elite',      mean: 1250, sd: 200, badDay: 0.05 },
];

function pickArchetype(rng) {
  const r = rng.float();
  let cumulative = 0;
  for (const a of ARCHETYPES) {
    cumulative += a.weight;
    if (r < cumulative) return a;
  }
  return ARCHETYPES[0];
}

// ─── Bot generation ───────────────────────────────────────────────────────────

/**
 * Generate 499 bots deterministically from a base seed.
 * Each bot gets: id, username, archetype, startingXP
 */
export function generateBots(baseSeed = 42) {
  const rng = seededRNG(baseSeed);
  const bots = [];

  for (let i = 0; i < 499; i++) {
    const firstName = rng.pick(FIRST_NAMES);
    const lastName  = rng.pick(LAST_NAMES);
    const suffix    = rng.pick(SUFFIXES);
    const username  = `${firstName}${lastName.slice(0, 3)}${suffix}`;
    const archetype = pickArchetype(rng);

    // Starting XP: distributed so most start at 0 at month beginning
    // (spread across Bronze/Silver for realism after a few days have passed)
    const startingXP = 0;

    bots.push({
      id:        `bot_${i}`,
      username,
      firstName,
      lastName,
      archetype: archetype.name,
      startingXP,
      isBot:     true,
    });
  }

  return bots;
}

/**
 * Simulate XP for a bot for a specific day number (1-based).
 * Uses (baseSeed + botIndex + dayNumber) as seed → deterministic per bot per day.
 */
export function simulateBotDay(bot, dayNumber, baseSeed = 42) {
  const seed = baseSeed + parseInt(bot.id.replace('bot_', '')) * 1000 + dayNumber;
  const rng = seededRNG(seed);

  const archetype = ARCHETYPES.find(a => a.name === bot.archetype) || ARCHETYPES[0];

  // Determine if today is a bad day
  const isBadDay = rng.float() < archetype.badDay;

  let xpDelta;
  if (isBadDay) {
    // Bad day: 0 to -600
    xpDelta = Math.round(rng.range(-600, 0));
  } else {
    // Normal day: Gaussian around archetype mean
    xpDelta = Math.round(rng.gauss(archetype.mean, archetype.sd));
    xpDelta = Math.max(0, Math.min(xpDelta, 2100)); // clamp to realistic max
  }

  return xpDelta;
}

/**
 * Get total XP for a bot from day 1 up to (and including) dayNumber.
 */
export function getBotTotalXP(bot, dayNumber, baseSeed = 42) {
  let total = bot.startingXP;
  for (let d = 1; d <= dayNumber; d++) {
    total += simulateBotDay(bot, d, baseSeed);
    total = Math.max(0, total); // can't go below 0
  }
  return total;
}

/**
 * Build the full leaderboard for a given day.
 * @param {Array}  bots       - from generateBots()
 * @param {number} dayNumber  - which day of the month (1-31)
 * @param {object} realUser   - { id, username, totalXP }
 * @param {number} baseSeed
 * @returns {Array} sorted leaderboard entries
 */
export function buildLeaderboard(bots, dayNumber, realUser, baseSeed = 42) {
  const entries = bots.map(bot => {
    const totalXP = getBotTotalXP(bot, dayNumber, baseSeed);
    const { rank, subXP } = xpToRank(totalXP);
    return {
      id:       bot.id,
      username: bot.username,
      totalXP,
      rank,
      subXP,
      isBot:    true,
      // XP gained today
      todayXP:  simulateBotDay(bot, dayNumber, baseSeed),
    };
  });

  // Add real user
  const { rank: userRank, subXP: userSubXP } = xpToRank(realUser.totalXP);
  entries.push({
    id:       realUser.id,
    username: realUser.username,
    totalXP:  realUser.totalXP,
    rank:     userRank,
    subXP:    userSubXP,
    isBot:    false,
    todayXP:  realUser.todayXP || 0,
    isRealUser: true,
  });

  // Sort descending by totalXP
  entries.sort((a, b) => b.totalXP - a.totalXP);

  // Add rank position
  entries.forEach((e, i) => { e.position = i + 1; });

  return entries;
}

/**
 * Get leaderboard delta (position change from yesterday).
 */
export function getPositionDelta(bots, dayNumber, realUser, baseSeed = 42) {
  if (dayNumber <= 1) return {};
  const today     = buildLeaderboard(bots, dayNumber,     realUser, baseSeed);
  const yesterday = buildLeaderboard(bots, dayNumber - 1, realUser, baseSeed);

  const prevPositions = {};
  yesterday.forEach(e => { prevPositions[e.id] = e.position; });

  const deltas = {};
  today.forEach(e => {
    const prev = prevPositions[e.id];
    deltas[e.id] = prev !== undefined ? prev - e.position : 0; // positive = moved up
  });

  return deltas;
}
