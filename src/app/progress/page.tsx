"use client";

import Link from "next/link";
import { useProgressStore } from "@/store/progressStore";

export default function ProgressPage() {
  const {
    currentStreak,
    bestStreak,
    totalSessions,
    accuracyByType,
    sessions,
    clearProgress,
  } = useProgressStore();

  const overallCorrect = Object.values(accuracyByType).reduce(
    (sum, r) => sum + r.correct,
    0
  );
  const overallTotal = Object.values(accuracyByType).reduce(
    (sum, r) => sum + r.total,
    0
  );
  const overallAccuracy =
    overallTotal > 0 ? Math.round((overallCorrect / overallTotal) * 100) : null;

  const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

  function handleClear() {
    if (confirm("Clear all progress? This cannot be undone.")) {
      clearProgress();
    }
  }

  return (
    <main className="min-h-screen bg-[#100c06] text-white flex flex-col items-center gap-8 p-6 pt-10">
      <div className="flex items-center justify-between w-full max-w-sm">
        <Link href="/" className="text-zinc-400 hover:text-white text-sm">
          ← Home
        </Link>
        <h1 className="text-2xl font-bold">Progress</h1>
        <Link href="/settings" className="text-zinc-400 hover:text-white text-sm">
          Settings
        </Link>
      </div>

      {/* Streak + Sessions */}
      <section className="grid grid-cols-2 gap-4 w-full max-w-sm" aria-label="Streak stats">
        <StatCard label="Current Streak" value={currentStreak > 0 ? `${currentStreak} 🔥` : "—"} testId="stat-streak" />
        <StatCard label="Best Streak" value={bestStreak > 0 ? `${bestStreak}` : "—"} testId="stat-best-streak" />
        <StatCard label="Total Sessions" value={String(totalSessions)} testId="stat-total-sessions" />
        <StatCard
          label="Overall Accuracy"
          value={overallAccuracy !== null ? `${overallAccuracy}%` : "—"}
          testId="stat-accuracy"
        />
      </section>

      {/* Last session */}
      {lastSession && (
        <section className="w-full max-w-sm bg-zinc-800 rounded-xl p-4 flex flex-col gap-1">
          <p className="text-xs text-zinc-400 uppercase tracking-wide">Last Session</p>
          <p className="text-lg font-semibold">
            {lastSession.correct} / {lastSession.total} correct
            <span className="text-zinc-400 font-normal text-sm ml-2">
              ({Math.round(lastSession.accuracy * 100)}%)
            </span>
          </p>
          <p className="text-xs text-zinc-500">{lastSession.date}</p>
        </section>
      )}

      {/* Accuracy by type */}
      {Object.keys(accuracyByType).length > 0 && (
        <section className="w-full max-w-sm flex flex-col gap-3" aria-label="Accuracy by challenge type">
          <p className="text-xs text-zinc-400 uppercase tracking-wide">By Challenge Type</p>
          {Object.entries(accuracyByType).map(([type, rec]) => {
            const pct = rec.total > 0 ? Math.round((rec.correct / rec.total) * 100) : 0;
            const label = type === "find-the-note" ? "Find the Note" : "Find the Interval";
            return (
              <div key={type} className="bg-zinc-800 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm text-zinc-300">{pct}%</span>
                </div>
                <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rust-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${label} accuracy ${pct}%`}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {rec.correct} / {rec.total} correct
                </p>
              </div>
            );
          })}
        </section>
      )}

      {totalSessions === 0 && (
        <p className="text-zinc-500 text-center text-sm mt-4">
          No sessions yet. Start training to see your progress!
        </p>
      )}

      {/* Actions */}
      <div className="w-full max-w-sm flex flex-col gap-3 mt-auto pt-4">
        <Link
          href="/session"
          className="w-full text-center py-4 bg-rust-500 hover:bg-rust-400 active:bg-rust-600 rounded-full font-bold text-lg text-white transition-colors shadow-lg shadow-rust-700/40"
        >
          Start Session
        </Link>
        {totalSessions > 0 && (
          <button
            onClick={handleClear}
            className="w-full py-3 text-sm text-zinc-400 hover:text-red-400 transition-colors"
          >
            Clear all progress
          </button>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="bg-zinc-800 rounded-xl p-4 flex flex-col gap-1">
      <p className="text-xs text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold" data-testid={testId}>{value}</p>
    </div>
  );
}


