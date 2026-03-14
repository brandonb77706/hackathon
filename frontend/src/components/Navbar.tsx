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
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/dashboard" className="font-bold text-green-700 text-lg flex items-center gap-2">
          🚗 GigOptimizer
        </Link>
        <div className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                pathname === l.href
                  ? "bg-green-100 text-green-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="ml-2 px-3 py-1.5 rounded-md text-sm text-gray-500 hover:bg-gray-100 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
