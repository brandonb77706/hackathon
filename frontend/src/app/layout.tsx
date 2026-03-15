import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "GigWorker Peak Time Optimizer",
  description: "Find your highest-earning windows as a gig driver",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
