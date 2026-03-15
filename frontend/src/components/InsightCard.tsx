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
    <div className="bg-white rounded-2xl border border-blue-100/60 shadow-sm shadow-blue-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-blue-50 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-base shadow-md shadow-blue-500/25">
            🤖
          </div>
          <span className="font-bold text-slate-800 tracking-tight">AI Peak Coach</span>
          <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full tracking-wide uppercase">
            ✦ AI Insight
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-200 font-semibold shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40 active:scale-95"
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
          <p className="text-red-500 text-sm mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        {insight ? (
          <div className="space-y-4 animate-fade-in-fast">
            {/* Chat bubble — top suggestion */}
            <div className="flex gap-3">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                💡
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/80 border border-blue-200/50 border-l-4 border-l-blue-500 rounded-2xl rounded-tl-sm px-4 py-3 flex-1">
                <p className="text-blue-900 font-semibold text-sm leading-relaxed">
                  {insight.top_suggestion}
                </p>
              </div>
            </div>

            {/* Full insight text */}
            <div className="flex gap-3">
              <div className="w-7 flex-shrink-0" />
              <p className="text-slate-600 text-sm leading-relaxed">{insight.insight_text}</p>
            </div>

            <p className="text-xs text-slate-400 text-right font-medium">
              · Updated {new Date(insight.generated_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric"
              })}
            </p>
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-xl shadow-blue-500/25">
              🤖
            </div>
            <p className="text-slate-700 text-sm font-semibold">No insights yet</p>
            <p className="text-slate-400 text-xs mt-1.5 max-w-[200px] mx-auto leading-relaxed">
              Tap "Get advice" to get your first AI-powered recommendation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
