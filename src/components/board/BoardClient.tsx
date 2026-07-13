"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useState } from "react";

import type { EdgeRow, FrameRow, ItemRow, TagRow } from "@/lib/types";
import { installFlushOnUnload, useBoard } from "@/store/board";
import { useSelection } from "@/store/selection";

import Canvas from "./Canvas";
import Inspector from "./Inspector";
import SearchPalette from "./SearchPalette";
import Toolbar from "./Toolbar";
import TrashPanel from "./TrashPanel";
import Viewer from "./Viewer";

export default function BoardClient(props: {
  boardId: string;
  boardTitle: string;
  userId: string;
  userEmail: string;
  items: ItemRow[];
  frames: FrameRow[];
  edges: EdgeRow[];
  tags: TagRow[];
  itemTags: Record<string, string[]>;
  signedUrls: Record<string, string>;
}) {
  const init = useBoard((s) => s.init);
  const [searchOpen, setSearchOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  useEffect(() => {
    init({
      boardId: props.boardId,
      userId: props.userId,
      items: props.items,
      frames: props.frames,
      edges: props.edges,
      tags: props.tags,
      itemTags: props.itemTags,
      signedUrls: props.signedUrls,
    });
    useSelection.getState().clear();
  }, [init, props]);

  useEffect(() => installFlushOnUnload(), []);

  // 스토어 기준으로 실시간 판정 — 첫 카드가 생기는 순간 안내가 사라진다.
  // (init 전에는 boardId 가 비어 있으므로 잘못 떠 있지 않는다)
  const ready = useBoard((s) => s.boardId !== "");
  const storeEmpty = useBoard(
    (s) =>
      Object.keys(s.frames).length === 0 &&
      !Object.values(s.items).some((i) => i.status === "active"),
  );

  return (
    <ReactFlowProvider>
      <div className="relative h-dvh">
        <Canvas onOpenSearch={() => setSearchOpen(true)} />

        <Toolbar
          boardTitle={props.boardTitle}
          userEmail={props.userEmail}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenTrash={() => setTrashOpen(true)}
        />

        <TagFilterBar />
        <Inspector />
        {ready && storeEmpty && <EmptyHint />}
      </div>

      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
      {trashOpen && <TrashPanel onClose={() => setTrashOpen(false)} />}
      <Viewer />
    </ReactFlowProvider>
  );
}

/* ------------------------------------------------------------------------- */

function TagFilterBar() {
  const tags = useBoard((s) => s.tags);
  const activeTagIds = useBoard((s) => s.activeTagIds);
  const toggleTagFilter = useBoard((s) => s.toggleTagFilter);
  const clearTagFilter = useBoard((s) => s.clearTagFilter);

  if (tags.length === 0) return null;

  return (
    <div className="pointer-events-none absolute left-4 top-[84px] z-20 flex max-w-[60%] flex-wrap items-center gap-1.5">
      {tags.map((tag) => {
        const active = activeTagIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            onClick={() => toggleTagFilter(tag.id)}
            className={[
              "pointer-events-auto rounded-full border px-3 py-1.5 text-[13px] transition",
              active
                ? "border-action bg-action text-white"
                : "border-hairline bg-canvas text-ink-80 hover:bg-parchment",
            ].join(" ")}
          >
            {tag.name}
          </button>
        );
      })}

      {activeTagIds.length > 0 && (
        <button
          onClick={clearTagFilter}
          className="pointer-events-auto px-2 py-1.5 text-[13px] text-action"
        >
          필터 해제
        </button>
      )}
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="glass-float w-full max-w-[520px] rounded-apple-lg px-10 py-9 text-center">
        <h2 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink">
          빈 캔버스입니다.
        </h2>
        <p className="mt-2 text-[18px] leading-[1.35] text-ink-48">
          링크와 PDF를 여기에 던져 넣으세요.
        </p>

        <ul className="mx-auto mt-8 max-w-[400px] space-y-2.5 text-left text-[15px] text-ink-80">
          <Hint keys="Ctrl+V">복사한 링크를 마우스 자리에 카드로</Hint>
          <Hint>PDF · 이미지 파일을 캔버스로 드래그앤드롭</Hint>
          <Hint>빈 곳을 더블클릭하면 메모 카드</Hint>
          <Hint keys="Ctrl+K">검색 · Ctrl+Z 되돌리기</Hint>
        </ul>
      </div>
    </div>
  );
}

function Hint({ keys, children }: { keys?: string; children: React.ReactNode }) {
  return (
    <li className="flex items-baseline gap-3">
      {keys ? (
        <kbd className="shrink-0 rounded-apple-sm border border-hairline bg-canvas px-2 py-0.5 font-sans text-[13px] text-ink">
          {keys}
        </kbd>
      ) : (
        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-48" />
      )}
      <span>{children}</span>
    </li>
  );
}
