"use client";

import { useCallback } from "react";

import { useBoard } from "@/store/board";
import { useSelection } from "@/store/selection";
import { useViewer } from "@/store/viewer";

/** 선택 대상에 대한 공용 액션 — 툴바 버튼·키보드 단축키·우클릭 메뉴가 같이 쓴다. */
export function useBoardActions() {
  const deleteSelected = useCallback(() => {
    const { nodeIds, edgeIds, setNodeIds, setEdgeIds } = useSelection.getState();
    const targetNodeIds = [...nodeIds];
    const targetEdgeIds = [...edgeIds];
    if (targetNodeIds.length === 0 && targetEdgeIds.length === 0) return;

    useBoard.getState().apply((d) => {
      for (const id of targetNodeIds) {
        const frame = d.frames[id];
        if (frame) {
          // 프레임만 지우고 안의 카드는 절대좌표로 남긴다 (같이 지우지 않는다)
          for (const item of Object.values(d.items)) {
            if (item.frame_id !== frame.id) continue;
            d.items[item.id] = {
              ...item,
              frame_id: null,
              x: frame.x + item.x,
              y: frame.y + item.y,
            };
          }
          delete d.frames[id];
          continue;
        }

        const item = d.items[id];
        if (item) d.items[id] = { ...item, status: "trashed" };
      }

      for (const id of targetEdgeIds) delete d.edges[id];

      // 휴지통으로 간 카드에 붙어 있던 연결선 정리
      for (const edge of Object.values(d.edges)) {
        const source = d.items[edge.source_item_id];
        const target = d.items[edge.target_item_id];
        if (
          !source ||
          source.status !== "active" ||
          !target ||
          target.status !== "active"
        ) {
          delete d.edges[edge.id];
        }
      }
    });

    setNodeIds(new Set());
    setEdgeIds(new Set());
  }, []);

  const duplicateSelected = useCallback(() => {
    const { nodeIds, setNodeIds } = useSelection.getState();
    if (nodeIds.size === 0) return;
    const created: string[] = [];

    useBoard.getState().apply((d) => {
      for (const id of nodeIds) {
        const item = d.items[id];
        if (!item || item.status !== "active") continue;
        const copy = {
          ...item,
          id: crypto.randomUUID(),
          x: item.x + 24,
          y: item.y + 24,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        d.items[copy.id] = copy;
        created.push(copy.id);
      }
    });

    if (created.length > 0) setNodeIds(new Set(created));
  }, []);

  const deleteEdge = useCallback((edgeId: string) => {
    useBoard.getState().apply((d) => {
      delete d.edges[edgeId];
    });
    const sel = useSelection.getState();
    if (sel.edgeIds.has(edgeId)) {
      const next = new Set(sel.edgeIds);
      next.delete(edgeId);
      sel.setEdgeIds(next);
    }
  }, []);

  /** 카드 종류에 맞는 "열기" — PDF/이미지는 뷰어, 링크는 새 탭. */
  const openItem = useCallback((itemId: string) => {
    const item = useBoard.getState().items[itemId];
    if (!item) return;
    if (item.kind === "pdf" || item.kind === "image") {
      useViewer.getState().open(itemId);
      return;
    }
    if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
  }, []);

  return { deleteSelected, duplicateSelected, deleteEdge, openItem };
}
