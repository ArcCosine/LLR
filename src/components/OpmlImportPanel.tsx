import { useId, useState } from "react";

type OpmlImportPanelProps = {
  busy: boolean;
  errorMessage: string;
  hasSubscriptions: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
};

function isOpmlFile(file: File): boolean {
  return (
    file.type === "text/xml" ||
    file.type === "application/xml" ||
    file.name.endsWith(".xml") ||
    file.name.endsWith(".opml")
  );
}

export function OpmlImportPanel({
  busy,
  errorMessage,
  hasSubscriptions,
  onClose,
  onImport,
}: OpmlImportPanelProps) {
  const inputId = useId();
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    if (!isOpmlFile(file)) {
      return;
    }

    await onImport(file);
    setIsDragActive(false);
  };

  return (
    <div
      className={`${
        hasSubscriptions
          ? "absolute inset-0 z-20 bg-[#fff9ef]/90 p-6 backdrop-blur-sm dark:bg-slate-900/90"
          : "flex min-h-0 flex-1 items-stretch bg-[radial-gradient(circle_at_top,_#fff7e7,_#f3e0bb_55%,_#ebd0a0)] p-6 dark:bg-[radial-gradient(circle_at_top,_#1e293b,_#0f172a_55%,_#020617)]"
      }`}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-center">
        <div
          className={`w-full rounded-[2rem] border-2 border-dashed px-8 py-12 text-center shadow-[0_24px_80px_rgba(96,62,12,0.18)] transition ${
            isDragActive
              ? "scale-[1.01] border-[#d67b1d] bg-[#fff5dd] dark:border-amber-500 dark:bg-amber-900/20"
              : "border-[#d8a566] bg-[#fffaf0] dark:border-slate-700 dark:bg-slate-800/50 dark:shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (event.currentTarget.contains(event.relatedTarget as Node)) {
              return;
            }
            setIsDragActive(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            void handleFiles(event.dataTransfer.files);
          }}
        >
          <h2 className="text-3xl font-black tracking-tight text-[#5c3408] dark:text-amber-500">
            OPMLをここへドロップ
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#7a5222] dark:text-slate-400">
            OPML ファイルを読み込むと、IndexedDB に保存します。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <label
              htmlFor={inputId}
              className="cursor-pointer rounded-full bg-[#b45a00] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(180,90,0,0.35)] transition hover:bg-[#964800] dark:bg-amber-600 dark:hover:bg-amber-700"
            >
              ファイルを選ぶ
            </label>
            {hasSubscriptions && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[#c5a06e] px-6 py-3 text-sm font-semibold text-[#6d471b] transition hover:bg-[#f7e7c6] dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                閉じる
              </button>
            )}
          </div>
          <input
            id={inputId}
            type="file"
            accept=".xml,.opml,text/xml,application/xml"
            className="hidden"
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
          {busy && (
            <div className="mt-5 text-sm font-semibold text-[#8f4d0c] dark:text-amber-400">
              読み込み中...
            </div>
          )}
          {errorMessage && (
            <div className="mt-5 rounded-2xl bg-[#fff0ef] px-4 py-3 text-sm text-[#a03121] dark:bg-red-900/30 dark:text-red-300">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
