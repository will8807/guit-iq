"use client";

/**
 * hooks/usePitchDetector.ts
 *
 * Continuously detects the pitch from the device microphone using the Web Audio API.
 * Uses an autocorrelation algorithm (Yin-inspired) to find the fundamental frequency.
 *
 * Returns:
 *   - pitch: PitchInfo | null  — null when no clear pitch detected or mic is off
 *   - isListening: boolean     — true while the mic is active
 *   - start(): void            — request mic access and begin detection
 *   - stop(): void             — stop and release the mic
 *   - error: string | null     — set if getUserMedia was denied or unavailable
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzePitch, type PitchInfo } from "@/lib/music/tuner";

// ─── Autocorrelation pitch detector ──────────────────────────────────────────

/**
 * Fast autocorrelation pitch detection.
 * Returns the fundamental frequency in Hz, or -1 if no confident pitch found.
 *
 * Based on Philip McLeod & Geoff Wyvill's "A Smarter Way to Find Pitch" /
 * the commonly referenced browser autocorrelation approach by Chris Wilson.
 */
function detectPitch(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);

  // RMS silence gate — skip if signal is too quiet
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i] ?? 0;
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  // Autocorrelation
  const correlations = new Float32Array(MAX_SAMPLES);
  for (let lag = 0; lag < MAX_SAMPLES; lag++) {
    let sum = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      sum += (buffer[i] ?? 0) * (buffer[i + lag] ?? 0);
    }
    correlations[lag] = sum;
  }

  // Find first dip then the highest peak after it
  // (skip the trivial zero-lag peak)
  let d = 1;
  while (d < MAX_SAMPLES && (correlations[d] ?? 0) > (correlations[d - 1] ?? 0)) d++;

  let maxVal = -Infinity;
  let maxPos = -1;
  for (let i = d; i < MAX_SAMPLES; i++) {
    const c = correlations[i] ?? 0;
    if (c > maxVal) {
      maxVal = c;
      maxPos = i;
    }
  }

  if (maxPos === -1) return -1;

  // Confidence check: peak must be > 50% of the zero-lag autocorrelation
  if (maxVal < 0.5 * (correlations[0] ?? 1)) return -1;

  // Sub-sample interpolation for better accuracy
  const prev = correlations[maxPos - 1] ?? 0;
  const cur = correlations[maxPos] ?? 0;
  const next = correlations[maxPos + 1] ?? 0;
  const refined = maxPos + (next - prev) / (2 * (2 * cur - prev - next));

  return sampleRate / refined;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UsePitchDetectorResult {
  pitch: PitchInfo | null;
  isListening: boolean;
  start: () => Promise<void>;
  stop: () => void;
  error: string | null;
}

const FFT_SIZE = 4096; // ~93 ms window at 44.1 kHz — good low-frequency resolution

export function usePitchDetector(): UsePitchDetectorResult {
  const [pitch, setPitch] = useState<PitchInfo | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(FFT_SIZE) as Float32Array<ArrayBuffer>);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    setPitch(null);
    setIsListening(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);

      // Detection loop — runs on every animation frame
      function tick() {
        const analyserNode = analyserRef.current;
        if (!analyserNode) return;
        analyserNode.getFloatTimeDomainData(bufferRef.current);
        const freq = detectPitch(bufferRef.current, ctx.sampleRate);
        const info = freq > 0 ? analyzePitch(freq) : null;
        setPitch(info);
        rafRef.current = requestAnimationFrame(tick);
      }
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.name === "NotAllowedError"
            ? "Microphone access denied. Please allow mic access and try again."
            : err.message
          : "Could not access microphone.";
      setError(message);
      setIsListening(false);
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { pitch, isListening, start, stop, error };
}
