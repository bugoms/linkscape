import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor 설정 — 네이티브 셸(Android/iOS)이 LinkScape 웹앱을 감싼다.
 *
 * 1차(현재): `server.url` 로 배포된 웹앱을 로드하는 하이브리드 PoC.
 *   → 에뮬레이터/실기기에서 바로 전체 기능이 도는 앱이 된다.
 * 다음(P1): Next 를 정적 번들로 내보내 `webDir` 에 넣고 `server.url` 제거 →
 *   서버 없이 자립하는 앱 + 네이티브 공유(Share Intent) 연동. (app-plan.md 참고)
 *
 * iOS 는 macOS/Xcode 가 있어야 `npx cap add ios` 로 추가·빌드 가능(Windows 불가).
 */
const config: CapacitorConfig = {
  appId: "app.linkscape",
  appName: "LinkScape",
  webDir: "capacitor-shell",
  server: {
    url: "https://pdflinkin.vercel.app",
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
