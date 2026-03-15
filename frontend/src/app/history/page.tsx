"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { fetchMe, fetchShifts, Shift, AuthError } from "@/lib/api";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PLATFORM_LABELS: Record<string, string> = {
  uber: "Uber",
  doordash: "DoorDash",
  lyft: "Lyft",
  instacart: "Instacart",
  other: "Other",
};

export default function HistoryPage() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        const data = await fetchShifts(me.user_id);
        setShifts(data);
      } catch (e) {
        if (e instanceof AuthError) router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const totalEarnings = shifts.reduce(
    (acc, s) => acc + s.earnings + s.tips,
    0
  );
  const totalHours = shifts.reduce((acc, s) => acc + s.hours_worked, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading shifts…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shift History</h1>
          {shifts.length > 0 && (
            <p className="text-slate-400 text-sm mt-0.5">{shifts.length} shifts logged</p>
          )}
        </div>

        {shifts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-blue-100/60 p-14 text-center shadow-sm">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">📋</div>
            <p className="text-slate-600 font-semibold mb-1">No shifts logged yet</p>
            <p className="text-slate-400 text-sm mb-5">Start tracking to see your history here</p>
            <a href="/log-shift" className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/25 transition-all duration-200">
              Log your first shift →
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-blue-100/60 overflow-hidden shadow-sm shadow-blue-500/5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blue-50/60 text-slate-500 text-xs uppercase tracking-wider border-b border-blue-100/60">
                  <tr>
                    <th className="px-4 py-3.5 text-left font-semibold">Date</th>
                    <th className="px-4 py-3.5 text-left font-semibold">Platform</th>
                    <th className="px-4 py-3.5 text-left font-semibold">City</th>
                    <th className="px-4 py-3.5 text-right font-semibold">Hours</th>
                    <th className="px-4 py-3.5 text-right font-semibold">Base pay</th>
                    <th className="px-4 py-3.5 text-right font-semibold">Tips</th>
                    <th className="px-4 py-3.5 text-right font-semibold">$/hr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {shifts.map((s) => (
                    <tr key={s.id} className="hover:bg-blue-50/30 transition-colors duration-100">
                      <td className="px-4 py-3.5 text-slate-700 font-medium">
                        {new Date(s.start_time).toLocaleDateString()}
                        <span className="ml-1.5 text-slate-400 text-xs font-normal bg-slate-100 px-1.5 py-0.5 rounded">
                          {DAYS[s.day_of_week]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                          s.platform === "uber" ? "bg-slate-900 text-white" :
                          s.platform === "doordash" ? "bg-red-500 text-white" :
                          s.platform === "lyft" ? "bg-pink-500 text-white" :
                          s.platform === "instacart" ? "bg-green-500 text-white" :
                          "bg-slate-200 text-slate-700"
                        }`}>
                          {PLATFORM_LABELS[s.platform] || s.platform}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{s.city}</td>
                      <td className="px-4 py-3.5 text-right text-slate-600 tabular-nums">{s.hours_worked.toFixed(1)}h</td>
                      <td className="px-4 py-3.5 text-right text-slate-600 tabular-nums">${s.earnings.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-right text-slate-600 tabular-nums">${s.tips.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`font-bold px-2.5 py-1 rounded-lg text-xs tabular-nums ${
                          s.earnings_per_hour >= 20
                            ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                            : "bg-blue-50 text-blue-700"
                        }`}>
                          ${s.earnings_per_hour.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gradient-to-r from-blue-50 to-indigo-50/40 font-semibold text-slate-700 border-t-2 border-blue-100">
                  <tr>
                    <td className="px-4 py-3.5" colSpan={3}>
                      Total <span className="text-slate-400 font-normal text-xs">({shifts.length} shifts)</span>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{totalHours.toFixed(1)}h</td>
                    <td className="px-4 py-3.5 text-right tabular-nums" colSpan={2}>
                      ${totalEarnings.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-bold text-white bg-blue-600 px-2.5 py-1 rounded-lg text-xs tabular-nums shadow-sm shadow-blue-500/30">
                        ${totalHours > 0 ? (totalEarnings / totalHours).toFixed(2) : "—"}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
