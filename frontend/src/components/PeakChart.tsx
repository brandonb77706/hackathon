"use client";
/**
 * Bar chart showing top earning windows.
 * Two views:
 *  - By Day:  7 bars (Mon–Sun) showing avg $/hr for that day
 *  - Top Slots: horizontal bars for the top 5 individual (day+hour) windows
 */
import { useState } from "react";
import { PeakWindow } from "@/lib/api";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

interface Props {
  windows: PeakWindow[];
  dataSource: "personal" | "community";
  city?: string;
}

type View = "slots" | "days";

export default function PeakChart({ windows, dataSource, city }: Props) {
  const [view, setView] = useState<View>("slots");

  // ── By-day aggregation ────────────────────────────────────────────────────
  const dayMap: Record<number, { total: number; count: number }> = {};
  for (const w of windows) {
    if (!dayMap[w.day_of_week]) dayMap[w.day_of_week] = { total: 0, count: 0 };
    dayMap[w.day_of_week].total += w.avg_earnings_per_hour;
    dayMap[w.day_of_week].count += 1;
  }
  const dayData = DAYS.map((label, idx) => ({
    label,
    avg: dayMap[idx] ? dayMap[idx].total / dayMap[idx].count : 0,
  }));
  const maxDayEph = Math.max(...dayData.map((d) => d.avg), 1);

  // ── Top slots ─────────────────────────────────────────────────────────────
  const topSlots = [...windows]
    .sort((a, b) => b.avg_earnings_per_hour - a.avg_earnings_per_hour)
    .slice(0, 5);
  const maxSlotEph = Math.max(...topSlots.map((s) => s.avg_earnings_per_hour), 1);

  return (
    <div>
      {/* Source badge */}
      <p className="text-xs text-gray-400 mb-3">
        {dataSource === "personal"
          ? "📊 Based on your shift data"
          : `🌐 Based on ${city || "community"} driver data`}
      </p>

      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView("slots")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            view === "slots"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          Top Windows
        </button>
        <button
          onClick={() => setView("days")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            view === "days"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          By Day
        </button>
      </div>

      {view === "slots" ? (
        /* ── Top 5 horizontal bar chart ─────────────────────────────── */
        <div className="space-y-3">
          {topSlots.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No data yet</p>
          ) : (
            topSlots.map((w, i) => {
              const pct = (w.avg_earnings_per_hour / maxSlotEph) * 100;
              const isTop = i === 0;
              return (
                <div key={`${w.day_of_week}-${w.hour_of_day}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {isTop && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-1.5 py-0.5 rounded">
                          #1
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {DAY_FULL[w.day_of_week]} · {formatHour(w.hour_of_day)}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-green-700">
                      ${w.avg_earnings_per_hour.toFixed(2)}/hr
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-700 ${
                        isTop ? "bg-green-500" : "bg-green-300"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {w.sample_count} shift{w.sample_count !== 1 ? "s" : ""}
                  </p>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ── By-day vertical bar chart ──────────────────────────────── */
        <div className="flex items-end justify-between gap-2 h-40 pt-4">
          {dayData.map(({ label, avg }) => {
            const pct = avg > 0 ? (avg / maxDayEph) * 100 : 0;
            const isTop = avg === maxDayEph && avg > 0;
            return (
              <div key={label} className="flex flex-col items-center gap-1 flex-1">
                {avg > 0 && (
                  <span className="text-[10px] font-bold text-green-700">
                    ${avg.toFixed(0)}
                  </span>
                )}
                <div className="w-full flex items-end" style={{ height: 96 }}>
                  <div
                    className={`w-full rounded-t-md transition-all duration-700 ${
                      isTop ? "bg-green-500" : avg > 0 ? "bg-green-300" : "bg-gray-100"
                    }`}
                    style={{ height: avg > 0 ? `${Math.max(pct, 8)}%` : "8%" }}
                  />
                </div>
                <span
                  className={`text-xs font-medium ${
                    isTop ? "text-green-700" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
