"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, Loader2, TrendingUp } from "lucide-react";
import { Panel } from "./Panel";

type SearchResult = {
  symbol: string;
  name: string;
  exchange?: string;
};

interface StockSearchProps {
  onAddStock: (symbol: string, name: string) => void;
  existingSymbols: string[];
}

export function StockSearch({ onAddStock, existingSymbols }: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addedSymbol, setAddedSymbol] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchStocks = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 1) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const res = await fetch(`/api/lookup?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    }

    setIsSearching(false);
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      setAddedSymbol(null);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value.trim()) {
        setResults([]);
        setShowDropdown(false);
        return;
      }

      setShowDropdown(true);
      debounceRef.current = setTimeout(() => {
        searchStocks(value.trim());
      }, 350);
    },
    [searchStocks]
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      if (existingSymbols.includes(result.symbol)) {
        setAddedSymbol(result.symbol);
        setQuery("");
        setShowDropdown(false);
        return;
      }

      onAddStock(result.symbol, result.name);
      setAddedSymbol(result.symbol);
      setQuery("");
      setShowDropdown(false);

      // Clear the "added" message after 3 seconds
      setTimeout(() => setAddedSymbol(null), 3000);
    },
    [onAddStock, existingSymbols]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setAddedSymbol(null);
  }, []);

  // Also allow pressing Enter to add a symbol directly
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
        // If there's exactly one result, select it
        if (results.length === 1) {
          handleSelect(results[0]);
        } else if (results.length > 1) {
          handleSelect(results[0]);
        } else {
          // No results from lookup — try adding the raw symbol
          const symbol = query.trim().toUpperCase();
          if (!existingSymbols.includes(symbol)) {
            onAddStock(symbol, symbol);
            setAddedSymbol(symbol);
            setQuery("");
            setShowDropdown(false);
            setTimeout(() => setAddedSymbol(null), 3000);
          }
        }
      } else if (e.key === "Escape") {
        setShowDropdown(false);
      }
    },
    [query, results, handleSelect, onAddStock, existingSymbols]
  );

  return (
    <Panel title="Search Stock" icon={<Search size={17} />}>
      <div ref={containerRef} className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-terminal-muted"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => query.trim() && setShowDropdown(true)}
              placeholder="Search symbol or name..."
              className="h-10 w-full rounded border border-terminal-edge bg-black/30 pl-9 pr-8 text-sm text-white placeholder:text-terminal-muted/60 focus:border-terminal-cyan/60 focus:outline-none"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-terminal-muted hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Added confirmation */}
        {addedSymbol && (
          <div className="mt-2 flex items-center gap-2 rounded border border-terminal-green/40 bg-terminal-green/10 px-3 py-2 text-xs text-terminal-green">
            <TrendingUp size={14} />
            <span>
              {existingSymbols.includes(addedSymbol)
                ? `${addedSymbol} is already in the scanner`
                : `${addedSymbol} added to scanner`}
            </span>
          </div>
        )}

        {/* Search results dropdown */}
        {showDropdown && (query.trim().length > 0) && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded border border-terminal-edge bg-terminal-bg/95 backdrop-blur-sm">
            {isSearching ? (
              <div className="flex items-center justify-center gap-2 px-4 py-3 text-xs text-terminal-muted">
                <Loader2 size={14} className="animate-spin" />
                Searching...
              </div>
            ) : results.length > 0 ? (
              results.map((result) => {
                const isAlreadyAdded = existingSymbols.includes(result.symbol);
                return (
                  <button
                    key={result.symbol}
                    onClick={() => handleSelect(result)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-white/5 disabled:opacity-50"
                    disabled={isAlreadyAdded}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-terminal-cyan">
                          {result.symbol}
                        </span>
                        {result.exchange && (
                          <span className="rounded bg-terminal-edge/50 px-1.5 py-0.5 text-[10px] text-terminal-muted">
                            {result.exchange}
                          </span>
                        )}
                        {isAlreadyAdded && (
                          <span className="text-[10px] text-terminal-green">ADDED</span>
                        )}
                      </div>
                      <div className="truncate text-xs text-terminal-muted">
                        {result.name}
                      </div>
                    </div>
                    {!isAlreadyAdded && (
                      <TrendingUp size={14} className="shrink-0 text-terminal-green/60" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-3 text-xs text-terminal-muted">
                No results found. Press <kbd className="rounded border border-terminal-edge px-1 text-terminal-text">Enter</kbd> to add &quot;{query.trim().toUpperCase()}&quot; directly.
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
