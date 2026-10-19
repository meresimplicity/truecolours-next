"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/components/auth/StaffSessionProvider";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  CloudCog,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  hasPermission,
  normalizeBusinessRole,
  type BusinessRole,
  type Permission,
} from "@/lib/business/permissions";
import { clearOfflineSessionCaches } from "@/lib/offline/offline-db";
import { clearPrivateServiceWorkerCache } from "@/components/pwa/ServiceWorkerRegistration";
import { OfflineStatus } from "@/components/pwa/OfflineStatus";
import { signOutUser } from "@/lib/supabase/auth";

type NavItem = {
  href: string;
  icon: ComponentType<{ size?: number }>;
  label: string;
  permission: Permission;
};

const groups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Overview",
    items: [
      {
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        label: "Dashboard",
        permission: "dashboard.read",
      },
      {
        href: "/admin/accounts",
        icon: FileText,
        label: "Accounts & day-end",
        permission: "reports.read",
      },
      {
        href: "/admin/analytics",
        icon: BarChart3,
        label: "Analytics",
        permission: "reports.read",
      },
      {
        href: "/admin/activity",
        icon: Activity,
        label: "Activity log",
        permission: "audit.read",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/admin/pos",
        icon: Store,
        label: "Point of sale",
        permission: "pos.use",
      },
      {
        href: "/admin/stock-control",
        icon: Package,
        label: "Stock & slips",
        permission: "inventory.read",
      },
      {
        href: "/admin/inventory",
        icon: Package,
        label: "Inventory",
        permission: "inventory.read",
      },
      {
        href: "/admin/orders",
        icon: ShoppingCart,
        label: "Orders",
        permission: "sales.read",
      },
      {
        href: "/admin/customers",
        icon: UsersRound,
        label: "Customers",
        permission: "customers.read",
      },
      {
        href: "/admin/deliveries",
        icon: Truck,
        label: "Deliveries",
        permission: "sales.read",
      },
      {
        href: "/admin/invoices",
        icon: FileText,
        label: "Invoices",
        permission: "documents.read",
      },
    ],
  },
];

const utilityItems: NavItem[] = [
  {
    href: "/admin/offline",
    icon: CloudCog,
    label: "Connection",
    permission: "dashboard.read",
  },
  {
    href: "/admin/messages",
    icon: MessageSquareText,
    label: "Messages",
    permission: "customers.read",
  },
  {
    href: "/admin/settings",
    icon: Settings,
    label: "Settings",
    permission: "settings.manage",
  },
  {
    href: "/admin/help",
    icon: HelpCircle,
    label: "Help",
    permission: "dashboard.read",
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, developmentBypass, message, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; label: string; detail: string; href: string }>
  >([]);
  const [searchMessage, setSearchMessage] = useState("");
  useEffect(() => {
    if (!searchOpen || searchQuery.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchMessage("Searching…");
      try {
        const response = await fetch(
          `/api/admin/search?q=${encodeURIComponent(searchQuery)}`,
          { signal: controller.signal },
        );
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "Search unavailable");
        setSearchResults(body.results);
        setSearchMessage(body.results.length ? "" : "No matching records.");
      } catch (error) {
        if (!controller.signal.aborted)
          setSearchMessage(
            error instanceof Error ? error.message : "Search unavailable",
          );
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchOpen, searchQuery]);

  const authPage =
    pathname.startsWith("/admin/login") || pathname.startsWith("/admin/denied");

  const logOut = async () => {
    try {
      await Promise.allSettled([
        clearOfflineSessionCaches(),
        clearPrivateServiceWorkerCache(),
        signOutUser(),
      ]);
    } finally {
      router.replace("/admin/login");
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (authPage) return children;

  if (status === "unauthenticated" && developmentBypass)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6f7] px-4 text-slate-950">
        <section className="max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-xl">
          <h1 className="text-xl font-black">Local admin access unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600" role="alert">
            {message ||
              "Restart the local development server and check the configured admin account."}
          </p>
        </section>
      </main>
    );

  if (status === "unauthenticated")
    return (
      <main className="grid min-h-screen place-items-center">
        <Link
          href="/admin/login"
          className="rounded-xl bg-slate-950 px-6 py-3 font-bold text-white"
        >
          Sign in with an active staff account
        </Link>
      </main>
    );

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6f7] text-slate-950">
        <div className="size-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950" />
      </main>
    );
  }

  return (
    <div className="admin-shell min-h-screen bg-[#f5f6f7] text-[#111827] lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen lg:block">
        <Sidebar
          pathname={pathname}
          role={normalizeBusinessRole(session?.user?.role)}
          onNavigate={() => undefined}
        />
      </aside>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setMenuOpen(false)}
          >
            <motion.aside
              className="h-full w-[min(18rem,calc(100vw-3.25rem))] shadow-2xl shadow-black/60"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                aria-label="Close admin navigation"
                className="absolute right-2.5 top-2.5 z-10 grid size-11 place-items-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-black"
                onClick={() => setMenuOpen(false)}
              >
                <X size={19} />
              </button>
              <Sidebar
                pathname={pathname}
                role={normalizeBusinessRole(session?.user?.role)}
                onNavigate={() => setMenuOpen(false)}
              />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-2.5 shadow-sm shadow-slate-200/50 backdrop-blur-xl sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-label="Open admin navigation"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-800 lg:hidden"
                onClick={() => setMenuOpen(true)}
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">
                  Admin dashboard
                </p>
                <h1 className="truncate text-lg font-bold leading-tight sm:text-xl">
                  {pageTitle(pathname)}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="hidden items-center gap-2 text-xs font-bold md:flex">
                Branch
                <select
                  aria-label="Admin branch"
                  className="max-w-40 rounded-lg border border-slate-200 bg-white px-2 py-2"
                  defaultValue={
                    typeof window !== "undefined"
                      ? new URLSearchParams(window.location.search).get(
                          "locationId",
                        ) || session?.user.locationIds[0]
                      : session?.user.locationIds[0]
                  }
                  onChange={(event) => {
                    const url = new URL(window.location.href);
                    url.searchParams.set("locationId", event.target.value);
                    url.searchParams.delete("page");
                    window.location.href = url.toString();
                  }}
                >
                  {session?.user.locationIds.map((id) => (
                    <option key={id} value={id}>
                      {id.replaceAll("-", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <OfflineStatus compact className="px-2.5 sm:hidden" />
              <OfflineStatus className="hidden max-w-[18rem] sm:flex" />
              <button
                className="hidden min-h-11 min-w-64 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-sm font-semibold text-slate-500 xl:flex"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={17} />
                <span className="flex-1">Search admin data</span>
                <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px]">
                  ⌘K
                </kbd>
              </button>
              <span className="hidden rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 sm:inline-flex">
                {session?.user?.name || "Admin"}
              </span>
              {developmentBypass ? (
                <span className="rounded-full bg-amber-100 px-3 py-2 text-[11px] font-black text-amber-900">
                  Local build access
                </span>
              ) : (
                <button
                  aria-label="Log out"
                  className="grid size-11 place-items-center rounded-full bg-slate-950 text-white transition hover:bg-black"
                  onClick={() => void logOut()}
                >
                  <LogOut size={18} />
                </button>
              )}
            </div>
          </div>
        </header>
        <main className="min-h-[calc(100svh-4rem)] p-4 sm:p-5 lg:p-7">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </section>

      <AnimatePresence>
        {searchOpen ? (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/70 px-4 pt-[12vh] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl"
              initial={{ opacity: 0, y: -15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              onClick={(event) => event.stopPropagation()}
            >
              <label className="flex items-center gap-3 border-b border-slate-200 p-4">
                <Search className="text-slate-950" size={21} />
                <input
                  autoFocus
                  className="min-h-10 flex-1 bg-transparent text-base font-semibold text-slate-950 outline-none placeholder:text-slate-500"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setSearchResults([]);
                    setSearchMessage("");
                  }}
                  placeholder="Search products, orders or customers..."
                />
                <button
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-400"
                  onClick={() => setSearchOpen(false)}
                >
                  ESC
                </button>
              </label>
              <div
                className="max-h-[50vh] overflow-y-auto p-3"
                aria-live="polite"
              >
                {searchResults.map((result) => (
                  <Link
                    key={result.id}
                    href={result.href}
                    onClick={() => setSearchOpen(false)}
                    className="block rounded-lg p-3 hover:bg-slate-100"
                  >
                    <p className="text-sm font-bold">{result.label}</p>
                    <p className="text-xs text-slate-500">{result.detail}</p>
                  </Link>
                ))}
                <p className="px-3 py-2 text-sm text-slate-500">
                  {searchMessage ||
                    (!searchResults.length
                      ? "Enter at least two characters."
                      : "")}
                </p>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Sidebar({
  pathname,
  role,
  onNavigate,
}: {
  pathname: string;
  role: BusinessRole;
  onNavigate: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto border-r border-slate-200 bg-white px-3 py-3">
      <div className="px-2 pb-2 pr-12 pt-1 lg:pr-2">
        <div className="flex h-14 items-center overflow-hidden">
          <Image
            alt="TRUECOLOURS Automotive & Industrial Paints"
            className="h-full w-full object-contain object-left"
            height={240}
            priority
            src="/images/logo.png"
            width={800}
          />
        </div>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-[.15em] text-slate-500">
          Business administration
        </p>
      </div>
      <nav className="mt-4 space-y-4">
        {groups.map((group) => {
          const visibleItems = group.items.filter(
            (item) =>
              hasPermission(role, item.permission) &&
              (item.href !== "/admin/accounts" ||
                hasPermission(role, "sales.read")),
          );
          return visibleItems.length ? (
            <div key={group.label}>
              <p className="mb-1.5 px-2.5 text-[9px] font-bold uppercase tracking-[.16em] text-slate-400">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    item={item}
                    key={item.href}
                    pathname={pathname}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          ) : null;
        })}
      </nav>
      <div className="mt-4 space-y-0.5 border-t border-slate-200 pt-3">
        {utilityItems
          .filter((item) => hasPermission(role, item.permission))
          .map((item) => (
            <NavLink
              item={item}
              key={item.label}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
      </div>
      <p className="mt-auto px-2.5 pb-1 pt-6 text-[9px] font-bold uppercase tracking-[.15em] text-slate-400">
        Supabase workspace
      </p>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition duration-200 ${active ? "bg-slate-100 text-slate-950" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
    >
      <Icon size={18} />
      {item.label}
    </Link>
  );
}

function pageTitle(pathname: string) {
  if (pathname === "/admin/invoices/new") return "New invoice";
  if (/^\/admin\/invoices\/[^/]+$/.test(pathname)) return "Edit invoice";
  const item = [
    ...groups.flatMap((group) => group.items),
    ...utilityItems,
  ].find((entry) => entry.href === pathname);
  return item?.label || "TRUECOLOURS Admin";
}
