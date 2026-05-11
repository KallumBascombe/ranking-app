"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// -------------------------
// PEOPLE LIST
// -------------------------
const people: string[] = [
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
// HELPERS
// -------------------------
const formatTime = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// -------------------------
// BADGES
// -------------------------
const getBadge = (player: Player) => {
  if (player.rating >= 1700) return "ELITE";
  if (player.games >= 50) return "GRINDER";
  return "";
};

// -------------------------
// STREAK
// -------------------------
const StreakIndicator = ({ streak = 0 }: { streak?: number }) => {
  if (!streak || streak < 3) return null;

  const color =
    streak >= 10 ? "bg-red-500" :
    streak >= 6 ? "bg-orange-500" :
    "bg-yellow-500";

  return (
    <div className="flex items-center gap-1 mt-2">
      {Array.from({ length: Math.min(streak, 8) }).map((_, i) => (
        <div key={i} className={`w-2 h-2 rounded-sm ${color}`} />
      ))}
      <span className="text-xs text-zinc-400 ml-2">
        {streak} win streak
      </span>
    </div>
  );
};

// -------------------------
// COMMENTARY
// -------------------------
const pick = <T,>(arr: T[]) =>
  arr[Math.floor(Math.random() * arr.length)];

const commentaryLines = (winner: string, loser: string, upset: boolean) => [
  upset
    ? `🚨 UPSET ALERT: ${winner} shocks ${loser}`
    : `🔥 ${winner} takes down ${loser}`,

  `${winner} showing strong form tonight`,

  `Momentum shifts after that result`,

  `${loser} needs a comeback`
];

// -------------------------
// MAIN
// -------------------------
export default function Home() {
  const [currentPair, setCurrentPair] = useState<[string, string]>(["", ""]);
  const [scores, setScores] = useState<Record<string, Player>>({});
  const [history, setHistory] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const [commentaryFeed, setCommentaryFeed] = useState<string[]>([]);

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

    if (mountedRef.current && Array.isArray(data)) {
      setHistory(data.slice(-30).reverse());
    }
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
  // BIGGEST UPSET
  // -------------------------
  const biggestUpset = useMemo(() => {
    if (!history.length) return null;

    let best: Match | null = null;
    let maxDiff = 0;

    for (const m of history) {
      const w = scores[m.winner]?.rating ?? 1000;
      const l = scores[m.loser]?.rating ?? 1000;

      const diff = l - w;

      if (diff > maxDiff) {
        maxDiff = diff;
        best = m;
      }
    }

    return best;
  }, [history, scores]);

  // -------------------------
  // UPDATE SCORES
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

    const wRating = getRating(winner);
    const lRating = getRating(loser);
    const upset = wRating < lRating;

    setCurrentPair(getPair());

    try {
      const data = await updateScores(winner, loser);

      setLastDelta(data?.result?.winnerChange ?? null);

      const lines = commentaryLines(winner, loser, upset);

      setCommentaryFeed(prev => [
        `${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })} — ${pick(lines)}`,
        ...prev
      ].slice(0, 6));

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

    const interval = setInterval(loadHistory, 8000);

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

      {/* HEADER */}
      <div className="w-full max-w-4xl flex justify-between mb-8">
        <h1 className="text-2xl font-bold">🎰 Poker Arena</h1>

        <Link href="/leaderboard" className="bg-purple-600 px-4 py-2 rounded-lg">
          Leaderboard
        </Link>
      </div>

      {/* TOP ROW */}
      <div className="w-full max-w-4xl flex gap-4">

        {/* LEFT */}
        <div className="w-1/3 space-y-4">

          {biggestUpset && (
            <div className="bg-red-950 border border-red-600 rounded-xl p-4">
              <div className="text-xs text-red-300 mb-1">😭 Biggest Upset 😭</div>
              <div className="text-white font-bold text-sm">
                {biggestUpset.winner} shocked {biggestUpset.loser}
              </div>
            </div>
          )}

          <div className="bg-zinc-900 rounded-xl p-4">
            <h3 className="text-xs text-zinc-400 mb-2">🧠 Commentary</h3>

            {commentaryFeed.length === 0 ? (
              <p className="text-zinc-500 text-sm">Waiting for action...</p>
            ) : (
              <div className="space-y-2 text-sm">
                {commentaryFeed.map((c, i) => (
                  <div key={i}>{c}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* GAME */}
        <div className="w-2/3 bg-zinc-900 rounded-2xl p-6 space-y-6">

          <p className="text-zinc-400 text-sm">
            Pick who wins — live ELO battle system
          </p>

          <button
            onClick={() => nextRound(currentPair[0])}
            disabled={isLoading}
            className="w-full bg-zinc-800 p-6 rounded-xl text-left"
          >
            <div className="text-xl font-bold">{currentPair[0]}</div>
            <div className="text-sm text-zinc-400">
              ELO: {getRating(currentPair[0])}
            </div>
          </button>

          <div className="text-center text-zinc-500">VS</div>

          <button
            onClick={() => nextRound(currentPair[1])}
            disabled={isLoading}
            className="w-full bg-zinc-800 p-6 rounded-xl text-left"
          >
            <div className="text-xl font-bold">{currentPair[1]}</div>
            <div className="text-sm text-zinc-400">
              ELO: {getRating(currentPair[1])}
            </div>
          </button>

          {lastDelta !== null && (
            <div className="text-green-400 text-sm animate-pulse">
              +{lastDelta} ELO gained 🔥
            </div>
          )}
        </div>
      </div>

      {/* MATCH FEED WITH TIMESTAMPS */}
      <div className="w-full max-w-4xl mt-8">
        <h3 className="text-sm text-zinc-400 mb-2">📊 Live Match Feed</h3>

        <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
          {history.map((m, i) => (
            <div key={i} className="text-sm text-zinc-300 flex justify-between">
              <span>
                🔥 <b>{m.winner}</b> defeats {m.loser}
              </span>
              <span className="text-zinc-500 text-xs">
                {formatTime(m.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>

    </main>
  );
}