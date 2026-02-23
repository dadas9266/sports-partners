"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import Button from "./ui/Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-6xl mb-4" role="img" aria-label="Hata">
              😵
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Bir hata oluştu
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Beklenmeyen bir hata meydana geldi. Lütfen tekrar deneyin.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="text-left mb-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <summary className="text-sm text-red-600 dark:text-red-400 cursor-pointer">
                  Hata Detayları
                </summary>
                <pre className="text-xs text-red-500 mt-2 overflow-auto">
                  {this.state.error.message}
                  {"\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <Button onClick={this.handleRetry}>Tekrar Dene</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
