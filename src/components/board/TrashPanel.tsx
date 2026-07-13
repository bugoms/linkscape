"use client";

import { useEffect, useState } from "react";

import { removePaths } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import type { ItemRow } from "@/lib/types";
import { useBoard } from "@/store/board";

const KIND_LABEL: Record<string, string> = {
  link: "링크",
  pdf: "PDF",
  image: "이미지",
  note: "메모",
  file: "파일",
};

/** 부모가 열릴 때만 마운트한다. rows 가 null 이면 로딩 중. */
export default function TrashPanel({ onClose }: { onClose: () => void }) {
  const boardId = useBoard((s) => s.boardId);
  const apply = useBoard((s) => s.apply);

  const [rows, setRows] = useState<ItemRow[] | null>(null);

  useEffect(() => {
    let alive = true;

    void (async () => {
      const { data } = await createClient()
        .from("items")
        .select("*")
        .eq("board_id", boardId)
        .eq("status", "trashed")
        .order("updated_at", { ascending: false });

      if (!alive) return;
      setRows(
        ((data ?? []) as ItemRow[]).map((row) => ({ ...row, extracted_text: null })),
      );
    })();

    return () => {
      alive = false;
    };
  }, [boardId]);

  function restore(row: ItemRow) {
    setRows((prev) => (prev ?? []).filter((r) => r.id !== row.id));
    apply((d) => {
      d.items[row.id] = { ...row, status: "active" };
    });
  }

  async function purge(row: ItemRow) {
    if (!confirm(`"${row.title ?? row.file_name ?? "이 카드"}" 를 완전히 지울까요?`)) {
      return;
    }
    setRows((prev) => (prev ?? []).filter((r) => r.id !== row.id));

    const supabase = createClient();
    const paths = [row.storage_path, row.thumb_path].filter(
      (p): p is string => Boolean(p),
    );
    if (paths.length > 0) await removePaths(supabase, paths);
    await supabase.from("items").delete().eq("id", row.id);
  }

  async function emptyAll() {
    const current = rows ?? [];
    if (current.length === 0) return;
    if (!confirm(`휴지통의 ${current.length}개를 완전히 지울까요? 되돌릴 수 없습니다.`)) {
      return;
    }
    setRows([]);

    const supabase = createClient();
    const paths = current
      .flatMap((row) => [row.storage_path, row.thumb_path])
      .filter((p): p is string => Boolean(p));

    if (paths.length > 0) await removePaths(supabase, paths);
    await supabase
      .from("items")
      .delete()
      .in(
        "id",
        current.map((row) => row.id),
      );
  }

  const list = rows ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-apple-lg border border-hairline bg-canvas"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-divider px-5 py-4">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
            휴지통
          </h2>
          <span className="text-[13px] text-ink-48">{list.length}개</span>

          <button
            onClick={() => void emptyAll()}
            disabled={list.length === 0}
            className="ml-auto text-[14px] text-action transition disabled:text-ink-48"
          >
            전부 비우기
          </button>
          <span className="mx-1 h-4 w-px bg-divider" />
          <button onClick={onClose} className="text-[14px] text-action transition">
            닫기
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {rows === null && (
            <p className="px-5 py-10 text-center text-[13px] text-ink-48">
              불러오는 중…
            </p>
          )}
          {rows !== null && list.length === 0 && (
            <p className="px-5 py-10 text-center text-[13px] text-ink-48">
              휴지통이 비어 있습니다
            </p>
          )}

          {list.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-3 border-b border-divider px-5 py-3 last:border-b-0"
            >
              <span className="shrink-0 rounded-apple-sm border border-divider bg-pearl px-1.5 py-0.5 text-[10px] text-ink-48">
                {KIND_LABEL[row.kind] ?? row.kind}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] text-ink">
                {row.title || row.file_name || row.note || "제목 없음"}
              </span>
              <button
                onClick={() => restore(row)}
                className="text-[14px] text-action transition"
              >
                복원
              </button>
              <button
                onClick={() => void purge(row)}
                className="text-[14px] text-ink-48 transition hover:text-ink"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
