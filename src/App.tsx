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
import { useFeedData } from "@/hooks/useFeedData";
import { useFeedManagement } from "@/hooks/useFeedManagement";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useScrollSync } from "@/hooks/useScrollSync";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { darkModeAtom, FONT_SIZES, fontSizeAtom } from "@/lib/atoms";
import { PAGE_SCROLL_RATIO } from "@/lib/constants";
import { clearAllCache } from "@/lib/db";
import type { Article, Subscription } from "@/types";

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
  const [fontSizeIndex, setFontSizeIndex] = useAtom(fontSizeAtom);
  const [darkMode, setDarkMode] = useAtom(darkModeAtom);
  const [showFeedList, setShowFeedList] = useState(true);

  const subListRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLElement>(null);
  const articleRefs = useRef<(HTMLElement | null)[]>([]);
  const pendingKeyboardArticleNavRef = useRef(false);

  // Initialize Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Sidebar Scroll Sync
  useEffect(() => {
    const activeSub = subListRef.current?.querySelector(
      "[data-selected='true']",
    );
    if (activeSub) {
      activeSub.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: run on index change
  }, [selectedSubIndex]);

  // Custom Hooks
  useServiceWorker();

  const {
    importBusy,
    importError,
    handleImport,
    handleExport,
    handleSaveAllSubscriptions,
  } = useFeedManagement({
    setSubscriptions,
    setSelectedSubIndex,
    setArticles,
    setSelectedArticleIndex,
    setShowImportPanel,
    setLoading,
  });

  useFeedData({
    subscriptions,
    setSubscriptions,
    selectedSubIndex,
    setSelectedSubIndex,
    setArticles,
    setSelectedArticleIndex,
    contentAreaRef,
    articleRefs,
    pendingKeyboardArticleNavRef,
  });

  useKeyboardShortcuts({
    subscriptions,
    articles,
    showClearDialog,
    setShowClearDialog,
    showHelpDialog,
    setShowHelpDialog,
    showImportPanel,
    showManagementDialog,
    setShowManagementDialog,
    selectedArticleIndex,
    setSelectedArticleIndex,
    setSelectedSubIndex,
    setFontSizeIndex,
    darkMode,
    setDarkMode,
    setShowFeedList,
    contentAreaRef,
    pendingKeyboardArticleNavRef,
    PAGE_SCROLL_RATIO,
    FONT_SIZES_LENGTH: FONT_SIZES.length,
  });

  useScrollSync({
    articles,
    articleRefs,
    contentAreaRef,
    setSelectedArticleIndex,
    pendingKeyboardArticleNavRef,
    selectedArticleIndex,
  });

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader
        onShowImport={() => setShowImportPanel(true)}
        onShowManagement={() => setShowManagementDialog(true)}
        onExport={() => handleExport(subscriptions)}
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
            className={`flex h-full min-h-0 overflow-hidden bg-white text-gray-800 leading-relaxed dark:bg-slate-950 dark:text-slate-300 transition-colors duration-300 ${FONT_SIZES[fontSizeIndex]}`}
          >
            <FeedList
              subscriptions={subscriptions}
              selectedSubIndex={selectedSubIndex}
              onSelectSubscription={setSelectedSubIndex}
              subListRef={subListRef}
              showFeedList={showFeedList}
            />
            <ArticlePane
              articles={articles}
              articleRefs={articleRefs}
              contentAreaRef={contentAreaRef}
              fontSizeIndex={fontSizeIndex}
              selectedArticleIndex={selectedArticleIndex}
              selectedSubscription={subscriptions[selectedSubIndex]}
            />

            {/* Feed Navigation Buttons */}
            <div className="absolute right-4 bottom-4 z-20 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowClearDialog(true)}
                title="Clear Cache"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 transition-all hover:bg-red-50 active:scale-95 opacity-80 hover:opacity-100 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-red-900/30"
              >
                <RotateCcw
                  size={20}
                  className="text-gray-600 dark:text-slate-400"
                />
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedSubIndex((prev) => Math.max(0, prev - 1))
                }
                disabled={selectedSubIndex <= 0}
                title="Previous Feed (a)"
                className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 transition-all hover:bg-gray-50 active:scale-95 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 ${
                  selectedSubIndex <= 0
                    ? "opacity-30 pointer-events-none"
                    : "opacity-80 hover:opacity-100"
                }`}
              >
                <ChevronUp
                  size={24}
                  className="text-gray-600 dark:text-slate-400"
                />
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
                className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 transition-all hover:bg-gray-50 active:scale-95 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 ${
                  selectedSubIndex >= subscriptions.length - 1
                    ? "opacity-30 pointer-events-none"
                    : "opacity-80 hover:opacity-100"
                }`}
              >
                <ChevronDown
                  size={24}
                  className="text-gray-600 dark:text-slate-400"
                />
              </button>
            </div>

            {/* Sidebar Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFeedList((prev) => !prev)}
              title={showFeedList ? "Hide sidebar (f)" : "Show sidebar (f)"}
              className={`absolute bottom-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg border border-gray-300 hover:bg-gray-50 transition-all duration-300 ease-in-out dark:bg-slate-800 dark:border-slate-600 dark:hover:bg-slate-700 ${
                showFeedList
                  ? "left-64 max-md:left-52 -translate-x-1/2"
                  : "left-4"
              }`}
            >
              {showFeedList ? (
                <PanelLeftClose
                  size={18}
                  className="text-gray-600 dark:text-slate-400"
                />
              ) : (
                <PanelLeftOpen
                  size={18}
                  className="text-gray-600 dark:text-slate-400"
                />
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
            setSelectedSubIndex(0);
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
          onSaveAll={async (nextSubs) => {
            const success = await handleSaveAllSubscriptions(nextSubs);
            if (success) setShowManagementDialog(false);
          }}
          onClose={() => setShowManagementDialog(false)}
        />
      )}
    </div>
  );
}
