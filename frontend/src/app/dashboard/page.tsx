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
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4ff]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-500/20" />
          <p className="text-slate-500 text-sm font-medium">Loading your dashboard…</p>
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

      <main className="max-w-2xl mx-auto px-4 pb-24 space-y-5 pt-5 animate-fade-in">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
            {error}
          </div>
        )}

        {/* ── Hero banner ─────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-2xl shadow-blue-500/30 overflow-hidden transition-all duration-300 hover:shadow-blue-500/40 hover:scale-[1.005] group cursor-default">
          {/* Decorative glow orbs */}
          <div className="absolute -top-8 -right-8 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-6 w-44 h-44 bg-indigo-400/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-blue-300/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex items-start justify-between mb-5">
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" />
                Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
              </p>
              <p className="text-5xl font-extrabold tracking-tight tabular-nums">
                {summary ? `$${summary.total_this_week.toFixed(2)}` : "$0.00"}
              </p>
              <p className="text-blue-300/90 text-sm mt-1.5 font-medium">earned this week</p>
            </div>
            <div className="text-right bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl px-4 py-3 shadow-inner">
              <p className="text-2xl font-bold tabular-nums">
                {summary?.hours_this_week.toFixed(1) ?? "0"}h
              </p>
              <p className="text-blue-200/80 text-xs font-medium mt-0.5">hrs worked</p>
            </div>
          </div>
          <div className="relative mt-2">
            <div className="flex justify-between text-xs text-blue-200/80 mb-2 font-medium">
              <span>Weekly progress</span>
              <span>{summary?.hours_this_week.toFixed(1) ?? 0} / 40h goal</span>
            </div>
            <div className="w-full bg-white/15 rounded-full h-2.5">
              <div
                className="bg-white rounded-full h-2.5 transition-all duration-700 shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                style={{ width: `${hoursProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Stat tabs ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-blue-100/60 overflow-hidden shadow-sm shadow-blue-500/5">
          <div className="flex gap-1.5 p-2 bg-slate-100/80 border-b border-slate-200/60">
            {(["week", "avg", "best"] as StatTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-white text-blue-700 shadow-sm shadow-blue-500/10 border border-blue-100/60"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
                }`}
              >
                {tab === "week" && "💵 "}
                {tab === "avg" && "📈 "}
                {tab === "best" && "🏆 "}
                {tabContent[tab].label}
              </button>
            ))}
          </div>
          <div className="px-6 py-6 text-center">
            <p className="text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">{tabContent[activeTab].value}</p>
            <p className="text-slate-400 text-sm mt-1.5 font-medium">{tabContent[activeTab].sub}</p>
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
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl shadow-xl shadow-blue-500/40 flex items-center justify-center text-2xl transition-all duration-200 active:scale-95 z-20"
        aria-label="Log a shift"
      >
        +
      </Link>
    </>
  );
}
