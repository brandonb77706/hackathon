"use client";
import { useState } from "react";
import { Insight, refreshInsight } from "@/lib/api";

interface Props {
  insight: Insight | null;
  userId: string;
  onRefresh: (i: Insight) => void;
}

export default function InsightCard({ insight, userId, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefresh() {
    setLoading(true);
    setError(null);
    try {
      const newInsight = await refreshInsight(userId);
      if (newInsight) onRefresh(newInsight);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to refresh");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-green-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-green-800 flex items-center gap-2">
          🤖 AI Peak Coach
        </h2>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition"
        >
          {loading ? "Thinking…" : "Refresh AI advice"}
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-sm mb-2">{error}</p>
      )}

      {insight ? (
        <>
          <div className="bg-green-700 text-white rounded-lg px-4 py-3 mb-3">
            <p className="text-xs uppercase tracking-wide opacity-75 mb-1">Top suggestion</p>
            <p className="font-semibold">{insight.top_suggestion}</p>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{insight.insight_text}</p>
          <p className="text-xs text-gray-400 mt-3">
            Generated {new Date(insight.generated_at).toLocaleDateString()}
          </p>
        </>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm mb-3">
            No insights yet. Click "Refresh AI advice" to get your first recommendation.
          </p>
        </div>
      )}
    </div>
  );
}
