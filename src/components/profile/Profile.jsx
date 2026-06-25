import { useState } from 'react';
import { motion } from 'framer-motion';
import RankBadge from '../rank/RankBadge.jsx';
import XPBar from '../rank/XPBar.jsx';
import { ACHIEVEMENTS, XP_PER_SUBRANK } from '../../engine/xpEngine.js';

// ── GitHub-style heatmap ──────────────────────────────────────────────────────
function Heatmap({ history, rank }) {
  const today = new Date();
  const WEEKS = 9, TOTAL = WEEKS * 7;
  const cells = [];
  for (let i = TOTAL-1; i >= 0; i--) {
    const d  = new Date(today); d.setDate(today.getDate()-i);
    const ds = d.toISOString().slice(0,10);
    const h  = history.find(x => x.date===ds);
    const dow = (d.getDay()+6)%7;
    cells.push({ ds, h, dow });
  }
  const cols=[], firstDow=cells[0].dow;
  let col=[];
  for (let p=0;p<firstDow;p++) col.push(null);
  for (const cell of cells) {
    col.push(cell);
    if (col.length===7) { cols.push(col); col=[]; }
  }
  if (col.length>0) { while(col.length<7) col.push(null); cols.push(col); }

  function bg(h) {
    if (!h||!h.hasData) return 'rgba(255,255,255,0.05)';
    const t=h.tier;
    if (t==='ELITE')   return rank.color;
    if (t==='GREAT')   return `${rank.color}cc`;
    if (t==='SOLID')   return `${rank.color}88`;
    if (t==='WEAK')    return `${rank.color}44`;
    if (t==='POOR')    return 'rgba(251,146,60,0.55)';
    if (t==='PENALTY') return 'rgba(248,113,113,0.65)';
    return 'rgba(255,255,255,0.05)';
  }

  const LABELS=['M','','W','','F','','S'], C=11, G=3;
  return (
    <div>
      <div style={{ display:'flex', gap:G, overflowX:'auto', paddingBottom:4 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:G, marginRight:2, flexShrink:0 }}>
          {LABELS.map((l,i)=>(
            <div key={i} style={{ height:C, width:10, fontSize:8, color:'var(--text-muted)',
              lineHeight:`${C}px`, textAlign:'right', fontFamily:'monospace' }}>{l}</div>
          ))}
        </div>
        {cols.map((col,ci)=>(
          <div key={ci} style={{ display:'flex', flexDirection:'column', gap:G, flexShrink:0 }}>
            {col.map((cell,ri)=>(
              <div key={ri}
                title={cell?.h ? `${cell.ds}: ${cell.h.tier} · ${cell.h.xp>=0?'+':''}${cell.h.xp} XP`
                               : cell?.ds ? `${cell.ds}: no tasks` : ''}
                style={{ width:C, height:C, borderRadius:2, background:cell?bg(cell.h):'transparent',
                  cursor:cell?.h?'pointer':'default', transition:'transform 0.1s', flexShrink:0 }}
                onMouseEnter={e=>{if(cell?.h)e.target.style.transform='scale(1.35)';}}
                onMouseLeave={e=>{e.target.style.transform='scale(1)';}}/>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:12, marginTop:8, flexWrap:'wrap' }}>
        {[
          {label:'Elite',   c:rank.color},
          {label:'Solid',   c:`${rank.color}88`},
          {label:'Penalty', c:'rgba(248,113,113,0.65)'},
          {label:'None',    c:'rgba(255,255,255,0.05)'},
        ].map(l=>(
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:l.c, flexShrink:0 }}/>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Username editor — replaces the h2 in-place ────────────────────────────────
function UsernameBlock({ username, onSave, rank }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(username);

  if (editing) return (
    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
      <input
        value={draft} maxLength={20} autoFocus
        onChange={e=>setDraft(e.target.value)}
        onKeyDown={e=>{ if(e.key==='Enter'){onSave(draft.trim());setEditing(false);} if(e.key==='Escape')setEditing(false); }}
        style={{
          fontSize:22, fontWeight:700, color:'#fff', background:'transparent',
          border:'none', borderBottom:`2px solid ${rank.color}`,
          outline:'none', padding:'0 2px', minWidth:0, flex:1,
          fontFamily:"'Space Grotesk',sans-serif",
        }}
      />
      <button onClick={()=>{onSave(draft.trim());setEditing(false);}} style={{
        padding:'4px 12px', borderRadius:8, fontSize:13, fontWeight:700,
        background: rank.color, color:'#000', border:'none', cursor:'pointer',
      }}>Save</button>
      <button onClick={()=>setEditing(false)} style={{
        padding:'4px 8px', borderRadius:8, fontSize:13,
        background:'rgba(255,255,255,0.07)', color:'#aaa', border:'none', cursor:'pointer',
      }}>✕</button>
    </div>
  );

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <h2 style={{ fontSize:22, fontWeight:700, color:'#fff', lineHeight:1.1, margin:0 }}>
        {username || 'Aspirant'}
      </h2>
      <button
        onClick={()=>{setDraft(username);setEditing(true);}}
        title="Edit username"
        style={{
          width:26, height:26, borderRadius:6, flexShrink:0,
          background:'rgba(255,255,255,0.06)',
          border:'1px solid rgba(255,255,255,0.1)',
          color:'var(--text-muted)', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', padding:0,
        }}
        onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.12)';e.currentTarget.style.color='#fff';}}
        onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.color='var(--text-muted)';}}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  );
}

function Stat({ label, value, sub, rank }) {
  return (
    <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px' }}>
      <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:700, color: rank.color, fontFamily:"'Space Mono',monospace", lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function AchTile({ a, earned, rank }) {
  return (
    <div style={{
      background: earned?`${rank.color}10`:'var(--surface2)',
      border:`1px solid ${earned?rank.color+'44':'var(--border)'}`,
      borderRadius:10, padding:'10px 12px',
      opacity:earned?1:0.45, filter:earned?'none':'grayscale(1)',
    }} title={a.desc}>
      <div style={{ fontSize:20, marginBottom:4 }}>{earned?a.emoji:'🔒'}</div>
      <div style={{ fontSize:12, fontWeight:700, color:earned?rank.color:'var(--text-muted)', lineHeight:1.2 }}>{a.name}</div>
      {earned && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>+{a.bonus} XP</div>}
    </div>
  );
}

export default function Profile({ rank, subXP, rankingState, todayResult, username, setUsername, userPosition }) {
  const history     = rankingState?.history || [];
  const earned      = new Set(rankingState?.achievements || []);
  const activeDays  = history.filter(h => h.hasData);
  const totalDays   = activeDays.length;
  const perfectDays = activeDays.filter(h => h.pct===100).length;
  const avgXP       = totalDays>0 ? Math.round(activeDays.reduce((s,h)=>s+Math.max(0,h.xp),0)/totalDays) : 0;
  const bestDay     = activeDays.reduce((b,h)=>Math.max(b,h.xp||0),0);
  const posStreak   = todayResult?.summary?.posStreak ?? 0;
  const negStreak   = todayResult?.summary?.negStreak ?? 0;
  const today       = todayResult?.summary;
  const totalXP     = rankingState?.totalXP || 0;

  return (
    <div style={{ maxWidth:480, margin:'0 auto', display:'flex', flexDirection:'column', gap:12 }}>

      {/* ── Main rank card ──────────────────────────────────────────────────── */}
      <motion.div style={{
        background:'var(--surface)', border:`1px solid ${rank.color}30`,
        borderRadius:16, padding:20, boxShadow:`0 0 32px ${rank.glow}10`,
      }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:16 }}>
          <RankBadge rank={rank} size="lg" animate/>
          <div style={{ flex:1, minWidth:0 }}>
            <UsernameBlock username={username} onSave={setUsername} rank={rank}/>
            <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:13, fontWeight:700, color:rank.color }}>{rank.tier} {rank.sub}</span>
              {userPosition && (
                <span style={{ fontSize:12, color:'var(--text-muted)', background:'var(--surface2)',
                  padding:'1px 8px', borderRadius:99, border:'1px solid var(--border)' }}>
                  #{userPosition} globally
                </span>
              )}
            </div>
          </div>
        </div>

        {/* XP bar — no xpDelta text here, that's in Today card */}
        <XPBar rank={rank} subXP={subXP}/>

        {/* Total XP */}
        <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8,
          background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <span style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Total XP Earned
            </span>
            <span style={{ fontFamily:"'Space Mono',monospace", fontSize:13, fontWeight:700, color:rank.glow }}>
              {totalXP.toLocaleString()}
              <span style={{ color:'var(--text-muted)', fontWeight:400 }}> / 27,000</span>
            </span>
          </div>
          <div style={{ marginTop:6, height:3, borderRadius:99, background:'rgba(255,255,255,0.06)', overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:99,
              width:`${Math.min(100,(totalXP/27000)*100)}%`,
              background:`linear-gradient(90deg,${rank.color}88,${rank.glow})`,
              transition:'width 0.9s ease',
            }}/>
          </div>
        </div>

        {/* Streak pills */}
        {(posStreak>0||negStreak>0) && (
          <div style={{ marginTop:12, display:'flex', gap:8, flexWrap:'wrap' }}>
            {posStreak>0 && (
              <span style={{ fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:99,
                background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', color:'#4ade80' }}>
                🔥 {posStreak}-day streak
              </span>
            )}
            {negStreak>0 && (
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
            color:'var(--text-muted)', marginBottom:12 }}>
            Today's Result
            {!today.isFinalised && (
              <span style={{ marginLeft:8, color:rank.glow, fontSize:10 }}>⏳ in progress</span>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {[
              { k:'Completion',     v:`${today.pct.toFixed(1)}%` },
              { k:'Tier',           v:`${today.tier?.emoji||''} ${today.tier?.name||'—'}` },
              { k:'Base XP',        v: today.baseXP>0?`+${today.baseXP}`:'0' },
              { k:'Streak Bonus',   v: today.streakBonus>0?`+${today.streakBonus}`:'—' },
              { k:'Streak Penalty', v: today.streakPenalty>0?`−${today.streakPenalty}`:'—' },
              { k:'Achievement XP', v: today.achievementXP>0?`+${today.achievementXP}`:'—' },
            ].map(({k,v})=>(
              <div key={k} style={{ display:'flex', justifyContent:'space-between',
                fontSize:13, padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ color:'var(--text-muted)' }}>{k}</span>
                <span style={{ fontFamily:"'Space Mono',monospace", color:rank.glow, fontWeight:700 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700 }}>
            <span>Total today</span>
            <span style={{ fontFamily:"'Space Mono',monospace",
              color:todayResult.xpDelta>=0?'#4ade80':'#f87171' }}>
              {todayResult.xpDelta>=0?'+':''}{todayResult.xpDelta} XP
            </span>
          </div>
        </div>
      )}

      {/* ── Stats grid ──────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <Stat label="Global Rank"  value={userPosition?`#${userPosition}`:'—'} rank={rank}/>
        <Stat label="Avg XP / Day" value={avgXP.toLocaleString()} sub="on active days" rank={rank}/>
        <Stat label="Perfect Days" value={perfectDays} sub="100% completion" rank={rank}/>
        <Stat label="Best Day"     value={`+${bestDay.toLocaleString()}`} sub="XP earned" rank={rank}/>
      </div>

      {/* ── Heatmap ─────────────────────────────────────────────────────────── */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:16 }}>
        <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em',
          color:'var(--text-muted)', marginBottom:12 }}>Activity — Last 63 Days</div>
        <Heatmap history={history} rank={rank}/>
      </div>

      {/* ── Achievements ────────────────────────────────────────────────────── */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:16, marginBottom:8 }}>
        <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em',
          color:'var(--text-muted)', marginBottom:12 }}>Achievements</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {ACHIEVEMENTS.map(a=><AchTile key={a.id} a={a} earned={earned.has(a.id)} rank={rank}/>)}
        </div>
      </div>

    </div>
  );
}
