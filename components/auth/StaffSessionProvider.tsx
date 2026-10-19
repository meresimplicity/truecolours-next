"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AdminActor } from "@/lib/server/admin-authorization";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
type Value = {
  data: { user: AdminActor } | null;
  developmentBypass: boolean;
  message: string | null;
  status: "loading" | "authenticated" | "unauthenticated";
};
const Context = createContext<Value>({
  data: null,
  developmentBypass: false,
  message: null,
  status: "loading",
});
export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<Value>({
    data: null,
    developmentBypass: false,
    message: null,
    status: "loading",
  });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/access", {
          cache: "no-store",
        });
        const result = await response.json();
        if (alive) {
          setValue({
            data:
              response.ok && result?.user
                ? { user: result.user }
                : null,
            developmentBypass: Boolean(result?.developmentBypass),
            message: response.ok ? null : result?.message || null,
            status:
              response.ok && result?.user
                ? "authenticated"
                : "unauthenticated",
          });
        }
      } catch {
        if (alive)
          setValue({
            data: null,
            developmentBypass: false,
            message: "Admin access could not be checked.",
            status: "unauthenticated",
          });
      }
    };
    void load();
    const timer = setInterval(load, 60_000);
    if (!isSupabaseConfigured())
      return () => {
        alive = false;
        clearInterval(timer);
      };
    const { data } = getSupabaseBrowser().auth.onAuthStateChange(() => {
      queueMicrotask(load);
    });
    return () => {
      alive = false;
      clearInterval(timer);
      data.subscription.unsubscribe();
    };
  }, []);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useSession = () => useContext(Context);
