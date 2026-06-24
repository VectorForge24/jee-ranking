/**
 * useDriveSync — mirrors the tracker's exact auth pattern.
 * Token stored in localStorage (same as tracker) so login persists across sessions.
 * Reads jee_tracker_backup.json from appDataFolder (same file tracker writes to).
 * Writes jee_ranking_data.json to appDataFolder (separate, never touches tracker data).
 */

import { useState, useCallback, useEffect } from 'react';

const TRACKER_FILE = 'jee_tracker_backup.json';
const RANKING_FILE = 'jee_ranking_data.json';

const CLIENT_ID    = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || window.location.origin;

export function useDriveSync() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('ranking_loggedin') === 'true');
  const [token,      setToken]      = useState(() => localStorage.getItem('ranking_token') || null);
  const [isSyncing,  setIsSyncing]  = useState(false);
  const [syncError,  setSyncError]  = useState(null);

  // ── Capture token from URL hash (same pattern as tracker) ─────────────────
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('access_token=')) return;

    const params = new URLSearchParams(hash.replace('#', '?'));
    const accessToken = params.get('access_token');
    if (!accessToken) return;

    localStorage.setItem('ranking_token', accessToken);
    localStorage.setItem('ranking_loggedin', 'true');
    setToken(accessToken);
    setIsLoggedIn(true);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // ── Drive helpers ──────────────────────────────────────────────────────────
  async function driveSearch(accessToken, fileName) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${fileName}'&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    const data = await res.json();
    return data.files?.[0] || null;
  }

  async function driveDownload(accessToken, fileId) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    return res.json();
  }

  async function driveUpload(accessToken, fileId, content) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      }
    );
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  }

  async function driveCreate(accessToken, fileName) {
    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fileName, parents: ['appDataFolder'] }),
    });
    const data = await res.json();
    return data.id;
  }

  // ── Handle expired token ───────────────────────────────────────────────────
  function handleExpired() {
    localStorage.removeItem('ranking_token');
    localStorage.removeItem('ranking_loggedin');
    setToken(null);
    setIsLoggedIn(false);
  }

  // ── Read tracker backup (jee_tracker_backup.json) ─────────────────────────
  const fetchTrackerData = useCallback(async (accessToken) => {
    try {
      const file = await driveSearch(accessToken, TRACKER_FILE);
      if (!file) {
        console.warn('Tracker backup not found on Drive — have you synced your tracker at least once?');
        return null;
      }
      return await driveDownload(accessToken, file.id);
    } catch (e) {
      if (e.message === 'TOKEN_EXPIRED') handleExpired();
      console.error('fetchTrackerData:', e);
      return null;
    }
  }, []);

  // ── Read ranking state ─────────────────────────────────────────────────────
  const fetchRankingData = useCallback(async (accessToken) => {
    try {
      const file = await driveSearch(accessToken, RANKING_FILE);
      if (!file) return null;
      return await driveDownload(accessToken, file.id);
    } catch (e) {
      if (e.message === 'TOKEN_EXPIRED') handleExpired();
      console.error('fetchRankingData:', e);
      return null;
    }
  }, []);

  // ── Save ranking state ─────────────────────────────────────────────────────
  const saveRankingData = useCallback(async (accessToken, data) => {
    if (!accessToken) return false;
    setIsSyncing(true);
    setSyncError(null);
    try {
      let file = await driveSearch(accessToken, RANKING_FILE);
      let fileId = file?.id;
      if (!fileId) fileId = await driveCreate(accessToken, RANKING_FILE);
      await driveUpload(accessToken, fileId, { ...data, _saved: new Date().toISOString() });
      return true;
    } catch (e) {
      if (e.message === 'TOKEN_EXPIRED') handleExpired();
      setSyncError('Could not save to Drive. Changes stored locally.');
      console.error('saveRankingData:', e);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ── Fetch user profile ─────────────────────────────────────────────────────
  const fetchProfile = useCallback(async (accessToken) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(() => {
    if (!CLIENT_ID) { alert('Google Client ID missing — check Vercel env vars'); return; }
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

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('ranking_token');
    localStorage.removeItem('ranking_loggedin');
    setToken(null);
    setIsLoggedIn(false);
  }, []);

  return {
    token, isLoggedIn, isSyncing, syncError,
    loginWithGoogle, logout,
    fetchTrackerData, fetchRankingData, saveRankingData, fetchProfile,
  };
}
