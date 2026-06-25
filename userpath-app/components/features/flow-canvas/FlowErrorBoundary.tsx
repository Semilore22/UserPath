'use client';

import React from 'react';

interface FlowErrorBoundaryProps {
  children: React.ReactNode;
  onError: () => void;
}

interface FlowErrorBoundaryState {
  hasError: boolean;
}

export class FlowErrorBoundary extends React.Component<
  FlowErrorBoundaryProps,
  FlowErrorBoundaryState
> {
  constructor(props: FlowErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(
      '[FlowErrorBoundary]',
      error.message,
    );
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '240px',
          padding: '2rem',
          textAlign: 'center',
          color: 'var(--color-on-background, #e0dce4)',
        }}>
          <p style={{ marginBottom: '0.75rem' }}>
            The flow diagram encountered an error.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onError();
            }}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '1000px',
              border: '1px solid var(--color-outline, #49454f)',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
