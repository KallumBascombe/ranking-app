import { NextResponse } from "next/server";
import { CosmosClient } from "@azure/cosmos";

const connectionString = process.env.COSMOS_CONNECTION_STRING!;

const client = new CosmosClient(connectionString);
const db = client.database("game");
const container = db.container("scores");

export async function GET() {
  try {
    const { resources } = await container.items
      .query({
        query: `
          SELECT TOP 10
            c.winner,
            c.loser,
            c.timestamp
          FROM c
          WHERE c.type = "match"
          ORDER BY c.timestamp DESC
        `,
      })
      .fetchAll();

    return NextResponse.json(resources);
  } catch (err) {
    console.error("GET /matches failed:", err);
    return NextResponse.json([]);
  }
}