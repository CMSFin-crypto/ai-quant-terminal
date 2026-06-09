"use client";

export function Panel({
  title,
  icon,
  children,
  flush = false
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded border border-terminal-edge bg-terminal-panel/92 shadow-glow">
      <div className="flex items-center gap-2 border-b border-terminal-edge px-3 py-2.5 sm:px-4 sm:py-3 text-sm font-semibold text-white">
        <span className="text-terminal-green">{icon}</span>
        {title}
      </div>
      <div className={flush ? "" : "p-3 sm:p-4"}>{children}</div>
    </section>
  );
}
