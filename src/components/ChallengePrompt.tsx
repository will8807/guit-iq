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
    <div className="flex items-center gap-3 py-2">
      <p className="text-sm font-semibold text-white">
        {isPlaying ? "🎵 Listen…" : "Find this note"}
      </p>

      <button
        onClick={onReplay}
        disabled={isPlaying}
        aria-label="Replay note"
        className={[
          "ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-white text-sm",
          "transition-colors shrink-0",
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
