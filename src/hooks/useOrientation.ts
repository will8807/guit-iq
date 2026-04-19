"use client";

import { useState, useEffect } from "react";

export type FretboardLayout = "portrait" | "landscape";

/**
 * Returns the current device orientation as a FretboardLayout.
 * Listens to screen orientation changes so it updates automatically.
 * SSR-safe: defaults to "portrait" on the server.
 */
export function useOrientation(): FretboardLayout {
  const [layout, setLayout] = useState<FretboardLayout>("portrait");

  useEffect(() => {
    function getLayout(): FretboardLayout {
      // screen.orientation is more reliable on mobile than window.innerWidth
      if (typeof screen !== "undefined" && screen.orientation) {
        return screen.orientation.type.startsWith("landscape")
          ? "landscape"
          : "portrait";
      }
      return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
    }

    setLayout(getLayout());

    function handleChange() {
      setLayout(getLayout());
    }

    if (typeof screen !== "undefined" && screen.orientation) {
      screen.orientation.addEventListener("change", handleChange);
      return () => screen.orientation.removeEventListener("change", handleChange);
    } else {
      window.addEventListener("resize", handleChange);
      return () => window.removeEventListener("resize", handleChange);
    }
  }, []);

  return layout;
}
