/**
 * Leaderboard — 500-entry ranked list with:
 * - Animated position changes (Framer Motion layout)
 * - Sticky real-user row
 * - Position delta arrows
 * - Bot player modal
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MiniRankBadge } from '../rank/RankBadge.jsx';
import { MiniXPBar } from '../rank/XPBar.jsx';

const PAGE_SIZE = 50;

function DeltaArrow({ delta }) {
  if (delta === 0 || delta === undefined) return (
    <span className="text-xs opacity-30" style={{ fontFamily: 'monospace' }}>—</span>
  );
  const up = delta > 0;
  return (
    <span
      className="text-xs font-bold flex items-center gap-0.5"
      style={{ color: up ? '#4ade80' : '#ef4444' }}
    >
      {up ? '▲' : '▼'} {Math.abs(delta)}
    </span>
  );
}

function PlayerRow({ entry, delta, isRealUser, onClick }) {
  const top3 = entry.position <= 3;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <motion.div
      layout
      layoutId={entry.id}
      onClick={() => onClick(entry)}
      className={`
        flex items-center gap-3 px-4 py-2.5 cursor-pointer
        transition-colors duration-150 rounded-lg
        ${isRealUser
          ? 'ring-1 ring-offset-0'
          : 'hover:bg-white/5'}
      `}
      style={isRealUser ? {
        background: `${entry.rank.glow}12`,
        ringColor: entry.rank.color,
        borderColor: entry.rank.color,
        border: `1px solid ${entry.rank.color}55`,
      } : {}}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Position */}
      <div className="w-8 text-center">
        {top3
          ? <span className="text-base">{medals[entry.position - 1]}</span>
          : <span className="text-xs font-bold opacity-50" style={{ fontFamily: 'monospace' }}>
              #{entry.position}
            </span>
        }
      </div>

      {/* Delta arrow */}
      <div className="w-8 text-center">
        <DeltaArrow delta={delta} />
      </div>

      {/* Username */}
      <div className="flex-1 min-w-0">
        <span
          className="text-sm font-semibold truncate"
          style={{
            color: isRealUser ? entry.rank.color : '#e2e8f0',
            fontFamily: isRealUser ? 'Orbitron, monospace' : 'inherit',
          }}
        >
          {isRealUser ? '⭐ ' : ''}{entry.username}
        </span>
      </div>

      {/* Rank badge */}
      <div className="hidden sm:block">
        <MiniRankBadge rank={entry.rank} />
      </div>

      {/* XP bar */}
      <div className="hidden md:flex items-center gap-2">
        <MiniXPBar rank={entry.rank} subXP={entry.subXP} />
      </div>

      {/* Today's XP */}
      <div className="text-right w-20">
        <span
          className="text-xs font-bold"
          style={{
            color: entry.todayXP >= 0 ? '#4ade80' : '#ef4444',
            fontFamily: 'monospace',
          }}
        >
          {entry.todayXP >= 0 ? '+' : ''}{entry.todayXP.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
}

function PlayerModal({ entry, onClose }) {
  if (!entry) return null;

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="rounded-2xl p-6 max-w-sm w-full"
        style={{
          background: '#0e0e14',
          border: `1px solid ${entry.rank.color}44`,
          boxShadow: `0 0 40px ${entry.rank.glow}22`,
        }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white">{entry.username}</h3>
            <p className="text-xs opacity-50 mt-0.5">{entry.isBot ? 'JEE Aspirant' : 'You'}</p>
          </div>
          <MiniRankBadge rank={entry.rank} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: 'Position',   value: `#${entry.position}` },
            { label: 'Total XP',   value: entry.totalXP.toLocaleString() },
            { label: 'Today\'s XP', value: `${entry.todayXP >= 0 ? '+' : ''}${entry.todayXP.toLocaleString()}` },
            { label: 'Sub-rank XP', value: `${entry.subXP} / 1500` },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-lg px-3 py-2.5"
              style={{ background: `${entry.rank.glow}0d`, border: `1px solid ${entry.rank.color}22` }}
            >
              <p className="text-xs opacity-50 mb-0.5">{s.label}</p>
              <p className="text-sm font-bold" style={{ color: entry.rank.color, fontFamily: 'Orbitron, monospace' }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{
            background: `${entry.rank.color}22`,
            color: entry.rank.color,
            border: `1px solid ${entry.rank.color}44`,
          }}
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function Leaderboard({ leaderboard, positionDeltas, userPosition }) {
  const [page, setPage] = useState(0);
  const [modalEntry, setModalEntry] = useState(null);
  const [viewMode, setViewMode] = useState('around'); // 'around' | 'top' | 'all'

  // Which slice to show
  const displayEntries = useMemo(() => {
    if (viewMode === 'top') return leaderboard.slice(0, PAGE_SIZE);
    if (viewMode === 'around' && userPosition) {
      const center = userPosition - 1;
      const start = Math.max(0, center - 10);
      const end = Math.min(leaderboard.length, start + 25);
      return leaderboard.slice(start, end);
    }
    // paginated all
    return leaderboard.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [leaderboard, viewMode, page, userPosition]);

  const totalPages = Math.ceil(leaderboard.length / PAGE_SIZE);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">

      {/* Header controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold" style={{ fontFamily: 'Orbitron, monospace', color: '#e2e8f0' }}>
          🏆 Leaderboard
          <span className="ml-2 text-xs opacity-40 font-normal">500 players</span>
        </h2>
        <div className="flex gap-1.5">
          {['around', 'top', 'all'].map(m => (
            <button
              key={m}
              onClick={() => { setViewMode(m); setPage(0); }}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: viewMode === m ? '#ffffff18' : 'transparent',
                color: viewMode === m ? '#fff' : '#666',
                border: `1px solid ${viewMode === m ? '#ffffff30' : '#ffffff10'}`,
              }}
            >
              {m === 'around' ? `Near #${userPosition || '?'}` : m === 'top' ? 'Top 50' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 pb-1 border-b border-white/5">
        <div className="w-8 text-center text-xs opacity-30">#</div>
        <div className="w-8 text-center text-xs opacity-30">±</div>
        <div className="flex-1 text-xs opacity-30">Player</div>
        <div className="hidden sm:block text-xs opacity-30 w-20">Rank</div>
        <div className="hidden md:block text-xs opacity-30 w-20">Progress</div>
        <div className="w-20 text-right text-xs opacity-30">Today</div>
      </div>

      {/* Rows */}
      <div className="space-y-0.5">
        <AnimatePresence mode="popLayout">
          {displayEntries.map(entry => (
            <PlayerRow
              key={entry.id}
              entry={entry}
              delta={positionDeltas[entry.id]}
              isRealUser={entry.isRealUser}
              onClick={setModalEntry}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination (only in 'all' mode) */}
      {viewMode === 'all' && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-30 transition-opacity"
            style={{ background: '#ffffff10', color: '#fff' }}
          >
            ← Prev
          </button>
          <span className="text-xs opacity-40 font-mono">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-30 transition-opacity"
            style={{ background: '#ffffff10', color: '#fff' }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Player modal */}
      <AnimatePresence>
        {modalEntry && (
          <PlayerModal
            key="modal"
            entry={modalEntry}
            onClose={() => setModalEntry(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
