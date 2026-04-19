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
});
