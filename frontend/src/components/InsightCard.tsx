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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-base shadow-sm shadow-blue-500/20">
            🤖
          </div>
          <span className="font-bold text-slate-800 tracking-tight">AI Peak Coach</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3.5 py-1.5 rounded-lg disabled:opacity-50 transition-all duration-200 font-semibold shadow-sm shadow-blue-500/20 active:scale-95"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              Thinking…
            </span>
          ) : (
            "Get advice"
          )}
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {error && (
          <p className="text-red-500 text-sm mb-3">{error}</p>
        )}

        {insight ? (
          <div className="space-y-4">
            {/* Chat bubble — top suggestion */}
            <div className="flex gap-3">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                💡
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60 rounded-2xl rounded-tl-sm px-4 py-3 flex-1">
                <p className="text-blue-900 font-semibold text-sm leading-relaxed">
                  {insight.top_suggestion}
                </p>
              </div>
            </div>

            {/* Full insight text */}
            <div className="flex gap-3">
              <div className="w-7 flex-shrink-0" /> {/* spacer to align with bubble */}
              <p className="text-slate-600 text-sm leading-relaxed">{insight.insight_text}</p>
            </div>

            <p className="text-xs text-slate-400 text-right">
              Generated {new Date(insight.generated_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric"
              })}
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-blue-500/20">
              🤖
            </div>
            <p className="text-slate-500 text-sm font-medium">No insights yet</p>
            <p className="text-slate-400 text-xs mt-1">
              Tap "Get advice" to get your first AI recommendation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
