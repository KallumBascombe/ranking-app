"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

// -------------------------
// PEOPLE LIST
// -------------------------
const people = [
  "Kallum Bascombe",
  "Johnathan Brown",
  "Jamie Fisher",
  "Bogdan Constantin",
  "Andy Mcleod",
  "Sanjay Chudasama",
  "Alvin Roy",
  "Deano",
  "Joe Smith",
  "Bruno",
  "Juniel Sueta",
  "Steve Law",
  "Florian Pajour",
  "Tomasz TM",
  "Jo C",
  "Tom Hudson",
  "Tom Byfield",
  "Nippy",
  "Pete Fisher",
  "Colin Mitchell",
  "Liviu",
  "Graham Smith",
  "Neil Laybourne",
  "Sandra Hardwick",
  "Faye Kew",
  "Raghu",
  "Bryan Clark",
  "Matt Miller",
  "Dave Dyer",
  "Melvin Saunders",
  "Deb Fisher",
  "Andy Cannon",
  "Errol Williams",
  "David Redshaw",
  "Jemma-Louise Hart",
  "Jack Dealer",
  "Justin Reakes",
  "Ewan",
  "Martin Connolly",
  "Tim Bohane",
  "Telmo",
  "Victor Ribeiro",
  "Minnow",
  "Ryan Bascombe",
  "Barry Cobb",
  "Adam Bailey",
  "Ben Moody",
  "Jason Moody",
  "Emzy",
  "Darrell Rock",
  "Karin Willis",
  "Sean Quinn",
  "Matthew Bowden",
  "Lucky",
  "Derek Potter",
  "Weasel",
  "Spud",
  "Owner Adam",
  "John Watkins",
  "John Beard",
  "Alin",
  "Jamie Hall",
];

// -------------------------
// DEFAULT SAFE SCORES
// -------------------------
const createInitialScores = () => {
  const obj: Record<string, number> = {};
  people.forEach((p) => (obj[p] = 1000));
  return obj;
};

// -------------------------
// MAIN COMPONENT
// -------------------------
export default function Home() {
  const [currentPair, setCurrentPair] = useState<[string, string]>(["", ""]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPair, setLastPair] = useState("");
  const [scores, setScores] = useState<Record<string, number>>(createInitialScores());
  const [isLoading, setIsLoading] = useState(false);

  // -------------------------
  // LOAD SCORES (ROBUST)
  // -------------------------
  const loadScores = useCallback(async () => {
    try {
      const res = await fetch("/api/scores", { cache: "no-store" });
      const data = await res.json();

      console.log("📥 RAW SCORES FROM API:", data);

      if (!data || typeof data !== "object") return;

      const clean: Record<string, number> = {};

      for (const name of people) {
        const value = Number(data[name]);

        clean[name] = !isNaN(value) ? value : 1000;
      }

      setScores(clean);
    } catch (err) {
      console.error("Load error:", err);
    }
  }, []);

  // -------------------------
  // SAVE SCORES (SAFE)
  // -------------------------
  const saveScores = useCallback(async (updated: Record<string, number>) => {
    const safe: Record<string, number> = {};

    for (const name of people) {
      const v = Number(updated[name]);
      safe[name] = !isNaN(v) ? v : 1000;
    }

    console.log("📤 SAVING SCORES:", safe);

    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safe),
    });
  }, []);

  // -------------------------
  // POLLING
  // -------------------------
useEffect(() => {
  loadScores();

  const onFocus = () => loadScores();

  window.addEventListener("focus", onFocus);

  const interval = setInterval(loadScores, 8000);

  return () => {
    window.removeEventListener("focus", onFocus);
    clearInterval(interval);
  };
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

      const scoreA = scores[a] ?? 1000;

      const candidates = people
        .filter((p) => p !== a)
        .map((p) => ({
          name: p,
          diff: Math.abs((scores[p] ?? 1000) - scoreA),
        }))
        .sort((x, y) => x.diff - y.diff)
        .slice(0, 3);

      b = candidates[Math.floor(Math.random() * candidates.length)].name;

      key = [a, b].sort().join("-");
    } while (key === lastPair);

    return [a, b];
  }, [scores, lastPair]);

  // -------------------------
  // UPDATE SCORES
  // -------------------------
  const updateScores = (winner: string, loser: string) => {
    setScores((prev) => {
      const K = 32;

      const w = prev[winner] ?? 1000;
      const l = prev[loser] ?? 1000;

      const expectedW = 1 / (1 + Math.pow(10, (l - w) / 400));
      const expectedL = 1 - expectedW;

      const updated = {
        ...prev,
        [winner]: Math.round(w + K * (1 - expectedW)),
        [loser]: Math.round(l + K * (0 - expectedL)),
      };

      saveScores(updated);

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
  // INIT
  // -------------------------
  useEffect(() => {
    if (Object.keys(scores).length && !currentPair[0]) {
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