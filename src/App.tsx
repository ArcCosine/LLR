import { useAtom } from "jotai";
import {
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { ArticlePane } from "@/components/ArticlePane";
import { ClearCacheDialog } from "@/components/ClearCacheDialog";
import { FeedList } from "@/components/FeedList";
import { FeedManagementDialog } from "@/components/FeedManagementDialog";
import { HelpDialog } from "@/components/HelpDialog";
import { LoadingScreen } from "@/components/LoadingScreen";
import { OpmlImportPanel } from "@/components/OpmlImportPanel";
import { FONT_SIZES, fontSizeAtom } from "@/lib/atoms";
import {
  clearAllCache,
  getCache,
  getStoredOpml,
  getSubscriptions,
  replaceStoredOpml,
  saveSubscriptions,
  setCache,
} from "@/lib/db";
import {
  RSS_API_BASE_URL,
  buildRssRequestUrl,
  generateOpmlFromSubscriptions,
  parseArticlesFromXml,
  parseSubscriptionsFromOpml,
} from "@/lib/feed";
import type { Article, Subscription } from "@/types";

const CACHE_EXPIRATION_MS = 1000 * 60 * 30;
const PAGE_SCROLL_RATIO = 0.9;
const INITIAL_STARTUP_REFRESH_COUNT = 30;

export default function App() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedSubIndex, setSelectedSubIndex] = useState(-1);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showManagementDialog, setShowManagementDialog] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");
  const [fontSizeIndex, setFontSizeIndex] = useAtom(fontSizeAtom);
  const [showFeedList, setShowFeedList] = useState(true);

  const subListRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLElement>(null);
  const articleRefs = useRef<(HTMLElement | null)[]>([]);
  const pendingKeyboardArticleNavRef = useRef(false);
  const activeFeedRequestIdRef = useRef(0);
  const hasRunInitialTopFeedsRefreshRef = useRef(false);
  const selectedSubIndexRef = useRef(selectedSubIndex);
  const subscriptionsRef = useRef(subscriptions);

  useEffect(() => {
    selectedSubIndexRef.current = selectedSubIndex;
  }, [selectedSubIndex]);

  useEffect(() => {
    subscriptionsRef.current = subscriptions;
  }, [subscriptions]);

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
    if (subscriptions.length === 0 || hasRunInitialTopFeedsRefreshRef.current) {
      return;
    }

    hasRunInitialTopFeedsRefreshRef.current = true;
    const topSubscriptions = subscriptions.slice(
      0,
      INITIAL_STARTUP_REFRESH_COUNT,
    );
    let cancelled = false;

    const refreshTopFeeds = async () => {
      const updates = new Map<string, number>();

      for (const [index, subscription] of topSubscriptions.entries()) {
        if (cancelled) return;

        try {
          const response = await fetch(buildRssRequestUrl(subscription.xmlUrl));
          if (!response.ok) {
            throw new Error(`RSS fetch failed: ${response.status}`);
          }

          const parsedArticles = parseArticlesFromXml(await response.text());
          if (cancelled) return;

          await setCache(subscription.xmlUrl, parsedArticles);
          if (cancelled) return;

          const timestamps = parsedArticles
            .map((a) => Date.parse(a.pubDate))
            .filter((t) => !isNaN(t));

          if (timestamps.length > 0) {
            const newest = Math.max(...timestamps);
            if (subscription.lastUpdated !== newest) {
              updates.set(subscription.xmlUrl, newest);
            }
          }

          if (
            subscriptionsRef.current[selectedSubIndexRef.current]?.xmlUrl ===
            subscription.xmlUrl
          ) {
            articleRefs.current = [];
            setArticles(parsedArticles);
            setSelectedArticleIndex(parsedArticles.length > 0 ? 0 : -1);
          }
        } catch (error) {
          if (!cancelled) {
            console.warn("Initial top feed refresh failed:", error);
          }
        }
      }

      if (updates.size > 0 && !cancelled) {
        setSubscriptions((prevSubs) => {
          const currentSelectedXmlUrl =
            prevSubs[selectedSubIndexRef.current]?.xmlUrl;

          const nextSubs = prevSubs.map((s) => {
            const updatedLastUpdated = updates.get(s.xmlUrl);
            return updatedLastUpdated !== undefined
              ? { ...s, lastUpdated: updatedLastUpdated }
              : s;
          });

          nextSubs.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));

          if (currentSelectedXmlUrl) {
            const newIndex = nextSubs.findIndex(
              (s) => s.xmlUrl === currentSelectedXmlUrl,
            );
            if (newIndex !== -1 && newIndex !== selectedSubIndexRef.current) {
              setTimeout(() => setSelectedSubIndex(newIndex), 0);
            }
          }

          void saveSubscriptions(nextSubs);
          return nextSubs;
        });
      }
    };

    void refreshTopFeeds();

    return () => {
      cancelled = true;
    };
  }, [subscriptions.length > 0]);

  useEffect(() => {
    const loadData = async () => {
      try {
        let subs: Subscription[] = [];
        const storedSubs = await getSubscriptions();
        if (storedSubs) {
          subs = storedSubs;
        } else {
          const storedOpml = await getStoredOpml();
          if (storedOpml) {
            subs = parseSubscriptionsFromOpml(storedOpml.text);
            await saveSubscriptions(subs);
          }
        }

        if (subs.length > 0) {
          // Sort once at startup
          subs.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
          setSubscriptions(subs);
          setSelectedSubIndex(0);
          setShowImportPanel(false);
        } else {
          setShowImportPanel(true);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        setShowImportPanel(true);
        setImportError(
          "保存済みデータの読み込みに失敗しました。再度取り込んでください。",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  useEffect(() => {
    if (selectedSubIndex < 0 || !subscriptions[selectedSubIndex]) return;

    const requestId = activeFeedRequestIdRef.current + 1;
    activeFeedRequestIdRef.current = requestId;
    const subscription = subscriptions[selectedSubIndex];
    let cancelled = false;

    const fetchRSS = async () => {
      const isStale = () =>
        cancelled || activeFeedRequestIdRef.current !== requestId;

      pendingKeyboardArticleNavRef.current = false;
      setSelectedArticleIndex(-1);
      articleRefs.current = [];
      setArticles([]);
      contentAreaRef.current?.scrollTo({ top: 0, behavior: "auto" });

      const updateLastUpdated = async (articles: Article[]) => {
        if (isStale() || articles.length === 0) return;

        // Find newest publication date
        const timestamps = articles
          .map((a) => Date.parse(a.pubDate))
          .filter((t) => !isNaN(t));

        if (timestamps.length === 0) return;
        const newest = Math.max(...timestamps);

        if (isStale()) return;

        if (subscription.lastUpdated !== newest) {
          setSubscriptions((prevSubs) => {
            const nextSubs = prevSubs.map((s) =>
              s.xmlUrl === subscription.xmlUrl
                ? { ...s, lastUpdated: newest }
                : s,
            );

            void saveSubscriptions(nextSubs);
            return nextSubs;
          });
        }
      };

      try {
        const cached = await getCache(subscription.xmlUrl);
        if (isStale()) return;
        if (cached && Date.now() - cached.timestamp < CACHE_EXPIRATION_MS) {
          setArticles(cached.articles);
          if (cached.articles.length > 0) setSelectedArticleIndex(0);
          void updateLastUpdated(cached.articles);
          return;
        }
      } catch (error) {
        console.warn("Cache read failed:", error);
      }

      setArticles([]);

      try {
        const response = await fetch(buildRssRequestUrl(subscription.xmlUrl));
        if (isStale()) return;
        if (!response.ok) {
          throw new Error(`RSS fetch failed: ${response.status}`);
        }

        const parsedArticles = parseArticlesFromXml(await response.text());
        if (isStale()) return;
        setArticles(parsedArticles);
        if (parsedArticles.length > 0) setSelectedArticleIndex(0);
        await setCache(subscription.xmlUrl, parsedArticles);
        void updateLastUpdated(parsedArticles);
      } catch (error) {
        if (!isStale()) {
          console.error("Failed to fetch RSS:", error);
        }
      }
    };

    void fetchRSS();

    return () => {
      cancelled = true;
    };
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
            // Ctrl+Click (or Cmd+Click on Mac) typically opens in a background tab
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
    showImportPanel,
    showManagementDialog,
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

  const handleImport = async (file: File) => {
    setImportBusy(true);
    setImportError("");

    try {
      const xmlText = await file.text();
      const nextSubscriptions = parseSubscriptionsFromOpml(xmlText);

      if (nextSubscriptions.length === 0) {
        throw new Error("フィードが1件も見つかりませんでした。");
      }

      await replaceStoredOpml(file.name, xmlText);
      await saveSubscriptions(nextSubscriptions);
      setSubscriptions(nextSubscriptions);
      setSelectedSubIndex(0);
      setArticles([]);
      setSelectedArticleIndex(-1);
      setShowImportPanel(false);
    } catch (error) {
      console.error("Failed to import OPML:", error);
      setImportError(
        error instanceof Error
          ? error.message
          : "OPMLの読み込みに失敗しました。",
      );
    } finally {
      setImportBusy(false);
    }
  };

  const handleExport = () => {
    if (subscriptions.length === 0) {
      alert("エクスポートするフィードがありません。");
      return;
    }

    const opmlContent = generateOpmlFromSubscriptions(subscriptions);
    const blob = new Blob([opmlContent], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `llr-subscriptions-${
      new Date().toISOString().split("T")[0]
    }.opml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveAllSubscriptions = async (nextSubs: Subscription[]) => {
    try {
      await saveSubscriptions(nextSubs);
      setSubscriptions(nextSubs);
      setSelectedSubIndex((prev) => Math.min(nextSubs.length - 1, prev));
      setShowManagementDialog(false);
    } catch (error) {
      console.error("Failed to save subscriptions:", error);
      alert("保存に失敗しました。");
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader
        onShowImport={() => setShowImportPanel(true)}
        onShowManagement={() => setShowManagementDialog(true)}
        onExport={handleExport}
      />

      <div className="relative min-h-0 flex-1">
        {!subscriptions.length && showImportPanel ? (
          <OpmlImportPanel
            busy={importBusy}
            errorMessage={importError}
            hasSubscriptions={false}
            onClose={() => setShowImportPanel(false)}
            onImport={handleImport}
          />
        ) : (
          <div
            className={`flex h-full min-h-0 overflow-hidden bg-white text-gray-800 leading-relaxed ${FONT_SIZES[fontSizeIndex]}`}
          >
            <FeedList
              subscriptions={subscriptions}
              selectedSubIndex={selectedSubIndex}
              onSelectSubscription={setSelectedSubIndex}
              subListRef={subListRef}
              showFeedList={showFeedList}
              onToggleFeedList={() => setShowFeedList((prev) => !prev)}
            />
            <ArticlePane
              articles={articles}
              articleRefs={articleRefs}
              contentAreaRef={contentAreaRef}
              fontSizeIndex={fontSizeIndex}
              selectedArticleIndex={selectedArticleIndex}
              selectedSubscription={subscriptions[selectedSubIndex]}
            />

            {/* Feed Navigation Buttons - Positioned on the bottom-right edge of the article area */}
            <div className="absolute right-4 bottom-4 z-20 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowClearDialog(true)}
                title="Clear Cache"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 transition-all hover:bg-red-50 active:scale-95 opacity-80 hover:opacity-100"
              >
                <RotateCcw size={20} className="text-gray-600" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedSubIndex((prev) => Math.max(0, prev - 1))
                }
                disabled={selectedSubIndex <= 0}
                title="Previous Feed (a)"
                className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 transition-all hover:bg-gray-50 active:scale-95 ${
                  selectedSubIndex <= 0
                    ? "opacity-30 pointer-events-none"
                    : "opacity-80 hover:opacity-100"
                }`}
              >
                <ChevronUp size={24} className="text-gray-600" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedSubIndex((prev) =>
                    Math.min(subscriptions.length - 1, prev + 1),
                  )
                }
                disabled={selectedSubIndex >= subscriptions.length - 1}
                title="Next Feed (s)"
                className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 transition-all hover:bg-gray-50 active:scale-95 ${
                  selectedSubIndex >= subscriptions.length - 1
                    ? "opacity-30 pointer-events-none"
                    : "opacity-80 hover:opacity-100"
                }`}
              >
                <ChevronDown size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Unified Toggle Button - Straddles the boundary when Feeds is open, moves to bottom-left when closed */}
            <button
              type="button"
              onClick={() => setShowFeedList((prev) => !prev)}
              title={showFeedList ? "Hide sidebar (f)" : "Show sidebar (f)"}
              className={`absolute bottom-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg border border-gray-300 hover:bg-gray-50 transition-all duration-300 ease-in-out ${
                showFeedList
                  ? "left-64 max-md:left-52 -translate-x-1/2"
                  : "left-4"
              }`}
            >
              {showFeedList ? (
                <PanelLeftClose size={18} className="text-gray-600" />
              ) : (
                <PanelLeftOpen size={18} className="text-gray-600" />
              )}
            </button>
          </div>
        )}

        {subscriptions.length > 0 && showImportPanel && (
          <OpmlImportPanel
            busy={importBusy}
            errorMessage={importError}
            hasSubscriptions
            onClose={() => setShowImportPanel(false)}
            onImport={handleImport}
          />
        )}
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

      {showManagementDialog && (
        <FeedManagementDialog
          subscriptions={subscriptions}
          onSaveAll={handleSaveAllSubscriptions}
          onClose={() => setShowManagementDialog(false)}
        />
      )}
    </div>
  );
}
