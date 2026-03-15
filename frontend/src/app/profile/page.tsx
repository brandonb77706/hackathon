"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { fetchMe, updateUser, AuthError } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMe()
      .then((me) => {
        setUserId(me.user_id);
        setName(me.name || "");
        setEmail(me.email || "");
        setCity(me.city || "");
      })
      .catch((e) => { if (e instanceof AuthError) router.push("/login"); });
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateUser(userId, { city });
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 tracking-tight">Profile</h1>

        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-5 shadow-sm"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              readOnly
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Email is for display only — your identity is tied to your Google account.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              City <span className="text-slate-400 font-normal">(editable)</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Toledo, OH"
              className="w-full border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-all duration-200"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Used to show community peak data when you have fewer than 5 shifts.
            </p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {saved && (
            <p className="text-blue-600 text-sm font-medium flex items-center gap-1.5">
              <span className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center text-xs">✓</span>
              Changes saved!
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2.5 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 shadow-sm shadow-blue-500/20 active:scale-[0.98]"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </main>
    </>
  );
}
