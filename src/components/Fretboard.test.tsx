import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Fretboard from "./Fretboard";

// Mock audio engine — we don't want real Tone.js in component tests
vi.mock("@/lib/audio/engine", () => ({
  playNote: vi.fn().mockResolvedValue(undefined),
  isAudioReady: vi.fn().mockReturnValue(true),
}));

import { playNote, isAudioReady } from "@/lib/audio/engine";
const mockPlayNote = vi.mocked(playNote);
const mockIsAudioReady = vi.mocked(isAudioReady);

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAudioReady.mockReturnValue(true);
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("Fretboard rendering", () => {
  it("renders a grid with 78 interactive cells (6 strings × 13 frets)", () => {
    render(<Fretboard />);
    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(78);
  });

  it("has an accessible grid label", () => {
    render(<Fretboard />);
    expect(screen.getByRole("grid", { name: /guitar fretboard/i })).toBeInTheDocument();
  });

  it("does not show any note name text in cells", () => {
    render(<Fretboard />);
    const cells = screen.getAllByRole("gridcell");
    cells.forEach((cell) => {
      // Cell text content should only be a fret dot span or empty — no note names
      const text = cell.textContent?.trim() ?? "";
      expect(text).not.toMatch(/^[A-G][#b]?\d$/);
    });
  });

  it("labels each cell with string and fret info for accessibility", () => {
    render(<Fretboard />);
    expect(screen.getByRole("gridcell", { name: "String 1, fret 0" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "String 6, fret 12" })).toBeInTheDocument();
  });
});

// ─── Interaction ──────────────────────────────────────────────────────────────

describe("Fretboard interaction", () => {
  it("calls onSelect with the correct string and fret when a cell is tapped", () => {
    const onSelect = vi.fn();
    render(<Fretboard onSelect={onSelect} />);
    const cell = screen.getByRole("gridcell", { name: "String 6, fret 5" });
    fireEvent.click(cell);
    expect(onSelect).toHaveBeenCalledWith(6, 5);
  });

  it("plays the note through the audio engine on tap when audio is ready", async () => {
    render(<Fretboard />);
    const cell = screen.getByRole("gridcell", { name: "String 5, fret 0" });
    fireEvent.click(cell);
    // Wait for async playNote call
    await vi.waitFor(() => expect(mockPlayNote).toHaveBeenCalledWith("A2", 1.5));
  });

  it("does not call playNote when audio is not ready", () => {
    mockIsAudioReady.mockReturnValue(false);
    render(<Fretboard />);
    fireEvent.click(screen.getByRole("gridcell", { name: "String 1, fret 0" }));
    expect(mockPlayNote).not.toHaveBeenCalled();
  });

  it("does not call onSelect or playNote when disabled", () => {
    const onSelect = vi.fn();
    render(<Fretboard onSelect={onSelect} disabled />);
    fireEvent.click(screen.getByRole("gridcell", { name: "String 1, fret 0" }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(mockPlayNote).not.toHaveBeenCalled();
  });

  it("works without an onSelect prop (no crash)", () => {
    render(<Fretboard />);
    expect(() =>
      fireEvent.click(screen.getByRole("gridcell", { name: "String 3, fret 7" }))
    ).not.toThrow();
  });
});

// ─── Highlights ───────────────────────────────────────────────────────────────

describe("Fretboard highlights", () => {
  it("applies correct highlight class to the specified cell", () => {
    render(
      <Fretboard
        highlights={[{ string: 6, fret: 5, variant: "correct" }]}
      />
    );
    const cell = screen.getByRole("gridcell", { name: "String 6, fret 5" });
    expect(cell.className).toContain("bg-green-500");
  });

  it("applies incorrect highlight class", () => {
    render(
      <Fretboard
        highlights={[{ string: 1, fret: 0, variant: "incorrect" }]}
      />
    );
    const cell = screen.getByRole("gridcell", { name: "String 1, fret 0" });
    expect(cell.className).toContain("bg-red-500");
  });

  it("applies hint highlight class", () => {
    render(
      <Fretboard
        highlights={[{ string: 3, fret: 5, variant: "hint" }]}
      />
    );
    const cell = screen.getByRole("gridcell", { name: "String 3, fret 5" });
    expect(cell.className).toContain("bg-yellow-400");
  });

  it("can highlight multiple cells simultaneously", () => {
    render(
      <Fretboard
        highlights={[
          { string: 6, fret: 0, variant: "hint" },
          { string: 1, fret: 12, variant: "correct" },
        ]}
      />
    );
    expect(
      screen.getByRole("gridcell", { name: "String 6, fret 0" }).className
    ).toContain("bg-yellow-400");
    expect(
      screen.getByRole("gridcell", { name: "String 1, fret 12" }).className
    ).toContain("bg-green-500");
  });
});
