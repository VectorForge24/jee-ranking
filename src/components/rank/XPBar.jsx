import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { XP_PER_SUBRANK } from '../../engine/xpEngine.js';

export default function XPBar({ rank, subXP, xpDelta, compact=false }) {
  const pct = Math.min(100, (subXP / XP_PER_SUBRANK) * 100);
  const spring = useSpring(0, { stiffness: 55, damping: 16 });
  const width  = useTransform(spring, v => `${v}%`);

  useEffect(() => {
    const t = setTimeout(() => spring.set(pct), 300);
    return () => clearTimeout(t);
  }, [pct]);

  if (compact) return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:`${rank.color}18` }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width:`${pct}%`, background: rank.color }}/>
      </div>
      <span className="text-xs font-mono" style={{ color: rank.glow, minWidth:36 }}>
        {subXP}/{XP_PER_SUBRANK}
      </span>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold" style={{ color: rank.color }}>
          {rank.tier} {rank.sub}
        </span>
        <div className="flex items-center gap-2">
          {xpDelta !== undefined && xpDelta !== 0 && (
            <motion.span
              className="text-xs font-bold font-mono"
              style={{ color: xpDelta > 0 ? '#4ade80' : '#f87171' }}
              initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}
            >
              {xpDelta > 0 ? '+' : ''}{xpDelta} today
            </motion.span>
          )}
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {subXP.toLocaleString()} / {XP_PER_SUBRANK.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Track */}
      <div className="relative h-3 rounded-full overflow-hidden"
        style={{ background:`${rank.color}18`, border:`1px solid ${rank.color}22` }}>
        {/* Fill */}
        <motion.div className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width,
            background: `linear-gradient(90deg, ${rank.color}aa, ${rank.glow}, ${rank.color})`,
            boxShadow: `0 0 8px ${rank.glow}66`,
          }}
        />
        {/* Shimmer */}
        <motion.div
          className="absolute inset-y-0 w-1/4 rounded-full pointer-events-none"
          style={{ background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }}
          animate={{ x:['-100%','500%'] }}
          transition={{ duration:2.2, repeat:Infinity, ease:'linear', repeatDelay:2 }}
        />
      </div>
    </div>
  );
}
