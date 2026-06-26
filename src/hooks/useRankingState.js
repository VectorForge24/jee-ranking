import { useState, useEffect, useCallback, useRef } from 'react';
import { useDriveSync } from './useDriveSync.js';
import { parseDayFromEvents, processDay, INITIAL_STATE, xpToRank } from '../engine/xpEngine.js';
import { generateBots, buildLeaderboard, getPositionDelta } from '../engine/botEngine.js';

function getToday()      { return new Date().toISOString().slice(0,10); }
function getDayOfMonth() { return new Date().getDate(); }
function safeJSON(s, fb) { try { return JSON.parse(s); } catch { return fb; } }

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
  const [trackerMissing, setTrackerMissing] = useState(false);

  const botsRef  = useRef(generateBots(BOT_SEED));
  const initDone = useRef(false);

  const rebuildLeaderboard = useCallback((state, uname, todayXP=0) => {
    const realUser = { id:'real_user', username: uname||'You', totalXP: state.totalXP, todayXP };
    const dayNum   = getDayOfMonth();
    setLeaderboard(buildLeaderboard(botsRef.current, dayNum, realUser, BOT_SEED));
    setPositionDeltas(getPositionDelta(botsRef.current, dayNum, realUser, BOT_SEED));
  }, []);

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

      const uname  = rankingRaw?.username || profile?.given_name || 'You';
      setUsernameState(uname);

      if (!trackerRaw) setTrackerMissing(true);
      else setTrackerMissing(false);
      const events = trackerRaw ? safeJSON(trackerRaw['tracker-events'], []) : [];

      const allDates = [...new Set(
        events.filter(e => !e.allDay && e.start).map(e => e.start.slice(0,10))
      )].sort();

      // Strip today from saved history — always recompute it fresh
      const savedState = rankingRaw?.rankingState;
      let baseState = savedState
        ? { ...savedState, history: (savedState.history||[]).filter(h => h.date !== TODAY) }
        : INITIAL_STATE;

      const processedDates = new Set(baseState.history.map(h => h.date));
      const pastDates      = allDates.filter(d => d < TODAY && !processedDates.has(d));
      // Today is always reprocessed; isFinalised=false so no mid-day penalty
      const datesToRun     = [...pastDates, ...(allDates.includes(TODAY) ? [TODAY] : [])];

      let currentState = baseState;
      let latestResult = null;

      for (const date of datesToRun) {
        const stats       = parseDayFromEvents(events, date);
        if (!stats.hasData) continue;
        const isFinalised = date !== TODAY;  // ← KEY: today is never finalised mid-day
        const result      = processDay(stats, currentState, currentState.history||[], date, isFinalised);
        currentState      = result.newState;

        if (date === TODAY) {
          latestResult = result;
          if (result.events.length > 0) setAnimQueue(result.events);
        }
      }

      if (datesToRun.length > 0) {
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
  const refresh     = useCallback(() => { initDone.current=false; setPhase('idle'); }, []);

  const { rank, subXP } = xpToRank(rankingState.totalXP);
  const userPosition    = leaderboard.find(e => e.id==='real_user')?.position || null;

  return {
    trackerMissing,
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
