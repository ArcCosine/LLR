import { useEffect } from "react";

type ClearCacheDialogProps = {
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function ClearCacheDialog({
  onCancel,
  onConfirm,
}: ClearCacheDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "y") {
        event.preventDefault();
        void onConfirm();
        return;
      }

      if (
        event.key === "n" ||
        event.key === "Escape" ||
        (event.ctrlKey && event.key === "[")
      ) {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-sm">
      <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold">キャッシュを削除しますか？</h3>
        <p className="mb-6 text-gray-600">
          保存済みのRSSキャッシュをすべて削除します。削除後は、記事データを再取得します。
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100"
          >
            いいえ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
          >
            はい、削除します
          </button>
        </div>
      </div>
    </div>
  );
}
