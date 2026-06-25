/**
 * Leaderboard — clean table, readable on mobile.
 * Real user row is pinned and highlighted.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RankChip } from '../rank/RankBadge.jsx';
import { XP_PER_SUBRANK } from '../../engine/xpEngine.js';

const PAGE = 50;

function Delta({ v }) {
  if (!v) return <span style={{ color:'var(--text-muted)', fontSize:11 }}>—</span>;
  const up = v > 0;
  return (
    <span style={{ fontSize:11, fontWeight:700, color: up ? '#4ade80' : '#f87171',
      display:'flex', alignItems:'center', gap:1 }}>
      {up ? '▲' : '▼'}{Math.abs(v)}
    </span>
  );
}

function PlayerModal({ e, onClose }) {
  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background:'rgba(0,0,0,0.8)', backdropFilter:'blur(6px)' }}
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}>
      <motion.div onClick={ev => ev.stopPropagation()}
        style={{
          background:'var(--surface)', border:`1px solid ${e.rank.color}44`,
          borderRadius:16, padding:24, maxWidth:320, width:'100%',
          boxShadow:`0 0 40px ${e.rank.glow}18`,
        }}
        initial={{ scale:0.88, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.88, y:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <h3 style={{ fontSize:17, fontWeight:700, color:'#fff' }}>{e.username}</h3>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
              {e.isRealUser ? 'You' : 'JEE Aspirant'}
            </p>
          </div>
          <RankChip rank={e.rank}/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
          {[
            { k:'Position',    v:`#${e.position}` },
            { k:'Total XP',    v:e.totalXP.toLocaleString() },
            { k:'Today',       v:`${e.todayXP >= 0 ? '+' : ''}${e.todayXP}` },
            { k:'Sub-rank XP', v:`${e.subXP}/${XP_PER_SUBRANK}` },
          ].map(({ k, v }) => (
            <div key={k} style={{ background:'var(--surface2)', borderRadius:10,
              padding:'10px 12px', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3 }}>{k}</div>
              <div style={{ fontSize:15, fontWeight:700, color: e.rank.color,
                fontFamily:"'Space Mono', monospace" }}>{v}</div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{
          width:'100%', padding:'10px 0', borderRadius:10, fontSize:14, fontWeight:600,
          background:`${e.rank.color}22`, color: e.rank.color,
          border:`1px solid ${e.rank.color}44`, cursor:'pointer',
        }}>Close</button>
      </motion.div>
    </motion.div>
  );
}

export default function Leaderboard({ leaderboard, positionDeltas, userPosition }) {
  const [mode,  setMode]  = useState('near'); // near | top | all
  const [page,  setPage]  = useState(0);
  const [modal, setModal] = useState(null);

  const entries = useMemo(() => {
    if (mode === 'top')  return leaderboard.slice(0, PAGE);
    if (mode === 'near' && userPosition) {
      const c = userPosition - 1;
      const s = Math.max(0, c - 12);
      return leaderboard.slice(s, Math.min(leaderboard.length, s + 28));
    }
    return leaderboard.slice(page * PAGE, (page+1) * PAGE);
  }, [leaderboard, mode, page, userPosition]);

  const pages = Math.ceil(leaderboard.length / PAGE);
  const medals = ['🥇','🥈','🥉'];

  return (
    <div style={{ maxWidth:520, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <h2 style={{ fontSize:17, fontWeight:700, color:'#fff' }}>Leaderboard</h2>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>500 players · June 2026</p>
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {[['near',`#${userPosition||'?'}`],['top','Top 50'],['all','All']].map(([m,label]) => (
            <button key={m} onClick={() => { setMode(m); setPage(0); }}
              style={{
                padding:'5px 10px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer',
                background: mode===m ? 'var(--rank-color)' : 'var(--surface2)',
                color:      mode===m ? '#000' : 'var(--text-muted)',
                border:     mode===m ? 'none' : '1px solid var(--border)',
                transition: 'all 0.15s',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display:'grid', gridTemplateColumns:'36px 32px 1fr 80px 60px',
        gap:8, padding:'0 12px 8px',
        fontSize:11, color:'var(--text-muted)',
        textTransform:'uppercase', letterSpacing:'0.05em',
        borderBottom:'1px solid var(--border)',
      }}>
        <span>#</span><span>±</span><span>Player</span><span>Rank</span><span style={{textAlign:'right'}}>Today</span>
      </div>

      {/* Rows */}
      <div style={{ marginTop:4 }}>
        {entries.map(e => {
          const isMe = e.isRealUser;
          const top3 = e.position <= 3;
          return (
            <motion.div key={e.id}
              onClick={() => setModal(e)}
              style={{
                display:'grid', gridTemplateColumns:'36px 32px 1fr 80px 60px',
                gap:8, padding:'9px 12px',
                background: isMe ? `${e.rank.color}10` : 'transparent',
                border: isMe ? `1px solid ${e.rank.color}30` : '1px solid transparent',
                borderRadius: 10,
                cursor:'pointer',
                marginBottom:2,
                transition:'background 0.15s',
              }}
              whileHover={{ background: isMe ? `${e.rank.color}18` : 'rgba(255,255,255,0.03)' }}
            >
              {/* Position */}
              <div style={{ fontSize:13, fontWeight:700, display:'flex', alignItems:'center' }}>
                {top3
                  ? <span>{medals[e.position-1]}</span>
                  : <span style={{ color:'var(--text-muted)', fontFamily:"'Space Mono',monospace",
                      fontSize:11 }}>#{e.position}</span>
                }
              </div>

              {/* Delta */}
              <div style={{ display:'flex', alignItems:'center' }}>
                <Delta v={positionDeltas?.[e.id]}/>
              </div>

              {/* Username */}
              <div style={{ display:'flex', alignItems:'center', minWidth:0 }}>
                <span style={{
                  fontSize:14, fontWeight: isMe ? 700 : 500,
                  color: isMe ? e.rank.color : 'var(--text)',
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                }}>
                  {isMe ? '⭐ ' : ''}{e.username}
                </span>
              </div>

              {/* Rank chip */}
              <div style={{ display:'flex', alignItems:'center' }}>
                <RankChip rank={e.rank}/>
              </div>

              {/* Today XP */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end' }}>
                <span style={{
                  fontSize:12, fontWeight:700,
                  fontFamily:"'Space Mono',monospace",
                  color: e.todayXP >= 0 ? '#4ade80' : '#f87171',
                }}>
                  {e.todayXP >= 0 ? '+' : ''}{e.todayXP}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pagination */}
      {mode === 'all' && pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
          gap:12, marginTop:16 }}>
          <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={page===0}
            style={{ padding:'6px 14px', borderRadius:8, background:'var(--surface2)',
              color:'var(--text)', border:'1px solid var(--border)', cursor:'pointer',
              opacity: page===0 ? 0.35 : 1 }}>← Prev</button>
          <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'monospace' }}>
            {page+1}/{pages}
          </span>
          <button onClick={() => setPage(p => Math.min(pages-1,p+1))} disabled={page===pages-1}
            style={{ padding:'6px 14px', borderRadius:8, background:'var(--surface2)',
              color:'var(--text)', border:'1px solid var(--border)', cursor:'pointer',
              opacity: page===pages-1 ? 0.35 : 1 }}>Next →</button>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && <PlayerModal key="modal" e={modal} onClose={() => setModal(null)}/>}
      </AnimatePresence>
    </div>
  );
}
