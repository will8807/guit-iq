import Link from "next/link";

const DEV_TOOLS = [
  {
    href: "/dev/demo",
    label: "UI Showcase",
    description: "Component previews — fretboard highlights, feedback, How To Play overlays",
    emoji: "🎨",
  },
  {
    href: "/dev/audio",
    label: "Audio Engine",
    description: "Fire individual notes, chords, and sequences to test the audio engine",
    emoji: "🔊",
  },
  {
    href: "/dev/fretboard",
    label: "Fretboard Sandbox",
    description: "Interactive fretboard component in isolation",
    emoji: "🎸",
  },
  {
    href: "/dev/color-variants",
    label: "Color Variants",
    description: "Visual comparison of palette / theme candidates",
    emoji: "🎨",
  },
  {
    href: "/dev/landing-variants",
    label: "Landing Variants",
    description: "Layout variant experiments for the landing page",
    emoji: "🖼️",
  },
];

export default function DevIndexPage() {
  return (
    <main className="min-h-screen bg-[#100c06] text-white flex flex-col p-6 gap-8 max-w-xl mx-auto">
      <div className="flex flex-col gap-1 pt-4">
        <p className="text-xs text-rust-300 uppercase tracking-widest font-semibold">Internal</p>
        <h1 className="text-3xl font-black">Dev Tools</h1>
        <p className="text-sm text-zinc-400">These pages are for development and design review only.</p>
      </div>

      <nav className="flex flex-col gap-3">
        {DEV_TOOLS.map(({ href, label, description, emoji }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-rust-500/60 hover:bg-zinc-800/60 transition-colors"
          >
            <span className="text-2xl mt-0.5">{emoji}</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-white">{label}</span>
              <span className="text-sm text-zinc-400">{description}</span>
            </div>
          </Link>
        ))}
      </nav>

      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors text-center">
        ← Back to app
      </Link>
    </main>
  );
}
