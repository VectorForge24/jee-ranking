/**
 * App root — auth gate, layout shell, tab nav.
 * Clean, minimal chrome. Rank color injected as CSS vars.
 */
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRankingState } from './hooks/useRankingState.js';
import RankAnimation, { BonusToast } from './components/animations/RankAnimation.jsx';
import Profile from './components/profile/Profile.jsx';
import Leaderboard from './components/leaderboard/Leaderboard.jsx';
import RankBadge from './components/rank/RankBadge.jsx';

// ── Login screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  // Preview ranks for the showcase
  const PREVIEW = [
    { tier:'Bronze',    sub:'III', color:'#CD7F32', glow:'#E8A050', bg:'#1C1008' },
    { tier:'Silver',    sub:'I',   color:'#B8C4CC', glow:'#D8E4EC', bg:'#101418' },
    { tier:'Gold',      sub:'II',  color:'#F5C400', glow:'#FFE066', bg:'#141000' },
    { tier:'Platinum',  sub:'I',   color:'#00C8D0', glow:'#60E8F0', bg:'#001418' },
    { tier:'Diamond',   sub:'II',  color:'#60C8FF', glow:'#A0E0FF', bg:'#001018' },
    { tier:'Conqueror', sub:'I',   color:'#FF5030', glow:'#FF8060', bg:'#180800' },
  ];

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:24,
      background:'#0C0D10' }}>

      {/* Ambient glow */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse at 50% 30%, rgba(205,127,50,0.07) 0%, transparent 60%)' }}/>

      <motion.div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:360,
        display:'flex', flexDirection:'column', alignItems:'center', gap:28, textAlign:'center' }}
        initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}>

        {/* Title */}
        <div style={{ display:'flex', flexDirection:'column', gap:2, alignItems:'center' }}>
          <h1 style={{
            fontFamily:"'Space Mono', monospace",
            fontWeight:700, lineHeight:1, textAlign:'center',
          }}>
            <span style={{ fontSize:28, color:'#ffffff', letterSpacing:'0.12em', display:'block' }}>JEE</span>
            <span style={{ fontSize:42, color:'#ffffff', letterSpacing:'0.06em', display:'block', marginTop:2 }}>RANKING</span>
          </h1>
        </div>

        {/* Badge showcase */}
        <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center' }}>
          {PREVIEW.map((r,i) => (
            <motion.div key={r.tier}
              initial={{ opacity:0, y:14 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay:0.1 + i*0.07 }}>
              <RankBadge rank={r} size='sm' animate={i===5}/>
            </motion.div>
          ))}
        </div>

        {/* Description */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.6 }}>
            Earn XP from your daily JEE tasks, climb through 18 ranks, and compete on a live leaderboard with 499 other aspirants.
          </p>
          <p style={{ fontSize:12, color:'var(--text-muted)' }}>
            Reads directly from your Google Drive tracker data.
          </p>
        </div>

        {/* CTA */}
        <motion.button onClick={onLogin}
          style={{
            width:'100%', padding:'14px 0', borderRadius:14, fontSize:16, fontWeight:700,
            background:'linear-gradient(135deg, #CD7F32, #E8A050)',
            color:'#000', border:'none', cursor:'pointer',
            fontFamily:"'Space Grotesk', sans-serif",
            boxShadow:'0 0 28px rgba(205,127,50,0.35)',
          }}
          whileHover={{ scale:1.02, boxShadow:'0 0 40px rgba(205,127,50,0.5)' }}
          whileTap={{ scale:0.98 }}>
          Continue with Google
        </motion.button>

        <p style={{ fontSize:11, color:'var(--text-muted)' }}>
          Uses the same Google account as your JEE Tracker
        </p>
      </motion.div>
    </div>
  );
}

// ── Loading screen ─────────────────────────────────────────────────────────────
function LoadingScreen() {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDot(d => (d+1)%4), 400);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:16, background:'#0C0D10' }}>
      <motion.div style={{
        width:36, height:36, borderRadius:'50%',
        border:'2.5px solid transparent',
        borderTopColor:'#CD7F32', borderRightColor:'rgba(205,127,50,0.3)',
      }}
        animate={{ rotate:360 }} transition={{ duration:0.85, repeat:Infinity, ease:'linear' }}/>
      <p style={{ fontSize:13, color:'var(--text-muted)', fontFamily:"'Space Mono', monospace" }}>
        Syncing from Drive{'...'.slice(0,dot+1)}
      </p>
      <p style={{ fontSize:11, color:'rgba(255,255,255,0.2)' }}>
        Reading your task history
      </p>
    </div>
  );
}

// ── Error screen ──────────────────────────────────────────────────────────────
function ErrorScreen({ error, onRetry, onLogout }) {
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:16, padding:24, background:'#0C0D10' }}>
      <div style={{ fontSize:32 }}>⚠️</div>
      <h2 style={{ fontSize:18, fontWeight:700, color:'#f87171' }}>Something went wrong</h2>
      <p style={{ fontSize:13, color:'var(--text-muted)', textAlign:'center', maxWidth:280 }}>{error}</p>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={onRetry}
          style={{ padding:'9px 20px', borderRadius:10, background:'rgba(255,255,255,0.08)',
            color:'#fff', border:'1px solid var(--border)', cursor:'pointer', fontSize:14 }}>
          Retry
        </button>
        <button onClick={onLogout}
          style={{ padding:'9px 20px', borderRadius:10, background:'transparent',
            color:'var(--text-muted)', border:'1px solid var(--border)', cursor:'pointer', fontSize:14 }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────
function Header({ rank, username, userPosition, onLogout, isSyncing }) {
  return (
    <header style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'10px 16px',
      background:'rgba(12,13,16,0.95)',
      borderBottom:`1px solid ${rank.color}22`,
      backdropFilter:'blur(10px)',
      position:'sticky', top:0, zIndex:10,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <RankBadge rank={rank} size="sm" animate={false}/>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color: rank.color,
            fontFamily:"'Space Mono', monospace" }}>
            {rank.tier} {rank.sub}
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>
            {userPosition ? `#${userPosition} · ` : ''}{username}
            {isSyncing && <span style={{ marginLeft:6, color: rank.glow }}>⟳ saving…</span>}
          </div>
        </div>
      </div>

      <button onClick={onLogout}
        style={{ padding:'5px 12px', borderRadius:8, fontSize:12, fontWeight:500,
          background:'var(--surface2)', color:'var(--text-muted)',
          border:'1px solid var(--border)', cursor:'pointer' }}>
        Sign out
      </button>
    </header>
  );
}

// ── Bottom nav ────────────────────────────────────────────────────────────────
function BottomNav({ tab, setTab, rank }) {
  const tabs = [
    { id:'profile',     label:'Profile',     icon:'⚔️' },
    { id:'leaderboard', label:'Leaderboard', icon:'🏆' },
  ];
  return (
    <nav style={{
      position:'fixed', bottom:0, left:0, right:0,
      display:'flex',
      background:'rgba(12,13,16,0.97)',
      borderTop:`1px solid ${rank.color}20`,
      backdropFilter:'blur(10px)',
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)}
          style={{
            flex:1, padding:'12px 0', display:'flex', flexDirection:'column',
            alignItems:'center', gap:2, cursor:'pointer',
            background:'transparent', border:'none',
            borderTop: tab===t.id ? `2px solid ${rank.color}` : '2px solid transparent',
          }}>
          <span style={{ fontSize:18 }}>{t.icon}</span>
          <span style={{
            fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em',
            color: tab===t.id ? rank.color : 'var(--text-muted)',
            fontFamily:"'Space Mono', monospace",
          }}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('profile');

  const {
    isLoggedIn, loginWithGoogle, logout,
    username, setUsername, userProfile,
    phase, error, isSyncing,
    rank, subXP, rankingState, todayResult,
    leaderboard, positionDeltas, userPosition,
    animQueue, consumeAnim, refresh,
  } = useRankingState();

  // Inject CSS vars for rank theme
  useEffect(() => {
    if (!rank) return;
    const r = document.documentElement;
    r.style.setProperty('--rank-color', rank.color);
    r.style.setProperty('--rank-glow',  rank.glow);
    r.style.setProperty('--rank-bg',    rank.bg);
  }, [rank?.tier, rank?.sub]);

  const bonusEvents = todayResult?.summary?.bonusEvents || [];

  if (!isLoggedIn)     return <LoginScreen onLogin={loginWithGoogle}/>;
  if (phase==='loading') return <LoadingScreen/>;
  if (phase==='error')   return <ErrorScreen error={error} onRetry={refresh} onLogout={logout}/>;

  return (
    <div style={{ minHeight:'100vh', background:'#0C0D10', paddingBottom:72 }}>

      <RankAnimation animQueue={animQueue} consumeAnim={consumeAnim}/>

      <AnimatePresence>
        {bonusEvents.length > 0 && (
          <BonusToast key="toast" events={bonusEvents} onDone={() => {}}/>
        )}
      </AnimatePresence>

      <Header
        rank={rank} username={username}
        userPosition={userPosition} onLogout={logout} isSyncing={isSyncing}
      />

      <main style={{ padding:'16px 16px 0' }}>
        {/* Profile and Leaderboard are always mounted — just hidden via display:none.
            This avoids Framer Motion layoutId conflicts that blank the profile
            when returning from the leaderboard's animated rows. */}
        <div style={{ display: tab === 'profile' ? 'block' : 'none' }}>
          <Profile
            rank={rank} subXP={subXP}
            rankingState={rankingState}
            todayResult={todayResult}
            username={username} setUsername={setUsername}
            userProfile={userProfile}
            userPosition={userPosition}
          />
        </div>
        <div style={{ display: tab === 'leaderboard' ? 'block' : 'none' }}>
          <Leaderboard
            leaderboard={leaderboard}
            positionDeltas={positionDeltas}
            userPosition={userPosition}
          />
        </div>
      </main>

      <BottomNav tab={tab} setTab={setTab} rank={rank}/>
    </div>
  );
}
