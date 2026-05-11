"use client";

import { useEffect, useState, useCallback } from "react";

export default function LeaderboardPage() {
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const correctPassword = "admin123";

  // -------------------------
  // LOGIN
  // -------------------------
  function handleLogin() {
    if (password === correctPassword) {
      setIsAuthorized(true);
    } else {
      alert("Wrong password");
    }
  }

  // -------------------------
  // SAFE LOAD SCORES (IMPORTANT FIX)
  // -------------------------
  const loadScores = useCallback(async () => {
    try {
      const res = await fetch("/api/scores", { cache: "no-store" });
      const data = await res.json();

      console.log("RAW LEADERBOARD DATA:", data);

      // 🚨 SANITISE RESPONSE (CRITICAL FIX)
      if (!data || typeof data !== "object") return;

      const clean: Record<string, number> = {};

      for (const [key, value] of Object.entries(data)) {
        const num = Number(value);

        if (!isNaN(num)) {
          clean[key] = num;
        }
      }

      setScores(clean);
    } catch (err) {
      console.error("Failed to load scores:", err);
    }
  }, []);

  // -------------------------
  // REAL-TIME POLLING
  // -------------------------
  useEffect(() => {
    if (!isAuthorized) return;

    loadScores();

    const interval = setInterval(() => {
      loadScores();
    }, 3000);

    return () => clearInterval(interval);
  }, [isAuthorized, loadScores]);

  // -------------------------
  // LOGIN SCREEN
  // -------------------------
  if (!isAuthorized) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">

        <h1 className="text-2xl font-bold mb-6">
          Leaderboard Login
        </h1>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="border p-3 rounded mb-4 w-64"
        />

        <button
          onClick={handleLogin}
          className="bg-black text-white px-6 py-3 rounded"
        >
          Enter
        </button>

      </main>
    );
  }

{/* DEPLOY TEST */}
<p className="text-xs text-gray-400">
  deploy test 2026-05-11
</p>

  // -------------------------
  // LEADERBOARD
  // -------------------------
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">

      <h1 className="text-2xl font-bold mb-6">
        Leaderboard
      </h1>

      <div className="space-y-2 w-full max-w-md">
        {Object.entries(scores)
          .sort((a, b) => b[1] - a[1])
          .map(([name, score]) => (
            <div
              key={name}
              className="flex justify-between border-b py-2"
            >
              <span>{name}</span>
              <span>{score}</span>
            </div>
          ))}
      </div>

    </main>
  );
}