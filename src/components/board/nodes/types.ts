import type { Node } from "@xyflow/react";

import type { FrameRow, ItemRow } from "@/lib/types";

export type ItemNodeData = {
  item: ItemRow;
  thumbUrl: string | null;
  dimmed: boolean;
};

export type FrameNodeData = {
  frame: FrameRow;
};

export type ItemNodeType = Node<
  ItemNodeData,
  "link" | "pdf" | "image" | "note" | "file" | "stroke"
>;
export type FrameNodeType = Node<FrameNodeData, "frame">;
export type AppNode = ItemNodeType | FrameNodeType;

/** 펜 그리기(캔버스 잉크) 아이템 — kind='image' 를 재사용하되 파일 없이
 *  데이터 URL(og_image_url)로만 담긴다. RF 노드 타입 분기(stroke)에 쓴다. */
export function isStrokeItem(
  item: Pick<ItemRow, "kind" | "storage_path" | "og_image_url">,
): boolean {
  return (
    item.kind === "image" &&
    !item.storage_path &&
    (item.og_image_url?.startsWith("data:image/svg") ?? false)
  );
}

export const ITEM_MIN_W = 140;
export const ITEM_MIN_H = 90;
export const FRAME_MIN_W = 240;
export const FRAME_MIN_H = 180;
