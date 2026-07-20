import type { MetadataRoute } from "next";

/**
 * 웹 앱 매니페스트 — 설치형(PWA)과 Android "공유로 담기"의 근간.
 * (Next 가 app/manifest.ts 를 /manifest.webmanifest 로 서빙하고 <link rel="manifest"> 자동 삽입)
 *
 * share_target: 안드로이드에서 다른 앱의 공유 시트에 LinkScape 가 뜨고,
 * 링크/텍스트를 공유하면 /share 로 넘어와 카드로 담긴다(네이티브 코드 없이).
 */
export default function manifest(): MetadataRoute.Manifest {
  const base: MetadataRoute.Manifest = {
    name: "LinkScape",
    short_name: "LinkScape",
    description: "링크와 PDF를 캔버스에 펼쳐두는 개인 아카이브",
    start_url: "/board",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f5f5f7",
    theme_color: "#ffffff",
    lang: "ko",
    dir: "ltr",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };

  // share_target 은 표준 매니페스트 확장이라 Next 타입에 없어 스프레드+캐스팅으로 얹는다.
  return {
    ...base,
    share_target: {
      action: "/share",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  } as MetadataRoute.Manifest;
}
