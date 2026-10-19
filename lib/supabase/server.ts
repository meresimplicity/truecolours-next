import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";
export async function getSupabaseServer() {
  const store = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          /* Middleware refreshes cookies for Server Components. */
        }
      },
    },
  });
}
export function checked<T>({
  data,
  error,
}: {
  data: T;
  error: { message: string } | null;
}): T {
  if (error) throw new Error(error.message);
  return data;
}
