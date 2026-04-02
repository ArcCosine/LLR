import type { RefObject } from "react";
import type { Subscription } from "@/types";

type FeedListProps = {
  subscriptions: Subscription[];
  selectedSubIndex: number;
  onSelectSubscription: (index: number) => void;
  subListRef: RefObject<HTMLDivElement | null>;
};

export function FeedList({
  subscriptions,
  selectedSubIndex,
  onSelectSubscription,
  subListRef,
}: FeedListProps) {
  return (
    <nav className="flex w-64 flex-shrink-0 flex-col overflow-hidden border-r border-gray-300 bg-gray-50 max-md:w-52">
      <div className="border-b border-gray-300 bg-gray-200 px-3 py-2 font-bold">
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
              className={`flex w-full cursor-pointer items-center justify-between border-b border-gray-200 px-3 py-1.5 text-left outline-none ${
                isSelected ? "bg-blue-100 font-bold" : "hover:bg-gray-100"
              }`}
            >
              <span className="flex-1 truncate" title={sub.title}>
                {sub.title}
              </span>
              {sub.unreadCount > 0 && (
                <span className="ml-2 text-[10px] font-normal text-blue-600">
                  ({sub.unreadCount})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
