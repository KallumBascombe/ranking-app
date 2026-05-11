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
  timestamp: number;
};

type Snapshot = {
  prevScores: Record<string, number>;
  prevPair: [string, string];
};

// -------------------------
// MAIN COMPONENT
// -------------------------
export default function Home() {
  const [currentPair, setCurrentPair] = useState<[string, string]>(["", ""]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<Match[]>([]);

  const lastVoteRef = useRef<Snapshot | null>(null);

  // -------------------------
  // LOAD SCORES
  // -------------------------
  const loadScores = useCallback(async () => {
    try {
      const res = await fetch("/api/scores", {
        cache: "no-store",
      });

      const data = await res.json();

      if (data && typeof data === "object") {
        setScores(data);
      }
    } catch (err) {
      console.error("Load scores error:", err);
    }
  }, []);

  // -------------------------
  // LOAD SHARED MATCH HISTORY
  // -------------------------
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches?t=${Date.now()}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (Array.isArray(data)) {
        setHistory(data);
      }
    } catch (err) {
      console.error("Load history error:", err);
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
  // UPDATE SCORES
  // -------------------------
  const updateScores = async (winner: string, loser: string) => {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ winner, loser }),
    });

    const data = await res.json();

    if (data?.scores) {
      setScores(data.scores);
    }

    await loadHistory();
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

    lastVoteRef.current = {
      prevScores: scores,
      prevPair: currentPair,
    };

    await updateScores(winner, loser);

    setTimeout(() => {
      setCurrentPair(getRandomPair());
      setIsLoading(false);
    }, 150);
  };

  // -------------------------
  // UNDO
  // -------------------------
  const undoLastVote = () => {
    if (!lastVoteRef.current) return;

    const snapshot = lastVoteRef.current;

    setScores(snapshot.prevScores);
    setCurrentPair(snapshot.prevPair);

    lastVoteRef.current = null;
  };

  // -------------------------
  // INIT
  // -------------------------
  useEffect(() => {
    loadScores();
    loadHistory();

    const interval = setInterval(() => {
      loadHistory();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadScores, loadHistory]);

  useEffect(() => {
    if (Object.keys(scores).length > 0 && currentPair[0] === "") {
      setCurrentPair(getRandomPair());
    }
  }, [scores, currentPair, getRandomPair]);

  // -------------------------
  // UI
  // -------------------------
  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center px-4 py-10">
      {/* HEADER */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">
          Poker player ranking
        </h1>

        <Link
          href="/leaderboard"
          className="text-sm bg-black text-white px-4 py-2 rounded-lg shadow"
        >
          Leaderboard
        </Link>
      </div>

      {/* GAME CARD */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-8">
        <p className="text-gray-500 text-sm">
          Please choose the better poker player based on their overall skill
        </p>

        <button
          onClick={() => nextRound(currentPair[0])}
          disabled={isLoading}
          className="w-full py-16 px-6 bg-gray-50 border rounded-2xl text-3xl font-semibold hover:bg-gray-100 active:scale-[0.98] transition"
        >
          {currentPair[0]}
        </button>

        <div className="text-gray-400 font-bold text-lg tracking-widest">
          VS
        </div>

        <button
          onClick={() => nextRound(currentPair[1])}
          disabled={isLoading}
          className="w-full py-16 px-6 bg-gray-50 border rounded-2xl text-3xl font-semibold hover:bg-gray-100 active:scale-[0.98] transition"
        >
          {currentPair[1]}
        </button>

        {isLoading && (
          <p className="text-sm text-blue-500 animate-pulse">
            Updating rankings...
          </p>
        )}

        <div className="flex gap-6 mt-2">
          <button
            onClick={undoLastVote}
            className="text-sm text-gray-600 hover:text-black underline"
          >
            Undo last vote
          </button>
        </div>
      </div>

      {/* RECENT MATCHES */}
      <div className="w-full max-w-2xl mt-10">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Live recent matches
        </h3>

        <div className="bg-white rounded-xl shadow p-4 space-y-2">
          {history.length === 0 && (
            <p className="text-sm text-gray-400">
              No matches yet
            </p>
          )}

          {history.map((m, i) => (
            <div
              key={i}
              className="flex justify-between text-sm text-gray-600"
            >
              <span>
                <b>{m.winner}</b> beat {m.loser}
              </span>

              <span>
                {new Date(m.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}