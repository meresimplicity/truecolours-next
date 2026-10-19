"use client";
import { WorkspacePagination } from "@/components/admin/WorkspacePagination";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Loader2,
  Mail,
  MessageSquareText,
  Search,
  Send,
} from "lucide-react";
import {
  sendAdminCustomerMessage,
  useAdminWorkspace,
} from "@/lib/use-admin-workspace";

export default function MessagesPage() {
  const { workspace, loading, error, refresh, page, hasMore, setPage } =
    useAdminWorkspace();
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const messages = useMemo(
    () =>
      [...(workspace?.messages || [])]
        .sort((a, b) =>
          String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
        )
        .filter(
          (item) =>
            !query.trim() ||
            [
              item.subject,
              item.body,
              workspace?.customers.find(
                (customer) => customer.id === item.userId,
              )?.displayName,
            ]
              .join(" ")
              .toLowerCase()
              .includes(query.toLowerCase()),
        ),
    [query, workspace],
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSending(true);
    setSent(false);
    setMessage("");
    try {
      await sendAdminCustomerMessage(
        String(form.get("userId") || ""),
        String(form.get("subject") || ""),
        String(form.get("body") || ""),
      );
      event.currentTarget.reset();
      setSent(true);
      await refresh();
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Message could not be sent",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="mx-auto max-w-[1500px] space-y-5 sm:space-y-6">
      <WorkspacePagination page={page} hasMore={hasMore} onChange={setPage} />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">
          Communication
        </p>
        <h2 className="mt-2 text-[1.75rem] font-black leading-tight sm:text-3xl lg:text-4xl">
          Messages
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Customer conversations and account notifications.
        </p>
      </div>
      {error || message ? <Notice text={error || message} /> : null}
      <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <form
          onSubmit={submit}
          className="h-fit rounded-2xl border border-slate-200 bg-white p-5 xl:sticky xl:top-24"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-slate-950 text-white">
              <Send size={18} />
            </span>
            <div>
              <p className="font-black">New customer message</p>
              <p className="text-xs font-semibold text-slate-500">
                Also creates an account notification
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <select
              required
              name="userId"
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950"
            >
              <option value="">Choose customer</option>
              {workspace?.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.displayName} · {customer.email}
                </option>
              ))}
            </select>
            <input
              required
              name="subject"
              placeholder="Subject"
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
            />
            <textarea
              required
              name="body"
              rows={6}
              placeholder="Write the message"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none focus:border-slate-400"
            />
            <button
              disabled={!workspace?.configured || sending}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-black text-white disabled:opacity-30"
            >
              {sending ? (
                <Loader2 className="animate-spin" size={17} />
              ) : sent ? (
                <Check size={17} />
              ) : (
                <Send size={17} />
              )}
              {sending ? "Sending" : sent ? "Sent" : "Send message"}
            </button>
          </div>
        </form>
        <section>
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search customer, subject or message"
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none focus:border-slate-400"
            />
          </div>
          <div className="mt-4 space-y-3">
            {loading && !workspace
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div
                    className="h-28 animate-pulse rounded-2xl bg-slate-50"
                    key={index}
                  />
                ))
              : messages.map((item) => {
                  const customer = workspace?.customers.find(
                    (entry) => entry.id === item.userId,
                  );
                  return (
                    <article
                      className="rounded-2xl border border-slate-200 bg-white p-5"
                      key={String(item.id)}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-sm font-black">
                          <Mail size={16} />
                          {String(item.subject || "Message")}
                        </p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black">
                          {item.direction === "customer"
                            ? "Customer"
                            : "TRUECOLOURS"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">
                        {String(item.body || "")}
                      </p>
                      <p className="mt-4 text-xs font-semibold text-slate-500">
                        {customer?.displayName ||
                          String(item.userId || "Unknown customer")}{" "}
                        · {formatDate(item.createdAt)}
                      </p>
                    </article>
                  );
                })}
          </div>
          {!loading && !messages.length ? (
            <div className="mt-4 grid min-h-48 place-items-center rounded-2xl border border-dashed border-slate-200 text-center">
              <div>
                <MessageSquareText className="mx-auto text-slate-600" />
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  No actual messages yet.
                </p>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
function Notice({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
      <AlertTriangle className="shrink-0" size={19} />
      {text}
    </div>
  );
}
function formatDate(value: unknown) {
  if (!value) return "No date";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "No date"
    : date.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}
