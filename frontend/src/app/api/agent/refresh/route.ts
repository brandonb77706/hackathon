/**
 * Server-side: triggers the Base44 agent to generate a new insight.
 * In production this would call Base44's API; here we call FastAPI's
 * driver-summary, then save a placeholder insight so the UI can poll.
 *
 * Replace the body of this route with your Base44 agent webhook call.
 */
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const AGENT_API_KEY = process.env.AGENT_API_KEY || "";

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

  // ─────────────────────────────────────────────────────────────────────────
  // TODO: Replace the block below with your Base44 Superagent API call.
  // Pass `summary` as the data payload to the agent, and capture its
  // insight_text and top_suggestion from the response.
  // ─────────────────────────────────────────────────────────────────────────

  // Placeholder insight (Base44 agent generates the real one)
  const bestWindow = summary.top_peak_windows?.[0];
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const dayName = bestWindow ? days[bestWindow.day_of_week] : "the weekend";
  const hour = bestWindow ? `${bestWindow.hour_of_day}:00` : "evening";
  const eph = bestWindow ? `$${bestWindow.avg_earnings_per_hour}/hr` : "your top rate";

  const top_suggestion = `Focus on ${dayName} around ${hour} — you average ${eph} then.`;
  const insight_text = `Based on your recent shifts, ${dayName} evenings are your strongest window. ` +
    `Your best platform is ${summary.best_platform || "mixed"}, earning more per hour than alternatives. ` +
    `Consider front-loading your hours early in the week when demand is higher in ${summary.city}. ` +
    `Your earnings trend looks ${summary.earnings_trend_4_weeks?.[0]?.avg_eph > (summary.earnings_trend_4_weeks?.[1]?.avg_eph || 0) ? "upward" : "stable"} — keep it up!`;

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
