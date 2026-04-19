import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SessionComplete from "./SessionComplete";

// Next.js Link needs a router context in tests; mock it as a plain <a>
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const FROZEN_NOW = 1_000_000_000_000; // fixed reference point

const defaultProps = {
  score: { correct: 6, total: 8 },
  bestStreak: 3,
  sessionStartTime: FROZEN_NOW - 90_000, // exactly 1m 30s ago
  difficulty: "easy" as const,
  onPlayAgain: vi.fn(),
};

describe("SessionComplete", () => {
  beforeAll(() => {
    vi.spyOn(Date, "now").mockReturnValue(FROZEN_NOW);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });
  it("renders the 'Session Complete' heading", () => {
    render(<SessionComplete {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /session complete/i })).toBeTruthy();
  });

  it("displays the score fraction", () => {
    render(<SessionComplete {...defaultProps} />);
    // "6" and "/8" are rendered separately
    expect(screen.getByText("6")).toBeTruthy();
    expect(screen.getByText("/8")).toBeTruthy();
  });

  it("displays the correct accuracy percentage", () => {
    render(<SessionComplete {...defaultProps} />);
    // 6/8 = 75%
    expect(screen.getByTestId("accuracy").textContent).toBe("75%");
  });

  it("displays 100% accuracy when all correct", () => {
    render(<SessionComplete {...defaultProps} score={{ correct: 8, total: 8 }} />);
    expect(screen.getByTestId("accuracy").textContent).toBe("100%");
  });

  it("displays the best streak", () => {
    render(<SessionComplete {...defaultProps} />);
    expect(screen.getByText(/🔥 3/)).toBeTruthy();
  });

  it("shows — for best streak when it is 0", () => {
    render(<SessionComplete {...defaultProps} bestStreak={0} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("shows the elapsed time when sessionStartTime is provided", () => {
    render(<SessionComplete {...defaultProps} />);
    // 90s = 1:30
    expect(screen.getByTestId("elapsed-time").textContent).toBe("1:30");
  });

  it("omits elapsed time when sessionStartTime is null", () => {
    render(<SessionComplete {...defaultProps} sessionStartTime={null} />);
    expect(screen.queryByTestId("elapsed-time")).toBeNull();
  });

  it("displays the difficulty", () => {
    render(<SessionComplete {...defaultProps} difficulty="medium" />);
    expect(screen.getByText("medium")).toBeTruthy();
  });

  it("calls onPlayAgain when 'Play Again' is clicked", async () => {
    const onPlayAgain = vi.fn();
    render(<SessionComplete {...defaultProps} onPlayAgain={onPlayAgain} />);
    await userEvent.click(screen.getByRole("button", { name: /play again/i }));
    expect(onPlayAgain).toHaveBeenCalledOnce();
  });

  it("renders a Home link pointing to /", () => {
    render(<SessionComplete {...defaultProps} />);
    const homeLink = screen.getByRole("link", { name: /home/i });
    expect(homeLink.getAttribute("href")).toBe("/");
  });

  it("shows the trophy emoji for 100% accuracy", () => {
    render(<SessionComplete {...defaultProps} score={{ correct: 8, total: 8 }} />);
    expect(screen.getByRole("img", { name: /result/i }).textContent).toBe("🏆");
  });
});
