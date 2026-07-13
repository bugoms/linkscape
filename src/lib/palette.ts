export type ColorToken =
  | "neutral"
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "violet";

export const COLOR_TOKENS: ColorToken[] = [
  "neutral",
  "sky",
  "emerald",
  "amber",
  "rose",
  "violet",
];

/**
 * 카드 색은 "분류"지 "액션"이 아니다.
 * 그래서 전부 흰 종이에 가까운 옅은 틴트로만 쓰고, 누를 수 있다는 신호(Action Blue)와
 * 절대 헷갈리지 않게 한다. 그림자는 없고 헤어라인만으로 면을 만든다.
 *
 * Tailwind 는 클래스명을 정적으로 스캔하므로 문자열을 조립하지 말고 다 적어둔다.
 */
export const CARD_COLORS: Record<ColorToken, { card: string; swatch: string }> = {
  neutral: {
    card: "border-hairline bg-canvas",
    swatch: "bg-[#d2d2d7]",
  },
  sky: {
    card: "border-[#cfe0f5] bg-[#f4f8fd]",
    swatch: "bg-[#5aa9f5]",
  },
  emerald: {
    card: "border-[#cfe5d6] bg-[#f3f9f5]",
    swatch: "bg-[#4cae72]",
  },
  amber: {
    card: "border-[#ecdfba] bg-[#fdf9ee]",
    swatch: "bg-[#e5a83c]",
  },
  rose: {
    card: "border-[#f0d3d5] bg-[#fdf5f5]",
    swatch: "bg-[#e0687a]",
  },
  violet: {
    card: "border-[#ddd3f2] bg-[#f8f5fd]",
    swatch: "bg-[#8c6fe0]",
  },
};

export const FRAME_COLORS: Record<ColorToken, { frame: string; title: string }> = {
  neutral: { frame: "border-[#d2d2d7] bg-[#00000004]", title: "text-ink-48" },
  sky: { frame: "border-[#b9d5f2] bg-[#0066cc08]", title: "text-[#2b6cb0]" },
  emerald: { frame: "border-[#bcdcc7] bg-[#34a85308]", title: "text-[#2f7d54]" },
  amber: { frame: "border-[#e6d3a6] bg-[#e5a83c0a]", title: "text-[#9a6b1a]" },
  rose: { frame: "border-[#eec4c8] bg-[#e0687a0a]", title: "text-[#a54455]" },
  violet: { frame: "border-[#cfc0ec] bg-[#8c6fe00a]", title: "text-[#63499f]" },
};

export function cardColor(token: string | null | undefined) {
  return CARD_COLORS[(token as ColorToken) ?? "neutral"] ?? CARD_COLORS.neutral;
}

export function frameColor(token: string | null | undefined) {
  return FRAME_COLORS[(token as ColorToken) ?? "sky"] ?? FRAME_COLORS.sky;
}
