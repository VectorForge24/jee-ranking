/**
 * useDriveSync — now powered by Firebase.
 * Permanent sessions, no token expiry, auto-refresh handled by Firebase SDK.
 *
 * Reads tracker data from: users/{uid}/data/trackerData (written by tracker app)
 * Writes ranking state to: users/{uid}/data/rankingData (owned by ranking app)
 *
 * Same Firebase project = same user UID in both apps.
 * Students log in once across both apps forever.
 */

import { useState, useCallback, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Note: Firebase's default persistence (browserLocalPersistence) already
// survives browser restarts indefinitely — no explicit setPersistence call
// needed. Calling it unconditionally on every load actually carries a real
// documented risk of wiping the current session on re-init in some SDK
// versions (firebase/firebase-js-sdk#9319), so it's deliberately left out.
// The actual fix for both the visible flicker AND the effective
// "logged out" appearance is the authChecked flag below.

export function useDriveSync() {
  const [isLoggedIn,  setIsLoggedIn]  = useState(false);
  const [authChecked, setAuthChecked] = useState(false); // has Firebase's first auth check completed yet?
  const [token,       setToken]       = useState(null); // uid used as token
  const [isSyncing,   setIsSyncing]   = useState(false);
  const [syncError,   setSyncError]   = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // ── Auth listener — permanent, auto-refreshes silently ───────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        setToken(user.uid);
        setUserProfile({
          id:       user.uid,
          name:     user.displayName,
          email:    user.email,
          photoURL: user.photoURL,
          given_name: user.displayName?.split(' ')[0] || 'Student',
        });
      } else {
        setIsLoggedIn(false);
        setToken(null);
        setUserProfile(null);
      }
      setAuthChecked(true); // fires on EVERY call, whether user was found or not
    });
    return unsub;
  }, []);

  // ── Fetch user profile (already in userProfile state) ────────────────────
  const fetchProfile = useCallback(async () => {
    return userProfile;
  }, [userProfile]);

  // ── Read tracker data written by tracker app ──────────────────────────────
  const fetchTrackerData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid, 'data', 'trackerData'));
      if (!snap.exists()) return null;
      return snap.data(); // Same shape as localStorage tracker-* keys
    } catch (e) {
      console.error('fetchTrackerData:', e);
      setSyncError('Could not read tracker data');
      return null;
    }
  }, []);

  // ── Read ranking state ────────────────────────────────────────────────────
  const fetchRankingData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid, 'data', 'rankingData'));
      if (!snap.exists()) return null;
      return snap.data();
    } catch (e) {
      console.error('fetchRankingData:', e);
      return null;
    }
  }, []);

  // ── Save ranking state ────────────────────────────────────────────────────
  const saveRankingData = useCallback(async (data) => {
    const user = auth.currentUser;
    if (!user) return false;
    setIsSyncing(true);
    setSyncError(null);
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'data', 'rankingData'),
        { ...data, _updatedAt: serverTimestamp() },
        { merge: true }
      );
      return true;
    } catch (e) {
      console.error('saveRankingData:', e);
      setSyncError('Could not save ranking data');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ── Login via popup ───────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        console.error('Login error:', e);
        setSyncError('Sign-in failed. Please try again.');
      }
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return {
    token, isLoggedIn, authChecked, isSyncing, syncError, userProfile,
    loginWithGoogle, logout,
    fetchProfile, fetchTrackerData, fetchRankingData, saveRankingData,
  };
}
