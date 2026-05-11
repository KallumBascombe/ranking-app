"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Player = {
  name: string;
  rating: number;
  games: number;
};

export default function LeaderboardPage() {
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [scores, setScores] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const correctPassword = "admin123";
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  function handleLogin() {
    if (password === correctPassword) {
      setIsAuthorized(true);
    } else {
      alert("Wrong password");
    }
  }

  // -------------------------
  // NORMALISE DATA SAFELY
  // -------------------------
  const normalizeScores = (data: Record<string, any>): Player[] => {
    return Object.entries(data)
      .map(([name, value]) => {
        if (typeof value === "number") {
          return {
            name,
            rating: value,
            games: 0,
          };
        }

        if (value && typeof value === "object") {
          return {
            name,
            rating: Number(value.rating ?? 1000),
            games: Number(value.games ?? 0),
          };
        }

        return {
          name,
          rating: 1000,
          games: 0,
        };
      })
      .filter((p) => !isNaN(p.rating));
  };

  // -------------------------
  // FETCH SCORES
  // -------------------------
  const loadScores = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(`/api/scores?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      const data = await res.json();

      if (!data || typeof data !== "object") {
        setScores({});
        return;
      }

      setScores(data);
    } catch (err) {
      console.error("Failed to load scores:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // -------------------------
  // AUTO REFRESH
  // -------------------------
  useEffect(() => {
    if (!isAuthorized) return;

    loadScores();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      loadScores();
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthorized, loadScores]);

  // -------------------------
  // SORTED LEADERBOARD
  // -------------------------
  const leaderboard = normalizeScores(scores).sort(
    (a, b) => b.rating - a.rating
  );

  // -------------------------
  // LOGIN SCREEN
  // -------------------------
  if (!isAuthorized) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 pt-12">
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

  // -------------------------
  // UI
  // -------------------------
  return (
    <main className="min-h-screen flex flex-col items-center p-6 pt-12">

      {/* HEADER */}
      <h1 className="text-2xl font-bold mb-2">
        Leaderboard
      </h1>

      <div className="text-xs text-gray-400 mb-4">
        {loading ? "Refreshing..." : "Live"}
      </div>

      <button
        onClick={loadScores}
        className="text-sm underline text-blue-600 mb-6"
      >
        Refresh
      </button>

      {/* -------------------------
          SCROLL CONTAINER FIX
      ------------------------- */}
      <div className="w-full max-w-md max-h-[70vh] overflow-y-auto space-y-2">

        {leaderboard.length === 0 && (
          <p className="text-sm text-gray-400">
            No players found
          </p>
        )}

        {leaderboard.map((player) => (
          <div
            key={player.name}
            className="flex justify-between border-b py-2"
          >
            <div className="flex flex-col">
              <span className="font-medium">
                {player.name}
              </span>

              <span className="text-xs text-gray-400">
                {player.games} games
              </span>
            </div>

            <span className="font-bold">
              {player.rating}
            </span>
          </div>
        ))}
      </div>

    </main>
  );
}