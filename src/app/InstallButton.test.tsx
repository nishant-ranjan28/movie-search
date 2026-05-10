import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { InstallButton } from "./InstallButton";

const fireBeforeInstallPrompt = (handlers: {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}) => {
  const ev = new Event("beforeinstallprompt") as Event & typeof handlers;
  Object.assign(ev, handlers);
  globalThis.dispatchEvent(ev);
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("InstallButton", () => {
  test("renders nothing initially", () => {
    const { container } = render(<InstallButton />);
    expect(container.firstChild).toBeNull();
  });

  test("renders install button after beforeinstallprompt fires", async () => {
    render(<InstallButton />);
    act(() => {
      fireBeforeInstallPrompt({
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: "accepted" }),
      });
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /install app/i })).toBeInTheDocument(),
    );
  });

  test("dismiss persists for 30 days", async () => {
    const user = userEvent.setup();
    render(<InstallButton />);
    act(() => {
      fireBeforeInstallPrompt({
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      });
    });
    await waitFor(() => screen.getByRole("button", { name: /dismiss install prompt/i }));
    await user.click(screen.getByRole("button", { name: /dismiss install prompt/i }));
    expect(localStorage.getItem("install-dismissed-until")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /install app/i })).not.toBeInTheDocument();
  });

  test("hides if dismissed-until is in the future", () => {
    localStorage.setItem("install-dismissed-until", String(Date.now() + 1_000_000));
    const { container } = render(<InstallButton />);
    act(() => {
      fireBeforeInstallPrompt({
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: "accepted" }),
      });
    });
    expect(container.firstChild).toBeNull();
  });

  test("install click triggers prompt and userChoice", async () => {
    const user = userEvent.setup();
    const promptFn = vi.fn().mockResolvedValue(undefined);
    render(<InstallButton />);
    act(() => {
      fireBeforeInstallPrompt({
        prompt: promptFn,
        userChoice: Promise.resolve({ outcome: "accepted" }),
      });
    });
    await waitFor(() => screen.getByRole("button", { name: /install app/i }));
    await user.click(screen.getByRole("button", { name: /install app/i }));
    expect(promptFn).toHaveBeenCalled();
  });
});
