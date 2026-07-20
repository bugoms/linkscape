"use client";

import { create } from "zustand";

/** 그룹 만들기 모드.
 *  null = 꺼짐 / 'rect'·'free' = 올가미(데스크톱) / 'pick' = 카드 탭해 고르기(모바일) */
export type GroupLassoMode = "rect" | "free" | "pick" | null;

export const useGroupMode = create<{
  mode: GroupLassoMode;
  setMode: (mode: GroupLassoMode) => void;
}>((set) => ({
  mode: null,
  setMode: (mode) => set({ mode }),
}));
