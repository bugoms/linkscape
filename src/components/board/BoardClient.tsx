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

  const isEmpty = props.items.length === 0 && props.frames.length === 0;

  return (
    <ReactFlowProvider>
      <div className="flex h-dvh flex-col">
        <Toolbar
          boardTitle={props.boardTitle}
          userEmail={props.userEmail}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenTrash={() => setTrashOpen(true)}
        />

        <div className="relative min-h-0 flex-1">
          <Canvas onOpenSearch={() => setSearchOpen(true)} />
          <TagFilterBar />
          <Inspector />
          {isEmpty && <EmptyHint />}
        </div>
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
    <div className="pointer-events-none absolute left-5 top-5 z-20 flex max-w-[60%] flex-wrap items-center gap-1.5">
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
      <div className="max-w-[520px] px-6 text-center">
        <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
          빈 캔버스입니다.
        </h2>
        <p className="mt-3 text-[21px] leading-[1.3] text-ink-48">
          링크와 PDF를 여기에 던져 넣으세요.
        </p>

        <ul className="mx-auto mt-10 max-w-[400px] space-y-2.5 text-left text-[15px] text-ink-80">
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
