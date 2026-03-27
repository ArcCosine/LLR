"use client";

import { useEffect, useRef, useState } from "react";
import type { Article, Subscription } from "@/types";
import { getCache, setCache, clearAllCache } from "@/lib/db";
import { useAtom } from "jotai";
import { fontSizeAtom, FONT_SIZES } from "@/lib/atoms";

const CACHE_EXPIRATION_MS = 1000 * 60 * 30; // 30 minutes

export default function Home() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedSubIndex, setSelectedSubIndex] = useState<number>(-1);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState<number>(-1);
  const [loading, setLoading] = useState<boolean>(true);
  const [showClearDialog, setShowClearDialog] = useState<boolean>(false);
  const [showHelpDialog, setShowHelpDialog] = useState<boolean>(false);
  const [fontSizeIndex, setFontSizeIndex] = useAtom(fontSizeAtom);

  const subListRef = useRef<HTMLDivElement>(null);
  const articleListRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLElement>(null);

  // Register Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("SW registered:", reg.scope))
        .catch((err) => console.log("SW registration failed:", err));
    }
  }, []);

  // Background prefetch next few subscriptions
  useEffect(() => {
    if (selectedSubIndex < 0 || subscriptions.length === 0) return;

    const nextSubs = subscriptions.slice(
      selectedSubIndex + 1,
      selectedSubIndex + 6,
    );
    const urlsToPrefetch = nextSubs.map((s) => s.xmlUrl);

    // 1. Tell SW to prefetch and cache raw responses
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "PREFETCH_RSS",
        urls: urlsToPrefetch,
      });
    }

    // 2. Proactively parse and save to IndexedDB for the next 2 items
    const prefetchToDB = async () => {
      const itemsToCache = nextSubs.slice(0, 2);
      for (const sub of itemsToCache) {
        try {
          // Check if already in cache
          const existing = await getCache(sub.xmlUrl);
          if (existing && Date.now() - existing.timestamp < CACHE_EXPIRATION_MS)
            continue;

          const response = await fetch(
            `/api/proxy?url=${encodeURIComponent(sub.xmlUrl)}`,
          );
          const xmlText = await response.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");

          let items: Element[] = [];
          const rssItems = xmlDoc.querySelectorAll("item");
          const atomEntries = xmlDoc.querySelectorAll("entry");
          if (rssItems.length > 0) items = Array.from(rssItems);
          else if (atomEntries.length > 0) items = Array.from(atomEntries);

          const parsedArticles: Article[] = items.map((node) => {
            const title =
              node.querySelector("title")?.textContent || "No Title";
            const link =
              node.querySelector("link")?.textContent ||
              node.querySelector("link")?.getAttribute("href") ||
              "";
            const content =
              node.getElementsByTagName("content:encoded")[0]?.textContent ||
              node.querySelector("description")?.textContent ||
              node.querySelector("content")?.textContent ||
              node.querySelector("summary")?.textContent ||
              "";
            const pubDate =
              node.querySelector("pubDate")?.textContent ||
              node.querySelector("published")?.textContent ||
              "";
            return { title, link, content, pubDate };
          });

          await setCache(sub.xmlUrl, parsedArticles);
          console.log(`[Prefetch] Populated IndexedDB for: ${sub.title}`);
        } catch (e) {
          console.warn("Background prefetch failed:", e);
        }
      }
    };

    const timer = setTimeout(prefetchToDB, 2000); // Wait 2s of idle
    return () => clearTimeout(timer);
  }, [selectedSubIndex, subscriptions]);

  // Load OPML
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
          unreadCount: Math.floor(Math.random() * 10), // Mock unread count
        }));

        setSubscriptions(subs);
        if (subs.length > 0) setSelectedSubIndex(0);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load OPML:", error);
        setLoading(false);
      }
    };
    fetchOPML();
  }, []);

  // Fetch articles when subscription changes
  useEffect(() => {
    if (selectedSubIndex < 0 || !subscriptions[selectedSubIndex]) return;

    const fetchRSS = async () => {
      setSelectedArticleIndex(-1);
      const sub = subscriptions[selectedSubIndex];

      // Try to get from cache first
      try {
        const cached = await getCache(sub.xmlUrl);
        if (cached && Date.now() - cached.timestamp < CACHE_EXPIRATION_MS) {
          setArticles(cached.articles);
          if (cached.articles.length > 0) setSelectedArticleIndex(0);
          return;
        }
      } catch (cacheError) {
        console.warn("Cache read failed:", cacheError);
      }

      setArticles([]);
      try {
        const response = await fetch(
          `/api/proxy?url=${encodeURIComponent(sub.xmlUrl)}`,
        );
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        let items: Element[] = [];
        const rssItems = xmlDoc.querySelectorAll("item");
        const atomEntries = xmlDoc.querySelectorAll("entry");

        if (rssItems.length > 0) {
          items = Array.from(rssItems);
        } else if (atomEntries.length > 0) {
          items = Array.from(atomEntries);
        }

        const parsedArticles: Article[] = items.map((node) => {
          const title = node.querySelector("title")?.textContent || "No Title";
          const link =
            node.querySelector("link")?.textContent ||
            node.querySelector("link")?.getAttribute("href") ||
            "";
          const content =
            node.getElementsByTagName("content:encoded")[0]?.textContent ||
            node.querySelector("description")?.textContent ||
            node.querySelector("content")?.textContent ||
            node.querySelector("summary")?.textContent ||
            "";
          const pubDate =
            node.querySelector("pubDate")?.textContent ||
            node.querySelector("published")?.textContent ||
            "";
          return { title, link, content, pubDate };
        });

        setArticles(parsedArticles);
        if (parsedArticles.length > 0) setSelectedArticleIndex(0);

        // Save to cache
        await setCache(sub.xmlUrl, parsedArticles);
      } catch (error) {
        console.error("Failed to fetch RSS:", error);
      }
    };
    fetchRSS();
  }, [selectedSubIndex, subscriptions]);

  // Scroll content to top when article changes
  useEffect(() => {
    if (selectedArticleIndex >= 0 && contentAreaRef.current) {
      contentAreaRef.current.scrollTo(0, 0);
    }
  }, [selectedArticleIndex]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      // Close dialogs with Escape or Ctrl+[
      if (e.key === "Escape" || (e.ctrlKey && e.key === "[")) {
        setShowClearDialog(false);
        setShowHelpDialog(false);
        return;
      }

      // If any dialog is open, don't handle other shortcuts
      if (showClearDialog || showHelpDialog) return;

      switch (e.key) {
        case "a": // Previous Subscription
          setSelectedSubIndex((prev) => Math.max(0, prev - 1));
          break;
        case "s": // Next Subscription
          setSelectedSubIndex((prev) =>
            Math.min(subscriptions.length - 1, prev + 1),
          );
          break;
        case "k": // Previous Article
          setSelectedArticleIndex((prev) => Math.max(0, prev - 1));
          break;
        case "j": // Next Article
          setSelectedArticleIndex((prev) =>
            Math.min(articles.length - 1, prev + 1),
          );
          break;
        case "o": // Open in new tab
          if (selectedArticleIndex >= 0 && articles[selectedArticleIndex]) {
            window.open(articles[selectedArticleIndex].link, "_blank");
          }
          break;
        case "c": // Clear cache dialog
          setShowClearDialog(true);
          break;
        case "?": // Show help dialog
          setShowHelpDialog(true);
          break;
        case "<": // Decrease font size
          setFontSizeIndex((prev) => Math.max(0, prev - 1));
          break;
        case ">": // Increase font size
          setFontSizeIndex((prev) => Math.min(FONT_SIZES.length - 1, prev + 1));
          break;
        case " ": // Space: Scroll Down / Shift+Space: Scroll Up
          if (contentAreaRef.current) {
            e.preventDefault();
            const scrollAmount = contentAreaRef.current.clientHeight * 0.8;
            contentAreaRef.current.scrollBy({
              top: e.shiftKey ? -scrollAmount : scrollAmount,
              behavior: "smooth",
            });
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    subscriptions.length,
    articles.length,
    showClearDialog,
    showHelpDialog,
    selectedArticleIndex,
    setFontSizeIndex,
  ]);

  // Scroll list items into view
  useEffect(() => {
    const activeSub = subListRef.current?.querySelector(
      "[data-selected='true']",
    );
    if (activeSub) {
      activeSub.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [selectedSubIndex]);

  useEffect(() => {
    const activeArticle = articleListRef.current?.querySelector(
      "[data-selected='true']",
    );
    activeArticle?.scrollIntoView({ block: "nearest" });
  }, [selectedArticleIndex]);

  if (loading)
    return (
      <div className="h-full flex items-center justify-center bg-white text-gray-500">
        Loading...
      </div>
    );

  return (
    <div className={`flex h-full w-full overflow-hidden bg-white text-gray-800 ${FONT_SIZES[fontSizeIndex]}`}>
      {/* Left Pane: Feeds (Full height between header and footer) */}
      <nav className="w-64 flex-shrink-0 border-r border-gray-300 flex flex-col bg-gray-50 overflow-hidden">
        <div className="px-3 py-2 font-bold border-b border-gray-300 bg-gray-200">
          Feeds
        </div>
        <div ref={subListRef} className="flex-1 overflow-y-auto">
          {subscriptions.map((sub, index) => {
            const isSelected = index === selectedSubIndex;
            return (
              <button
                type="button"
                key={sub.xmlUrl || index}
                onClick={() => setSelectedSubIndex(index)}
                data-selected={isSelected}
                className={`w-full text-left px-3 py-1.5 cursor-pointer border-b border-gray-200 flex justify-between items-center outline-none ${
                  isSelected
                    ? "bg-blue-100 font-bold"
                    : "hover:bg-gray-100"
                }`}
              >
                <span className="truncate flex-1" title={sub.title}>
                  {sub.title}
                </span>
                {sub.unreadCount > 0 && (
                  <span className="ml-2 text-[10px] text-blue-600 font-normal">
                    ({sub.unreadCount})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Right Side: Split into Top Right and Bottom Right */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Right: Articles List */}
        <section className="h-1/3 border-b border-gray-300 flex flex-col min-h-[150px] overflow-hidden">
          <div className="px-3 py-2 font-bold bg-gray-200 border-b border-gray-300 truncate">
            Articles {selectedSubIndex >= 0 && subscriptions[selectedSubIndex] ? ` - ${subscriptions[selectedSubIndex].title}` : ""}
          </div>
          <div ref={articleListRef} className="flex-1 overflow-y-auto">
            {articles.length === 0 ? (
              <div className="p-4 text-gray-400">No articles found.</div>
            ) : (
              articles.map((article, index) => {
                const isSelected = index === selectedArticleIndex;
                return (
                  <button
                    type="button"
                    key={article.link || index}
                    onClick={() => setSelectedArticleIndex(index)}
                    data-selected={isSelected}
                    className={`w-full text-left px-3 py-1.5 cursor-pointer border-b border-gray-100 outline-none ${
                      isSelected
                        ? "bg-blue-50 font-semibold"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="truncate">{article.title}</span>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                        {article.pubDate.split(" ").slice(0, 4).join(" ")}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Bottom Right: Article Content Rendering */}
        <main
          ref={contentAreaRef}
          className="flex-1 bg-white relative overflow-y-auto"
        >
          {selectedArticleIndex >= 0 && articles[selectedArticleIndex] ? (
            <article className="max-w-4xl mx-auto px-6 py-8">
              <header className="mb-8 border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold mb-2">
                  <a
                    href={articles[selectedArticleIndex].link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-gray-900"
                  >
                    {articles[selectedArticleIndex].title}
                  </a>
                </h2>
                <div className="text-sm text-gray-500 flex justify-between">
                  <span>{articles[selectedArticleIndex].pubDate}</span>
                  <a
                    href={articles[selectedArticleIndex].link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Original Site →
                  </a>
                </div>
              </header>
              <div
                className={`prose max-w-none ${FONT_SIZES[fontSizeIndex]}`}
                dangerouslySetInnerHTML={{
                  __html: articles[selectedArticleIndex].content,
                }}
              />
            </article>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Select an article to view its content.
            </div>
          )}
        </main>
      </div>

      {/* Clear Cache Confirmation Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Clear Cache?</h3>
            <p className="text-gray-600 mb-6">
              Do you want to clear all cached RSS data? This will force the app
              to fetch everything again.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowClearDialog(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                No
              </button>
              <button
                type="button"
                onClick={async () => {
                  await clearAllCache();
                  setShowClearDialog(false);
                  // Optionally trigger a refresh of current articles
                  window.location.reload();
                }}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded transition-colors"
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Help Dialog */}
      {showHelpDialog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-sm"
          onClick={() => setShowHelpDialog(false)}
        >
          <div 
            className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">キーボードショートカット</h3>
              <button 
                type="button"
                onClick={() => setShowHelpDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <section>
                <h4 className="font-semibold text-gray-500 text-xs uppercase tracking-wider mb-2">ナビゲーション</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2"><kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">a</kbd> <span>前のフィード</span></div>
                  <div className="flex items-center gap-2"><kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">s</kbd> <span>次のフィード</span></div>
                  <div className="flex items-center gap-2"><kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">k</kbd> <span>前の記事</span></div>
                  <div className="flex items-center gap-2"><kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">j</kbd> <span>次の記事</span></div>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-gray-500 text-xs uppercase tracking-wider mb-2">記事閲覧</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2"><kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">Space</kbd> <span>下にスクロール</span></div>
                  <div className="flex items-center gap-2"><kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">Shift+Spc</kbd> <span>上にスクロール</span></div>
                  <div className="flex items-center gap-2"><kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">o</kbd> <span>元のサイトを開く</span></div>
                  <div className="flex items-center gap-2"><kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">&lt;</kbd> <span>文字を小さく</span></div>
                  <div className="flex items-center gap-2"><kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">&gt;</kbd> <span>文字を大きく</span></div>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-gray-500 text-xs uppercase tracking-wider mb-2">システム</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2"><kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">c</kbd> <span>キャッシュをクリア</span></div>
                  <div className="flex items-center gap-2"><kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">?</kbd> <span>ヘルプを表示</span></div>
                  <div className="flex items-center gap-2"><kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">Esc</kbd> <span>ダイアログを閉じる</span></div>
                  <div className="flex items-center gap-2"><kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">Ctrl+[</kbd> <span>ダイアログを閉じる</span></div>
                </div>
              </section>
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setShowHelpDialog(false)}
                className="w-full py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
