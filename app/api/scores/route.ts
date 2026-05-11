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
// CONFIG
// -------------------------
const BASE_RATING = 1000;

// -------------------------
// SAFE GET DOC
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
// PLAYER NORMALISATION
// -------------------------
function getPlayer(scores: any, name: string) {
  const raw = scores?.[name];

  if (!raw) {
    return { rating: BASE_RATING, games: 0 };
  }

  if (typeof raw === "number") {
    return { rating: raw, games: 0 };
  }

  return {
    rating: raw.rating ?? BASE_RATING,
    games: raw.games ?? 0,
  };
}

// -------------------------
// EXPECTED SCORE
// -------------------------
function expectedScore(a: number, b: number) {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

// -------------------------
// K FACTOR (SMOOTHER PROGRESSION)
// -------------------------
function kFactor(games: number) {
  if (games < 10) return 48;
  if (games < 25) return 40;
  if (games < 60) return 32;
  return 24;
}

// -------------------------
// ELITE BOOST (FIXES 1100+ CAP ISSUE)
// -------------------------
function eliteBoost(rating: number) {
  if (rating >= 1300) return 1.25;
  if (rating >= 1200) return 1.15;
  if (rating >= 1100) return 1.08;
  return 1;
}

// -------------------------
// GET
// -------------------------
export async function GET() {
  try {
    const doc = await getLeaderboardDoc();
    return NextResponse.json(doc?.scores || {});
  } catch (err) {
    console.error("GET /scores failed:", err);
    return NextResponse.json({});
  }
}

// -------------------------
// POST (IMPROVED ELO ENGINE)
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

    const w = getPlayer(scores, winner);
    const l = getPlayer(scores, loser);

    // -------------------------
    // EXPECTED SCORE
    // -------------------------
    const expectedW = expectedScore(w.rating, l.rating);

    // -------------------------
    // K FACTOR (AVERAGED - FIXES COMPRESSION)
    // -------------------------
    const k = (kFactor(w.games) + kFactor(l.games)) / 2;

    // -------------------------
    // UPSET BOOST
    // -------------------------
    const upsetMultiplier = w.rating < l.rating ? 1.12 : 1;

    // -------------------------
    // FINAL DELTAS
    // -------------------------
    const winnerChange = Math.round(
      k *
      (1 - expectedW) *
      upsetMultiplier *
      eliteBoost(w.rating)
    );

    const loserChange = -winnerChange;

    // -------------------------
    // NEW RATINGS
    // -------------------------
    const newWinnerRating = w.rating + winnerChange;
    const newLoserRating = l.rating + loserChange;

    // -------------------------
    // SAVE SCORES
    // -------------------------
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

    await container.items.upsert({
      id: "leaderboard",
      type: "leaderboard",
      scores: updatedScores,
      updatedAt: Date.now(),
    });

    // -------------------------
    // MATCH LOG
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
    // RESPONSE
    // -------------------------
    return NextResponse.json({
      ok: true,
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