import React from 'react';

/**
 * Catches render/lifecycle errors in its subtree so one broken component
 * doesn't white-screen the whole app. Logs the error and shows a recoverable
 * fallback UI instead of crashing.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-10 text-center min-h-[40vh]">
          <h2 className="text-xl font-semibold text-foreground">
            Something went wrong.
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            This section hit an unexpected error. You can try again, or head
            back to the homepage.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Try again
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium"
            >
              Go home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
