"use client";
/**
 * After next-auth Google sign-in completes, this page:
 * 1. Exchanges the Google access token for a FastAPI JWT.
 * 2. Stores the JWT in a cookie.
 * 3. If new user (no city), shows a city picker before continuing.
 * 4. Redirects to /dashboard.
 */
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { setApiToken } from "@/lib/auth";
import { fetchMe, updateUser } from "@/lib/api";

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

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Onboarding state
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);

  const suggestions = cityQuery.length >= 2
    ? US_CITIES.filter((c) => c.toLowerCase().includes(cityQuery.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    async function exchange() {
      try {
        const res = await fetch("/api/auth/fastapi-token");
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Auth failed");
        }
        const { token } = await res.json();
        setApiToken(token);

        // Check if new user (no city set)
        const me = await fetchMe();
        if (!me.city) {
          setUserId(me.user_id);
          setShowCityPicker(true);
        } else {
          router.replace("/dashboard");
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Authentication failed");
      }
    }
    exchange();
  }, [router]);

  async function handleCitySubmit() {
    if (!selectedCity || !userId) return;
    setSaving(true);
    try {
      await updateUser(userId, { city: selectedCity });
      router.replace("/dashboard");
    } catch {
      setError("Failed to save city. Please try again.");
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <button onClick={() => router.push("/login")} className="text-sm text-green-600 underline">
          Back to sign in
        </button>
      </div>
    );
  }

  if (showCityPicker) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🚗</div>
            <h1 className="text-2xl font-bold text-gray-800">One last thing!</h1>
            <p className="text-gray-400 text-sm mt-1">
              Where do you drive? We'll use this to show you local peak hours and community earnings.
            </p>
          </div>

          {/* City autocomplete */}
          <div ref={cityRef} className="relative mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Your city</label>
            <input
              type="text"
              value={cityQuery}
              onChange={(e) => {
                setCityQuery(e.target.value);
                setSelectedCity("");
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Type your city…"
              autoComplete="off"
              autoFocus
              className={`w-full border-2 rounded-xl px-4 py-3 text-base focus:outline-none transition ${
                selectedCity ? "border-green-500 bg-green-50" : "border-gray-200 focus:border-green-500"
              }`}
            />
            {selectedCity && (
              <span className="absolute right-3 top-[42px] text-green-600 text-lg">✓</span>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {suggestions.map((city) => (
                  <li key={city}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setCityQuery(city);
                        setSelectedCity(city);
                        setShowSuggestions(false);
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

          <button
            onClick={handleCitySubmit}
            disabled={!selectedCity || saving}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-semibold text-base transition disabled:opacity-40"
          >
            {saving ? "Saving…" : "Let's go →"}
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            You can change this anytime in your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Signing you in…</p>
    </div>
  );
}
