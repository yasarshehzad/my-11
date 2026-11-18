import { CareerPlayer } from '../../career/types';
import { calculatePositionFit } from '../../career/squad';

/** Every role on the pitch: percent from the left touchline, percent from the attacking end. */
const POSITION_SPOTS: Array<{ pos: string; x: number; y: number }> = [
  { pos: 'ST', x: 50, y: 11 },
  { pos: 'CF', x: 50, y: 21 },
  { pos: 'LW', x: 15, y: 20 },
  { pos: 'RW', x: 85, y: 20 },
  { pos: 'CAM', x: 50, y: 31 },
  { pos: 'LM', x: 12, y: 45 },
  { pos: 'CM', x: 50, y: 48 },
  { pos: 'RM', x: 88, y: 45 },
  { pos: 'LWB', x: 12, y: 63 },
  { pos: 'CDM', x: 50, y: 64 },
  { pos: 'RWB', x: 88, y: 63 },
  { pos: 'LB', x: 15, y: 79 },
  { pos: 'CB', x: 50, y: 80 },
  { pos: 'RB', x: 85, y: 79 },
  { pos: 'GK', x: 50, y: 93 },
];

type Comfort = 'natural' | 'secondary' | 'cover' | 'none';

// Inline colours: the global stylesheet remaps several Tailwind colour utilities.
const COMFORT_STYLE: Record<Comfort, { backgroundColor: string; borderColor: string; color: string }> = {
  natural: { backgroundColor: '#10b981', borderColor: '#047857', color: '#ffffff' },
  secondary: { backgroundColor: '#bef264', borderColor: '#84cc16', color: '#1a2e05' },
  cover: { backgroundColor: '#fbbf24', borderColor: '#d97706', color: '#451a03' },
  none: { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.7)' },
};

const LEGEND: Array<[Comfort, string]> = [
  ['natural', 'Natural'],
  ['secondary', 'Secondary'],
  ['cover', 'Can cover'],
];

function comfortFor(player: CareerPlayer, pos: string): Comfort {
  const fit = calculatePositionFit(player, pos);
  if (fit === 'natural') return 'natural';
  if (fit === 'out_of_position') return 'none';
  // "Competent" covers two cases: a position listed on the player, or a neighbouring role he can fill in.
  const listed = (player.secondaryPositions || []).map((p) => p.toUpperCase()).includes(pos);
  return listed ? 'secondary' : 'cover';
}

/**
 * A small pitch showing where a player can play and how comfortable he is there.
 * Green is his natural position, yellow-green a listed secondary position, amber a
 * neighbouring role he can cover. Unmarked roles are out of position.
 */
export function PositionMap({ player }: { player: CareerPlayer }) {
  const spots = POSITION_SPOTS.map((s) => ({ ...s, comfort: comfortFor(player, s.pos) }));
  const described = (level: Comfort) => spots.filter((s) => s.comfort === level).map((s) => s.pos);
  const summary = LEGEND.map(([level, label]) => {
    const list = described(level);
    return list.length ? `${label}: ${list.join(', ')}` : '';
  })
    .filter(Boolean)
    .join('. ');

  return (
    <figure className="space-y-2">
      <div
        role="img"
        aria-label={`Positions for ${player.name}. ${summary}.`}
        className="my11-broadcast-pitch relative w-full max-w-[250px] aspect-[5/6] mx-auto"
      >
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 250 300" aria-hidden="true">
          <g fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2">
            <rect x="10" y="10" width="230" height="280" rx="2" />
            <line x1="10" y1="150" x2="240" y2="150" />
            <circle cx="125" cy="150" r="26" />
            <rect x="70" y="10" width="110" height="44" />
            <rect x="70" y="246" width="110" height="44" />
          </g>
        </svg>
        {spots.map((s) => (
          <span
            key={s.pos}
            aria-hidden="true"
            className="absolute -translate-x-1/2 -translate-y-1/2 min-w-[30px] h-[22px] px-1 rounded-md border text-2xs font-semibold flex items-center justify-center"
            style={{ left: `${s.x}%`, top: `${s.y}%`, ...COMFORT_STYLE[s.comfort] }}
          >
            {s.pos}
          </span>
        ))}
      </div>
      <figcaption className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-[var(--ink-secondary)]">
        {LEGEND.map(([level, label]) => (
          <span key={level} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm border" style={COMFORT_STYLE[level]} aria-hidden="true" />
            {label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
