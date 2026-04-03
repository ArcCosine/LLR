import { Settings, Download, Upload, List, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type AppHeaderProps = {
  onShowImport: () => void;
  onShowManagement: () => void;
  onExport: () => void;
};

export function AppHeader({
  onShowImport,
  onShowManagement,
  onExport,
}: AppHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <header className="z-30 flex flex-shrink-0 items-center gap-2 bg-[#fae7ca] px-4 py-2 text-black shadow-md border-b border-[#e9d1b0]">
      <div className="flex items-center gap-2">
        <img src="/favicon.svg" alt="LLR Logo" className="h-6 w-6" />
        <h1 className="text-xl font-black tracking-tight text-[#6d471b] italic">LLR</h1>
      </div>

      {/* Dropdown Container: Fixed width and height to prevent header layout shift */}
      <div className="relative ml-auto w-40 h-9" ref={dropdownRef}>
        <div 
          className={`
            absolute top-0 right-0 w-full overflow-hidden transition-all duration-300 ease-in-out
            bg-[#fff3da] border-[#b98a4e] shadow-sm z-50
            ${isOpen ? "rounded-xl border shadow-2xl" : "rounded-lg border"}
          `}
        >
          {/* Header / Trigger Button (Inside the absolute container) */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`
              flex w-full h-9 items-center justify-between px-3 transition-colors duration-200
              ${isOpen ? "bg-[#6d471b] text-[#fae7ca]" : "text-[#6d471b] hover:bg-[#ffe7bb]"}
              focus:outline-none font-bold text-sm
            `}
          >
            <div className="flex items-center gap-2">
              <Settings size={16} className={isOpen ? "animate-spin-slow" : ""} />
              <span>設定</span>
            </div>
            <ChevronDown 
              size={14} 
              className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} 
            />
          </button>

          {/* Collapsible Content */}
          <div 
            className={`
              grid transition-all duration-300 ease-in-out
              ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}
            `}
          >
            <div className="overflow-hidden flex flex-col bg-[#fffdfa]">
              <div className="mx-2 border-t border-[#b98a4e]/20" />
              
              <button
                type="button"
                onClick={() => {
                  onShowImport();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-[#6d471b] hover:bg-[#fae7ca] transition-colors"
              >
                <Upload size={14} />
                OPML読込
              </button>
              
              <button
                type="button"
                onClick={() => {
                  onExport();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-[#6d471b] hover:bg-[#fae7ca] transition-colors"
              >
                <Download size={14} />
                OPML出力
              </button>

              <button
                type="button"
                onClick={() => {
                  onShowManagement();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-[#6d471b] hover:bg-[#fae7ca] transition-colors"
              >
                <List size={14} />
                フィード管理
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
