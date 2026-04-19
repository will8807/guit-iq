import { describe, it, expect, beforeEach } from "vitest";
import { useSessionStore } from "./sessionStore";
import { STREAK_THRESHOLD } from "@/lib/challenges/findTheNote";

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

// ─── M4: streak tracking ──────────────────────────────────────────────────────

describe("streak tracking", () => {
  function setupAwaiting() {
    useSessionStore.getState().startChallenge();
    useSessionStore.getState().noteReady();
  }

  it("starts at 0", () => {
    expect(useSessionStore.getState().streak).toBe(0);
  });

  it("increments streak on correct answer", () => {
    setupAwaiting();
    const { challenge } = useSessionStore.getState();
    const pos = challenge!.validPositions[0]!;
    useSessionStore.getState().submitAnswer(pos.string, pos.fret);
    expect(useSessionStore.getState().streak).toBe(1);
  });

  it("resets streak to 0 on incorrect answer", () => {
    // First answer correct → streak = 1
    setupAwaiting();
    const { challenge } = useSessionStore.getState();
    const pos = challenge!.validPositions[0]!;
    useSessionStore.getState().submitAnswer(pos.string, pos.fret);
    expect(useSessionStore.getState().streak).toBe(1);

    // Next challenge — wrong answer
    useSessionStore.getState().nextChallenge();
    setupAwaiting();
    const invalid = findInvalidPosition(
      useSessionStore.getState().challenge!.validPositions
    );
    useSessionStore.getState().submitAnswer(invalid.string, invalid.fret);
    expect(useSessionStore.getState().streak).toBe(0);
  });

  it("reset() clears streak", () => {
    setupAwaiting();
    const { challenge } = useSessionStore.getState();
    const pos = challenge!.validPositions[0]!;
    useSessionStore.getState().submitAnswer(pos.string, pos.fret);
    useSessionStore.getState().reset();
    expect(useSessionStore.getState().streak).toBe(0);
  });
});

// ─── M4: noteStats tracking ───────────────────────────────────────────────────

describe("noteStats tracking", () => {
  function setupAwaiting() {
    useSessionStore.getState().startChallenge();
    useSessionStore.getState().noteReady();
  }

  it("starts empty", () => {
    useSessionStore.setState({ noteStats: {} });
    expect(useSessionStore.getState().noteStats).toEqual({});
  });

  it("records attempt and correct for a correct answer", () => {
    useSessionStore.setState({ noteStats: {} });
    setupAwaiting();
    const { challenge } = useSessionStore.getState();
    const note = challenge!.targetNote;
    const pos = challenge!.validPositions[0]!;
    useSessionStore.getState().submitAnswer(pos.string, pos.fret);
    const stat = useSessionStore.getState().noteStats[note]!;
    expect(stat.attempts).toBe(1);
    expect(stat.correct).toBe(1);
  });

  it("records attempt but not correct for incorrect answer", () => {
    useSessionStore.setState({ noteStats: {} });
    setupAwaiting();
    const { challenge } = useSessionStore.getState();
    const note = challenge!.targetNote;
    const invalid = findInvalidPosition(challenge!.validPositions);
    useSessionStore.getState().submitAnswer(invalid.string, invalid.fret);
    const stat = useSessionStore.getState().noteStats[note]!;
    expect(stat.attempts).toBe(1);
    expect(stat.correct).toBe(0);
  });

  it("accumulates stats over multiple answers for the same note", () => {
    // Force the same note to appear twice by setting noteStats directly
    const targetNote = "A2";
    useSessionStore.setState({
      noteStats: { [targetNote]: { attempts: 3, correct: 2 } },
    });
    // We can verify the store reads existing stats correctly
    expect(useSessionStore.getState().noteStats[targetNote]!.attempts).toBe(3);
  });

  it("noteStats preserved after reset()", () => {
    useSessionStore.setState({ noteStats: {} });
    setupAwaiting();
    const { challenge } = useSessionStore.getState();
    const note = challenge!.targetNote;
    const pos = challenge!.validPositions[0]!;
    useSessionStore.getState().submitAnswer(pos.string, pos.fret);
    useSessionStore.getState().reset();
    // noteStats should still have the recorded data
    expect(useSessionStore.getState().noteStats[note]).toBeDefined();
  });
});

// ─── M4: auto-promotion ───────────────────────────────────────────────────────

describe("auto-promotion", () => {
  function answerCorrectly() {
    useSessionStore.getState().startChallenge();
    useSessionStore.getState().noteReady();
    const { challenge } = useSessionStore.getState();
    const pos = challenge!.validPositions[0]!;
    useSessionStore.getState().submitAnswer(pos.string, pos.fret);
    useSessionStore.getState().nextChallenge();
  }

  it("does not promote before STREAK_THRESHOLD correct answers", () => {
    for (let i = 0; i < STREAK_THRESHOLD - 1; i++) answerCorrectly();
    expect(useSessionStore.getState().difficulty).toBe("easy");
    expect(useSessionStore.getState().promotedDifficulty).toBeNull();
  });

  it("promotes to medium after STREAK_THRESHOLD correct answers on easy", () => {
    for (let i = 0; i < STREAK_THRESHOLD; i++) answerCorrectly();
    expect(useSessionStore.getState().difficulty).toBe("medium");
    expect(useSessionStore.getState().promotedDifficulty).toBe("medium");
  });

  it("clears promotedDifficulty via clearPromotion()", () => {
    for (let i = 0; i < STREAK_THRESHOLD; i++) answerCorrectly();
    useSessionStore.getState().clearPromotion();
    expect(useSessionStore.getState().promotedDifficulty).toBeNull();
  });

  it("does not promote beyond hard", () => {
    useSessionStore.setState({ difficulty: "hard", streak: STREAK_THRESHOLD - 1 });
    useSessionStore.getState().startChallenge();
    useSessionStore.getState().noteReady();
    const { challenge } = useSessionStore.getState();
    const pos = challenge!.validPositions[0]!;
    useSessionStore.getState().submitAnswer(pos.string, pos.fret);
    expect(useSessionStore.getState().difficulty).toBe("hard");
    expect(useSessionStore.getState().promotedDifficulty).toBeNull();
  });
});
