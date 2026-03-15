/**
 * Server-side: calls the Base44 Superagent to generate a new insight.
 * Fetches driver summary from FastAPI, sends to Base44, saves result.
 */
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AGENT_API_KEY = process.env.AGENT_API_KEY || "";
const BASE44_API_URL = process.env.BASE44_API_URL || "";
const BASE44_API_KEY = process.env.BASE44_API_KEY || "";

export async function POST(req: NextRequest) {
  const { user_id } = await req.json();
  if (!user_id) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  // Fetch driver summary from FastAPI
  const summaryRes = await fetch(
    `${API_URL}/agent/driver-summary?user_id=${user_id}`,
    { headers: { "x-agent-api-key": AGENT_API_KEY } }
  );

  if (!summaryRes.ok) {
    return NextResponse.json({ error: "Failed to fetch driver summary" }, { status: 500 });
  }

  const summary = await summaryRes.json();

  // ── Step 1: Create a Base44 conversation ─────────────────────────────────
  const convRes = await fetch(`${BASE44_API_URL}/conversations`, {
    method: "POST",
    headers: { "api_key": BASE44_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!convRes.ok) {
    const errBody = await convRes.text();
    console.error("Base44 create conversation failed:", convRes.status, errBody);
    return NextResponse.json({ error: `Base44 conversation error ${convRes.status}: ${errBody}` }, { status: 500 });
  }
  const conv = await convRes.json();
  const conversationId = conv.id;

  // ── Step 2: Send driver summary and get AI insight ────────────────────────
  const userContent = JSON.stringify(summary) +
    '\n\nIMPORTANT: Respond ONLY with valid JSON, no markdown, no prose. Format: {"top_suggestion":"...","insight_text":"..."}';

  const msgRes = await fetch(`${BASE44_API_URL}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "api_key": BASE44_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "user", content: userContent }),
  });
  if (!msgRes.ok) {
    const errBody = await msgRes.text();
    console.error("Base44 send message failed:", msgRes.status, errBody);
    return NextResponse.json({ error: `Base44 message error ${msgRes.status}: ${errBody}` }, { status: 500 });
  }

  // The endpoint returns the assistant message directly (not a conversation wrapper)
  const assistantMsg = await msgRes.json();
  const rawContent = typeof assistantMsg.content === "string"
    ? assistantMsg.content
    : JSON.stringify(assistantMsg.content);

  // ── Step 3: Parse JSON, fallback to treating full content as insight ───────
  let top_suggestion: string;
  let insight_text: string;
  try {
    const cleaned = rawContent.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    top_suggestion = parsed.top_suggestion;
    insight_text = parsed.insight_text;
  } catch {
    // Agent returned prose — use it directly
    const lines = rawContent.split("\n").filter((l: string) => l.trim());
    top_suggestion = lines[0].replace(/[*#]/g, "").trim().slice(0, 120);
    insight_text = rawContent.replace(/\*\*/g, "").slice(0, 600);
  }

  // Save insight via FastAPI
  const saveRes = await fetch(`${API_URL}/agent/save-insight`, {
    method: "POST",
    headers: {
      "x-agent-api-key": AGENT_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id,
      insight_text,
      top_suggestion,
      data_snapshot: summary,
    }),
  });

  if (!saveRes.ok) {
    return NextResponse.json({ error: "Failed to save insight" }, { status: 500 });
  }

  // Return latest insight
  const latestRes = await fetch(
    `${API_URL}/agent/latest-insight?user_id=${user_id}`,
    { headers: { "x-agent-api-key": AGENT_API_KEY } }
  );

  return NextResponse.json(await latestRes.json());
}
