import { atomWithStorage } from "jotai/utils";

export const FONT_SIZES = [
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
  "text-3xl",
  "text-4xl",
  "text-5xl",
  "text-6xl",
];

export const fontSizeAtom = atomWithStorage<number>("llr-font-size-index", 0);
export const darkModeAtom = atomWithStorage<boolean>("llr-dark-mode", false);
