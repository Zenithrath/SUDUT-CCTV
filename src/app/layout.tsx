import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SUDUT CCTV | Laporan Harian",
  description: "Laporan uptime dan downtime CCTV harian.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
