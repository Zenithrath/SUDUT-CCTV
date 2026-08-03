import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SUDUT CCTV | Monitoring Uptime",
  description: "Sistem pelaporan uptime dan downtime CCTV.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
