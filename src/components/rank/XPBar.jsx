/**
 * XPBar — animated progress bar with rank color and glow.
 * Animates incrementally (counts up) when xpDelta is provided.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { XP_PER_SUBRANK } from '../../engine/xpEngine.js';

export default function XPBar({ rank, subXP, xpDelta = 0, showNumbers = true }) {
  const pct = Math.min(100, (subXP / XP_PER_SUBRANK) * 100);

  // Animated width
  const spring = useSpring(0, { stiffness: 60, damping: 18 });
  const widthPct = useTransform(spring, v => `${v}%`);

  useEffect(() => {
    // Small delay so the bar animates in on mount
    const t = setTimeout(() => spring.set(pct), 200);
    return () => clearTimeout(t);
  }, [pct, spring]);

  return (
    <div className="w-full space-y-1.5">
      {showNumbers && (
        <div className="flex justify-between items-center text-xs" style={{ fontFamily: 'Orbitron, monospace' }}>
          <span style={{ color: rank.color }} className="font-bold tracking-wider">
            {rank.tier} {rank.sub}
          </span>
          <span style={{ color: rank.glow }} className="opacity-80">
            {subXP.toLocaleString()} / {XP_PER_SUBRANK.toLocaleString()} XP
          </span>
        </div>
      )}

      {/* Track */}
      <div
        className="relative w-full rounded-full overflow-hidden"
        style={{
          height: 10,
          background: `${rank.glow}18`,
          border: `1px solid ${rank.color}30`,
        }}
      >
        {/* Fill */}
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: widthPct,
            background: `linear-gradient(90deg, ${rank.glow}99, ${rank.color}, ${rank.glow})`,
            boxShadow: `0 0 10px ${rank.glow}88, 0 0 20px ${rank.glow}44`,
          }}
        />

        {/* Shimmer sweep */}
        <motion.div
          className="absolute top-0 h-full rounded-full pointer-events-none"
          style={{
            width: '30%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
          }}
          animate={{ x: ['-100%', '400%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
        />
      </div>

      {/* XP delta indicator */}
      {xpDelta !== 0 && (
        <motion.div
          className="text-right text-xs font-bold"
          style={{
            fontFamily: 'Orbitron, monospace',
            color: xpDelta > 0 ? '#4ade80' : '#ef4444',
          }}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {xpDelta > 0 ? '+' : ''}{xpDelta.toLocaleString()} XP today
        </motion.div>
      )}
    </div>
  );
}

// Compact inline bar for leaderboard rows
export function MiniXPBar({ rank, subXP }) {
  const pct = Math.min(100, (subXP / XP_PER_SUBRANK) * 100);
  return (
    <div
      className="w-20 h-1.5 rounded-full overflow-hidden"
      style={{ background: `${rank.glow}18` }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: rank.color,
          boxShadow: `0 0 4px ${rank.glow}`,
        }}
      />
    </div>
  );
}
