"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";

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
// TYPES
// -------------------------
type Match = {
  winner: string;
  loser: string;
  time: number;
};

// -------------------------
// MAIN COMPONENT
// -------------------------
export default function Home() {
  const [currentPair, setCurrentPair] = useState<[string, string]>(["", ""]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<Match[]>([]);

  const lastVoteRef = useRef<null | {
    prevScores: Record<string, number>;
  }>(null);

  // -------------------------
  // LOAD SCORES (Cosmos is source of truth)
  // -------------------------
  const loadScores = useCallback(async () => {
    try {
      const res = await fetch("/api/scores", { cache: "no-store" });
      const data = await res.json();

      if (data && typeof data === "object") {
        setScores(data);
      }
    } catch (err) {
      console.error("Load error:", err);
    }
  }, []);

  // -------------------------
  // RANDOM PAIR
  // -------------------------
  const getRandomPair = useCallback((): [string, string] => {
    const a = people[Math.floor(Math.random() * people.length)];
    const b = people[Math.floor(Math.random() * people.length)];
    if (a === b) return getRandomPair();
    return [a, b];
  }, []);

  // -------------------------
  // UPDATE SCORES (SERVER AUTHORITY)
  // -------------------------
  const updateScores = async (winner: string, loser: string) => {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winner, loser }),
    });

    const data = await res.json();

    if (data?.scores) {
      setScores(data.scores);
    }
  };

  // -------------------------
  // NEXT ROUND
  // -------------------------
  const nextRound = async (chosen: string) => {
    if (isLoading) return;

    setIsLoading(true);

    const [a, b] = currentPair;
    const winner = chosen;
    const loser = chosen === a ? b : a;

    // store undo snapshot locally (still useful UX)
    lastVoteRef.current = { prevScores: scores };

    setHistory((h) => [
      { winner, loser, time: Date.now() },
      ...h.slice(0, 9),
    ]);

    await updateScores(winner, loser);

    setTimeout(() => {
      setCurrentPair(getRandomPair());
      setIsLoading(false);
    }, 150);
  };

  // -------------------------
  // UNDO (frontend rollback only)
  // -------------------------
  const undoLastVote = async () => {
    if (!lastVoteRef.current) return;

    const { prevScores } = lastVoteRef.current;

    setScores(prevScores);

    // NOTE: not persisting undo yet (we'll upgrade in next step if you want)
    lastVoteRef.current = null;

    setHistory((h) => h.slice(1));
  };

  // -------------------------
  // INIT
  // -------------------------
  useEffect(() => {
    loadScores();
  }, [loadScores]);

  useEffect(() => {
    if (Object.keys(scores).length > 0 && currentPair[0] === "") {
      setCurrentPair(getRandomPair());
    }
  }, [scores, currentPair, getRandomPair]);

  // -------------------------
  // UI
  // -------------------------
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">

      <h1 className="text-2xl font-bold mb-6">
        Who ranks higher?
      </h1>

      <div className="w-full max-w-md flex flex-col gap-6 items-center">

        <h2 className="text-sm text-gray-500">
          Pick who ranks higher
        </h2>

        <button
          onClick={() => nextRound(currentPair[0])}
          disabled={isLoading}
          className="w-full py-10 px-6 bg-white border rounded-2xl shadow-sm text-2xl font-semibold hover:shadow-lg active:scale-[0.98] transition"
        >
          {currentPair[0]}
        </button>

        <div className="text-gray-400 font-medium">VS</div>

        <button
          onClick={() => nextRound(currentPair[1])}
          disabled={isLoading}
          className="w-full py-10 px-6 bg-white border rounded-2xl shadow-sm text-2xl font-semibold hover:shadow-lg active:scale-[0.98] transition"
        >
          {currentPair[1]}
        </button>

        {isLoading && (
          <div className="text-sm text-blue-500 animate-pulse">
            Updating rankings...
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={undoLastVote}
            className="text-sm text-gray-600 underline"
          >
            Undo
          </button>

          <Link href="/leaderboard" className="text-sm text-blue-600 underline">
            Leaderboard
          </Link>
        </div>
      </div>

      <div className="w-full max-w-md mt-10">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Recent matches
        </h3>

        <div className="bg-white border rounded-xl p-3 space-y-2">
          {history.length === 0 && (
            <p className="text-sm text-gray-400">No matches yet</p>
          )}

          {history.map((m, i) => (
            <div key={i} className="text-sm flex justify-between text-gray-600">
              <span>
                <b>{m.winner}</b> beat {m.loser}
              </span>
              <span>{new Date(m.time).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>

    </main>
  );
}