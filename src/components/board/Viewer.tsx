"use client";

/* eslint-disable @next/next/no-img-element */

import type { PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";

import { destroyPdf, loadPdfFromUrl, renderPageToCanvas } from "@/lib/pdf";
import { signPath } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { useBoard } from "@/store/board";
import { useViewer } from "@/store/viewer";

export default function Viewer() {
  const itemId = useViewer((s) => s.itemId);
  const close = useViewer((s) => s.close);
  const item = useBoard((s) => (itemId ? s.items[itemId] : undefined));

  useEffect(() => {
    if (!itemId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [itemId, close]);

  if (!itemId || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-parchment">
      <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-hairline bg-canvas/80 px-5 backdrop-blur-xl backdrop-saturate-150">
        <span className="truncate text-[17px] font-semibold tracking-[-0.01em] text-ink">
          {item.title || item.file_name || "보기"}
        </span>
        <button onClick={close} className="ml-auto text-[14px] text-action transition">
          닫기 (Esc)
        </button>
      </header>

      {item.kind === "pdf" ? (
        <PdfBody key={item.id} itemId={item.id} />
      ) : (
        <ImageBody key={item.id} itemId={item.id} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

type Source = { url: string | null; error: string | null };

function useSignedSource(storagePath: string | null): Source {
  const [result, setResult] = useState<Source>({ url: null, error: null });

  useEffect(() => {
    if (!storagePath) return;
    let alive = true;

    void (async () => {
      const signed = await signPath(createClient(), storagePath);
      if (!alive) return;
      setResult(
        signed
          ? { url: signed, error: null }
          : { url: null, error: "파일을 불러오지 못했습니다" },
      );
    })();

    return () => {
      alive = false;
    };
  }, [storagePath]);

  if (!storagePath) return { url: null, error: "파일이 아직 업로드되지 않았습니다" };
  return result;
}

function ImageBody({ itemId }: { itemId: string }) {
  const item = useBoard((s) => s.items[itemId]);
  const { url, error } = useSignedSource(item?.storage_path ?? null);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-10">
      {error ? (
        <p className="text-[15px] text-ink-48">{error}</p>
      ) : url ? (
        // 표면 위에 놓인 실물 — 이 시스템의 유일한 그림자를 쓸 자리
        <img
          src={url}
          alt=""
          className="product-shadow max-h-full max-w-full rounded-apple-sm object-contain"
        />
      ) : (
        <p className="text-[15px] text-ink-48">불러오는 중…</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function PdfBody({ itemId }: { itemId: string }) {
  const item = useBoard((s) => s.items[itemId]);
  const apply = useBoard((s) => s.apply);

  const { url, error } = useSignedSource(item?.storage_path ?? null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(item?.page_count ?? 0);
  const [page, setPage] = useState(Math.max(1, item?.last_read_page ?? 1));
  const [width, setWidth] = useState(900);

  const loading = !doc && !error;

  // 문서 로드 (이 컴포넌트는 item 별로 key 되어 있으므로 url 은 사실상 한 번만 바뀐다)
  useEffect(() => {
    if (!url) return;
    let alive = true;
    let loaded: PDFDocumentProxy | null = null;

    void (async () => {
      try {
        loaded = await loadPdfFromUrl(url);
        if (!alive) {
          destroyPdf(loaded);
          return;
        }
        setDoc(loaded);
        setNumPages(loaded.numPages);
      } catch (err) {
        console.error("[viewer] PDF 로드 실패", err);
      }
    })();

    return () => {
      alive = false;
      destroyPdf(loaded);
    };
  }, [url]);

  // 페이지 렌더
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;

    let cancelled = false;
    void (async () => {
      try {
        await renderPageToCanvas(doc, page, canvas, width);
      } catch (err) {
        if (!cancelled) console.error("[viewer] 렌더 실패", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [doc, page, width]);

  // 읽던 페이지 기억
  const savePage = useCallback(
    (next: number) => {
      if (!item || item.last_read_page === next) return;
      apply((d) => {
        const target = d.items[item.id];
        if (target) {
          d.items[item.id] = {
            ...target,
            last_read_page: next,
            read_at: new Date().toISOString(),
          };
        }
      });
    },
    [apply, item],
  );

  useEffect(() => {
    const timer = setTimeout(() => savePage(page), 800);
    return () => clearTimeout(timer);
  }, [page, savePage]);

  const go = useCallback(
    (delta: number) =>
      setPage((p) => Math.min(Math.max(1, p + delta), Math.max(1, numPages))),
    [numPages],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") go(1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[15px] text-ink-48">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto p-10">
        <div className="mx-auto w-fit">
          {loading ? (
            <p className="py-24 text-center text-[15px] text-ink-48">PDF 여는 중…</p>
          ) : (
            // 지면은 "표면 위에 놓인 실물"이다 — 시스템의 유일한 그림자를 여기에 쓴다
            <canvas
              ref={canvasRef}
              className="product-shadow rounded-apple-sm bg-canvas"
            />
          )}
        </div>
      </div>

      {/* 스크롤 중에도 떠 있는 프로스티드 바 */}
      <footer className="flex h-16 shrink-0 items-center justify-center gap-2 border-t border-hairline bg-canvas/80 px-8 backdrop-blur-xl backdrop-saturate-150">
        <NavButton onClick={() => go(-1)} disabled={page <= 1}>
          ← 이전
        </NavButton>

        <input
          type="number"
          min={1}
          max={numPages || 1}
          value={page}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) {
              setPage(Math.min(Math.max(1, next), Math.max(1, numPages)));
            }
          }}
          className="h-9 w-16 rounded-full border border-hairline bg-canvas text-center text-[14px] text-ink outline-none focus:border-action-focus"
        />
        <span className="text-[14px] text-ink-48">/ {numPages || "?"}</span>

        <NavButton onClick={() => go(1)} disabled={page >= numPages}>
          다음 →
        </NavButton>

        <span className="mx-3 h-5 w-px bg-divider" />

        <NavButton onClick={() => setWidth((w) => Math.max(400, w - 150))}>−</NavButton>
        <NavButton onClick={() => setWidth((w) => Math.min(2000, w + 150))}>+</NavButton>
      </footer>
    </>
  );
}

function NavButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-apple-md border border-divider bg-pearl px-3 py-1.5 text-[14px] text-ink-80 transition hover:bg-parchment disabled:opacity-30 disabled:hover:bg-pearl"
    >
      {children}
    </button>
  );
}
