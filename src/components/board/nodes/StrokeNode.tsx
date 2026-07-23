"use client";

/* eslint-disable @next/next/no-img-element */

import { type NodeProps } from "@xyflow/react";

import type { ItemNodeType } from "./types";

/** 캔버스 잉크(펜 그리기) — 카드 크롬 없이 획만 투명하게 그린다.
 *  선택하면 점선 외곽선으로만 존재를 표시. 이동·삭제·언두는 일반 노드와 동일. */
export default function StrokeNode({ data, selected }: NodeProps<ItemNodeType>) {
  const { item, dimmed } = data;

  return (
    <div
      className={
        selected
          ? "h-full w-full rounded-apple-sm outline-dashed outline-1 outline-offset-4 outline-action"
          : "h-full w-full"
      }
      style={dimmed ? { opacity: 0.3 } : undefined}
    >
      <img
        src={item.og_image_url ?? ""}
        alt={item.title ?? "그림"}
        draggable={false}
        className="h-full w-full select-none"
      />
    </div>
  );
}
