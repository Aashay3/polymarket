"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("ErrorBoundary caught:", error, info);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-white/50 mb-6 leading-relaxed">
            An unexpected error occurred. The page can be reloaded safely — no data was lost.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.reset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors"
            >
              <RotateCw className="w-4 h-4" /> Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-white/5 text-white text-sm font-bold hover:bg-white/10 transition-colors border border-white/10"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
