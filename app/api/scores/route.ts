import { NextResponse } from "next/server";
import { CosmosClient } from "@azure/cosmos";

// -------------------------
// SAFE LAZY CLIENT INIT
// -------------------------
function getClient() {
  const connectionString = process.env.COSMOS_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error("Missing COSMOS_CONNECTION_STRING env variable");
  }

  return new CosmosClient(connectionString);
}

function getContainer() {
  const client = getClient();
  const db = client.database("game");
  return db.container("scores");
}

// -------------------------
// GET leaderboard
// -------------------------
export async function GET() {
  try {
    const container = getContainer();

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
  try {
    const container = getContainer();

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

    // WRITE leaderboard
    await container.items.upsert({
      id: "leaderboard",
      type: "leaderboard",
      scores: updatedScores,
      updatedAt: Date.now(),
    });

    // WRITE match history
    await container.items.create({
      id: `match_${Date.now()}`,
      type: "match",
      winner,
      loser,
      timestamp: Date.now(),
    });

    return NextResponse.json({ ok: true, scores: updatedScores });
  } catch (err) {
    console.error("POST /scores failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to update scores" },
      { status: 500 }
    );
  }
}