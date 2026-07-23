"use client";

import { useReactFlow } from "@xyflow/react";
import { useEffect, type RefObject } from "react";

/** 오버레이(그룹 올가미·그리기) 위에서도 캔버스 휠 팬/줌이 되게 한다.
 *
 *  오버레이는 ReactFlow 밖의 형제 요소라 휠 이벤트가 캔버스에 닿지 않고,
 *  특히 Ctrl+휠은 브라우저 "페이지 줌"으로 새어 나간다. non-passive 네이티브
 *  리스너로 가로채 RF 뷰포트를 직접 움직인다.
 *  - Ctrl(⌘)+휠 = 커서 아래 지점을 고정한 캔버스 줌 (한계는 RF minZoom/maxZoom 과 동일)
 *  - 일반 휠 = 팬 (Shift+휠 = 가로 팬)
 *  React onWheel 은 passive 로 붙어 preventDefault 가 안 먹으므로 쓰지 않는다. */
export function useWheelPanZoom(ref: RefObject<HTMLElement | null>) {
  const { getViewport, setViewport, screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // 브라우저 페이지 줌·스크롤 차단

      const { x, y, zoom } = getViewport();

      if (e.ctrlKey || e.metaKey) {
        // Canvas.tsx 의 minZoom/maxZoom 과 같은 값
        const next = Math.min(
          2.5,
          Math.max(0.1, zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)),
        );
        if (next === zoom) return;
        // 커서 아래 캔버스 지점이 그대로 있도록 원점을 보정
        const rect = el.getBoundingClientRect();
        const fp = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        void setViewport({
          zoom: next,
          x: e.clientX - rect.left - fp.x * next,
          y: e.clientY - rect.top - fp.y * next,
        });
        return;
      }

      const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX;
      const dy = e.shiftKey && e.deltaX === 0 ? 0 : e.deltaY;
      void setViewport({ zoom, x: x - dx, y: y - dy });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref, getViewport, setViewport, screenToFlowPosition]);
}
