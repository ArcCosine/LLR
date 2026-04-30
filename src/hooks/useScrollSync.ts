import { useEffect } from "react";
import type { Article } from "@/types";

type ScrollSyncParams = {
  articles: Article[];
  articleRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  contentAreaRef: React.RefObject<HTMLElement | null>;
  setSelectedArticleIndex: (v: number | ((prev: number) => number)) => void;
  pendingKeyboardArticleNavRef: React.MutableRefObject<boolean>;
  selectedArticleIndex: number;
};

export function useScrollSync({
  articles,
  articleRefs,
  contentAreaRef,
  setSelectedArticleIndex,
  pendingKeyboardArticleNavRef,
  selectedArticleIndex,
}: ScrollSyncParams) {
  useEffect(() => {
    if (pendingKeyboardArticleNavRef.current && selectedArticleIndex >= 0) {
      articleRefs.current[selectedArticleIndex]?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
      pendingKeyboardArticleNavRef.current = false;
    }
  }, [selectedArticleIndex, articleRefs, pendingKeyboardArticleNavRef]);

  useEffect(() => {
    const contentArea = contentAreaRef.current;
    if (!contentArea || articles.length === 0) return;

    let frameId = 0;

    const updateSelectedArticleIndex = () => {
      frameId = 0;
      const containerRect = contentArea.getBoundingClientRect();
      const targetY = containerRect.top + 40;

      let currentIndex = 0;
      for (let index = 0; index < articles.length; index += 1) {
        const article = articleRefs.current[index];
        if (!article) continue;

        const articleTop = article.getBoundingClientRect().top;
        if (articleTop <= targetY) {
          currentIndex = index;
        } else {
          break;
        }
      }

      setSelectedArticleIndex((previousIndex) =>
        previousIndex === currentIndex ? previousIndex : currentIndex,
      );
    };

    const handleScroll = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(updateSelectedArticleIndex);
    };

    updateSelectedArticleIndex();
    contentArea.addEventListener("scroll", handleScroll);

    return () => {
      contentArea.removeEventListener("scroll", handleScroll);
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [articles, articleRefs, contentAreaRef, setSelectedArticleIndex]);
}
