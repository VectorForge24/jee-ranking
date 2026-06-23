/**
 * Profile — personal rank card with stats, achievements, and activity heatmap.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import RankBadge from '../rank/RankBadge.jsx';
import XPBar from '../rank/XPBar.jsx';
import { ACHIEVEMENTS, RANKS } from '../../engine/xpEngine.js';

// ── Activity heatmap ───────────────────────────────────────────────────────────
function Heatmap({ history, rank }) {
  if (!history || history.length === 0) return null;

  // Last 35 days max, fill to grid
  const cells = [];
  const today = new Date();

  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const entry = history.find(h => h.date === dateStr);
    cells.push({ dateStr, entry });
  }

  function cellColor(entry) {
    if (!entry || !entry.hasData) return '#ffffff08';
    if (entry.tier === 'ELITE')   return rank.color;
    if (entry.tier === 'GREAT')   return `${rank.color}bb`;
    if (entry.tier === 'SOLID')   return `${rank.color}77`;
    if (entry.tier === 'WEAK')    return `${rank.color}44`;
    if (entry.tier === 'POOR')    return '#ff990033';
    if (entry.tier === 'PENALTY') return '#ef444433';
    return '#ffffff08';
  }

  return (
    <div>
      <p className="text-xs opacity-40 mb-2 uppercase tracking-widest">Activity — Last 35 Days</p>
      <div className="flex gap-1 flex-wrap">
        {cells.map((c, i) => (
          <div
            key={i}
            title={c.entry
              ? `${c.dateStr}: ${c.entry.tier || 'no data'} (${c.entry.xp >= 0 ? '+' : ''}${c.entry.xp || 0} XP)`
              : `${c.dateStr}: no tasks`}
            className="rounded-sm transition-transform hover:scale-125"
            style={{
              width: 14, height: 14,
              background: cellColor(c.entry),
              border: c.entry?.hasData ? `1px solid ${rank.color}30` : '1px solid transparent',
              boxShadow: c.entry?.tier === 'ELITE' ? `0 0 4px ${rank.glow}` : 'none',
            }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-2">
        {[
          { label: 'Elite',   color: rank.color },
          { label: 'Solid',   color: `${rank.color}77` },
          { label: 'Poor',    color: '#ff990033' },
          { label: 'Penalty', color: '#ef444433' },
          { label: 'None',    color: '#ffffff08' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
            <span className="text-xs opacity-30">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Achievement pill ──────────────────────────────────────────────────────────
function AchievementPill({ achievement, unlocked, rank }) {
  return (
    <div
      title={achievement.desc}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
      style={{
        background: unlocked ? `${rank.glow}14` : '#ffffff06',
        border: `1px solid ${unlocked ? rank.color + '44' : '#ffffff10'}`,
        color: unlocked ? rank.color : '#444',
        opacity: unlocked ? 1 : 0.5,
        filter: unlocked ? 'none' : 'grayscale(1)',
      }}
    >
      <span className="text-base">{unlocked ? achievement.emoji : '🔒'}</span>
      <div>
        <div className="font-bold">{achievement.name}</div>
        {unlocked && (
          <div className="text-xs opacity-60">+{achievement.bonus} XP</div>
        )}
      </div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, rank, sub }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-center"
      style={{
        background: `${rank.glow}0a`,
        border: `1px solid ${rank.color}20`,
      }}
    >
      <p className="text-xs opacity-40 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-lg font-black" style={{ color: rank.color, fontFamily: 'Orbitron, monospace' }}>
        {value}
      </p>
      {sub && <p className="text-xs opacity-40 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Username editor ───────────────────────────────────────────────────────────
function UsernameEditor({ username, onSave, rank }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(username);

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(username); setEditing(true); }}
        className="text-xs opacity-40 hover:opacity-80 transition-opacity underline"
        style={{ color: rank.glow }}
      >
        edit username
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        className="bg-transparent border-b text-sm px-1 py-0.5 outline-none w-36"
        style={{ borderColor: rank.color, color: '#fff' }}
        value={draft}
        maxLength={20}
        onChange={e => setDraft(e.target.value)}
        autoFocus
      />
      <button
        onClick={() => { onSave(draft.trim()); setEditing(false); }}
        className="text-xs px-2 py-0.5 rounded font-bold"
        style={{ background: rank.color + '33', color: rank.color }}
      >
        Save
      </button>
      <button
        onClick={() => setEditing(false)}
        className="text-xs opacity-40"
      >
        ✕
      </button>
    </div>
  );
}

// ── Main Profile component ────────────────────────────────────────────────────
export default function Profile({
  rank, subXP, rankingState, todayResult,
  username, setUsername, userProfile, userPosition,
}) {
  const history = rankingState?.history || [];
  const earnedIds = new Set(rankingState?.achievements || []);

  // Compute stats from history
  const totalDays   = history.filter(h => h.hasData).length;
  const perfectDays = history.filter(h => h.pct === 100).length;
  const avgXP       = totalDays > 0
    ? Math.round(history.filter(h => h.hasData).reduce((s, h) => s + Math.max(0, h.xp), 0) / totalDays)
    : 0;
  const bestDay     = history.reduce((best, h) => Math.max(best, h.xp || 0), 0);

  // Current streak
  const posStreak = todayResult?.summary?.posStreak ?? 0;
  const negStreak = todayResult?.summary?.negStreak ?? 0;

  const displayName = username || userProfile?.given_name || 'Aspirant';

  return (
    <div className="w-full max-w-xl mx-auto space-y-5">

      {/* Top card — badge + rank + bar */}
      <motion.div
        className="rounded-2xl p-6"
        style={{
          background: `linear-gradient(135deg, ${rank.bg}, #0a0a0f)`,
          border: `1px solid ${rank.color}30`,
          boxShadow: `0 0 40px ${rank.glow}18`,
        }}
        layout
      >
        <div className="flex items-start gap-5">
          {/* Badge */}
          <div className="flex-shrink-0">
            <RankBadge rank={rank} size="lg" animate={true} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-1">
            <h2
              className="text-xl font-black tracking-wide truncate"
              style={{ color: '#fff', fontFamily: 'Orbitron, monospace' }}
            >
              {displayName}
            </h2>
            <UsernameEditor username={displayName} onSave={setUsername} rank={rank} />

            {/* Rank label */}
            <p
              className="text-sm font-bold mt-3 mb-3"
              style={{ color: rank.color, fontFamily: 'Orbitron, monospace' }}
            >
              {rank.tier} {rank.sub}
              {userPosition && (
                <span className="ml-3 text-xs opacity-50 font-normal">
                  #{userPosition} globally
                </span>
              )}
            </p>

            {/* XP Bar */}
            <XPBar
              rank={rank}
              subXP={subXP}
              xpDelta={todayResult?.xpDelta}
              showNumbers={true}
            />
          </div>
        </div>

        {/* Streak indicators */}
        <div className="flex gap-3 mt-5">
          {posStreak > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: '#4ade8015', border: '1px solid #4ade8030', color: '#4ade80' }}
            >
              🔥 {posStreak}-day streak
            </div>
          )}
          {negStreak > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444' }}
            >
              🌧️ {negStreak}-day slump
            </div>
          )}
          {posStreak === 0 && negStreak === 0 && (
            <div className="text-xs opacity-30 py-1.5">No active streak</div>
          )}
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Global Rank"  value={userPosition ? `#${userPosition}` : '—'} rank={rank} />
        <StatCard label="Avg XP / Day" value={avgXP.toLocaleString()} rank={rank} sub="on active days" />
        <StatCard label="Perfect Days" value={perfectDays} rank={rank} />
        <StatCard label="Best Day"     value={`+${bestDay.toLocaleString()}`} rank={rank} sub="XP" />
      </div>

      {/* Today's breakdown */}
      {todayResult && (
        <motion.div
          className="rounded-2xl p-4 space-y-2"
          style={{ background: '#0e0e14', border: `1px solid ${rank.color}20` }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-xs uppercase tracking-widest opacity-40 mb-3">Today's Breakdown</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { k: 'Completion',      v: `${todayResult.summary.pct.toFixed(1)}%` },
              { k: 'Tier',            v: `${todayResult.summary.tier?.emoji} ${todayResult.summary.tier?.name}` },
              { k: 'Base XP',         v: `+${todayResult.summary.baseXP}` },
              { k: 'Streak Bonus',    v: todayResult.summary.streakBonus > 0 ? `+${todayResult.summary.streakBonus}` : '—' },
              { k: 'Streak Penalty',  v: todayResult.summary.streakPenalty > 0 ? `−${todayResult.summary.streakPenalty}` : '—' },
              { k: 'Achievement XP',  v: todayResult.summary.achievementXP > 0 ? `+${todayResult.summary.achievementXP}` : '—' },
            ].map(({ k, v }) => (
              <div key={k} className="flex justify-between">
                <span className="opacity-40">{k}</span>
                <span className="font-bold" style={{ color: rank.glow, fontFamily: 'monospace' }}>{v}</span>
              </div>
            ))}
          </div>
          <div
            className="mt-3 pt-3 border-t flex justify-between text-sm font-black"
            style={{ borderColor: `${rank.color}20` }}
          >
            <span>Total XP Today</span>
            <span style={{ color: todayResult.xpDelta >= 0 ? '#4ade80' : '#ef4444', fontFamily: 'Orbitron, monospace' }}>
              {todayResult.xpDelta >= 0 ? '+' : ''}{todayResult.xpDelta}
            </span>
          </div>
        </motion.div>
      )}

      {/* Achievements */}
      <div>
        <h3 className="text-xs uppercase tracking-widest opacity-40 mb-3">Achievements</h3>
        <div className="grid grid-cols-2 gap-2">
          {ACHIEVEMENTS.map(a => (
            <AchievementPill
              key={a.id}
              achievement={a}
              unlocked={earnedIds.has(a.id)}
              rank={rank}
            />
          ))}
        </div>
      </div>

      {/* Activity heatmap */}
      <div
        className="rounded-2xl p-4"
        style={{ background: '#0e0e14', border: `1px solid ${rank.color}15` }}
      >
        <Heatmap history={history} rank={rank} />
      </div>

    </div>
  );
}
