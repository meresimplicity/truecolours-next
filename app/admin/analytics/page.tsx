"use client";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
const money = (value: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(
    value,
  );
type Report = {
  monthly: Array<{
    month: string;
    sales: number;
    vat: number;
    transactions: number;
    cash: number;
    card: number;
    eft: number;
  }>;
  summary: {
    paidRevenue: number;
    outstanding: number;
    todaySales: number;
    todayTransactions: number;
  };
};
export default function AnalyticsPage() {
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/reports", { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message);
        setData(body);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, []);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h2 className="text-3xl font-black">Sales and branch performance</h2>
      <p className="text-sm text-slate-600">
        Recorded POS sales, including manually confirmed external card and EFT
        payments. Times use Africa/Johannesburg.
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Today", data?.summary.todaySales],
          ["All recorded sales", data?.summary.paidRevenue],
          ["Outstanding invoices", data?.summary.outstanding],
        ].map(([label, value]) => (
          <article
            key={String(label)}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-3 text-2xl font-black">
              {data ? money(Number(value) || 0) : "—"}
            </p>
          </article>
        ))}
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold">Monthly sales</h3>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.monthly || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="#111827" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {[
                "Month",
                "Sales",
                "VAT included",
                "Transactions",
                "Cash",
                "Card",
                "EFT",
              ].map((label) => (
                <th className="p-4" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.monthly.map((row) => (
              <tr key={row.month} className="border-t border-slate-200">
                <td className="p-4">{row.month}</td>
                <td>{money(row.sales)}</td>
                <td>{money(row.vat)}</td>
                <td>{row.transactions}</td>
                <td>{money(row.cash)}</td>
                <td>{money(row.card)}</td>
                <td>{money(row.eft)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
