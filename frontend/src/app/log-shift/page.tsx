"use client";
import { useState, useEffect, useRef } from "react";
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

const US_CITIES = [
  "Akron, OH", "Albuquerque, NM", "Anaheim, CA", "Anchorage, AK", "Arlington, TX",
  "Atlanta, GA", "Austin, TX", "Bakersfield, CA", "Baltimore, MD", "Baton Rouge, LA",
  "Birmingham, AL", "Boston, MA", "Buffalo, NY", "Charlotte, NC", "Chicago, IL",
  "Cincinnati, OH", "Cleveland, OH", "Colorado Springs, CO", "Columbus, OH", "Corpus Christi, TX",
  "Dallas, TX", "Denver, CO", "Detroit, MI", "El Paso, TX", "Fort Wayne, IN",
  "Fort Worth, TX", "Fresno, CA", "Greensboro, NC", "Henderson, NV", "Honolulu, HI",
  "Houston, TX", "Indianapolis, IN", "Irving, TX", "Jacksonville, FL", "Jersey City, NJ",
  "Kansas City, MO", "Las Vegas, NV", "Laredo, TX", "Lexington, KY", "Lincoln, NE",
  "Long Beach, CA", "Los Angeles, CA", "Louisville, KY", "Madison, WI", "Memphis, TN",
  "Mesa, AZ", "Miami, FL", "Milwaukee, WI", "Minneapolis, MN", "Nashville, TN",
  "New Orleans, LA", "New York, NY", "Newark, NJ", "Norfolk, VA", "Oakland, CA",
  "Oklahoma City, OK", "Omaha, NE", "Orlando, FL", "Philadelphia, PA", "Phoenix, AZ",
  "Pittsburgh, PA", "Plano, TX", "Portland, OR", "Raleigh, NC", "Reno, NV",
  "Richmond, VA", "Riverside, CA", "Sacramento, CA", "San Antonio, TX", "San Diego, CA",
  "San Francisco, CA", "San Jose, CA", "Santa Ana, CA", "Seattle, WA", "St. Louis, MO",
  "St. Paul, MN", "Stockton, CA", "Tampa, FL", "Toledo, OH", "Tucson, AZ",
  "Tulsa, OK", "Virginia Beach, VA", "Washington, DC", "Wichita, KS", "Winston-Salem, NC",
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

  const citySuggestions = cityQuery.length >= 2
    ? US_CITIES.filter((c) => c.toLowerCase().includes(cityQuery.toLowerCase())).slice(0, 6)
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

  function handleTimesNext() {
    if (!form.start_time || !form.end_time) {
      setError("Please fill in both start and end times.");
      return;
    }
    if (new Date(form.end_time) <= new Date(form.start_time)) {
      setError("End time must be after start time.");
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
      await logShift({
        platform: form.platform,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
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
      <main className="max-w-md mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    s < step
                      ? "bg-green-600 text-white"
                      : s === step
                      ? "bg-green-600 text-white ring-4 ring-green-100"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {s < step ? "✓" : s}
                </div>
                <span className={`text-xs ${s === step ? "text-green-700 font-medium" : "text-gray-400"}`}>
                  {stepLabels[s - 1]}
                </span>
              </div>
              {s < 3 && (
                <div className={`w-10 h-0.5 mb-4 ${s < step ? "bg-green-600" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Back button */}
        {step > 1 && (
          <button
            onClick={() => { setError(null); setStep((s) => (s - 1) as Step); }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition"
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
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Which platform?</h1>
            <p className="text-gray-400 text-sm mb-6">Tap to select and continue</p>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePlatform(p.id)}
                  className="flex flex-col items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-green-500 hover:shadow-md rounded-2xl py-6 transition-all active:scale-95"
                >
                  <span className="text-3xl">{p.icon}</span>
                  <span className="font-semibold text-gray-700">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Times ────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">When did you work?</h1>
            <p className="text-gray-400 text-sm mb-6">
              {PLATFORMS.find((p) => p.id === form.platform)?.icon}{" "}
              {form.platform.charAt(0).toUpperCase() + form.platform.slice(1)} shift
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start time</label>
                <input
                  type="datetime-local"
                  value={form.start_time}
                  onChange={(e) => set("start_time", e.target.value)}
                  className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl px-4 py-3 text-base focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End time</label>
                <input
                  type="datetime-local"
                  value={form.end_time}
                  onChange={(e) => set("end_time", e.target.value)}
                  className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl px-4 py-3 text-base focus:outline-none transition"
                />
              </div>
            </div>
            <button
              onClick={handleTimesNext}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-semibold text-base transition active:scale-95"
            >
              Next →
            </button>
          </div>
        )}

        {/* ── Step 3: Pay ──────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">How much did you earn?</h1>
            <p className="text-gray-400 text-sm mb-6">Almost done!</p>
            <div className="space-y-4">
              {/* Base pay */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base pay</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-base pointer-events-none">$</span>
                  <input
                    type="number"
                    value={form.earnings}
                    onChange={(e) => set("earnings", e.target.value)}
                    onBlur={(e) => set("earnings", formatMoney(e.target.value))}
                    min="0"
                    step="1"
                    placeholder="0.00"
                    inputMode="decimal"
                    className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl pl-8 pr-4 py-3 text-base focus:outline-none transition"
                  />
                </div>
                {form.earnings && (
                  <p className="text-xs text-gray-400 mt-1 pl-1">
                    = ${parseFloat(form.earnings || "0").toFixed(2)}
                  </p>
                )}
              </div>

              {/* Tips */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tips <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-base pointer-events-none">$</span>
                  <input
                    type="number"
                    value={form.tips}
                    onChange={(e) => set("tips", e.target.value)}
                    onBlur={(e) => set("tips", formatMoney(e.target.value))}
                    min="0"
                    step="1"
                    placeholder="0.00"
                    inputMode="decimal"
                    className="w-full border-2 border-gray-200 focus:border-green-500 rounded-xl pl-8 pr-4 py-3 text-base focus:outline-none transition"
                  />
                </div>
                {form.tips && (
                  <p className="text-xs text-gray-400 mt-1 pl-1">
                    = ${parseFloat(form.tips || "0").toFixed(2)}
                  </p>
                )}
              </div>

              {/* City autocomplete */}
              <div ref={cityRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
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
                    className={`w-full border-2 rounded-xl px-4 py-3 text-base focus:outline-none transition ${
                      form.city
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 focus:border-green-500"
                    }`}
                  />
                  {form.city && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 text-lg">✓</span>
                  )}

                  {showCitySuggestions && citySuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
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
                            className="w-full text-left px-4 py-3 text-sm hover:bg-green-50 hover:text-green-700 transition border-b border-gray-100 last:border-0"
                          >
                            📍 {city}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {!form.city && cityQuery.length >= 2 && citySuggestions.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1 pl-1">No matching cities found. Try a different spelling.</p>
                )}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-semibold text-base transition active:scale-95 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Log Shift"}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
