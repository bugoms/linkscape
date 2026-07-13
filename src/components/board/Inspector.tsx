"use client";

import { CARD_COLORS, COLOR_TOKENS } from "@/lib/palette";
import { useBoard } from "@/store/board";
import { useSelection } from "@/store/selection";
import { useViewer } from "@/store/viewer";

const KIND_LABEL: Record<string, string> = {
  link: "링크",
  pdf: "PDF",
  image: "이미지",
  note: "메모",
  file: "파일",
};

export default function Inspector() {
  const nodeIds = useSelection((s) => s.nodeIds);
  const items = useBoard((s) => s.items);
  const frames = useBoard((s) => s.frames);
  const apply = useBoard((s) => s.apply);
  const openViewer = useViewer((s) => s.open);

  const selectedId = nodeIds.size === 1 ? [...nodeIds][0] : null;
  const item = selectedId ? items[selectedId] : undefined;
  const frame = selectedId ? frames[selectedId] : undefined;

  if (!selectedId || (!item && !frame)) return null;

  const currentTitle = item?.title ?? frame?.title ?? "";
  const currentColor = item?.color ?? frame?.color ?? null;

  function saveTitle(raw: string) {
    const next = raw.trim() || null;
    if (next === (currentTitle || null)) return;
    apply((d) => {
      if (item && d.items[item.id]) {
        d.items[item.id] = { ...d.items[item.id], title: next };
      } else if (frame && d.frames[frame.id]) {
        d.frames[frame.id] = { ...d.frames[frame.id], title: next ?? "무제" };
      }
    });
  }

  function setColor(color: string) {
    apply((d) => {
      if (item && d.items[item.id]) {
        d.items[item.id] = { ...d.items[item.id], color };
      } else if (frame && d.frames[frame.id]) {
        d.frames[frame.id] = { ...d.frames[frame.id], color };
      }
    });
  }

  return (
    <aside className="glass-float absolute inset-x-2 bottom-[72px] z-20 rounded-apple-lg p-4 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[76px] sm:w-[264px]">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-48">
        {frame ? "그룹" : (KIND_LABEL[item?.kind ?? ""] ?? "")}
      </p>

      <input
        // 선택이 바뀌거나 외부에서 제목이 갱신되면 새 값으로 다시 마운트된다
        key={`${selectedId}:${currentTitle}`}
        defaultValue={currentTitle}
        onBlur={(e) => saveTitle(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder="제목"
        className="mt-2 h-10 w-full rounded-apple-md border border-hairline bg-canvas px-3 text-[15px] text-ink outline-none transition placeholder:text-ink-48 focus:border-action-focus"
      />

      <div className="mt-4">
        <p className="mb-2 text-[12px] text-ink-48">색</p>
        <div className="flex gap-2">
          {COLOR_TOKENS.map((token) => (
            <button
              key={token}
              onClick={() => setColor(token)}
              className={[
                "h-6 w-6 rounded-full transition",
                CARD_COLORS[token].swatch,
                currentColor === token
                  ? "ring-2 ring-action-focus ring-offset-2 ring-offset-canvas"
                  : "opacity-70 hover:opacity-100",
              ].join(" ")}
              aria-label={token}
            />
          ))}
        </div>
      </div>

      {item && (
        <div className="mt-4 flex gap-2">
          {item.url && (
            <button
              onClick={() => window.open(item.url!, "_blank", "noopener,noreferrer")}
              className="flex-1 rounded-full bg-action px-3 py-2 text-[14px] text-white transition"
            >
              원본 열기 ↗
            </button>
          )}
          {(item.kind === "pdf" || item.kind === "image") && (
            <button
              onClick={() => openViewer(item.id)}
              className="flex-1 rounded-full bg-action px-3 py-2 text-[14px] text-white transition"
            >
              열기
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
