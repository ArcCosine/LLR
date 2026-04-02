export function AppFooter() {
  return (
    <footer className="flex flex-shrink-0 items-center justify-between border-t border-gray-300 bg-gray-100 px-4 py-1 text-xs text-gray-600">
      <span>&copy; 2024-{new Date().getFullYear()} LLR Reader</span>
      <span>Author: Arc Cosine</span>
    </footer>
  );
}
