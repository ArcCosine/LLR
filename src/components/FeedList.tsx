import type { RefObject } from "react";
import type { Subscription } from "@/types";

type FeedListProps = {
  subscriptions: Subscription[];
  selectedSubIndex: number;
  onSelectSubscription: (index: number) => void;
  subListRef: RefObject<HTMLDivElement | null>;
  showFeedList: boolean;
};

export function FeedList({
  subscriptions,
  selectedSubIndex,
  onSelectSubscription,
  subListRef,
  showFeedList,
}: FeedListProps) {
  return (
    <div
      className={`relative flex flex-shrink-0 flex-col overflow-hidden border-r border-gray-300 bg-gray-50 transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 ${
        showFeedList
          ? "w-64 max-md:w-52 opacity-100"
          : "w-0 opacity-0 pointer-events-none"
      }`}
    >
      <nav className="flex h-full flex-col min-w-[13rem] max-md:min-w-[10rem]">
        <div className="border-b border-gray-300 bg-gray-200 px-3 py-2 font-bold dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
          Feeds
        </div>
        <div ref={subListRef} className="flex-1 overflow-y-auto">
          {subscriptions.map((sub, index) => {
            const isSelected = index === selectedSubIndex;
            return (
              <button
                type="button"
                key={sub.xmlUrl || index}
                onClick={() => onSelectSubscription(index)}
                data-selected={isSelected}
                className={`flex w-full cursor-pointer items-center justify-between border-b border-gray-200 px-3 py-1.5 text-left outline-none transition-colors ${
                  isSelected
                    ? "bg-blue-100 font-bold dark:bg-slate-800 dark:text-amber-400 dark:border-amber-900/50"
                    : "hover:bg-gray-100 dark:border-slate-800/50 dark:hover:bg-slate-800/80 dark:text-slate-400"
                }`}
              >
                <span className="flex-1 truncate" title={sub.title}>
                  {sub.title}
                </span>
                {sub.unreadCount > 0 && (
                  <span
                    className={`ml-2 text-[10px] font-normal ${isSelected ? "text-blue-600 dark:text-amber-500" : "text-blue-600 dark:text-slate-500"}`}
                  >
                    ({sub.unreadCount})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
