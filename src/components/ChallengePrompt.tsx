"use client";

/**
 * components/ChallengePrompt.tsx
 *
 * Shown during "playing" and "awaiting" phases.
 * Displays the instruction and a replay button — never shows the note name
 * unless Show Root is enabled.
 *
 * For interval challenges, the prompt changes depending on which tap step
 * we are waiting for. Tap order does not matter — either note can go first:
 *   Step 1 → "Tap the two notes of the interval"
 *   Step 2 → "Now tap the other note"
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
  challengeType?: "find-the-note" | "find-the-interval" | "find-the-chord" | "find-all-positions";
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
   * For chord/find-all challenges: number of taps accumulated so far.
   * Shown as a badge when > 0.
   */
  chordTapCount?: number;
  /**
   * When provided, a "Done" button is rendered next to Replay.
   * Pass the submit handler (submitChordAnswer, submitFindAllAnswer, etc.).
   */
  onDone?: () => void;
  /** Label for the Done button, e.g. "Done (3 taps)". Defaults to "Done". */
  doneLabel?: string;
  /** Whether the Done button should be disabled. */
  doneDisabled?: boolean;
  /** For interval challenges: show the same-string hint instead of a Done button. */
  sameStringHint?: boolean;
  /**
   * Hint system (no-root mode only).
   * onHint — called when the 💡 button is pressed; omit to hide the button entirely.
   * hintLevel — 0 = no hint shown, 1 = name revealed, 2 = name + position revealed.
   * hintName  — the name to display at level 1+ (e.g. "A3", "C Major", "Perfect 5th").
   */
  onHint?: () => void;
  hintLevel?: 0 | 1 | 2;
  hintName?: string;
}

function getPromptText(
  isPlaying: boolean,
  challengeType: "find-the-note" | "find-the-interval" | "find-the-chord" | "find-all-positions",
  intervalStep: 1 | 2,
  intervalName?: string,
): string {
  if (isPlaying) return "🎵 Listen…";
  if (challengeType === "find-the-chord") return "Tap all chord tones";
  if (challengeType === "find-all-positions") return "Find every position for this note";
  if (challengeType === "find-the-interval") {
    // Show Root ON: interval name provided, root is pre-filled — single tap
    if (intervalName) return `Find the ${intervalName}`;
    return intervalStep === 1 ? "Tap the two notes of the interval" : "Now tap the other note";
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
  onDone,
  doneLabel = "Done",
  doneDisabled = false,
  sameStringHint = false,
  onHint,
  hintLevel = 0,
  hintName,
}: ChallengePromptProps) {
  const promptText = getPromptText(isPlaying, challengeType, intervalStep, intervalName);

  return (
    <div className="flex flex-col gap-1.5 py-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Sound-wave indicator — visible while audio plays */}
          <div className={`flex items-center gap-[3px] h-4 shrink-0 transition-opacity ${isPlaying ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
            {(["sound-bar-1","sound-bar-2","sound-bar-3","sound-bar-4","sound-bar-5"] as const).map((cls) => (
              <span
                key={cls}
                className={`block w-[3px] rounded-full bg-rust-400 origin-center ${cls}`}
                style={{ height: "14px" }}
              />
            ))}
          </div>
          <p className="text-sm font-semibold text-white">{promptText}</p>

          {/* Step indicator for interval challenges */}
          {challengeType === "find-the-interval" && (
            <span className={`text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full shrink-0 transition-opacity ${isPlaying ? "opacity-0" : "opacity-100"}`}>
              {intervalStep}/2
            </span>
          )}

          {/* Tap counter for chord/find-all challenges */}
          {(challengeType === "find-the-chord" || challengeType === "find-all-positions") && chordTapCount > 0 && (
            <span className={`text-xs text-rust-300 bg-zinc-800 px-2 py-0.5 rounded-full shrink-0 transition-opacity ${isPlaying ? "opacity-0" : "opacity-100"}`}>
              {chordTapCount} tapped
            </span>
          )}
        </div>

        <button
          onClick={onReplay}
          disabled={isPlaying}
          aria-label="Replay"
          className={[
            "flex items-center justify-center gap-1.5 px-4 py-2 rounded-full font-medium text-sm",
            "transition-colors shrink-0 border min-w-[100px]",
            isPlaying
              ? "border-zinc-600 text-zinc-500 cursor-not-allowed"
              : "border-rust-500 text-rust-400 hover:bg-rust-500/10 active:bg-rust-500/20",
          ].join(" ")}
        >
          <span aria-hidden="true">🔁</span>
          {isPlaying ? "Playing…" : "Replay"}
        </button>

        {/* Done button — shown for chord/interval/find-all challenges */}
        {sameStringHint && (
          <span className={`text-xs text-rust-300 shrink-0 transition-opacity ${isPlaying ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
            ✓ Try another string
          </span>
        )}
        {onDone && !sameStringHint && (
          <button
            onClick={onDone}
            disabled={doneDisabled || isPlaying}
            className={[
              "px-4 py-2 rounded-full font-semibold text-sm transition-colors shrink-0",
              doneDisabled || isPlaying
                ? "bg-zinc-700 text-zinc-500 opacity-40 cursor-not-allowed"
                : "bg-rust-500 hover:bg-rust-400 active:bg-rust-600 text-white shadow-md shadow-rust-700/40",
            ].join(" ")}
          >
            {doneLabel}
          </button>
        )}

        {/* Hint button — only shown when onHint is provided and level < 2 */}
        {onHint && hintLevel < 2 && (
          <button
            onClick={onHint}
            disabled={isPlaying}
            aria-label="Hint"
            title={hintLevel === 0 ? "Reveal name" : "Reveal a position"}
            className={`w-8 h-8 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 text-rust-300 text-sm transition-colors shrink-0 ${isPlaying ? "opacity-0 pointer-events-none" : ""}`}
          >
            💡
          </button>
        )}
      </div>

      {/* Show Root: display note/chord name as a text badge */}
      {rootNote && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">
            {challengeType === "find-the-interval"
              ? "Root"
              : challengeType === "find-the-chord"
                ? "Chord"
                : "Note"}
          </span>
          <span
            className="text-sm font-bold text-rust-300 bg-zinc-800 px-2.5 py-0.5 rounded-md tracking-wide"
            data-testid={challengeType === "find-the-chord" ? "chord-label" : undefined}
          >
            {rootNote}
          </span>
        </div>
      )}

      {/* Hint name badge (level 1+) — only shown when Show Root is off */}
      {!rootNote && hintLevel >= 1 && hintName && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-rust-400 uppercase tracking-wide">Hint</span>
          <span className="text-sm font-bold text-rust-300 bg-zinc-800 px-2.5 py-0.5 rounded-md tracking-wide">
            {hintName}
          </span>
          {hintLevel === 1 && (
            <span className="text-xs text-zinc-500">(press 💡 again for a position)</span>
          )}
        </div>
      )}
    </div>
  );
}


