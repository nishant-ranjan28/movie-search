import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterAll, describe, expect, test, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

const Throw = ({ message = "boom" }: { message?: string }) => {
  throw new Error(message);
};

const ConditionalThrow = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error("boom");
  return <p>OK</p>;
};

// Suppress React's expected error log noise in these tests
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

describe("ErrorBoundary", () => {
  test("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <p>hello</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  test("renders default fallback when child throws", () => {
    render(
      <ErrorBoundary>
        <Throw />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  test("renders ReactNode fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<p>custom fallback</p>}>
        <Throw />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/custom fallback/i)).toBeInTheDocument();
  });

  test("renders function fallback with error and reset", () => {
    render(
      <ErrorBoundary fallback={(e) => <p>caught: {(e as Error).message}</p>}>
        <Throw message="kapow" />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/caught: kapow/i)).toBeInTheDocument();
  });

  test("calls onError prop", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Throw />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalled();
  });

  test("retry resets the boundary", async () => {
    const Wrapper = () => {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <ErrorBoundary
          fallback={(_e, reset) => (
            <button
              onClick={() => {
                setShouldThrow(false);
                reset();
              }}
            >
              Retry
            </button>
          )}
        >
          <ConditionalThrow shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    };
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(screen.getByText(/^OK$/)).toBeInTheDocument();
  });
});

// Restore console.error after tests
afterAll(() => consoleErrorSpy.mockRestore());
