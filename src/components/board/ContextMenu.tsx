"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

export type MenuEntry =
  | { label: string; danger?: boolean; onClick: () => void }
  | "divider";

/** 캔버스 전용 우클릭 메뉴. 화면 밖으로 나가지 않게 위치를 보정한다. */
export default function ContextMenu({
  x,
  y,
  entries,
  onClose,
}: {
  x: number;
  y: number;
  entries: MenuEntry[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // 뷰포트 밖으로 넘치면 안쪽으로 밀어 넣는다 (setState 없이 DOM 스타일로만).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
    el.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`;
  }, [x, y]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50"
      onPointerDown={onClose}
      onWheel={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        ref={ref}
        onPointerDown={(e) => e.stopPropagation()}
        className="glass-solid absolute min-w-[176px] rounded-apple-md py-1.5"
        style={{ left: x, top: y }}
      >
        {entries.map((entry, index) =>
          entry === "divider" ? (
            <div key={index} className="mx-2 my-1 h-px bg-divider" />
          ) : (
            <button
              key={index}
              onClick={() => {
                onClose();
                entry.onClick();
              }}
              className={[
                "block w-full px-3.5 py-1.5 text-left text-[14px] transition hover:bg-black/[0.04]",
                entry.danger ? "text-[#d70015]" : "text-ink",
              ].join(" ")}
            >
              {entry.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
