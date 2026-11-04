import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Academy Desk — Dumka Academy",
  description: "A shared workspace for coaches, players, and scouts at Dumka Academy.",
  applicationName: "Academy Desk"
};

export const viewport: Viewport = {
  themeColor: "#f4f7f2",
  colorScheme: "light"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
