import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, Plus, Save, X, Pencil } from "lucide-react";
import type { Subscription } from "@/types";
import { FeedEditDialog } from "./FeedEditDialog";

type FeedManagementDialogProps = {
  subscriptions: Subscription[];
  onSaveAll: (subscriptions: Subscription[]) => void;
  onClose: () => void;
};

export function FeedManagementDialog({
  subscriptions,
  onSaveAll,
  onClose,
}: FeedManagementDialogProps) {
  const [localSubs, setLocalSubs] = useState<Subscription[]>([
    ...subscriptions,
  ]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  const toggleSelection = useCallback(
    (index: number) => {
      const next = new Set(selectedIndices);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      setSelectedIndices(next);
    },
    [selectedIndices],
  );

  const handleDelete = useCallback(
    (index: number) => {
      const isBatch = selectedIndices.size > 1 && selectedIndices.has(index);
      const count = isBatch ? selectedIndices.size : 1;
      if (!confirm(`${count}件のフィードを削除しますか？`)) {
        return;
      }

      if (isBatch) {
        // Delete all selected
        const nextSubs = localSubs.filter((_, i) => !selectedIndices.has(i));
        setLocalSubs(nextSubs);
        setSelectedIndices(new Set());
        setFocusedIndex(0);
      } else {
        // Delete single
        const nextSubs = localSubs.filter((_, i) => i !== index);
        setLocalSubs(nextSubs);
        const nextSelected = new Set<number>();
        for (const i of selectedIndices) {
          if (i < index) nextSelected.add(i);
          if (i > index) nextSelected.add(i - 1);
        }
        setSelectedIndices(nextSelected);
        setFocusedIndex((prev) => Math.min(nextSubs.length - 1, prev));
      }
    },
    [localSubs, selectedIndices],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingIndex !== null || isAdding) return;

      if (e.key === "Escape") {
        onSaveAll(localSubs);
        return;
      }

      switch (e.key) {
        case "j":
          setFocusedIndex((prev) => Math.min(localSubs.length - 1, prev + 1));
          break;
        case "k":
          setFocusedIndex((prev) => Math.max(0, prev - 1));
          break;
        case "x":
          toggleSelection(focusedIndex);
          break;
        case "e":
          setEditingIndex(focusedIndex);
          break;
        case "d":
          handleDelete(focusedIndex);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    focusedIndex,
    localSubs,
    editingIndex,
    isAdding,
    toggleSelection,
    handleDelete,
    onSaveAll,
  ]);

  useEffect(() => {
    const focusedElement = listRef.current?.children[
      focusedIndex
    ] as HTMLElement;
    if (focusedElement) {
      focusedElement.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex]);

  const handleBatchDelete = () => {
    if (!confirm(`${selectedIndices.size}件のフィードを削除しますか？`)) {
      return;
    }
    const nextSubs = localSubs.filter((_, i) => !selectedIndices.has(i));
    setLocalSubs(nextSubs);
    setSelectedIndices(new Set());
    setFocusedIndex(0);
  };

  const handleSaveFeed = (feed: Subscription) => {
    if (isAdding) {
      const existingIndex = localSubs.findIndex(
        (sub) => sub.xmlUrl.toLowerCase() === feed.xmlUrl.toLowerCase(),
      );

      if (existingIndex !== -1) {
        if (
          confirm(
            "既にこのフィードは登録済です。更新しますか？\n(現在の登録内容が新しいデータで上書きされます)",
          )
        ) {
          const next = [...localSubs];
          next[existingIndex] = feed;
          setLocalSubs(next);
          setIsAdding(false);
        }
        return;
      }

      setLocalSubs([...localSubs, feed]);
      setIsAdding(false);
    } else if (editingIndex !== null) {
      const next = [...localSubs];
      next[editingIndex] = feed;
      setLocalSubs(next);
      setEditingIndex(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white p-4 dark:bg-slate-900 transition-colors duration-300">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b pb-4 dark:border-slate-800">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
          フィード管理
        </h2>
        <div className="flex flex-wrap gap-2">
          {selectedIndices.size > 0 && (
            <button
              type="button"
              onClick={handleBatchDelete}
              className="flex items-center gap-2 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              <Trash2 size={16} />
              選択した{selectedIndices.size}件を削除
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            <Plus size={16} />
            追加
          </button>
          <button
            type="button"
            onClick={() => onSaveAll(localSubs)}
            className="flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            <Save size={16} />
            保存して閉じる
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <X size={16} />
            キャンセル
          </button>
        </div>
      </header>

      <div className="mb-3 flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
        <span className="font-bold text-gray-700 dark:text-slate-300">
          ショートカット:
        </span>
        <span>j/k: 移動</span>
        <span className="text-gray-300 dark:text-slate-600">|</span>
        <span>x: 選択</span>
        <span className="text-gray-300 dark:text-slate-600">|</span>
        <span>e: 編集</span>
        <span className="text-gray-300 dark:text-slate-600">|</span>
        <span>d: 削除</span>
        <span className="text-gray-300 dark:text-slate-600">|</span>
        <span className="bg-white px-1 border rounded text-xs font-bold text-blue-600 shadow-sm dark:bg-slate-700 dark:border-slate-600 dark:text-blue-400">
          ESC
        </span>
        <span>: 保存して閉じる</span>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto border border-gray-200 rounded shadow-inner bg-gray-50/30 dark:border-slate-800 dark:bg-slate-950/30"
      >
        {localSubs.map((sub, index) => {
          const isFocused = index === focusedIndex;
          const isSelected = selectedIndices.has(index);

          return (
            // biome-ignore lint/a11y/useKeyWithClickEvents: handled by global effect
            // biome-ignore lint/a11y/noStaticElementInteractions: list item
            <div
              key={`${sub.xmlUrl}-${index}`}
              className={`flex items-center gap-4 border-b p-3 last:border-0 transition-all dark:border-slate-800 ${
                isFocused
                  ? "bg-blue-50 ring-2 ring-inset ring-blue-500 z-10 dark:bg-blue-900/20"
                  : ""
              } ${isSelected ? "bg-yellow-50 dark:bg-amber-900/10" : "bg-white dark:bg-slate-900"}`}
              onClick={() => setFocusedIndex(index)}
            >
              <div className="flex items-center justify-center w-6">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(index)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-gray-900 dark:text-slate-100">
                  {sub.title}
                </div>
                <div className="truncate text-xs text-gray-500 font-mono mt-0.5 dark:text-slate-500">
                  {sub.xmlUrl}
                </div>
              </div>
              <div className="flex gap-2 opacity-80 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setEditingIndex(index)}
                  className="flex items-center gap-1.5 rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <Pencil size={14} />
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  className="flex items-center gap-1.5 rounded border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 shadow-sm transition-colors dark:border-red-900/50 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={14} />
                  削除
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {(editingIndex !== null || isAdding) && (
        <FeedEditDialog
          feed={isAdding ? null : localSubs[editingIndex!]}
          onSave={handleSaveFeed}
          onCancel={() => {
            setEditingIndex(null);
            setIsAdding(false);
          }}
        />
      )}
    </div>
  );
}
