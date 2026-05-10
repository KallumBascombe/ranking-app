import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "scores.json");

// GET: load scores
export async function GET() {
  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({});
    }

    const data = fs.readFileSync(filePath, "utf8");

    if (!data) {
      return NextResponse.json({});
    }

    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error("GET /api/scores error:", error);
    return NextResponse.json({}, { status: 500 });
  }
}

// POST: save scores
export async function POST(req: Request) {
  try {
    const body = await req.json();

    fs.writeFileSync(filePath, JSON.stringify(body, null, 2), "utf8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/scores error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}