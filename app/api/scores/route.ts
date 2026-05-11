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
// NORMALIZATION
// -------------------------
function normalize(scores: Record<string, any>) {
  const values = Object.values(scores)
    .map((v: any) => v?.rating ?? v)
    .filter((v) => typeof v === "number");

  if (values.length === 0) return scores;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const drift = 1000 - mean;

  const adjusted: Record<string, any> = {};

  for (const [name, value] of Object.entries(scores)) {
    if (typeof value === "number") {
      adjusted[name] = Math.round(value + drift);
    } else {
      adjusted[name] = {
        rating: Math.round((value?.rating ?? 1000) + drift),
        games: value?.games ?? 0,
      };
    }
  }

  return adjusted;
}

// -------------------------
// SAFE READ HELPER
// -------------------------
async function getLeaderboardDoc() {
  try {
    const { resource } = await container
      .item("leaderboard", "leaderboard")
      .read();

    return resource;
  } catch {
    // auto-create if missing (prevents silent empty DB bugs)
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

    if (!rawScores || typeof rawScores !== "object") {
      return NextResponse.json({});
    }

    return NextResponse.json(normalize(rawScores));
  } catch (err) {
    console.error("GET /scores failed:", err);
    return NextResponse.json({});
  }
}

// -------------------------
// POST (ELO CORE)
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

      if (typeof raw === "number") {
        return { rating: raw, games: 0 };
      }

      return raw ?? { rating: 1000, games: 0 };
    };

    const w = getPlayer(winner);
    const l = getPlayer(loser);

    // -------------------------
    // BEFORE RATINGS (IMPORTANT)
    // -------------------------
    const wBefore = w.rating;
    const lBefore = l.rating;

    // -------------------------
    // ELO CALCULATION
    // -------------------------
    const expectedW =
      1 / (1 + Math.pow(10, (l.rating - w.rating) / 400));

    const kWinner = 32 / (1 + w.games * 0.1);
    const kLoser = 32 / (1 + l.games * 0.1);

    const wAfter = Math.round(
      w.rating + kWinner * (1 - expectedW)
    );

    const lAfter = Math.round(
      l.rating + kLoser * (0 - (1 - expectedW))
    );

    // -------------------------
    // DELTAS (THIS IS WHAT YOU NEED)
    // -------------------------
    const wDelta = wAfter - wBefore;
    const lDelta = lAfter - lBefore;

    const updatedScores = {
      ...scores,

      [winner]: {
        rating: wAfter,
        games: w.games + 1,
      },

      [loser]: {
        rating: lAfter,
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
    // MATCH LOG (NOW INCLUDES ELO CHANGE)
    // -------------------------
    await container.items.create({
      id: `match_${Date.now()}`,
      type: "match",

      winner,
      loser,

      winnerBefore: wBefore,
      loserBefore: lBefore,

      winnerAfter: wAfter,
      loserAfter: lAfter,

      winnerDelta: wDelta,
      loserDelta: lDelta,

      timestamp: Date.now(),
    });

    return NextResponse.json({
      ok: true,
      scores: updatedScores,
    });
  } catch (err) {
    console.error("POST /scores failed:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}