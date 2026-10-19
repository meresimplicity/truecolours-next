"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Car,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  Heart,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  Menu,
  MessageSquareText,
  Package,
  Palette,
  Plus,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  addToCustomerCart,
  createCustomerMessage,
  createQuoteRequest,
  loadCustomerWorkspace,
  markNotificationRead,
  removeCustomerSubcollectionItem,
  saveAddress,
  saveColour,
  updateCustomerCartQuantity,
  updateCustomerProfile,
  uploadCustomerFile,
  watchCustomerNotifications,
  watchCustomerInvoices,
} from "@/lib/customer-data";
import {
  emptyCustomerWorkspace,
  type CustomerQuote,
  type CustomerWorkspace,
  type DashboardSection,
} from "@/lib/account-types";
import { useAuth } from "@/components/auth/AuthProvider";
import { AccountAccess } from "@/components/auth/AccountAccess";
import { ProfileOnboarding } from "@/components/auth/ProfileOnboarding";
import { siteConfig } from "@/config/site";

const navigation: Array<{ id: DashboardSection; label: string; icon: typeof LayoutDashboard; group: string }> = [
  { id: "home", label: "Account overview", icon: LayoutDashboard, group: "My account" },
  { id: "orders", label: "Orders", icon: Package, group: "Orders" },
  { id: "downloads", label: "Invoices & downloads", icon: Download, group: "Orders" },
  { id: "quotes", label: "Quotes", icon: FileText, group: "Orders" },
  { id: "cart", label: "Cart", icon: ShoppingCart, group: "Orders" },
  { id: "wishlist", label: "My lists", icon: Heart, group: "My lists" },
  { id: "saved-colours", label: "Saved colours", icon: Palette, group: "My lists" },
  { id: "addresses", label: "Address book", icon: MapPin, group: "Profile" },
  { id: "settings", label: "Personal details", icon: Settings, group: "Profile" },
  { id: "security", label: "Security settings", icon: ShieldCheck, group: "Profile" },
  { id: "notifications", label: "Offers & notifications", icon: Bell, group: "Profile" },
  { id: "messages", label: "Messages", icon: MessageSquareText, group: "Support" },
  { id: "support", label: "Help centre", icon: CircleHelp, group: "Support" },
];

const compactNavigation = navigation
  .filter((item) => ["home", "orders", "quotes", "saved-colours", "addresses", "messages", "settings"].includes(item.id))
  .map((item) => ({ ...item, label: item.id === "home" ? "Overview" : item.id === "settings" ? "Profile" : item.label }));

function formatDate(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  }
  if (typeof value === "string") return new Date(value).toLocaleDateString("en-ZA");
  return "Just now";
}

function money(value: unknown) { return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(value) || 0); }

function statusClass(status: string) {
  if (status === "accepted" || status === "delivered" || status === "completed") return "bg-emerald-50 text-emerald-700";
  if (status === "rejected" || status === "cancelled") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-medium leading-6 text-slate-500">{children}</div>;
}

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">{eyebrow}</p><h2 className="mt-1 text-4xl font-black text-gray-950" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{title}</h2></div>{children}</div>;
}

export function CustomerDashboard({ embedded = false }: { embedded?: boolean }) {
  const { configured, loading: authLoading, profile, profileComplete, markProfileComplete, resetAccountPassword, signOut, user } = useAuth();
  const [activeSection, setActiveSection] = useState<DashboardSection>("home");
  const [workspace, setWorkspace] = useState<CustomerWorkspace>(emptyCustomerWorkspace);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [compactMenuOpen, setCompactMenuOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const searchParams = useSearchParams();

  // Show welcome banner when redirected from onboarding
  useEffect(() => {
    if (searchParams.get("onboarded") === "true") {
      setShowWelcomeBanner(true);
    }
  }, [searchParams]);

  const refreshWorkspace = useCallback(async () => {
    if (!user) return;
    try {
      setWorkspace(await loadCustomerWorkspace(user.uid));
      setError("");
    } catch {
      // Keep the account instantly usable with its empty local workspace. Live
      // data will populate automatically once Firestore access is available.
    }
  }, [user]);

  useEffect(() => {
    if (!user || !profileComplete) return;
    refreshWorkspace();
    const stopNotifications = watchCustomerNotifications(
      user.uid,
      (notifications) => {
        setWorkspace((current) => ({ ...current, notifications }));
        setError("");
      },
      () => setError("Live account updates are temporarily unavailable. Please refresh and try again.")
    );
    const stopInvoices = watchCustomerInvoices(user.uid, (invoices) => setWorkspace((current) => ({ ...current, invoices })), () => setError("Live invoice updates are temporarily unavailable. Please refresh and try again."));
    return () => { stopNotifications(); stopInvoices(); };
  }, [refreshWorkspace, user, profileComplete]);

  const unreadNotifications = workspace.notifications.filter((item) => !item.read).length;
  const displayName = profile?.displayName || user?.displayName || "TRUECOLOURS customer";

  async function runAction(action: () => Promise<unknown>, success: string) {
    setWorking(true);
    setMessage("");
    try {
      await action();
      await refreshWorkspace();
      setMessage(success);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "That update could not be saved. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  function navigate(section: DashboardSection) {
    setActiveSection(section);
    setMobileMenuOpen(false);
    setCompactMenuOpen(false);
    setMessage("");
  }

  function downloadQuote(quote: CustomerQuote) {
    const contents = [
      "TRUECOLOURS quotation request",
      `Reference: ${quote.quoteNumber || quote.id}`,
      `Status: ${quote.status}`,
      `Request: ${quote.title}`,
      `Paint code: ${quote.paintCode || "Not specified"}`,
      "",
      quote.details,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([contents], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `truecolours-quote-${quote.quoteNumber || quote.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (authLoading) return <DashboardLoading />;
  if (!configured || !user) return <AccountAccess compact />;

  // Show onboarding for new users who haven't completed their profile
  if (!profileComplete) {
    return <ProfileOnboarding onComplete={markProfileComplete} />;
  }

  if (embedded) {
    const selectedCompactItem = compactNavigation.find((item) => item.id === activeSection) ?? compactNavigation[0];
    const SelectedCompactIcon = selectedCompactItem.icon;

    return (
      <div className="flex h-full min-h-0 flex-col bg-[#f7f9fc]">
        <header className="border-b border-slate-200 bg-white px-5 pb-5 pt-16 sm:px-7">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#101b55] to-[#2454ca] text-lg font-black text-white shadow-lg shadow-blue-950/15">
              {profile?.photoURL || user.photoURL ? <img className="h-full w-full object-cover" alt="" src={profile?.photoURL || user.photoURL || ""} /> : displayName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">My TRUECOLOURS account</p>
              <h1 className="mt-1 truncate text-xl font-black text-slate-950">{displayName}</h1>
              <p className="truncate text-xs text-slate-500">{profile?.email || user.email}</p>
            </div>
          </div>
        </header>

        <nav className="relative shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6" aria-label="Account sections">
          <button
            type="button"
            onClick={() => setCompactMenuOpen((current) => !current)}
            aria-expanded={compactMenuOpen}
            className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-left text-sm font-black text-slate-800 transition hover:border-blue-200 hover:bg-blue-50/60"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#101b55] text-white"><SelectedCompactIcon size={16} /></span>
            <span className="min-w-0 flex-1 truncate">{selectedCompactItem.label}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Section</span>
            <ChevronDown size={17} className={`shrink-0 text-slate-500 transition ${compactMenuOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence initial={false}>
            {compactMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -6 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/8 min-[380px]:grid-cols-2">
                  {compactNavigation.map(({ id, icon: Icon, label }) => (
                    <button key={id} onClick={() => navigate(id)} className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl px-3 text-left text-xs font-bold transition ${activeSection === id ? "bg-[#101b55] text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                      <Icon size={15} className="shrink-0" /><span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
          {message && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>}
          {activeSection === "home" ? (
            <CompactHome onNavigate={navigate} workspace={workspace} />
          ) : (
            <DashboardContent section={activeSection} workspace={workspace} displayName={displayName} profile={profile} working={working} onAction={runAction} onNavigate={navigate} onDownloadQuote={downloadQuote} userId={user.uid} onSignOut={signOut} resetPassword={resetAccountPassword} />
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
          <p className="text-xs text-slate-400">Secure customer account</p>
          <button onClick={() => signOut()} className="rounded-xl px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50">Sign out</button>
        </footer>
      </div>
    );
  }

  return (
    <div className={`dashboard-shell${embedded ? " dashboard-embedded" : ""}`}>
      {/* ───── Sidebar ───── */}
      <aside className="dashboard-sidebar">
        <Sidebar displayName={displayName} email={profile?.email || user.email || undefined} address={profile?.deliveryAddress} photoURL={profile?.photoURL || user.photoURL || undefined} active={activeSection} unread={unreadNotifications} onNavigate={navigate} onSignOut={signOut} />
      </aside>

      {/* ───── Main content ───── */}
      <div className="dashboard-main">
        {/* Top header bar */}
        <header className="dashboard-header">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-700 lg:hidden">
              <Menu size={20} />
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">My account</p>
              <p className="font-bold text-slate-800">Welcome back, {displayName.split(" ")[0]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:inline-flex"
            >
              <ArrowLeft size={15} />
              Back to website
            </Link>
            <button onClick={() => navigate("notifications")} className="relative rounded-xl p-2 text-slate-600 transition hover:bg-slate-100">
              <Bell size={20} />
              {unreadNotifications > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unreadNotifications}</span>}
            </button>
          </div>
        </header>

        {/* Content area */}
        <div className="dashboard-content">
          {/* Welcome banner (shown once after onboarding) */}
          {showWelcomeBanner && (
            <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 p-6 text-white shadow-xl shadow-red-600/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">🎉 Welcome to TRUECOLOURS</p>
                  <h2 className="mt-1 text-2xl font-black" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    Your account is ready, {displayName.split(" ")[0]}!
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/80">
                    Your profile is fully set up. Here's what you can do next:
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href="/catalogue"
                      className="rounded-xl bg-white/20 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/30"
                    >
                      Browse products →
                    </Link>
                    <button
                      onClick={() => { navigate("saved-colours"); setShowWelcomeBanner(false); }}
                      className="rounded-xl bg-white/20 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/30"
                    >
                      Save colour matches →
                    </button>
                    <button
                      onClick={() => { navigate("quotes"); setShowWelcomeBanner(false); }}
                      className="rounded-xl bg-white/20 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/30"
                    >
                      Request a quote →
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowWelcomeBanner(false)}
                  aria-label="Dismiss welcome banner"
                  className="shrink-0 rounded-xl p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}
          {error && <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
          {message && <p className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>}
          <DashboardContent section={activeSection} workspace={workspace} displayName={displayName} profile={profile} working={working} onAction={runAction} onNavigate={navigate} onDownloadQuote={downloadQuote} userId={user.uid} onSignOut={signOut} resetPassword={resetAccountPassword} />
        </div>
      </div>

      {/* ───── Mobile sidebar overlay ───── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[80] bg-gray-950/45 backdrop-blur-sm lg:hidden">
          <button aria-label="Close account navigation" className="absolute inset-0" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative h-full w-[280px] bg-gray-950 p-4 text-white shadow-2xl">
            <button onClick={() => setMobileMenuOpen(false)} className="absolute right-4 top-4 rounded-lg p-2 text-white/70"><X size={20} /></button>
            <Sidebar displayName={displayName} email={profile?.email || user.email || undefined} address={profile?.deliveryAddress} photoURL={profile?.photoURL || user.photoURL || undefined} active={activeSection} unread={unreadNotifications} onNavigate={navigate} onSignOut={signOut} />
          </aside>
        </div>
      )}
    </div>
  );
}

function Sidebar({ active, address, displayName, email, photoURL, unread, onNavigate, onSignOut }: { active: DashboardSection; address?: string; displayName: string; email?: string; photoURL?: string; unread: number; onNavigate: (section: DashboardSection) => void; onSignOut: () => Promise<unknown> }) {
  return <>
    {/* Logo + back to site */}
    <Link href="/" className="group block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
      <img
        src={siteConfig.images.logo}
        alt="TRUECOLOURS"
        className="h-8 w-auto object-contain brightness-0 invert"
        onError={(e) => {
          // Fallback to text logo if image fails
          e.currentTarget.style.display = "none";
          e.currentTarget.parentElement!.querySelector(".logo-text")!.classList.remove("hidden");
        }}
      />
      <span className="logo-text hidden">
        <span className="text-lg font-black tracking-tight">TRUE<span className="text-red-400">COLOURS</span></span>
      </span>
      <p className="mt-1 text-xs font-medium text-white/50">Automotive & industrial paints</p>
      <span className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40 transition group-hover:text-white/70">
        <ArrowLeft size={10} />
        Back to website
      </span>
    </Link>

    {/* User avatar + name */}
    <div className="mt-7 flex items-center gap-3 px-2">
      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-red-600 font-black text-white">
        {photoURL ? <img className="h-full w-full object-cover" alt="" src={photoURL} /> : displayName.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{displayName}</p>
        <p className="truncate text-xs text-white/45">{email || "Customer account"}</p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/35">{address || "Add a delivery address"}</p>
      </div>
    </div>

    {/* Navigation */}
    <nav className="mt-7 flex-1 space-y-5">
      {Array.from(new Set(navigation.map((item) => item.group))).map((group) => (
        <div key={group}>
          <p className="mb-1 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{group}</p>
          <div className="space-y-1">
            {navigation.filter((item) => item.group === group).map(({ id, icon: Icon, label }) => (
              <button key={`${id}-${label}`} onClick={() => onNavigate(id)} className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition ${active === id ? "bg-white text-gray-950 shadow-lg" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
                <Icon size={17} />{label}{id === "notifications" && unread > 0 && <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-[10px] text-white">{unread}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>

    {/* Sign out */}
    <button onClick={() => onSignOut()} className="mt-5 flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-red-200 transition hover:bg-red-600 hover:text-white"><X size={17} />Sign out</button>
  </>;
}

function DashboardContent({ displayName, onAction, onDownloadQuote, onNavigate, onSignOut, profile, resetPassword, section, userId, working, workspace }: { displayName: string; onAction: (action: () => Promise<unknown>, success: string) => Promise<void>; onDownloadQuote: (quote: CustomerQuote) => void; onNavigate: (section: DashboardSection) => void; onSignOut: () => Promise<unknown>; profile: ReturnType<typeof useAuth>["profile"]; resetPassword: ReturnType<typeof useAuth>["resetAccountPassword"]; section: DashboardSection; userId: string; working: boolean; workspace: CustomerWorkspace }) {
  if (section === "home") return <HomeSection displayName={displayName} workspace={workspace} onNavigate={onNavigate} />;
  if (section === "orders") return <OrdersSection orders={workspace.orders} />;
  if (section === "quotes") return <QuotesSection quotes={workspace.quotes} userId={userId} working={working} onAction={onAction} onDownload={onDownloadQuote} />;
  if (section === "cart") return <CartSection cart={workspace.cart} userId={userId} working={working} onAction={onAction} onNavigate={onNavigate} />;
  if (section === "messages") return <MessagesSection messages={workspace.messages} userId={userId} working={working} onAction={onAction} />;
  if (section === "notifications") return <NotificationsSection notifications={workspace.notifications} userId={userId} onAction={onAction} />;
  if (section === "wishlist") return <WishlistSection items={workspace.favourites} userId={userId} working={working} onAction={onAction} onNavigate={onNavigate} />;
  if (section === "saved-colours") return <ColoursSection colours={workspace.savedColours} userId={userId} working={working} onAction={onAction} />;
  if (section === "addresses") return <AddressesSection addresses={workspace.addresses} userId={userId} working={working} onAction={onAction} />;
  if (section === "settings") return <SettingsSection profile={profile} userId={userId} working={working} onAction={onAction} />;
  if (section === "security") return <SecuritySection email={profile?.email || ""} onReset={resetPassword} onSignOut={onSignOut} />;
  if (section === "support") return <SupportSection onNavigate={onNavigate} />;
  return <DownloadsSection invoices={workspace.invoices} quotes={workspace.quotes} onDownload={onDownloadQuote} />;
}

function CompactHome({ onNavigate, workspace }: { onNavigate: (section: DashboardSection) => void; workspace: CustomerWorkspace }) {
  const shortcuts = [
    { id: "quotes" as const, label: "Quotes", value: workspace.quotes.length, icon: FileText, text: "Request or review a quote" },
    { id: "orders" as const, label: "Orders", value: workspace.orders.length, icon: Package, text: "Track current orders" },
    { id: "saved-colours" as const, label: "Saved colours", value: workspace.savedColours.length, icon: Palette, text: "Keep paint codes nearby" },
    { id: "messages" as const, label: "Messages", value: workspace.messages.length, icon: MessageSquareText, text: "Talk to TRUECOLOURS" },
  ];

  return (
    <div>
      <div className="rounded-3xl bg-gradient-to-br from-[#101b55] via-[#17337d] to-[#2454ca] p-6 text-white shadow-xl shadow-blue-950/15">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">Account overview</p>
        <h2 className="mt-2 text-3xl font-black leading-none" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Everything essential, in one place.</h2>
        <p className="mt-3 text-sm leading-6 text-white/65">Manage only the details you need for catalogue enquiries, quotes and orders.</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
        {shortcuts.map(({ id, icon: Icon, label, text, value }) => (
          <button key={id} onClick={() => onNavigate(id)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
            <div className="flex items-center justify-between gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-800"><Icon size={17} /></span>
              <span className="text-2xl font-black text-slate-950">{value}</span>
            </div>
            <p className="mt-4 text-sm font-black text-slate-900">{label}</p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">{text}</p>
          </button>
        ))}
      </div>

      <button onClick={() => onNavigate("addresses")} className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/50">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-600"><MapPin size={18} /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-black text-slate-900">Delivery address</span><span className="block truncate text-xs text-slate-500">Add or update where orders should go</span></span>
        <ChevronRight size={17} className="text-slate-400" />
      </button>
    </div>
  );
}

function HomeSection({ displayName, onNavigate, workspace }: { displayName: string; onNavigate: (section: DashboardSection) => void; workspace: CustomerWorkspace }) {
  const stats = [{ label: "Active quotes", value: workspace.quotes.filter((item) => !["rejected", "accepted"].includes(item.status)).length, icon: FileText }, { label: "Orders", value: workspace.orders.length, icon: Package }, { label: "Wishlist", value: workspace.favourites.length, icon: Heart }, { label: "Saved colours", value: workspace.savedColours.length, icon: Palette }];
  return <><SectionTitle eyebrow="Customer dashboard" title={`Good to see you, ${displayName.split(" ")[0]}.`}><Link href="/catalogue" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gray-950 px-4 text-sm font-bold text-white transition hover:bg-gray-800">Browse catalogue <ChevronRight size={16} /></Link></SectionTitle><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon }, index) => <motion.button onClick={() => onNavigate(index === 0 ? "quotes" : index === 1 ? "orders" : index === 2 ? "wishlist" : "saved-colours")} whileHover={{ y: -3 }} key={label} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-lg"><Icon className="text-red-600" size={21} /><p className="mt-5 text-3xl font-black text-gray-950">{value}</p><p className="mt-1 text-sm font-semibold text-slate-500">{label}</p></motion.button>)}</div><div className="mt-7 grid gap-6 xl:grid-cols-[1.25fr_.75fr]"><section className="rounded-2xl border border-slate-200 p-6"><p className="text-xs font-bold uppercase tracking-[0.15em] text-red-600">Keep working</p><h3 className="mt-1 text-3xl font-black text-gray-950" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Everything for your next refinish job.</h3><div className="mt-6 grid gap-3 sm:grid-cols-2"><QuickAction icon={Palette} title="Save a colour code" text="Keep vehicle paint formulas organised." onClick={() => onNavigate("saved-colours")} /><QuickAction icon={FileText} title="Request a paint quote" text="Send specifications and damage photos." onClick={() => onNavigate("quotes")} /><QuickAction icon={MessageSquareText} title="Message the team" text="Ask for advice, stock or delivery help." onClick={() => onNavigate("messages")} /><QuickAction icon={MapPin} title="Delivery addresses" text="Make checkout quicker next time." onClick={() => onNavigate("addresses")} /></div></section><section className="rounded-2xl bg-gray-950 p-6 text-white"><Sparkles className="text-red-300" size={22} /><h3 className="mt-5 text-3xl font-black leading-none" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Need a precise colour match?</h3><p className="mt-3 text-sm leading-6 text-white/60">Upload your vehicle details or a panel image with a quote request and our colour specialists will help you find the right system.</p><button onClick={() => onNavigate("quotes")} className="mt-6 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold transition hover:bg-red-500">Request a quote</button></section></div></>;
}

function QuickAction({ icon: Icon, onClick, text, title }: { icon: typeof Palette; onClick: () => void; text: string; title: string }) { return <button onClick={onClick} className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-red-200 hover:bg-red-50"><Icon size={19} className="text-red-600" /><p className="mt-3 text-sm font-bold text-gray-900">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></button>; }

function OrdersSection({ orders }: { orders: CustomerWorkspace["orders"] }) { return <><SectionTitle eyebrow="Order history" title="Orders and delivery tracking" />{orders.length ? <div className="space-y-3">{orders.map((order) => <article key={order.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-gray-950">{order.orderNumber || `Order ${order.id.slice(0, 8)}`}</p><p className="mt-1 text-sm text-slate-500">Placed {formatDate(order.createdAt)} · {order.items?.length || 0} item(s)</p></div><div className="flex items-center gap-4"><p className="font-bold text-gray-950">{order.total ? `R ${order.total.toLocaleString("en-ZA")}` : "Price on request"}</p><span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClass(order.status)}`}>{order.status}</span></div></article>)}</div> : <EmptyState>Your orders will appear here after a collection or delivery order is placed.</EmptyState>}</>; }

function QuotesSection({ onAction, onDownload, quotes, userId, working }: { onAction: (action: () => Promise<unknown>, success: string) => Promise<void>; onDownload: (quote: CustomerQuote) => void; quotes: CustomerQuote[]; userId: string; working: boolean }) { async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const file = form.get("attachment"); await onAction(async () => { const attachmentUrl = file instanceof File && file.size ? await uploadCustomerFile(userId, file) : ""; await createQuoteRequest(userId, { title: String(form.get("title") || "Paint quote"), details: String(form.get("details") || ""), paintCode: String(form.get("paintCode") || ""), attachmentUrl }); event.currentTarget.reset(); }, "Your quote request has been sent to the TRUECOLOURS team."); } return <><SectionTitle eyebrow="Quotes" title="Request and manage quotes" /><div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><form onSubmit={submit} className="rounded-2xl border border-slate-200 p-5"><h3 className="text-xl font-black text-gray-950">New quote request</h3><p className="mt-1 text-sm leading-6 text-slate-500">Tell us about the product, paint system or colour match you need.</p><div className="mt-5 space-y-3"><input required name="title" className="account-input" placeholder="e.g. Toyota Corolla bumper repair" /><input name="paintCode" className="account-input" placeholder="Paint or colour code (optional)" /><textarea required name="details" rows={5} className="account-input resize-y" placeholder="Products, vehicle, surface or quantity required" /><label className="block rounded-xl border border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-600">Attach panel / damage image<input name="attachment" type="file" accept="image/*,.pdf" className="mt-2 block w-full text-xs" /></label><button disabled={working} className="account-primary">{working ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}Send quote request</button></div></form><div>{quotes.length ? <div className="space-y-3">{quotes.map((quote) => <article key={quote.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black text-gray-950">{quote.title}</p><p className="mt-1 text-sm text-slate-500">{quote.paintCode ? `Colour code: ${quote.paintCode}` : "No colour code supplied"} · {formatDate(quote.createdAt)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClass(quote.status)}`}>{quote.status}</span></div><p className="mt-4 text-sm leading-6 text-slate-600">{quote.details}</p><div className="mt-4 flex flex-wrap gap-2">{quote.attachmentUrl && <a href={quote.attachmentUrl} target="_blank" className="account-secondary">View attachment</a>}<button onClick={() => onDownload(quote)} className="account-secondary"><Download size={15} />Download request</button></div></article>)}</div> : <EmptyState>Your saved quote requests will show here.</EmptyState>}</div></div></>; }

function CartSection({ cart, onAction, onNavigate, userId, working }: { cart: CustomerWorkspace["cart"]; onAction: (action: () => Promise<unknown>, success: string) => Promise<void>; onNavigate: (section: DashboardSection) => void; userId: string; working: boolean }) { const count = cart.reduce((total, item) => total + item.quantity, 0); return <><SectionTitle eyebrow="Shopping cart" title="Your selected products"><Link href="/catalogue" className="account-secondary">Continue shopping</Link></SectionTitle>{cart.length ? <div className="space-y-3">{cart.map((item) => <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="grid h-14 w-14 place-items-center rounded-xl bg-slate-100 text-slate-500"><Package size={22} /></div><div className="min-w-0 flex-1"><p className="font-black text-gray-950">{item.name}</p><p className="mt-1 text-sm text-slate-500">{item.supplier || "TRUECOLOURS"} · {item.availability || "Availability confirmed on quote"}</p></div><div className="flex items-center gap-2"><button disabled={working} onClick={() => onAction(() => updateCustomerCartQuantity(userId, item.productId, item.quantity - 1), "Cart updated.")} className="account-counter">−</button><span className="w-7 text-center font-bold">{item.quantity}</span><button disabled={working} onClick={() => onAction(() => updateCustomerCartQuantity(userId, item.productId, item.quantity + 1), "Cart updated.")} className="account-counter">+</button></div><p className="min-w-28 text-right text-sm font-bold text-gray-950">{item.price || "Quote on request"}</p></article>)}</div> : <EmptyState>Your cart is empty. Add products from the catalogue to prepare a quote or order.</EmptyState>}<div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gray-950 p-5 text-white"><p className="font-bold">{count} item{count === 1 ? "" : "s"} ready to discuss.</p><button onClick={() => onNavigate("quotes")} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold transition hover:bg-red-500">Request a quote</button></div></>; }

function MessagesSection({ messages, onAction, userId, working }: { messages: CustomerWorkspace["messages"]; onAction: (action: () => Promise<unknown>, success: string) => Promise<void>; userId: string; working: boolean }) { async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const file = form.get("attachment"); await onAction(async () => { const attachmentUrl = file instanceof File && file.size ? await uploadCustomerFile(userId, file) : ""; await createCustomerMessage(userId, { subject: String(form.get("subject") || "Customer message"), body: String(form.get("body") || ""), attachmentUrl }); event.currentTarget.reset(); }, "Your message has been sent. The team will reply in this area."); } return <><SectionTitle eyebrow="Messages" title="Talk to TRUECOLOURS" /><div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><form onSubmit={submit} className="rounded-2xl border border-slate-200 p-5"><h3 className="font-black text-gray-950">Start a conversation</h3><div className="mt-4 space-y-3"><input required name="subject" className="account-input" placeholder="What can we help with?" /><textarea required name="body" rows={5} className="account-input resize-y" placeholder="Tell us what you need" /><input name="attachment" type="file" accept="image/*,.pdf" className="block w-full text-xs" /><button disabled={working} className="account-primary"><MessageSquareText size={16} />Send message</button></div></form><div className="space-y-3">{messages.length ? messages.map((message) => <article key={message.id} className={`rounded-2xl p-5 ${message.direction === "customer" ? "border border-red-100 bg-red-50" : "border border-slate-200 bg-white"}`}><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{message.direction === "customer" ? "You" : "TRUECOLOURS team"} · {formatDate(message.createdAt)}</p><p className="mt-2 font-black text-gray-950">{message.subject}</p><p className="mt-2 text-sm leading-6 text-slate-600">{message.body}</p>{message.attachmentUrl && <a target="_blank" href={message.attachmentUrl} className="mt-3 inline-flex text-sm font-bold text-red-600">Open attachment</a>}</article>) : <EmptyState>Messages and support replies will appear here.</EmptyState>}</div></div></>; }

function NotificationsSection({ notifications, onAction, userId }: { notifications: CustomerWorkspace["notifications"]; onAction: (action: () => Promise<unknown>, success: string) => Promise<void>; userId: string }) { return <><SectionTitle eyebrow="Notifications" title="Keep up to date" />{notifications.length ? <div className="space-y-3">{notifications.map((notification) => <button key={notification.id} onClick={() => !notification.read && onAction(() => markNotificationRead(userId, notification.id), "Notification marked as read.")} className={`block w-full rounded-2xl border p-5 text-left transition ${notification.read ? "border-slate-200 bg-white" : "border-red-100 bg-red-50"}`}><div className="flex items-center justify-between gap-3"><p className="font-black text-gray-950">{notification.title}</p>{!notification.read && <span className="h-2.5 w-2.5 rounded-full bg-red-600" />}</div><p className="mt-2 text-sm leading-6 text-slate-600">{notification.body}</p><p className="mt-2 text-xs font-semibold text-slate-400">{formatDate(notification.createdAt)}</p></button>)}</div> : <EmptyState>Quote, order, stock and account updates will arrive here in real time.</EmptyState>}</>; }

function WishlistSection({ items, onAction, onNavigate, userId, working }: { items: CustomerWorkspace["favourites"]; onAction: (action: () => Promise<unknown>, success: string) => Promise<void>; onNavigate: (section: DashboardSection) => void; userId: string; working: boolean }) { return <><SectionTitle eyebrow="Wishlist" title="Saved products"><Link href="/catalogue" className="account-secondary">Browse catalogue</Link></SectionTitle>{items.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-5"><Heart size={20} className="text-red-600" fill="currentColor" /><p className="mt-6 font-black text-gray-950">{item.name}</p><p className="mt-1 text-sm text-slate-500">{item.productCode || "Catalogue product"}</p><div className="mt-5 flex gap-2"><button disabled={working} onClick={() => onAction(() => addToCustomerCart(userId, { ...item, supplier: "TRUECOLOURS", availability: "Confirm availability", estimatedDelivery: "Confirmed with quote" }), "Added to your account cart.")} className="account-primary !min-h-10 !w-auto !px-3 text-xs">Add to cart</button><button disabled={working} onClick={() => onAction(() => removeCustomerSubcollectionItem(userId, "favourites", item.id), "Removed from wishlist.")} className="account-secondary !min-h-10 !px-3 text-xs">Remove</button></div></article>)}</div> : <EmptyState>Save products from the catalogue to find them again here.</EmptyState>}<button onClick={() => onNavigate("cart")} className="mt-6 text-sm font-bold text-red-600">Open account cart →</button></>; }

function ColoursSection({ colours, onAction, userId, working }: { colours: CustomerWorkspace["savedColours"]; onAction: (action: () => Promise<unknown>, success: string) => Promise<void>; userId: string; working: boolean }) { async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await onAction(async () => { await saveColour(userId, { code: String(form.get("code") || ""), vehicle: String(form.get("vehicle") || ""), colourName: String(form.get("colourName") || ""), notes: String(form.get("notes") || ""), manufacturer: "", paintSystem: "", mixFormula: "" }); event.currentTarget.reset(); }, "Colour code saved."); } return <><SectionTitle eyebrow="Colour library" title="Saved vehicle colours" /><div className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]"><form onSubmit={submit} className="rounded-2xl border border-slate-200 p-5"><h3 className="font-black text-gray-950">Save a new colour</h3><div className="mt-4 space-y-3"><input required name="code" className="account-input" placeholder="Paint code" /><input required name="vehicle" className="account-input" placeholder="Vehicle make, model and year" /><input name="colourName" className="account-input" placeholder="Colour name" /><textarea name="notes" rows={3} className="account-input resize-y" placeholder="Formula or matching notes" /><button disabled={working} className="account-primary"><Palette size={16} />Save colour</button></div></form><div className="grid gap-3 sm:grid-cols-2">{colours.length ? colours.map((colour) => <article key={colour.id} className="rounded-2xl border border-slate-200 p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500 text-white"><Palette size={18} /></span><p className="mt-5 text-xl font-black text-gray-950">{colour.code}</p><p className="mt-1 text-sm font-semibold text-slate-600">{colour.vehicle}</p><p className="mt-3 text-sm leading-6 text-slate-500">{colour.colourName}{colour.notes ? ` · ${colour.notes}` : ""}</p><button disabled={working} onClick={() => onAction(() => removeCustomerSubcollectionItem(userId, "savedColours", colour.id), "Colour removed.")} className="mt-4 text-xs font-bold text-red-600">Remove</button></article>) : <EmptyState>Store the codes and colour notes you use often.</EmptyState>}</div></div></>; }

function AddressesSection({ addresses, onAction, userId, working }: { addresses: CustomerWorkspace["addresses"]; onAction: (action: () => Promise<unknown>, success: string) => Promise<void>; userId: string; working: boolean }) { async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await onAction(async () => { await saveAddress(userId, { label: String(form.get("label") || "Delivery address"), recipient: String(form.get("recipient") || ""), phone: String(form.get("phone") || ""), address: String(form.get("address") || ""), isDefault: Boolean(form.get("isDefault")) }); event.currentTarget.reset(); }, "Delivery address saved."); } return <><SectionTitle eyebrow="Delivery details" title="Saved addresses" /><div className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]"><form onSubmit={submit} className="rounded-2xl border border-slate-200 p-5"><h3 className="font-black text-gray-950">Add delivery address</h3><div className="mt-4 space-y-3"><input required name="label" className="account-input" placeholder="Label, e.g. Workshop" /><input required name="recipient" className="account-input" placeholder="Recipient name" /><input required name="phone" className="account-input" placeholder="Mobile number" /><textarea required name="address" rows={4} className="account-input resize-y" placeholder="Street, suburb, city, province and postal code" /><label className="flex items-center gap-2 text-sm font-semibold text-slate-600"><input name="isDefault" type="checkbox" />Use as my default address</label><button disabled={working} className="account-primary"><MapPin size={16} />Save address</button></div></form><div className="grid gap-3 sm:grid-cols-2">{addresses.length ? addresses.map((address) => <article key={address.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex justify-between gap-2"><p className="font-black text-gray-950">{address.label}</p>{address.isDefault && <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold uppercase text-red-700">Default</span>}</div><p className="mt-3 text-sm font-semibold text-slate-700">{address.recipient}</p><p className="mt-1 text-sm text-slate-500">{address.phone}</p><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{address.address}</p><button disabled={working} onClick={() => onAction(() => removeCustomerSubcollectionItem(userId, "addresses", address.id), "Address removed.")} className="mt-4 text-xs font-bold text-red-600">Remove</button></article>) : <EmptyState>Save your delivery and collection details for faster ordering.</EmptyState>}</div></div></>; }

function SettingsSection({ onAction, profile, userId, working }: { onAction: (action: () => Promise<unknown>, success: string) => Promise<void>; profile: ReturnType<typeof useAuth>["profile"]; userId: string; working: boolean }) { async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await onAction(() => updateCustomerProfile(userId, { displayName: String(form.get("displayName") || ""), phone: String(form.get("phone") || ""), companyName: String(form.get("companyName") || ""), deliveryAddress: String(form.get("deliveryAddress") || "") }), "Account details updated."); } return <><SectionTitle eyebrow="Account settings" title="Your profile" /><form onSubmit={submit} className="max-w-3xl rounded-2xl border border-slate-200 p-6"><div className="flex items-center gap-4"><span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-slate-100 text-slate-500">{profile?.photoURL ? <img className="h-full w-full object-cover" alt="Profile" src={profile.photoURL} /> : <UserRound size={28} />}</span><div><p className="font-black text-gray-950">Profile image</p><p className="text-sm text-slate-500">Your Google avatar is used when available.</p></div></div><div className="mt-7 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-700">Full name<input required defaultValue={profile?.displayName} name="displayName" className="account-input mt-2" /></label><label className="text-sm font-bold text-slate-700">Email address<input disabled value={profile?.email || ""} className="account-input mt-2 cursor-not-allowed bg-slate-50" /></label><label className="text-sm font-bold text-slate-700">Mobile number<input defaultValue={profile?.phone} name="phone" className="account-input mt-2" /></label><label className="text-sm font-bold text-slate-700">Company name<input defaultValue={profile?.companyName} name="companyName" className="account-input mt-2" /></label><label className="sm:col-span-2 text-sm font-bold text-slate-700">Default delivery address<textarea defaultValue={profile?.deliveryAddress} name="deliveryAddress" rows={3} className="account-input mt-2 resize-y" /></label></div><button disabled={working} className="account-primary mt-6 !w-auto"><SlidersHorizontal size={16} />Save changes</button></form></>; }

function SecuritySection({ email, onReset, onSignOut }: { email: string; onReset: (email: string) => Promise<void>; onSignOut: () => Promise<unknown> }) { const [message, setMessage] = useState(""); return <><SectionTitle eyebrow="Security" title="Secure your account" /><div className="grid gap-4 md:grid-cols-2"><article className="rounded-2xl border border-slate-200 p-6"><ShieldCheck size={22} className="text-red-600" /><h3 className="mt-5 font-black text-gray-950">Password and access</h3><p className="mt-2 text-sm leading-6 text-slate-500">Firebase maintains your secure session. Use a reset link to choose a new password.</p><button onClick={async () => { await onReset(email); setMessage("Password reset link sent to your email."); }} className="account-secondary mt-5">Send reset link</button></article><article className="rounded-2xl border border-slate-200 p-6"><UserRound size={22} className="text-red-600" /><h3 className="mt-5 font-black text-gray-950">Signed-in devices</h3><p className="mt-2 text-sm leading-6 text-slate-500">Sign out here if you are using a shared or public device.</p><button onClick={() => onSignOut()} className="account-secondary mt-5">Sign out securely</button></article></div>{message && <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>}</>; }

function SupportSection({ onNavigate }: { onNavigate: (section: DashboardSection) => void }) { return <><SectionTitle eyebrow="Support" title="How can we help?" /><div className="grid gap-4 md:grid-cols-3"><SupportCard icon={MessageSquareText} title="Chat with us" text="Ask the team about availability, paint systems or delivery." action={() => onNavigate("messages")} /><SupportCard icon={FileText} title="Need a quote?" text="Tell us your vehicle, paint code and quantity required." action={() => onNavigate("quotes")} /><SupportCard icon={Car} title="Colour matching" text="Save your vehicle and paint reference for the next job." action={() => onNavigate("saved-colours")} /></div></>; }
function SupportCard({ action, icon: Icon, text, title }: { action: () => void; icon: typeof Car; text: string; title: string }) { return <button onClick={action} className="rounded-2xl border border-slate-200 p-6 text-left transition hover:-translate-y-1 hover:border-red-200 hover:shadow-lg"><Icon className="text-red-600" size={22} /><h3 className="mt-5 text-xl font-black text-gray-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p><span className="mt-5 inline-flex text-sm font-bold text-red-600">Open <ChevronRight size={17} /></span></button>; }
function DownloadsSection({ invoices, onDownload, quotes }: { invoices: CustomerWorkspace["invoices"]; onDownload: (quote: CustomerQuote) => void; quotes: CustomerQuote[] }) { const available = invoices.filter((invoice) => !["draft", "cancelled", "deleted"].includes(invoice.status)); return <><SectionTitle eyebrow="Documents" title="Invoices & downloads" />{quotes.length || available.length ? <div className="space-y-3">{available.map((invoice) => <article key={invoice.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-gray-950">Invoice · {invoice.invoiceNumber}</p><p className="mt-1 text-sm capitalize text-slate-500">{invoice.status.replaceAll("_", " ")} · {formatDate(invoice.issuedAt)} · {money(invoice.total)}</p><p className="mt-1 text-xs font-semibold text-slate-400">Balance {money(invoice.balanceDue ?? invoice.total)}</p></div>{invoice.shareToken ? <a className="account-primary !w-auto" href={`/invoice/${invoice.shareToken}`} target="_blank"><FileText size={15}/>View invoice</a> : <span className="text-sm font-bold text-slate-400">Preparing secure link</span>}</article>)}{quotes.map((quote) => <article key={quote.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-5"><div><p className="font-black text-gray-950">Quote request · {quote.title}</p><p className="mt-1 text-sm text-slate-500">{formatDate(quote.createdAt)}</p></div><button onClick={() => onDownload(quote)} className="account-secondary"><Download size={15} />Download</button></article>)}</div> : <EmptyState>Sent invoices and approved documents will appear here in real time.</EmptyState>}</>; }
function DashboardLoading() { return <div className="space-y-5 animate-pulse"><div className="h-9 w-64 rounded bg-slate-200" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 rounded-2xl bg-slate-100" />)}</div><div className="h-72 rounded-2xl bg-slate-100" /></div>; }
