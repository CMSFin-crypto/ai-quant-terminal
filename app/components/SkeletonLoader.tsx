"use client";

export function SkeletonLoader() {
  return (
    <main className="terminal-grid min-h-screen bg-terminal-bg text-terminal-text">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
        {/* Header skeleton */}
        <header className="flex flex-col gap-3 border-b border-terminal-edge pb-3 sm:pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="h-4 w-48 animate-pulse rounded bg-terminal-edge" />
            <div className="mt-2 h-8 w-64 sm:h-10 sm:w-80 animate-pulse rounded bg-terminal-edge" />
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 sm:h-16 w-full animate-pulse rounded border border-terminal-edge bg-black/20" />
            ))}
          </div>
        </header>

        {/* Main content skeleton */}
        <section className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
          {/* Center content skeleton */}
          <section className="min-w-0">
            <div className="rounded border border-terminal-edge bg-terminal-panel/92 p-3 sm:p-4">
              <div className="h-4 w-40 sm:w-48 animate-pulse rounded bg-terminal-edge" />
              <div className="mt-4 space-y-2 sm:space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-8 sm:h-10 w-full animate-pulse rounded bg-terminal-edge" />
                ))}
              </div>
            </div>
          </section>

          {/* Right sidebar skeleton */}
          <aside className="flex min-w-0 flex-col gap-3 sm:gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded border border-terminal-edge bg-terminal-panel/92 p-3 sm:p-4">
                <div className="h-4 w-28 sm:w-32 animate-pulse rounded bg-terminal-edge" />
                <div className="mt-3 space-y-2 sm:space-y-3">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-7 sm:h-8 w-full animate-pulse rounded bg-terminal-edge" />
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
