/**
 * Server-side proxy for /agent/latest-insight — adds AGENT_API_KEY header
 * so the key never leaks to the browser.
 */
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AGENT_API_KEY = process.env.AGENT_API_KEY || "";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  const res = await fetch(
    `${API_URL}/agent/latest-insight?user_id=${userId}`,
    {
      headers: {
        "x-agent-api-key": AGENT_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );

  if (res.status === 404 || res.status === 200) {
    const data = await res.json();
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Failed to fetch insight" }, { status: res.status });
}
