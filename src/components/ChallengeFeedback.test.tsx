import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChallengeFeedback from "./ChallengeFeedback";
import type { EvaluationResult } from "@/lib/challenges/findTheNote";

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
});
