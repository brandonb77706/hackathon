"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { fetchMe, logShift } from "@/lib/api";

const PLATFORMS = [
  { id: "uber", label: "Uber", icon: "🚗" },
  { id: "doordash", label: "DoorDash", icon: "🛵" },
  { id: "lyft", label: "Lyft", icon: "🟣" },
  { id: "instacart", label: "Instacart", icon: "🛒" },
  { id: "other", label: "Other", icon: "📦" },
] as const;

const PLATFORM_LOGOS: Record<string, React.ReactNode> = {
  uber: (
    <div className="w-full flex flex-col items-center gap-2.5">
      <div className="w-16 h-16 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center p-2.5 overflow-hidden">
        <img
          src="/logos/uber.svg"
          alt="Uber"
          className="w-full h-full object-contain"
        />
      </div>
      <span className="font-semibold text-slate-700 text-sm">Uber</span>
    </div>
  ),
  doordash: (
    <div className="w-full flex flex-col items-center gap-2.5">
      <div className="w-16 h-16 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center p-2.5 overflow-hidden">
        <img
          src="/logos/doordash.png"
          alt="DoorDash"
          className="w-full h-full object-contain"
        />
      </div>
      <span className="font-semibold text-slate-700 text-sm">DoorDash</span>
    </div>
  ),
  lyft: (
    <div className="w-full flex flex-col items-center gap-2.5">
      <div className="w-16 h-16 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center p-2.5 overflow-hidden">
        <img
          src="/logos/lyft.svg"
          alt="Lyft"
          className="w-full h-full object-contain"
        />
      </div>
      <span className="font-semibold text-slate-700 text-sm">Lyft</span>
    </div>
  ),
  instacart: (
    <div className="w-full flex flex-col items-center gap-2.5">
      <div className="w-16 h-16 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center p-2.5 overflow-hidden">
        <img
          src="/logos/instacart.png"
          alt="Instacart"
          className="w-full h-full object-contain"
        />
      </div>
      <span className="font-semibold text-slate-700 text-sm">Instacart</span>
    </div>
  ),
  other: (
    <div className="w-full flex flex-col items-center gap-2.5">
      <div className="w-16 h-16 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
        <svg
          className="w-7 h-7 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
          />
        </svg>
      </div>
      <span className="font-semibold text-slate-700 text-sm">Other</span>
    </div>
  ),
};

const US_CITIES = [
  "Akron, OH",
  "Albuquerque, NM",
  "Anaheim, CA",
  "Anchorage, AK",
  "Arlington, TX",
  "Atlanta, GA",
  "Austin, TX",
  "Bakersfield, CA",
  "Baltimore, MD",
  "Baton Rouge, LA",
  "Birmingham, AL",
  "Boston, MA",
  "Buffalo, NY",
  "Charlotte, NC",
  "Chicago, IL",
  "Cincinnati, OH",
  "Cleveland, OH",
  "Colorado Springs, CO",
  "Columbus, OH",
  "Corpus Christi, TX",
  "Dallas, TX",
  "Denver, CO",
  "Detroit, MI",
  "El Paso, TX",
  "Fort Wayne, IN",
  "Fort Worth, TX",
  "Fresno, CA",
  "Greensboro, NC",
  "Henderson, NV",
  "Honolulu, HI",
  "Houston, TX",
  "Indianapolis, IN",
  "Irving, TX",
  "Jacksonville, FL",
  "Jersey City, NJ",
  "Kansas City, MO",
  "Las Vegas, NV",
  "Laredo, TX",
  "Lexington, KY",
  "Lincoln, NE",
  "Long Beach, CA",
  "Los Angeles, CA",
  "Louisville, KY",
  "Madison, WI",
  "Memphis, TN",
  "Mesa, AZ",
  "Miami, FL",
  "Milwaukee, WI",
  "Minneapolis, MN",
  "Nashville, TN",
  "New Orleans, LA",
  "New York, NY",
  "Newark, NJ",
  "Norfolk, VA",
  "Oakland, CA",
  "Oklahoma City, OK",
  "Omaha, NE",
  "Orlando, FL",
  "Philadelphia, PA",
  "Phoenix, AZ",
  "Pittsburgh, PA",
  "Plano, TX",
  "Portland, OR",
  "Raleigh, NC",
  "Reno, NV",
  "Richmond, VA",
  "Riverside, CA",
  "Sacramento, CA",
  "San Antonio, TX",
  "San Diego, CA",
  "San Francisco, CA",
  "San Jose, CA",
  "Santa Ana, CA",
  "Seattle, WA",
  "St. Louis, MO",
  "St. Paul, MN",
  "Stockton, CA",
  "Tampa, FL",
  "Toledo, OH",
  "Tucson, AZ",
  "Tulsa, OK",
  "Virginia Beach, VA",
  "Washington, DC",
  "Wichita, KS",
  "Winston-Salem, NC",
];

type Step = 1 | 2 | 3;

/** Format a raw string to $xx.xx on blur */
function formatMoney(raw: string): string {
  const n = parseFloat(raw);
  if (isNaN(n) || raw === "") return "";
  return n.toFixed(2);
}

export default function LogShiftPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    platform: "",
    shift_date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    start_time: "",
    end_time: "",
    earnings: "",
    tips: "",
    city: "",
  });

  // City autocomplete
  const [cityQuery, setCityQuery] = useState("");
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);

  const citySuggestions =
    cityQuery.length >= 2
      ? US_CITIES.filter((c) =>
          c.toLowerCase().includes(cityQuery.toLowerCase())
        ).slice(0, 6)
      : [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setShowCitySuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    fetchMe().then((me) => {
      const c = me.city || "";
      setForm((f) => ({ ...f, city: c }));
      setCityQuery(c);
    });
  }, []);

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handlePlatform(id: string) {
    set("platform", id);
    setStep(2);
  }

  function buildDateTime(date: string, time: string): Date {
    return new Date(`${date}T${time}`);
  }

  function handleTimesNext() {
    if (!form.shift_date || !form.start_time || !form.end_time) {
      setError("Please fill in the date, start time, and end time.");
      return;
    }
    const start = buildDateTime(form.shift_date, form.start_time);
    // If end time is earlier than start (overnight shift), add 1 day
    let end = buildDateTime(form.shift_date, form.end_time);
    if (end <= start) {
      const next = new Date(end);
      next.setDate(next.getDate() + 1);
      end = next;
    }
    if ((end.getTime() - start.getTime()) > 24 * 60 * 60 * 1000) {
      setError("Shift cannot be longer than 24 hours.");
      return;
    }
    setError(null);
    setStep(3);
  }

  async function handleSubmit() {
    if (!form.earnings) {
      setError("Please enter your base pay.");
      return;
    }
    if (!form.city) {
      setError("Please select a city.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const startDt = buildDateTime(form.shift_date, form.start_time);
      let endDt = buildDateTime(form.shift_date, form.end_time);
      if (endDt <= startDt) endDt.setDate(endDt.getDate() + 1);
      await logShift({
        platform: form.platform,
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        earnings: parseFloat(form.earnings),
        tips: form.tips ? parseFloat(form.tips) : 0,
        city: form.city,
      });
      router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to log shift");
    } finally {
      setSubmitting(false);
    }
  }

  const stepLabels = ["Platform", "Times", "Pay"];

  return (
    <>
      <Navbar />
      <main className="max-w-md mx-auto px-4 py-8 animate-fade-in">
        {/* Progress */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                    s < step
                      ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/30"
                      : s === step
                      ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-4 ring-blue-100 shadow-sm shadow-blue-500/30"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {s < step ? "✓" : s}
                </div>
                <span
                  className={`text-xs ${
                    s === step ? "text-blue-700 font-medium" : "text-slate-400"
                  }`}
                >
                  {stepLabels[s - 1]}
                </span>
              </div>
              {s < 3 && (
                <div
                  className={`w-10 h-0.5 mb-4 transition-all duration-300 ${
                    s < step
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600"
                      : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Back button */}
        {step > 1 && (
          <button
            onClick={() => {
              setError(null);
              setStep((s) => (s - 1) as Step);
            }}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
          >
            ← Back
          </button>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* ── Step 1: Platform ─────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">
              Which platform?
            </h1>
            <p className="text-slate-400 text-sm mb-6">
              Tap to select and continue
            </p>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePlatform(p.id)}
                  className="flex flex-col items-center justify-center bg-white border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-lg hover:shadow-blue-500/10 rounded-2xl py-5 px-4 transition-all duration-200 active:scale-95 w-full"
                >
                  <div className="flex items-center justify-center">
                    {PLATFORM_LOGOS[p.id]}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Times ────────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">
              When did you work?
            </h1>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 flex items-center justify-center">
                {form.platform === "uber" && (
                  <img
                    src="/logos/uber.svg"
                    alt="Uber"
                    className="w-full h-full object-contain"
                  />
                )}
                {form.platform === "doordash" && (
                  <img
                    src="/logos/doordash.png"
                    alt="DoorDash"
                    className="w-full h-full object-contain"
                  />
                )}
                {form.platform === "lyft" && (
                  <img
                    src="/logos/lyft.svg"
                    alt="Lyft"
                    className="w-full h-full object-contain"
                  />
                )}
                {form.platform === "instacart" && (
                  <img
                    src="/logos/instacart.png"
                    alt="Instacart"
                    className="w-full h-full object-contain"
                  />
                )}
                {form.platform === "other" && (
                  <svg
                    className="w-full h-full text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
                    />
                  </svg>
                )}
              </div>
              <p className="text-slate-400 text-sm">
                {form.platform.charAt(0).toUpperCase() + form.platform.slice(1)}{" "}
                shift
              </p>
            </div>
            <div className="space-y-4">
              {/* Date — picked once */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={form.shift_date}
                  onChange={(e) => set("shift_date", e.target.value)}
                  className="w-full border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-base focus:outline-none transition-all duration-200 bg-white"
                />
              </div>

              {/* Start & End times side-by-side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => set("start_time", e.target.value)}
                    className="w-full border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-base focus:outline-none transition-all duration-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    End time
                  </label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => set("end_time", e.target.value)}
                    className="w-full border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-base focus:outline-none transition-all duration-200 bg-white"
                  />
                </div>
              </div>
              {form.start_time && form.end_time && form.shift_date && (() => {
                const start = buildDateTime(form.shift_date, form.start_time);
                let end = buildDateTime(form.shift_date, form.end_time);
                if (end <= start) end = new Date(end.getTime() + 86400000);
                const hrs = ((end.getTime() - start.getTime()) / 3600000).toFixed(1);
                return (
                  <p className="text-xs text-slate-400 pl-1">
                    Duration: <span className="font-medium text-slate-600">{hrs} hrs</span>
                    {end.getDate() !== start.getDate() && (
                      <span className="ml-1 text-amber-500">(ends next day)</span>
                    )}
                  </p>
                );
              })()}
            </div>
            <button
              onClick={handleTimesNext}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-semibold text-base transition-all duration-200 active:scale-[0.98] shadow-lg shadow-blue-500/25"
            >
              Next →
            </button>
          </div>
        )}

        {/* ── Step 3: Pay ──────────────────────────────────────────── */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">
              How much did you earn?
            </h1>
            <p className="text-slate-400 text-sm mb-6">Almost done!</p>
            <div className="space-y-4">
              {/* Base pay */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Base pay
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-base pointer-events-none">
                    $
                  </span>
                  <input
                    type="number"
                    value={form.earnings}
                    onChange={(e) => set("earnings", e.target.value)}
                    onBlur={(e) => set("earnings", formatMoney(e.target.value))}
                    min="0"
                    step="1"
                    placeholder="0.00"
                    inputMode="decimal"
                    className="w-full border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl pl-8 pr-4 py-3 text-base focus:outline-none transition-all duration-200 bg-white"
                  />
                </div>
                {form.earnings && (
                  <p className="text-xs text-slate-400 mt-1 pl-1">
                    = ${parseFloat(form.earnings || "0").toFixed(2)}
                  </p>
                )}
              </div>

              {/* Tips */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tips{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-base pointer-events-none">
                    $
                  </span>
                  <input
                    type="number"
                    value={form.tips}
                    onChange={(e) => set("tips", e.target.value)}
                    onBlur={(e) => set("tips", formatMoney(e.target.value))}
                    min="0"
                    step="1"
                    placeholder="0.00"
                    inputMode="decimal"
                    className="w-full border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl pl-8 pr-4 py-3 text-base focus:outline-none transition-all duration-200 bg-white"
                  />
                </div>
                {form.tips && (
                  <p className="text-xs text-slate-400 mt-1 pl-1">
                    = ${parseFloat(form.tips || "0").toFixed(2)}
                  </p>
                )}
              </div>

              {/* City autocomplete */}
              <div ref={cityRef}>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  City
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cityQuery}
                    onChange={(e) => {
                      setCityQuery(e.target.value);
                      set("city", ""); // clear confirmed selection when typing
                      setShowCitySuggestions(true);
                    }}
                    onFocus={() => setShowCitySuggestions(true)}
                    placeholder="Type your city…"
                    autoComplete="off"
                    className={`w-full border-2 rounded-xl px-4 py-3 text-base focus:outline-none transition-all duration-200 bg-white ${
                      form.city
                        ? "border-blue-500 bg-blue-50/50 focus:ring-4 focus:ring-blue-500/10"
                        : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    }`}
                  />
                  {form.city && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 text-lg">
                      ✓
                    </span>
                  )}

                  {showCitySuggestions && citySuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                      {citySuggestions.map((city) => (
                        <li key={city}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                            onClick={() => {
                              setCityQuery(city);
                              set("city", city);
                              setShowCitySuggestions(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-slate-100 last:border-0"
                          >
                            📍 {city}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {!form.city &&
                  cityQuery.length >= 2 &&
                  citySuggestions.length === 0 && (
                    <p className="text-xs text-slate-400 mt-1 pl-1">
                      No matching cities found. Try a different spelling.
                    </p>
                  )}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-semibold text-base transition-all duration-200 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-blue-500/25"
            >
              {submitting ? "Saving…" : "Log Shift"}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
