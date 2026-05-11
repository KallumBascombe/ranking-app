import { NextResponse } from "next/server";
import { CosmosClient } from "@azure/cosmos";

const connectionString = process.env.COSMOS_CONNECTION_STRING;

if (!connectionString) {
  throw new Error("Missing COSMOS_CONNECTION_STRING env variable");
}

const client = new CosmosClient(connectionString);

const db = client.database("game");
const container = db.container("scores");

// -------------------------
// NORMALIZATION (optional safety pass)
// -------------------------
function normalize(scores: Record<string, any>) {
  const values = Object.values(scores)
    .map((v: any) => v?.rating ?? v)
    .filter((v) => typeof v === "number");

  if (!values.length) return scores;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const drift = 1000 - mean;

  const adjusted: Record<string, any> = {};

  for (const [name, value] of Object.entries(scores)) {
    const rating = typeof value === "number"
      ? value
      : value?.rating ?? 1000;

    adjusted[name] = {
      rating: Math.round(rating + drift),
      games: value?.games ?? 0,
    };
  }

  return adjusted;
}

// -------------------------
// SAFE READ
// -------------------------
async function getLeaderboardDoc() {
  try {
    const { resource } = await container
      .item("leaderboard", "leaderboard")
      .read();

    return resource;
  } catch {
    const empty = {
      id: "leaderboard",
      type: "leaderboard",
      scores: {},
      updatedAt: Date.now(),
    };

    await container.items.upsert(empty);
    return empty;
  }
}

// -------------------------
// GET
// -------------------------
export async function GET() {
  try {
    const doc = await getLeaderboardDoc();
    const rawScores = doc?.scores;

    if (!rawScores) {
      return NextResponse.json({});
    }

    return NextResponse.json(normalize(rawScores));
  } catch (err) {
    console.error("GET /scores failed:", err);
    return NextResponse.json({});
  }
}

// -------------------------
// POST (ELO ENGINE)
// -------------------------
export async function POST(req: Request) {
  try {
    const { winner, loser } = await req.json();

    if (!winner || !loser) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    const doc = await getLeaderboardDoc();
    const scores = doc.scores || {};

    const getPlayer = (name: string) => {
      const raw = scores[name];

      if (!raw) return { rating: 1000, games: 0 };

      if (typeof raw === "number") {
        return { rating: raw, games: 0 };
      }

      return {
        rating: raw.rating ?? 1000,
        games: raw.games ?? 0,
      };
    };

    const w = getPlayer(winner);
    const l = getPlayer(loser);

    // -------------------------
    // EXPECTED SCORE
    // -------------------------
    const expectedW =
      1 / (1 + Math.pow(10, (l.rating - w.rating) / 400));

    // -------------------------
    // K FACTOR (slightly dynamic)
    // -------------------------
    const kWinner = 32 / (1 + w.games * 0.1);
    const kLoser = 32 / (1 + l.games * 0.1);

    // -------------------------
    // ELO CHANGES (IMPORTANT FIX POINT)
    // -------------------------
    const winnerChange = Math.round(kWinner * (1 - expectedW));
    const loserChange = Math.round(kLoser * (0 - (1 - expectedW)));

    const newWinnerRating = w.rating + winnerChange;
    const newLoserRating = l.rating + loserChange;

    const updatedScores = {
      ...scores,

      [winner]: {
        rating: Math.round(newWinnerRating),
        games: w.games + 1,
      },

      [loser]: {
        rating: Math.round(newLoserRating),
        games: l.games + 1,
      },
    };

    // -------------------------
    // SAVE LEADERBOARD
    // -------------------------
    await container.items.upsert({
      id: "leaderboard",
      type: "leaderboard",
      scores: updatedScores,
      updatedAt: Date.now(),
    });

    // -------------------------
    // MATCH LOG (FOR LIVE FEED / CASINO UI)
    // -------------------------
    await container.items.create({
      id: `match_${Date.now()}`,
      type: "match",
      winner,
      loser,
      timestamp: Date.now(),
      winnerChange,
      loserChange,
      winnerRatingAfter: Math.round(newWinnerRating),
      loserRatingAfter: Math.round(newLoserRating),
    });

    // -------------------------
    // IMPORTANT: RETURN DELTAS
    // -------------------------
    return NextResponse.json({
      ok: true,
      scores: updatedScores,
      result: {
        winner,
        loser,
        winnerChange,
        loserChange,
        winnerAfter: Math.round(newWinnerRating),
        loserAfter: Math.round(newLoserRating),
      },
    });
  } catch (err) {
    console.error("POST /scores failed:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}