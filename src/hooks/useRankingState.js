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
  // Always-current mirror of rankingState. Fixes a real race: setUsername
  // used to close over `rankingState` directly, which could be stale if it
  // fired while initialize()'s async reset/save was still in flight —
  // writing an old copy of rankingState to Firestore and silently
  // clobbering a just-completed reset. Reading from this ref instead
  // guarantees every write uses whatever the actual latest state is,
  // regardless of timing.
  const rankingStateRef = useRef(rankingState);
  useEffect(() => { rankingStateRef.current = rankingState; }, [rankingState]);
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

      // ── Monthly rank reset ────────────────────────────────────────────────
      // Ranking is a per-month competition (the bot leaderboard already
      // reseeds every month based on day-of-month). Without this check, a
      // saved state from a prior month just keeps accumulating XP forever.
      //
      // IMPORTANT: this checks _monthResetAt (a marker written the moment
      // a reset actually fires) as the authoritative signal, NOT just
      // "is the most recent history entry from this month" — that check
      // is fragile: if the app was opened even once in the new month
      // before totalXP had actually been reset, a single current-month
      // history entry would sit on top of still-unreset totalXP, and
      // "last entry is this month" would look like "already reset" and
      // skip the real reset forever. _monthResetAt only flips once the
      // reset genuinely happens, so it can't be fooled by activity alone.
      const currentMonthKey = TODAY.slice(0,7); // "YYYY-MM"
      let monthResetFired = false;

      if (savedState) {
        const alreadyResetThisMonth = savedState._monthResetAt?.slice(0,7) === currentMonthKey;

        if (!alreadyResetThisMonth) {
          // Either never reset before (pre-fix state), or last reset was a
          // prior month. Either way, this month needs a fresh reset —
          // provided there's actually a prior month's XP to reset FROM.
          const hasOlderActivity = savedState.history?.some(h => h.date && h.date.slice(0,7) !== currentMonthKey);
          const hasNoResetMarkerButHasXP = !savedState._monthResetAt && (savedState.totalXP || 0) > 0;

          if (hasOlderActivity || hasNoResetMarkerButHasXP) {
            baseState = {
              ...INITIAL_STATE,
              achievements: savedState.achievements || [],
              history: savedState.history || [],
              _monthResetAt: TODAY,
            };
            monthResetFired = true;
          }
        }
      }

      const processedDates = new Set(baseState.history.map(h => h.date));
      // Only reprocess dates WITHIN THE CURRENT MONTH — a prior month's days
      // are already reflected in history and must not re-contribute XP to
      // this month's fresh rank after a reset.
      const pastDates       = allDates.filter(d => d < TODAY && d.slice(0,7) === currentMonthKey && !processedDates.has(d));
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

      if (datesToRun.length > 0 || monthResetFired) {
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
    const latest = rankingStateRef.current;
    if (drive.token) await drive.saveRankingData({ rankingState: latest, username: name });
    rebuildLeaderboard(latest, name, todayResult?.xpDelta || 0);
  }, [drive, todayResult, rebuildLeaderboard]);

  const consumeAnim = useCallback(() => setAnimQueue(q => q.slice(1)), []);
  const refresh     = useCallback(() => { initDone.current=false; setPhase('idle'); }, []);

  const { rank, subXP } = xpToRank(rankingState.totalXP);
  const userPosition    = leaderboard.find(e => e.id==='real_user')?.position || null;

  return {
    trackerMissing,
    isLoggedIn: drive.isLoggedIn,
    authChecked: drive.authChecked,
    loginWithGoogle: drive.loginWithGoogle,
    logout: drive.logout,
    userProfile, username, setUsername,
    phase, error, isSyncing: drive.isSyncing, syncError: drive.syncError,
    rankingState, rank, subXP, todayResult,
    leaderboard, positionDeltas, userPosition,
    animQueue, consumeAnim, refresh,
  };
}
