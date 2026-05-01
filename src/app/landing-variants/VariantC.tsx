/**
 * Variant C — "Split screen"
 *
 * Two-zone layout: top half is a bold full-bleed hero with animated gradient
 * text; bottom half is the action area. Works well on both tall phones and
 * tablets. Feels more like a modern app splash screen.
 */
import Link from "next/link";

export default function VariantC() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Top hero zone */}
      <div
        className="flex-1 flex flex-col items-center justify-center gap-5 px-8 py-12 text-center relative overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #18103a 0%, #0f0f1a 50%, #0d1a10 100%)",
        }}
      >
        {/* Glow blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(circle, #6366f1, transparent)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #22c55e, transparent)" }}
        />

        <span className="text-8xl drop-shadow-2xl select-none relative z-10">🎸</span>

        <div className="relative z-10">
          <h1 className="text-6xl font-black tracking-tighter leading-none">
            Guit<span className="text-indigo-400">IQ</span>
          </h1>
          <div className="mt-3 text-zinc-400 text-lg font-medium">
            Guitar ear training,{" "}
            <span className="text-green-400 font-semibold">re-imagined</span>
          </div>
        </div>

        {/* Three micro-stats */}
        <div className="relative z-10 flex gap-5 mt-2">
          {[
            { n: "6", sub: "strings" },
            { n: "12", sub: "frets" },
            { n: "∞", sub: "reps" },
          ].map(({ n, sub }) => (
            <div key={sub} className="text-center">
              <div className="text-3xl font-black text-white">{n}</div>
              <div className="text-[11px] text-zinc-500 uppercase tracking-widest">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom action zone */}
      <div className="bg-zinc-900 border-t border-zinc-800 flex flex-col items-center gap-4 px-6 py-8">
        <p className="text-zinc-400 text-sm text-center max-w-xs">
          Hear a note or chord — then find it on the fretboard. No theory required.
        </p>

        <Link
          href="/session"
          className="w-full max-w-xs text-center py-5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-2xl text-xl font-black tracking-wide transition-all shadow-lg shadow-indigo-950 hover:shadow-indigo-800/60 hover:-translate-y-0.5 active:translate-y-0"
        >
          Start Training →
        </Link>

        {/* Mode picker */}
        <div className="w-full max-w-xs grid grid-cols-2 gap-2">
          {[
            { href: "/tuner", icon: "🎵", label: "Tuner", desc: "Check your tuning" },
            { href: "/progress", icon: "📈", label: "Progress", desc: "See your stats" },
            { href: "/settings", icon: "⚙️", label: "Settings", desc: "Customise sessions" },
            { href: "/demo", icon: "🎨", label: "Demo", desc: "UI showcase" },
          ].map(({ href, icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors group"
            >
              <span className="text-2xl">{icon}</span>
              <div>
                <div className="text-sm font-semibold group-hover:text-white transition-colors">{label}</div>
                <div className="text-[10px] text-zinc-500">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
