import { useEffect } from "react";
import type { Article, Subscription } from "@/types";

type ShortcutParams = {
  subscriptions: Subscription[];
  articles: Article[];
  showClearDialog: boolean;
  setShowClearDialog: (v: boolean) => void;
  showHelpDialog: boolean;
  setShowHelpDialog: (v: boolean) => void;
  showImportPanel: boolean;
  showManagementDialog: boolean;
  setShowManagementDialog: (v: boolean) => void;
  selectedArticleIndex: number;
  setSelectedArticleIndex: (v: number | ((prev: number) => number)) => void;
  setSelectedSubIndex: (v: number | ((prev: number) => number)) => void;
  setFontSizeIndex: (v: number | ((prev: number) => number)) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  setShowFeedList: (v: boolean | ((prev: boolean) => boolean)) => void;
  contentAreaRef: React.RefObject<HTMLElement | null>;
  pendingKeyboardArticleNavRef: React.MutableRefObject<boolean>;
  PAGE_SCROLL_RATIO: number;
  FONT_SIZES_LENGTH: number;
};

export function useKeyboardShortcuts({
  subscriptions,
  articles,
  showClearDialog,
  setShowClearDialog,
  showHelpDialog,
  setShowHelpDialog,
  showImportPanel,
  showManagementDialog,
  setShowManagementDialog,
  selectedArticleIndex,
  setSelectedArticleIndex,
  setSelectedSubIndex,
  setFontSizeIndex,
  darkMode,
  setDarkMode,
  setShowFeedList,
  contentAreaRef,
  pendingKeyboardArticleNavRef,
  PAGE_SCROLL_RATIO,
  FONT_SIZES_LENGTH,
}: ShortcutParams) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.key === "Escape" || (event.ctrlKey && event.key === "[")) {
        setShowClearDialog(false);
        setShowHelpDialog(false);
        setShowManagementDialog(false);
        return;
      }

      if (
        showClearDialog ||
        showHelpDialog ||
        showImportPanel ||
        showManagementDialog
      )
        return;

      switch (event.key) {
        case "a":
          pendingKeyboardArticleNavRef.current = false;
          contentAreaRef.current?.scrollTo({ top: 0, behavior: "auto" });
          setSelectedArticleIndex(-1);
          setSelectedSubIndex((previousIndex) =>
            Math.max(0, previousIndex - 1),
          );
          break;
        case "s":
          pendingKeyboardArticleNavRef.current = false;
          contentAreaRef.current?.scrollTo({ top: 0, behavior: "auto" });
          setSelectedArticleIndex(-1);
          setSelectedSubIndex((previousIndex) =>
            Math.min(subscriptions.length - 1, previousIndex + 1),
          );
          break;
        case "k":
          event.preventDefault();
          pendingKeyboardArticleNavRef.current = true;
          setSelectedArticleIndex((previousIndex) =>
            Math.max(0, previousIndex - 1),
          );
          break;
        case "j":
          event.preventDefault();
          pendingKeyboardArticleNavRef.current = true;
          setSelectedArticleIndex((previousIndex) =>
            Math.min(articles.length - 1, previousIndex + 1),
          );
          break;
        case "o":
          if (selectedArticleIndex >= 0 && articles[selectedArticleIndex]) {
            const link = articles[selectedArticleIndex].link;
            const a = document.createElement("a");
            a.href = link;
            a.target = "_blank";
            a.rel = "noreferrer";
            const clickEvent = new MouseEvent("click", {
              ctrlKey: true,
              metaKey: true,
            });
            a.dispatchEvent(clickEvent);
          }
          break;
        case "c":
          setShowClearDialog(true);
          break;
        case "?":
          setShowHelpDialog(true);
          break;
        case "m":
          setShowManagementDialog(true);
          break;
        case "f":
          setShowFeedList((prev) => !prev);
          break;
        case "t":
          setDarkMode(!darkMode);
          break;
        case "<":
          setFontSizeIndex((previousIndex) => Math.max(0, previousIndex - 1));
          break;
        case ">":
          setFontSizeIndex((previousIndex) =>
            Math.min(FONT_SIZES_LENGTH - 1, previousIndex + 1),
          );
          break;
        case " ":
          if (contentAreaRef.current) {
            event.preventDefault();
            const scrollAmount =
              contentAreaRef.current.clientHeight * PAGE_SCROLL_RATIO;
            contentAreaRef.current.scrollBy({
              top: event.shiftKey ? -scrollAmount : scrollAmount,
              behavior: "auto",
            });
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    subscriptions.length,
    articles,
    showClearDialog,
    showHelpDialog,
    showImportPanel,
    showManagementDialog,
    selectedArticleIndex,
    setFontSizeIndex,
    darkMode,
    setDarkMode,
    setShowClearDialog,
    setShowHelpDialog,
    setShowManagementDialog,
    setSelectedArticleIndex,
    setSelectedSubIndex,
    setShowFeedList,
    contentAreaRef,
    pendingKeyboardArticleNavRef,
    PAGE_SCROLL_RATIO,
    FONT_SIZES_LENGTH,
  ]);
}
