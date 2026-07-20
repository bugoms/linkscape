"use client";

/* eslint-disable @next/next/no-img-element */

import type { PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";

import { destroyPdf, loadPdfFromUrl, renderPageToCanvas } from "@/lib/pdf";
import { downloadFileName, downloadStoredFile, signPath } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { useBoard } from "@/store/board";
import { useViewer } from "@/store/viewer";

export default function Viewer() {
  const itemId = useViewer((s) => s.itemId);
  const close = useViewer((s) => s.close);
  const item = useBoard((s) => (itemId ? s.items[itemId] : undefined));
  const [downloading, setDownloading] = useState(false);

  async function download() {
    if (!item?.storage_path || downloading) return;
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
        <div className="ml-auto flex shrink-0 items-center gap-5">
          {item.storage_path && (
            <button
              onClick={() => void download()}
              disabled={downloading}
              className="text-[14px] text-action transition disabled:opacity-40"
            >
              {downloading ? "다운로드 중…" : "다운로드 ↓"}
            </button>
          )}
          <button onClick={close} className="text-[14px] text-action transition">
            닫기 (Esc)
          </button>
        </div>
      </header>

      {item.kind === "pdf" ? (
        <PdfBody key={item.id} itemId={item.id} />
      ) : item.kind === "image" ? (
        <ImageBody key={item.id} itemId={item.id} />
      ) : (
        <FileBody key={item.id} itemId={item.id} />
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

/** MS 오피스 문서는 Office Online 뷰어가 확실히 렌더한다(웨일·크롬 공통). */
const OFFICE_EXTS = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx"]);

function fileExt(
  item: { file_name?: string | null; storage_path?: string | null } | undefined,
): string | undefined {
  return (item?.file_name ?? item?.storage_path ?? "").split(".").pop()?.toLowerCase();
}

/** 일반 파일 뷰어의 진입점 — 확장자로 렌더 방식을 고른다.
 *  - 한글(.hwp/.hwpx): hwp.js 로 브라우저에서 직접 렌더(내장 뷰어 의존 X → 크롬·엣지·웨일 공통).
 *  - 오피스 문서·그 밖: DocBody(Office Online 임베드 / 원본 iframe). */
function FileBody({ itemId }: { itemId: string }) {
  const item = useBoard((s) => s.items[itemId]);
  const ext = fileExt(item);
  if (ext === "hwp" || ext === "hwpx") return <HwpBody itemId={itemId} />;
  return <DocBody itemId={itemId} />;
}

/** 오피스 문서·기타 파일 뷰어.
 *  - 오피스 문서: Office Online 임베드(서명 URL 을 MS 서버가 가져가 렌더).
 *  - 그 외(txt·csv 등): 원본을 iframe 으로 시도(브라우저 뷰어 의존) + 다운로드 안내. */
function DocBody({ itemId }: { itemId: string }) {
  const item = useBoard((s) => s.items[itemId]);
  const { url, error } = useSignedSource(item?.storage_path ?? null);

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-10">
        <p className="text-[15px] text-ink-48">{error}</p>
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-10">
        <p className="text-[15px] text-ink-48">불러오는 중…</p>
      </div>
    );
  }

  const isOffice = OFFICE_EXTS.has(fileExt(item) ?? "");
  const src = isOffice
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : url;

  return (
    <div className="relative min-h-0 flex-1">
      <iframe
        src={src}
        title={item?.file_name ?? "문서"}
        className="h-full w-full border-0 bg-canvas"
      />
      {!isOffice && (
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[12px] text-ink-48">
          이 형식은 브라우저 뷰어에 따라 안 보일 수 있어요. 상단의 “다운로드”로 원본을 받으세요.
        </p>
      )}
    </div>
  );
}

/** 벤더링한 /vendor/hwp.js 의 최소 타입(런타임 전용 경로라 자동 추론 불가). */
type HwpModule = {
  Viewer: new (
    container: HTMLElement,
    data: Uint8Array,
    option?: { type?: string },
  ) => { distory(): void };
};

/** 한글 문서 뷰어 — hwp.js 로 브라우저에서 직접 렌더한다.
 *  브라우저 내장 뷰어(웨일 등)에 의존하지 않으므로 크롬·엣지에서도 동일하게 열린다.
 *  hwp.js 는 구형 .hwp(HWP 5.0 바이너리)만 지원 — .hwpx 등 못 읽는 형식은 다운로드 안내로 폴백. */
function HwpBody({ itemId }: { itemId: string }) {
  const item = useBoard((s) => s.items[itemId]);
  const { url, error } = useSignedSource(item?.storage_path ?? null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unsupported">("loading");

  useEffect(() => {
    if (!url) return;
    const container = containerRef.current;
    if (!container) return;

    let alive = true;
    let viewer: { distory: () => void } | null = null;
    setStatus("loading");

    void (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`파일을 받지 못했습니다 (${res.status})`);
        const data = new Uint8Array(await res.arrayBuffer());
        if (!alive) return;
        // 벤더링한 원본 hwp.js 를 브라우저가 네이티브로 로드한다(turbopackIgnore).
        // Turbopack 이 번들하면 옵션 전달이 깨져 파싱이 실패하므로 /vendor 에서 직접 서빙.
        // (경로는 런타임 전용 — 빌드 그래프에 없어 타입 해석 불가)
        // @ts-expect-error 런타임 전용 벤더 경로 — 타입 정의 없음
        const mod: HwpModule = await import(/* turbopackIgnore: true */ "/vendor/hwp.js");
        if (!alive) return;
        container.innerHTML = "";
        // type:'array' 필수 — 없으면 cfb 가 Uint8Array 를 base64 문자열로 오인해 파싱 실패
        viewer = new mod.Viewer(container, data, { type: "array" });
        setStatus("ready");
      } catch (err) {
        console.error("[viewer] HWP 렌더 실패", err);
        container.innerHTML = "";
        if (alive) setStatus("unsupported");
      }
    })();

    return () => {
      alive = false;
      try {
        viewer?.distory(); // hwp.js 정리 메서드(라이브러리 철자 그대로)
      } catch {
        /* 이미 언마운트 중 — 무시 */
      }
      container.innerHTML = "";
    };
  }, [url]);

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-10">
        <p className="text-[15px] text-ink-48">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      {/* hwp.js 가 이 안에 직접 DOM 을 그린다 — React 는 자식을 건드리지 않는다 */}
      <div ref={containerRef} className="h-full w-full" />
      {status !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center bg-parchment p-10">
          {status === "loading" ? (
            <p className="text-[15px] text-ink-48">한글 문서 여는 중…</p>
          ) : (
            <p className="max-w-sm text-center text-[14px] leading-relaxed text-ink-48">
              이 한글 문서는 브라우저 미리보기를 만들 수 없어요. 상단의 “다운로드”로
              원본을 받아 열어 주세요.
              <br />
              <span className="text-[12px] text-ink-48">
                (신형 .hwpx 형식은 미리보기를 지원하지 않아요)
              </span>
            </p>
          )}
        </div>
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
  // 항상 1쪽부터 열고, 읽던 기록이 있으면 이어 읽을지 물어본다.
  const resumePage = Math.max(1, item?.last_read_page ?? 1);
  const [page, setPage] = useState(1);
  const [askResume, setAskResume] = useState(resumePage > 1);
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
    // 확인창에 답하기 전에 1쪽으로 덮어써서 읽던 위치를 날리면 안 된다
    if (askResume) return;
    const timer = setTimeout(() => savePage(page), 800);
    return () => clearTimeout(timer);
  }, [page, savePage, askResume]);

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
      <div className="relative min-h-0 flex-1">
        <div className="h-full overflow-auto p-10">
          <div className="mx-auto w-fit">
            {loading ? (
              <p className="py-24 text-center text-[15px] text-ink-48">
                PDF 여는 중…
              </p>
            ) : (
              // 지면은 "표면 위에 놓인 실물"이다 — 시스템의 유일한 그림자를 여기에 쓴다
              <canvas
                ref={canvasRef}
                className="product-shadow rounded-apple-sm bg-canvas"
              />
            )}
          </div>
        </div>

        {askResume && (
          <div className="absolute inset-x-0 top-6 z-10 flex justify-center px-4">
            <div className="glass-float flex flex-wrap items-center gap-3 rounded-apple-lg px-5 py-3">
              <span className="text-[14px] text-ink">
                지난번에 {resumePage}쪽까지 읽었습니다. 이어 읽을까요?
              </span>
              <button
                onClick={() => {
                  setPage(resumePage);
                  setAskResume(false);
                }}
                className="rounded-full bg-action px-3.5 py-1.5 text-[13px] text-white transition"
              >
                이어 읽기
              </button>
              <button
                onClick={() => setAskResume(false)}
                className="rounded-apple-md border border-divider bg-pearl px-3 py-1.5 text-[13px] text-ink-80 transition hover:bg-parchment"
              >
                처음부터
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 스크롤 중에도 떠 있는 프로스티드 바 */}
      <footer className="flex min-h-16 shrink-0 flex-wrap items-center justify-center gap-1.5 border-t border-hairline bg-canvas/80 px-3 py-2 backdrop-blur-xl backdrop-saturate-150 sm:gap-2 sm:px-8">
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
