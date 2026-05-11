"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";

// -------------------------
// PEOPLE LIST
// -------------------------
const people: string[] = [/* your full list unchanged */];

// -------------------------
// TYPES
// -------------------------
type Player = {
  rating: number;
  games: number;
  streak?: number;
};

type Match = {
  winner: string;
  loser: string;
  timestamp: number;
};

// -------------------------
// BADGES (NO EMOJIS HERE ANYMORE)
// -------------------------
const getBadge = (player: Player) => {
  if (player.rating >= 1700) return "ELITE";
  if (player.games >= 50) return "GRINDER";
  return "";
};

// -------------------------
// STREAK DISPLAY (STRICT RULES)
// -------------------------
const StreakIndicator = ({ streak = 0 }: { streak?: number }) => {
  if (!streak || streak < 3) return null;

  const intensity =
    streak >= 10 ? "bg-red-500"
    : streak >= 6 ? "bg-orange-500"
    : "bg-yellow-500";

  return (
    <div className="flex items-center gap-1 mt-2">
      {Array.from({ length: Math.min(streak, 8) }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-sm ${intensity}`}
        />
      ))}
      <span className="text-xs text-zinc-400 ml-2">
        {streak} win streak
      </span>
    </div>
  );
};

// -------------------------
// VERBS
// -------------------------
const verbs = ["crushed", "destroyed", "obliterated", "ruined", "demolished"];
const getVerb = () => verbs[Math.floor(Math.random() * verbs.length)];

// -------------------------
// MAIN
// -------------------------
export default function Home() {
  const [currentPair, setCurrentPair] = useState<[string, string]>(["", ""]);
  const [scores, setScores] = useState<Record<string, Player>>({});
  const [history, setHistory] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastDelta, setLastDelta] = useState<number | null>(null);

  const mountedRef = useRef(true);

  // -------------------------
  // LOAD
  // -------------------------
  const loadScores = useCallback(async () => {
    const res = await fetch("/api/scores", { cache: "no-store" });
    const data = await res.json();
    if (mountedRef.current) setScores(data || {});
  }, []);

  const loadHistory = useCallback(async () => {
    const res = await fetch(`/api/matches?t=${Date.now()}`);
    const data = await res.json();
    if (mountedRef.current && Array.isArray(data)) setHistory(data);
  }, []);

  // -------------------------
  // HELPERS
  // -------------------------
  const getRating = (name: string) =>
    scores?.[name]?.rating ?? 1000;

  const getPlayer = (name: string): Player =>
    scores?.[name] ?? { rating: 1000, games: 0, streak: 0 };

  const getPair = (): [string, string] => {
    let a = people[Math.floor(Math.random() * people.length)];
    let b = people[Math.floor(Math.random() * people.length)];

    while (a === b) {
      b = people[Math.floor(Math.random() * people.length)];
    }

    return [a, b];
  };

  // -------------------------
  // UPDATE
  // -------------------------
  const updateScores = async (winner: string, loser: string) => {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winner, loser }),
    });

    return res.json();
  };

  // -------------------------
  // VOTE
  // -------------------------
  const nextRound = async (chosen: string) => {
    if (isLoading) return;

    setIsLoading(true);

    const [a, b] = currentPair;
    const winner = chosen;
    const loser = chosen === a ? b : a;

    const next = getPair();
    setCurrentPair(next);

    try {
      const data = await updateScores(winner, loser);

      setLastDelta(data?.result?.winnerChange ?? null);
      await loadHistory();
    } finally {
      setIsLoading(false);
      setTimeout(() => setLastDelta(null), 1200);
    }
  };

  // -------------------------
  // INIT
  // -------------------------
  useEffect(() => {
    mountedRef.current = true;

    loadScores();
    loadHistory();

    const interval = setInterval(loadHistory, 4000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [loadScores, loadHistory]);

  useEffect(() => {
    if (scores && currentPair[0] === "") {
      setCurrentPair(getPair());
    }
  }, [scores]);

  // -------------------------
  // UI
  // -------------------------
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center px-4 py-10">

      <div className="w-full max-w-2xl flex justify-between mb-8">
        <h1 className="text-2xl font-bold">🎰 Poker Arena</h1>

        <Link href="/leaderboard" className="bg-purple-600 px-4 py-2 rounded-lg">
          Leaderboard
        </Link>
      </div>

      <div className="w-full max-w-2xl bg-zinc-900 rounded-2xl p-6 space-y-6">

        <p className="text-zinc-400 text-sm">
          Pick who wins — live ELO battle system
        </p>

        {/* PLAYER A */}
        <button
          onClick={() => nextRound(currentPair[0])}
          disabled={isLoading}
          className="w-full bg-zinc-800 p-6 rounded-xl text-left"
        >
          <div className="text-xl font-bold">
            {currentPair[0]}{" "}
            <span className="text-xs text-zinc-400">
              {getBadge(getPlayer(currentPair[0]))}
            </span>
          </div>

          <div className="text-sm text-zinc-400">
            ELO: {getRating(currentPair[0])}
          </div>

          <StreakIndicator streak={getPlayer(currentPair[0]).streak} />
        </button>

        <div className="text-center text-zinc-500">VS</div>

        {/* PLAYER B */}
        <button
          onClick={() => nextRound(currentPair[1])}
          disabled={isLoading}
          className="w-full bg-zinc-800 p-6 rounded-xl text-left"
        >
          <div className="text-xl font-bold">
            {currentPair[1]}{" "}
            <span className="text-xs text-zinc-400">
              {getBadge(getPlayer(currentPair[1]))}
            </span>
          </div>

          <div className="text-sm text-zinc-400">
            ELO: {getRating(currentPair[1])}
          </div>

          <StreakIndicator streak={getPlayer(currentPair[1]).streak} />
        </button>

        {lastDelta !== null && (
          <div className="text-green-400 text-sm animate-pulse">
            +{lastDelta} ELO gained 🔥
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl mt-8">
        <h3 className="text-sm text-zinc-400 mb-2">Live arena feed</h3>

        <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
          {history.map((m, i) => (
            <div key={i} className="text-sm text-zinc-300">
              🔥 <b>{m.winner}</b> {getVerb()} {m.loser}
            </div>
          ))}
        </div>
      </div>

    </main>
  );
}