import { motion, AnimatePresence } from 'framer-motion';

const RULES = [
  {
    heading: '⚡ How XP is Calculated',
    body: `Each day, your XP is based on hours completed vs hours registered.

Formula: Base XP = Total Registered Hours × 100

Then multiplied by your completion tier:
  🔥 ELITE   ≥90% done  → ×1.50  (e.g. 13hrs reg, 12 done = +1,950 XP)
  ⚡ GREAT   75–89%     → ×1.20
  ✅ SOLID   55–74%     → ×0.90
  ⚠️  WEAK    35–54%     → ×0.55
  🔻 POOR    15–34%     → ×0.20
  💀 PENALTY <15%       → ×−0.40 (only applied after day ends)

Mid-day: You will never see a deduction while tasks are in progress. XP starts at 0 and climbs as you check off tasks. Penalties only lock in at midnight.`,
  },
  {
    heading: '🏆 Rank Structure',
    body: `6 tiers, each with 3 sub-ranks (III → II → I):
Bronze → Silver → Gold → Platinum → Diamond → Conqueror

Each sub-rank = 1,500 XP to fill.
Full journey to Conqueror I = 18 × 1,500 = 27,000 XP.

After Conqueror I: XP keeps accumulating as a prestige score (★ mode). No cap.`,
  },
  {
    heading: '📈 Promotion & Demotion',
    body: `Promotion: Fill your current 1,500 XP bar → instantly advance.

Demotion: Triggered only by penalty days (<15% at day end).
Example: Bronze II, 200/1500 XP. Penalty = −520 XP.
200 − 520 = −320 → drop to Bronze III at 1,180/1,500.

Floor: You can never drop below Bronze III, 0 XP.`,
  },
  {
    heading: '🔥 Streak Bonuses',
    body: `≥85% completion streak (consecutive days):
  3 days  → +300 XP   Hot Streak
  5 days  → +600 XP   On Fire
  7 days  → +1,000 XP Unstoppable
  10 days → +1,500 XP Legendary

These stack — day 10 earns all four bonuses.

<20% completion streak (penalty days):
  3 days → −500 XP   Slump
  5 days → −1,000 XP Freefall
  7 days → −1,500 XP Collapse

Applied on top of the daily penalty.`,
  },
  {
    heading: '🎖️ Achievements (one-time bonuses)',
    body: `🌟 First Blood +200 XP
   Score your first ELITE day (≥90% completion).

💯 Perfectionist +250 XP
   Complete 100% of tasks in a single day.

🏆 Perfect Week +800 XP
   100% completion for 5 consecutive days.

📚 Triple Threat +100 XP
   Tasks from all 3 subjects in one day.

🎖️ Breakthrough +500 XP
   Reach a brand-new tier for the first time.

Each is earned only once, ever.`,
  },
  {
    heading: '🏅 Leaderboard',
    body: `You compete with 499 simulated students. Each bot has a personality (Grinder, Rocket, Consistent, Slacker, Elite) that determines daily XP gain/loss.

Bots are seeded deterministically — same results for everyone, ensuring fair competition. Tap any player row to see their stats.`,
  },
];

export default function HelpModal({ isOpen, onClose, rank }) {
  if (!rank) return null;
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={{
            position:'fixed', inset:0, zIndex:50,
            display:'flex', alignItems:'flex-end', justifyContent:'center',
            background:'rgba(0,0,0,0.85)', backdropFilter:'blur(6px)',
          }}
          initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={e => e.stopPropagation()}
            style={{
              background:'#111318',
              border:`1px solid ${rank.color}30`,
              borderRadius:'20px 20px 0 0',
              width:'100%', maxWidth:520,
              maxHeight:'85vh',
              display:'flex', flexDirection:'column',
              boxShadow:`0 -8px 40px ${rank.glow}18`,
            }}
            initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
            transition={{ type:'spring', damping:28, stiffness:260 }}
          >
            <div style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'16px 20px',
              borderBottom:`1px solid rgba(255,255,255,0.07)`,
              flexShrink:0,
            }}>
              <div>
                <h2 style={{ fontSize:17, fontWeight:700, color:'#fff', margin:0 }}>How It Works</h2>
                <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2, marginBottom:0 }}>Rules, XP system & achievements</p>
              </div>
              <button onClick={onClose} style={{
                width:32, height:32, borderRadius:8,
                background:'rgba(255,255,255,0.07)',
                border:'1px solid rgba(255,255,255,0.1)',
                color:'#aaa', fontSize:16, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>✕</button>
            </div>

            <div style={{ overflowY:'auto', padding:'16px 20px 32px', display:'flex', flexDirection:'column', gap:20 }}>
              {RULES.map((r,i) => (
                <div key={i}>
                  <h3 style={{ fontSize:14, fontWeight:700, color: rank.color, marginBottom:8, marginTop:0 }}>{r.heading}</h3>
                  <p style={{
                    fontSize:13, lineHeight:1.75, color:'rgba(255,255,255,0.72)',
                    whiteSpace:'pre-line', margin:0, fontFamily:"'Space Grotesk', sans-serif",
                  }}>{r.body}</p>
                  {i < RULES.length-1 && <div style={{ marginTop:16, height:1, background:'rgba(255,255,255,0.05)' }}/>}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
