"use client";

import { useReactFlow, useViewport } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";

import type { Point } from "@/lib/geometry";

import { useIngest } from "./useIngest";
import { useWheelPanZoom } from "./useWheelPanZoom";

/** 펜 색 — 잉크 + 카드 분류색 5종 (lib/palette.ts 스와치와 동일한 hex) */
const PEN_COLORS = [
  "#1d1d1f",
  "#5aa9f5",
  "#4cae72",
  "#e5a83c",
  "#e0687a",
  "#8c6fe0",
];
/** 펜 굵기 — 캔버스(flow) 좌표 기준 px */
const PEN_W = 3;
/** 획 둘레 여백 */
const PAD = 12;
/** 이보다 가까운 포인터 이동은 버린다 (화면 px — 데이터 크기 절약) */
const MIN_DIST = 2;

type Stroke = { color: string; points: Point[] }; // 캔버스(flow) 좌표

/** 그리기 모드 오버레이 — 펜으로 긋고 "완료"하면 캔버스에 잉크로 남는다(카드 아님).
 *  획은 받자마자 flow 좌표로 바꿔 두므로 그리는 중에 휠 팬/줌을 해도 캔버스에 붙어 있다. */
export default function DrawLayer({ onDone }: { onDone: () => void }) {
  const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();
  const overlayRef = useRef<HTMLDivElement>(null);
  const { addDrawing } = useIngest();

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Stroke | null>(null);
  const [color, setColor] = useState(PEN_COLORS[0]);
  const activePointer = useRef<number | null>(null);
  const lastClient = useRef<Point | null>(null);

  // 오버레이가 휠을 삼키므로 팬/줌을 직접 처리 (Ctrl+휠 페이지 줌 방지)
  useWheelPanZoom(overlayRef);
  // 뷰포트 변화 구독 — 획 미리보기(화면 좌표)와 굵기를 현재 줌에 맞춘다
  const { zoom } = useViewport();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (activePointer.current !== null) return; // 두 번째 손가락은 무시
    activePointer.current = e.pointerId;
    overlayRef.current?.setPointerCapture(e.pointerId);
    lastClient.current = { x: e.clientX, y: e.clientY };
    setCurrent({
      color,
      points: [screenToFlowPosition({ x: e.clientX, y: e.clientY })],
    });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (activePointer.current !== e.pointerId) return;
    const last = lastClient.current;
    if (last && Math.hypot(e.clientX - last.x, e.clientY - last.y) < MIN_DIST) {
      return;
    }
    lastClient.current = { x: e.clientX, y: e.clientY };
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setCurrent((prev) =>
      prev ? { ...prev, points: [...prev.points, p] } : prev,
    );
  }

  function onPointerUp(e: React.PointerEvent) {
    if (activePointer.current !== e.pointerId) return;
    activePointer.current = null;
    lastClient.current = null;
    if (current && current.points.length >= 2) {
      setStrokes((s) => [...s, current]);
    }
    setCurrent(null);
  }

  /** 획들을 하나의 SVG 로 묶어 캔버스 잉크 아이템으로 저장 */
  function commit() {
    if (strokes.length === 0) {
      onDone();
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const s of strokes) {
      for (const p of s.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    const w = Math.max(maxX - minX + PAD * 2, 24);
    const h = Math.max(maxY - minY + PAD * 2, 24);
    const ox = minX - PAD;
    const oy = minY - PAD;

    const pathOf = (s: Stroke) =>
      s.points
        .map(
          (p, i) =>
            `${i === 0 ? "M" : "L"}${(p.x - ox).toFixed(1)} ${(p.y - oy).toFixed(1)}`,
        )
        .join(" ");

    const svgSource =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(1)} ${h.toFixed(1)}">` +
      strokes
        .map(
          (s) =>
            `<path d="${pathOf(s)}" fill="none" stroke="${s.color}" stroke-width="${PEN_W}" stroke-linecap="round" stroke-linejoin="round"/>`,
        )
        .join("") +
      `</svg>`;

    addDrawing(svgSource, { x: ox, y: oy, w, h });
    onDone();
  }

  const visible = current ? [...strokes, current] : strokes;

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-10 cursor-crosshair touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <svg className="pointer-events-none fixed inset-0 h-screen w-screen">
        {visible.map((s, i) => (
          <polyline
            key={i}
            points={s.points
              .map((p) => {
                const sp = flowToScreenPosition(p);
                return `${sp.x},${sp.y}`;
              })
              .join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth={PEN_W * zoom}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {/* 펜 도구 바 — 묶기 모드 바와 같은 자리. 바 위에서는 그리기가 시작되지 않는다 */}
      <div className="pick-bar pointer-events-none absolute inset-x-0 z-30 flex justify-center px-4">
        <div
          className="glass-float pointer-events-auto flex items-center gap-2 rounded-full py-2 pl-3 pr-2"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {PEN_COLORS.map((c) => (
            <button
              key={c}
              aria-label="펜 색"
              title="펜 색"
              onClick={() => setColor(c)}
              className={
                color === c
                  ? "h-6 w-6 shrink-0 rounded-full border border-black/10 ring-2 ring-action ring-offset-1"
                  : "h-6 w-6 shrink-0 rounded-full border border-black/10"
              }
              style={{ background: c }}
            />
          ))}

          <span className="mx-0.5 h-5 w-px shrink-0 bg-divider" />

          <button
            onClick={() => setStrokes((s) => s.slice(0, -1))}
            disabled={strokes.length === 0}
            title="마지막 획 지우기"
            className="rounded-apple-md border border-divider bg-pearl px-2.5 py-1.5 text-[13px] text-ink-80 transition hover:bg-parchment disabled:opacity-40"
          >
            ↶
          </button>
          <button
            onClick={onDone}
            className="rounded-apple-md border border-divider bg-pearl px-3 py-1.5 text-[13px] text-ink-80 transition hover:bg-parchment"
          >
            취소
          </button>
          <button
            onClick={commit}
            disabled={strokes.length === 0}
            className="rounded-full bg-action px-3.5 py-1.5 text-[13px] text-white transition disabled:opacity-40"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
