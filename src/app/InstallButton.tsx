import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "install-dismissed-until";

export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    const until = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
    return Date.now() < until;
  });

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (dismissed || !deferred) return null;

  const install = async () => {
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome !== "accepted") {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem(DISMISS_KEY, String(Date.now() + thirtyDays));
      setDismissed(true);
    }
    setDeferred(null);
  };

  const dismiss = () => {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(Date.now() + thirtyDays));
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={install}
        aria-label="Install app"
      >
        <Download className="mr-1 h-4 w-4" /> Install
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="text-muted"
      >
        ×
      </Button>
    </div>
  );
}
