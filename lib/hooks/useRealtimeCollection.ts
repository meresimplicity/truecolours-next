"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
export function useRealtimeCollection<T>(table: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let active = true;
    const db = getSupabaseBrowser();
    const load = async () => {
      const result = await db.from(table).select("*").limit(100);
      if (active) {
        setLoading(false);
        if (result.error) setError(new Error(result.error.message));
        else setData(result.data as T[]);
      }
    };
    void load();
    const channel = db
      .channel(`rows-${table}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        void load();
      })
      .subscribe();
    return () => {
      active = false;
      void db.removeChannel(channel);
    };
  }, [table]);
  return { data, loading, error };
}
