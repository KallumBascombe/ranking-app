import { NextResponse } from "next/server";
import { CosmosClient } from "@azure/cosmos";

// -------------------------
// SAFE CLIENT INIT
// -------------------------
function getContainer() {
  const connectionString = process.env.COSMOS_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error("Missing COSMOS_CONNECTION_STRING env variable");
  }

  const client = new CosmosClient(connectionString);
  const db = client.database("game");
  return db.container("scores");
}

// -------------------------
// LOAD LEADERBOARD (SAFE QUERY)
// -------------------------
export async function GET() {
  try {
    const container = getContainer();

    const { resources } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: "leaderboard" }],
      })
      .fetchAll();

    const leaderboard = resources?.[0];

    return NextResponse.json(leaderboard?.scores ?? {});
  } catch (err) {
    console.error("GET /scores failed:", err);
    return NextResponse.json({});
  }
}

// -------------------------
// UPDATE SCORES + SAVE MATCH
// -------------------------
export async function POST(req: Request) {
  try {
    const container = getContainer();
    const { winner, loser } = await req.json();

    // -------------------------
    // LOAD CURRENT LEADERBOARD
    // -------------------------
    const { resources } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: "leaderboard" }],
      })
      .fetchAll();

    const leaderboard = resources?.[0];
    const scores = leaderboard?.scores || {};

    // -------------------------
    // ELO CALCULATION
    // -------------------------
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
    // UPSERT LEADERBOARD (FIXED)
    // -------------------------
    await container.items.upsert({
      id: "leaderboard",
      type: "leaderboard",
      scores: updatedScores,
      updatedAt: Date.now(),
    });

    // -------------------------
    // STORE MATCH HISTORY
    // -------------------------
    await container.items.create({
      id: `match_${Date.now()}`,
      type: "match",
      winner,
      loser,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      ok: true,
      scores: updatedScores,
    });
  } catch (err) {
    console.error("POST /scores failed:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to update scores" },
      { status: 500 }
    );
  }
}