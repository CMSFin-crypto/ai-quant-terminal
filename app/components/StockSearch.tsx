"use client";

import { useCallback, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface StockSearchProps {
  onAddStock: (symbol: string, name: string) => void;
  existingSymbols: string[];
}

export function StockSearch({ onAddStock, existingSymbols }: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsSearching(true);

    try {
      // Try lookup first to get the real name
      const res = await fetch(`/api/lookup?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];

        if (results.length > 0) {
          // Pick the best match
          const exactMatch = results.find(
            (r: any) => r.symbol.toUpperCase() === trimmed.toUpperCase()
          );
          const best = exactMatch || results[0];
          onAddStock(best.symbol, best.name);
        } else {
          // No lookup result — add raw symbol
          onAddStock(trimmed.toUpperCase(), trimmed.toUpperCase());
        }
      } else {
        onAddStock(trimmed.toUpperCase(), trimmed.toUpperCase());
      }
    } catch {
      onAddStock(trimmed.toUpperCase(), trimmed.toUpperCase());
    }

    setQuery("");
    setIsSearching(false);
    inputRef.current?.focus();
  }, [query, onAddStock]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      } else if (e.key === "Escape") {
        setQuery("");
      }
    },
    [handleSearch]
  );

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-terminal-muted"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search stock..."
          className="h-9 w-full rounded border border-terminal-edge bg-black/30 pl-9 pr-8 text-sm text-white placeholder:text-terminal-muted/60 focus:border-terminal-cyan/60 focus:outline-none"
        />
        {query && !isSearching && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-terminal-muted hover:text-white"
          >
            <X size={12} />
          </button>
        )}
        {isSearching && (
          <Loader2
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-terminal-cyan"
          />
        )}
      </div>
      <button
        onClick={handleSearch}
        disabled={!query.trim() || isSearching}
        className="flex h-9 shrink-0 items-center justify-center rounded border border-terminal-cyan/40 bg-terminal-cyan/10 px-3 text-xs font-semibold text-terminal-cyan transition hover:bg-terminal-cyan/20 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Search size={14} />
      </button>
    </div>
  );
}
