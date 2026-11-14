import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";
import { GenerationProvider } from "./ai-round/GenerationProvider";

export const metadata: Metadata = {
  title: "Algo Loop - DSA Revision Tracker",
  description: "Track your DSA problem revisions with spaced repetition",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        {/* Keeps AI Round problem generation running while you move between pages. */}
        <GenerationProvider>{children}</GenerationProvider>
      </body>
    </html>
  );
}
