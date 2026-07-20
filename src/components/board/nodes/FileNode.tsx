"use client";

import { type NodeProps } from "@xyflow/react";
import { useState } from "react";

import { downloadFileName, downloadStoredFile } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { useViewer } from "@/store/viewer";

import CardShell from "./CardShell";
import type { ItemNodeType } from "./types";

/** 브라우저에서 직접 렌더 못 하는 일반 파일(워드·한글·엑셀·압축 등) 카드.
 *  "열기" = 인앱 뷰어(문서를 iframe 으로 표시; 웨일 등은 그 안에서 문서 뷰어 렌더).
 *  우상단 아이콘 = 원래 이름으로 다운로드(한글 이름도 안 깨짐). */
export default function FileNode({ data, selected }: NodeProps<ItemNodeType>) {
  const { item, dimmed } = data;
  const openViewer = useViewer((s) => s.open);
  const [downloading, setDownloading] = useState(false);

  const ext = (item.file_name ?? "").split(".").pop() ?? "";
  const badge = ext ? ext.toUpperCase().slice(0, 5) : "FILE";

  async function download() {
    if (!item.storage_path || downloading) return;
    setDownloading(true);
    try {
      const ok = await downloadStoredFile(
        createClient(),
        item.storage_path,
        downloadFileName(item.title, item.file_name, item.storage_path),
      );
      if (!ok) window.alert("다운로드하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <CardShell
      color={item.color}
      selected={Boolean(selected)}
      dimmed={dimmed}
      onOpen={() => openViewer(item.id)}
    >
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-parchment">
        {/* 파일 아이콘 + 확장자 배지 */}
        <div className="flex flex-col items-center gap-2 text-ink-48">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 3.5h7L18.5 9v11a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20V5A1.5 1.5 0 0 1 6 3.5Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M13 3.5V9h5.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          <span className="rounded-apple-sm bg-ink px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
            {badge}
          </span>
        </div>

        {item.storage_path && (
          <>
            {/* 열기 — 인앱 뷰어 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openViewer(item.id);
              }}
              className="absolute inset-0 flex items-center justify-center bg-white/55 opacity-0 backdrop-blur-[2px] transition group-hover:opacity-100"
            >
              <span className="rounded-full bg-action px-4 py-2 text-[14px] text-white">
                열기
              </span>
            </button>

            {/* 우상단 다운로드 — 열기 오버레이보다 위에 둬야 클릭이 닿는다 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                void download();
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              disabled={downloading}
              title="다운로드"
              aria-label="다운로드"
              className="nodrag absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-apple-sm bg-ink/80 text-white transition hover:bg-ink disabled:opacity-40"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M8 2.5v7M4.8 6.3 8 9.5l3.2-3.2M3 13h10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-divider px-4 py-3">
        <p className="line-clamp-2 text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink">
          {item.title || item.file_name || "파일"}
        </p>
        {item.file_name && (
          <p className="mt-1 truncate text-[12px] text-ink-48">{item.file_name}</p>
        )}
      </div>
    </CardShell>
  );
}
