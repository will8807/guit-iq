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
    expect(screen.getByRole("button", { name: /replay note/i })).toBeDefined();
  });

  it("replay button is disabled while playing", () => {
    render(<ChallengePrompt isPlaying={true} onReplay={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /replay note/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("calls onReplay when replay button is clicked", async () => {
    const onReplay = vi.fn();
    render(<ChallengePrompt isPlaying={false} onReplay={onReplay} />);
    await userEvent.click(screen.getByRole("button", { name: /replay note/i }));
    expect(onReplay).toHaveBeenCalledOnce();
  });

  it("does not call onReplay when disabled", async () => {
    const onReplay = vi.fn();
    render(<ChallengePrompt isPlaying={true} onReplay={onReplay} />);
    await userEvent.click(screen.getByRole("button", { name: /replay note/i }));
    expect(onReplay).not.toHaveBeenCalled();
  });
});
