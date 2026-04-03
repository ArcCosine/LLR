import { useState } from "react";
import type { Subscription } from "@/types";
import { buildRssRequestUrl, parseMetadataFromXml } from "@/lib/feed";

type FeedEditDialogProps = {
  feed: Subscription | null; // null for new feed
  onSave: (feed: Subscription) => void;
  onCancel: () => void;
};

export function FeedEditDialog({ feed, onSave, onCancel }: FeedEditDialogProps) {
  const isAdding = !feed;
  const [title, setTitle] = useState(feed?.title || "");
  const [htmlUrl, setHtmlUrl] = useState(feed?.htmlUrl || "");
  const [xmlUrl, setXmlUrl] = useState(feed?.xmlUrl || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isAdding) {
      setLoading(true);
      try {
        const response = await fetch(buildRssRequestUrl(xmlUrl));
        if (!response.ok) {
          throw new Error(`フィードの取得に失敗しました: ${response.status}`);
        }
        const xmlText = await response.text();
        const metadata = parseMetadataFromXml(xmlText);
        
        onSave({
          title: metadata.title,
          htmlUrl: metadata.htmlUrl,
          xmlUrl,
          unreadCount: 0,
        });
      } catch (err) {
        console.error("Failed to fetch feed metadata:", err);
        setError("フィードの取得または解析に失敗しました。URLを確認してください。");
      } finally {
        setLoading(false);
      }
    } else {
      onSave({
        title,
        htmlUrl,
        xmlUrl,
        unreadCount: feed.unreadCount,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">
          {isAdding ? "フィードを追加" : "フィードを編集"}
        </h2>
        {error && (
          <div className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isAdding ? (
            <div>
              <label htmlFor="feed-xml-url" className="block text-sm font-medium text-gray-700">
                XML URL (RSS/Atom)
              </label>
              <input
                id="feed-xml-url"
                type="url"
                value={xmlUrl}
                onChange={(e) => setXmlUrl(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="https://example.com/feed.xml"
                required
                disabled={loading}
                // biome-ignore lint/a11y/noAutofocus: 
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500">
                タイトルとサイトURLはフィードの内容から自動取得されます。
              </p>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="feed-title" className="block text-sm font-medium text-gray-700">
                  タイトル
                </label>
                <input
                  id="feed-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                  // biome-ignore lint/a11y/noAutofocus: 
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="feed-html-url" className="block text-sm font-medium text-gray-700">
                  HTML URL
                </label>
                <input
                  id="feed-html-url"
                  type="url"
                  value={htmlUrl}
                  onChange={(e) => setHtmlUrl(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="feed-xml-url" className="block text-sm font-medium text-gray-700">
                  XML URL (RSS/Atom)
                </label>
                <input
                  id="feed-xml-url"
                  type="url"
                  value={xmlUrl}
                  onChange={(e) => setXmlUrl(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-400"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  取得中...
                </>
              ) : isAdding ? "追加" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
