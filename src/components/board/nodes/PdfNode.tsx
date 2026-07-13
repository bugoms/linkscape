"use client";

/* eslint-disable @next/next/no-img-element */

import { type NodeProps } from "@xyflow/react";

import { useViewer } from "@/store/viewer";

import CardShell from "./CardShell";
import type { ItemNodeType } from "./types";

export default function PdfNode({ data, selected }: NodeProps<ItemNodeType>) {
  const { item, thumbUrl, dimmed } = data;
  const openViewer = useViewer((s) => s.open);

  return (
    <CardShell
      color={item.color}
      selected={Boolean(selected)}
      dimmed={dimmed}
      onOpen={() => openViewer(item.id)}
    >
      <div className="relative min-h-0 flex-1 bg-parchment">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-[12px] text-ink-48">썸네일 만드는 중…</span>
          </div>
        )}

        {/* 유틸리티 칩 — 액션이 아니므로 파랑을 쓰지 않는다 */}
        <span className="absolute left-3 top-3 rounded-apple-sm bg-ink px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
          PDF
        </span>

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
      </div>

      <div className="shrink-0 border-t border-divider px-4 py-3">
        <p className="line-clamp-2 text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink">
          {item.title || item.file_name || "PDF"}
        </p>
        <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-48">
          <span>{item.page_count ? `${item.page_count}쪽` : ""}</span>
        </div>
      </div>
    </CardShell>
  );
}
