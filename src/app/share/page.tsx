"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { extractUrls, faviconFallback, hostname } from "@/lib/url";

/**
 * PWA share_target 착지 지점 — 안드로이드에서 링크/텍스트를 LinkScape 에 공유하면
 * 여기로 GET(?url=&text=&title=) 넘어온다. 세션이 있으면 가장 오래된 보드에 링크 카드를
 * 만들고, 그 카드로 딥링크(?item=)해 이동한다. (확장 popup 의 담기 규칙과 동일)
 *
 * v1: 로그인 상태 전제(공유는 대개 로그인된 상태에서 한다). 세션이 없으면 로그인으로 보낸다.
 * 파일(PDF·이미지) 공유는 POST + 서비스워커 처리가 필요 — 다음 단계.
 */
export default function SharePage() {
  const router = useRouter();
  const [status, setStatus] = useState("담는 중…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const shared = [params.get("url"), params.get("text"), params.get("title")]
        .filter((v): v is string => Boolean(v))
        .join(" ");
      const url = extractUrls(shared)[0];

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      if (!url) {
        setStatus("담을 링크를 찾지 못했습니다");
        setTimeout(() => router.replace("/board"), 1200);
        return;
      }

      // 보드 확보 (가장 오래된 것, 없으면 생성)
      const { data: boards } = await supabase
        .from("boards")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      let boardId = boards?.[0]?.id;
      if (!boardId) {
        const { data: created } = await supabase
          .from("boards")
          .insert({ user_id: user.id, title: "내 보드" })
          .select("id")
          .single();
        boardId = created?.id;
      }
      if (!boardId) {
        setStatus("보드를 찾지 못했습니다");
        setTimeout(() => router.replace("/board"), 1500);
        return;
      }

      // 새 카드 자리 = 가장 최근 카드에서 32px 계단식 (확장과 동일)
      const { data: last } = await supabase
        .from("items")
        .select("x, y")
        .eq("board_id", boardId)
        .eq("status", "active")
        .is("frame_id", null)
        .order("created_at", { ascending: false })
        .limit(1);
      const pos = last?.[0]
        ? { x: last[0].x + 32, y: last[0].y + 32 }
        : { x: 0, y: 0 };

      const id = crypto.randomUUID();
      const { error } = await supabase.from("items").insert({
        id,
        board_id: boardId,
        user_id: user.id,
        kind: "link",
        x: pos.x,
        y: pos.y,
        w: 260,
        h: 220,
        title: hostname(url),
        url,
        domain: hostname(url),
        favicon_url: faviconFallback(url),
      });
      if (error) {
        setStatus("담기에 실패했습니다");
        setTimeout(() => router.replace("/board"), 1500);
        return;
      }

      // 담은 카드로 딥링크 이동 (OG 메타는 보드 열람 시 useLinkBackfill 이 채운다)
      router.replace(`/board?board=${boardId}&item=${id}`);
    })();
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-6 text-center">
      <p className="text-[15px] text-ink-80">{status}</p>
    </main>
  );
}
