"use client";
/**
 * After next-auth Google sign-in, we hit this page.
 * We redirect to FastAPI's /auth/google which starts the OAuth flow that ends
 * with FastAPI issuing a JWT and redirecting back here with ?token=...
 * We store the JWT in a cookie then redirect to /dashboard.
 */
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setApiToken } from "@/lib/auth";

export default function AuthCallback() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      setApiToken(token);
      router.replace("/dashboard");
    } else {
      // Kick off FastAPI Google OAuth flow
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      window.location.href = `${apiUrl}/auth/google`;
    }
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Signing you in…</p>
    </div>
  );
}
