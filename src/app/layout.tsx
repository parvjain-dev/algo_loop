import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Algo Loop - DSA Revision Tracker",
  description: "Track your DSA problem revisions with spaced repetition",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen">{children}</body>
    </html>
  );
}
