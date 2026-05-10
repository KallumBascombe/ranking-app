"use client";

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
  // -------------------------
  // STATE
  // -------------------------
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [currentPair, setCurrentPair] = useState<[string, string]>(["", ""]);
  const [scores, setScores] = useState<Record<string, number>>(initialScores);
  const [isLoading, setIsLoading] = useState(false);

  // -------------------------
  // API FUNCTIONS
  // -------------------------
  const saveScores = useCallback(async (updatedScores: Record<string, number>) => {
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedScores),
    });
  }, []);

  const loadScores = useCallback(async () => {
    const res = await fetch("/api/scores");
    const data = await res.json();

    if (Object.keys(data).length > 0) {
      setScores(data);
    }
  }, []);

  const checkPassword = async () => {
    const res = await fetch("/api/admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordInput }),
    });

    if (res.ok) setIsAdmin(true);
    else alert("Wrong password");
  };

  // -------------------------
  // PAIR GENERATION
  // -------------------------
  const getRandomPair = useCallback(() => {
    const personA = people[Math.floor(Math.random() * people.length)];
    const scoreA = scores[personA];

    const candidates = people
      .filter((p) => p !== personA)
      .map((p) => ({
        name: p,
        diff: Math.abs(scores[p] - scoreA),
      }))
      .sort((a, b) => a.diff - b.diff);

    const topN = candidates.slice(0, 3);

    const personB =
      topN[Math.floor(Math.random() * topN.length)].name;

    return [personA, personB] as [string, string];
  }, [scores]);

  // -------------------------
  // GAME LOGIC
  // -------------------------
  const updateScores = (winner: string, loser: string) => {
    setScores((prev) => {
      const K = 32;

      const winnerScore = prev[winner];
      const loserScore = prev[loser];

      const expectedWinner =
        1 / (1 + Math.pow(10, (loserScore - winnerScore) / 400));

      const expectedLoser = 1 - expectedWinner;

      return {
        ...prev,
        [winner]: Math.round(winnerScore + K * (1 - expectedWinner)),
        [loser]: Math.round(loserScore + K * (0 - expectedLoser)),
      };
    });
  };

const nextRound = (chosen: string) => {
  if (isLoading) return;

  setIsLoading(true);

  const [a, b] = currentPair;

  const winner = chosen;
  const loser = chosen === a ? b : a;

  updateScores(winner, loser);

  setTimeout(() => {
    setCurrentPair(getRandomPair());
    setIsLoading(false);
  }, 250);
};

  // -------------------------
  // EFFECTS (LIFECYCLE)
  // -------------------------
  useEffect(() => {
    loadScores();
  }, [loadScores]);

  useEffect(() => {
    if (Object.keys(scores).length > 0 && currentPair[0] === "") {
      setCurrentPair(getRandomPair());
    }
  }, [scores, currentPair, getRandomPair]);

  useEffect(() => {
    saveScores(scores);
  }, [scores, saveScores]);

  // -------------------------
  // UI
  // -------------------------
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <h1 className="text-2xl font-bold mb-10 text-gray-800">
        Who ranks higher?
      </h1>

      <div className="w-full max-w-md flex flex-col gap-6">
        <p className="text-sm text-gray-500 text-center">
          Comparison
        </p>
        {isLoading && (
  <div className="text-sm text-blue-500 text-center">
    Calculating result...
  </div>
)}

        <div className="w-full max-w-md mb-6">
          <h2 className="text-lg font-bold mb-2">Leaderboard</h2>

          <div className="space-y-1 text-sm">
            {Object.entries(scores)
              .sort((a, b) => b[1] - a[1])
              .map(([name, score]) => (
                <div key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span>{score}</span>
                </div>
              ))}
          </div>
        </div>

<button
  onClick={() => nextRound(currentPair[0])}
  disabled={isLoading}
  className={`w-full p-6 bg-white border rounded-xl shadow-sm text-lg font-medium transition ${
    isLoading ? "opacity-50 cursor-not-allowed" : "active:scale-95"
  }`}
>
  {currentPair[0]}
</button>

<button
  onClick={() => nextRound(currentPair[1])}
  disabled={isLoading}
  className={`w-full p-6 bg-white border rounded-xl shadow-sm text-lg font-medium transition ${
    isLoading ? "opacity-50 cursor-not-allowed" : "active:scale-95"
  }`}
>
  {currentPair[1]}
</button>
      </div>
    </main>
  );
}