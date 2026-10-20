import type { Metadata } from "next";
import "./globals.css";
import OfflineStatus from "@/components/offline-status";

export const metadata: Metadata = {
  title: "LeetCode Recall",
  appleWebApp: { capable: true, title: "Recall", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  description: "Keep the problems you've solved fresh in your memory.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<OfflineStatus /></body></html>;
}
