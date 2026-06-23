/**
 * useRankingState — master hook for all ranking app state.
 * Orchestrates: Drive sync → parse tracker data → XP engine → leaderboard.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDriveSync } from './useDriveSync.js';
import {
  parseDayFromEvents,
  processDay,
  INITIAL_STATE,
  xpToRank,
} from '../engine/xpEngine.js';
import {
  generateBots,
  buildLeaderboard,
  getPositionDelta,
} from '../engine/botEngine.js';

const TODAY = new Date().toISOString().slice(0, 10);
const BOT_SEED = 20260601; // Fixed seed for this month's bots

// Day number within month (1-based)
function getDayOfMonth() {
  return new Date().getDate();
}

export function useRankingState() {
  const drive = useDriveSync();

  // Core ranking state (persisted to Drive)
  const [rankingState, setRankingState] = useState(INITIAL_STATE);

  // Today's tracker parse result
  const [todayStats, setTodayStats] = useState(null);

  // Today's XP result (after processing)
  const [todayResult, setTodayResult] = useState(null);

  // Pending animation events queue
  const [animQueue, setAnimQueue] = useState([]);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);
  const [positionDeltas, setPositionDeltas] = useState({});

  // UI state
  const [phase, setPhase] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);

  // Username (can be set by user, falls back to Google name)
  const [username, setUsernameState] = useState('');

  // Bots (stable, generated once)
  const botsRef = useRef(generateBots(BOT_SEED));

  // ── Initialize after login ──────────────────────────────────────────────────
  const initialize = useCallback(async () => {
    if (!drive.token) return;
    setPhase('loading');
    setError(null);

    try {
      const { profile, trackerRaw, rankingRaw } = await drive.initAfterLogin(drive.token);

      // Set username
      const savedUsername = rankingRaw?.username || profile?.given_name || 'You';
      setUsernameState(savedUsername);

      // Load or init ranking state
      const loadedState = rankingRaw?.rankingState || INITIAL_STATE;
      setRankingState(loadedState);

      // Parse today's tasks from tracker
      if (trackerRaw) {
        const events = safeParseJSON(trackerRaw['tracker-events'], []);
        const stats = parseDayFromEvents(events, TODAY);
        setTodayStats(stats);

        // Check if we've already processed today
        const alreadyProcessed = loadedState.history?.some(h => h.date === TODAY);

        if (!alreadyProcessed && stats.hasData) {
          // Process the day — compute XP and update rank
          const history = loadedState.history || [];
          const result = processDay(stats, loadedState, history);

          setTodayResult(result);
          setRankingState(result.newState);

          // Queue animations
          if (result.events.length > 0) {
            setAnimQueue(result.events);
          }

          // Save updated state to Drive
          await drive.saveRankingData(drive.token, {
            rankingState: result.newState,
            username: savedUsername,
            userId: profile?.id,
          });
        }
      }

      // Build leaderboard
      rebuildLeaderboard(loadedState, savedUsername);

      setPhase('ready');
    } catch (e) {
      console.error('Init error:', e);
      setError(e.message);
      setPhase('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drive.token]);

  // ── Rebuild leaderboard ────────────────────────────────────────────────────
  const rebuildLeaderboard = useCallback((state, uname) => {
    const dayNum = getDayOfMonth();
    const realUser = {
      id:       'real_user',
      username: uname,
      totalXP:  state.totalXP,
      todayXP:  state.history?.find(h => h.date === TODAY)?.xp || 0,
    };
    const lb = buildLeaderboard(botsRef.current, dayNum, realUser, BOT_SEED);
    const deltas = getPositionDelta(botsRef.current, dayNum, realUser, BOT_SEED);
    setLeaderboard(lb);
    setPositionDeltas(deltas);
  }, []);

  // ── Auto-init when token available ─────────────────────────────────────────
  useEffect(() => {
    if (drive.isLoggedIn && drive.token && phase === 'idle') {
      initialize();
    }
  }, [drive.isLoggedIn, drive.token, phase, initialize]);

  // ── Save username ──────────────────────────────────────────────────────────
  const setUsername = useCallback(async (newName) => {
    setUsernameState(newName);
    if (drive.token) {
      await drive.saveRankingData(drive.token, {
        rankingState,
        username: newName,
      });
    }
  }, [drive, rankingState]);

  // ── Consume animation from queue ───────────────────────────────────────────
  const consumeAnim = useCallback(() => {
    setAnimQueue(q => q.slice(1));
  }, []);

  // ── Manual refresh (re-read Drive) ────────────────────────────────────────
  const refresh = useCallback(() => {
    setPhase('idle');
    setTimeout(initialize, 100);
  }, [initialize]);

  // ── Current rank derived values ────────────────────────────────────────────
  const { rank, subXP } = xpToRank(rankingState.totalXP);
  const userPosition = leaderboard.find(e => e.id === 'real_user')?.position || null;

  return {
    // Auth
    isLoggedIn:    drive.isLoggedIn,
    loginWithGoogle: drive.loginWithGoogle,
    logout:        drive.logout,
    userProfile:   drive.userProfile,
    username,
    setUsername,

    // State
    phase,
    error,
    isSyncing: drive.isSyncing,
    syncError: drive.syncError,

    // Ranking
    rankingState,
    rank,
    subXP,
    todayStats,
    todayResult,

    // Leaderboard
    leaderboard,
    positionDeltas,
    userPosition,

    // Animations
    animQueue,
    consumeAnim,

    // Actions
    refresh,
  };
}

function safeParseJSON(str, fallback) {
  try { return JSON.parse(str); }
  catch { return fallback; }
}
