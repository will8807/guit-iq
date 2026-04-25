"use client";

/**
 * components/Fretboard.tsx
 *
 * A touch-friendly guitar fretboard that supports two layouts:
 *
 * "portrait"  (default) — vertical, strings = columns, frets = rows
 *   Low E on the left, high e on the right; nut at the top.
 *   Best for portrait phone use.
 *
 * "landscape" — horizontal, strings = rows, frets = columns
 *   Low E at the top, high e at the bottom; nut on the left.
 *   Best for landscape phone use.
 *
 * Design constraints:
 * - NO note name labels ever shown — the fretboard is an input device, not a diagram
 * - Tapping a cell plays the note through the audio engine
 * - onSelect(string, fret) bubbles the tap up so challenge logic can evaluate it
 * - highlights prop lets callers mark positions (e.g. correct/incorrect feedback)
 *
 * String numbering: 1 = high E, 6 = low E
 * Fret numbering:   0 = open string, 12 = 12th fret
 */

import { useState, useRef } from "react";
import { getNoteAtPosition, type FretPosition } from "@/lib/music/fretboard";
import { playNote, isAudioReady } from "@/lib/audio/engine";
import type { FretboardLayout } from "@/hooks/useOrientation";

export type HighlightVariant = "correct" | "incorrect" | "hint";

export interface FretHighlight extends FretPosition {
  variant: HighlightVariant;
  /** Short label rendered inside the highlight circle (e.g. "R", "P5", "m3") */
  label?: string;
}

interface FretboardProps {
  /** Called when the user taps a fret cell */
  onSelect?: (string: number, fret: number) => void;
  /** Positions to highlight with feedback colours */
  highlights?: FretHighlight[];
  /** Disable all interaction (e.g. while audio is playing) */
  disabled?: boolean;
  /** Visual orientation of the fretboard */
  layout?: FretboardLayout;
}

// Portrait: strings as columns left→right (low E first)
const STRINGS_PORTRAIT = [6, 5, 4, 3, 2, 1] as const;
// Landscape: strings as rows top→bottom (high e first, low E at bottom)
const STRINGS_LANDSCAPE = [1, 2, 3, 4, 5, 6] as const;
/** Frets in the main playable grid (right of the nut). Fret 0 = open string, rendered separately. */
const FRETS_MAIN = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12

const STRING_NAMES: Record<number, string> = { 1: "e", 2: "B", 3: "G", 4: "D", 5: "A", 6: "E" };

const HIGHLIGHT_CLASSES: Record<HighlightVariant, string> = {
  correct: "bg-green-500",
  incorrect: "bg-red-500",
  hint: "bg-yellow-400",
};

const LABEL_CLASSES: Record<HighlightVariant, string> = {
  correct: "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]",
  incorrect: "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]",
  hint: "text-zinc-900",
};

const SINGLE_DOT_FRETS = new Set([3, 5, 7, 9]);

// ─── Pearl inlay style ────────────────────────────────────────────────────────
// Mimics mother-of-pearl (MOP) with layered radial gradients:
//   • bright white specular at top-left
//   • cool teal iridescent shimmer at bottom-right
//   • lavender shimmer at top-right
//   • warm rosy pink shimmer at bottom-left
//   • base creamy ivory to amber-brown underneath
const PEARL_BG = [
  "radial-gradient(ellipse at 22% 18%, rgba(255,255,255,0.92) 0%, transparent 38%)",
  "radial-gradient(ellipse at 72% 78%, rgba(140,210,195,0.55) 0%, transparent 42%)",
  "radial-gradient(ellipse at 80% 22%, rgba(210,175,240,0.45) 0%, transparent 40%)",
  "radial-gradient(ellipse at 28% 78%, rgba(255,210,185,0.40) 0%, transparent 38%)",
  "radial-gradient(circle at 50% 50%, #ddd5be 0%, #b09060 55%, #7a5c38 100%)",
].join(", ");

const PEARL_STYLE: React.CSSProperties = {
  background: PEARL_BG,
  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4), 0 1px 4px rgba(0,0,0,0.65)",
};

/** Tailwind size classes for all inlay dots */
const PEARL_SIZE = "w-5 h-5";

// ─── Fretboard wood grain ─────────────────────────────────────────────────────
// Real rosewood/ebony fretboards show fine grain lines running along the neck
// length.  We stack three layers:
//   1. A repeating narrow-stripe gradient for the primary grain lines
//   2. A second repeating gradient at a slightly different period for secondary
//      "pores" — gives the irregular feel real wood has
//   3. The base edge-darkening gradient underneath

/** Grain lines follow the neck length in portrait (vertical stripes → gradient goes `to right`). */
const GRAIN_V = [
  // Primary grain lines — dark, spaced ~7-8 px
  `repeating-linear-gradient(
    to right,
    transparent        0px,
    transparent        5px,
    rgba(0,0,0,0.22)   5px,
    rgba(0,0,0,0.22)   6.5px,
    transparent        6.5px,
    transparent        11px,
    rgba(0,0,0,0.10)   11px,
    rgba(0,0,0,0.10)   12px,
    transparent        12px,
    transparent        17px,
    rgba(180,110,30,0.09) 17px,
    rgba(180,110,30,0.09) 18px
  )`,
  // Secondary pore lines — warm amber, slightly offset period
  `repeating-linear-gradient(
    to right,
    transparent         0px,
    transparent         9px,
    rgba(140,80,20,0.13) 9px,
    rgba(140,80,20,0.13) 10px,
    transparent         10px,
    transparent         23px,
    rgba(0,0,0,0.09)    23px,
    rgba(0,0,0,0.09)    24px
  )`,
  // Base edge-to-center darkening (edges of the neck board, left/right)
  `linear-gradient(to right, #160e04 0%, #231808 20%, #2e2210 50%, #231808 80%, #160e04 100%)`,
].join(", ");

/** Grain lines follow the neck length in landscape (horizontal stripes → gradient goes `to bottom`). */
const GRAIN_H = [
  `repeating-linear-gradient(
    to bottom,
    transparent        0px,
    transparent        5px,
    rgba(0,0,0,0.22)   5px,
    rgba(0,0,0,0.22)   6.5px,
    transparent        6.5px,
    transparent        11px,
    rgba(0,0,0,0.10)   11px,
    rgba(0,0,0,0.10)   12px,
    transparent        12px,
    transparent        17px,
    rgba(180,110,30,0.09) 17px,
    rgba(180,110,30,0.09) 18px
  )`,
  `repeating-linear-gradient(
    to bottom,
    transparent         0px,
    transparent         9px,
    rgba(140,80,20,0.13) 9px,
    rgba(140,80,20,0.13) 10px,
    transparent         10px,
    transparent         23px,
    rgba(0,0,0,0.09)    23px,
    rgba(0,0,0,0.09)    24px
  )`,
  `linear-gradient(to bottom, #160e04 0%, #231808 20%, #2e2210 50%, #231808 80%, #160e04 100%)`,
].join(", ");

// Per-string visual config.
// Strings 1–2 are plain steel; 3–6 (G, D, A, E) are wound.
const STRING_CONFIGS: Record<number, {
  isWound: boolean;
  size: number;   // px — used as width (portrait) or height (landscape)
  color: string;
}> = {
  1: { isWound: false, size: 1,   color: "#9ca3af" },
  2: { isWound: false, size: 1,   color: "#9ca3af" },
  3: { isWound: true,  size: 2,   color: "#b0a898" },
  4: { isWound: true,  size: 2.5, color: "#b8b090" },
  5: { isWound: true,  size: 3,   color: "#c0b07a" },
  6: { isWound: true,  size: 3.5, color: "#c8b86a" },
};

// ─── String line element ────────────────────────────────────────────────────
// Renders as an absolutely-positioned span inside a FretCell.
// Wound strings get a repeating diagonal gradient to mimic the helical winding.

function StringLine({ stringNum, isPortrait, ref }: { stringNum: number; isPortrait: boolean; ref?: React.Ref<HTMLSpanElement> }) {
  const cfg = STRING_CONFIGS[stringNum];
  if (!cfg) return null;

  // Diagonal winding pattern — direction flips between orientations so the
  // helical angle always looks consistent.
  const woundGradient = `repeating-linear-gradient(
    ${isPortrait ? "-45deg" : "45deg"},
    transparent 0px, transparent 1.5px,
    rgba(0,0,0,0.28) 1.5px, rgba(0,0,0,0.28) 2.5px
  )`;

  // Subtle highlight edge to give the string a cylindrical feel.
  const woundShadow = isPortrait
    ? "1px 0 0 rgba(255,255,255,0.13), -1px 0 0 rgba(0,0,0,0.38)"
    : "0 -1px 0 rgba(255,255,255,0.13), 0 1px 0 rgba(0,0,0,0.38)";

  const style: React.CSSProperties = isPortrait
    ? {
        top: 0, bottom: 0,
        left: "50%", transform: "translateX(-50%)",
        width: `${cfg.size}px`,
        backgroundColor: cfg.color,
        backgroundImage: cfg.isWound ? woundGradient : undefined,
        boxShadow: cfg.isWound ? woundShadow : undefined,
      }
    : {
        left: 0, right: 0,
        top: "50%", transform: "translateY(-50%)",
        height: `${cfg.size}px`,
        backgroundColor: cfg.color,
        backgroundImage: cfg.isWound ? woundGradient : undefined,
        boxShadow: cfg.isWound ? woundShadow : undefined,
      };

  return <span ref={ref} aria-hidden="true" className="absolute pointer-events-none z-0" style={style} />;
}

function getHighlight(
  highlights: FretHighlight[],
  string: number,
  fret: number
): FretHighlight | undefined {
  return highlights.find((h) => h.string === string && h.fret === fret);
}

export default function Fretboard({
  onSelect,
  highlights = [],
  disabled = false,
  layout = "portrait",
}: FretboardProps) {
  async function handleTap(string: number, fret: number) {
    if (disabled) return;
    onSelect?.(string, fret);
    if (isAudioReady()) {
      const note = getNoteAtPosition(string, fret);
      await playNote(note, 1.5);
    }
  }

  if (layout === "landscape") {
    return <LandscapeFretboard highlights={highlights} disabled={disabled} handleTap={handleTap} />;
  }
  return <PortraitFretboard highlights={highlights} disabled={disabled} handleTap={handleTap} />;
}

// ─── Shared cell ────────────────────────────────────────────────────────────

interface CellProps {
  string: number;
  fret: number;
  highlight: FretHighlight | undefined;
  disabled: boolean;
  isPortrait: boolean;
  handleTap: (string: number, fret: number) => void;
  className?: string;
}

function FretCell({ string, fret, highlight, disabled, isPortrait, handleTap, className = "" }: CellProps) {
  const [ripplePos, setRipplePos] = useState<{ x: number; y: number } | null>(null);
  const [pressing, setPressing] = useState(false);
  const stringRef = useRef<HTMLSpanElement>(null);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipplePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setPressing(true);
    // animate the string line briefly
    if (stringRef.current) {
      const cls = isPortrait ? "string-pluck-v" : "string-pluck-h";
      stringRef.current.classList.remove(cls);
      // force reflow
      void stringRef.current.offsetWidth;
      stringRef.current.classList.add(cls);
    }
    handleTap(string, fret);
    setTimeout(() => setPressing(false), 80);
  }

  return (
    <button
      role="gridcell"
      aria-label={`String ${string}, fret ${fret}`}
      aria-disabled={disabled}
      onClick={handleClick}
      className={[
        "relative flex items-center justify-center overflow-hidden",
        "transition-transform duration-75",
        pressing ? "scale-[0.91]" : "scale-100",
        highlight ? "" : "hover:bg-[#3d2e1a]/50 active:bg-[#4a3820]/60",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      ].join(" ")}
    >
      {!highlight && <StringLine stringNum={string} isPortrait={isPortrait} ref={stringRef} />}
      {ripplePos && (
        <span
          aria-hidden="true"
          className="fret-ripple"
          style={{ left: ripplePos.x, top: ripplePos.y }}
          onAnimationEnd={() => setRipplePos(null)}
        />
      )}
      {highlight && (
        <span
          aria-hidden="true"
          data-variant={highlight.variant}
          data-label={highlight.label}
          className={`w-8 h-8 rounded-full z-10 flex items-center justify-center ${HIGHLIGHT_CLASSES[highlight.variant]}`}
        >
          {highlight.label && (
            <span className={`text-[11px] font-black leading-none select-none ${LABEL_CLASSES[highlight.variant]}`}>
              {highlight.label}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

// ─── Nut bar segments ───────────────────────────────────────────────────────
// NutSegment: one ivory column-slice per string row in landscape layout.
// PortraitNutBar: full-width ivory row in portrait layout.
// Both render the string continuing through the nut and a dark notch slot.

const NUT_BG = "linear-gradient(to right, #ede5c0 0%, #d4b458 35%, #c0982a 50%, #d4b458 65%, #ede5c0 100%)";
const NUT_BG_H = "linear-gradient(to bottom, #ede5c0 0%, #d4b458 35%, #c0982a 50%, #d4b458 65%, #ede5c0 100%)";

function NutSegment({ stringNum, rowHeight }: { stringNum: number; rowHeight: string }) {
  const cfg = STRING_CONFIGS[stringNum]!;
  const slotH = Math.max(2, cfg.size + 1.5);
  return (
    <div
      aria-hidden="true"
      className={`flex-shrink-0 relative ${rowHeight}`}
      style={{ width: "8px", background: NUT_BG, boxShadow: "1px 0 3px rgba(0,0,0,0.5), -1px 0 1px rgba(255,255,220,0.15)" }}
    >
      {/* String continues through the nut */}
      <StringLine stringNum={stringNum} isPortrait={false} />
      {/* Notch slot */}
      <span
        className="absolute top-1/2 -translate-y-1/2 inset-x-0 pointer-events-none z-10"
        style={{ height: `${slotH}px`, background: "rgba(4,2,0,0.6)", borderRadius: "0 1px 1px 0" }}
      />
    </div>
  );
}

function PortraitNutBar({ strings }: { strings: readonly number[] }) {
  return (
    <div aria-hidden="true" className="flex">
      <div className="w-7 shrink-0" />
      <div
        className="flex-1 relative"
        style={{ height: "8px", background: NUT_BG_H, boxShadow: "0 2px 3px rgba(0,0,0,0.5), 0 -1px 1px rgba(255,255,220,0.15)" }}
      >
        {/* Notch slot for each string — evenly spaced across the width */}
        {strings.map((s, idx) => {
          const cfg = STRING_CONFIGS[s]!;
          const slotW = Math.max(2, cfg.size + 1.5);
          const pct = ((idx + 0.5) / strings.length) * 100;
          return (
            <span
              key={s}
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: `${pct}%`,
                transform: "translateX(-50%)",
                width: `${slotW}px`,
                background: "rgba(4,2,0,0.6)",
                borderRadius: "0 0 1px 1px",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Portrait layout ─────────────────────────────────────────────────────────
// Strings = columns (low E left → high e right)
// Layout (top → bottom): string labels | open-string row | NUT BAR | frets 1–12

interface LayoutProps {
  highlights: FretHighlight[];
  disabled: boolean;
  handleTap: (string: number, fret: number) => void;
}

function PortraitFretboard({ highlights, disabled, handleTap }: LayoutProps) {
  return (
    <div
      role="grid"
      aria-label="Guitar fretboard"
      className="w-full select-none rounded-md overflow-hidden"
      style={{ background: GRAIN_V }}
    >
      {/* String name labels */}
      <div aria-hidden="true" className="flex pt-1 pb-0.5">
        <div className="w-7 shrink-0" />
        {STRINGS_PORTRAIT.map((s) => (
          <div key={s} className="flex-1 text-center text-[11px] font-semibold text-[#a89070]">
            {STRING_NAMES[s]}
          </div>
        ))}
      </div>

      {/* Open string row (fret 0) — narrow, no fret number */}
      <div role="row" className="flex">
        <div aria-hidden="true" className="w-7 shrink-0 flex items-center justify-end pr-1 text-[10px] text-[#6a5030]/70">
          ○
        </div>
        {STRINGS_PORTRAIT.map((string) => (
          <FretCell
            key={string}
            string={string}
            fret={0}
            highlight={getHighlight(highlights, string, 0)}
            disabled={disabled}
            isPortrait={true}
            handleTap={handleTap}
            className="flex-1 h-8"
          />
        ))}
      </div>

      {/* Nut bar */}
      <PortraitNutBar strings={STRINGS_PORTRAIT} />

      {/* Fret rows 1–12 */}
      {FRETS_MAIN.map((fret) => (
        <div key={fret}>
          <div role="row" className="flex">
            <div aria-hidden="true" className="w-7 shrink-0 flex items-center justify-center text-[11px] font-medium text-[#8a7050]">
              {fret}
            </div>
            <div className="relative flex flex-1">
              {STRINGS_PORTRAIT.map((string) => (
                <FretCell
                  key={string}
                  string={string}
                  fret={fret}
                  highlight={getHighlight(highlights, string, fret)}
                  disabled={disabled}
                  isPortrait={true}
                  handleTap={handleTap}
                  className="flex-1 h-12 border-b border-b-[#7a6340]/60"
                />
              ))}

              {/* Pearl inlay dots */}
              {SINGLE_DOT_FRETS.has(fret) && (
                <span aria-hidden="true" className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${PEARL_SIZE} rounded-full pointer-events-none z-20`}
                  style={PEARL_STYLE} />
              )}
              {fret === 12 && (
                <>
                  <span aria-hidden="true" className={`absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 ${PEARL_SIZE} rounded-full pointer-events-none z-20`}
                    style={PEARL_STYLE} />
                  <span aria-hidden="true" className={`absolute left-2/3 top-1/2 -translate-x-1/2 -translate-y-1/2 ${PEARL_SIZE} rounded-full pointer-events-none z-20`}
                    style={PEARL_STYLE} />
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Landscape layout ────────────────────────────────────────────────────────
// Strings = rows (high e top → low E bottom)
// Layout (left → right): string label | open cell | NUT SEGMENT | frets 1–12

// Dot positions within the frets-1–12 area (12 equal columns, 0-indexed).
const DOT_LEFT: Record<number, string> = Object.fromEntries(
  FRETS_MAIN.map((f) => [f, `${((f - 1 + 0.5) / 12) * 100}%`])
);

function LandscapeFretboard({ highlights, disabled, handleTap }: LayoutProps) {
  return (
    <div
      role="grid"
      aria-label="Guitar fretboard"
      className="w-full select-none rounded-md overflow-hidden"
      style={{ background: GRAIN_H }}
    >
      {/* Fret number header */}
      <div aria-hidden="true" className="flex pt-1 pb-0.5">
        <div className="w-7 shrink-0" />            {/* string label spacer */}
        <div className="w-8 shrink-0 text-center text-[10px] text-[#6a5030]/70">○</div> {/* open col */}
        <div className="w-2 shrink-0" />            {/* nut spacer */}
        {FRETS_MAIN.map((fret) => (
          <div key={fret} className="flex-1 text-center text-[11px] font-medium text-[#8a7050]">
            {fret}
          </div>
        ))}
      </div>

      {/* String rows */}
      <div className="relative">
        {STRINGS_LANDSCAPE.map((string) => (
          <div key={string} role="row" className="flex items-center">
            {/* String label */}
            <div aria-hidden="true" className="w-7 shrink-0 text-center text-[11px] font-semibold text-[#a89070]">
              {STRING_NAMES[string]}
            </div>

            {/* Open string cell (fret 0) — narrow, no fret border */}
            <FretCell
              string={string}
              fret={0}
              highlight={getHighlight(highlights, string, 0)}
              disabled={disabled}
              isPortrait={false}
              handleTap={handleTap}
              className="w-8 shrink-0 h-10"
            />

            {/* Nut segment */}
            <NutSegment stringNum={string} rowHeight="h-10" />

            {/* Fret cells 1–12 */}
            {FRETS_MAIN.map((fret) => (
              <FretCell
                key={fret}
                string={string}
                fret={fret}
                highlight={getHighlight(highlights, string, fret)}
                disabled={disabled}
                isPortrait={false}
                handleTap={handleTap}
                className="flex-1 h-10 border-r border-r-[#7a6340]/40"
              />
            ))}
          </div>
        ))}

        {/* Pearl inlay dots — overlaid on the frets-1–12 area only */}
        <div aria-hidden="true" className="absolute top-0 bottom-0 pointer-events-none"
          style={{ left: "calc(1.75rem + 2rem + 8px)", right: 0 }}>
          {[...SINGLE_DOT_FRETS].map((fret) => (
            <span
              key={fret}
              className={`absolute ${PEARL_SIZE} -translate-x-1/2 -translate-y-1/2 rounded-full`}
              style={{
                left: DOT_LEFT[fret],
                top: "50%",
                ...PEARL_STYLE,
              }}
            />
          ))}
          <span className={`absolute ${PEARL_SIZE} -translate-x-1/2 -translate-y-1/2 rounded-full`}
            style={{ left: DOT_LEFT[12], top: "33%", ...PEARL_STYLE }} />
          <span className={`absolute ${PEARL_SIZE} -translate-x-1/2 -translate-y-1/2 rounded-full`}
            style={{ left: DOT_LEFT[12], top: "67%", ...PEARL_STYLE }} />
        </div>
      </div>
    </div>
  );
}

