"use client";

import { useReactFlow } from "@xyflow/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { extractUrls } from "@/lib/url";
import { flush, useBoard } from "@/store/board";

import { useIngest } from "./useIngest";

export default function Toolbar({
  boardTitle,
  userEmail,
  onOpenSearch,
  onOpenTrash,
}: {
  boardTitle: string;
  userEmail: string;
  onOpenSearch: () => void;
  onOpenTrash: () => void;
}) {
  const router = useRouter();
  const { screenToFlowPosition } = useReactFlow();
  const { addLinks, addNote, addFrame } = useIngest();

  const saveState = useBoard((s) => s.saveState);
  const undo = useBoard((s) => s.undo);
  const redo = useBoard((s) => s.redo);
  const canUndo = useBoard((s) => s.undoStack.length > 0);
  const canRedo = useBoard((s) => s.redoStack.length > 0);

  const [url, setUrl] = useState("");

  /** 화면 한가운데의 캔버스 좌표 */
  function center() {
    return screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
  }

  function submitUrl(e: React.FormEvent) {
    e.preventDefault();
    const urls = extractUrls(url);
    if (urls.length === 0) return;
    addLinks(urls, center());
    setUrl("");
  }

  async function signOut() {
    await flush();
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="z-20 flex h-[52px] shrink-0 items-center gap-2 border-b border-hairline bg-canvas/80 px-4 backdrop-blur-xl backdrop-saturate-150">
      <span className="select-none text-[21px] font-semibold tracking-[-0.02em] text-ink">
        pdflinkin
      </span>
      <span className="hidden text-[14px] text-ink-48 sm:inline">{boardTitle}</span>

      {/* 검색·입력은 pill — "액션"의 문법 */}
      <form onSubmit={submitUrl} className="ml-4 w-80">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="링크 붙여넣고 Enter"
          className="h-9 w-full rounded-full border border-hairline bg-canvas px-4 text-[14px] text-ink outline-none transition placeholder:text-ink-48 focus:border-action-focus"
        />
      </form>

      <Divider />

      <Utility onClick={() => addNote(center())}>메모</Utility>
      <Utility onClick={() => addFrame(center())}>그룹</Utility>

      <Divider />

      <Utility onClick={undo} disabled={!canUndo} title="Ctrl+Z">
        ↶
      </Utility>
      <Utility onClick={redo} disabled={!canRedo} title="Ctrl+Shift+Z">
        ↷
      </Utility>

      <div className="ml-auto flex items-center gap-1.5">
        <SaveBadge state={saveState} />

        <Utility onClick={onOpenSearch} title="Ctrl+K">
          검색
        </Utility>
        <Utility onClick={onOpenTrash}>휴지통</Utility>

        <Divider />

        <span className="hidden max-w-44 truncate text-[12px] text-ink-48 md:inline">
          {userEmail}
        </span>
        <button
          onClick={signOut}
          className="rounded-apple-sm px-2.5 py-1.5 text-[14px] text-action transition"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}

/** Pearl 캡슐 — 유틸리티 버튼. 파랑이 아니다(파랑은 진짜 액션 전용). */
function Utility({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded-apple-md border border-divider bg-pearl px-3 py-1.5 text-[14px] text-ink-80 transition hover:bg-parchment disabled:opacity-30 disabled:hover:bg-pearl"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-divider" />;
}

function SaveBadge({ state }: { state: "idle" | "saving" | "error" }) {
  if (state === "saving") {
    return <span className="px-2 text-[12px] text-ink-48">저장 중…</span>;
  }
  if (state === "error") {
    return (
      <span
        className="px-2 text-[12px] text-ink-80"
        title="잠시 후 자동으로 재시도합니다"
      >
        저장 실패 · 재시도 중
      </span>
    );
  }
  return <span className="px-2 text-[12px] text-ink-48">저장됨</span>;
}
