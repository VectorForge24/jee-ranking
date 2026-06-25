/**
 * RankAnimation — centred overlay, dimmed bg, thin animated XP bar.
 * Promote: badge slam + confetti. Demote: crack + fall.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import confetti from 'canvas-confetti';
import RankBadge from '../rank/RankBadge.jsx';
import { XP_PER_SUBRANK } from '../../engine/xpEngine.js';

const SHARDS = [
  { clip:'polygon(0 0,55% 45%,0 50%)',         tx:-140, ty:-70,  r:-48 },
  { clip:'polygon(55% 0,100% 0,60% 45%)',       tx: 150, ty:-95,  r: 58 },
  { clip:'polygon(0 50%,50% 45%,30% 100%)',     tx:-130, ty: 115, r:-38 },
  { clip:'polygon(60% 45%,100% 40%,100% 100%)', tx: 145, ty: 105, r: 42 },
  { clip:'polygon(30% 40%,70% 35%,55% 80%)',    tx:  12, ty:-130, r:-18 },
  { clip:'polygon(0 0,40% 0,35% 40%)',           tx:-105, ty:-105, r: 33 },
];

// Thin animated XP bar shown in the overlay
function AnimXPBar({ from, to, rank }) {
  const fromPct = (from / XP_PER_SUBRANK) * 100;
  const toPct   = Math.min(100, (to   / XP_PER_SUBRANK) * 100);
  const spring  = useSpring(fromPct, { stiffness:30, damping:12 });
  const width   = useTransform(spring, v => `${Math.max(0,v)}%`);

  useEffect(() => {
    const t = setTimeout(() => spring.set(toPct), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ width:'100%', marginTop:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11,
        fontFamily:"'Space Mono',monospace", color:'rgba(255,255,255,0.5)', marginBottom:5 }}>
        <span>{rank.tier} {rank.sub}</span>
        <span>{to}/{XP_PER_SUBRANK}</span>
      </div>
      <div style={{ height:5, borderRadius:99, background:`${rank.color}20`,
        boxShadow:`0 0 12px ${rank.glow}44`, overflow:'hidden', position:'relative' }}>
        <motion.div style={{
          position:'absolute', inset:'0 auto 0 0', width,
          background:`linear-gradient(90deg, ${rank.color}cc, ${rank.glow})`,
          borderRadius:99, boxShadow:`0 0 10px ${rank.glow}`,
        }}/>
      </div>
    </div>
  );
}

function PromoteOverlay({ event, onDone }) {
  const { from, to, prevSubXP=0, newSubXP=0 } = event;
  const [phase, setPhase] = useState('shatter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 650);
    const t2 = setTimeout(() => confetti({
      particleCount:100, spread:70, origin:{x:0.5,y:0.45},
      colors:[to.color, to.glow,'#fff','#ffe066'],
      startVelocity:42, gravity:0.85,
    }), 950);
    const t3 = setTimeout(onDone, 4200);
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, [onDone]);

  return (
    <motion.div
      style={{
        position:'fixed', inset:0, zIndex:50,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'rgba(0,0,0,0.88)', backdropFilter:'blur(10px)',
      }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
    >
      {/* Rank-coloured edge glow */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        boxShadow:`inset 0 0 120px ${to.glow}30`,
      }}/>

      {/* White flash */}
      <motion.div style={{ position:'absolute', inset:0, background:'#fff', pointerEvents:'none' }}
        initial={{ opacity:0 }} animate={{ opacity:[0,1,0] }}
        transition={{ delay:0.18, duration:0.22 }}/>

      {/* Shatter: old badge pieces fly out */}
      {phase === 'shatter' && (
        <div style={{ position:'relative', width:128, height:128 }}>
          {SHARDS.map((s,i) => (
            <motion.div key={i}
              style={{ position:'absolute', inset:0, overflow:'hidden', clipPath:s.clip }}
              initial={{ x:0, y:0, rotate:0, opacity:1 }}
              animate={{ x:s.tx, y:s.ty, rotate:s.r, opacity:0 }}
              transition={{ delay:i*0.04, duration:0.42, ease:'easeOut' }}>
              <RankBadge rank={from} size="xl" animate={false}/>
            </motion.div>
          ))}
        </div>
      )}

      {/* Reveal: new badge slams in */}
      {phase === 'reveal' && (
        <motion.div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'0 32px', width:'100%', maxWidth:320 }}
          initial={{ scale:0.2, opacity:0 }}
          animate={{ scale:[0.2,1.16,1], opacity:1 }}
          transition={{ duration:0.48, ease:[0.34,1.56,0.64,1] }}>

          {/* Burst ring */}
          <motion.div style={{
            position:'absolute', width:280, height:280, borderRadius:'50%',
            border:`2px solid ${to.glow}`, pointerEvents:'none',
          }}
            initial={{ scale:0.3, opacity:0.9 }}
            animate={{ scale:2.4, opacity:0 }}
            transition={{ duration:0.85, ease:'easeOut' }}/>

          <RankBadge rank={to} size="xl" animate/>

          <motion.div style={{ textAlign:'center' }}
            initial={{ y:14, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ delay:0.28 }}>
            <p style={{
              fontFamily:"'Space Mono',monospace", fontSize:26, fontWeight:700,
              letterSpacing:'0.14em', color: to.color,
              textShadow:`0 0 22px ${to.glow}`,
              margin:0,
            }}>RANK UP</p>
            <p style={{ fontSize:15, color: to.glow, margin:'4px 0 0',
              fontFamily:"'Space Grotesk',sans-serif", fontWeight:600 }}>
              {to.tier} {to.sub}
            </p>
          </motion.div>

          {/* Thin XP bar showing new progress */}
          <AnimXPBar from={0} to={newSubXP} rank={to}/>
        </motion.div>
      )}

      <motion.button onClick={onDone}
        style={{ position:'absolute', bottom:28, fontSize:12,
          color:'rgba(255,255,255,0.28)', background:'none', border:'none', cursor:'pointer',
          fontFamily:'monospace' }}
        initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.6 }}>
        tap to continue
      </motion.button>
    </motion.div>
  );
}

function DemoteOverlay({ event, onDone }) {
  const { from, to, newSubXP=0 } = event;
  const [phase, setPhase] = useState('shake');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fall'),  620);
    const t2 = setTimeout(() => setPhase('show'),  1100);
    const t3 = setTimeout(onDone, 3800);
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, [onDone]);

  return (
    <motion.div
      style={{
        position:'fixed', inset:0, zIndex:50,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'rgba(0,0,0,0.92)', backdropFilter:'blur(10px)',
      }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
    >
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        boxShadow:'inset 0 0 140px rgba(220,20,60,0.25)',
      }}/>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'0 32px', width:'100%', maxWidth:320 }}>
        {/* Shake + crack phase */}
        {phase === 'shake' && (
          <motion.div
            animate={{ x:[0,-10,10,-8,8,-5,5,-2,2,0] }}
            transition={{ duration:0.52 }}>
            <RankBadge rank={from} size="xl" animate={false}/>
          </motion.div>
        )}

        {/* Fall phase */}
        {phase === 'fall' && (
          <motion.div
            initial={{ y:0, opacity:1, rotate:0 }}
            animate={{ y:100, opacity:0, rotate:-20 }}
            transition={{ duration:0.4, ease:'easeIn' }}>
            <RankBadge rank={from} size="xl" animate={false}/>
          </motion.div>
        )}

        {/* Show new rank */}
        {phase === 'show' && (
          <motion.div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, width:'100%' }}
            initial={{ opacity:0, scale:0.88 }} animate={{ opacity:1, scale:1 }}
            transition={{ duration:0.38 }}>
            <div style={{ filter:'saturate(0.5) brightness(0.72)' }}>
              <RankBadge rank={to} size="xl" animate={false}/>
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{
                fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700,
                letterSpacing:'0.12em', color:'#f87171', margin:0,
              }}>DEMOTED</p>
              <p style={{ fontSize:14, color:'#6b7280', margin:'4px 0 0',
                fontFamily:"'Space Grotesk',sans-serif" }}>
                {to.tier} {to.sub}
              </p>
            </div>
            <AnimXPBar from={XP_PER_SUBRANK} to={newSubXP} rank={to}/>
          </motion.div>
        )}
      </div>

      <motion.button onClick={onDone}
        style={{ position:'absolute', bottom:28, fontSize:12,
          color:'rgba(255,255,255,0.28)', background:'none', border:'none', cursor:'pointer',
          fontFamily:'monospace' }}
        initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.5 }}>
        tap to continue
      </motion.button>
    </motion.div>
  );
}

// Bonus toast — fixed position, auto-dismiss, manual close
export function BonusToast({ events, onDone }) {
  useEffect(() => {
    if (!events?.length) return;
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [events, onDone]);

  if (!events?.length) return null;

  return (
    <motion.div
      style={{
        position:'fixed', top:0, left:0, right:0, zIndex:45,
        display:'flex', flexDirection:'column',
        pointerEvents:'none',
      }}
      initial={{ y:-80, opacity:0 }}
      animate={{ y:0, opacity:1 }}
      exit={{ y:-80, opacity:0 }}
      transition={{ type:'spring', damping:22, stiffness:280 }}
    >
      {events.map((e,i) => (
        <div key={i} style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'10px 16px',
          background: e.type==='streak_bonus'
            ? 'linear-gradient(90deg,#0a1f00,#122800)'
            : 'linear-gradient(90deg,#1f0000,#280000)',
          borderBottom:`2px solid ${e.type==='streak_bonus' ? '#4ade80' : '#f87171'}`,
          pointerEvents:'auto',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>{e.emoji}</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700,
                color: e.type==='streak_bonus' ? '#4ade80' : '#f87171' }}>
                {e.name}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:1 }}>
                {e.type==='streak_bonus' ? `+${e.bonus} XP bonus awarded` : `−${e.penalty} XP penalty applied`}
              </div>
            </div>
          </div>
          <button onClick={onDone} style={{
            background:'none', border:'none', cursor:'pointer',
            color:'rgba(255,255,255,0.4)', fontSize:18, padding:'4px 8px', pointerEvents:'auto',
          }}>✕</button>
        </div>
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
