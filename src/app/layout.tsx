import type { Metadata, Viewport } from "next";

// 전 사이트 서체는 Pretendard 하나로 통일한다. (다이내믹 서브셋 — 쓰는 글자만 내려받음)
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";

import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";

import "./globals.css";

export const metadata: Metadata = {
  title: "LinkScape",
  description: "링크와 PDF를 캔버스에 펼쳐두는 개인 아카이브",
  applicationName: "LinkScape",
  // 설치형(PWA)일 때 iOS 홈화면 앱처럼 동작
  appleWebApp: { capable: true, statusBarStyle: "default", title: "LinkScape" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  // 노치/홈바까지 화면을 꽉 채운다(안전영역은 CSS env() 로 처리)
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: 브라우저 확장이 <html>/<body> 에 속성을 끼워 넣어
    // 생기는 가짜 hydration 경고만 막는다. 자식 요소의 진짜 불일치는 여전히 잡힌다.
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <body
        className="h-full overscroll-none bg-canvas text-ink antialiased"
        suppressHydrationWarning
      >
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
