import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { ArticlePane } from "@/components/ArticlePane";
import { ClearCacheDialog } from "@/components/ClearCacheDialog";
import { FeedList } from "@/components/FeedList";
import { HelpDialog } from "@/components/HelpDialog";
import { LoadingScreen } from "@/components/LoadingScreen";
import { FONT_SIZES, fontSizeAtom } from "@/lib/atoms";
import { clearAllCache, getCache, setCache } from "@/lib/db";
import {
  buildRssRequestUrl,
  parseArticlesFromXml,
  RSS_API_BASE_URL,
} from "@/lib/feed";
import type { Article, Subscription } from "@/types";

const CACHE_EXPIRATION_MS = 1000 * 60 * 30;
const PAGE_SCROLL_RATIO = 0.9;

export default function App() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedSubIndex, setSelectedSubIndex] = useState(-1);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useAtom(fontSizeAtom);

  const subListRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLElement>(null);
  const articleRefs = useRef<(HTMLElement | null)[]>([]);
  const pendingKeyboardArticleNavRef = useRef(false);

  useEffect(() => {
    document.title = "LLR Reader";
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered:", registration.scope);
        })
        .catch((error) => {
          console.log("SW registration failed:", error);
        });
    }
  }, []);

  useEffect(() => {
    if (selectedSubIndex < 0 || subscriptions.length === 0) return;

    const nextSubs = subscriptions.slice(
      selectedSubIndex + 1,
      selectedSubIndex + 6,
    );
    const urlsToPrefetch = nextSubs.map((subscription) => subscription.xmlUrl);

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "PREFETCH_RSS",
        urls: urlsToPrefetch,
        apiBaseUrl: RSS_API_BASE_URL,
      });
    }

    const prefetchToDB = async () => {
      const itemsToCache = nextSubs.slice(0, 2);

      for (const subscription of itemsToCache) {
        try {
          const existing = await getCache(subscription.xmlUrl);
          if (
            existing &&
            Date.now() - existing.timestamp < CACHE_EXPIRATION_MS
          ) {
            continue;
          }

          const response = await fetch(buildRssRequestUrl(subscription.xmlUrl));
          if (!response.ok) {
            throw new Error(`RSS fetch failed: ${response.status}`);
          }

          const parsedArticles = parseArticlesFromXml(await response.text());
          await setCache(subscription.xmlUrl, parsedArticles);
        } catch (error) {
          console.warn("Background prefetch failed:", error);
        }
      }
    };

    const timer = window.setTimeout(prefetchToDB, 2000);
    return () => window.clearTimeout(timer);
  }, [selectedSubIndex, subscriptions]);

  useEffect(() => {
    const fetchOPML = async () => {
      try {
        const response = await fetch("/export.xml");
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const outlines = xmlDoc.querySelectorAll("outline[xmlUrl]");

        const subs: Subscription[] = Array.from(outlines).map((node) => ({
          title:
            node.getAttribute("title") ||
            node.getAttribute("text") ||
            "No Title",
          xmlUrl: node.getAttribute("xmlUrl") || "",
          htmlUrl: node.getAttribute("htmlUrl") || "",
          unreadCount: Math.floor(Math.random() * 10),
        }));

        setSubscriptions(subs);
        if (subs.length > 0) setSelectedSubIndex(0);
      } catch (error) {
        console.error("Failed to load OPML:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchOPML();
  }, []);

  useEffect(() => {
    if (selectedSubIndex < 0 || !subscriptions[selectedSubIndex]) return;

    const fetchRSS = async () => {
      setSelectedArticleIndex(-1);
      const subscription = subscriptions[selectedSubIndex];

      try {
        const cached = await getCache(subscription.xmlUrl);
        if (cached && Date.now() - cached.timestamp < CACHE_EXPIRATION_MS) {
          setArticles(cached.articles);
          if (cached.articles.length > 0) setSelectedArticleIndex(0);
          return;
        }
      } catch (error) {
        console.warn("Cache read failed:", error);
      }

      setArticles([]);

      try {
        const response = await fetch(buildRssRequestUrl(subscription.xmlUrl));
        if (!response.ok) {
          throw new Error(`RSS fetch failed: ${response.status}`);
        }

        const parsedArticles = parseArticlesFromXml(await response.text());
        setArticles(parsedArticles);
        if (parsedArticles.length > 0) setSelectedArticleIndex(0);
        await setCache(subscription.xmlUrl, parsedArticles);
      } catch (error) {
        console.error("Failed to fetch RSS:", error);
      }
    };

    void fetchRSS();
  }, [selectedSubIndex, subscriptions]);

  useEffect(() => {
    if (pendingKeyboardArticleNavRef.current && selectedArticleIndex >= 0) {
      articleRefs.current[selectedArticleIndex]?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
      pendingKeyboardArticleNavRef.current = false;
    }
  }, [selectedArticleIndex]);

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
  }, [articles]);

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
        return;
      }

      if (showClearDialog || showHelpDialog) return;

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
            window.open(articles[selectedArticleIndex].link, "_blank");
          }
          break;
        case "c":
          setShowClearDialog(true);
          break;
        case "?":
          setShowHelpDialog(true);
          break;
        case "<":
          setFontSizeIndex((previousIndex) => Math.max(0, previousIndex - 1));
          break;
        case ">":
          setFontSizeIndex((previousIndex) =>
            Math.min(FONT_SIZES.length - 1, previousIndex + 1),
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
    selectedArticleIndex,
    setFontSizeIndex,
  ]);

  useEffect(() => {
    const activeSub = subListRef.current?.querySelector(
      "[data-selected='true']",
    );
    if (activeSub) {
      activeSub.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  });

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader />

      <div
        className={`flex min-h-0 flex-1 overflow-hidden bg-white text-gray-800 ${FONT_SIZES[fontSizeIndex]}`}
      >
        <FeedList
          subscriptions={subscriptions}
          selectedSubIndex={selectedSubIndex}
          onSelectSubscription={setSelectedSubIndex}
          subListRef={subListRef}
        />
        <ArticlePane
          articles={articles}
          articleRefs={articleRefs}
          contentAreaRef={contentAreaRef}
          fontSizeIndex={fontSizeIndex}
          selectedArticleIndex={selectedArticleIndex}
          selectedSubscription={subscriptions[selectedSubIndex]}
        />
      </div>

      <AppFooter />

      {showClearDialog && (
        <ClearCacheDialog
          onCancel={() => setShowClearDialog(false)}
          onConfirm={async () => {
            await clearAllCache();
            setShowClearDialog(false);
            window.location.reload();
          }}
        />
      )}

      {showHelpDialog && (
        <HelpDialog onClose={() => setShowHelpDialog(false)} />
      )}
    </div>
  );
}
