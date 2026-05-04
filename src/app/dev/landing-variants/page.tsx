"use client";

import { useState } from "react";
import VariantA from "./VariantA";
import VariantB from "./VariantB";
import VariantC from "./VariantC";

const VARIANTS = [
  { id: "A", label: "A — Stage spotlight", component: VariantA },
  { id: "B", label: "B — Fretboard card", component: VariantB },
  { id: "C", label: "C — Split screen", component: VariantC },
];

export default function LandingVariantPicker() {
  const [active, setActive] = useState("A");
  const Variant = VARIANTS.find((v) => v.id === active)!.component;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Picker bar */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur border-b border-zinc-800 flex items-center gap-2 px-4 py-2">
        <span className="text-xs text-zinc-500 font-mono mr-2">variant:</span>
        {VARIANTS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              active === id
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Live preview */}
      <div className="flex-1">
        <Variant />
      </div>
    </div>
  );
}
