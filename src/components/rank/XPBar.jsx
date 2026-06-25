/**
 * XPBar — thin PUBG-style animated bar.
 * No "today" text shown here — that's in the Today card below.
 */
import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { XP_PER_SUBRANK } from '../../engine/xpEngine.js';

export default function XPBar({ rank, subXP, compact=false }) {
  const pct    = Math.min(100, Math.max(0, (subXP / XP_PER_SUBRANK) * 100));
  const spring = useSpring(0, { stiffness: 45, damping: 14 });
  const width  = useTransform(spring, v => `${v}%`);

  useEffect(() => {
    const t = setTimeout(() => spring.set(pct), 350);
    return () => clearTimeout(t);
  }, [pct]);

  if (compact) return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:3, borderRadius:99, overflow:'hidden', background:`${rank.color}18` }}>
        <div style={{ height:'100%', width:`${pct}%`, background: rank.color, borderRadius:99, transition:'width 0.7s ease' }}/>
      </div>
      <span style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color: rank.glow, minWidth:60, textAlign:'right' }}>
        {subXP}/{XP_PER_SUBRANK}
      </span>
    </div>
  );

  return (
    <div>
      {/* Labels */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
        <span style={{ fontSize:12, fontWeight:600, color: rank.color }}>
          {rank.tier} {rank.sub}
        </span>
        <span style={{ fontSize:12, fontFamily:"'Space Mono',monospace", color:'var(--text-muted)' }}>
          {subXP.toLocaleString()} / {XP_PER_SUBRANK.toLocaleString()} XP
        </span>
      </div>

      {/* Track — thin, 5px, PUBG-style */}
      <div style={{
        position:'relative', height:5, borderRadius:99, overflow:'hidden',
        background:`${rank.color}15`,
        boxShadow:`inset 0 0 0 1px ${rank.color}20`,
      }}>
        {/* Animated fill */}
        <motion.div style={{
          position:'absolute', inset:'0 auto 0 0',
          width,
          background:`linear-gradient(90deg, ${rank.color}cc, ${rank.glow})`,
          borderRadius:99,
          boxShadow:`0 0 8px ${rank.glow}88`,
        }}/>

        {/* Pulse glow at the leading edge */}
        <motion.div
          style={{
            position:'absolute', top:0, bottom:0, width:20,
            background:`linear-gradient(90deg, transparent, ${rank.glow}cc, transparent)`,
          }}
          animate={{ left:['-10%','110%'] }}
          transition={{ duration:2.4, repeat:Infinity, ease:'linear', repeatDelay:1.8 }}
        />
      </div>
    </div>
  );
}
