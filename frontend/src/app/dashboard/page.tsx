"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import InsightCard from "@/components/InsightCard";
import {
  fetchMe,
  fetchEarningsSummary,
  fetchLatestInsight,
  AuthError,
  EarningsSummary,
  Insight,
} from "@/lib/api";

type StatTab = "week" | "avg" | "best";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ user_id: string; name?: string; city?: string } | null>(null);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StatTab>("week");

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        setUser(me);
        const [sum, ins] = await Promise.allSettled([
          fetchEarningsSummary(me.user_id),
          fetchLatestInsight(me.user_id),
        ]);
        if (sum.status === "fulfilled") setSummary(sum.value);
        if (ins.status === "fulfilled") setInsight(ins.value);
      } catch (e) {
        if (e instanceof AuthError) router.push("/login");
        else setError("Could not load dashboard. Is the backend running?");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const hoursProgress = summary ? Math.min((summary.hours_this_week / 40) * 100, 100) : 0;

  const tabContent: Record<StatTab, { label: string; value: string; sub: string }> = {
    week: {
      label: "This Week",
      value: summary ? `$${summary.total_this_week.toFixed(2)}` : "—",
      sub: `${summary?.hours_this_week.toFixed(1) ?? "0"} hrs worked`,
    },
    avg: {
      label: "Avg $/hr",
      value: summary ? `$${summary.avg_per_hour_all_time.toFixed(2)}/hr` : "—",
      sub: `${summary?.shift_count ?? 0} total shifts`,
    },
    best: {
      label: "Best Shift",
      value: summary?.best_shift_amount ? `$${summary.best_shift_amount.toFixed(2)}` : "—",
      sub: summary?.best_shift_date ?? "No shifts yet",
    },
  };

  return (
    <>
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 pb-24 space-y-5 pt-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* ── Hero banner ─────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">
                Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
              </p>
              <p className="text-4xl font-bold tracking-tight">
                {summary ? `$${summary.total_this_week.toFixed(2)}` : "$0.00"}
              </p>
              <p className="text-green-200 text-sm mt-1">earned this week</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {summary?.hours_this_week.toFixed(1) ?? "0"}h
              </p>
              <p className="text-green-200 text-sm">hrs worked</p>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-green-200 mb-1">
              <span>Weekly hours</span>
              <span>{summary?.hours_this_week.toFixed(1) ?? 0} / 40h goal</span>
            </div>
            <div className="w-full bg-green-500/40 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-700"
                style={{ width: `${hoursProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Stat tabs ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex border-b border-gray-100">
            {(["week", "avg", "best"] as StatTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition ${
                  activeTab === tab
                    ? "bg-green-600 text-white"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {tab === "week" && "💵 "}
                {tab === "avg" && "📈 "}
                {tab === "best" && "🏆 "}
                {tabContent[tab].label}
              </button>
            ))}
          </div>
          <div className="px-6 py-5 text-center">
            <p className="text-3xl font-bold text-gray-900">{tabContent[activeTab].value}</p>
            <p className="text-gray-400 text-sm mt-1">{tabContent[activeTab].sub}</p>
          </div>
        </div>

        {/* ── AI Peak Coach ─────────────────────────────────────────────── */}
        {user && (
          <InsightCard
            insight={insight}
            userId={user.user_id}
            onRefresh={setInsight}
          />
        )}
      </main>

      {/* ── Floating Log Shift button (mobile) ──────────────────────── */}
      <Link
        href="/log-shift"
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition z-20"
        aria-label="Log a shift"
      >
        +
      </Link>
    </>
  );
}
