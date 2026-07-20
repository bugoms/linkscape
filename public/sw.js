/* LinkScape 서비스워커 — 설치형(PWA) 최소 요건 + 오프라인 셸 폴백.
 *
 * 전략: 같은 오리진 GET 만 "네트워크 우선, 실패 시 캐시"로 처리한다.
 *  - 온라인이면 항상 최신(네트워크 우선)이라 stale 문제 없음
 *  - 오프라인이면 마지막으로 받은 셸/자산을 돌려줌
 *  - Supabase 등 외부 오리진·쓰기(non-GET)·/api/* 는 절대 손대지 않음
 */
const CACHE = "linkscape-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // 쓰기는 건드리지 않음

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase 등 외부는 통과
  if (url.pathname.startsWith("/api/")) return; // 서버 함수는 항상 네트워크

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        // 정상 응답만 캐시(불투명/에러 제외)
        if (fresh && fresh.status === 200 && fresh.type === "basic") {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        throw err;
      }
    })(),
  );
});
