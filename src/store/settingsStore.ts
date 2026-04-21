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
 *
 *            When false (default): no visual hints — pure ear-to-fretboard training.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SettingsState {
  showRoot: boolean;
  setShowRoot: (v: boolean) => void;
  /** Number of challenges per session (default: 8) */
  sessionLength: number;
  setSessionLength: (n: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      showRoot: false,
      setShowRoot: (v) => set({ showRoot: v }),
      sessionLength: 8,
      setSessionLength: (n) => set({ sessionLength: n }),
    }),
    { name: "guitiq-settings" }
  )
);
