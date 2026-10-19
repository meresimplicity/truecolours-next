import { Suspense } from "react";
import type { Metadata } from "next";
import { CustomerDashboard } from "@/components/account/CustomerDashboard";

export const metadata: Metadata = { title: "My Dashboard | TRUECOLOURS" };

function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse p-8">
      <div className="h-9 w-64 rounded bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-slate-100" />
    </div>
  );
}

export default function CustomerDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <CustomerDashboard />
    </Suspense>
  );
}
