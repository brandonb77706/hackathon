/**
 * API client helpers — all calls use the FastAPI JWT stored in the
 * `api_token` cookie, NOT the next-auth session token.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)api_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function fetchMe() {
  return apiFetch<{
    user_id: string;
    oauth_sub: string;
    email?: string;
    name?: string;
    city?: string;
  }>("/auth/me");
}

// ── Shifts ────────────────────────────────────────────────────────────────────

export interface Shift {
  id: string;
  user_id: string;
  platform: string;
  start_time: string;
  end_time: string;
  earnings: number;
  tips: number;
  city: string;
  day_of_week: number;
  hour_of_day: number;
  earnings_per_hour: number;
  hours_worked: number;
}

export async function fetchShifts(userId: string): Promise<Shift[]> {
  return apiFetch<Shift[]>(`/shifts?user_id=${userId}`);
}

export async function logShift(data: {
  platform: string;
  start_time: string;
  end_time: string;
  earnings: number;
  tips: number;
  city: string;
}) {
  return apiFetch<Shift>("/shifts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface PeakWindow {
  day_of_week: number;
  hour_of_day: number;
  avg_earnings_per_hour: number;
  sample_count: number;
  source: "personal" | "community";
}

export interface PeakTimesResponse {
  windows: PeakWindow[];
  data_source: "personal" | "community";
  shift_count: number;
}

export async function fetchPeakTimes(
  userId: string,
  city: string
): Promise<PeakTimesResponse> {
  return apiFetch<PeakTimesResponse>(
    `/peak-times?user_id=${userId}&city=${encodeURIComponent(city)}`
  );
}

export interface EarningsSummary {
  total_this_week: number;
  total_this_month: number;
  avg_per_hour_all_time: number;
  best_shift_date: string | null;
  best_shift_amount: number | null;
  hours_this_week: number;
  shift_count: number;
}

export async function fetchEarningsSummary(
  userId: string
): Promise<EarningsSummary> {
  return apiFetch<EarningsSummary>(`/earnings/summary?user_id=${userId}`);
}

// ── Agent ─────────────────────────────────────────────────────────────────────

export interface Insight {
  id: string;
  user_id: string;
  generated_at: string;
  insight_text: string;
  top_suggestion: string;
}

export async function fetchLatestInsight(
  userId: string
): Promise<Insight | null> {
  const agentKey =
    typeof window !== "undefined"
      ? ""
      : process.env.AGENT_API_KEY || "";
  // Client-side: call Next.js API route which adds the key server-side
  return apiFetch<Insight | null>(`/api/agent/latest-insight?user_id=${userId}`);
}

export async function refreshInsight(userId: string): Promise<Insight> {
  return apiFetch<Insight>(`/api/agent/refresh`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function updateUser(
  userId: string,
  data: { city?: string; name?: string }
) {
  return apiFetch(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
