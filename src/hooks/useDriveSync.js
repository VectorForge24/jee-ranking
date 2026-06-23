/**
 * useDriveSync — handles all Google Drive operations for the ranking app.
 *
 * Two files in appDataFolder:
 *   jee_tracker_backup.json  → READ ONLY (your existing tracker data)
 *   jee_ranking_data.json    → READ + WRITE (ranking state, owned by this app)
 *
 * Auth: implicit flow (same as tracker) — token from URL hash on redirect.
 * Scope: drive.appdata (same project, same consent screen)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { INITIAL_STATE } from '../engine/xpEngine.js';

const TRACKER_FILE  = 'jee_tracker_backup.json';
const RANKING_FILE  = 'jee_ranking_data.json';
const REDIRECT_URI  = import.meta.env.VITE_REDIRECT_URI || window.location.origin;
const CLIENT_ID     = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const DRIVE_FILES_URL  = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function driveSearch(token, fileName) {
  const res = await fetch(
    `${DRIVE_FILES_URL}?spaces=appDataFolder&q=name='${fileName}'&fields=files(id,name,modifiedTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Drive search failed: ${res.status}`);
  const data = await res.json();
  return data.files?.[0] || null;
}

async function driveDownload(token, fileId) {
  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
  return res.json();
}

async function driveCreate(token, fileName) {
  const res = await fetch(DRIVE_FILES_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fileName, parents: ['appDataFolder'] }),
  });
  if (!res.ok) throw new Error(`Drive create failed: ${res.status}`);
  const data = await res.json();
  return data.id;
}

async function driveUpload(token, fileId, content) {
  const res = await fetch(`${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  });
  if (!res.ok) throw new Error(`Drive upload failed: ${res.status}`);
  return res.json();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDriveSync() {
  const [token,      setToken]      = useState(() => sessionStorage.getItem('ranking_token') || null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!sessionStorage.getItem('ranking_token'));
  const [isSyncing,  setIsSyncing]  = useState(false);
  const [userProfile, setUserProfile] = useState(() => {
    const saved = sessionStorage.getItem('ranking_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [syncError,  setSyncError]  = useState(null);

  // ── Fetch user profile from Google ─────────────────────────────────────────
  const fetchProfile = useCallback(async (accessToken) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) return null;
      const profile = await res.json();
      sessionStorage.setItem('ranking_profile', JSON.stringify(profile));
      setUserProfile(profile);
      return profile;
    } catch { return null; }
  }, []);

  // ── Read tracker JSON (your existing data, read-only) ──────────────────────
  const fetchTrackerData = useCallback(async (accessToken) => {
    try {
      const file = await driveSearch(accessToken, TRACKER_FILE);
      if (!file) return null;
      const data = await driveDownload(accessToken, file.id);
      return data; // raw backup object with tracker-events etc.
    } catch (e) {
      console.error('Tracker fetch error:', e);
      setSyncError('Could not read tracker data from Drive');
      return null;
    }
  }, []);

  // ── Read ranking state ─────────────────────────────────────────────────────
  const fetchRankingData = useCallback(async (accessToken) => {
    try {
      const file = await driveSearch(accessToken, RANKING_FILE);
      if (!file) return null;
      return driveDownload(accessToken, file.id);
    } catch (e) {
      console.error('Ranking fetch error:', e);
      return null;
    }
  }, []);

  // ── Save ranking state ─────────────────────────────────────────────────────
  const saveRankingData = useCallback(async (accessToken, rankingState) => {
    if (!accessToken) return false;
    setIsSyncing(true);
    setSyncError(null);
    try {
      let file = await driveSearch(accessToken, RANKING_FILE);
      let fileId = file?.id;
      if (!fileId) fileId = await driveCreate(accessToken, RANKING_FILE);
      await driveUpload(accessToken, fileId, {
        ...rankingState,
        _lastSaved: new Date().toISOString(),
        _version: 1,
      });
      return true;
    } catch (e) {
      console.error('Ranking save error:', e);
      setSyncError('Could not save ranking data to Drive');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ── Full init on login: fetch both files ───────────────────────────────────
  const initAfterLogin = useCallback(async (accessToken) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const [profile, trackerRaw, rankingRaw] = await Promise.all([
        fetchProfile(accessToken),
        fetchTrackerData(accessToken),
        fetchRankingData(accessToken),
      ]);
      return { profile, trackerRaw, rankingRaw };
    } catch (e) {
      setSyncError('Initialization failed');
      return { profile: null, trackerRaw: null, rankingRaw: null };
    } finally {
      setIsSyncing(false);
    }
  }, [fetchProfile, fetchTrackerData, fetchRankingData]);

  // ── OAuth token capture from URL hash ──────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('access_token=')) return;

    const params = new URLSearchParams(hash.replace('#', '?'));
    const accessToken = params.get('access_token');
    if (!accessToken) return;

    sessionStorage.setItem('ranking_token', accessToken);
    setToken(accessToken);
    setIsLoggedIn(true);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(() => {
    if (!CLIENT_ID) {
      alert('Google Client ID not configured. Check your .env file.');
      return;
    }
    const scope = encodeURIComponent(
      'https://www.googleapis.com/auth/drive.appdata ' +
      'https://www.googleapis.com/auth/userinfo.profile ' +
      'https://www.googleapis.com/auth/userinfo.email'
    );
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=token` +
      `&scope=${scope}` +
      `&prompt=consent`;
    window.location.href = authUrl;
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    sessionStorage.removeItem('ranking_token');
    sessionStorage.removeItem('ranking_profile');
    setToken(null);
    setIsLoggedIn(false);
    setUserProfile(null);
  }, []);

  return {
    token,
    isLoggedIn,
    isSyncing,
    syncError,
    userProfile,
    loginWithGoogle,
    logout,
    initAfterLogin,
    fetchTrackerData,
    fetchRankingData,
    saveRankingData,
  };
}
