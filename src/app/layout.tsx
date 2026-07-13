import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

/**
 * SF Pro 는 애플 전용 폰트다. macOS/iOS 에서는 -apple-system 이 진짜 SF Pro 로 해석되고,
 * 그 외 플랫폼에서는 가장 가까운 오픈소스 대체인 Inter 로 떨어진다. (DESIGN-apple.md)
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "pdflinkin",
  description: "링크와 PDF를 캔버스에 펼쳐두는 개인 아카이브",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`h-full ${inter.variable}`}>
      <body className="h-full overscroll-none bg-canvas text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
