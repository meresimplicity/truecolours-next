"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LayoutDashboard, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { isAdminRole } from "@/lib/account-types";

export function AccountMenu({ dark = false, mobile = false, compact = false, onNavigate }: { dark?: boolean; mobile?: boolean; compact?: boolean; onNavigate?: () => void }) {
  const { loading, profile, signOut, user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const base = compact
    ? "inline-flex h-11 w-11 items-center justify-center rounded-full transition"
    : mobile
    ? "flex min-h-11 w-full items-center gap-2 rounded-lg px-4 text-sm font-bold"
    : "inline-flex h-11 min-w-32 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-bold transition";
  const tone = compact
    ? dark
      ? "text-white/55 hover:bg-white/10 hover:text-white"
      : "text-slate-500 hover:bg-blue-50 hover:text-[#101b55]"
    : dark
    ? "border-white/20 text-white hover:border-white hover:bg-white/10"
    : "border-slate-200 text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700";

  if (loading) return <span className={`${base} ${tone} opacity-60`}>{compact ? <UserRound size={25} /> : "Account"}</span>;
  if (!user) return <Link href="/catalogue?account=login" aria-label="My account" onClick={onNavigate} className={`${base} ${tone}`}><UserRound size={compact ? 25 : 17} />{!compact && "My Account"}</Link>;

  const displayName = profile?.displayName || user.displayName || user.email || "My Account";
  const isAdmin = isAdminRole(profile?.role);

  return <div className={`relative ${mobile ? "w-full" : ""}`} ref={ref}>
    <button aria-label="Open account menu" onClick={() => setOpen((current) => !current)} className={`${base} ${tone} w-full`}><span className={`grid place-items-center overflow-hidden rounded-full text-xs font-black ${compact ? `h-8 w-8 ring-1 ${dark ? "bg-white/10 text-white ring-white/40" : "bg-slate-100 text-slate-600 ring-slate-200"}` : "h-6 w-6 bg-red-600 text-white"}`}>{profile?.photoURL ? <img className="h-full w-full object-cover" alt="" src={profile.photoURL} /> : compact ? <UserRound size={21} /> : displayName.slice(0, 1).toUpperCase()}</span>{!compact && <><span className="max-w-28 truncate">{displayName}</span><ChevronDown size={15} /></>}</button>
    <AnimatePresence>{open && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className={`z-[70] min-w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl ${mobile ? "mt-2" : "absolute right-0 top-12"}`}><Link href="/catalogue?account=dashboard" onClick={() => { setOpen(false); onNavigate?.(); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700"><LayoutDashboard size={17} />My account</Link>{isAdmin && <Link href="/admin" onClick={() => { setOpen(false); onNavigate?.(); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700"><ShieldCheck size={17} />Admin dashboard</Link>}<button onClick={async () => { await signOut(); setOpen(false); onNavigate?.(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"><LogOut size={17} />Sign out</button></motion.div>}</AnimatePresence>
  </div>;
}
