"use client";

import { useState } from "react";
import ColorVariant from "./ColorVariant";

const VARIANTS = [
  {
    id: "rust-400",
    label: "Rust 400 — #D06838",
    ctaClass: "bg-rust-400 hover:bg-rust-300 active:bg-rust-500 text-white",
    accentTextClass: "text-rust-300",
    navHoverClass: "hover:text-rust-300",
    ctaShadowClass: "shadow-rust-800/50",
  },
  {
    id: "rust-500",
    label: "Rust 500 — #C24A0A",
    ctaClass: "bg-rust-500 hover:bg-rust-400 active:bg-rust-600 text-white",
    accentTextClass: "text-rust-300",
    navHoverClass: "hover:text-rust-300",
    ctaShadowClass: "shadow-rust-800/50",
  },
  {
    id: "rust-600",
    label: "Rust 600 — #A03D08",
    ctaClass: "bg-rust-600 hover:bg-rust-500 active:bg-rust-700 text-white",
    accentTextClass: "text-rust-300",
    navHoverClass: "hover:text-rust-300",
    ctaShadowClass: "shadow-rust-800/60",
  },
  {
    id: "rosewine-400",
    label: "Rose-wine 400 — vivid light",
    ctaClass: "bg-rosewine-400 hover:bg-rosewine-300 active:bg-rosewine-500 text-white",
    accentTextClass: "text-wine-300",
    navHoverClass: "hover:text-wine-300",
    ctaShadowClass: "shadow-rosewine-700/50",
  },
  {
    id: "rosewine-500",
    label: "Rose-wine 500 — vivid mid",
    ctaClass: "bg-rosewine-500 hover:bg-rosewine-400 active:bg-rosewine-600 text-white",
    accentTextClass: "text-wine-300",
    navHoverClass: "hover:text-wine-300",
    ctaShadowClass: "shadow-rosewine-700/50",
  },
  {
    id: "rosewine-600",
    label: "Rose-wine 600 — vivid dark",
    ctaClass: "bg-rosewine-600 hover:bg-rosewine-500 active:bg-rosewine-700 text-white",
    accentTextClass: "text-wine-300",
    navHoverClass: "hover:text-wine-300",
    ctaShadowClass: "shadow-rosewine-700/60",
  },
  {
    id: "wine-400",
    label: "Wine 400 — muted light",
    ctaClass: "bg-wine-400 hover:bg-wine-300 active:bg-wine-500 text-white",
    accentTextClass: "text-wine-300",
    navHoverClass: "hover:text-wine-300",
    ctaShadowClass: "shadow-wine-900/40",
  },
  {
    id: "wine-500",
    label: "Wine 500 — mid",
    ctaClass: "bg-wine-500 hover:bg-wine-400 active:bg-wine-600 text-white",
    accentTextClass: "text-wine-300",
    navHoverClass: "hover:text-wine-300",
    ctaShadowClass: "shadow-wine-900/50",
  },
  {
    id: "wine-600",
    label: "Wine 600 — #723D46",
    ctaClass: "bg-wine-600 hover:bg-wine-500 active:bg-wine-700 text-white",
    accentTextClass: "text-wine-300",
    navHoverClass: "hover:text-wine-300",
    ctaShadowClass: "shadow-wine-900/50",
  },
  {
    id: "wine-700",
    label: "Wine 700 — dark",
    ctaClass: "bg-wine-700 hover:bg-wine-600 active:bg-wine-800 text-white",
    accentTextClass: "text-wine-300",
    navHoverClass: "hover:text-wine-300",
    ctaShadowClass: "shadow-wine-900/60",
  },
  {
    id: "amber-600",
    label: "Amber 600 (current)",
    ctaClass: "bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white",
    accentTextClass: "text-amber-500",
    navHoverClass: "hover:text-amber-400",
    ctaShadowClass: "shadow-amber-900/50",
  },
  {
    id: "indigo",
    label: "Indigo (original)",
    ctaClass: "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white",
    accentTextClass: "text-indigo-400",
    navHoverClass: "hover:text-indigo-300",
    ctaShadowClass: "shadow-indigo-900/40",
  },
  {
    id: "orange-500",
    label: "Orange 500",
    ctaClass: "bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white",
    accentTextClass: "text-orange-400",
    navHoverClass: "hover:text-orange-400",
    ctaShadowClass: "shadow-orange-900/50",
  },
  {
    id: "violet",
    label: "Violet",
    ctaClass: "bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white",
    accentTextClass: "text-violet-400",
    navHoverClass: "hover:text-violet-300",
    ctaShadowClass: "shadow-violet-900/40",
  },
  {
    id: "teal",
    label: "Teal",
    ctaClass: "bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white",
    accentTextClass: "text-teal-400",
    navHoverClass: "hover:text-teal-300",
    ctaShadowClass: "shadow-teal-900/40",
  },
  {
    id: "rose",
    label: "Rose",
    ctaClass: "bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white",
    accentTextClass: "text-rose-400",
    navHoverClass: "hover:text-rose-300",
    ctaShadowClass: "shadow-rose-900/40",
  },
];

export default function ColorVariantPicker() {
  const [active, setActive] = useState("rust-500");
  const variant = VARIANTS.find((v) => v.id === active)!;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Picker bar */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur border-b border-zinc-800 flex items-center gap-2 px-4 py-2 flex-wrap">
        <span className="text-xs text-zinc-500 font-mono mr-2">colour:</span>
        {VARIANTS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              active === id
                ? "bg-zinc-200 text-black"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Live preview */}
      <div className="flex-1">
        <ColorVariant {...variant} name={variant.label} />
      </div>
    </div>
  );
}
