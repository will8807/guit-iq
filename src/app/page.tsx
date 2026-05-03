import Link from "next/link";

const STRINGS = [1, 2, 3, 4, 5, 6];

function DecorativeFretboard() {
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-sm h-14 rounded-xl overflow-hidden relative"
      style={{
        background: "linear-gradient(to bottom, #1a1008, #2a1c0e, #1a1008)",
        boxShadow: "inset 0 2px 8px rgba(0,0,0,0.8)",
      }}
    >
      {STRINGS.map((s) => (
        <div
          key={s}
          className="absolute left-0 right-0"
          style={{
            top: `${(s / (STRINGS.length + 1)) * 100}%`,
            height: s <= 2 ? "1px" : s <= 4 ? "1.5px" : "2px",
            background:
              s <= 2
                ? "rgba(156,163,175,0.7)"
                : s <= 4
                  ? "rgba(176,168,152,0.7)"
                  : "rgba(200,184,106,0.7)",
          }}
        />
      ))}
      {[20, 40, 60, 80].map((pct) => (
        <div
          key={pct}
          className="absolute top-0 bottom-0"
          style={{ left: `${pct}%`, width: "1.5px", background: "rgba(200,191,176,0.45)" }}
        />
      ))}
      <div
        className="absolute top-0 bottom-0 left-0"
        style={{ width: "6px", background: "rgba(240,235,220,0.25)" }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#100c06] text-white flex flex-col items-center justify-center gap-6 px-6 py-12">
      {/* Brand */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-5xl font-black tracking-tight">
          <span className="text-rust-300">Guit</span>IQ
        </h1>
        <p className="text-zinc-400 text-base max-w-xs">
          The ear-training app built for guitarists
        </p>
      </div>

      {/* Decorative mini fretboard */}
      <DecorativeFretboard />

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2 max-w-xs">
        {["🎵 Audio-first", "🎯 Find the note", "🎸 Chord training", "📈 Track progress"].map((f) => (
          <span key={f} className="px-3 py-1.5 bg-zinc-800 rounded-full text-xs text-zinc-300 font-medium">
            {f}
          </span>
        ))}
      </div>

      {/* CTA card */}
      <div className="w-full max-w-xs bg-zinc-900 border border-zinc-700/50 rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
        <Link
          href="/session"
          className="w-full text-center py-4 bg-rust-500 hover:bg-rust-400 active:bg-rust-600 rounded-xl text-lg font-black text-white transition-all shadow-md shadow-rust-800/40 hover:-translate-y-0.5 active:translate-y-0"
        >
          Start Training
        </Link>
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: "/tuner", icon: "🎵", label: "Tuner" },
            { href: "/progress", icon: "📈", label: "Progress" },
            { href: "/settings", icon: "⚙️", label: "Settings" },
            
          ].map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors text-zinc-400 hover:text-white"
            >
              <span className="text-xl">{icon}</span>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

