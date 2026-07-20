"use client";

import { useEffect } from "react";

/** /sw.js 등록 — 설치형(PWA)·오프라인 셸을 켠다. 실패해도 앱 동작엔 영향 없음. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* 등록 실패는 조용히 무시 (앱은 그대로 동작) */
      });
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
