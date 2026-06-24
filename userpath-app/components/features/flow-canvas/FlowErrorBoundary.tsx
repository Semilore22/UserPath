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
      return null;
    }
    return this.props.children;
  }
}
