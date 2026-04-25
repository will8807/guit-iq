import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center gap-10 p-8">
      {/* Hero */}
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-6xl">🎸</span>
        <h1 className="text-4xl font-bold tracking-tight">GuitIQ</h1>
        <p className="text-zinc-400 text-lg max-w-xs">
          Train your ear. Hear a note — find it on the fretboard.
        </p>
      </div>

      {/* Feature bullets */}
      <ul className="flex flex-col gap-3 text-sm text-zinc-300 max-w-xs w-full">
        {[
          { icon: "🎵", text: "Every challenge starts with audio" },
          { icon: "🎯", text: "Tap the note on the fretboard" },
          { icon: "📈", text: "Three difficulty levels" },
          { icon: "🔄", text: "Portrait & landscape fretboard" },
        ].map(({ icon, text }) => (
          <li key={text} className="flex items-center gap-3 bg-zinc-800 rounded-lg px-4 py-3">
            <span aria-hidden="true" className="text-lg">{icon}</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <Link
          href="/session"
          className="w-full text-center px-10 py-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-full text-xl font-bold transition-colors"
        >
          Start Training
        </Link>
        <Link
          href="/tuner"
          className="w-full text-center px-10 py-4 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 rounded-full text-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <span aria-hidden="true">🎸</span> Tuner
        </Link>
      </div>
    </main>
  );
}
