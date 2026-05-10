import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { Button } from "@/components/ui/button";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: unknown, reset: () => void) => ReactNode);
  onError?: (error: unknown) => void;
}

interface State {
  error: unknown;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  override componentDidCatch(error: unknown): void {
    this.props.onError?.(error);
  }

  reset = () => {
    this.setState({ error: null });
  };

  override render() {
    if (this.state.error !== null) {
      const { fallback } = this.props;
      if (typeof fallback === "function") {
        return fallback(this.state.error, this.reset);
      }
      if (fallback !== undefined) return fallback;
      return (
        <EmptyState
          icon={AlertCircle}
          title="Something went wrong"
          description="Please try again."
          action={<Button onClick={this.reset}>Retry</Button>}
        />
      );
    }
    return this.props.children;
  }
}
