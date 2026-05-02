import { useCallback, useEffect, useState } from "react";
import { useSettingsStore } from "@/stores/useSettingsStore";

export function useApiCheck(requiredProviders: string[]) {
  const { configured, fetch, loading } = useSettingsStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (!loading && configured.length > 0) {
      setChecked(true);
    }
  }, [configured, loading]);

  const missing = requiredProviders.filter((p) => !configured.includes(p));
  const allConfigured = missing.length === 0 && checked;

  const triggerCheck = useCallback(
    (onProceed: () => void) => {
      if (allConfigured) {
        onProceed();
      } else {
        // Store missing providers for the ApiReminderModal to pick up
        window.dispatchEvent(
          new CustomEvent("api-check-failed", {
            detail: { missing, onProceed },
          })
        );
      }
    },
    [allConfigured, missing]
  );

  return { allConfigured, missing, configured, triggerCheck };
}
