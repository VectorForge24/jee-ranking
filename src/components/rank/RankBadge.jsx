/**
 * RankBadge — SVG badge with full tier name, consistent sizing across all ranks.
 *
 * Fixes:
 * - Full tier name shown (BRONZE, SILVER, GOLD, etc.) using textLength to auto-fit
 * - All 6 shield paths normalized to same bounding box (y: 6–90) so every badge
 *   renders at identical visual size regardless of tier
 * Sizes: sm=40 md=64 lg=96 xl=144
 */
import { motion } from 'framer-motion';

const SIZES = { sm:40, md:64, lg:96, xl:144 };

// All paths normalized to same visual bounds: x≈8–92, y≈6–90
// Each tier has a distinct silhouette but identical footprint
const SHAPES = {
  Bronze:    {
    d: 'M50 6 L88 22 L90 62 L50 90 L10 62 L12 22Z',
    inner: 0.78,
  },
  Silver:    {
    d: 'M50 6 L89 22 L91 63 L50 90 L9 63 L11 22Z',
    inner: 0.76,
  },
  Gold:      {
    d: 'M50 6 L90 21 L92 63 L50 90 L8 63 L10 21Z',
    inner: 0.76,
  },
  Platinum:  {
    d: 'M50 6 L74 12 L92 32 L92 64 L74 84 L50 90 L26 84 L8 64 L8 32 L26 12Z',
    inner: 0.76,
  },
  Diamond:   {
    d: 'M50 6 L76 10 L92 30 L92 66 L76 86 L50 90 L24 86 L8 66 L8 30 L24 10Z',
    inner: 0.75,
  },
  Conqueror: {
    d: 'M50 6 L78 10 L92 28 L92 68 L78 86 L50 90 L22 86 L8 68 L8 28 L22 10Z',
    inner: 0.74,
  },
};

// Full uppercase names — shown completely via textLength auto-fit
const TIER_LABEL = {
  Bronze:    'BRONZE',
  Silver:    'SILVER',
  Gold:      'GOLD',
  Platinum:  'PLATINUM',
  Diamond:   'DIAMOND',
  Conqueror: 'CONQUEROR',
};

// textLength width (in SVG units) available inside the shield at the label y position
// Narrower for tiers that taper more at the bottom
const LABEL_WIDTH = {
  Bronze:    62,
  Silver:    62,
  Gold:      64,
  Platinum:  60,
  Diamond:   58,
  Conqueror: 56,
};

export default function RankBadge({ rank, size = 'md', animate = true }) {
  if (!rank) return null;
  const px    = SIZES[size] || 64;
  const shape = SHAPES[rank.tier] || SHAPES.Bronze;
  const uid   = `badge-${rank.tier}-${rank.sub}-${size}`;
  const label = TIER_LABEL[rank.tier] || rank.tier.toUpperCase();
  const labelW = LABEL_WIDTH[rank.tier] || 60;

  // Font sizes: scale with badge size
  const tierFontSize = px <= 40 ? 7.5 : px <= 64 ? 8.5 : 9.5;
  const subFontSize  = px <= 40 ? 7   : px <= 64 ? 7.5 : 8.5;

  return (
    <motion.div
      style={{ width: px, height: px, flexShrink: 0 }}
      animate={animate ? {
        filter: [
          `drop-shadow(0 0 ${px * 0.06}px ${rank.glow}88)`,
          `drop-shadow(0 0 ${px * 0.20}px ${rank.glow}cc)`,
          `drop-shadow(0 0 ${px * 0.06}px ${rank.glow}88)`,
        ],
      } : {}}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 100 100" width={px} height={px} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id={`g-${uid}`} cx="38%" cy="32%" r="68%">
            <stop offset="0%"   stopColor={rank.glow}  stopOpacity="0.95" />
            <stop offset="50%"  stopColor={rank.color} stopOpacity="0.85" />
            <stop offset="100%" stopColor={rank.bg}    stopOpacity="1"    />
          </radialGradient>
          <filter id={`f-${uid}`}>
            <feDropShadow dx="0" dy="2" stdDeviation="2"
              floodColor={rank.bg} floodOpacity="0.9" />
          </filter>
        </defs>

        {/* Drop shadow */}
        <path d={shape.d} fill="rgba(0,0,0,0.4)"
          transform="translate(1.5,3)" filter={`url(#f-${uid})`} />

        {/* Main shield */}
        <path d={shape.d} fill={`url(#g-${uid})`}
          stroke={rank.color} strokeWidth="1.2" />

        {/* Inner bevel ring */}
        <path d={shape.d} fill="none"
          stroke={rank.glow} strokeWidth="0.6" strokeOpacity="0.4"
          transform={`scale(${shape.inner}) translate(${(100 - 100 * shape.inner) / (2 * shape.inner)},${(100 - 100 * shape.inner) / (2 * shape.inner)})`}
        />

        {/* Crown for Diamond & Conqueror */}
        {(rank.tier === 'Diamond' || rank.tier === 'Conqueror') && (
          <path d="M32 38 L37 24 L43 33 L50 18 L57 33 L63 24 L68 38Z"
            fill={rank.color} fillOpacity="0.9"
            stroke={rank.glow} strokeWidth="0.5" />
        )}

        {/* Star for Gold & Platinum */}
        {(rank.tier === 'Gold' || rank.tier === 'Platinum') && (
          <path d="M50 24 L53 34 L63 34 L55 41 L58 51 L50 45 L42 51 L45 41 L37 34 L47 34Z"
            fill={rank.bg} stroke={rank.color} strokeWidth="0.7" fillOpacity="0.85" />
        )}

        {/* ── Full tier name — textLength forces it to fit without truncation ── */}
        <text
          x="50" y="70"
          textAnchor="middle"
          fontFamily="'Space Mono', monospace"
          fontWeight="700"
          fontSize={tierFontSize}
          fill={rank.color}
          textLength={labelW}
          lengthAdjust="spacing"
        >
          {label}
        </text>

        {/* Sub-rank (I / II / III) */}
        <text
          x="50" y="81"
          textAnchor="middle"
          fontFamily="'Space Mono', monospace"
          fontWeight="400"
          fontSize={subFontSize}
          fill={rank.glow}
          fillOpacity="0.85"
        >
          {rank.sub}
        </text>
      </svg>
    </motion.div>
  );
}

// ── Compact rank chip for leaderboard rows ────────────────────────────────────
export function RankChip({ rank }) {
  if (!rank) return null;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '2px 8px', borderRadius: 6,
        background: `${rank.color}18`,
        border: `1px solid ${rank.color}44`,
        color: rank.color,
        fontSize: 11, fontWeight: 700,
        fontFamily: "'Space Mono', monospace",
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{
        width: 7, height: 7, borderRadius: 1,
        background: rank.color,
        boxShadow: `0 0 5px ${rank.glow}`,
        flexShrink: 0,
      }} />
      {rank.tier} {rank.sub}
    </span>
  );
}
