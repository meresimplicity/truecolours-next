"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SlipEditor } from "@/components/admin/SlipEditor";
import type {
  SlipDocument,
  MatchProduct,
  ProductAlias,
} from "@/lib/slips/types";
export default function SlipPage() {
  const { id } = useParams<{ id: string }>();
  const [loaded, setLoaded] = useState<{
      doc: SlipDocument;
      bootstrap: {
        products: MatchProduct[];
        aliases: ProductAlias[];
        locationId: string;
      };
    } | null>(null),
    [error, setError] = useState<{ id: string; message: string } | null>(null);
  useEffect(() => {
    const c = new AbortController(),
      branch =
        new URLSearchParams(window.location.search).get("locationId") || "";
    void Promise.all([
      fetch(
        `/api/admin/inventory/slips?${new URLSearchParams({ id, locationId: branch })}`,
        { signal: c.signal, cache: "no-store" },
      ),
      fetch(
        `/api/admin/inventory/slips?locationId=${encodeURIComponent(branch)}`,
        { signal: c.signal, cache: "no-store" },
      ),
    ])
      .then(async (responses) => {
        const values = await Promise.all(responses.map((r) => r.json()));
        for (let n = 0; n < responses.length; n++)
          if (!responses[n].ok) throw Error(values[n].message);
        setLoaded({ doc: values[0], bootstrap: values[1] });
        setError(null);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError({ id, message: e.message });
      });
    return () => c.abort();
  }, [id]);
  if (error?.id === id)
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-800">
        {error.message}
      </p>
    );
  return loaded && loaded.doc.id === id ? (
    <SlipEditor
      key={loaded.doc.id}
      initial={loaded.doc}
      bootstrap={loaded.bootstrap}
    />
  ) : (
    <p role="status">Opening saved slip…</p>
  );
}
