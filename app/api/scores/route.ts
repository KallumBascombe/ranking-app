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
// GET leaderboard
// -------------------------
export async function GET() {
  try {
    const { resource } = await container
      .item("leaderboard", "leaderboard")
      .read();

    return NextResponse.json(resource?.scores ?? {});
  } catch (err) {
    console.error("GET /scores failed:", err);
    return NextResponse.json({});
  }
}

// ------------------------
// POST vote (winner/loser)
// ------------------------
export async function POST(req: Request) {
  const { winner, loser } = await req.json();

  const leaderboardItem = await container
    .item("leaderboard", "leaderboard")
    .read();

  const scores = leaderboardItem.resource?.scores || {};

  const K = 32;

  const w = scores[winner] ?? 1000;
  const l = scores[loser] ?? 1000;

  const expectedW = 1 / (1 + Math.pow(10, (l - w) / 400));

  const updatedScores = {
    ...scores,
    [winner]: Math.round(w + K * (1 - expectedW)),
    [loser]: Math.round(l + K * (0 - (1 - expectedW))),
  };

  // -------------------------
  // WRITE leaderboard
  // -------------------------
  await container.items.upsert({
    id: "leaderboard",
    type: "leaderboard",
    scores: updatedScores,
    updatedAt: Date.now(),
  });

  // -------------------------
  // WRITE match history
  // -------------------------
  await container.items.create({
    id: `match_${Date.now()}`,
    type: "match",
    winner,
    loser,
    timestamp: Date.now(),
  });

  return NextResponse.json({ ok: true, scores: updatedScores });
}