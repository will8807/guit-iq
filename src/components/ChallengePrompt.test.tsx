import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChallengePrompt from "./ChallengePrompt";

describe("ChallengePrompt", () => {
  it("shows 'Find this note' when not playing", () => {
    render(<ChallengePrompt isPlaying={false} onReplay={vi.fn()} />);
    expect(screen.getByText("Find this note")).toBeDefined();
  });

  it("shows 'Listen…' text when playing", () => {
    render(<ChallengePrompt isPlaying={true} onReplay={vi.fn()} />);
    expect(screen.getByText(/Listen/)).toBeDefined();
  });

  it("shows Replay button when not playing", () => {
    render(<ChallengePrompt isPlaying={false} onReplay={vi.fn()} />);
    expect(screen.getByRole("button", { name: /replay/i })).toBeDefined();
  });

  it("replay button is disabled while playing", () => {
    render(<ChallengePrompt isPlaying={true} onReplay={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /replay/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("calls onReplay when replay button is clicked", async () => {
    const onReplay = vi.fn();
    render(<ChallengePrompt isPlaying={false} onReplay={onReplay} />);
    await userEvent.click(screen.getByRole("button", { name: /replay/i }));
    expect(onReplay).toHaveBeenCalledOnce();
  });

  it("does not call onReplay when disabled", async () => {
    const onReplay = vi.fn();
    render(<ChallengePrompt isPlaying={true} onReplay={onReplay} />);
    await userEvent.click(screen.getByRole("button", { name: /replay/i }));
    expect(onReplay).not.toHaveBeenCalled();
  });

  it("shows interval prompt text for find-the-interval challenge (step 1)", () => {
    render(<ChallengePrompt isPlaying={false} onReplay={vi.fn()} challengeType="find-the-interval" intervalStep={1} />);
    expect(screen.getByText("Tap the root note")).toBeDefined();
    expect(screen.getByText("1/2")).toBeDefined();
  });

  it("shows interval prompt text for find-the-interval challenge (step 2)", () => {
    render(<ChallengePrompt isPlaying={false} onReplay={vi.fn()} challengeType="find-the-interval" intervalStep={2} />);
    expect(screen.getByText("Now tap the second note")).toBeDefined();
    expect(screen.getByText("2/2")).toBeDefined();
  });

  it("does not show step indicator for note challenges", () => {
    render(<ChallengePrompt isPlaying={false} onReplay={vi.fn()} challengeType="find-the-note" />);
    expect(screen.queryByText(/\/2/)).toBeNull();
  });
});
