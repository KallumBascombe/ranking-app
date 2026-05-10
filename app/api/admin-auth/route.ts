import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "scores.json");

export async function GET() {
  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({});
    }

    const data = fs.readFileSync(filePath, "utf8");

    // IMPORTANT: prevent empty JSON crash
    if (!data || data.trim().length === 0) {
      return NextResponse.json({});
    }

    return NextResponse.json(JSON.parse(data));
  } catch (err) {
    console.error("GET /api/scores failed:", err);
    return NextResponse.json({});
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    fs.writeFileSync(filePath, JSON.stringify(body, null, 2));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/scores failed:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}