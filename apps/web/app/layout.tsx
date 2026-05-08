import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PMO 업무수행 관리시스템",
  description: "PMO 업무수행 관리시스템 MVP scaffold"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
