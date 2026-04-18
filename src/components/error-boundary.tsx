import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Aspire error boundary caught:', error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  reload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="safe-pt safe-pl safe-pr safe-pb flex min-h-dvh items-center justify-center bg-ink-50 p-6 dark:bg-ink-900">
          <div className="w-full max-w-sm space-y-3 text-center">
            <h1 className="text-lg font-semibold">Something broke</h1>
            <p className="text-sm text-ink-500">
              Your data is safe. Reload to recover, or go back and try again.
            </p>
            <pre className="max-h-32 overflow-auto rounded-lg bg-ink-100 p-2 text-left text-xs text-ink-700 dark:bg-ink-800 dark:text-ink-300">
              {this.state.error.message}
            </pre>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={this.reset}>
                Dismiss
              </Button>
              <Button className="flex-1" onClick={this.reload}>
                Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
