type ClearCacheDialogProps = {
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function ClearCacheDialog({
  onCancel,
  onConfirm,
}: ClearCacheDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-sm">
      <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold">Clear Cache?</h3>
        <p className="mb-6 text-gray-600">
          Do you want to clear all cached RSS data? This will force the app to
          fetch everything again.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100"
          >
            No
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
          >
            Yes, Clear
          </button>
        </div>
      </div>
    </div>
  );
}
