/**
 * RankAnimation — rank-up / rank-down overlay.
 * Clean, punchy, not overdone.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import RankBadge from '../rank/RankBadge.jsx';

// Shatter pieces fly outward
const SHARDS = [
  { clip:'polygon(0 0,55% 45%,0 50%)',         tx:-130, ty:-60,  r:-45 },
  { clip:'polygon(55% 0,100% 0,60% 45%)',       tx: 140, ty:-90,  r: 55 },
  { clip:'polygon(0 50%,50% 45%,30% 100%)',     tx:-120, ty: 110, r:-35 },
  { clip:'polygon(60% 45%,100% 40%,100% 100%)', tx: 140, ty: 100, r: 40 },
  { clip:'polygon(30% 40%,70% 35%,55% 80%)',    tx:  10, ty:-120, r:-15 },
  { clip:'polygon(0 0,40% 0,35% 40%)',           tx:-100, ty:-100, r: 30 },
];

function PromoteOverlay({ event, onDone }) {
  const [phase, setPhase] = useState('shatter');
  const { from, to } = event;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 600);
    const t2 = setTimeout(() => confetti({
      particleCount:100, spread:70, origin:{x:0.5,y:0.42},
      colors:[to.color, to.glow,'#ffffff','#ffe066'],
      startVelocity:42, gravity:0.85, scalar:1.1,
    }), 900);
    const t3 = setTimeout(() => setPhase('done'), 3600);
    const t4 = setTimeout(onDone, 4000);
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, [onDone, to]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background:'rgba(0,0,0,0.92)', backdropFilter:'blur(8px)' }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
    >
      {/* Flash */}
      <motion.div className="absolute inset-0 pointer-events-none"
        initial={{ opacity:0 }} animate={{ opacity:[0,1,0] }}
        transition={{ delay:0.2, duration:0.25 }}
        style={{ background:'white' }}
      />

      {/* Colored edge glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ boxShadow:`inset 0 0 100px ${to.glow}44` }}
      />

      {phase === 'shatter' && (
        <div className="relative" style={{ width:128, height:128 }}>
          {SHARDS.map((s,i) => (
            <motion.div key={i} className="absolute inset-0 overflow-hidden" style={{ clipPath:s.clip }}
              initial={{ x:0, y:0, rotate:0, opacity:1 }}
              animate={{ x:s.tx, y:s.ty, rotate:s.r, opacity:0 }}
              transition={{ delay:i*0.04, duration:0.45, ease:'easeOut' }}
            >
              <RankBadge rank={from} size="xl" animate={false}/>
            </motion.div>
          ))}
        </div>
      )}

      {(phase === 'reveal' || phase === 'done') && (
        <motion.div className="flex flex-col items-center gap-5"
          initial={{ scale:0.25, opacity:0 }}
          animate={{ scale:[0.25,1.15,1], opacity:1 }}
          transition={{ duration:0.5, ease:[0.34,1.56,0.64,1] }}
        >
          {/* Burst ring */}
          <motion.div className="absolute rounded-full pointer-events-none"
            style={{ width:280, height:280, border:`2px solid ${to.glow}`, borderRadius:'50%' }}
            initial={{ scale:0.3, opacity:0.8 }}
            animate={{ scale:2.2, opacity:0 }}
            transition={{ duration:0.9, ease:'easeOut' }}
          />

          <RankBadge rank={to} size="xl" animate/>

          <motion.div className="text-center space-y-1"
            initial={{ y:16, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.25 }}>
            <p style={{
              fontFamily:"'Space Mono', monospace",
              fontSize:28, fontWeight:700, letterSpacing:'0.15em',
              color: to.color, textShadow:`0 0 24px ${to.glow}`,
            }}>RANK UP</p>
            <p style={{ fontSize:16, color: to.glow, fontFamily:"'Space Grotesk', sans-serif", fontWeight:600 }}>
              {to.tier} {to.sub}
            </p>
            {event.breakthrough && (
              <motion.p style={{ fontSize:13, color:'#FFD700', marginTop:8 }}
                initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.7 }}>
                🎖️ +500 XP Breakthrough Bonus!
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}

      <motion.button onClick={onDone}
        className="absolute bottom-8 text-sm"
        style={{ color:'rgba(255,255,255,0.3)', fontFamily:'monospace' }}
        initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.5 }}>
        tap to continue
      </motion.button>
    </motion.div>
  );
}

function DemoteOverlay({ event, onDone }) {
  const [phase, setPhase] = useState('shake');
  const { from, to } = event;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fall'),  600);
    const t2 = setTimeout(() => setPhase('show'),  1100);
    const t3 = setTimeout(onDone, 3500);
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background:'rgba(0,0,0,0.94)', backdropFilter:'blur(8px)' }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ boxShadow:'inset 0 0 120px rgba(220,20,60,0.3)' }}/>

      <motion.div className="flex flex-col items-center gap-5"
        animate={phase === 'shake' ? { x:[0,-10,10,-8,8,-5,5,-2,2,0] } : {}}
        transition={{ duration:0.55 }}
      >
        {phase === 'shake' && <RankBadge rank={from} size="xl" animate={false}/>}

        {phase === 'fall' && (
          <motion.div initial={{ y:0, opacity:1, rotate:0 }}
            animate={{ y:90, opacity:0, rotate:-18 }}
            transition={{ duration:0.4, ease:'easeIn' }}>
            <RankBadge rank={from} size="xl" animate={false}/>
          </motion.div>
        )}

        {(phase === 'show') && (
          <motion.div className="flex flex-col items-center gap-5"
            initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }}
            transition={{ duration:0.4 }}>
            <div style={{ filter:'saturate(0.55) brightness(0.75)' }}>
              <RankBadge rank={to} size="xl" animate={false}/>
            </div>
            <div className="text-center space-y-1">
              <p style={{
                fontFamily:"'Space Mono', monospace",
                fontSize:24, fontWeight:700, letterSpacing:'0.12em', color:'#f87171',
              }}>DEMOTED</p>
              <p style={{ fontSize:14, color:'#6b7280', fontFamily:"'Space Grotesk', sans-serif" }}>
                {to.tier} {to.sub}
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>

      <motion.button onClick={onDone}
        className="absolute bottom-8 text-sm"
        style={{ color:'rgba(255,255,255,0.3)', fontFamily:'monospace' }}
        initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.5 }}>
        tap to continue
      </motion.button>
    </motion.div>
  );
}

export function BonusToast({ events, onDone }) {
  useEffect(() => {
    if (!events?.length) return;
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [events, onDone]);

  if (!events?.length) return null;
  return (
    <motion.div className="fixed top-4 right-4 z-40 flex flex-col gap-2"
      initial={{ x:80, opacity:0 }} animate={{ x:0, opacity:1 }}
      exit={{ x:80, opacity:0 }}>
      {events.map((e,i) => (
        <motion.div key={i}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{
            background: e.type==='streak_bonus' ? '#0d1f00' : '#1f0000',
            border: `1px solid ${e.type==='streak_bonus' ? '#4ade8040' : '#f8717140'}`,
            color: e.type==='streak_bonus' ? '#4ade80' : '#f87171',
          }}
          initial={{ x:60, opacity:0 }} animate={{ x:0, opacity:1 }} transition={{ delay:i*0.12 }}>
          <span className="text-base">{e.emoji}</span>
          <div>
            <div className="font-bold">{e.name}</div>
            <div className="text-xs opacity-60">
              {e.type==='streak_bonus' ? `+${e.bonus}` : `−${e.penalty}`} XP
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

export default function RankAnimation({ animQueue, consumeAnim }) {
  const current = animQueue?.[0];
  return (
    <AnimatePresence>
      {current?.type === 'promote' && <PromoteOverlay key="up"   event={current} onDone={consumeAnim}/>}
      {current?.type === 'demote'  && <DemoteOverlay  key="down" event={current} onDone={consumeAnim}/>}
    </AnimatePresence>
  );
}
