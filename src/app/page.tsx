"use client";

import { useAtom } from "jotai";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { FONT_SIZES, fontSizeAtom } from "@/lib/atoms";
import { clearAllCache, getCache, setCache } from "@/lib/db";
import type { Article, Subscription } from "@/types";

const CACHE_EXPIRATION_MS = 1000 * 60 * 30; // 30 minutes
const PAGE_SCROLL_RATIO = 0.9;

function getSafeUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("mailto:") ||
    url.startsWith("/")
  ) {
    return url;
  }
  return undefined;
}

function renderHtmlNode(node: ChildNode, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes).map((child, index) =>
    renderHtmlNode(child, `${key}-${index}`),
  );

  switch (tag) {
    case "h1":
      return (
        <h1 key={key} className="text-3xl font-bold mt-8 mb-4">
          {children}
        </h1>
      );
    case "h2":
      return (
        <h2 key={key} className="text-2xl font-bold mt-8 mb-4">
          {children}
        </h2>
      );
    case "h3":
      return (
        <h3 key={key} className="text-xl font-bold mt-6 mb-3">
          {children}
        </h3>
      );
    case "h4":
    case "h5":
    case "h6":
      return (
        <h4 key={key} className="text-lg font-semibold mt-6 mb-3">
          {children}
        </h4>
      );
    case "p":
      return (
        <p key={key} className="mb-4 leading-7">
          {children}
        </p>
      );
    case "a": {
      const href = getSafeUrl(element.getAttribute("href"));
      return (
        <a
          key={key}
          href={href}
          target={href?.startsWith("http") ? "_blank" : undefined}
          rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
          className="text-blue-600 underline"
        >
          {children}
        </a>
      );
    }
    case "ul":
      return (
        <ul key={key} className="mb-4 list-disc pl-6">
          {children}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="mb-4 list-decimal pl-6">
          {children}
        </ol>
      );
    case "li":
      return (
        <li key={key} className="mb-1">
          {children}
        </li>
      );
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-4 border-l-4 border-gray-300 pl-4 text-gray-700"
        >
          {children}
        </blockquote>
      );
    case "pre":
      return (
        <pre
          key={key}
          className="mb-4 overflow-x-auto rounded bg-gray-100 p-4 text-sm"
        >
          {children}
        </pre>
      );
    case "code":
      return (
        <code
          key={key}
          className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.9em]"
        >
          {children}
        </code>
      );
    case "img": {
      const src = getSafeUrl(element.getAttribute("src"));
      const alt = element.getAttribute("alt") || "";
      return src ? (
        <img key={key} src={src} alt={alt} className="my-6 h-auto max-w-full" />
      ) : null;
    }
    case "br":
      return <br key={key} />;
    case "hr":
      return <hr key={key} className="my-6 border-gray-200" />;
    case "strong":
    case "b":
      return <strong key={key}>{children}</strong>;
    case "em":
    case "i":
      return <em key={key}>{children}</em>;
    case "figure":
      return (
        <figure key={key} className="my-6">
          {children}
        </figure>
      );
    case "figcaption":
      return (
        <figcaption key={key} className="mt-2 text-sm text-gray-500">
          {children}
        </figcaption>
      );
    case "div":
    case "span":
    case "section":
    case "article":
      return <div key={key}>{children}</div>;
    default:
      return <>{children}</>;
  }
}

function renderArticleContent(content: string): ReactNode {
  if (typeof window === "undefined") {
    return null;
  }

  const doc = new DOMParser().parseFromString(content, "text/html");
  return Array.from(doc.body.childNodes).map((node, index) =>
    renderHtmlNode(node, `article-${index}`),
  );
}

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
  const contentAreaRef = useRef<HTMLElement>(null);
  const articleRefs = useRef<(HTMLElement | null)[]>([]);
  const pendingKeyboardArticleNavRef = useRef(false);

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

  // Scroll to the active article block when article navigation changes
  useEffect(() => {
    if (pendingKeyboardArticleNavRef.current && selectedArticleIndex >= 0) {
      articleRefs.current[selectedArticleIndex]?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
      pendingKeyboardArticleNavRef.current = false;
    }
  }, [selectedArticleIndex]);

  // Sync the current article index with the article currently in view.
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

      setSelectedArticleIndex((prev) =>
        prev === currentIndex ? prev : currentIndex,
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
          e.preventDefault();
          pendingKeyboardArticleNavRef.current = true;
          setSelectedArticleIndex((prev) => Math.max(0, prev - 1));
          break;
        case "j": // Next Article
          e.preventDefault();
          pendingKeyboardArticleNavRef.current = true;
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
            const scrollAmount =
              contentAreaRef.current.clientHeight * PAGE_SCROLL_RATIO;
            contentAreaRef.current.scrollBy({
              top: e.shiftKey ? -scrollAmount : scrollAmount,
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

  // Scroll list items into view
  useEffect(() => {
    const activeSub = subListRef.current?.querySelector(
      "[data-selected='true']",
    );
    if (activeSub) {
      activeSub.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  });

  if (loading)
    return (
      <div className="h-full flex items-center justify-center bg-white text-gray-500">
        Loading...
      </div>
    );

  return (
    <div
      className={`flex h-full w-full overflow-hidden bg-white text-gray-800 ${FONT_SIZES[fontSizeIndex]}`}
    >
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
                  isSelected ? "bg-blue-100 font-bold" : "hover:bg-gray-100"
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

      {/* Right Pane: Current Article */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <section className="border-b border-gray-300 bg-gray-200 px-3 py-2">
          <div className="truncate font-bold">
            Articles{" "}
            {selectedSubIndex >= 0 && subscriptions[selectedSubIndex]
              ? `- ${subscriptions[selectedSubIndex].title}`
              : ""}
          </div>
          <div className="mt-1 text-xs text-gray-600">
            {articles.length} articles
          </div>
        </section>

        <main
          ref={contentAreaRef}
          className="flex-1 bg-white relative overflow-y-auto"
        >
          {articles.length > 0 ? (
            <div className="max-w-4xl mx-auto px-6 py-8">
              {articles.map((article, index) => (
                <article
                  key={article.link || index}
                  ref={(node) => {
                    articleRefs.current[index] = node;
                  }}
                  className={`pb-10 ${
                    index === selectedArticleIndex ? "scroll-mt-0" : ""
                  } ${index < articles.length - 1 ? "mb-10 border-b border-gray-200" : ""}`}
                  data-selected={index === selectedArticleIndex}
                >
                  <header className="mb-8 border-b border-gray-100 pb-4">
                    <h2
                      className={`mb-3 rounded-md px-4 py-3 text-2xl font-bold ${
                        index === selectedArticleIndex
                          ? "bg-sky-100 text-sky-950"
                          : "bg-slate-100 text-slate-900"
                      }`}
                    >
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:underline"
                      >
                        {article.title}
                      </a>
                    </h2>
                    <div className="text-sm text-gray-500 flex justify-between gap-4">
                      <span>{article.pubDate}</span>
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline shrink-0"
                      >
                        Original Site →
                      </a>
                    </div>
                  </header>
                  <div
                    className={`prose max-w-none ${FONT_SIZES[fontSizeIndex]}`}
                  >
                    {renderArticleContent(article.content)}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              No articles found.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-sm">
          <button
            type="button"
            aria-label="ヘルプを閉じる"
            onClick={() => setShowHelpDialog(false)}
            className="absolute inset-0"
          />
          <div className="relative bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
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
                <h4 className="font-semibold text-gray-500 text-xs uppercase tracking-wider mb-2">
                  ナビゲーション
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">
                      a
                    </kbd>{" "}
                    <span>前のフィード</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">
                      s
                    </kbd>{" "}
                    <span>次のフィード</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">
                      k
                    </kbd>{" "}
                    <span>前の記事へスクロール</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">
                      j
                    </kbd>{" "}
                    <span>次の記事へスクロール</span>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-gray-500 text-xs uppercase tracking-wider mb-2">
                  記事閲覧
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">
                      Space
                    </kbd>{" "}
                    <span>ページダウン</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">
                      Shift+Spc
                    </kbd>{" "}
                    <span>ページアップ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">
                      o
                    </kbd>{" "}
                    <span>元のサイトを開く</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">
                      &lt;
                    </kbd>{" "}
                    <span>文字を小さく</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">
                      &gt;
                    </kbd>{" "}
                    <span>文字を大きく</span>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-gray-500 text-xs uppercase tracking-wider mb-2">
                  システム
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">
                      c
                    </kbd>{" "}
                    <span>キャッシュをクリア</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">
                      ?
                    </kbd>{" "}
                    <span>ヘルプを表示</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">
                      Esc
                    </kbd>{" "}
                    <span>ダイアログを閉じる</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="bg-gray-100 border rounded px-1.5 py-0.5 text-xs font-mono">
                      Ctrl+[
                    </kbd>{" "}
                    <span>ダイアログを閉じる</span>
                  </div>
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
