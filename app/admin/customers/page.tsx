import { Suspense } from "react";
import type { Metadata } from "next";
import { CustomersClient } from "./CustomersClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customers | TRUECOLOURS Admin",
};

export default function CustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[50vh] place-items-center">
          <div className="size-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950" />
        </div>
      }
    >
      <CustomersClient />
    </Suspense>
  );
}
