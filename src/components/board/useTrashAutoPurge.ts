"use client";

import { useEffect } from "react";

import { removePaths } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

/** 휴지통 보관 기간 — 이 기간이 지난 trashed 카드는 자동으로 완전 삭제된다. */
export const TRASH_RETENTION_DAYS = 15;

// 페이지 세션당 한 번만 (보드 전환마다 다시 돌 필요 없음)
let purgedThisSession = false;

/** 보관 기간이 지난 휴지통(trashed) 카드를 **스토리지 파일까지** 자동 영구삭제한다.
 *
 *  - 전 보드 대상(RLS 가 사용자로 한정) — 스토어를 안 타므로 직접 REST 로 지운다
 *    (휴지통 영구삭제는 허용된 직접 write 예외. trashed 카드는 캔버스 스토어에 없어 desync 없음).
 *  - `updated_at` 이 카드가 휴지통에 들어간 시각의 근사값이다(touch 트리거가 상태변경 때 갱신).
 *  - 앱을 여는 시점에 정리하므로 서버 크론 없이도 무한정 쌓이지 않는다. */
export function useTrashAutoPurge() {
  useEffect(() => {
    if (purgedThisSession) return;
    purgedThisSession = true;

    void (async () => {
      const supabase = createClient();
      const cutoff = new Date(
        Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data, error } = await supabase
        .from("items")
        .select("id, storage_path, thumb_path")
        .eq("status", "trashed")
        .lt("updated_at", cutoff);

      if (error || !data || data.length === 0) return;

      // 1) 스토리지 파일 먼저 (고아 파일 방지)
      const paths = data
        .flatMap((row) => [row.storage_path, row.thumb_path])
        .filter((p): p is string => Boolean(p));
      if (paths.length > 0) await removePaths(supabase, paths);

      // 2) DB 행 삭제
      await supabase
        .from("items")
        .delete()
        .in(
          "id",
          data.map((row) => row.id),
        );
    })();
  }, []);
}
