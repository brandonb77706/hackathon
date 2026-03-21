/**
 * Server-side route: exchanges the next-auth Google access token
 * for a FastAPI JWT. This avoids a second Google OAuth dance.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  try {
    console.log("[fastapi-token] calling getServerSession...");
    const session = await getServerSession(authOptions);
    console.log("[fastapi-token] session:", session ? "found" : "null");

    if (!session) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const googleAccessToken = (session as any).googleAccessToken;
    console.log("[fastapi-token] googleAccessToken:", googleAccessToken ? "present" : "missing");
    if (!googleAccessToken) {
      return NextResponse.json({ error: "No Google token in session" }, { status: 400 });
    }

    console.log("[fastapi-token] fetching FastAPI...");
    // Exchange Google access token for FastAPI JWT
    const res = await fetch(`${API_URL}/auth/google-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: googleAccessToken }),
    });

    console.log("[fastapi-token] FastAPI responded:", res.status);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.detail || "FastAPI auth failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ token: data.access_token });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[fastapi-token] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
