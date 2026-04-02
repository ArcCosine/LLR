type AppHeaderProps = {
  onShowImport: () => void;
};

export function AppHeader({ onShowImport }: AppHeaderProps) {
  return (
    <header className="z-10 flex flex-shrink-0 items-center gap-2 bg-[#fae7ca] px-4 py-2 text-black shadow-md">
      <img src="/favicon.svg" alt="LLR Logo" className="h-6 w-6" />
      <h1 className="text-lg font-bold tracking-tight">LLR</h1>
      <button
        type="button"
        onClick={onShowImport}
        className="ml-auto rounded-full border border-[#b98a4e] bg-[#fff3da] px-4 py-1.5 text-sm font-semibold text-[#6d471b] transition hover:bg-[#ffe7bb]"
      >
        OPML読込
      </button>
    </header>
  );
}
