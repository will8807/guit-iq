import Link from "next/link";
import Image from "next/image";

// ─── Feature cards ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "🎵",
    label: "Find the Note",
    description: "Hear a note and locate it anywhere on the fretboard.",
    color: "text-violet-400",
  },
  {
    icon: "🎯",
    label: "Intervals",
    description: "Identify intervals and build a stronger musical ear.",
    color: "text-rust-400",
  },
  {
    icon: "🎸",
    label: "Chords",
    description: "Hear a chord and find every note on the neck.",
    color: "text-sky-400",
  },
  {
    icon: "📈",
    label: "Track & Improve",
    description: "Detailed stats, streaks, and progress over time.",
    color: "text-emerald-400",
  },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: "Finally an ear training app that speaks guitarist.",
    name: "Alex M.",
    initials: "AM",
  },
  {
    quote: "My fretboard knowledge has leveled up so fast.",
    name: "Jason R.",
    initials: "JR",
  },
  {
    quote: "Simple, clean, and super effective. I use it every day.",
    name: "Maya L.",
    initials: "ML",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main className="min-h-screen bg-[#100c06] text-white">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[88svh] flex flex-col">

        {/* Guitar photo background */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <Image
            src="/guitar-hero.webp"
            alt=""
            fill
            priority
            className="object-cover object-center opacity-35"
          />
          {/* Dark vignettes to blend the photo into the page */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#100c06]/30 via-transparent to-[#100c06]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#100c06] via-[#100c06]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#100c06] via-transparent to-[#100c06]/20" />
        </div>

        {/* Nav bar */}
        <nav className="relative z-10 flex items-center justify-between px-5 pt-5">
          <h1 className="text-2xl font-black tracking-tight">
            <span className="text-rust-400">Guit</span>IQ
          </h1>
          <span className="text-[11px] font-semibold text-zinc-400 border border-zinc-700 rounded-full px-3 py-1 flex items-center gap-1.5">
            <span className="text-rust-400">🎸</span> Built for guitarists, by guitarists
          </span>
        </nav>

        {/* Hero copy */}
        <div className="relative z-10 flex flex-col justify-center flex-1 px-5 pb-4 pt-8 gap-6 max-w-lg">
          <div className="flex flex-col gap-1">
            <h2 className="text-4xl font-black leading-tight tracking-tight">
              Train your ear.
            </h2>
            <h2 className="text-4xl font-black leading-tight tracking-tight text-rust-400">
              Find it on the neck.
            </h2>
          </div>

          <p className="text-zinc-300 text-base leading-relaxed max-w-sm">
            GuitIQ helps you hear notes, intervals, and chords — and instantly find them on the fretboard.
          </p>

          {/* Mini feature grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {[
              { icon: "🔊", label: "Audio-first training", sub: "Hear it. Don't just see it." },
              { icon: "🎸", label: "Fretboard-based", sub: "Everything happens where you play." },
              { icon: "📈", label: "Track progress", sub: "Watch your ear get sharper." },
              { icon: "🔥", label: "Stay motivated", sub: "Streaks, stats, and daily challenges." },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="flex items-start gap-2">
                <span className="text-lg mt-0.5">{icon}</span>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">{label}</p>
                  <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col gap-2">
            <Link
              href="/session"
              className="w-full text-center py-4 bg-rust-500 hover:bg-rust-400 active:bg-rust-600 rounded-xl text-lg font-black text-white transition-all shadow-lg shadow-rust-800/50 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              <span>🎸</span> Start Training <span className="text-rust-200">→</span>
            </Link>
            <p className="text-center text-xs text-zinc-500">Free to start. No sign up required.</p>
          </div>
        </div>
      </section>

      {/* ── Feature cards ──────────────────────────────────────────────────── */}
      <section className="px-5 py-12 flex flex-col gap-5 max-w-lg mx-auto">
        <p className="text-center text-sm text-zinc-400 font-medium">
          Everything you need to sharpen your ear on guitar.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map(({ icon, label, description, color }) => (
            <div
              key={label}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2"
            >
              <span className={`text-2xl ${color}`}>{icon}</span>
              <p className="font-bold text-sm text-white leading-tight">{label}</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────────── */}
      <section className="px-5 py-8 flex flex-col gap-5 max-w-lg mx-auto">
        <p className="text-center text-sm text-zinc-400 font-medium">Loved by guitarists</p>
        <div className="flex flex-col gap-3">
          {TESTIMONIALS.map(({ quote, name, initials }) => (
            <div
              key={name}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
                {initials}
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm text-zinc-200 leading-snug">"{quote}"</p>
                <p className="text-[11px] text-zinc-500">{name}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────────────────────── */}
      <section className="px-5 py-10 max-w-lg mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 items-center text-center">
          <span className="text-3xl">⚡</span>
          <div className="flex flex-col gap-1">
            <h3 className="text-2xl font-black">Better ear. Better playing.</h3>
            <p className="text-sm text-zinc-400">Start your journey today.</p>
          </div>
          <Link
            href="/session"
            className="w-full py-4 bg-rust-500 hover:bg-rust-400 active:bg-rust-600 rounded-xl text-base font-black text-white transition-all shadow-lg shadow-rust-800/50 hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <span>🎸</span> Start Training
          </Link>
          <p className="text-[11px] text-zinc-500">No login • 100% free to start</p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="px-5 py-8 border-t border-zinc-800/60 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "🌐", label: "Works in your browser" },
            { icon: "📥", label: "No download needed" },
            { icon: "📱", label: "Practice anywhere" },
            { icon: "🔒", label: "Privacy focused" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-xs text-zinc-500">
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-6 mt-6">
          {[
            { href: "/tuner", label: "Tuner" },
            { href: "/progress", label: "Progress" },
            { href: "/settings", label: "Settings" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              {label}
            </Link>
          ))}
        </div>
      </footer>

    </main>
  );
}

