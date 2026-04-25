"use client";

/**
 * components/TunerNeedle.tsx
 *
 * SVG arc-and-needle gauge showing cents deviation from the nearest semitone.
 * Range: −50 cents (far left) to +50 cents (far right).
 * Centre = perfectly in tune.
 *
 * Colour:
 *   |cents| ≤ 5  → emerald (in tune)
 *   |cents| ≤ 15 → yellow
 *   otherwise    → rose (out of tune)
 */

interface TunerNeedleProps {
  /** Cents deviation from nearest semitone. Clamped to ±50. */
  cents: number;
  /** Width of the SVG in px (height is derived). Defaults to 300. */
  width?: number;
}

// Arc geometry constants (all in SVG user units relative to a 200×110 viewBox)
const CX = 100; // arc centre x
const CY = 108; // arc centre y (below baseline so the arc forms a wide smile)
const R = 90;   // arc radius
const HALF_ARC_DEG = 70; // ±70° arc sweep (140° total)

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Convert an angle in degrees (0 = up) to an SVG point on the arc. */
function arcPoint(angleDeg: number) {
  const rad = degToRad(angleDeg - 90); // SVG: 0° = right; we want 0° = up
  return {
    x: CX + R * Math.cos(rad),
    y: CY + R * Math.sin(rad),
  };
}

/** Build an SVG arc path string for a segment of the gauge. */
function arcPath(startDeg: number, endDeg: number, radius: number) {
  const start = arcPoint(startDeg);
  // Offset to allow drawing at a different radius
  const rOff = radius - R;
  const startR = {
    x: CX + (R + rOff) * Math.cos(degToRad(startDeg - 90)),
    y: CY + (R + rOff) * Math.sin(degToRad(startDeg - 90)),
  };
  const endR = {
    x: CX + (R + rOff) * Math.cos(degToRad(endDeg - 90)),
    y: CY + (R + rOff) * Math.sin(degToRad(endDeg - 90)),
  };
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;
  void start;
  return `M ${startR.x.toFixed(2)} ${startR.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endR.x.toFixed(2)} ${endR.y.toFixed(2)}`;
}

/** Map cents (−50..+50) to an angle in degrees relative to 12 o'clock. */
function centsToAngle(cents: number): number {
  const clamped = Math.max(-50, Math.min(50, cents));
  // Map -50..+50 → -HALF_ARC_DEG..+HALF_ARC_DEG
  return (clamped / 50) * HALF_ARC_DEG;
}

export default function TunerNeedle({ cents, width = 300 }: TunerNeedleProps) {
  const angle = centsToAngle(cents);

  // Colour based on deviation
  const absC = Math.abs(cents);
  const colour =
    absC <= 5 ? "#10b981"  // emerald-500
    : absC <= 15 ? "#eab308" // yellow-500
    : "#f43f5e";            // rose-500

  // Needle tip point
  const needleLength = R - 12;
  const tipRad = degToRad(angle - 90);
  const tipX = CX + needleLength * Math.cos(tipRad);
  const tipY = CY + needleLength * Math.sin(tipRad);

  // Needle base (small offset perpendicular for a wedge shape)
  const baseHalf = 4;
  const perpRad = tipRad + Math.PI / 2;
  const b1x = CX + baseHalf * Math.cos(perpRad);
  const b1y = CY + baseHalf * Math.sin(perpRad);
  const b2x = CX - baseHalf * Math.cos(perpRad);
  const b2y = CY - baseHalf * Math.sin(perpRad);

  const height = Math.round(width * (110 / 200));

  return (
    <svg
      viewBox="0 0 200 110"
      width={width}
      height={height}
      aria-label={`Tuner: ${cents >= 0 ? "+" : ""}${Math.round(cents)} cents`}
    >
      {/* ── Background arc track ── */}
      <path
        d={arcPath(-HALF_ARC_DEG, HALF_ARC_DEG, R)}
        fill="none"
        stroke="#3f3f46" /* zinc-700 */
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* ── Coloured filled arc from centre to needle ── */}
      {cents !== 0 && (
        <path
          d={arcPath(0, angle, R)}
          fill="none"
          stroke={colour}
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.7"
        />
      )}

      {/* ── Tick marks at −50, −25, 0, +25, +50 cents ── */}
      {[-50, -25, 0, 25, 50].map((c) => {
        const a = centsToAngle(c);
        const inner = arcPoint(a);
        const innerRad = degToRad(a - 90);
        const outerX = CX + (R + 10) * Math.cos(innerRad);
        const outerY = CY + (R + 10) * Math.sin(innerRad);
        const isCenter = c === 0;
        return (
          <line
            key={c}
            x1={inner.x.toFixed(2)}
            y1={inner.y.toFixed(2)}
            x2={outerX.toFixed(2)}
            y2={outerY.toFixed(2)}
            stroke={isCenter ? "#a1a1aa" : "#52525b"}
            strokeWidth={isCenter ? 2 : 1}
          />
        );
      })}

      {/* ── Tick labels ── */}
      {([-50, -25, 25, 50] as const).map((c) => {
        const a = centsToAngle(c);
        const rad = degToRad(a - 90);
        const lx = CX + (R + 18) * Math.cos(rad);
        const ly = CY + (R + 18) * Math.sin(rad);
        return (
          <text
            key={c}
            x={lx.toFixed(2)}
            y={ly.toFixed(2)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="6"
            fill="#71717a"
          >
            {c > 0 ? `+${c}` : c}
          </text>
        );
      })}

      {/* ── Needle ── */}
      <polygon
        points={`${tipX.toFixed(2)},${tipY.toFixed(2)} ${b1x.toFixed(2)},${b1y.toFixed(2)} ${b2x.toFixed(2)},${b2y.toFixed(2)}`}
        fill={colour}
      />

      {/* ── Pivot dot ── */}
      <circle cx={CX} cy={CY} r="5" fill={colour} />
      <circle cx={CX} cy={CY} r="2" fill="#18181b" />
    </svg>
  );
}
