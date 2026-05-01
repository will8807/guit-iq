/**
 * Variant A — "Stage spotlight"
 *
 * Dark radial glow behind the hero, big bold tagline split across two lines,
 * single dominant CTA, secondary links collapsed into a compact icon row.
 */
import Link from "next/link";

export default function VariantA() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center relative overflow-hidden px-6 py-12">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(99,102,241,0.18) 0%, transparent 70%)",
        }}
      />

      {/* Hero */}
      <div className="relative flex flex-col items-center gap-4 text-center mb-10">
        <span className="text-7xl drop-shadow-lg select-none">🎸</span>
        <h1 className="text-5xl font-black tracking-tight leading-none">
          Guit<span className="text-indigo-400">IQ</span>
        </h1>
        <p className="text-zinc-300 text-xl font-medium max-w-xs leading-snug">
          Hear it.
          <br />
          <span className="text-zinc-500">Find it on the fretboard.</span>
        </p>
      </div>

      {/* Primary CTA */}
      <Link
        href="/session"
        className="relative mb-8 px-12 py-5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-2xl text-2xl font-black tracking-wide transition-all shadow-lg shadow-indigo-900/60 hover:shadow-indigo-700/60 hover:-translate-y-0.5 active:translate-y-0"
      >
        Start Training
      </Link>

      {/* Stats strip */}
      <div className="flex gap-6 text-center mb-10">
        {[
          { value: "78", label: "fret positions" },
          { value: "3", label: "difficulty levels" },
          { value: "∞", label: "challenges" },
        ].map(({ value, label }) => (
          <div key={label} className="flex flex-col items-center">
            <span className="text-2xl font-black text-indigo-300">{value}</span>
            <span className="text-xs text-zinc-500 mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      {/* Secondary nav — icon row */}
      <div className="flex gap-4">
        {[
          { href: "/tuner", icon: "🎵", label: "Tuner" },
          { href: "/progress", icon: "📈", label: "Progress" },
          { href: "/settings", icon: "⚙️", label: "Settings" },
          { href: "/demo", icon: "🎨", label: "Demo" },
        ].map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={label}
            className="flex flex-col items-center gap-1 px-4 py-3 bg-zinc-800/60 hover:bg-zinc-700/80 rounded-xl transition-colors text-zinc-400 hover:text-white"
          >
            <span className="text-xl">{icon}</span>
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
