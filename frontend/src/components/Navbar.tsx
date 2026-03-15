"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearApiToken } from "@/lib/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/log-shift", label: "Log Shift" },
  { href: "/history", label: "History" },
  { href: "/profile", label: "Profile" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleSignOut() {
    clearApiToken();
    router.push("/login");
  }

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-10 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link
          href="/dashboard"
          className="font-bold text-slate-900 text-lg flex items-center gap-2 tracking-tight"
        >
          <span>PeakPay</span>
        </Link>
        <div className="flex items-center gap-0.5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                pathname === l.href
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="ml-2 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-150"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
