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
        <p className="text-gray-400">Loading shifts…</p>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Shift History</h1>

        {shifts.length === 0 ? (
          <p className="text-gray-500">
            No shifts logged yet.{" "}
            <a href="/log-shift" className="text-green-600 underline">
              Log your first shift
            </a>
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Platform</th>
                    <th className="px-4 py-3 text-left">City</th>
                    <th className="px-4 py-3 text-right">Hours</th>
                    <th className="px-4 py-3 text-right">Base pay</th>
                    <th className="px-4 py-3 text-right">Tips</th>
                    <th className="px-4 py-3 text-right">$/hr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shifts.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">
                        {new Date(s.start_time).toLocaleDateString()}
                        <span className="ml-1 text-gray-400 text-xs">
                          {DAYS[s.day_of_week]}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {PLATFORM_LABELS[s.platform] || s.platform}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.city}</td>
                      <td className="px-4 py-3 text-right">{s.hours_worked.toFixed(1)}h</td>
                      <td className="px-4 py-3 text-right">${s.earnings.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">${s.tips.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">
                        ${s.earnings_per_hour.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold text-gray-700">
                  <tr>
                    <td className="px-4 py-3" colSpan={3}>
                      Total ({shifts.length} shifts)
                    </td>
                    <td className="px-4 py-3 text-right">{totalHours.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-right" colSpan={2}>
                      ${totalEarnings.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700">
                      ${totalHours > 0 ? (totalEarnings / totalHours).toFixed(2) : "—"}
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
