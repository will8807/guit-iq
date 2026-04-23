/**
 * store/settingsStore.ts
 *
 * Persisted user-preference store.
 *
 * showRoot — when true, the root note / target position is highlighted on the
 *            fretboard before the user answers, providing a visual anchor.
 *            - "find-the-note": highlights all valid fret positions for the target note
 *            - "find-the-interval": highlights the root note positions and shows the
 *              interval name in the prompt; the user only needs to tap the second note
 *            - "find-the-chord": highlights root positions and shows chord label
 *
 *            When false (default): no visual hints — pure ear-to-fretboard training.
 *
 * intervalMix — fraction of session challenges that are "Find the Interval"   (0–1, default 0.33)
 * chordMix    — fraction of session challenges that are "Find the Chord"       (0–1, default 0.33)
 * findAllMix  — fraction of session challenges that are "Find All Positions"   (0–1, default 0)
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SettingsState {
  showRoot: boolean;
  setShowRoot: (v: boolean) => void;
  /** Number of challenges per session (default: 8) */
  sessionLength: number;
  setSessionLength: (n: number) => void;
  /** Fraction of session that is interval challenges (0–1, default 0.33) */
  intervalMix: number;
  setIntervalMix: (v: number) => void;
  /** Fraction of session that is chord challenges (0–1, default 0.33) */
  chordMix: number;
  setChordMix: (v: number) => void;
  /** Fraction of session that is find-all-positions challenges (0–1, default 0) */
  findAllMix: number;
  setFindAllMix: (v: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      showRoot: false,
      setShowRoot: (v) => set({ showRoot: v }),
      sessionLength: 8,
      setSessionLength: (n) => set({ sessionLength: n }),
      intervalMix: 0.33,
      setIntervalMix: (v) => set({ intervalMix: Math.min(1, Math.max(0, v)) }),
      chordMix: 0.33,
      setChordMix: (v) => set({ chordMix: Math.min(1, Math.max(0, v)) }),
      findAllMix: 0,
      setFindAllMix: (v) => set({ findAllMix: Math.min(1, Math.max(0, v)) }),
    }),
    { name: "guitiq-settings" }
  )
);
