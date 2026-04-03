export function AppFooter() {
  return (
    <footer className="flex flex-shrink-0 items-center justify-between border-t border-gray-300 bg-gray-100 px-4 py-1 text-[10px] text-gray-500 sm:text-xs">
      <div className="flex items-center gap-4">
        <span>&copy; 2024-{new Date().getFullYear()} LLR Reader</span>
        <span>
          Icons by{" "}
          <a
            href="https://lucide.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 hover:underline"
          >
            Lucide
          </a>
        </span>
      </div>
      <span>Author: Arc Cosine</span>
    </footer>
  );
}
