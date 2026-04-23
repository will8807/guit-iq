import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChallengeFeedback from "./ChallengeFeedback";
import type { EvaluationResult } from "@/lib/challenges/findTheNote";
import type { ChordEvaluationResult } from "@/lib/challenges/findTheChord";

const correctResult: EvaluationResult = {
  correct: true,
  tappedPosition: { string: 2, fret: 5 },
  validPositions: [{ string: 2, fret: 5 }],
  targetNote: "E4",
};

const incorrectResult: EvaluationResult = {
  correct: false,
  tappedPosition: { string: 1, fret: 3 },
  validPositions: [{ string: 2, fret: 5 }, { string: 6, fret: 0 }],
  targetNote: "E2",
};

// ── Interval result fixtures ────────────────────────────────────────────────

const rootPos = { string: 2, fret: 5 };
const secondPos = { string: 3, fret: 2 };
const rootValidPositions = [rootPos, { string: 4, fret: 7 }];
const secondValidPositions = [secondPos, { string: 5, fret: 9 }];

function makeIntervalResult(rootCorrect: boolean, secondCorrect: boolean): EvaluationResult {
  return {
    correct: rootCorrect && secondCorrect,
    tappedPosition: rootPos,
    validPositions: rootValidPositions,
    targetNote: "A3",
    intervalResult: {
      rootTap: rootPos,
      rootCorrect,
      rootValidPositions,
      secondTap: secondPos,
      secondCorrect,
      secondValidPositions,
      intervalName: "Perfect 5th",
    },
  };
}

const score = { correct: 2, total: 5 };

describe("ChallengeFeedback", () => {
  it("shows 'Correct!' banner for a correct answer", () => {
    render(<ChallengeFeedback result={correctResult} score={score} onNext={vi.fn()} />);
    expect(screen.getByText("Correct!")).toBeDefined();
  });

  it("shows 'Not quite' banner for an incorrect answer", () => {
    render(<ChallengeFeedback result={incorrectResult} score={score} onNext={vi.fn()} />);
    expect(screen.getByText("Not quite")).toBeDefined();
  });

  it("displays the score", () => {
    render(<ChallengeFeedback result={correctResult} score={score} onNext={vi.fn()} />);
    expect(screen.getByText("2 / 5")).toBeDefined();
  });

  it("renders a Next button", () => {
    render(<ChallengeFeedback result={correctResult} score={score} onNext={vi.fn()} />);
    expect(screen.getByRole("button", { name: /next/i })).toBeDefined();
  });

  it("calls onNext when Next button is clicked", async () => {
    const onNext = vi.fn();
    render(<ChallengeFeedback result={correctResult} score={score} onNext={onNext} />);
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("correct banner has green styling", () => {
    render(<ChallengeFeedback result={correctResult} score={score} onNext={vi.fn()} />);
    const banner = screen.getByText("Correct!").closest("div")!;
    expect(banner.className).toContain("green");
  });

  it("incorrect banner has red styling", () => {
    render(<ChallengeFeedback result={incorrectResult} score={score} onNext={vi.fn()} />);
    const banner = screen.getByText("Not quite").closest("div")!;
    expect(banner.className).toContain("red");
  });

  // ── Interval feedback ─────────────────────────────────────────────────────

  it("shows interval name when intervalResult is present", () => {
    render(<ChallengeFeedback result={makeIntervalResult(true, true)} score={score} onNext={vi.fn()} />);
    expect(screen.getByText("Perfect 5th")).toBeDefined();
  });

  it("does not show interval context for note challenges", () => {
    render(<ChallengeFeedback result={correctResult} score={score} onNext={vi.fn()} />);
    expect(screen.queryByText(/That was/)).toBeNull();
    expect(screen.queryByText(/Root/)).toBeNull();
  });

  it("shows Root ✓ and Interval ✓ when both taps are correct", () => {
    render(<ChallengeFeedback result={makeIntervalResult(true, true)} score={score} onNext={vi.fn()} />);
    expect(screen.getByText("Root ✓")).toBeDefined();
    expect(screen.getByText("Interval ✓")).toBeDefined();
  });

  it("shows Root ✗ when root tap is wrong", () => {
    render(<ChallengeFeedback result={makeIntervalResult(false, true)} score={score} onNext={vi.fn()} />);
    expect(screen.getByText("Root ✗")).toBeDefined();
    expect(screen.getByText("Interval ✓")).toBeDefined();
  });

  it("shows Interval ✗ when second tap is wrong", () => {
    render(<ChallengeFeedback result={makeIntervalResult(true, false)} score={score} onNext={vi.fn()} />);
    expect(screen.getByText("Root ✓")).toBeDefined();
    expect(screen.getByText("Interval ✗")).toBeDefined();
  });

  it("shows Root ✗ and Interval ✗ when both taps are wrong", () => {
    render(<ChallengeFeedback result={makeIntervalResult(false, false)} score={score} onNext={vi.fn()} />);
    expect(screen.getByText("Root ✗")).toBeDefined();
    expect(screen.getByText("Interval ✗")).toBeDefined();
  });

  it("shows same-string hint when secondSameString is true", () => {
    const result = makeIntervalResult(true, false);
    result.intervalResult!.secondSameString = true;
    render(<ChallengeFeedback result={result} score={score} onNext={vi.fn()} />);
    expect(screen.getByText(/Correct note.*different string/)).toBeDefined();
  });

  it("does not show same-string hint when secondSameString is false", () => {
    render(<ChallengeFeedback result={makeIntervalResult(true, false)} score={score} onNext={vi.fn()} />);
    expect(screen.queryByText(/different string/)).toBeNull();
  });

  // ── Chord feedback ────────────────────────────────────────────────────────

  function makeChordResult(
    tapCorrectness: boolean[],
    missedCount = 0,
  ): EvaluationResult {
    const tapResults: ChordEvaluationResult["tapResults"] = tapCorrectness.map(
      (correct, i) => ({
        correct,
        pitchClass: i,
        position: { string: i + 1, fret: 0 },
      })
    );
    const missedPitchClasses = new Set(
      Array.from({ length: missedCount }, (_, i) => i + 10)
    );
    const chordResult: ChordEvaluationResult = {
      correct: tapCorrectness.every(Boolean) && missedCount === 0,
      tapResults,
      missedPitchClasses,
      rootPositions: [],
      chordLabel: "C Major",
    };
    return {
      correct: chordResult.correct,
      tappedPosition: { string: 1, fret: 0 },
      validPositions: [],
      targetNote: "C Major",
      chordResult,
    };
  }

  it("shows chord label when chordResult is present", () => {
    render(<ChallengeFeedback result={makeChordResult([true, true, true])} score={score} onNext={vi.fn()} />);
    expect(screen.getByText("C Major")).toBeDefined();
  });

  it("shows 'That was a' educational line for chord challenges", () => {
    render(<ChallengeFeedback result={makeChordResult([true])} score={score} onNext={vi.fn()} />);
    expect(screen.getByText(/That was a/)).toBeDefined();
  });

  it("does not show chord context for note-only challenges", () => {
    render(<ChallengeFeedback result={correctResult} score={score} onNext={vi.fn()} />);
    expect(screen.queryByText(/That was a/)).toBeNull();
  });

  it("shows per-tap result pills", () => {
    render(
      <ChallengeFeedback result={makeChordResult([true, false, true])} score={score} onNext={vi.fn()} />
    );
    expect(screen.getByText("Tap 1 ✓")).toBeDefined();
    expect(screen.getByText("Tap 2 ✗")).toBeDefined();
    expect(screen.getByText("Tap 3 ✓")).toBeDefined();
  });

  it("shows 'N missed' pill when pitch classes were missed", () => {
    render(
      <ChallengeFeedback result={makeChordResult([true], 2)} score={score} onNext={vi.fn()} />
    );
    expect(screen.getByText("2 missed")).toBeDefined();
  });

  it("does not show missed pill when no pitch classes were missed", () => {
    render(
      <ChallengeFeedback result={makeChordResult([true, true, true], 0)} score={score} onNext={vi.fn()} />
    );
    expect(screen.queryByText(/missed/)).toBeNull();
  });

  it("caps per-tap pills at 6 and shows overflow count", () => {
    const taps = Array(8).fill(true);
    render(<ChallengeFeedback result={makeChordResult(taps)} score={score} onNext={vi.fn()} />);
    // Should show Tap 1–6 and "+2 more"
    expect(screen.getByText("Tap 6 ✓")).toBeDefined();
    expect(screen.queryByText("Tap 7 ✓")).toBeNull();
    expect(screen.getByText("+2 more")).toBeDefined();
  });

  it("correct chord result shows green banner", () => {
    render(<ChallengeFeedback result={makeChordResult([true, true, true], 0)} score={score} onNext={vi.fn()} />);
    const banner = screen.getByText("Correct!").closest("div")!;
    expect(banner.className).toContain("green");
  });

  it("incorrect chord result shows red banner", () => {
    render(<ChallengeFeedback result={makeChordResult([false, true])} score={score} onNext={vi.fn()} />);
    const banner = screen.getByText("Not quite").closest("div")!;
    expect(banner.className).toContain("red");
  });
});
