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
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 tracking-tight">Shift History</h1>

        {shifts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
            <p className="text-slate-500 mb-2">No shifts logged yet.</p>
            <a href="/log-shift" className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
              Log your first shift →
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200/60">
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
                <tbody className="divide-y divide-slate-100">
                  {shifts.map((s) => (
                    <tr key={s.id} className="hover:bg-blue-50/40 transition-colors duration-100">
                      <td className="px-4 py-3.5 text-slate-700 font-medium">
                        {new Date(s.start_time).toLocaleDateString()}
                        <span className="ml-1 text-slate-400 text-xs font-normal">
                          {DAYS[s.day_of_week]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 capitalize">
                        {PLATFORM_LABELS[s.platform] || s.platform}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{s.city}</td>
                      <td className="px-4 py-3.5 text-right text-slate-600">{s.hours_worked.toFixed(1)}h</td>
                      <td className="px-4 py-3.5 text-right text-slate-600">${s.earnings.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-right text-slate-600">${s.tips.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg text-xs">
                          ${s.earnings_per_hour.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gradient-to-r from-slate-50 to-blue-50/30 font-semibold text-slate-700 border-t border-slate-200">
                  <tr>
                    <td className="px-4 py-3.5" colSpan={3}>
                      Total <span className="text-slate-400 font-normal">({shifts.length} shifts)</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">{totalHours.toFixed(1)}h</td>
                    <td className="px-4 py-3.5 text-right" colSpan={2}>
                      ${totalEarnings.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg text-xs">
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
