/**
 * useRankingState — master state hook.
 *
 * Today XP fix:
 * - Always re-process TODAY regardless of whether it's in processedDates.
 *   Tasks get checked off throughout the day, so today's result changes constantly.
 * - Strip today from saved history, recompute it fresh every load.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDriveSync } from './useDriveSync.js';
import { parseDayFromEvents, processDay, INITIAL_STATE, xpToRank } from '../engine/xpEngine.js';
import { generateBots, buildLeaderboard, getPositionDelta } from '../engine/botEngine.js';

// Recomputed fresh each load — no stale module-level const
function getToday() { return new Date().toISOString().slice(0, 10); }
function getDayOfMonth() { return new Date().getDate(); }
function safeJSON(str, fb) { try { return JSON.parse(str); } catch { return fb; } }

const BOT_SEED = 20260601;

export function useRankingState() {
  const drive = useDriveSync();

  const [rankingState,   setRankingState]   = useState(INITIAL_STATE);
  const [todayResult,    setTodayResult]    = useState(null);
  const [animQueue,      setAnimQueue]      = useState([]);
  const [leaderboard,    setLeaderboard]    = useState([]);
  const [positionDeltas, setPositionDeltas] = useState({});
  const [phase,          setPhase]          = useState('idle');
  const [error,          setError]          = useState(null);
  const [username,       setUsernameState]  = useState('');
  const [userProfile,    setUserProfile]    = useState(null);

  const botsRef  = useRef(generateBots(BOT_SEED));
  const initDone = useRef(false);

  // ── Leaderboard builder ───────────────────────────────────────────────────
  const rebuildLeaderboard = useCallback((state, uname, todayXP = 0) => {
    const realUser = { id:'real_user', username: uname || 'You', totalXP: state.totalXP, todayXP };
    const dayNum   = getDayOfMonth();
    setLeaderboard(buildLeaderboard(botsRef.current, dayNum, realUser, BOT_SEED));
    setPositionDeltas(getPositionDelta(botsRef.current, dayNum, realUser, BOT_SEED));
  }, []);

  // ── Main initialize ───────────────────────────────────────────────────────
  const initialize = useCallback(async () => {
    if (!drive.token || initDone.current) return;
    initDone.current = true;
    setPhase('loading');
    setError(null);

    const TODAY = getToday();

    try {
      const profile = await drive.fetchProfile();
      setUserProfile(profile);

      const [trackerRaw, rankingRaw] = await Promise.all([
        drive.fetchTrackerData(),
        drive.fetchRankingData(),
      ]);

      const uname = rankingRaw?.username || profile?.given_name || 'You';
      setUsernameState(uname);

      const events = trackerRaw ? safeJSON(trackerRaw['tracker-events'], []) : [];

      // All dates with timed events
      const allDates = [...new Set(
        events.filter(e => !e.allDay && e.start).map(e => e.start.slice(0, 10))
      )].sort();

      // Load saved state, but STRIP today from saved history so we always recompute it
      const savedState = rankingRaw?.rankingState;
      let baseState = savedState
        ? {
            ...savedState,
            history: (savedState.history || []).filter(h => h.date !== TODAY),
          }
        : INITIAL_STATE;

      // Dates already processed (excluding today — always recompute)
      const processedDates = new Set(baseState.history.map(h => h.date));

      // Dates to process: past unprocessed + always today
      const pastDates  = allDates.filter(d => d < TODAY && !processedDates.has(d));
      const datesToRun = [...pastDates, ...(allDates.includes(TODAY) ? [TODAY] : [])];

      let currentState = baseState;
      let latestResult = null;

      for (const date of datesToRun) {
        const stats = parseDayFromEvents(events, date);
        if (!stats.hasData) continue;

        const result = processDay(stats, currentState, currentState.history || [], date);
        currentState = result.newState;

        if (date === TODAY) {
          latestResult = result;
          if (result.events.length > 0) setAnimQueue(result.events);
        }
      }

      // Save if anything changed
      const hasChanges = datesToRun.length > 0;
      if (hasChanges) {
        await drive.saveRankingData({ rankingState: currentState, username: uname });
      }

      setRankingState(currentState);
      setTodayResult(latestResult);
      rebuildLeaderboard(currentState, uname, latestResult?.xpDelta || 0);
      setPhase('ready');

    } catch (e) {
      console.error('Init error:', e);
      setError(e.message);
      setPhase('error');
      initDone.current = false;
    }
  }, [drive.token]);

  useEffect(() => {
    if (drive.isLoggedIn && drive.token && phase === 'idle') initialize();
  }, [drive.isLoggedIn, drive.token, phase, initialize]);

  const setUsername = useCallback(async (name) => {
    setUsernameState(name);
    if (drive.token) await drive.saveRankingData({ rankingState, username: name });
    rebuildLeaderboard(rankingState, name, todayResult?.xpDelta || 0);
  }, [drive, rankingState, todayResult, rebuildLeaderboard]);

  const consumeAnim = useCallback(() => setAnimQueue(q => q.slice(1)), []);

  const refresh = useCallback(() => {
    initDone.current = false;
    setPhase('idle');
  }, []);

  const { rank, subXP } = xpToRank(rankingState.totalXP);
  const userPosition = leaderboard.find(e => e.id === 'real_user')?.position || null;

  return {
    isLoggedIn: drive.isLoggedIn,
    loginWithGoogle: drive.loginWithGoogle,
    logout: drive.logout,
    userProfile, username, setUsername,
    phase, error, isSyncing: drive.isSyncing, syncError: drive.syncError,
    rankingState, rank, subXP, todayResult,
    leaderboard, positionDeltas, userPosition,
    animQueue, consumeAnim, refresh,
  };
}
