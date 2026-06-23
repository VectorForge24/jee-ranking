/**
 * JEE Ranking App — Root
 * Dark, cinematic, rank-themed. The entire UI repaints to the user's rank color.
 */

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRankingState } from './hooks/useRankingState.js';
import RankAnimation, { BonusToast } from './components/animations/RankAnimation.jsx';
import Profile from './components/profile/Profile.jsx';
import Leaderboard from './components/leaderboard/Leaderboard.jsx';
import RankBadge from './components/rank/RankBadge.jsx';

// ── Login screen ───────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: '#06060a' }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, #CD7F3218 0%, transparent 65%)' }} />

      <motion.div
        className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full text-center"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <div className="space-y-1">
          <p className="text-xs tracking-[0.3em] uppercase opacity-40 text-white">JEE</p>
          <h1
            className="text-4xl font-black tracking-wider text-white"
            style={{ fontFamily: 'Orbitron, monospace' }}
          >
            RANKING
          </h1>
          <p className="text-xs tracking-[0.3em] uppercase opacity-30 text-white">System</p>
        </div>

        {/* Sample badges — teaser */}
        <div className="flex items-end gap-3">
          {['Bronze','Silver','Gold','Platinum','Diamond','Conqueror'].map((tier, i) => {
            const RANKS_PREVIEW = [
              { tier: 'Bronze',    sub: 'III', color: '#CD7F32', glow: '#8B4513', bg: '#1a0f00' },
              { tier: 'Silver',    sub: 'II',  color: '#C0C0C0', glow: '#A8A8A8', bg: '#111111' },
              { tier: 'Gold',      sub: 'I',   color: '#FFD700', glow: '#FFA500', bg: '#0f0c00' },
              { tier: 'Platinum',  sub: 'II',  color: '#00CED1', glow: '#48D1CC', bg: '#00100f' },
              { tier: 'Diamond',   sub: 'I',   color: '#B9F2FF', glow: '#00BFFF', bg: '#000d14' },
              { tier: 'Conqueror', sub: 'I',   color: '#FF4500', glow: '#DC143C', bg: '#140000' },
            ];
            return (
              <motion.div
                key={tier}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
              >
                <RankBadge
                  rank={RANKS_PREVIEW[i]}
                  size="sm"
                  animate={i === 5} // only Conqueror pulses
                />
              </motion.div>
            );
          })}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <p className="text-sm text-white opacity-60 leading-relaxed">
            Complete daily tasks in your JEE Tracker to earn XP, climb ranks,
            and compete with 499 other aspirants.
          </p>
          <p className="text-xs opacity-30 text-white">
            Syncs with your existing tracker data on Google Drive.
          </p>
        </div>

        {/* Login button */}
        <motion.button
          onClick={onLogin}
          className="w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all"
          style={{
            background: 'linear-gradient(135deg, #CD7F32, #8B4513)',
            color: '#fff',
            fontFamily: 'Orbitron, monospace',
            boxShadow: '0 0 30px #CD7F3244',
          }}
          whileHover={{ scale: 1.02, boxShadow: '0 0 50px #CD7F3266' }}
          whileTap={{ scale: 0.98 }}
        >
          Login with Google
        </motion.button>

        <p className="text-xs opacity-20 text-white">
          Uses the same Google account as your JEE Tracker
        </p>
      </motion.div>
    </div>
  );
}

// ── Loading screen ─────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5"
      style={{ background: '#06060a' }}>
      <motion.div
        className="w-10 h-10 rounded-full border-2 border-transparent"
        style={{ borderTopColor: '#CD7F32', borderRightColor: '#CD7F3244' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      />
      <p className="text-sm opacity-40 text-white" style={{ fontFamily: 'Orbitron, monospace' }}>
        Syncing from Drive…
      </p>
    </div>
  );
}

// ── Navigation tab ─────────────────────────────────────────────────────────────
function NavTab({ label, active, onClick, rank }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-3 text-xs font-bold tracking-wider uppercase transition-all"
      style={{
        fontFamily: 'Orbitron, monospace',
        color: active ? rank.color : '#444',
        borderTop: active ? `2px solid ${rank.color}` : '2px solid transparent',
        background: active ? `${rank.color}0a` : 'transparent',
      }}
    >
      {label}
    </button>
  );
}

// ── Header bar ────────────────────────────────────────────────────────────────
function Header({ rank, username, userPosition, onLogout }) {
  return (
    <header
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{
        background: '#08080d',
        borderColor: `${rank.color}20`,
      }}
    >
      <div className="flex items-center gap-2">
        <RankBadge rank={rank} size="sm" animate={false} />
        <div>
          <p
            className="text-sm font-bold leading-none"
            style={{ color: rank.color, fontFamily: 'Orbitron, monospace' }}
          >
            {rank.tier} {rank.sub}
          </p>
          {userPosition && (
            <p className="text-xs opacity-40 mt-0.5">#{userPosition} · {username}</p>
          )}
        </div>
      </div>

      <button
        onClick={onLogout}
        className="text-xs px-3 py-1.5 rounded-lg transition-colors"
        style={{ background: '#ffffff08', color: '#666', border: '1px solid #ffffff10' }}
      >
        Sign out
      </button>
    </header>
  );
}

// ── App root ───────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('profile'); // 'profile' | 'leaderboard'

  const {
    isLoggedIn, loginWithGoogle, logout, userProfile, username, setUsername,
    phase, error, isSyncing,
    rank, subXP, rankingState, todayStats, todayResult,
    leaderboard, positionDeltas, userPosition,
    animQueue, consumeAnim,
  } = useRankingState();

  // Inject rank CSS variables for global theme
  useEffect(() => {
    if (!rank) return;
    const root = document.documentElement;
    root.style.setProperty('--rank-color', rank.color);
    root.style.setProperty('--rank-glow',  rank.glow);
    root.style.setProperty('--rank-bg',    rank.bg);
  }, [rank]);

  // Streak bonus toast events
  const toastEvents = todayResult?.streakResult?.bonusEvents || [];

  // ── Not logged in ────────────────────────────────────────────────────────────
  if (!isLoggedIn) return <LoginScreen onLogin={loginWithGoogle} />;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === 'loading') return <LoadingScreen />;

  // ── Error ────────────────────────────────────────────────────────────────────
  if (phase === 'error') return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#06060a' }}>
      <div className="text-center space-y-3">
        <p className="text-red-400 font-bold">Something went wrong</p>
        <p className="text-sm opacity-50 text-white">{error}</p>
        <button onClick={logout} className="text-xs underline opacity-40 text-white">Sign out</button>
      </div>
    </div>
  );

  // ── Main app ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(180deg, ${rank.bg} 0%, #06060a 40%)`,
        color: '#e2e8f0',
      }}
    >
      {/* Rank-up / rank-down animation overlay */}
      <RankAnimation animQueue={animQueue} consumeAnim={consumeAnim} />

      {/* Streak bonus toast */}
      <AnimatePresence>
        {toastEvents.length > 0 && (
          <BonusToast key="toast" events={toastEvents} onDone={() => {}} />
        )}
      </AnimatePresence>

      {/* Header */}
      <Header rank={rank} username={username} userPosition={userPosition} onLogout={logout} />

      {/* Syncing indicator */}
      {isSyncing && (
        <div
          className="text-center text-xs py-1"
          style={{ background: `${rank.glow}18`, color: rank.glow }}
        >
          Syncing to Drive…
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="px-4 pt-6">
          <AnimatePresence mode="wait">
            {tab === 'profile' ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Profile
                  rank={rank}
                  subXP={subXP}
                  rankingState={rankingState}
                  todayResult={todayResult}
                  username={username}
                  setUsername={setUsername}
                  userProfile={userProfile}
                  userPosition={userPosition}
                />
              </motion.div>
            ) : (
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Leaderboard
                  leaderboard={leaderboard}
                  positionDeltas={positionDeltas}
                  userPosition={userPosition}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 inset-x-0 flex border-t"
        style={{ background: '#08080d', borderColor: `${rank.color}20` }}
      >
        <NavTab label="⚔ Profile"     active={tab === 'profile'}     onClick={() => setTab('profile')}     rank={rank} />
        <NavTab label="🏆 Leaderboard" active={tab === 'leaderboard'} onClick={() => setTab('leaderboard')} rank={rank} />
      </nav>
    </div>
  );
}
