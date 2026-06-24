/**
 * RankBadge — clean SVG badge. Unique crest per tier family.
 * Sizes: sm=40 md=64 lg=96 xl=144
 */
import { motion } from 'framer-motion';

const SIZES = { sm:40, md:64, lg:96, xl:144 };

// Each tier has a distinct outer shape
const SHAPES = {
  Bronze:    { d:'M50 6 L88 24 L92 64 L50 90 L8 64 L12 24Z',   inner: 0.78 },
  Silver:    { d:'M50 5 L90 22 L94 66 L50 92 L6 66 L10 22Z',    inner: 0.76 },
  Gold:      { d:'M50 4 L92 20 L96 65 L50 94 L4 65 L8 20Z',     inner: 0.76 },
  Platinum:  { d:'M50 3 L78 12 L96 36 L96 64 L78 88 L50 97 L22 88 L4 64 L4 36 L22 12Z', inner:0.75 },
  Diamond:   { d:'M50 2 L80 10 L98 34 L98 66 L80 90 L50 98 L20 90 L2 66 L2 34 L20 10Z', inner:0.74 },
  Conqueror: { d:'M50 1 L82 8 L99 32 L99 68 L82 92 L50 99 L18 92 L1 68 L1 32 L18 8Z',  inner:0.73 },
};

const SUB_COLOR = { III:'opacity-60', II:'opacity-80', I:'opacity-100' };

export default function RankBadge({ rank, size='md', animate=true }) {
  if (!rank) return null;
  const px = SIZES[size] || 64;
  const shape = SHAPES[rank.tier] || SHAPES.Bronze;
  const uid = `${rank.tier}-${rank.sub}-${size}`;

  return (
    <motion.div
      style={{ width: px, height: px, flexShrink: 0 }}
      animate={animate ? {
        filter: [
          `drop-shadow(0 0 ${px*0.06}px ${rank.glow}88)`,
          `drop-shadow(0 0 ${px*0.18}px ${rank.glow}cc)`,
          `drop-shadow(0 0 ${px*0.06}px ${rank.glow}88)`,
        ]
      } : {}}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 100 100" width={px} height={px}>
        <defs>
          <radialGradient id={`g-${uid}`} cx="38%" cy="32%" r="68%">
            <stop offset="0%"   stopColor={rank.glow}  stopOpacity="0.95"/>
            <stop offset="50%"  stopColor={rank.color} stopOpacity="0.85"/>
            <stop offset="100%" stopColor={rank.bg}    stopOpacity="1"/>
          </radialGradient>
          <filter id={`f-${uid}`}>
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={rank.bg} floodOpacity="0.8"/>
          </filter>
        </defs>

        {/* Drop shadow layer */}
        <path d={shape.d} fill="rgba(0,0,0,0.45)" transform="translate(1.5,3)" filter={`url(#f-${uid})`}/>

        {/* Main fill */}
        <path d={shape.d} fill={`url(#g-${uid})`} stroke={rank.color} strokeWidth="1.2"/>

        {/* Inner bevel */}
        <path
          d={shape.d}
          fill="none"
          stroke={rank.glow}
          strokeWidth="0.6"
          strokeOpacity="0.45"
          transform={`scale(${shape.inner}) translate(${(100-100*shape.inner)/(2*shape.inner)},${(100-100*shape.inner)/(2*shape.inner)})`}
        />

        {/* Crown decoration for Diamond+ */}
        {(rank.tier === 'Diamond' || rank.tier === 'Conqueror') && (
          <path
            d="M32 35 L38 20 L44 30 L50 16 L56 30 L62 20 L68 35Z"
            fill={rank.color} fillOpacity="0.9" stroke={rank.glow} strokeWidth="0.5"
          />
        )}

        {/* Star for Gold+ */}
        {(rank.tier === 'Gold' || rank.tier === 'Platinum') && (
          <path
            d="M50 22 L53 33 L64 33 L56 40 L59 51 L50 45 L41 51 L44 40 L36 33 L47 33Z"
            fill={rank.bg} stroke={rank.color} strokeWidth="0.7" fillOpacity="0.85"
          />
        )}

        {/* Tier name */}
        <text x="50" y="68" textAnchor="middle"
          fontSize={size === 'sm' ? 9 : 10}
          fontFamily="'Space Mono', monospace"
          fontWeight="700" fill={rank.color} letterSpacing="0.5">
          {rank.tier.toUpperCase().slice(0,4)}
        </text>

        {/* Sub-rank */}
        <text x="50" y="80" textAnchor="middle"
          fontSize={size === 'sm' ? 7.5 : 8.5}
          fontFamily="'Space Mono', monospace"
          fontWeight="400" fill={rank.glow} fillOpacity="0.8">
          {rank.sub}
        </text>
      </svg>
    </motion.div>
  );
}

export function RankChip({ rank }) {
  if (!rank) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold"
      style={{
        background: `${rank.color}18`,
        border: `1px solid ${rank.color}44`,
        color: rank.color,
        fontFamily: "'Space Mono', monospace",
      }}>
      <span style={{
        width:7, height:7, borderRadius:1,
        background: rank.color,
        boxShadow: `0 0 5px ${rank.glow}`,
        flexShrink:0,
      }}/>
      {rank.tier} {rank.sub}
    </span>
  );
}
