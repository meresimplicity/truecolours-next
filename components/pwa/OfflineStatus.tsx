"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AlertTriangle, Cloud, CloudOff, RefreshCw } from "lucide-react";

export const OFFLINE_STATUS_EVENT = "truecolours:offline-status";
export const OFFLINE_RETRY_EVENT = "truecolours:offline-retry";

export type OfflineStatusDetail = {
  pendingCount?: number;
  syncing?: boolean;
  lastSyncAt?: string | number | Date | null;
  error?: string | null;
  serviceWorkerReady?: boolean;
};

export type OfflineStatusState = {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
  lastSyncAt: string | null;
  error: string | null;
  serviceWorkerReady: boolean;
};

type OfflineStatusContextValue = OfflineStatusState & {
  retry: () => Promise<void>;
  update: (detail: OfflineStatusDetail) => void;
};

type WorkerMessage = OfflineStatusDetail & {
  type?: string;
  detail?: OfflineStatusDetail;
};

const initialState: OfflineStatusState = {
  online: true,
  pendingCount: 0,
  syncing: false,
  lastSyncAt: null,
  error: null,
  serviceWorkerReady: false,
};

const OfflineStatusContext = createContext<OfflineStatusContextValue | null>(null);

export function publishOfflineStatus(detail: OfflineStatusDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<OfflineStatusDetail>(OFFLINE_STATUS_EVENT, { detail }));
}

export function OfflineStatusProvider({
  children,
  onRetry,
}: {
  children: ReactNode;
  onRetry?: () => void | Promise<void>;
}) {
  const [state, setState] = useState<OfflineStatusState>(initialState);
  const online = useSyncExternalStore(subscribeToOnlineStatus, readOnlineStatus, () => true);

  const update = useCallback((detail: OfflineStatusDetail) => {
    setState((current) => ({
      ...current,
      ...(typeof detail.pendingCount === "number"
        ? { pendingCount: Math.max(0, Math.trunc(detail.pendingCount)) }
        : {}),
      ...(typeof detail.syncing === "boolean" ? { syncing: detail.syncing } : {}),
      ...(detail.lastSyncAt !== undefined
        ? { lastSyncAt: normalizeDate(detail.lastSyncAt) }
        : {}),
      ...(detail.error !== undefined ? { error: detail.error || null } : {}),
      ...(typeof detail.serviceWorkerReady === "boolean"
        ? { serviceWorkerReady: detail.serviceWorkerReady }
        : {}),
    }));
  }, []);

  useEffect(() => {
    const receiveStatus = (event: Event) => {
      update((event as CustomEvent<OfflineStatusDetail>).detail || {});
    };
    const receiveWorkerMessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data || {};
      const detail = message.detail || message;

      if (message.type === "TRUECOLOURS_SW_READY") {
        return;
      } else if (message.type === "TRUECOLOURS_SYNC_START") {
        update({ ...detail, syncing: true, error: null });
      } else if (message.type === "TRUECOLOURS_SYNC_SUCCESS") {
        update({ ...detail, syncing: false, error: null, lastSyncAt: detail.lastSyncAt || new Date() });
      } else if (message.type === "TRUECOLOURS_SYNC_ERROR") {
        update({ ...detail, syncing: false, error: detail.error || "Sync failed." });
      } else if (message.type === "TRUECOLOURS_QUEUE_COUNT") {
        update(detail);
      }
    };

    window.addEventListener(OFFLINE_STATUS_EVENT, receiveStatus);
    navigator.serviceWorker?.addEventListener("message", receiveWorkerMessage);

    return () => {
      window.removeEventListener(OFFLINE_STATUS_EVENT, receiveStatus);
      navigator.serviceWorker?.removeEventListener("message", receiveWorkerMessage);
    };
  }, [update]);

  const retry = useCallback(async () => {
    window.dispatchEvent(
      new CustomEvent(OFFLINE_RETRY_EVENT, {
        detail: { requestedAt: new Date().toISOString() },
      })
    );

    if (!onRetry) return;
    update({ syncing: true, error: null });
    try {
      await onRetry();
      update({ syncing: false, error: null, lastSyncAt: new Date() });
    } catch (reason) {
      update({
        syncing: false,
        error: reason instanceof Error ? reason.message : "Sync failed.",
      });
    }
  }, [onRetry, update]);

  const value = useMemo(
    () => ({ ...state, online, retry, update }),
    [online, retry, state, update]
  );

  return <OfflineStatusContext.Provider value={value}>{children}</OfflineStatusContext.Provider>;
}

export function useOfflineStatus() {
  const value = useContext(OfflineStatusContext);
  if (!value) throw new Error("useOfflineStatus must be used inside OfflineStatusProvider.");
  return value;
}

export function OfflineStatus({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const state = useOfflineStatus();
  const presentation = statusPresentation(state);
  const Icon = presentation.icon;
  const showRetry = !state.syncing && (!state.online || state.pendingCount > 0 || Boolean(state.error));

  return (
    <section
      aria-live="polite"
      className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-xs font-bold shadow-sm ${presentation.classes} ${className}`}
      data-offline-status={presentation.key}
      title={compact ? statusDetail(state) : undefined}
    >
      <Icon className={state.syncing ? "animate-spin" : ""} size={17} />
      <div className={`min-w-0 flex-1 ${compact ? "whitespace-nowrap" : ""}`}>
        <p className="font-black">{presentation.label}</p>
        {!compact ? <p className="truncate font-semibold opacity-75">{statusDetail(state)}</p> : null}
      </div>
      {showRetry && !compact ? (
        <button
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white/80 px-2.5 font-black text-slate-950 ring-1 ring-black/10 transition hover:bg-white disabled:opacity-50"
          onClick={() => void state.retry()}
          type="button"
        >
          <RefreshCw size={14} /> Retry
        </button>
      ) : null}
    </section>
  );
}

function statusPresentation(state: OfflineStatusState) {
  if (!state.online) {
    return {
      key: "offline",
      label: "Offline",
      icon: CloudOff,
      classes: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }
  if (state.error) {
    return {
      key: "error",
      label: "Sync needs attention",
      icon: AlertTriangle,
      classes: "border-red-200 bg-red-50 text-red-800",
    };
  }
  if (state.syncing) {
    return {
      key: "syncing",
      label: "Syncing",
      icon: RefreshCw,
      classes: "border-blue-200 bg-blue-50 text-blue-800",
    };
  }
  if (state.pendingCount > 0) {
    return {
      key: "pending",
      label: `${state.pendingCount} pending`,
      icon: Cloud,
      classes: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }
  return {
    key: "online",
    label: "Online",
    icon: Cloud,
    classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
}

function statusDetail(state: OfflineStatusState) {
  if (state.error) return state.error;
  if (!state.online) {
    return state.pendingCount > 0
      ? `${state.pendingCount} ${state.pendingCount === 1 ? "change" : "changes"} waiting to sync`
      : "Live-only actions may be unavailable";
  }
  if (state.syncing) {
    return state.pendingCount > 0
      ? `Uploading ${state.pendingCount} pending ${state.pendingCount === 1 ? "change" : "changes"}`
      : "Checking for pending changes";
  }
  if (state.pendingCount > 0) return "Connected and ready to retry";
  if (state.lastSyncAt) return `Last sync ${formatDate(state.lastSyncAt)}`;
  return state.serviceWorkerReady ? "Offline shell ready" : "Connected";
}

function normalizeDate(value: OfflineStatusDetail["lastSyncAt"]) {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

function subscribeToOnlineStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function readOnlineStatus() {
  return navigator.onLine;
}
