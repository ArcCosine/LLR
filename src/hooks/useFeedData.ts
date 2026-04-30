import { useEffect, useRef } from "react";
import {
  CACHE_EXPIRATION_MS,
  INITIAL_STARTUP_REFRESH_COUNT,
} from "@/lib/constants";
import { getCache, saveSubscriptions, setCache } from "@/lib/db";
import {
  buildRssRequestUrl,
  parseArticlesFromXml,
  RSS_API_BASE_URL,
} from "@/lib/feed";
import type { Article, Subscription } from "@/types";

type FeedDataParams = {
  subscriptions: Subscription[];
  setSubscriptions: React.Dispatch<React.SetStateAction<Subscription[]>>;
  selectedSubIndex: number;
  setSelectedSubIndex: React.Dispatch<React.SetStateAction<number>>;
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  setSelectedArticleIndex: React.Dispatch<React.SetStateAction<number>>;
  contentAreaRef: React.RefObject<HTMLElement | null>;
  articleRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  pendingKeyboardArticleNavRef: React.MutableRefObject<boolean>;
};

export function useFeedData({
  subscriptions,
  setSubscriptions,
  selectedSubIndex,
  setSelectedSubIndex,
  setArticles,
  setSelectedArticleIndex,
  contentAreaRef,
  articleRefs,
  pendingKeyboardArticleNavRef,
}: FeedDataParams) {
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

  // Background prefetch
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

  // Initial startup refresh
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

      for (const [_index, subscription] of topSubscriptions.entries()) {
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
            .filter((t) => !Number.isNaN(t));

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
  }, [
    subscriptions,
    setArticles,
    setSelectedArticleIndex,
    setSelectedSubIndex,
    setSubscriptions,
    articleRefs,
  ]);

  // Fetch articles for selected subscription
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

        const timestamps = articles
          .map((a) => Date.parse(a.pubDate))
          .filter((t) => !Number.isNaN(t));

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
  }, [
    selectedSubIndex,
    subscriptions,
    setArticles,
    setSelectedArticleIndex,
    setSubscriptions,
    contentAreaRef,
    articleRefs,
    pendingKeyboardArticleNavRef,
  ]);
}
