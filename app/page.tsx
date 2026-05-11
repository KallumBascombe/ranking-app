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
};

type Match = {
  winner: string;
  loser: string;
  timestamp: number;
};

// -------------------------
// HELPERS
// -------------------------
const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const pick = <T,>(arr: T[]) =>
  arr[Math.floor(Math.random() * arr.length)];

// -------------------------
// RANK SYSTEM
// -------------------------
const getRank = (rating: number) => {
  if (rating >= 1200) return { name: "DIAMOND", icon: "💎" };
  if (rating >= 1000) return { name: "PLATINUM", icon: "🏆" };
  if (rating >= 900) return { name: "GOLD", icon: "🥇" };
  if (rating >= 800) return { name: "SILVER", icon: "🥈" };
  return { name: "BRONZE", icon: "🥉" };
};

// -------------------------
// SKILL MATCH
// -------------------------
const getSkillMatch = (aRating: number, bRating: number) => {
  const diff = aRating - bRating;
  const abs = Math.abs(diff);

  let label = "";
  let color = "text-zinc-400";

  if (abs < 25) {
    label = "Even Match";
    color = "text-green-400";
  } else if (abs < 100) {
    label = "Slight Favourite";
    color = "text-zinc-300";
  } else if (abs < 200) {
    label = "Clear Favourite";
    color = "text-yellow-400";
  } else {
    label = "Mismatch";
    color = "text-red-400";
  }

  return {
    label,
    color,
    favSide: diff > 0 ? "A" : diff < 0 ? "B" : null,
  };
};

// -------------------------
// COMMENTARY
// -------------------------
const commentaryTemplates = {
  normal: [
    (w: string, l: string) =>
      `${w} absolutely controls that — ${l} never looked comfortable.`,
    (w: string, l: string) =>
      `${w} takes it cleanly. ${l} just ran out of ideas.`,
    (w: string, l: string) =>
      `Solid win for ${w}. ${l} will want that one back.`,
    (w: string, l: string) =>
      `${w} handles business like a professional.`,
  ],
  upset: [
    (w: string, l: string) =>
      `🚨 ABSOLUTE SCENES — ${w} just dismantles ${l}!`,
    (w: string, l: string) =>
      `WHAT?! ${w} sends ${l} into shock territory.`,
    (w: string, l: string) =>
      `${l} will NOT be sleeping well tonight.`,
    (w: string, l: string) =>
      `Group chat is going CRAZY after that result.`,
  ],
  dominance: [
    (w: string, l: string) =>
      `${w} is farming ELO at this point. ${l} got deleted.`,
    (w: string, l: string) =>
      `That was a mismatch. ${w} steamrolls ${l}.`,
  ],
  close: [
    (w: string, l: string) =>
      `That was tight — ${w} just edges out ${l}.`,
    (w: string, l: string) =>
      `Barely anything in it, but ${w} gets it done.`,
  ],
};

const pickCommentary = (
  winner: string,
  loser: string,
  upset: boolean,
  ratingGap: number
) => {
  let pool;

  if (upset) pool = commentaryTemplates.upset;
  else if (ratingGap >= 200) pool = commentaryTemplates.dominance;
  else if (ratingGap <= 40) pool = commentaryTemplates.close;
  else pool = commentaryTemplates.normal;

  return pick(pool)(winner, loser);
};

// -------------------------
// MAIN
// -------------------------
export default function Home() {
  const [currentPair, setCurrentPair] = useState<[string, string]>(["", ""]);
  const [scores, setScores] = useState<Record<string, Player>>({});
  const [history, setHistory] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [commentaryFeed, setCommentaryFeed] = useState<string[]>([]);
  const [lastDelta, setLastDelta] = useState<number | null>(null);

  const mountedRef = useRef(true);

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

  const getRating = (name: string) =>
    scores?.[name]?.rating ?? 1000;

  const getPair = (): [string, string] => {
    let a = people[Math.floor(Math.random() * people.length)];
    let b = people[Math.floor(Math.random() * people.length)];
    while (a === b) b = people[Math.floor(Math.random() * people.length)];
    return [a, b];
  };

  // -------------------------
  // BIGGEST UPSET
  // -------------------------
  const hallOfFame = useMemo(() => {
    if (!history.length) return null;

    let biggestUpset = history[0];
    let maxDiff = 0;

    for (const m of history) {
      const w = getRating(m.winner);
      const l = getRating(m.loser);
      const diff = l - w;

      if (diff > maxDiff) {
        maxDiff = diff;
        biggestUpset = m;
      }
    }

    return { biggestUpset };
  }, [history, scores]);

  // -------------------------
  // 🔥 FIXED STREAK (ALWAYS ACTIVE)
  // -------------------------
  const streakData = useMemo(() => {
    if (!history.length) return null;

    const streaks: Record<string, number> = {};

    // correct chronological processing
    const chronological = [...history].reverse();

    for (const m of chronological) {
      streaks[m.winner] = (streaks[m.winner] || 0) + 1;
      streaks[m.loser] = 0;
    }

    let topPlayer = "";
    let topStreak = 0;

    for (const [player, streak] of Object.entries(streaks)) {
      if (streak > topStreak) {
        topStreak = streak;
        topPlayer = player;
      }
    }

    return topStreak >= 2
      ? { player: topPlayer, streak: topStreak }
      : null;
  }, [history]);

  const updateScores = async (winner: string, loser: string) => {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winner, loser }),
    });

    return res.json();
  };

  const nextRound = async (chosen: string) => {
    if (isLoading) return;

    setIsLoading(true);

    const [a, b] = currentPair;
    const winner = chosen;
    const loser = chosen === a ? b : a;

    const wRating = getRating(winner);
    const lRating = getRating(loser);
    const upset = wRating < lRating;
    const ratingGap = Math.abs(wRating - lRating);

    setCurrentPair(getPair());

    try {
      const data = await updateScores(winner, loser);

      setLastDelta(data?.result?.winnerChange ?? null);

      const text = pickCommentary(winner, loser, upset, ratingGap);

      setCommentaryFeed((prev) => [
        `${formatTime(Date.now())} — ${text}`,
        ...prev,
      ].slice(0, 6));

      await loadHistory();
    } finally {
      setIsLoading(false);
      setTimeout(() => setLastDelta(null), 1500);
    }
  };

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

  const skill = useMemo(() => {
    if (!currentPair[0] || !currentPair[1]) {
      return { label: "", color: "", favSide: null };
    }

    return getSkillMatch(
      getRating(currentPair[0]),
      getRating(currentPair[1])
    );
  }, [currentPair, scores]);

  const favA = skill.favSide === "A";
  const favB = skill.favSide === "B";

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center px-4 py-10">

      {/* HEADER */}
      <div className="w-full max-w-4xl flex justify-between mb-8">
        <h1 className="text-2xl font-bold">🎰 Swindon Poker Arena</h1>
        <Link href="/leaderboard" className="bg-purple-600 px-4 py-2 rounded-lg">
          Leaderboard
        </Link>
      </div>

      <div className="w-full max-w-4xl flex gap-4">

        {/* LEFT */}
        <div className="w-1/3 space-y-4">
          <div className="bg-zinc-900 rounded-xl p-4">
            <h3 className="text-xs text-zinc-400 mb-2">🧠 ESPN Commentary</h3>
            <div className="space-y-2 text-sm">
              {commentaryFeed.length === 0
                ? <p className="text-zinc-500 text-sm">Waiting for action...</p>
                : commentaryFeed.map((c, i) => <div key={i}>{c}</div>)
              }
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div className="w-1/3 bg-zinc-900 rounded-2xl p-6 space-y-6">

          <p className="text-zinc-400 text-sm">
            Pick who wins — live ELO battle system
          </p>

          {favA && <div className="text-center text-[10px] text-zinc-400">{skill.label}</div>}

          <button
            onClick={() => nextRound(currentPair[0])}
            disabled={isLoading}
            className="w-full bg-zinc-800 p-6 rounded-xl text-left"
          >
            <div className="text-xl font-bold flex gap-2 items-center">
              {currentPair[0]}
              <span>{getRank(getRating(currentPair[0])).icon}</span>
            </div>
            <div className="text-sm text-zinc-400">
              ELO: {getRating(currentPair[0])}
            </div>
          </button>

          <div className="text-center text-zinc-500">VS</div>

          {favB && <div className="text-center text-[10px] text-zinc-400">{skill.label}</div>}

          <button
            onClick={() => nextRound(currentPair[1])}
            disabled={isLoading}
            className="w-full bg-zinc-800 p-6 rounded-xl text-left"
          >
            <div className="text-xl font-bold flex gap-2 items-center">
              {currentPair[1]}
              <span>{getRank(getRating(currentPair[1])).icon}</span>
            </div>
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

        {/* RIGHT */}
        <div className="w-1/3 space-y-4">

          <div className="bg-zinc-900 rounded-xl p-4 text-xs space-y-2">
            <div className="font-bold mb-2">Rank Legend</div>
            <div>💎 1200+ Diamond</div>
            <div>🏆 1000–1199 Platinum</div>
            <div>🥇 900–999 Gold</div>
            <div>🥈 800–899 Silver</div>
            <div>🥉 0–799 Bronze</div>
          </div>

          {hallOfFame && (
            <div className="bg-zinc-900 rounded-xl p-4 text-xs space-y-2">
              <div className="font-bold mb-2">🏛 Biggest Upset</div>
              <div>
                😭 <b>{hallOfFame.biggestUpset?.winner}</b> vs {hallOfFame.biggestUpset?.loser}
              </div>
            </div>
          )}

          {streakData && (
            <div className="bg-red-600/20 border border-red-500 rounded-xl p-4 text-xs">
              <div className="font-bold text-red-400">🔥 Streak Leader</div>
              <div>
                <b>{streakData.player}</b> — {streakData.streak} wins
              </div>
            </div>
          )}

        </div>
      </div>

      {/* FEED */}
      <div className="w-full max-w-4xl mt-8">
        <h3 className="text-sm text-zinc-400 mb-2">📊 Live Match Feed</h3>
        <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
          {history.map((m, i) => (
            <div key={i} className="flex justify-between text-sm text-zinc-300">
              <span>
                {getRank(getRating(m.winner)).icon} <b>{m.winner}</b> defeats {m.loser}
              </span>
              <span className="text-zinc-500 text-xs">{formatTime(m.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>
      {/* FOOTER */}
<div className="fixed bottom-0 left-0 w-full bg-black/80 text-white text-sm text-center py-3">
  Swindon Poker Arena — Created by Kallum Bascombe. If you have any suggestions or want to contribute please send me a WhatsApp message. 
</div>

    </main>
  );
}