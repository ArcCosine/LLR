import type { Article, Subscription } from "@/types";
import { XMLParser } from "fast-xml-parser";

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
    const contentEncoded =
      node.getElementsByTagName("content:encoded")[0]?.textContent || "";
    const dcContent = node.getElementsByTagName("dc:content")[0]?.textContent || "";
    const description = node.querySelector("description")?.textContent || "";
    const preferredBody =
      dcContent.length > description.length ? dcContent : description;
    const content =
      contentEncoded ||
      preferredBody ||
      node.querySelector("content")?.textContent ||
      node.querySelector("summary")?.textContent ||
      "";
    const pubDate =
      node.querySelector("pubDate")?.textContent ||
      node.querySelector("published")?.textContent ||
      node.querySelector("updated")?.textContent ||
      node.getElementsByTagName("dc:date")[0]?.textContent ||
      "";

    return { title, link, content, pubDate };
  });
}

export function parseMetadataFromXml(xmlText: string): {
  title: string;
  htmlUrl: string;
} {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  // RSS 2.0
  const channel = xmlDoc.querySelector("channel");
  if (channel) {
    return {
      title: channel.querySelector("title")?.textContent || "No Title",
      htmlUrl: channel.querySelector("link")?.textContent || "",
    };
  }

  // Atom
  const feed = xmlDoc.querySelector("feed");
  if (feed) {
    const title = feed.querySelector("title")?.textContent || "No Title";
    const linkNode =
      feed.querySelector('link[rel="alternate"]') || feed.querySelector("link");
    const htmlUrl = linkNode?.getAttribute("href") || "";
    return { title, htmlUrl };
  }

  return { title: "No Title", htmlUrl: "" };
}

export function generateOpmlFromSubscriptions(
  subscriptions: Subscription[],
): string {
  const date = new Date().toUTCString();
  const outlines = subscriptions
    .map((sub) => {
      const title = escapeXml(sub.title);
      const xmlUrl = escapeXml(sub.xmlUrl);
      const htmlUrl = escapeXml(sub.htmlUrl);
      return `<outline text="${title}" title="${title}" type="rss" xmlUrl="${xmlUrl}" htmlUrl="${htmlUrl}"/>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>LLR Subscriptions Export</title>
    <dateCreated>${date}</dateCreated>
  </head>
  <body>
${outlines}
  </body>
</opml>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return c;
    }
  });
}

function validateOpmlInput(xmlText: string): string {
  // Normalize to string and trim whitespace/BOM to reduce parser quirks.
  let normalized = String(xmlText);
  // Remove UTF-8 BOM if present
  if (normalized.charCodeAt(0) === 0xfeff) {
    normalized = normalized.slice(1);
  }
  normalized = normalized.trim();

  // Reject unreasonably large inputs (basic DoS/XEE hardening).
  const MAX_OPML_SIZE = 2 * 1024 * 1024; // 2MB
  if (normalized.length === 0 || normalized.length > MAX_OPML_SIZE) {
    throw new Error("無効なOPMLファイルです。");
  }

  // Basic shape check: must look like XML/OPML.
  if (!normalized.startsWith("<") || !/<opml[\s>]/i.test(normalized)) {
    throw new Error("OPMLファイルではない可能性があります。");
  }

  // Optionally reject obviously dangerous HTML constructs.
  const dangerousPattern =
    /<(script|iframe|object|embed|meta|link|style)\b[^>]*>/i;
  if (dangerousPattern.test(normalized)) {
    throw new Error("危険な要素を含むため、OPMLを読み込めません。");
  }

  // Reject generic HTML markup and inline handlers to avoid the text being
  // interpreted as HTML in any downstream usage.
  const htmlLikePattern =
    /<(div|span|p|a|img|form|input|button|textarea|select|option|video|audio|canvas)\b[^>]*>/i;
  const inlineHandlerOrJsUrlPattern =
    /\bon\w+\s*=\s*["'][^"']*["']|javascript:/i;
  if (
    htmlLikePattern.test(normalized) ||
    inlineHandlerOrJsUrlPattern.test(normalized)
  ) {
    throw new Error("危険な要素を含むため、OPMLを読み込めません。");
  }

  return normalized;
}

export function parseSubscriptionsFromOpml(xmlText: string): Subscription[] {
  const safeXmlText = validateOpmlInput(xmlText);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
    parseAttributeValue: false,
    trimValues: true,
  });

  let opmlObj: unknown;
  try {
    opmlObj = parser.parse(safeXmlText);
  } catch {
    throw new Error("OPMLの解析に失敗しました。");
  }

  // Expect a structure like { opml: { body: { outline: [...] } } }, but
  // be defensive about possible nesting shapes.
  const outlines: any[] = [];

  const collectOutlines = (node: any): void => {
    if (!node || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      for (const child of node) {
        collectOutlines(child);
      }
      return;
    }

    if (Object.prototype.hasOwnProperty.call(node, "outline")) {
      const o = (node as any).outline;
      if (Array.isArray(o)) {
        for (const child of o) {
          outlines.push(child);
          collectOutlines(child);
        }
      } else if (o && typeof o === "object") {
        outlines.push(o);
        collectOutlines(o);
      }
    }

    for (const key of Object.keys(node)) {
      if (key === "outline") continue;
      collectOutlines((node as any)[key]);
    }
  };

  if (
    opmlObj &&
    typeof opmlObj === "object" &&
    (opmlObj as any).opml
  ) {
    collectOutlines((opmlObj as any).opml);
  } else {
    throw new Error("OPMLの解析に失敗しました。");
  }

  return outlines
    .map((node) => {
      const titleAttr = (node as any)["@_title"] as string | undefined;
      const textAttr = (node as any)["@_text"] as string | undefined;
      const xmlUrlAttr = (node as any)["@_xmlUrl"] as string | undefined;
      const htmlUrlAttr = (node as any)["@_htmlUrl"] as string | undefined;

      const xmlUrl = xmlUrlAttr ? String(xmlUrlAttr).trim() : "";

      return {
        title: (titleAttr || textAttr || "No Title") as string,
        xmlUrl,
        htmlUrl: htmlUrlAttr ? String(htmlUrlAttr) : "",
        unreadCount: 0,
      } satisfies Subscription;
    })
    .filter((subscription) => subscription.xmlUrl.length > 0);
}
