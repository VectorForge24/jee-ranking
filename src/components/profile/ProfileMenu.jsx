/**
 * ProfileMenu — slides up from bottom when badge is tapped in header.
 * Shows: Gmail photo + name + rank badge + monthly history dropdown.
 * Photo can be replaced by uploading a custom image.
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RankBadge from '../rank/RankBadge.jsx';
import { XP_PER_SUBRANK, RANKS } from '../../engine/xpEngine.js';

function compressImage(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = ev => {
      const img = new Image();
      img.src = ev.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > 400) { h = Math.round(h * 400 / w); w = 400; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
    };
  });
}

function MonthRow({ record, isExpanded, onToggle }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '10px 0',
          background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
          {record.monthLabel}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: record.rank?.color || '#888',
            fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>
            {record.rank ? `${record.rank.tier} ${record.rank.sub}` : '—'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', transition: 'transform 0.2s',
            display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</span>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { k: 'Best Rank',      v: record.rank ? `${record.rank.tier} ${record.rank.sub}` : '—' },
                { k: 'Best Position',  v: record.bestPosition ? `#${record.bestPosition}` : '—' },
                { k: 'Total XP',       v: record.totalXP ? `${record.totalXP.toLocaleString()} XP` : '—' },
                { k: 'Active Days',    v: record.activeDays ?? '—' },
              ].map(({ k, v }) => (
                <div key={k} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase',
                    letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: record.rank?.color || '#ccc',
                    fontFamily: "'Space Mono',monospace" }}>{v}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProfileMenu({ isOpen, onClose, rank, username, userProfile, rankingState, userPosition }) {
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [customPhoto,   setCustomPhoto]   = useState(() => localStorage.getItem('ranking_custom_photo') || null);
  const fileRef = useRef();

  // Build monthly history from rankingState.history
  const history   = rankingState?.history || [];
  const monthMap  = {};
  history.forEach(h => {
    const [y, m] = h.date.split('-');
    const key    = `${y}-${m}`;
    if (!monthMap[key]) monthMap[key] = { dates: [], xpTotal: 0, activeDays: 0 };
    monthMap[key].dates.push(h);
    if (h.hasData) { monthMap[key].xpTotal += Math.max(0, h.xp || 0); monthMap[key].activeDays++; }
  });

  const monthRecords = Object.entries(monthMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, val]) => {
      const [y, m] = key.split('-');
      const label  = new Date(parseInt(y), parseInt(m)-1, 1)
        .toLocaleDateString('en', { month: 'long', year: 'numeric' });
      // Best XP in this month → rank
      const cumXP  = val.xpTotal;
      const rIdx   = Math.min(Math.floor(cumXP / XP_PER_SUBRANK), RANKS.length - 1);
      return {
        key,
        monthLabel:   label,
        rank:         cumXP > 0 ? RANKS[rIdx] : null,
        totalXP:      val.xpTotal,
        activeDays:   val.activeDays,
        bestPosition: null, // would need stored leaderboard snapshots
      };
    });

  const photoSrc = customPhoto || userProfile?.photoURL || null;
  const initials = (username || 'S').slice(0, 2).toUpperCase();

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file);
    localStorage.setItem('ranking_custom_photo', compressed);
    setCustomPhoto(compressed);
    e.target.value = null;
  }

  function clearCustomPhoto() {
    localStorage.removeItem('ranking_custom_photo');
    setCustomPhoto(null);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#111318',
              border: `1px solid ${rank.color}30`,
              borderRadius: '20px 20px 0 0',
              width: '100%', maxWidth: 480,
              maxHeight: '88vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: `0 -8px 48px ${rank.glow}18`,
            }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.15)' }}/>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', padding: '8px 20px 32px' }}>

              {/* Avatar + name + rank */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 16 }}>

                {/* Avatar with pencil overlay */}
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: 88, height: 88, borderRadius: '50%',
                    border: `3px solid ${rank.color}`,
                    boxShadow: `0 0 20px ${rank.glow}44`,
                    overflow: 'hidden',
                    background: `${rank.color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {photoSrc
                      ? <img src={photoSrc} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                      : <span style={{ fontSize: 32, fontWeight: 700, color: rank.color }}>{initials}</span>
                    }
                  </div>

                  {/* Pencil button */}
                  <button
                    onClick={() => fileRef.current.click()}
                    title="Change photo"
                    style={{
                      position: 'absolute', bottom: 2, right: 2,
                      width: 26, height: 26, borderRadius: '50%',
                      background: rank.color, border: '2px solid #111318',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#000',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload}/>
                </div>

                {/* Remove custom photo link */}
                {customPhoto && (
                  <button onClick={clearCustomPhoto}
                    style={{ fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Remove custom photo
                  </button>
                )}

                {/* Name */}
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>{username || 'Aspirant'}</h2>
                  {userProfile?.email && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>{userProfile.email}</p>
                  )}
                </div>

                {/* Rank badge + position */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <RankBadge rank={rank} size="md" animate/>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: rank.color }}>{rank.tier} {rank.sub}</span>
                    {userPosition && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)',
                        background: 'var(--surface2)', padding: '1px 8px',
                        borderRadius: 99, border: '1px solid var(--border)' }}>
                        #{userPosition} globally
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick stats */}
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  {[
                    { label: 'Total XP', value: (rankingState?.totalXP || 0).toLocaleString() },
                    { label: 'Active Days', value: history.filter(h => h.hasData).length },
                    { label: 'Perfect Days', value: history.filter(h => h.pct === 100).length },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: rank.color,
                        fontFamily: "'Space Mono',monospace" }}>{value}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase',
                        letterSpacing: '0.05em' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly history */}
              <div>
                <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: 'var(--text-muted)', marginBottom: 8, marginTop: 0 }}>Monthly History</h3>
                {monthRecords.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                    No history yet — complete some tasks to build your record!
                  </p>
                ) : (
                  monthRecords.map(r => (
                    <MonthRow
                      key={r.key}
                      record={r}
                      isExpanded={expandedMonth === r.key}
                      onToggle={() => setExpandedMonth(prev => prev === r.key ? null : r.key)}
                    />
                  ))
                )}
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
