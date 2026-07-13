"use client";

import { useMemo, useState } from "react";

import { CARD_COLORS, COLOR_TOKENS } from "@/lib/palette";
import { createClient } from "@/lib/supabase/client";
import type { TagRow } from "@/lib/types";
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
    <aside className="absolute right-5 top-5 z-20 w-[264px] rounded-apple-lg border border-hairline bg-canvas p-4">
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

      {item && <TagEditor itemId={item.id} />}

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

/* ------------------------------------------------------------------------- */

function TagEditor({ itemId }: { itemId: string }) {
  const tags = useBoard((s) => s.tags);
  const itemTags = useBoard((s) => s.itemTags);
  const setTags = useBoard((s) => s.setTags);
  const setItemTags = useBoard((s) => s.setItemTags);
  const userId = useBoard((s) => s.userId);

  const [draft, setDraft] = useState("");
  const assigned = useMemo(() => itemTags[itemId] ?? [], [itemTags, itemId]);

  /** 태그는 언두 대상이 아니다 — DB 에 바로 쓴다. */
  async function addTag(rawName: string) {
    const name = rawName.trim();
    if (!name) return;
    setDraft("");

    const supabase = createClient();
    let tag = tags.find((t) => t.name.toLowerCase() === name.toLowerCase());

    if (!tag) {
      const { data, error } = await supabase
        .from("tags")
        .insert({ user_id: userId, name })
        .select()
        .single();
      if (error || !data) return;
      tag = data as TagRow;
      setTags([...tags, tag]);
    }

    if (assigned.includes(tag.id)) return;

    const { error } = await supabase
      .from("item_tags")
      .insert({ item_id: itemId, tag_id: tag.id, user_id: userId });
    if (error) return;

    setItemTags(itemId, [...assigned, tag.id]);
  }

  async function removeTag(tagId: string) {
    setItemTags(
      itemId,
      assigned.filter((id) => id !== tagId),
    );
    await createClient()
      .from("item_tags")
      .delete()
      .eq("item_id", itemId)
      .eq("tag_id", tagId);
  }

  return (
    <div className="mt-4">
      <p className="mb-2 text-[12px] text-ink-48">태그</p>

      <div className="flex flex-wrap gap-1.5">
        {assigned.map((tagId) => {
          const tag = tags.find((t) => t.id === tagId);
          if (!tag) return null;
          return (
            <button
              key={tagId}
              onClick={() => void removeTag(tagId)}
              className="group rounded-full border border-hairline bg-pearl px-2.5 py-1 text-[12px] text-ink-80 transition hover:border-hairline hover:bg-parchment"
            >
              {tag.name}
              <span className="ml-1 text-ink-48">×</span>
            </button>
          );
        })}
      </div>

      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") void addTag(draft);
        }}
        placeholder="태그 입력 후 Enter"
        list="tag-suggestions"
        className="mt-2 h-9 w-full rounded-full border border-hairline bg-canvas px-3 text-[13px] text-ink outline-none transition placeholder:text-ink-48 focus:border-action-focus"
      />
      <datalist id="tag-suggestions">
        {tags.map((tag) => (
          <option key={tag.id} value={tag.name} />
        ))}
      </datalist>
    </div>
  );
}
