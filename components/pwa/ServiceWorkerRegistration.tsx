"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { publishOfflineStatus } from "@/components/pwa/OfflineStatus";

const ADMIN_SHELL_PATHS = new Set<string>();

async function sendWorkerMessage<T>(
  type: string,
  timeoutMs = 60_000,
): Promise<T> {
  let readyTimeout = 0;
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => {
      readyTimeout = window.setTimeout(
        () => reject(new Error("The offline worker is not ready.")),
        timeoutMs,
      );
    }),
  ]).finally(() => window.clearTimeout(readyTimeout));
  const worker = navigator.serviceWorker.controller || registration.active;
  if (!worker)
    throw new Error("The offline worker is not controlling this page yet.");

  return new Promise<T>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error("The offline worker did not acknowledge the request."));
    }, timeoutMs);
    channel.port1.onmessage = (event: MessageEvent<T>) => {
      window.clearTimeout(timeout);
      channel.port1.close();
      resolve(event.data);
    };
    worker.postMessage({ type }, [channel.port2]);
  });
}

async function clearPrivateCachesDirectly() {
  if (!("caches" in globalThis)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith("truecolours-pwa-shell-"))
      .map(async (key) => {
        const cache = await caches.open(key);
        const requests = await cache.keys();
        await Promise.all(
          requests
            .filter((request) =>
              new URL(request.url).pathname.startsWith("/admin/"),
            )
            .map((request) => cache.delete(request)),
        );
      }),
  );
}

export async function clearPrivateServiceWorkerCache() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
    return;
  try {
    await sendWorkerMessage("TRUECOLOURS_CLEAR_PRIVATE_CACHE", 8_000);
  } catch {
    await clearPrivateCachesDirectly();
  }
}

export function ServiceWorkerRegistration({
  enabled = process.env.NODE_ENV === "production",
}: {
  enabled?: boolean;
}) {
  const pathname = usePathname();
  const [workerEpoch, setWorkerEpoch] = useState(0);

  useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) return;

    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (disposed) return;

        await navigator.serviceWorker.ready;
        if (disposed) return;

        setWorkerEpoch((value) => value + 1);
        navigator.serviceWorker.controller?.postMessage({
          type: "TRUECOLOURS_PING",
        });
      } catch (reason) {
        if (!disposed) {
          publishOfflineStatus({
            serviceWorkerReady: false,
            error:
              reason instanceof Error
                ? `Offline shell unavailable: ${reason.message}`
                : "Offline shell unavailable.",
          });
        }
      }
    };

    const checkForUpdate = () => {
      if (navigator.onLine) void registration?.update();
    };

    const markControllerReady = () => setWorkerEpoch((value) => value + 1);

    if (document.readyState === "complete") void register();
    else window.addEventListener("load", register, { once: true });

    window.addEventListener("online", checkForUpdate);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      markControllerReady,
    );

    return () => {
      disposed = true;
      window.removeEventListener("load", register);
      window.removeEventListener("online", checkForUpdate);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        markControllerReady,
      );
    };
  }, [enabled]);

  useEffect(() => {
    if (
      !enabled ||
      workerEpoch === 0 ||
      !ADMIN_SHELL_PATHS.has(pathname) ||
      !("serviceWorker" in navigator)
    )
      return;

    let disposed = false;
    const prepare = async () => {
      if (!navigator.onLine) return;
      try {
        const result = await sendWorkerMessage<{ cachedPaths?: string[] }>(
          "TRUECOLOURS_PREPARE_PRIVATE_SHELLS",
        );
        if (disposed) return;
        const cachedPaths = result.cachedPaths || [];
        if (!cachedPaths.includes(pathname)) {
          throw new Error(
            "This admin page could not be prepared for offline reopening.",
          );
        }
        publishOfflineStatus({ serviceWorkerReady: true });
      } catch (reason) {
        if (!disposed) {
          publishOfflineStatus({
            serviceWorkerReady: false,
            error:
              reason instanceof Error
                ? reason.message
                : "The private offline shell could not be prepared.",
          });
        }
      }
    };
    void prepare();
    return () => {
      disposed = true;
    };
  }, [enabled, pathname, workerEpoch]);

  return null;
}
