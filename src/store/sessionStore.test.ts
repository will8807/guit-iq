import { describe, it, expect, beforeEach } from "vitest";
import { useSessionStore } from "./sessionStore";

// Reset store between tests
beforeEach(() => {
  useSessionStore.getState().reset();
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe("initial state", () => {
  it("starts idle with no challenge", () => {
    const { phase, challenge, lastResult } = useSessionStore.getState();
    expect(phase).toBe("idle");
    expect(challenge).toBeNull();
    expect(lastResult).toBeNull();
  });

  it("starts with easy difficulty", () => {
    expect(useSessionStore.getState().difficulty).toBe("easy");
  });

  it("starts with zero score", () => {
    expect(useSessionStore.getState().score).toEqual({ correct: 0, total: 0 });
  });
});

// ─── startChallenge ───────────────────────────────────────────────────────────

describe("startChallenge", () => {
  it("moves from idle to playing", () => {
    useSessionStore.getState().startChallenge();
    expect(useSessionStore.getState().phase).toBe("playing");
  });

  it("populates challenge", () => {
    useSessionStore.getState().startChallenge();
    expect(useSessionStore.getState().challenge).not.toBeNull();
  });

  it("clears lastResult", () => {
    useSessionStore.getState().startChallenge();
    expect(useSessionStore.getState().lastResult).toBeNull();
  });

  it("is a no-op if already playing", () => {
    useSessionStore.getState().startChallenge();
    const firstChallenge = useSessionStore.getState().challenge;
    useSessionStore.getState().startChallenge(); // second call
    expect(useSessionStore.getState().challenge).toBe(firstChallenge);
  });
});

// ─── noteReady ────────────────────────────────────────────────────────────────

describe("noteReady", () => {
  it("moves from playing to awaiting", () => {
    useSessionStore.getState().startChallenge();
    useSessionStore.getState().noteReady();
    expect(useSessionStore.getState().phase).toBe("awaiting");
  });

  it("is a no-op if not in playing phase", () => {
    // idle → noteReady should do nothing
    useSessionStore.getState().noteReady();
    expect(useSessionStore.getState().phase).toBe("idle");
  });
});

// ─── submitAnswer ─────────────────────────────────────────────────────────────

describe("submitAnswer", () => {
  function setupAwaiting() {
    useSessionStore.getState().startChallenge();
    useSessionStore.getState().noteReady();
  }

  it("moves to feedback phase", () => {
    setupAwaiting();
    useSessionStore.getState().submitAnswer(1, 0);
    expect(useSessionStore.getState().phase).toBe("feedback");
  });

  it("sets lastResult", () => {
    setupAwaiting();
    useSessionStore.getState().submitAnswer(1, 0);
    expect(useSessionStore.getState().lastResult).not.toBeNull();
  });

  it("increments total score on every answer", () => {
    setupAwaiting();
    useSessionStore.getState().submitAnswer(1, 0);
    expect(useSessionStore.getState().score.total).toBe(1);
  });

  it("increments correct score when answer is correct", () => {
    setupAwaiting();
    // Submit a known correct answer — pick first valid position from the challenge
    const { challenge } = useSessionStore.getState();
    const first = challenge!.validPositions[0]!;
    useSessionStore.getState().submitAnswer(first.string, first.fret);
    expect(useSessionStore.getState().score.correct).toBe(1);
    expect(useSessionStore.getState().lastResult!.correct).toBe(true);
  });

  it("does NOT increment correct score for wrong answer", () => {
    setupAwaiting();
    const { challenge } = useSessionStore.getState();
    // Find a position NOT in validPositions
    const invalid = findInvalidPosition(challenge!.validPositions);
    useSessionStore.getState().submitAnswer(invalid.string, invalid.fret);
    expect(useSessionStore.getState().score.correct).toBe(0);
    expect(useSessionStore.getState().lastResult!.correct).toBe(false);
  });

  it("is a no-op if not in awaiting phase", () => {
    // idle → submitAnswer should do nothing
    useSessionStore.getState().submitAnswer(1, 0);
    expect(useSessionStore.getState().phase).toBe("idle");
    expect(useSessionStore.getState().lastResult).toBeNull();
  });
});

// ─── nextChallenge ────────────────────────────────────────────────────────────

describe("nextChallenge", () => {
  it("moves from feedback to idle", () => {
    useSessionStore.getState().startChallenge();
    useSessionStore.getState().noteReady();
    useSessionStore.getState().submitAnswer(1, 0);
    useSessionStore.getState().nextChallenge();
    expect(useSessionStore.getState().phase).toBe("idle");
  });

  it("is a no-op if not in feedback phase", () => {
    useSessionStore.getState().nextChallenge();
    expect(useSessionStore.getState().phase).toBe("idle");
  });
});

// ─── setDifficulty ────────────────────────────────────────────────────────────

describe("setDifficulty", () => {
  it("updates difficulty when idle", () => {
    useSessionStore.getState().setDifficulty("hard");
    expect(useSessionStore.getState().difficulty).toBe("hard");
  });

  it("is a no-op when not idle", () => {
    useSessionStore.getState().startChallenge(); // now playing
    useSessionStore.getState().setDifficulty("hard");
    expect(useSessionStore.getState().difficulty).toBe("easy");
  });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe("reset", () => {
  it("resets everything to initial state", () => {
    useSessionStore.getState().startChallenge();
    useSessionStore.getState().noteReady();
    useSessionStore.getState().submitAnswer(1, 0);
    useSessionStore.getState().reset();

    const { phase, challenge, lastResult, score } = useSessionStore.getState();
    expect(phase).toBe("idle");
    expect(challenge).toBeNull();
    expect(lastResult).toBeNull();
    expect(score).toEqual({ correct: 0, total: 0 });
  });
});

// ─── score accumulation ───────────────────────────────────────────────────────

describe("score accumulation", () => {
  it("accumulates score across multiple challenges", () => {
    for (let i = 0; i < 3; i++) {
      useSessionStore.getState().startChallenge();
      useSessionStore.getState().noteReady();
      useSessionStore.getState().submitAnswer(1, 0);
      useSessionStore.getState().nextChallenge();
    }
    expect(useSessionStore.getState().score.total).toBe(3);
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findInvalidPosition(
  validPositions: { string: number; fret: number }[]
) {
  for (let s = 1; s <= 6; s++) {
    for (let f = 0; f <= 12; f++) {
      const isValid = validPositions.some((p) => p.string === s && p.fret === f);
      if (!isValid) return { string: s, fret: f };
    }
  }
  throw new Error("Could not find an invalid position");
}
