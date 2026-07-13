"use client";

/* eslint-disable @next/next/no-img-element */

import { type NodeProps } from "@xyflow/react";
import { useState } from "react";

import CardShell from "./CardShell";
import type { ItemNodeType } from "./types";

export default function LinkNode({ data, selected }: NodeProps<ItemNodeType>) {
  const { item, dimmed } = data;
  const [imageBroken, setImageBroken] = useState(false);
  const [faviconBroken, setFaviconBroken] = useState(false);

  const open = () => {
    if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
  };

  const title = item.title || item.url || "링크";
  const showImage = Boolean(item.og_image_url) && !imageBroken;

  return (
    <CardShell
      color={item.color}
      selected={Boolean(selected)}
      dimmed={dimmed}
      onOpen={open}
    >
      {showImage ? (
        <div className="min-h-0 flex-1 bg-parchment">
          <img
            src={item.og_image_url!}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImageBroken(true)}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-parchment px-5">
          <span className="line-clamp-3 text-center text-[13px] leading-relaxed text-ink-48">
            {item.description || item.domain || "미리보기 없음"}
          </span>
        </div>
      )}

      <div className="shrink-0 border-t border-divider px-4 py-3">
        <p className="line-clamp-2 text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-ink">
          {title}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          {item.favicon_url && !faviconBroken ? (
            <img
              src={item.favicon_url}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setFaviconBroken(true)}
              className="h-4 w-4 rounded-[3px]"
            />
          ) : (
            <span className="h-4 w-4 rounded-[3px] bg-divider" />
          )}
          <span className="truncate text-[12px] text-ink-48">{item.domain ?? ""}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            className="ml-auto shrink-0 text-[12px] text-action opacity-0 transition group-hover:opacity-100"
          >
            열기 ↗
          </button>
        </div>
      </div>
    </CardShell>
  );
}
