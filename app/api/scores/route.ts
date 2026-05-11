import { NextResponse } from "next/server";
import { CosmosClient } from "@azure/cosmos";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
});

const database = client.database(process.env.COSMOS_DB!);
const container = database.container(process.env.COSMOS_CONTAINER!);

const DOC_ID = "leaderboard";

// -------------------------
// GET SCORES
// -------------------------
export async function GET() {
  try {
    const { resource } = await container.item(DOC_ID, DOC_ID).read();

    return NextResponse.json(resource?.scores || {});
  } catch (err: any) {
    console.error("GET ERROR:", err.message);
    return NextResponse.json({}, { status: 200 });
  }
}

// -------------------------
// SAVE SCORES
// -------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const document = {
      id: "leaderboard",
      scores: body,
    };

    const result = await container.items.upsert(document);

    console.log("✅ COSMOS WRITE SUCCESS");

    return NextResponse.json({
      ok: true,
      id: result.resource?.id,
    });

  } catch (err: any) {
    console.error("❌ COSMOS ERROR:", err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}