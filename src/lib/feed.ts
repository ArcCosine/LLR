import type { Article, Subscription } from "@/types";

export const RSS_API_BASE_URL =
  import.meta.env.VITE_RSS_API_BASE_URL ||
  "https://llr-cf-workers.arc-6e4.workers.dev";

export const RSS_API_ENDPOINT = `${RSS_API_BASE_URL.replace(/\/$/, "")}/api/rss`;

export function buildRssRequestUrl(feedUrl: string): string {
  return `${RSS_API_ENDPOINT}?url=${encodeURIComponent(feedUrl)}`;
}

export function parseArticlesFromXml(xmlText: string): Article[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  const rssItems = Array.from(xmlDoc.querySelectorAll("item"));
  const atomEntries = Array.from(xmlDoc.querySelectorAll("entry"));
  const items = rssItems.length > 0 ? rssItems : atomEntries;

  return items.map((node) => {
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
}

export function parseSubscriptionsFromOpml(xmlText: string): Subscription[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const parserError = xmlDoc.querySelector("parsererror");

  if (parserError) {
    throw new Error("OPMLの解析に失敗しました。");
  }

  return Array.from(xmlDoc.querySelectorAll("outline[xmlUrl]"))
    .map((node) => ({
      title:
        node.getAttribute("title") || node.getAttribute("text") || "No Title",
      xmlUrl: node.getAttribute("xmlUrl") || "",
      htmlUrl: node.getAttribute("htmlUrl") || "",
      unreadCount: 0,
    }))
    .filter((subscription) => subscription.xmlUrl.length > 0);
}
