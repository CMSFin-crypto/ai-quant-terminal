import Link from "next/link";
import { Radar } from "lucide-react";

export default function NotFound() {
  return (
    <main className="terminal-grid flex min-h-screen items-center justify-center bg-terminal-bg p-8">
      <div className="w-full max-w-md rounded border border-terminal-edge bg-terminal-panel/92 p-10 text-center shadow-glow">
        <div className="mb-4 flex items-center justify-center gap-3 text-terminal-green">
          <Radar size={28} />
        </div>
        <h1 className="text-5xl font-bold text-white">404</h1>
        <p className="mt-4 text-lg text-terminal-muted">
          Signal Lost — Endpoint Not Found
        </p>
        <p className="mt-2 text-sm text-terminal-muted">
          The requested frequency does not exist on this terminal.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded border border-terminal-green/40 bg-terminal-green/10 px-6 py-2 text-sm font-semibold text-terminal-green transition hover:bg-terminal-green/20"
        >
          Return to Terminal
        </Link>
      </div>
    </main>
  );
}
