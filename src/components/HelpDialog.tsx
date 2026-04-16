type HelpDialogProps = {
  onClose: () => void;
};

export function HelpDialog({ onClose }: HelpDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm text-sm">
      <button
        type="button"
        aria-label="ヘルプを閉じる"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div className="relative mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800 transition-colors duration-300">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold dark:text-slate-100">
            キーボードショートカット
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">
              ナビゲーション
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm dark:text-slate-300">
              <div className="flex items-center gap-2">
                <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                  a
                </kbd>
                <span>前のフィード</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                  s
                </kbd>
                <span>次のフィード</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                  k
                </kbd>
                <span>前の記事へスクロール</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                  j
                </kbd>
                <span>次の記事へスクロール</span>
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">
              記事閲覧
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm dark:text-slate-300">
              <div className="flex items-center gap-2">
                <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                  Space
                </kbd>
                <span>ページダウン</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                  Shift+Spc
                </kbd>
                <span>ページアップ</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                  o
                </kbd>
                <span>元のサイトを開く</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                  &lt;
                </kbd>
                <span>文字を小さく</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                  &gt;
                </kbd>
                <span>文字を大きく</span>
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">
              システム
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm dark:text-slate-300">
              <div className="flex items-center gap-2">
                <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                  c
                </kbd>
                <span>キャッシュをクリア</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                  ?
                </kbd>
                <span>ヘルプを表示</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                  Esc
                </kbd>
                <span>ダイアログを閉じる</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                  Ctrl+[
                </kbd>
                <span>ダイアログを閉じる</span>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded bg-gray-800 py-2 text-white transition-colors hover:bg-gray-700 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
