/**
 * Profile — clean card layout. Readable on mobile.
 * Card → XP bar → Today summary → Stats → Heatmap → Achievements
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import RankBadge from '../rank/RankBadge.jsx';
import XPBar from '../rank/XPBar.jsx';
import { ACHIEVEMENTS } from '../../engine/xpEngine.js';

// ── Activity heatmap (last 42 days, 6 weeks grid) ─────────────────────────────
function Heatmap({ history, rank }) {
  const today = new Date();
  const cells = [];

  for (let i = 41; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = d.toISOString().slice(0,10);
    const h  = history.find(x => x.date === ds);
    cells.push({ ds, h, dayName: d.toLocaleDateString('en',{weekday:'short'}), dayNum: d.getDay() });
  }

  function cellBg(h) {
    if (!h || !h.hasData) return 'rgba(255,255,255,0.04)';
    const t = h.tier;
    if (t === 'ELITE')   return rank.color;
    if (t === 'GREAT')   return `${rank.color}cc`;
    if (t === 'SOLID')   return `${rank.color}88`;
    if (t === 'WEAK')    return `${rank.color}44`;
    if (t === 'POOR')    return 'rgba(251,146,60,0.5)';
    if (t === 'PENALTY') return 'rgba(248,113,113,0.6)';
    return 'rgba(255,255,255,0.04)';
  }

  // Group into weeks (7 columns)
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i+7));

  return (
    <div>
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell, ci) => (
              <div key={ci}
                title={cell.h
                  ? `${cell.ds}: ${cell.h.tier} · ${cell.h.xp > 0 ? '+' : ''}${cell.h.xp} XP`
                  : `${cell.ds}: no tasks`}
                style={{
                  width: 12, height: 12, borderRadius: 2,
                  background: cellBg(cell.h),
                  transition: 'transform 0.1s',
                  cursor: cell.h ? 'pointer' : 'default',
                }}
                className="hover:scale-125"
              />
            ))}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-2.5 flex-wrap">
        {[
          { label:'Elite',   bg: rank.color },
          { label:'Solid',   bg:`${rank.color}88` },
          { label:'Penalty', bg:'rgba(248,113,113,0.6)' },
          { label:'None',    bg:'rgba(255,255,255,0.04)' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div style={{ width:10, height:10, borderRadius:2, background:l.bg }}/>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Username inline editor ─────────────────────────────────────────────────────
function UsernameEdit({ username, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(username);

  if (!editing) return (
    <button onClick={() => { setDraft(username); setEditing(true); }}
      style={{ fontSize:12, color:'var(--text-muted)', textDecoration:'underline', background:'none', border:'none', cursor:'pointer' }}>
      edit username
    </button>
  );
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
      <input value={draft} maxLength={20}
        onChange={e => setDraft(e.target.value)}
        autoFocus
        style={{
          background:'transparent', border:'none', borderBottom:'1px solid var(--rank-color)',
          color:'white', fontSize:14, padding:'2px 4px', outline:'none', width:140,
          fontFamily:"'Space Grotesk', sans-serif",
        }}
      />
      <button onClick={() => { onSave(draft.trim()); setEditing(false); }}
        style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:4,
          background:'var(--rank-color)', color:'#000', border:'none', cursor:'pointer' }}>
        Save
      </button>
      <button onClick={() => setEditing(false)}
        style={{ fontSize:12, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' }}>
        ✕
      </button>
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function Stat({ label, value, sub, rank }) {
  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 12, padding:'12px 14px',
    }}>
      <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize:20, fontWeight:700, color: rank.color, fontFamily:"'Space Mono', monospace", lineHeight:1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{sub}</div>}
    </div>
  );
}

// ── Achievement tile ──────────────────────────────────────────────────────────
function AchTile({ a, earned, rank }) {
  return (
    <div style={{
      background: earned ? `${rank.color}10` : 'var(--surface2)',
      border: `1px solid ${earned ? rank.color+'44' : 'var(--border)'}`,
      borderRadius: 10, padding:'10px 12px',
      opacity: earned ? 1 : 0.45,
      filter: earned ? 'none' : 'grayscale(1)',
    }} title={a.desc}>
      <div style={{ fontSize:20, marginBottom:4 }}>{earned ? a.emoji : '🔒'}</div>
      <div style={{ fontSize:12, fontWeight:700, color: earned ? rank.color : 'var(--text-muted)', lineHeight:1.2 }}>
        {a.name}
      </div>
      {earned && (
        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>+{a.bonus} XP</div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Profile({ rank, subXP, rankingState, todayResult, username, setUsername, userPosition }) {
  const history  = rankingState?.history || [];
  const earned   = new Set(rankingState?.achievements || []);

  const activeDays  = history.filter(h => h.hasData);
  const totalDays   = activeDays.length;
  const perfectDays = activeDays.filter(h => h.pct === 100).length;
  const avgXP       = totalDays > 0 ? Math.round(activeDays.reduce((s,h) => s + Math.max(0,h.xp), 0) / totalDays) : 0;
  const bestDay     = activeDays.reduce((b,h) => Math.max(b, h.xp||0), 0);

  const posStreak = todayResult?.summary?.posStreak ?? 0;
  const negStreak = todayResult?.summary?.negStreak ?? 0;
  const today     = todayResult?.summary;

  return (
    <div style={{ maxWidth:480, margin:'0 auto', display:'flex', flexDirection:'column', gap:12 }}>

      {/* ── Rank card ───────────────────────────────────────────────────────── */}
      <motion.div style={{
        background: 'var(--surface)',
        border: `1px solid ${rank.color}30`,
        borderRadius: 16,
        padding: 20,
        boxShadow: `0 0 32px ${rank.glow}12`,
      }}>
        {/* Badge + name row */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:16 }}>
          <RankBadge rank={rank} size="lg" animate/>
          <div style={{ flex:1, minWidth:0 }}>
            <h2 style={{ fontSize:22, fontWeight:700, color:'#fff', lineHeight:1.1 }}>
              {username || 'Aspirant'}
            </h2>
            <UsernameEdit username={username} onSave={setUsername}/>
            <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:13, fontWeight:700, color: rank.color }}>
                {rank.tier} {rank.sub}
              </span>
              {userPosition && (
                <span style={{ fontSize:12, color:'var(--text-muted)', background:'var(--surface2)',
                  padding:'1px 8px', borderRadius:99, border:'1px solid var(--border)' }}>
                  #{userPosition} globally
                </span>
              )}
            </div>
          </div>
        </div>

        {/* XP bar */}
        <XPBar rank={rank} subXP={subXP} xpDelta={todayResult?.xpDelta}/>

        {/* Total XP */}
        <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-muted)' }}>
          <span>Total XP</span>
          <span style={{ fontFamily:"'Space Mono', monospace", color: rank.glow, fontWeight:700 }}>
            {(rankingState?.totalXP || 0).toLocaleString()} XP
          </span>
        </div>

        {/* Streak badge */}
        {(posStreak > 0 || negStreak > 0) && (
          <div style={{ marginTop:12, display:'flex', gap:8 }}>
            {posStreak > 0 && (
              <span style={{ fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:99,
                background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', color:'#4ade80' }}>
                🔥 {posStreak}-day streak
              </span>
            )}
            {negStreak > 0 && (
              <span style={{ fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:99,
                background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', color:'#f87171' }}>
                🌧️ {negStreak}-day slump
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Today's result ───────────────────────────────────────────────────── */}
      {today && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
          <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em',
            color:'var(--text-muted)', marginBottom:12 }}>Today's Result</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { k:'Completion',      v:`${today.pct.toFixed(1)}%` },
              { k:'Tier',            v:`${today.tier?.emoji || ''} ${today.tier?.name || '—'}` },
              { k:'Base XP',         v:`+${today.baseXP}` },
              { k:'Streak Bonus',    v: today.streakBonus   > 0 ? `+${today.streakBonus}`   : '—' },
              { k:'Streak Penalty',  v: today.streakPenalty > 0 ? `−${today.streakPenalty}` : '—' },
              { k:'Achievement XP',  v: today.achievementXP > 0 ? `+${today.achievementXP}` : '—' },
            ].map(({ k, v }) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between',
                fontSize:13, padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ color:'var(--text-muted)' }}>{k}</span>
                <span style={{ fontFamily:"'Space Mono', monospace", color: rank.glow, fontWeight:700 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:10, display:'flex', justifyContent:'space-between',
            fontSize:14, fontWeight:700 }}>
            <span>Total today</span>
            <span style={{ fontFamily:"'Space Mono', monospace",
              color: todayResult.xpDelta >= 0 ? '#4ade80' : '#f87171' }}>
              {todayResult.xpDelta >= 0 ? '+' : ''}{todayResult.xpDelta} XP
            </span>
          </div>
        </div>
      )}

      {/* ── Stats grid ────────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <Stat label="Global Rank"  value={userPosition ? `#${userPosition}` : '—'} rank={rank}/>
        <Stat label="Avg XP / Day" value={avgXP.toLocaleString()} sub="on active days" rank={rank}/>
        <Stat label="Perfect Days" value={perfectDays} sub="100% completion" rank={rank}/>
        <Stat label="Best Day"     value={`+${bestDay.toLocaleString()}`} sub="XP earned" rank={rank}/>
      </div>

      {/* ── Activity heatmap ─────────────────────────────────────────────────── */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
        <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em',
          color:'var(--text-muted)', marginBottom:12 }}>Activity — Last 42 Days</div>
        <Heatmap history={history} rank={rank}/>
      </div>

      {/* ── Achievements ─────────────────────────────────────────────────────── */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
        <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em',
          color:'var(--text-muted)', marginBottom:12 }}>Achievements</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
          {ACHIEVEMENTS.map(a => <AchTile key={a.id} a={a} earned={earned.has(a.id)} rank={rank}/>)}
        </div>
      </div>

    </div>
  );
}
