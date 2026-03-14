"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import PeakHeatmap from "@/components/PeakHeatmap";
import InsightCard from "@/components/InsightCard";
import {
  fetchMe,
  fetchEarningsSummary,
  fetchPeakTimes,
  fetchLatestInsight,
  EarningsSummary,
  PeakTimesResponse,
  Insight,
} from "@/lib/api";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ user_id: string; name?: string; city?: string } | null>(null);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [peaks, setPeaks] = useState<PeakTimesResponse | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        setUser(me);

        const [sum, pk, ins] = await Promise.all([
          fetchEarningsSummary(me.user_id),
          fetchPeakTimes(me.user_id, me.city || "Toledo, OH"),
          fetchLatestInsight(me.user_id),
        ]);

        setSummary(sum);
        setPeaks(pk);
        setInsight(ins);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
          </h1>
          <Link
            href="/log-shift"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
          >
            + Log a shift
          </Link>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              label="Earned this week"
              value={`$${summary.total_this_week.toFixed(2)}`}
              icon="💵"
            />
            <SummaryCard
              label="Avg $/hr (all time)"
              value={`$${summary.avg_per_hour_all_time.toFixed(2)}`}
              icon="📈"
            />
            <SummaryCard
              label="Best shift ever"
              value={summary.best_shift_amount ? `$${summary.best_shift_amount.toFixed(2)}` : "—"}
              sub={summary.best_shift_date ?? undefined}
              icon="🏆"
            />
            <SummaryCard
              label="Hours this week"
              value={`${summary.hours_this_week.toFixed(1)}h`}
              icon="⏱️"
            />
          </div>
        )}

        {/* Peak time heatmap */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-800 mb-4">Peak Earning Windows</h2>
          {peaks ? (
            <PeakHeatmap
              windows={peaks.windows}
              dataSource={peaks.data_source}
              city={user?.city ?? undefined}
            />
          ) : (
            <p className="text-gray-400 text-sm">No data yet. Log some shifts!</p>
          )}
        </div>

        {/* AI Insight */}
        {user && (
          <InsightCard
            insight={insight}
            userId={user.user_id}
            onRefresh={setInsight}
          />
        )}
      </main>
    </>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
