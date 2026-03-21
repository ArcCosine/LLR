"use client";

import { useEffect, useRef, useState } from "react";
import type { Article, Subscription } from "@/types";

export default function Home() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedSubIndex, setSelectedSubIndex] = useState<number>(-1);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState<number>(-1);
  const [loading, setLoading] = useState<boolean>(true);

  const subListRef = useRef<HTMLDivElement>(null);
  const articleListRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const contentAreaRef = useRef<HTMLElement>(null);

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
      setArticles([]);
      setSelectedArticleIndex(-1);
      const sub = subscriptions[selectedSubIndex];
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
      } catch (error) {
        console.error("Failed to fetch RSS:", error);
      }
    };
    fetchRSS();
  }, [selectedSubIndex, subscriptions]);

  // Focus iframe when article changes to allow space-key scrolling
  useEffect(() => {
    if (selectedArticleIndex >= 0 && iframeRef.current) {
      // Focus the iframe so browser-native space scrolling works
      iframeRef.current.focus();
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
        case " ": // Space: Scroll Down / Shift+Space: Scroll Up
          // If the iframe is focused, the browser handles this.
          // If not (e.g. after clicking the list), we try to scroll the content area.
          if (contentAreaRef.current) {
            e.preventDefault();
            const scrollAmount = contentAreaRef.current.clientHeight * 0.8;
            contentAreaRef.current.scrollBy({
              top: e.shiftKey ? -scrollAmount : scrollAmount,
              behavior: "smooth",
            });
            // Also try to focus iframe for subsequent native scrolls
            iframeRef.current?.focus();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [subscriptions.length, articles.length]);

  // Scroll list items into view
  useEffect(() => {
    const activeSub = subListRef.current?.querySelector(
      "[data-selected='true']",
    );
    activeSub?.scrollIntoView({ block: "nearest" });
  }, []);

  useEffect(() => {
    const activeArticle = articleListRef.current?.querySelector(
      "[data-selected='true']",
    );
    activeArticle?.scrollIntoView({ block: "nearest" });
  }, []);

  if (loading)
    return (
      <div className="h-full flex items-center justify-center bg-white text-gray-500">
        Loading...
      </div>
    );

  return (
    <div className="flex h-full w-full overflow-hidden bg-white text-sm text-gray-800">
      {/* Left Pane: Subscriptions (Full height between header and footer) */}
      <nav className="w-64 flex-shrink-0 border-r border-gray-300 flex flex-col bg-gray-50 overflow-hidden">
        <div className="px-3 py-2 font-bold border-b border-gray-300 bg-gray-200">
          Subscriptions
        </div>
        <div ref={subListRef} className="flex-1 overflow-y-auto">
          {subscriptions.map((sub, index) => (
            <button
              type="button"
              key={sub.xmlUrl || index}
              onClick={() => setSelectedSubIndex(index)}
              data-selected={index === selectedSubIndex}
              className={`w-full text-left px-3 py-1.5 cursor-pointer border-b border-gray-200 flex justify-between items-center outline-none ${
                index === selectedSubIndex
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
          ))}
        </div>
      </nav>

      {/* Right Side: Split into Top Right and Bottom Right */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Right: Articles List */}
        <section className="h-1/3 border-b border-gray-300 flex flex-col min-h-[150px] overflow-hidden">
          <div className="px-3 py-2 font-bold bg-gray-200 border-b border-gray-300">
            Articles
          </div>
          <div ref={articleListRef} className="flex-1 overflow-y-auto">
            {articles.length === 0 ? (
              <div className="p-4 text-gray-400">No articles found.</div>
            ) : (
              articles.map((article, index) => (
                <button
                  type="button"
                  key={article.link || index}
                  onClick={() => setSelectedArticleIndex(index)}
                  data-selected={index === selectedArticleIndex}
                  className={`w-full text-left px-3 py-1.5 cursor-pointer border-b border-gray-100 outline-none ${
                    index === selectedArticleIndex
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
              ))
            )}
          </div>
        </section>

        {/* Bottom Right: Actual Website Content (iframe) */}
        <main
          ref={contentAreaRef}
          className="flex-1 bg-white relative overflow-hidden"
        >
          {selectedArticleIndex >= 0 && articles[selectedArticleIndex] ? (
            <iframe
              ref={iframeRef}
              title="Article Content"
              src={articles[selectedArticleIndex].link}
              className="absolute inset-0 w-full h-full border-none"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Select an article to view the website.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
