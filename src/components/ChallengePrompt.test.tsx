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

  // ── Show Root ─────────────────────────────────────────────────────────────

  it("shows note name badge when rootNote is provided and not playing", () => {
    render(
      <ChallengePrompt
        isPlaying={false}
        onReplay={vi.fn()}
        challengeType="find-the-note"
        rootNote="A3"
      />
    );
    expect(screen.getByText("A3")).toBeDefined();
    expect(screen.getByText("Note")).toBeDefined();
  });

  it("does not show note badge when rootNote is not provided", () => {
    render(<ChallengePrompt isPlaying={false} onReplay={vi.fn()} challengeType="find-the-note" />);
    expect(screen.queryByText("Note")).toBeNull();
  });

  it("shows 'Root' label for interval challenges when rootNote is provided", () => {
    render(
      <ChallengePrompt
        isPlaying={false}
        onReplay={vi.fn()}
        challengeType="find-the-interval"
        intervalStep={1}
        rootNote="G3"
      />
    );
    expect(screen.getByText("G3")).toBeDefined();
    expect(screen.getByText("Root")).toBeDefined();
  });

  it("hides note badge while audio is playing even if rootNote is set", () => {
    render(
      <ChallengePrompt
        isPlaying={true}
        onReplay={vi.fn()}
        challengeType="find-the-note"
        rootNote="A3"
      />
    );
    expect(screen.queryByText("A3")).toBeNull();
  });

  it("shows interval name in prompt when intervalName is provided", () => {
    render(
      <ChallengePrompt
        isPlaying={false}
        onReplay={vi.fn()}
        challengeType="find-the-interval"
        intervalName="Perfect 5th"
      />
    );
    expect(screen.getByText("Find the Perfect 5th")).toBeDefined();
  });

  // ── Chord challenge ────────────────────────────────────────────────────────

  it("shows 'Tap all chord tones' prompt for chord challenges", () => {
    render(<ChallengePrompt isPlaying={false} onReplay={vi.fn()} challengeType="find-the-chord" />);
    expect(screen.getByText("Tap all chord tones")).toBeDefined();
  });

  it("does not show tap counter when chordTapCount is 0", () => {
    render(
      <ChallengePrompt isPlaying={false} onReplay={vi.fn()} challengeType="find-the-chord" chordTapCount={0} />
    );
    expect(screen.queryByText(/tapped/)).toBeNull();
  });

  it("shows tap counter badge when chordTapCount > 0", () => {
    render(
      <ChallengePrompt isPlaying={false} onReplay={vi.fn()} challengeType="find-the-chord" chordTapCount={3} />
    );
    expect(screen.getByText("3 tapped")).toBeDefined();
  });

  it("does not show tap counter while audio is playing", () => {
    render(
      <ChallengePrompt isPlaying={true} onReplay={vi.fn()} challengeType="find-the-chord" chordTapCount={2} />
    );
    expect(screen.queryByText(/tapped/)).toBeNull();
  });

  it("shows 'Chord' label when Show Root ON for chord challenge", () => {
    render(
      <ChallengePrompt
        isPlaying={false}
        onReplay={vi.fn()}
        challengeType="find-the-chord"
        rootNote="C Major"
      />
    );
    expect(screen.getByText("Chord")).toBeDefined();
    expect(screen.getByText("C Major")).toBeDefined();
  });

  it("does not show step indicator for chord challenges", () => {
    render(<ChallengePrompt isPlaying={false} onReplay={vi.fn()} challengeType="find-the-chord" />);
    expect(screen.queryByText(/\/2/)).toBeNull();
  });

  it("hides chord name badge while audio is playing even if rootNote is set", () => {
    render(
      <ChallengePrompt
        isPlaying={true}
        onReplay={vi.fn()}
        challengeType="find-the-chord"
        rootNote="G Minor"
      />
    );
    expect(screen.queryByText("G Minor")).toBeNull();
  });
});
