import { NextResponse } from "next/server";
import { CosmosClient } from "@azure/cosmos";

const DOC_ID = "leaderboard";

function getContainer() {
  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT!,
    key: process.env.COSMOS_KEY!,
  });

  return client
    .database(process.env.COSMOS_DB!)
    .container(process.env.COSMOS_CONTAINER!);
}

// -------------------------
// GET SCORES
// -------------------------
export async function GET() {
  try {
    const container = getContainer();

    const { resource } = await container
      .item(DOC_ID, DOC_ID)
      .read();

    return NextResponse.json(resource?.scores ?? {});
  } catch (err: any) {
    console.error("GET ERROR:", err.message);

    return NextResponse.json({});
  }
}

// -------------------------
// SAVE SCORES
// -------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const container = getContainer();

    await container.items.upsert({
      id: DOC_ID,
      scores: body,
    });

    console.log("✅ COSMOS WRITE SUCCESS");

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("❌ COSMOS ERROR:", err.message);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}