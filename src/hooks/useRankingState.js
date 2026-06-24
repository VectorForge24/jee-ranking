/**
 * useRankingState — master app state hook.
 * On mount: reads Drive → processes all historical days → updates rank.
 * Key fix: processes ALL days in tracker history, not just today.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDriveSync } from './useDriveSync.js';
import { parseDayFromEvents, processDay, INITIAL_STATE, xpToRank } from '../engine/xpEngine.js';
import { generateBots, buildLeaderboard, getPositionDelta } from '../engine/botEngine.js';

const TODAY    = new Date().toISOString().slice(0, 10);
const BOT_SEED = 20260601;

function getDayOfMonth() { return new Date().getDate(); }
function safeJSON(str, fb) { try { return JSON.parse(str); } catch { return fb; } }

export function useRankingState() {
  const drive = useDriveSync();

  const [rankingState,    setRankingState]    = useState(INITIAL_STATE);
  const [todayResult,     setTodayResult]     = useState(null);
  const [animQueue,       setAnimQueue]       = useState([]);
  const [leaderboard,     setLeaderboard]     = useState([]);
  const [positionDeltas,  setPositionDeltas]  = useState({});
  const [phase,           setPhase]           = useState('idle');
  const [error,           setError]           = useState(null);
  const [username,        setUsernameState]   = useState('');
  const [userProfile,     setUserProfile]     = useState(null);

  const botsRef = useRef(generateBots(BOT_SEED));
  const initDone = useRef(false);

  // ── Build leaderboard ──────────────────────────────────────────────────────
  const rebuildLeaderboard = useCallback((state, uname, todayXP = 0) => {
    const dayNum = getDayOfMonth();
    const realUser = {
      id: 'real_user',
      username: uname || 'You',
      totalXP: state.totalXP,
      todayXP,
    };
    setLeaderboard(buildLeaderboard(botsRef.current, dayNum, realUser, BOT_SEED));
    setPositionDeltas(getPositionDelta(botsRef.current, dayNum, realUser, BOT_SEED));
  }, []);

  // ── Main init ──────────────────────────────────────────────────────────────
  const initialize = useCallback(async () => {
    if (!drive.token || initDone.current) return;
    initDone.current = true;
    setPhase('loading');
    setError(null);

    try {
      // 1. Fetch profile
      const profile = await drive.fetchProfile(drive.token);
      setUserProfile(profile);

      // 2. Fetch both Drive files in parallel
      const [trackerRaw, rankingRaw] = await Promise.all([
        drive.fetchTrackerData(drive.token),
        drive.fetchRankingData(drive.token),
      ]);

      // 3. Set username
      const uname = rankingRaw?.username || profile?.given_name || 'You';
      setUsernameState(uname);

      // 4. Parse all events from tracker
      const events = trackerRaw ? safeJSON(trackerRaw['tracker-events'], []) : [];

      // 5. Get all unique dates that have timed tasks
      const allDates = [...new Set(
        events
          .filter(e => !e.allDay && e.start)
          .map(e => e.start.slice(0, 10))
      )].sort();

      // 6. Check if we have a saved ranking state with a processed history
      //    If the saved state has already processed these dates, just use it.
      //    Otherwise re-process everything from scratch.
      const savedState   = rankingRaw?.rankingState;
      const processedDates = new Set((savedState?.history || []).map(h => h.date));
      const newDates     = allDates.filter(d => !processedDates.has(d));

      let currentState = savedState || INITIAL_STATE;
      let latestResult = null;

      if (newDates.length > 0) {
        // Process each new date sequentially
        for (const date of newDates) {
          const stats = parseDayFromEvents(events, date);
          if (!stats.hasData) continue;

          const history = currentState.history || [];
          const result  = processDay(stats, currentState, history, date);
          currentState  = result.newState;

          // Track today's result specifically for display
          if (date === TODAY) latestResult = result;

          // Queue rank change animations (only for today)
          if (date === TODAY && result.events.length > 0) {
            setAnimQueue(result.events);
          }
        }

        // Save updated state back to Drive
        await drive.saveRankingData(drive.token, {
          rankingState: currentState,
          username: uname,
        });
      }

      setRankingState(currentState);
      setTodayResult(latestResult);
      rebuildLeaderboard(currentState, uname, latestResult?.xpDelta || 0);
      setPhase('ready');

    } catch (e) {
      console.error('Init error:', e);
      setError(e.message);
      setPhase('error');
      initDone.current = false; // allow retry
    }
  }, [drive.token]);

  useEffect(() => {
    if (drive.isLoggedIn && drive.token && phase === 'idle') {
      initialize();
    }
  }, [drive.isLoggedIn, drive.token, phase, initialize]);

  // ── Save username ──────────────────────────────────────────────────────────
  const setUsername = useCallback(async (name) => {
    setUsernameState(name);
    if (drive.token) {
      await drive.saveRankingData(drive.token, { rankingState, username: name });
    }
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
    phase, error,
    isSyncing: drive.isSyncing,
    rankingState, rank, subXP,
    todayResult,
    leaderboard, positionDeltas, userPosition,
    animQueue, consumeAnim,
    refresh,
  };
}
