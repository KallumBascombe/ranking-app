import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      endpoint: process.env.COSMOS_ENDPOINT ?? "MISSING",
      db: process.env.COSMOS_DB ?? "MISSING",
      container: process.env.COSMOS_CONTAINER ?? "MISSING",
      keyExists: !!process.env.COSMOS_KEY,
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    return NextResponse.json({
      ok: true,
      receivedKeys: Object.keys(body),
      sample: body,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
    });
  }
}