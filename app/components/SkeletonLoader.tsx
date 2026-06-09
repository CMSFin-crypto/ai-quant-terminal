"use client";

export function SkeletonLoader() {
  return (
    <main className="terminal-grid min-h-screen bg-terminal-bg text-terminal-text">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-4 py-4 lg:px-6">
        {/* Header skeleton */}
        <header className="flex flex-col gap-4 border-b border-terminal-edge pb-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="h-4 w-64 animate-pulse rounded bg-terminal-edge" />
            <div className="mt-3 h-10 w-80 animate-pulse rounded bg-terminal-edge" />
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 w-32 animate-pulse rounded border border-terminal-edge bg-black/20" />
            ))}
          </div>
        </header>

        {/* Main content skeleton */}
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_1fr_360px]">
          {/* Sidebar skeleton */}
          <aside className="flex flex-col gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="rounded border border-terminal-edge bg-terminal-panel/92 p-4">
                <div className="h-4 w-24 animate-pulse rounded bg-terminal-edge" />
                <div className="mt-4 h-11 w-full animate-pulse rounded bg-terminal-edge" />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[...Array(7)].map((_, j) => (
                    <div key={j} className="h-10 animate-pulse rounded bg-terminal-edge" />
                  ))}
                </div>
              </div>
            ))}
          </aside>

          {/* Center content skeleton */}
          <section className="min-w-0">
            <div className="rounded border border-terminal-edge bg-terminal-panel/92 p-4">
              <div className="h-4 w-48 animate-pulse rounded bg-terminal-edge" />
              <div className="mt-4 space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-10 w-full animate-pulse rounded bg-terminal-edge" />
                ))}
              </div>
            </div>
          </section>

          {/* Right sidebar skeleton */}
          <aside className="flex min-w-0 flex-col gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded border border-terminal-edge bg-terminal-panel/92 p-4">
                <div className="h-4 w-32 animate-pulse rounded bg-terminal-edge" />
                <div className="mt-4 space-y-3">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-8 w-full animate-pulse rounded bg-terminal-edge" />
                  ))}
                </div>
              </div>
            ))}
          </aside>
        </section>
      </div>
    </main>
  );
}
