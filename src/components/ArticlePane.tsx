import type { MutableRefObject, RefObject } from "react";
import { ArticleContent } from "@/components/ArticleContent";
import { FONT_SIZES } from "@/lib/atoms";
import { formatPubDate } from "@/lib/date";
import type { Article, Subscription } from "@/types";

type ArticlePaneProps = {
  articles: Article[];
  articleRefs: MutableRefObject<(HTMLElement | null)[]>;
  contentAreaRef: RefObject<HTMLElement | null>;
  fontSizeIndex: number;
  selectedArticleIndex: number;
  selectedSubscription?: Subscription;
};

export function ArticlePane({
  articles,
  articleRefs,
  contentAreaRef,
  fontSizeIndex,
  selectedArticleIndex,
  selectedSubscription,
}: ArticlePaneProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <section className="border-b border-gray-300 bg-gray-200 px-3 py-2">
        <div className="truncate font-bold">
          Articles
          {selectedSubscription ? ` - ${selectedSubscription.title}` : ""}
        </div>
      </section>

      <main
        ref={contentAreaRef}
        className="relative flex-1 overflow-y-auto bg-white"
      >
        {articles.length > 0 ? (
          <div className="mx-auto max-w-4xl px-6 py-8 max-md:px-4">
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
                  <div className="flex justify-between gap-4 text-sm text-gray-500 max-md:flex-col">
                    <span>{formatPubDate(article.pubDate)}</span>
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-blue-600 hover:underline"
                    >
                      Original Site →
                    </a>
                  </div>
                </header>
                <div
                  className={`prose max-w-none ${FONT_SIZES[fontSizeIndex]}`}
                >
                  <ArticleContent content={article.content} />
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
  );
}
