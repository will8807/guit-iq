"use client";

/**
 * components/ChallengePrompt.tsx
 *
 * Shown during "playing" and "awaiting" phases.
 * Displays the instruction and a replay button — never shows the note name
 * unless Show Root is enabled.
 *
 * For interval challenges, the prompt changes depending on which tap step
 * we are waiting for:
 *   Step 1 → "Tap the root note"
 *   Step 2 → "Now tap the second note"
 *
 * For chord challenges, the prompt shows:
 *   "Tap all chord tones" with a running tap counter badge.
 *   When Show Root is ON, the chord label is shown (e.g. "C Major").
 *
 * When Show Root is ON, a note-name badge appears below the prompt text:
 *   - Intervals: "Root: A3"  (user knows root name, still finds both notes)
 *   - Notes:     "Note: A3"  (user knows the note name)
 *   - Chords:    "Chord: C Major"
 */

interface ChallengePromptProps {
  /** Whether the note is still playing (disables replay) */
  isPlaying: boolean;
  /** Called when the user taps the replay button */
  onReplay: () => void;
  /** Challenge type — controls prompt text */
  challengeType?: "find-the-note" | "find-the-interval" | "find-the-chord";
  /**
   * For interval challenges: 1 = waiting for root tap, 2 = waiting for second-note tap.
   * Ignored for note/chord challenges.
   */
  intervalStep?: 1 | 2;
  /**
   * When Show Root is ON for an interval challenge, pass the human-readable interval
   * name (e.g. "Perfect 5th"). The prompt reads "Find the Perfect 5th".
   */
  intervalName?: string;
  /**
   * When Show Root is ON, the root/target note name to display as a text badge
   * (e.g. "A3"). For intervals this is the root note; for notes it is the target note.
   * For chords, pass the full chord label (e.g. "C Major").
   */
  rootNote?: string;
  /**
   * For chord challenges: number of taps accumulated so far.
   * Shown as a badge when > 0.
   */
  chordTapCount?: number;
}

function getPromptText(
  isPlaying: boolean,
  challengeType: "find-the-note" | "find-the-interval" | "find-the-chord",
  intervalStep: 1 | 2,
  intervalName?: string,
): string {
  if (isPlaying) return "🎵 Listen…";
  if (challengeType === "find-the-chord") return "Tap all chord tones";
  if (challengeType === "find-the-interval") {
    // Show Root ON: interval name provided, root is pre-filled — single tap
    if (intervalName) return `Find the ${intervalName}`;
    return intervalStep === 1 ? "Tap the root note" : "Now tap the second note";
  }
  return "Find this note";
}

export default function ChallengePrompt({
  isPlaying,
  onReplay,
  challengeType = "find-the-note",
  intervalStep = 1,
  intervalName,
  rootNote,
  chordTapCount = 0,
}: ChallengePromptProps) {
  const promptText = getPromptText(isPlaying, challengeType, intervalStep, intervalName);

  return (
    <div className="flex flex-col gap-1.5 py-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{promptText}</p>

          {/* Step indicator for interval challenges */}
          {challengeType === "find-the-interval" && !isPlaying && (
            <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full shrink-0">
              {intervalStep}/2
            </span>
          )}

          {/* Tap counter for chord challenges */}
          {challengeType === "find-the-chord" && !isPlaying && chordTapCount > 0 && (
            <span className="text-xs text-indigo-300 bg-zinc-800 px-2 py-0.5 rounded-full shrink-0">
              {chordTapCount} tapped
            </span>
          )}
        </div>

        <button
          onClick={onReplay}
          disabled={isPlaying}
          aria-label="Replay"
          className={[
            "flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-white text-sm",
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

      {/* Show Root: display note/chord name as a text badge */}
      {rootNote && !isPlaying && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">
            {challengeType === "find-the-interval"
              ? "Root"
              : challengeType === "find-the-chord"
                ? "Chord"
                : "Note"}
          </span>
          <span className="text-sm font-bold text-amber-400 bg-zinc-800 px-2.5 py-0.5 rounded-md tracking-wide"
            data-testid={challengeType === "find-the-chord" ? "chord-label" : undefined}
          >            {rootNote}
          </span>
        </div>
      )}
    </div>
  );
}
