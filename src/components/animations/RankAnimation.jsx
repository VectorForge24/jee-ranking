/**
 * RankAnimation — full-screen cinematic rank-up / rank-down overlay.
 * Fires from the animQueue consumed by useRankingState.
 * Uses Framer Motion for all motion, canvas-confetti for particles.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import RankBadge from '../rank/RankBadge.jsx';

// ── Shatter fragments — pre-defined clip paths that "fly off" ─────────────────
const SHARDS = [
  { clip: 'polygon(0 0, 50% 40%, 20% 100%)',       tx: -120, ty: -80,  rot: -40 },
  { clip: 'polygon(50% 0, 100% 30%, 80% 0)',        tx:  140, ty: -100, rot:  55 },
  { clip: 'polygon(20% 50%, 60% 30%, 40% 80%)',     tx: -90,  ty:  120, rot: -30 },
  { clip: 'polygon(60% 40%, 100% 60%, 80% 100%)',   tx:  130, ty:  110, rot:  45 },
  { clip: 'polygon(10% 80%, 50% 60%, 30% 100%)',    tx: -150, ty:  60,  rot: -60 },
  { clip: 'polygon(50% 50%, 90% 40%, 70% 90%)',     tx:  100, ty:  80,  rot:  35 },
  { clip: 'polygon(30% 20%, 70% 10%, 60% 50%)',     tx:  20,  ty: -140, rot: -20 },
  { clip: 'polygon(0 40%, 30% 20%, 20% 60%)',        tx: -110, ty:  20,  rot:  50 },
];

// ── Crack lines for demote ─────────────────────────────────────────────────────
const CRACKS = [
  { d: 'M50,10 L45,35 L55,50 L40,80', delay: 0.1 },
  { d: 'M50,10 L60,30 L52,55 L65,85', delay: 0.2 },
  { d: 'M20,40 L45,50 L35,70',         delay: 0.3 },
  { d: 'M80,45 L58,52 L70,75',         delay: 0.25 },
];

// ── Rank-UP overlay ────────────────────────────────────────────────────────────
function PromoteOverlay({ event, onDone }) {
  const { from, to } = event;
  const [phase, setPhase] = useState('shatter'); // shatter → reveal → done

  // Trigger confetti
  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { x: 0.5, y: 0.45 },
        colors: [to.color, to.glow, '#ffffff', '#ffe066'],
        startVelocity: 45,
        gravity: 0.9,
        scalar: 1.1,
      });
    }, 900);
    return () => clearTimeout(timer);
  }, [to]);

  // Phase transitions
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 700);
    const t2 = setTimeout(() => setPhase('done'),   3600);
    const t3 = setTimeout(onDone,                   4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Flash */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ delay: 0.25, duration: 0.3 }}
        style={{ background: 'white' }}
      />

      {/* Red edge vignette → gold on reveal */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 120px ${to.glow}`,
          opacity: 0.6,
        }}
      />

      {/* Shatter phase: old badge fragments fly off */}
      {phase === 'shatter' && (
        <div className="relative" style={{ width: 160, height: 160 }}>
          {SHARDS.map((s, i) => (
            <motion.div
              key={i}
              className="absolute inset-0"
              style={{ clipPath: s.clip, overflow: 'hidden' }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: s.tx, y: s.ty, rotate: s.rot, opacity: 0 }}
              transition={{ delay: i * 0.04, duration: 0.5, ease: 'easeOut' }}
            >
              <RankBadge rank={from} size="xl" animate={false} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Reveal phase: new badge slams in */}
      {(phase === 'reveal' || phase === 'done') && (
        <motion.div
          className="flex flex-col items-center gap-6"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 1.18, 1.0], opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
        >
          {/* Radial glow burst */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 300, height: 300,
              background: `radial-gradient(circle, ${to.glow}55 0%, transparent 70%)`,
            }}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: [0.2, 1.8, 1.2], opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />

          <RankBadge rank={to} size="xl" animate={true} />

          <motion.div
            className="text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p
              className="text-4xl font-black tracking-widest mb-1"
              style={{
                fontFamily: 'Orbitron, monospace',
                color: to.color,
                textShadow: `0 0 30px ${to.glow}, 0 0 60px ${to.glow}66`,
              }}
            >
              RANK UP
            </p>
            <p
              className="text-xl font-bold tracking-wide"
              style={{ color: to.glow, fontFamily: 'Orbitron, monospace' }}
            >
              {to.tier} {to.sub}
            </p>

            {/* Breakthrough bonus */}
            {event.type === 'breakthrough' && (
              <motion.p
                className="mt-3 text-base font-semibold"
                style={{ color: '#FFD700' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                🎖️ +500 XP Breakthrough Bonus!
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Skip hint */}
      <motion.button
        className="absolute bottom-8 text-sm opacity-40 hover:opacity-70 transition-opacity"
        style={{ color: '#fff', fontFamily: 'monospace' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1.5 }}
        onClick={onDone}
      >
        tap to skip
      </motion.button>
    </motion.div>
  );
}

// ── Rank-DOWN overlay ──────────────────────────────────────────────────────────
function DemoteOverlay({ event, onDone }) {
  const { from, to } = event;
  const [phase, setPhase] = useState('crack');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fall'),  700);
    const t2 = setTimeout(() => setPhase('show'),  1200);
    const t3 = setTimeout(() => setPhase('done'),  3200);
    const t4 = setTimeout(onDone,                  3600);
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.95)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Red vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 150px #DC143C88' }}
      />

      {/* Screen shake */}
      <motion.div
        className="flex flex-col items-center gap-6"
        animate={{ x: [0,-8,8,-6,6,-4,4,-2,2,0] }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        {/* Cracking badge */}
        {(phase === 'crack') && (
          <div className="relative" style={{ width: 160, height: 160 }}>
            <RankBadge rank={from} size="xl" animate={false} />
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0"
              width={160}
              height={160}
            >
              {CRACKS.map((c, i) => (
                <motion.path
                  key={i}
                  d={c.d}
                  stroke="#DC143C"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: c.delay, duration: 0.25, ease: 'easeIn' }}
                />
              ))}
            </svg>
          </div>
        )}

        {/* Badge falls */}
        {phase === 'fall' && (
          <motion.div
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: 80, opacity: 0, rotate: -15 }}
            transition={{ duration: 0.4, ease: 'easeIn' }}
          >
            <RankBadge rank={from} size="xl" animate={false} />
          </motion.div>
        )}

        {/* New lower badge fades in */}
        {(phase === 'show' || phase === 'done') && (
          <motion.div
            className="flex flex-col items-center gap-5"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45 }}
          >
            <div style={{ filter: 'saturate(0.6) brightness(0.8)' }}>
              <RankBadge rank={to} size="xl" animate={false} />
            </div>
            <div className="text-center">
              <p
                className="text-3xl font-black tracking-widest mb-1"
                style={{
                  fontFamily: 'Orbitron, monospace',
                  color: '#DC143C',
                  textShadow: '0 0 20px #DC143C88',
                }}
              >
                DEMOTED
              </p>
              <p
                className="text-lg font-semibold tracking-wide"
                style={{ color: '#888', fontFamily: 'Orbitron, monospace' }}
              >
                {to.tier} {to.sub}
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>

      <motion.button
        className="absolute bottom-8 text-sm opacity-40 hover:opacity-70 transition-opacity"
        style={{ color: '#fff', fontFamily: 'monospace' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1.5 }}
        onClick={onDone}
      >
        tap to continue
      </motion.button>
    </motion.div>
  );
}

// ── Streak / Achievement toast ─────────────────────────────────────────────────
export function BonusToast({ events, onDone }) {
  useEffect(() => {
    if (!events || events.length === 0) return;
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [events, onDone]);

  if (!events || events.length === 0) return null;

  return (
    <motion.div
      className="fixed top-6 right-6 z-40 flex flex-col gap-2"
      initial={{ x: 120, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 120, opacity: 0 }}
    >
      {events.map((e, i) => (
        <motion.div
          key={i}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold"
          style={{
            background: e.type === 'streak_bonus'
              ? 'linear-gradient(135deg, #0d2200, #1a3d00)'
              : 'linear-gradient(135deg, #220000, #3d0000)',
            border: `1px solid ${e.type === 'streak_bonus' ? '#4ade80' : '#ef4444'}44`,
            color: e.type === 'streak_bonus' ? '#4ade80' : '#ef4444',
            backdropFilter: 'blur(8px)',
          }}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.15 }}
        >
          <span className="text-lg">{e.emoji}</span>
          <div>
            <div className="font-bold">{e.name}</div>
            <div className="opacity-70 text-xs">
              {e.type === 'streak_bonus' ? `+${e.bonus} XP` : `−${e.penalty} XP`}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── Main controller — consumes animQueue ───────────────────────────────────────
export default function RankAnimation({ animQueue, consumeAnim }) {
  const current = animQueue[0];

  return (
    <AnimatePresence>
      {current?.type === 'promote' && (
        <PromoteOverlay key="promote" event={current} onDone={consumeAnim} />
      )}
      {current?.type === 'demote' && (
        <DemoteOverlay key="demote" event={current} onDone={consumeAnim} />
      )}
    </AnimatePresence>
  );
}
