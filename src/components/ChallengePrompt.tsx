"use client";

/**
 * components/ChallengePrompt.tsx
 *
 * Shown during "playing" and "awaiting" phases.
 * Displays the instruction and a replay button — never shows the note name.
 */

interface ChallengePromptProps {
  /** Whether the note is still playing (disables replay) */
  isPlaying: boolean;
  /** Called when the user taps the replay button */
  onReplay: () => void;
}

export default function ChallengePrompt({
  isPlaying,
  onReplay,
}: ChallengePromptProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <p className="text-xl font-semibold text-white text-center">
        {isPlaying ? "🎵 Listen…" : "Find this note on the fretboard"}
      </p>

      <button
        onClick={onReplay}
        disabled={isPlaying}
        aria-label="Replay note"
        className={[
          "flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white",
          "transition-colors",
          isPlaying
            ? "bg-zinc-700 opacity-50 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700",
        ].join(" ")}
      >
        <span aria-hidden="true">🔁</span>
        {isPlaying ? "Playing…" : "Replay"}
      </button>
    </div>
  );
}
