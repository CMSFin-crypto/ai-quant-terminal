"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-terminal-bg p-8">
          <div className="w-full max-w-lg rounded border border-terminal-red/40 bg-terminal-panel p-8 text-center">
            <div className="mb-4 text-4xl">&#9888;&#65039;</div>
            <h1 className="text-2xl font-bold text-terminal-red">
              Terminal Error
            </h1>
            <p className="mt-4 text-sm leading-6 text-terminal-muted">
              The quant terminal encountered an unexpected error and could not continue rendering.
            </p>
            {this.state.error && (
              <pre className="mt-4 max-h-40 overflow-auto rounded border border-terminal-edge bg-black/30 p-3 text-left text-xs text-terminal-amber">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-6 rounded border border-terminal-green/40 bg-terminal-green/10 px-6 py-2 text-sm font-semibold text-terminal-green transition hover:bg-terminal-green/20"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
