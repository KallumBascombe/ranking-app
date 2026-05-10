"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

const people = [
  "Sarah Mitchell",
  "James Carter",
  "Emily Johnson",
  "Daniel Brown",
  "Sophia Wilson",
  "Michael Lee",
];

const initialScores = people.reduce((acc, person) => {
  acc[person] = 1000;
  return acc;
}, {} as Record<string, number>);

export default function Home() {
  const [currentPair, setCurrentPair] = useState<[string, string]>(["", ""]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPair, setLastPair] = useState<string>("");
  const [scores, setScores] = useState<Record<string, number>>(initialScores);
  const [isLoading, setIsLoading] = useState(false);

  // -------------------------
  // LOAD SCORES
  // -------------------------
  const loadScores = useCallback(async () => {
    try {
      const res = await fetch("/api/scores", { cache: "no-store" });
      const data = await res.json();

      if (data && Object.keys(data).length > 0) {
        setScores(data);
      }
    } catch (err) {
      console.error("Load error:", err);
    }
  }, []);

  // -------------------------
  // SAVE SCORES
  // -------------------------
  const saveScores = useCallback(async (updated: Record<string, number>) => {
    try {
      await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error("Save error:", err);
    }
  }, []);

  // -------------------------
  // REAL-TIME POLLING 🔁
  // -------------------------
  useEffect(() => {
    loadScores(); // initial load

    const interval = setInterval(() => {
      loadScores();
    }, 3000); // every 3 seconds

    return () => clearInterval(interval);
  }, [loadScores]);

  // -------------------------
  // PAIR GENERATION
  // -------------------------
  const getRandomPair = useCallback((): [string, string] => {
    let a = "";
    let b = "";
    let key = "";

    do {
      a = people[Math.floor(Math.random() * people.length)];

      const scoreA = scores[a];

      const candidates = people
        .filter((p) => p !== a)
        .map((p) => ({
          name: p,
          diff: Math.abs(scores[p] - scoreA),
        }))
        .sort((x, y) => x.diff - y.diff);

      const top = candidates.slice(0, 3);
      b = top[Math.floor(Math.random() * top.length)].name;

      key = [a, b].sort().join("-");
    } while (key === lastPair);

    return [a, b];
  }, [scores, lastPair]);

  // -------------------------
  // SCORE UPDATE
  // -------------------------
  const updateScores = (winner: string, loser: string) => {
    setScores((prev) => {
      const K = 32;

      const w = prev[winner];
      const l = prev[loser];

      const expectedW =
        1 / (1 + Math.pow(10, (l - w) / 400));

      const expectedL = 1 - expectedW;

      const updated = {
        ...prev,
        [winner]: Math.round(w + K * (1 - expectedW)),
        [loser]: Math.round(l + K * (0 - expectedL)),
      };

      saveScores(updated); // persist immediately
      return updated;
    });
  };

  // -------------------------
  // GAME FLOW
  // -------------------------
  const nextRound = (chosen: string) => {
    if (isLoading) return;

    setIsLoading(true);

    const [a, b] = currentPair;
    const winner = chosen;
    const loser = chosen === a ? b : a;

    updateScores(winner, loser);
    setLastPair([a, b].sort().join("-"));

    setTimeout(() => {
      setCurrentPair(getRandomPair());
      setIsLoading(false);
    }, 200);
  };

  // -------------------------
  // INIT PAIR
  // -------------------------
  useEffect(() => {
    if (Object.keys(scores).length > 0 && currentPair[0] === "") {
      setCurrentPair(getRandomPair());
    }
  }, [scores, currentPair, getRandomPair]);

  // -------------------------
  // UI
  // -------------------------
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">

      <h1 className="text-2xl font-bold mb-10 text-gray-800">
        Who ranks higher?
      </h1>

      {/* MENU */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-2xl font-bold"
        >
          ☰
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg p-3 z-50">
            <Link
              href="/leaderboard"
              className="block py-2 hover:text-blue-600"
              onClick={() => setMenuOpen(false)}
            >
              View Leaderboard
            </Link>
          </div>
        )}
      </div>

      {/* GAME */}
      <div className="w-full max-w-md flex flex-col gap-6">

        {isLoading && (
          <div className="text-sm text-blue-500 text-center">
            Calculating result...
          </div>
        )}

        <button
          onClick={() => nextRound(currentPair[0])}
          disabled={isLoading}
          className="w-full p-6 bg-white border rounded-xl shadow-sm text-lg font-medium"
        >
          {currentPair[0]}
        </button>

        <button
          onClick={() => nextRound(currentPair[1])}
          disabled={isLoading}
          className="w-full p-6 bg-white border rounded-xl shadow-sm text-lg font-medium"
        >
          {currentPair[1]}
        </button>

      </div>
    </main>
  );
}