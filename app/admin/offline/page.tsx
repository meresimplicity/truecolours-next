"use client";
import { useSyncExternalStore } from "react";
const subscribe = (listener: () => void) => {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
};
export default function ConnectionPage() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8">
      <h2 className="text-3xl font-black">Connection</h2>
      <p className="mt-4 font-bold">
        {online ? "Internet connection detected" : "You are offline"}
      </p>
      <p className="mt-3 text-slate-600">
        Stock, checkout, payments and business records require a live connection
        to Supabase. Reconnect and refresh before continuing. An internet
        connection indicator does not confirm server availability.
      </p>
    </section>
  );
}
