// Interval definitions for Find The Interval challenge
// Export interval sets and helpers by difficulty

export type Interval = {
  name: string
  semitones: number
}

export const INTERVALS: Record<string, Interval> = {
  "m2": { name: "minor 2nd", semitones: 1 },
  "M2": { name: "major 2nd", semitones: 2 },
  "m3": { name: "minor 3rd", semitones: 3 },
  "M3": { name: "major 3rd", semitones: 4 },
  "P4": { name: "perfect 4th", semitones: 5 },
  "TT": { name: "tritone", semitones: 6 },
  "P5": { name: "perfect 5th", semitones: 7 },
  "m6": { name: "minor 6th", semitones: 8 },
  "M6": { name: "major 6th", semitones: 9 },
  "m7": { name: "minor 7th", semitones: 10 },
  "M7": { name: "major 7th", semitones: 11 },
  "P8": { name: "octave", semitones: 12 }
}

// Pools per difficulty — choose safer/large intervals for easy, add smaller/ambiguous for harder
export const INTERVAL_POOL: Record<string, string[]> = {
  easy: ["P4", "P5", "P8"],
  medium: ["M3", "m3", "P4", "P5", "P8"],
  hard: ["M2", "m2", "M3", "m3", "TT", "P4", "P5", "m6", "M6"]
}

export type IntervalWithKey = Interval & { key: string }

export function getIntervalByKey(key: string): Interval | undefined {
  return INTERVALS[key]
}

export function pickIntervalForDifficulty(difficulty: string, rand = Math.random): IntervalWithKey {
  const maybe = INTERVAL_POOL[difficulty]
  const pool = (maybe ?? INTERVAL_POOL.medium) as string[]
  // pool is guaranteed now; pick a random key from the pool
  const idx = Math.floor(rand() * pool.length)
  const key = pool[idx]
  const interval = INTERVALS[key as keyof typeof INTERVALS]
  if (!interval) {
    // fallback to a known interval (perfect 5th)
    return { ...INTERVALS["P5"]!, key: "P5" }
  }
  return { ...interval, key: key! }
}
