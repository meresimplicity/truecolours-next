"use client";
import { BranchSetup } from "@/components/admin/BusinessCommands";

import Image from "next/image";
import { FormEvent, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Percent,
  Phone,
  Save,
  ShieldCheck,
} from "lucide-react";
import {
  updateAdminSettings,
  useAdminWorkspace,
} from "@/lib/use-admin-workspace";

export default function SettingsPage() {
  const { workspace, loading, error, refresh } = useAdminWorkspace();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const settings = workspace?.settings;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setSaved(false);
    setMessage("");
    try {
      await updateAdminSettings(Object.fromEntries(form.entries()));
      setSaved(true);
      await refresh();
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Settings could not be saved",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">
          Configuration
        </p>
        <h2 className="mt-2 text-[1.75rem] font-black leading-tight sm:text-3xl lg:text-4xl">
          Business and invoices
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Settings used when invoices are calculated and printed.
        </p>
      </div>
      {error || message ? <Notice text={error || message} /> : null}
      <section className="flex flex-col items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="relative h-16 w-full max-w-xs">
          <Image
            src="/images/logo.png"
            alt="TRUECOLOURS Automotive & Industrial Paints"
            fill
            className="object-contain object-left"
            sizes="320px"
          />
        </div>
        <div>
          <p className="font-black">Official website logo</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Used in the admin navigation and printable invoice document.
          </p>
        </div>
      </section>
      <BranchSetup />
      {settings ? (
        <form
          key={JSON.stringify(settings)}
          onSubmit={submit}
          className="space-y-5"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <h3 className="font-black">Business identity</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Printed on invoices, statements and customer documents.
            </p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Input
                name="businessName"
                label="Trading name"
                icon={Building2}
                defaultValue={settings.businessName}
                required
              />
              <Input
                name="registrationNumber"
                label="CIPC registration number"
                icon={FileText}
                defaultValue={settings.registrationNumber}
              />
              <Input
                name="vatNumber"
                label="VAT number"
                icon={FileText}
                defaultValue={settings.vatNumber}
              />
              <Input
                name="website"
                label="Website"
                icon={FileText}
                defaultValue={settings.website}
              />
              <Input
                name="email"
                label="Business email"
                icon={Mail}
                defaultValue={settings.email}
                type="email"
              />
              <Input
                name="phone"
                label="Business phone"
                icon={Phone}
                defaultValue={settings.phone}
              />
              <Input
                name="country"
                label="Country"
                icon={MapPin}
                defaultValue={settings.country}
              />
              <label className="sm:col-span-2 text-xs font-black text-slate-600">
                <span className="flex items-center gap-2">
                  <MapPin size={15} />
                  Physical address
                </span>
                <textarea
                  name="address"
                  defaultValue={settings.address}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
                />
              </label>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <h3 className="font-black">Invoice defaults</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              New documents inherit these values and can still be changed
              individually.
            </p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Input
                name="invoicePrefix"
                label="Invoice prefix"
                icon={FileText}
                defaultValue={settings.invoicePrefix}
                required
              />
              <Input
                name="vatRate"
                label="VAT rate (%)"
                icon={Percent}
                defaultValue={String(settings.vatRate)}
                type="number"
                required
              />
              <Input
                name="defaultPaymentTerms"
                label="Default payment days"
                icon={FileText}
                defaultValue={String(settings.defaultPaymentTerms)}
                type="number"
                required
              />
              <Input
                name="invoiceAccentColor"
                label="Document accent colour"
                icon={FileText}
                defaultValue={settings.invoiceAccentColor}
              />
              <label className="sm:col-span-2 text-xs font-black text-slate-600">
                Default public notes
                <textarea
                  className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                  defaultValue={settings.defaultPublicNotes}
                  name="defaultPublicNotes"
                />
              </label>
              <label className="sm:col-span-2 text-xs font-black text-slate-600">
                Invoice footer
                <textarea
                  className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                  defaultValue={settings.invoiceFooter}
                  name="invoiceFooter"
                />
              </label>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <h3 className="font-black">Banking details</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Leave blank to omit this section from customer invoices.
            </p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Input
                name="bankAccountHolder"
                label="Account holder"
                icon={Building2}
                defaultValue={settings.bankAccountHolder}
              />
              <Input
                name="bankName"
                label="Bank name"
                icon={Building2}
                defaultValue={settings.bankName}
              />
              <Input
                name="bankAccountNumber"
                label="Account number"
                icon={FileText}
                defaultValue={settings.bankAccountNumber}
              />
              <Input
                name="bankAccountType"
                label="Account type"
                icon={FileText}
                defaultValue={settings.bankAccountType}
              />
              <Input
                name="bankBranchCode"
                label="Branch code"
                icon={FileText}
                defaultValue={settings.bankBranchCode}
              />
            </div>
          </section>
          <div className="sticky bottom-4 flex justify-stretch rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:justify-end">
            <button
              disabled={!workspace.configured || saving}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-6 text-sm font-black text-white disabled:opacity-30 sm:w-auto"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={18} />
              ) : saved ? (
                <Check size={18} />
              ) : (
                <Save size={18} />
              )}{" "}
              {saving ? "Saving" : saved ? "Saved" : "Save to Supabase"}
            </button>
          </div>
        </form>
      ) : loading ? (
        <div className="h-80 animate-pulse rounded-2xl bg-slate-50" />
      ) : null}
      <section className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <ShieldCheck className="shrink-0 text-slate-950" size={20} />
        <div>
          <p className="font-black">Security</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            Staff and customers use Supabase Auth. Staff roles and branch access
            are checked in the database for every command. Profile details
            cannot grant staff access.
          </p>
        </div>
      </section>
    </div>
  );
}

function Input({
  name,
  label,
  icon: Icon,
  defaultValue,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  icon: typeof Building2;
  defaultValue: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-xs font-black text-slate-600">
      <span className="flex items-center gap-2">
        <Icon size={15} />
        {label}
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
        type={type}
        required={required}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? 0.01 : undefined}
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
      />
    </label>
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
