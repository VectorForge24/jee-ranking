/**
 * RankBadge — animated SVG badge for each rank tier.
 * Each tier has a unique shape. Glow pulses with rank's color.
 * Size prop: 'sm' | 'md' | 'lg' | 'xl'
 */

import { motion } from 'framer-motion';
import { RANKS } from '../../engine/xpEngine.js';

const SIZE_MAP = { sm: 48, md: 72, lg: 120, xl: 180 };

// Unique shield paths per tier
const TIER_SHAPES = {
  Bronze: {
    path: 'M50,8 L88,22 L92,60 L50,88 L8,60 L12,22 Z',
    decoration: null,
    crownPts: null,
  },
  Silver: {
    path: 'M50,6 L90,20 L94,62 L50,90 L6,62 L10,20 Z',
    decoration: 'M50,20 L55,35 L70,35 L58,44 L63,58 L50,50 L37,58 L42,44 L30,35 L45,35 Z',
    crownPts: null,
  },
  Gold: {
    path: 'M50,5 L91,19 L96,63 L50,92 L4,63 L9,19 Z',
    decoration: 'M50,18 L55,34 L72,34 L59,44 L64,60 L50,50 L36,60 L41,44 L28,34 L45,34 Z',
    crownPts: null,
  },
  Platinum: {
    path: 'M50,4 L76,14 L94,35 L94,65 L76,86 L50,96 L24,86 L6,65 L6,35 L24,14 Z',
    decoration: 'M50,22 L54,33 L66,33 L57,40 L60,52 L50,46 L40,52 L43,40 L34,33 L46,33 Z',
    crownPts: null,
  },
  Diamond: {
    path: 'M50,2 L78,12 L96,36 L96,64 L78,88 L50,98 L22,88 L4,64 L4,36 L22,12 Z',
    decoration: 'M50,20 L54,32 L67,32 L57,40 L61,53 L50,46 L39,53 L43,40 L33,32 L46,32 Z',
    crownPts: '50,10 60,22 74,18 68,32 80,36',
  },
  Conqueror: {
    path: 'M50,2 L80,10 L98,34 L98,66 L80,90 L50,98 L20,90 L2,66 L2,34 L20,10 Z',
    decoration: 'M50,22 L54,34 L66,34 L57,41 L60,53 L50,47 L40,53 L43,41 L34,34 L46,34 Z',
    crownPts: '50,6 62,18 78,12 72,28 88,30 74,40 80,56 64,48 50,58 36,48 20,56 26,40 12,30 28,28 22,12 38,18',
  },
};

const SUB_ROMAN = { 'III': 'III', 'II': 'II', 'I': 'I' };

export default function RankBadge({ rank, size = 'md', animate = true, className = '' }) {
  if (!rank) return null;

  const px = SIZE_MAP[size] || SIZE_MAP.md;
  const shape = TIER_SHAPES[rank.tier] || TIER_SHAPES.Bronze;
  const glowId = `glow-${rank.tier}-${size}`;
  const gradId = `grad-${rank.tier}-${size}`;

  const pulseVariants = {
    animate: {
      filter: [
        `drop-shadow(0 0 ${px * 0.08}px ${rank.glow})`,
        `drop-shadow(0 0 ${px * 0.20}px ${rank.glow})`,
        `drop-shadow(0 0 ${px * 0.08}px ${rank.glow})`,
      ],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
    },
  };

  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: px, height: px }}
      variants={animate ? pulseVariants : {}}
      animate={animate ? 'animate' : undefined}
    >
      <svg
        viewBox="0 0 100 100"
        width={px}
        height={px}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Radial gradient fill */}
          <radialGradient id={gradId} cx="40%" cy="35%" r="65%">
            <stop offset="0%"   stopColor={rank.color} stopOpacity="0.9" />
            <stop offset="60%"  stopColor={rank.color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={rank.glow}  stopOpacity="1.0" />
          </radialGradient>
          {/* Glow filter */}
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Shield shadow */}
        <path
          d={shape.path}
          fill="rgba(0,0,0,0.5)"
          transform="translate(2,3)"
        />

        {/* Main shield */}
        <path
          d={shape.path}
          fill={`url(#${gradId})`}
          stroke={rank.color}
          strokeWidth="1.5"
          filter={`url(#${glowId})`}
        />

        {/* Inner border */}
        <path
          d={shape.path}
          fill="none"
          stroke={rank.glow}
          strokeWidth="0.5"
          strokeOpacity="0.6"
          transform="scale(0.88) translate(6.5,6.5)"
        />

        {/* Crown for Diamond / Conqueror */}
        {shape.crownPts && (
          <polygon
            points={shape.crownPts}
            fill={rank.color}
            stroke={rank.glow}
            strokeWidth="0.8"
            opacity="0.9"
          />
        )}

        {/* Star decoration (Silver+) */}
        {shape.decoration && (
          <path
            d={shape.decoration}
            fill={rank.bg}
            stroke={rank.color}
            strokeWidth="0.8"
            opacity="0.85"
          />
        )}

        {/* Tier name */}
        <text
          x="50"
          y={shape.decoration ? '66' : '62'}
          textAnchor="middle"
          fontSize={px < 72 ? '8' : '9'}
          fontFamily="'Orbitron', monospace"
          fontWeight="700"
          fill={rank.color}
          letterSpacing="1"
        >
          {rank.tier.toUpperCase().slice(0, 3)}
        </text>

        {/* Sub-rank roman numeral */}
        <text
          x="50"
          y={shape.decoration ? '78' : '74'}
          textAnchor="middle"
          fontSize={px < 72 ? '7' : '8.5'}
          fontFamily="'Orbitron', monospace"
          fontWeight="400"
          fill={rank.glow}
          opacity="0.9"
        >
          {SUB_ROMAN[rank.sub]}
        </text>
      </svg>
    </motion.div>
  );
}

// Mini badge for leaderboard rows
export function MiniRankBadge({ rank, size = 28 }) {
  if (!rank) return null;
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-xs font-bold px-1.5 py-0.5 rounded"
      style={{
        color: rank.color,
        background: `${rank.glow}18`,
        border: `1px solid ${rank.color}44`,
        fontSize: 11,
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: 1,
        background: rank.color,
        display: 'inline-block',
        boxShadow: `0 0 4px ${rank.glow}`,
      }} />
      {rank.tier.slice(0, 3).toUpperCase()} {rank.sub}
    </span>
  );
}
