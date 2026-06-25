'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--color-on-background)',
            backgroundColor: 'var(--color-background)',
          }}
        >
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1rem', maxWidth: '400px' }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
            }}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '1000px',
              border: 'none',
              background: 'var(--color-primary)',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'var(--font-body-medium-font-family)',
              fontSize: 'var(--font-body-medium-font-size)',
              fontWeight: 600,
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
