import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

// No tests for SwUpdateToast in v1 — it imports `virtual:pwa-register/react`,
// which only exists at build/dev time via vite-plugin-pwa. Manual testing only.
// To keep `RootLayout` test-friendly, this component is mounted in `main.tsx`
// (the real entry) rather than in `RootLayout`, so router tests never load
// the virtual module.
export function SwUpdateToast() {
  const { toast } = useToast();
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {},
    onOfflineReady() {},
  });
  const [showRefresh, setShowRefresh] = needRefresh;

  useEffect(() => {
    if (showRefresh) {
      const t = toast({
        title: "New version available",
        description: "Reload to get the latest.",
        action: (
          <ToastAction
            altText="Reload to update"
            onClick={() => {
              void updateServiceWorker(true);
              setShowRefresh(false);
            }}
          >
            Reload
          </ToastAction>
        ),
        duration: 1000 * 60 * 60,
      });
      return () => t.dismiss();
    }
    return undefined;
  }, [showRefresh, toast, updateServiceWorker, setShowRefresh]);

  return null;
}
