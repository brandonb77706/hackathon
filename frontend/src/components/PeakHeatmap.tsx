"use client";
/**
 * 7-column (Mon–Sun) × 24-row (midnight to 11pm) heatmap.
 * Cell color intensity = avg $/hr (white = no data, light→dark green).
 */
import { PeakWindow } from "@/lib/api";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function ephToColor(eph: number, maxEph: number): string {
  if (eph === 0 || maxEph === 0) return "bg-slate-50";
  const intensity = Math.round((eph / maxEph) * 9);
  const shades = [
    "bg-blue-50",
    "bg-blue-100",
    "bg-blue-200",
    "bg-blue-300",
    "bg-blue-400",
    "bg-blue-500",
    "bg-blue-600",
    "bg-blue-700",
    "bg-blue-800",
    "bg-blue-900",
  ];
  return shades[intensity] || "bg-blue-900";
}

function textColor(eph: number, maxEph: number): string {
  if (eph === 0) return "text-slate-200";
  const intensity = Math.round((eph / maxEph) * 9);
  return intensity >= 6 ? "text-white" : "text-slate-700";
}

interface Props {
  windows: PeakWindow[];
  dataSource: "personal" | "community";
  city?: string;
}

export default function PeakHeatmap({ windows, dataSource, city }: Props) {
  // Build lookup map: day -> hour -> {eph, count}
  const lookup = new Map<string, { eph: number; count: number }>();
  let maxEph = 0;

  for (const w of windows) {
    const key = `${w.day_of_week}-${w.hour_of_day}`;
    lookup.set(key, {
      eph: w.avg_earnings_per_hour,
      count: w.sample_count,
    });
    if (w.avg_earnings_per_hour > maxEph) maxEph = w.avg_earnings_per_hour;
  }

  return (
    <div className="overflow-x-auto">
      <div className="mb-2 text-xs text-slate-500 font-medium flex items-center gap-1.5">
        {dataSource === "personal"
          ? <><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />Based on your shift data</>
          : <><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />Based on {city || "community"} driver data</>}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
        {/* Header row */}
        <div className="text-xs text-gray-400 text-right pr-1 pt-1"></div>
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-500 pb-1">
            {d}
          </div>
        ))}

        {/* 24 hour rows */}
        {Array.from({ length: 24 }, (_, hour) => (
          <>
            <div
              key={`label-${hour}`}
              className="text-xs text-slate-400 text-right pr-1 flex items-center justify-end"
              style={{ height: 28 }}
            >
              {formatHour(hour)}
            </div>
            {DAYS.map((_, day) => {
              const key = `${day}-${hour}`;
              const cell = lookup.get(key);
              const eph = cell?.eph ?? 0;
              const count = cell?.count ?? 0;

              return (
                <div
                  key={`${day}-${hour}`}
                  className={`relative group border border-white ${ephToColor(eph, maxEph)} ${textColor(eph, maxEph)}`}
                  style={{ height: 28 }}
                  title={eph > 0 ? `$${eph}/hr · ${count} shift${count !== 1 ? "s" : ""}` : "No data"}
                >
                  {eph > 0 && (
                    <span className="text-[9px] font-bold absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
                      ${eph}
                    </span>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-slate-400">Low</span>
        {["bg-blue-100", "bg-blue-300", "bg-blue-500", "bg-blue-700", "bg-blue-900"].map(
          (c) => (
            <div key={c} className={`w-5 h-3 rounded ${c}`} />
          )
        )}
        <span className="text-xs text-slate-400">High $/hr</span>
      </div>
    </div>
  );
}
