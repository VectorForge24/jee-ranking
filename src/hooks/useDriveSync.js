/**
 * useDriveSync — with silent popup re-auth.
 *
 * Token problem: Google implicit flow tokens expire after 1 hour.
 * Solution: instead of a full page redirect (which loses state + forces re-login UX),
 * we open a tiny popup window for silent re-auth. Since the user already consented,
 * Google closes it instantly and postMessages the new token back.
 * Zero disruption — user never sees a login page again after the first login.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

const TRACKER_FILE = 'jee_tracker_backup.json';
const RANKING_FILE = 'jee_ranking_data.json';
const CLIENT_ID    = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || window.location.origin;
const EXPIRY_BUFFER = 3 * 60 * 1000; // treat token as expired 3 min early

// ── Token storage helpers ─────────────────────────────────────────────────────
function saveToken(accessToken, expiresInSec) {
  const expiry = Date.now() + expiresInSec * 1000;
  localStorage.setItem('ranking_token',  accessToken);
  localStorage.setItem('ranking_expiry', String(expiry));
  localStorage.setItem('ranking_loggedin', 'true');
}

function loadToken() {
  const token  = localStorage.getItem('ranking_token');
  const expiry = parseInt(localStorage.getItem('ranking_expiry') || '0', 10);
  if (!token || Date.now() >= expiry - EXPIRY_BUFFER) return null;
  return token;
}

function clearToken() {
  localStorage.removeItem('ranking_token');
  localStorage.removeItem('ranking_expiry');
  localStorage.removeItem('ranking_loggedin');
}

function buildAuthUrl(redirectUri) {
  const scope = encodeURIComponent(
    'https://www.googleapis.com/auth/drive.appdata ' +
    'https://www.googleapis.com/auth/userinfo.profile'
  );
  return (
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=token` +
    `&scope=${scope}` +
    `&prompt=none`   // ← silent: skip consent screen if already approved
  );
}

// ── Drive API helpers ─────────────────────────────────────────────────────────
async function driveSearch(token, name) {
  const r = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${name}'&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (r.status === 401) throw new Error('TOKEN_EXPIRED');
  const d = await r.json();
  return d.files?.[0]?.id || null;
}

async function driveDownload(token, fileId) {
  const r = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (r.status === 401) throw new Error('TOKEN_EXPIRED');
  if (!r.ok) throw new Error(`Download ${r.status}`);
  return r.json();
}

async function driveCreate(token, name) {
  const r = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parents: ['appDataFolder'] }),
  });
  if (r.status === 401) throw new Error('TOKEN_EXPIRED');
  const d = await r.json();
  return d.id;
}

async function driveUpload(token, fileId, content) {
  const r = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    }
  );
  if (r.status === 401) throw new Error('TOKEN_EXPIRED');
  if (!r.ok) throw new Error(`Upload ${r.status}`);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useDriveSync() {
  const [token,      setToken]      = useState(() => loadToken());
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!loadToken());
  const [isSyncing,  setIsSyncing]  = useState(false);
  const [syncError,  setSyncError]  = useState(null);
  const refreshingRef = useRef(false);  // prevent concurrent refresh attempts
  const popupRef      = useRef(null);

  // ── Silent popup re-auth ──────────────────────────────────────────────────
  // Opens a popup, Google redirects to REDIRECT_URI with the new token in the hash.
  // Our main page catches the postMessage and extracts the token.
  const silentRefresh = useCallback(() => {
    return new Promise((resolve) => {
      if (refreshingRef.current) { resolve(null); return; }
      refreshingRef.current = true;

      // Close any existing popup
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }

      // Open tiny popup — prompt=none means it closes instantly if already consented
      const popup = window.open(
        buildAuthUrl(REDIRECT_URI),
        'oauth_refresh',
        'width=500,height=600,left=200,top=100'
      );
      popupRef.current = popup;

      const timeout = setTimeout(() => {
        refreshingRef.current = false;
        if (!popup?.closed) popup?.close();
        resolve(null); // timed out — user needs full login
      }, 15000);

      // Listen for message from popup (sent by the redirect page)
      const onMessage = (event) => {
        if (event.origin !== window.location.origin) return;
        if (!event.data?.ranking_token) return;

        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        refreshingRef.current = false;
        popup?.close();

        const { ranking_token, expires_in } = event.data;
        saveToken(ranking_token, expires_in || 3600);
        setToken(ranking_token);
        setIsLoggedIn(true);
        resolve(ranking_token);
      };

      window.addEventListener('message', onMessage);

      // If popup was blocked, fall back gracefully
      if (!popup || popup.closed) {
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        refreshingRef.current = false;
        resolve(null);
      }
    });
  }, []);

  // ── Get a valid token — refreshes silently if expired ────────────────────
  const getValidToken = useCallback(async () => {
    const cached = loadToken();
    if (cached) return cached;

    // Token expired — try silent refresh
    const fresh = await silentRefresh();
    return fresh; // null if refresh failed (user must full-login)
  }, [silentRefresh]);

  // ── Catch token from URL hash (first login OR redirect fallback) ──────────
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('access_token=')) return;
    const params     = new URLSearchParams(hash.replace('#', '?'));
    const at         = params.get('access_token');
    const expiresIn  = parseInt(params.get('expires_in') || '3600', 10);
    if (!at) return;

    saveToken(at, expiresIn);
    setToken(at);
    setIsLoggedIn(true);
    window.history.replaceState(null, '', window.location.pathname);

    // If this page was opened as a popup (the silent refresh popup),
    // send the token back to the opener and close ourselves
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { ranking_token: at, expires_in: expiresIn },
        window.location.origin
      );
      window.close();
    }
  }, []);

  // ── Proactive expiry check every 5 minutes ────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(async () => {
      const expiry = parseInt(localStorage.getItem('ranking_expiry') || '0', 10);
      const timeLeft = expiry - Date.now();
      // When <10 minutes left, silently refresh before it expires
      if (timeLeft < 10 * 60 * 1000 && timeLeft > 0) {
        console.log('⏰ Token expiring soon, refreshing silently...');
        await silentRefresh();
      }
    }, 5 * 60 * 1000); // check every 5 minutes
    return () => clearInterval(interval);
  }, [isLoggedIn, silentRefresh]);

  // ── API methods ───────────────────────────────────────────────────────────
  const withToken = useCallback(async (fn) => {
    const t = await getValidToken();
    if (!t) {
      setSyncError('Session expired — please sign in again');
      setIsLoggedIn(false);
      return null;
    }
    try {
      return await fn(t);
    } catch (e) {
      if (e.message === 'TOKEN_EXPIRED') {
        // Try one silent refresh then retry
        const fresh = await silentRefresh();
        if (fresh) {
          try { return await fn(fresh); } catch {}
        }
        setSyncError('Session expired — please sign in again');
        setIsLoggedIn(false);
        clearToken();
        setToken(null);
      } else {
        setSyncError(e.message);
      }
      return null;
    }
  }, [getValidToken, silentRefresh]);

  const fetchProfile = useCallback((t) =>
    withToken(async (tok) => {
      const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tok}` }
      });
      return r.ok ? r.json() : null;
    }), [withToken]);

  const fetchTrackerData = useCallback(() =>
    withToken(async (tok) => {
      const id = await driveSearch(tok, TRACKER_FILE);
      if (!id) return null;
      return driveDownload(tok, id);
    }), [withToken]);

  const fetchRankingData = useCallback(() =>
    withToken(async (tok) => {
      const id = await driveSearch(tok, RANKING_FILE);
      if (!id) return null;
      return driveDownload(tok, id);
    }), [withToken]);

  const saveRankingData = useCallback((data) => {
    setIsSyncing(true);
    return withToken(async (tok) => {
      let id = await driveSearch(tok, RANKING_FILE);
      if (!id) id = await driveCreate(tok, RANKING_FILE);
      await driveUpload(tok, id, { ...data, _saved: new Date().toISOString() });
    }).finally(() => setIsSyncing(false));
  }, [withToken]);

  const loginWithGoogle = useCallback(() => {
    if (!CLIENT_ID) { alert('Google Client ID missing — check Vercel env vars'); return; }
    // Full redirect login (first time, or if popup blocked)
    const scope = encodeURIComponent(
      'https://www.googleapis.com/auth/drive.appdata ' +
      'https://www.googleapis.com/auth/userinfo.profile'
    );
    window.location.href =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=token` +
      `&scope=${scope}` +
      `&prompt=consent`;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setIsLoggedIn(false);
    setSyncError(null);
  }, []);

  return {
    token, isLoggedIn, isSyncing, syncError,
    loginWithGoogle, logout,
    fetchProfile, fetchTrackerData, fetchRankingData, saveRankingData,
  };
}
