import { useEffect, useState } from "react";
import {
  getStoredOpml,
  getSubscriptions,
  replaceStoredOpml,
  saveSubscriptions,
} from "@/lib/db";
import {
  generateOpmlFromSubscriptions,
  parseSubscriptionsFromOpml,
} from "@/lib/feed";
import type { Article, Subscription } from "@/types";

type FeedManagementParams = {
  setSubscriptions: React.Dispatch<React.SetStateAction<Subscription[]>>;
  setSelectedSubIndex: React.Dispatch<React.SetStateAction<number>>;
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  setSelectedArticleIndex: React.Dispatch<React.SetStateAction<number>>;
  setShowImportPanel: (v: boolean) => void;
  setLoading: (v: boolean) => void;
};

export function useFeedManagement({
  setSubscriptions,
  setSelectedSubIndex,
  setArticles,
  setSelectedArticleIndex,
  setShowImportPanel,
  setLoading,
}: FeedManagementParams) {
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");

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
  }, [setSubscriptions, setSelectedSubIndex, setShowImportPanel, setLoading]);

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

  const handleExport = (subscriptions: Subscription[]) => {
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
      return true;
    } catch (error) {
      console.error("Failed to save subscriptions:", error);
      alert("保存に失敗しました。");
      return false;
    }
  };

  return {
    importBusy,
    importError,
    handleImport,
    handleExport,
    handleSaveAllSubscriptions,
    setImportError,
  };
}
