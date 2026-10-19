"use client";

import { buildColourContactLink } from "@/lib/whatsapp";
import Image from "next/image";
import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Filter,
  MessageCircle,
  Minus,
  PackageSearch,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  catalogueCategories,
  catalogueDisclaimers,
  catalogueFilters,
  catalogueProducts,
  type CatalogueCategory,
  type CatalogueFilter,
  type CatalogueProduct,
} from "@/data/catalogue";
import {
  getCatalogueProductImage,
  getCatalogueProductImageAlt,
  getCatalogueProductImages,
} from "@/data/catalogueImageResolver";
import { ProductImage } from "@/components/catalogue/ProductImage";
import { siteConfig } from "@/config/site";
import { marketResearchDisclaimer } from "@/data/marketResearch";
import { AccountAccess } from "@/components/auth/AccountAccess";
import { CustomerDashboard } from "@/components/account/CustomerDashboard";
import { useAuth } from "@/components/auth/AuthProvider";
import { normalizeCategoryKey, resolveRequestedCategory } from "@/lib/catalogueNavigation";
import { createCatalogueSearchIndex, searchCatalogue } from "@/lib/catalogueSearch";
import { addToCustomerCart, loadCustomerWorkspace, updateCustomerCartQuantity } from "@/lib/customer-data";
import { watchProducts } from "@/lib/services/product-service";
import type { ProductStockStatus } from "@/lib/types/product";
import { useModalFocus } from "@/lib/hooks/useModalFocus";

type Product = CatalogueProduct & {
  stockStatus?: ProductStockStatus;
  stockQuantity?: number;
  visible?: boolean;
};
type CartItem = {
  id: string;
  name: string;
  category?: string;
  supplier?: string;
  brand?: string;
  image?: string;
  isNewArrival?: boolean;
  quantity: number;
};

const ALL = "All";
const CART_STORAGE_KEY = "truecolours-enquiry-cart";
const PRODUCT_BATCH_SIZE = 12;
const PRIORITY_IMAGE_COUNT = 4;
const specificationAccents = [
  "bg-neutral-100 text-neutral-700",
  "bg-blue-100 text-neutral-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
];
const applicationBadgeStyles = [
  "bg-neutral-100 text-red-800 ring-neutral-300",
  "bg-neutral-100 text-blue-800 ring-blue-200",
  "bg-amber-50 text-amber-800 ring-amber-200",
  "bg-emerald-50 text-emerald-800 ring-emerald-200",
  "bg-violet-50 text-violet-800 ring-violet-200",
];


function unique(values: string[]) {
  return Array.from(new Set(values)).filter(Boolean).sort();
}

function uniqueImages(values: (string | undefined)[]) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function matchesProductCategory(product: Product, selectedCategory: string): boolean {
  if (selectedCategory === ALL) return true;
  if (product.category === selectedCategory) return true;
  if (product.filter === selectedCategory) return true;
  if (product.subcategory === selectedCategory) return true;

  const normSelected = normalizeCategoryKey(selectedCategory);
  if (normalizeCategoryKey(product.category) === normSelected) return true;
  if (normalizeCategoryKey(product.filter) === normSelected) return true;
  if (normalizeCategoryKey(product.subcategory) === normSelected) return true;

  return false;
}

const catalogueSupplierValues = new Set(catalogueProducts.map((product) => product.supplier));

function productLabel(product: Product) {
  return [
    product.name,
    product.code ? `code ${product.code}` : null,
    product.size ? product.size : null,
    product.colour ? product.colour : null,
  ]
    .filter(Boolean)
    .join(" - ");
}

function cartItemMessageLines(item: CartItem, index: number) {
  const lines = [
    `${index + 1}. ${item.name}`,
    `Quantity: ${item.quantity}`,
    `Category: ${item.category || "Catalogue product"}`,
    `Supplier: ${item.supplier || "TRUECOLOURS"}`,
  ];

  if (item.brand) {
    lines.push(`Brand: ${item.brand}`);
  }

  lines.push("");
  return lines;
}

function useMobileDrawerMotion() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export default function CatalogueClient() {
  const { loading: authLoading, user } = useAuth();
  const [query, updateQuery] = useState("");
  const [category, updateCategory] = useState(ALL);
  const [supplier, updateSupplier] = useState(ALL);
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [cartHydratedForUser, setCartHydratedForUser] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [accountView, setAccountView] = useState<"login" | "dashboard" | null>(null);
  const accountDialogRef = useRef<HTMLElement>(null);
  const [visibleProductCount, setVisibleProductCount] = useState(PRODUCT_BATCH_SIZE);
  const [searchStateReady, setSearchStateReady] = useState(false);
  const [managedProducts, setManagedProducts] = useState<Record<string, { stockStatus?: ProductStockStatus; stockQuantity?: number; visible?: boolean }>>({});
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const pendingProductRef = useRef<Product | null>(null);
  const openedDeepLinkRef = useRef<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const setQuery = useCallback((value: string) => { updateQuery(value); setVisibleProductCount(PRODUCT_BATCH_SIZE); }, []);
  const setCategory = useCallback((value: string) => { updateCategory(value); setVisibleProductCount(PRODUCT_BATCH_SIZE); }, []);
  const setSupplier = useCallback((value: string) => { updateSupplier(value); setVisibleProductCount(PRODUCT_BATCH_SIZE); }, []);


  useEffect(() => {
    try {
      return watchProducts((products) => {
        setManagedProducts(Object.fromEntries(products.map((product) => [product.id, {
          stockStatus: product.stockStatus,
          stockQuantity: Number((product as unknown as { stockQuantity?: number }).stockQuantity || 0),
          visible: product.visible,
        }])));
      }, 500);
    } catch {
      return undefined;
    }
  }, []);

  const liveCatalogueProducts = useMemo<Product[]>(() => catalogueProducts
    .map((product) => ({ ...product, ...(managedProducts[product.id] || {}) }))
    .filter((product) => product.visible !== false), [managedProducts]);
  const catalogueSearchIndex = useMemo(() => createCatalogueSearchIndex(liveCatalogueProducts), [liveCatalogueProducts]);

  useEffect(() => {
    const readSearchState = () => {
      const params = new URLSearchParams(window.location.search);
      const requestedCategory = params.get("category") || params.get("filter");
      const requestedSupplier = params.get("supplier");

      setQuery(params.get("search") ?? "");
      setCategory(resolveRequestedCategory(requestedCategory));
      setSupplier(
        requestedSupplier && catalogueSupplierValues.has(requestedSupplier)
          ? requestedSupplier
          : ALL
      );
      setSearchStateReady(true);
    };

    readSearchState();
    window.addEventListener("popstate", readSearchState);
    return () => window.removeEventListener("popstate", readSearchState);
  }, [setQuery, setCategory, setSupplier]);

  useEffect(() => {
    if (!searchStateReady) return;

    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);

      if (query.trim()) url.searchParams.set("search", query.trim());
      else url.searchParams.delete("search");

      if (category !== ALL) url.searchParams.set("category", category);
      else url.searchParams.delete("category");

      if (supplier !== ALL) url.searchParams.set("supplier", supplier);
      else url.searchParams.delete("supplier");

      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`
      );
    }, 180);

    return () => window.clearTimeout(timer);
  }, [category, query, searchStateReady, supplier]);

  useEffect(() => {
    const updateAccountView = () => {
      const requestedView = new URLSearchParams(window.location.search).get("account");
      setAccountView(requestedView === "login" || requestedView === "dashboard" ? requestedView : null);
    };

    updateAccountView();
    window.addEventListener("popstate", updateAccountView);
    return () => window.removeEventListener("popstate", updateAccountView);
  }, []);

  const closeAccountWorkspace = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("account");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    if (!user) pendingProductRef.current = null;
    setAccountView(null);
  };
  useModalFocus(accountView !== null, accountDialogRef, closeAccountWorkspace);

  const openAccountWorkspace = (view: "login" | "dashboard") => {
    const url = new URL(window.location.href);
    url.searchParams.set("account", view);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setAccountView(view);
  };

  const openCart = () => {
    if (!authLoading && !user) {
      openAccountWorkspace("login");
      return;
    }
    if (!authLoading) setCartOpen(true);
  };

  const categories = useMemo(
    () => [ALL, ...unique(liveCatalogueProducts.map((product) => product.category))],
    [liveCatalogueProducts]
  );

  const suppliers = useMemo(
    () => [ALL, ...unique(liveCatalogueProducts.map((product) => product.supplier))],
    [liveCatalogueProducts]
  );

  const categoryMeta = useMemo(() => {
    return new Map(catalogueCategories.map((item) => [item.title, item]));
  }, []);

  const specificCollections = useMemo(
    () => unique(liveCatalogueProducts.map((product) => product.category)),
    [liveCatalogueProducts]
  );

  const queryMatchedProducts = useMemo(
    () => searchCatalogue(catalogueSearchIndex, deferredQuery),
    [catalogueSearchIndex, deferredQuery]
  );

  const filteredProducts = useMemo(() => {
    return queryMatchedProducts.filter((product) => {
      const matchesCategory = matchesProductCategory(product, category);
      const matchesSupplier = supplier === ALL || product.supplier === supplier;

      return matchesCategory && matchesSupplier;
    });
  }, [category, queryMatchedProducts, supplier]);

  const departmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const availableProducts = queryMatchedProducts.filter(
      (product) => supplier === ALL || product.supplier === supplier
    );

    counts.set(ALL, availableProducts.length);
    catalogueFilters.forEach((filterName) => {
      if (filterName === ALL) return;
      const count = availableProducts.filter((p) => matchesProductCategory(p, filterName)).length;
      counts.set(filterName, count);
    });
    return counts;
  }, [queryMatchedProducts, supplier]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const availableProducts = queryMatchedProducts.filter(
      (product) => supplier === ALL || product.supplier === supplier
    );

    counts.set(ALL, availableProducts.length);
    catalogueCategories.forEach((cat) => {
      const count = availableProducts.filter((p) => matchesProductCategory(p, cat.title)).length;
      counts.set(cat.title, count);
    });
    return counts;
  }, [queryMatchedProducts, supplier]);

  const supplierCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const availableProducts = queryMatchedProducts.filter((product) =>
      matchesProductCategory(product, category)
    );

    counts.set(ALL, availableProducts.length);
    availableProducts.forEach((product) => {
      counts.set(product.supplier, (counts.get(product.supplier) ?? 0) + 1);
    });
    return counts;
  }, [category, queryMatchedProducts]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleProductCount),
    [filteredProducts, visibleProductCount]
  );

  const visibleProductIndexById = useMemo(() => {
    return new Map(visibleProducts.map((product, index) => [product.id, index]));
  }, [visibleProducts]);

  const groupedProducts = useMemo(() => {
    return visibleProducts.reduce<Record<string, Product[]>>((groups, product) => {
      groups[product.category] = groups[product.category] ?? [];
      groups[product.category].push(product);
      return groups;
    }, {});
  }, [visibleProducts]);

  useEffect(() => {
    if (!searchStateReady) return;
    const requestedId = new URLSearchParams(window.location.search).get("product");
    if (requestedId && requestedId !== openedDeepLinkRef.current && liveCatalogueProducts.some((product) => product.id === requestedId)) {
      openedDeepLinkRef.current = requestedId;
      const index = filteredProducts.findIndex((product) => product.id === requestedId);
      queueMicrotask(() => {
        if (index >= 0) setVisibleProductCount((count) => Math.max(count, index + 1));
        setOpenProductId(requestedId);
      });
    }
  }, [searchStateReady, liveCatalogueProducts, filteredProducts]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    // Storage and the remote workspace belong to the current identity. Ignore
    // late responses when a customer signs out or switches accounts.
    queueMicrotask(async () => {
      if (cancelled) return;
      setCartHydratedForUser(null);
      setCartItems([]);
      if (!user) { setCartReady(true); return; }
      setCartReady(false);
      let savedItems: CartItem[] = [];
      try {
        const stored = window.localStorage.getItem(`${CART_STORAGE_KEY}:${user.uid}`);
        const parsed: unknown = stored ? JSON.parse(stored) : [];
        if (Array.isArray(parsed)) {
          savedItems = parsed.filter((item) => typeof item?.id === "string" && typeof item?.name === "string")
            .map((item) => ({ ...item, quantity: Number.isFinite(Number(item.quantity)) ? Math.max(1, Math.floor(Number(item.quantity))) : 1 }));
        }
      } catch {
        // Browsing and enquiries still work when local storage is unavailable.
      }
      if (cancelled) return;
      setCartItems(savedItems);
      setCartHydratedForUser(user.uid);
      setCartReady(true);
      try {
        const workspace = await loadCustomerWorkspace(user.uid);
        if (!cancelled && workspace.cart.length) {
          setCartItems(workspace.cart.map((item) => ({ id: item.productId, name: item.name, supplier: item.supplier, image: item.image, quantity: Math.max(1, Number(item.quantity) || 1) })));
        }
      } catch {
        // Keep the customer's cached enquiry available while offline.
      }
    });
    return () => { cancelled = true; };
  }, [authLoading, user]);

  useEffect(() => {
    if (!cartReady || !user || cartHydratedForUser !== user.uid) return;
    try {
      window.localStorage.setItem(`${CART_STORAGE_KEY}:${user.uid}`, JSON.stringify(cartItems));
    } catch {
      // Private browsing or a full quota must not crash the catalogue.
    }
  }, [cartHydratedForUser, cartItems, cartReady, user]);

  const cartQuantities = useMemo(() => {
    return cartItems.reduce<Record<string, number>>((quantities, item) => {
      quantities[item.id] = item.quantity;
      return quantities;
    }, {});
  }, [cartItems]);

  const totalSelectedProducts = cartItems.length;
  const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);

  const whatsappText =
    cartItems.length > 0
      ? [
          "Hi TRUECOLOURS, I would like to enquire about these products:",
          "",
          ...cartItems.flatMap(cartItemMessageLines),
          "Please confirm current stock and pricing.",
        ].join("\n")
      : "Hi TRUECOLOURS, I want to ask about a catalogue product. I can send the product name, code, picture, or job requirement.";

  const whatsappUrl = buildColourContactLink(whatsappText);

  const addAuthenticatedProduct = (product: Product) => {
    const image = getCatalogueProductImage(product);

    setCartItems((current) => {
      const existingItem = current.find((item) => item.id === product.id);

      if (existingItem) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1, image } : item
        );
      }

      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          category: product.category,
          supplier: product.supplier,
          brand: product.brand,
          image,
          isNewArrival: product.isNewArrival,
          quantity: 1,
        },
      ];
    });

    if (user) {
      void addToCustomerCart(user.uid, {
        productId: product.id,
        name: product.name,
        productCode: product.code || product.id,
        image,
        supplier: product.supplier,
        availability: product.stockStatus || "Confirm availability",
        estimatedDelivery: "Confirmed with quote",
        price: product.price,
      }).catch(() => undefined);
    }

    setRecentlyAddedId(product.id);
    window.setTimeout(() => {
      setRecentlyAddedId((current) => (current === product.id ? null : current));
    }, 1200);
  };

  const addToCart = (product: Product) => {
    if (!authLoading && !user) {
      pendingProductRef.current = product;
      openAccountWorkspace("login");
      return;
    }

    if (authLoading) return;
    addAuthenticatedProduct(product);
  };

  useEffect(() => {
    if (!user || !pendingProductRef.current) return;
    const pendingProduct = pendingProductRef.current;
    pendingProductRef.current = null;
    addAuthenticatedProduct(pendingProduct);
  }, [user]);

  const removeFromCart = (productId: string) => {
    setCartItems((current) => current.filter((item) => item.id !== productId));
    if (user) void updateCustomerCartQuantity(user.uid, productId, 0).catch(() => undefined);
  };

  const increaseQuantity = (productId: string) => {
    const nextQuantity = (cartItems.find((item) => item.id === productId)?.quantity || 0) + 1;
    setCartItems((current) =>
      current.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
    if (user) void updateCustomerCartQuantity(user.uid, productId, nextQuantity).catch(() => undefined);
  };

  const decreaseQuantity = (productId: string) => {
    const nextQuantity = Math.max(1, (cartItems.find((item) => item.id === productId)?.quantity || 1) - 1);
    setCartItems((current) =>
      current.map((item) =>
        item.id === productId ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item
      )
    );
    if (user) void updateCustomerCartQuantity(user.uid, productId, nextQuantity).catch(() => undefined);
  };

  const clearCart = () => {
    if (user) cartItems.forEach((item) => void updateCustomerCartQuantity(user.uid, item.id, 0).catch(() => undefined));
    setCartItems([]);
  };

  const clearFilters = () => {
    setQuery("");
    setCategory(ALL);
    setSupplier(ALL);
  };

  const categoryAccent = (item: string) => categoryMeta.get(item)?.accent ?? "#111827";
  const hasActiveFilters = query.trim().length > 0 || category !== ALL || supplier !== ALL;
  const visibleGroupCount = Object.keys(groupedProducts).length;
  const hasMoreProducts = visibleProducts.length < filteredProducts.length;
  const remainingProducts = Math.max(0, filteredProducts.length - visibleProducts.length);
  const loadMoreProducts = () => {
    setVisibleProductCount((current) =>
      Math.min(current + PRODUCT_BATCH_SIZE, filteredProducts.length)
    );
  };

  useEffect(() => {
    if (!hasMoreProducts) return;

    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleProductCount((current) =>
            Math.min(current + PRODUCT_BATCH_SIZE, filteredProducts.length)
          );
        }
      },
      {
        rootMargin: "180px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [filteredProducts.length, hasMoreProducts, visibleProducts.length]);

  return (
    <div className="tc-catalogue bg-white text-gray-950">
      <section className="tc-page-hero" aria-labelledby="catalogue-title"><p className="tc-eyebrow">Paint. Prep. Protect. Finish.</p><h1 id="catalogue-title">Products for<br/><span>your next project.</span></h1><p>Search the paint systems, preparation materials and workshop supplies available through TRUECOLOURS.</p></section>

      <section className="sticky top-20 z-30 border-b border-gray-200 bg-white/92 px-4 py-4 shadow-sm backdrop-blur-xl lg:top-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search the TRUECOLOURS catalogue"
                autoComplete="off"
                spellCheck={false}
                placeholder="Search products, codes, suppliers, sizes or job type..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-11 text-sm font-semibold text-gray-900 outline-none transition focus:border-neutral-900 focus:bg-white focus:ring-4 focus:ring-neutral-200"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear catalogue search"
                  className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-gray-400 transition hover:bg-white hover:text-gray-900"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen((current) => !current)}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 lg:hidden"
            >
              <SlidersHorizontal size={16} />
              Filters
              <ChevronDown
                size={16}
                className={`transition ${mobileFiltersOpen ? "rotate-180" : ""}`}
              />
            </button>

            <div
              className={`grid gap-3 lg:flex lg:items-center ${
                mobileFiltersOpen ? "grid" : "hidden lg:flex"
              }`}
            >
              <select
                aria-label="Product category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none transition focus:border-neutral-900 focus:ring-4 focus:ring-neutral-200"
              >
                <optgroup label="Departments">
                  {catalogueFilters.map((filterName) => (
                    <option key={filterName} value={filterName}>
                      {filterName === ALL ? "All Categories" : filterName} ({departmentCounts.get(filterName) ?? 0})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Specific Collections">
                  {specificCollections.map((collection) => (
                    <option key={collection} value={collection}>
                      {collection} ({categoryCounts.get(collection) ?? 0})
                    </option>
                  ))}
                </optgroup>
              </select>

              <select
                aria-label="Product supplier"
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none transition focus:border-neutral-900 focus:ring-4 focus:ring-neutral-200"
              >
                {suppliers.map((item) => (
                  <option key={item} value={item}>
                    {item === ALL ? "All suppliers" : item} ({supplierCounts.get(item) ?? 0})
                  </option>
                ))}
              </select>

              <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-950 px-4 py-3 text-sm font-semibold text-white">
                <PackageSearch size={16} />
                {filteredProducts.length} of {liveCatalogueProducts.length}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100"
                >
                  <X size={15} />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick Department Filter Pills Bar */}
          <div className="mt-3.5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {catalogueFilters.map((filterName) => {
              const active = category === filterName || (filterName === ALL && category === ALL);
              const count = departmentCounts.get(filterName) ?? 0;
              return (
                <button
                  key={filterName}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(filterName)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                    active
                      ? "bg-[#202328] text-white shadow-sm ring-2 ring-blue-600/20"
                      : "border border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-white"
                  }`}
                >
                  <span>{filterName === ALL ? "All Products" : filterName}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      active ? "bg-white/20 text-white" : "bg-gray-200/80 text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section id="catalogue-products" className="bg-gray-50 px-4 py-10 md:py-14 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-7 lg:grid-cols-[300px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-36 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg shadow-gray-200/50">
              <div className="border-b border-gray-100 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
                  <Filter size={16} className="text-neutral-600" />
                  Browse Catalogue
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-500">
                  Filter the product reference by TRUECOLOURS supply section.
                </p>
              </div>

              <div className="max-h-[62vh] space-y-4 overflow-y-auto p-3.5">
                {/* Department Groups */}
                <div>
                  <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Product Departments
                  </div>
                  <div className="space-y-1">
                    {catalogueFilters.map((filterName) => {
                      const active = category === filterName || (filterName === ALL && category === ALL);
                      const count = departmentCounts.get(filterName) ?? 0;
                      return (
                        <button
                          key={filterName}
                          type="button"
                          aria-pressed={active}
                  onClick={() => setCategory(filterName)}
                          className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                            active
                              ? "bg-[#202328] text-white shadow-sm"
                              : "text-gray-700 hover:bg-gray-100 hover:text-gray-950"
                          }`}
                        >
                          <span>{filterName === ALL ? "All Categories" : filterName}</span>
                          <span
                            className={`rounded-lg px-2 py-0.5 text-[10px] ${
                              active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Specific Product Ranges */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Specific Collections
                  </div>
                  <div className="space-y-1">
                    {specificCollections.map((collection) => {
                      const meta = categoryMeta.get(collection);
                      const active = category === collection;
                      const count = categoryCounts.get(collection) ?? 0;
                      return (
                        <button
                          key={collection}
                          type="button"
                          onClick={() => setCategory(collection)}
                          className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-left text-xs font-semibold transition ${
                            active
                              ? "text-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
                          }`}
                          style={active ? { backgroundColor: "#202328" } : undefined}
                        >
                          <span className="truncate">{collection}</span>
                          <span
                            className={`shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] ${
                              active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 p-4">
                <div className="rounded-xl bg-neutral-100 p-4">
                  <div className="text-sm font-semibold text-neutral-700">Market prices</div>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-700/70">
                    Verified retail references are shown where a current exact or matching listing is available.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div>
            {totalSelectedProducts > 0 && (
              <div className="mb-6 overflow-hidden rounded-2xl border border-red-100 bg-white shadow-none">
                <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <h2
                      className="text-3xl font-semibold leading-none text-gray-950"
                      style={{ fontFamily: "var(--font-public-sans)", letterSpacing: "0" }}
                    >
                      My Product Enquiry
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {totalSelectedProducts} products selected, {totalQuantity} total quantity.
                      Prices and stock will be confirmed by TRUECOLOURS.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={openCart}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                    >
                      <ShoppingCart size={16} />
                      Review Cart
                    </button>

                    <a
                      href={whatsappUrl}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
                    >
                      <MessageCircle size={16} />
                      Send WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-1.5 w-10 rounded-full bg-neutral-950" />
                  <span className="text-sm font-bold uppercase tracking-widest text-neutral-700">
                    Product Index
                  </span>
                </div>

                <h2
                  className="text-4xl font-semibold leading-none text-gray-950 md:text-5xl"
                  style={{ fontFamily: "var(--font-public-sans)", letterSpacing: "0" }}
                >
                  Searchable supplier references
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Showing {visibleProducts.length} of {filteredProducts.length} products across{" "}
                  {visibleGroupCount} grouped sections.
                </p>
              </div>

              <button
                type="button"
                onClick={openCart}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-200 transition hover:bg-gray-800"
              >
                <ShoppingCart size={17} />
                My Enquiry
                {totalSelectedProducts > 0 && (
                  <span className="rounded-lg bg-neutral-950 px-2 py-0.5 text-xs text-white">
                    {totalSelectedProducts}
                  </span>
                )}
              </button>
            </div>

            <div className="space-y-5">
              {Object.entries(groupedProducts).map(([groupName, products]) => (
                <CatalogueGroup
                  key={groupName}
                  groupName={groupName}
                  meta={categoryMeta.get(groupName)}
                  products={products}
                  openProductId={openProductId}
                  setOpenProductId={setOpenProductId}
                  cartQuantities={cartQuantities}
                  recentlyAddedId={recentlyAddedId}
                  addToCart={addToCart}
                  requiresLogin={!user}
                  visibleProductIndexById={visibleProductIndexById}
                />
              ))}
            </div>

            {hasMoreProducts && (
              <div ref={loadMoreSentinelRef} className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={loadMoreProducts}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-200 transition hover:bg-gray-800 active:scale-95"
                >
                  <Plus size={16} />
                  Load More
                  <span className="rounded-lg bg-white/12 px-2 py-0.5 text-xs text-white/80">
                    {Math.min(PRODUCT_BATCH_SIZE, remainingProducts)} next
                  </span>
                </button>
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-lg shadow-gray-200/50">
                <PackageSearch size={42} className="mx-auto mb-3 text-gray-300" />
                <h3
                  className="text-3xl font-semibold text-gray-950"
                  style={{ fontFamily: "var(--font-public-sans)", letterSpacing: "0" }}
                >
                  No products found
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Try a simpler word like paint, thinner, masking, filler, pad, gun or primer.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 px-4 pb-16 pt-2 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gray-950 p-6 text-white shadow-lg md:p-8">
          <Image
            src="/images/products/product-banner.webp"
            alt="TRUECOLOURS product range"
            fill
            sizes="(max-width: 1024px) 100vw, 1280px"
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/88 to-gray-950/55" />

          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <h2
                className="text-4xl font-semibold leading-none md:text-5xl"
                style={{ fontFamily: "var(--font-public-sans)", letterSpacing: "0" }}
              >
                Looking for a specific product?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/66">
                Send us the product name, supplier brand, product code, picture, catalogue page or
                the job you are doing. TRUECOLOURS will help confirm the correct product, current
                stock and pricing.
              </p>
            </div>

            <div>
              <a
                href={whatsappUrl}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                <MessageCircle size={18} />
                WhatsApp Product Enquiry
              </a>

              <div className="mt-4 space-y-2">
                {catalogueDisclaimers.map((line) => (
                  <div key={line} className="flex gap-2 text-xs leading-relaxed text-white/58">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-300" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {totalSelectedProducts > 0 && (
        <FloatingEnquiryButton
          totalSelectedProducts={totalSelectedProducts}
          totalQuantity={totalQuantity}
          onOpen={openCart}
        />
      )}

      <CartDrawer
        open={cartOpen}
        cartItems={cartItems}
        totalSelectedProducts={totalSelectedProducts}
        totalQuantity={totalQuantity}
        whatsappUrl={whatsappUrl}
        onClose={() => setCartOpen(false)}
        onIncrease={increaseQuantity}
        onDecrease={decreaseQuantity}
        onRemove={removeFromCart}
        onClear={clearCart}
      />
      {typeof document !== "undefined" && createPortal(<AnimatePresence>
        {accountView && (
          <>
            <motion.button
              type="button"
              aria-label="Close account workspace"
              className="fixed inset-0 z-[80] cursor-default bg-slate-950/45 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAccountWorkspace}
            />
            <motion.aside
              ref={accountDialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="TRUECOLOURS account workspace"
              initial={{ opacity: 0, x: 72 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 72 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 right-0 z-[81] flex w-full max-w-[560px] flex-col overflow-hidden bg-white shadow-lg sm:w-[94vw]"
            >
              <div className="absolute right-3 top-3 z-[60]">
                <button type="button" onClick={closeAccountWorkspace} className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200" aria-label="Close account workspace">
                  <X size={20} />
                </button>
              </div>
              {accountView === "login" ? (
                <div className="h-full overflow-y-auto pt-10">
                  <AccountAccess compact onAuthenticated={closeAccountWorkspace} />
                </div>
              ) : (
                <Suspense fallback={<AccountWorkspaceLoading />}>
                  <CustomerDashboard embedded />
                </Suspense>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
}

function AccountWorkspaceLoading() {
  return <div className="flex h-full items-center justify-center gap-3 text-sm font-bold text-slate-500"><UserRound className="animate-pulse" size={22} />Opening your account…</div>;
}

function FloatingEnquiryButton({
  totalSelectedProducts,
  totalQuantity,
  onOpen,
}: {
  totalSelectedProducts: number;
  totalQuantity: number;
  onOpen: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="fixed bottom-24 right-5 z-50 inline-flex items-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-950/25 transition hover:bg-gray-800 md:bottom-6 md:right-24"
      aria-label={`Open product enquiry cart with ${totalSelectedProducts} selected products`}
    >
      <ShoppingCart size={18} />
      <span>My Enquiry</span>
      <span className="rounded-xl bg-neutral-950 px-2 py-0.5 text-xs text-white">
        {totalSelectedProducts}
      </span>
      {totalQuantity > 0 && (
        <span className="hidden rounded-xl bg-white/12 px-2 py-0.5 text-xs text-white/80 sm:inline">
          Qty {totalQuantity}
        </span>
      )}
    </motion.button>
  );
}

function CartDrawer({
  open,
  cartItems,
  totalSelectedProducts,
  totalQuantity,
  whatsappUrl,
  onClose,
  onIncrease,
  onDecrease,
  onRemove,
  onClear,
}: {
  open: boolean;
  cartItems: CartItem[];
  totalSelectedProducts: number;
  totalQuantity: number;
  whatsappUrl: string;
  onClose: () => void;
  onIncrease: (productId: string) => void;
  onDecrease: (productId: string) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
}) {
  const isMobileDrawer = useMobileDrawerMotion();
  const drawerMotion = isMobileDrawer
    ? {
        initial: { opacity: 0, y: 84 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 84 },
      }
    : {
        initial: { opacity: 0, x: 84 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 84 },
      };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close product enquiry cart"
            className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="My Product Enquiry"
            initial={drawerMotion.initial}
            animate={drawerMotion.animate}
            exit={drawerMotion.exit}
            transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[88vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-lg md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-[460px] md:rounded-l-2xl md:rounded-tr-none"
          >
            <div className="border-b border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    className="text-4xl font-semibold leading-none text-gray-950"
                    style={{ fontFamily: "var(--font-public-sans)", letterSpacing: "0" }}
                  >
                    My Product Enquiry
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    Review your selected products before sending them to TRUECOLOURS for current
                    stock and pricing.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition hover:bg-gray-200"
                  aria-label="Close product enquiry cart"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {cartItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                  <ShoppingCart size={38} className="mx-auto mb-3 text-gray-300" />
                  <h3
                    className="text-3xl font-semibold text-gray-950"
                    style={{ fontFamily: "var(--font-public-sans)", letterSpacing: "0" }}
                  >
                    No products selected
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    Add catalogue products to build an enquiry before sending it to TRUECOLOURS.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[56px_1fr] gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
                    >
                      <ProductImage
                        src={item.image}
                        alt={`${item.name} product image`}
                        className="h-14 w-14 shrink-0 rounded-xl"
                        imageMode={
                          item.isNewArrival || item.category === "New Arrivals"
                            ? "clean-product"
                            : "normal"
                        }
                      />

                      <div className="min-w-0">
                        <h3
                          className="text-xl font-semibold leading-tight text-gray-950 sm:text-2xl"
                          style={{
                            fontFamily: "var(--font-public-sans)",
                            letterSpacing: "0",
                          }}
                        >
                          {item.name}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-gray-500">
                          {[item.brand, item.supplier].filter(Boolean).join(" / ") ||
                            "TRUECOLOURS"}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {item.category || "Catalogue product"}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                            <button
                              type="button"
                              onClick={() => onDecrease(item.id)}
                              disabled={item.quantity <= 1}
                              className="flex h-9 w-9 items-center justify-center text-gray-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label={`Decrease ${item.name} quantity`}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="min-w-10 px-2 text-center text-sm font-semibold text-gray-950">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onIncrease(item.id)}
                              className="flex h-9 w-9 items-center justify-center text-gray-700 transition hover:bg-white"
                              aria-label={`Increase ${item.name} quantity`}
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            className="inline-flex items-center gap-1 rounded-xl bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100"
                          >
                            <Trash2 size={13} />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 bg-gray-50 p-5">
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <div className="text-[10px] font-semibold uppercase text-gray-400">
                    Products selected
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-gray-950">
                    {totalSelectedProducts}
                  </div>
                </div>
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <div className="text-[10px] font-semibold uppercase text-gray-400">
                    Total quantity
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-gray-950">{totalQuantity}</div>
                </div>
              </div>

              <p className="mb-4 rounded-xl bg-yellow-50 p-3 text-xs font-bold leading-relaxed text-yellow-900">
                Prices and stock will be confirmed by TRUECOLOURS.
              </p>

              <div className="grid gap-2">
                {cartItems.length > 0 && (
                  <a
                    href={whatsappUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
                  >
                    <MessageCircle size={16} />
                    Send on WhatsApp
                  </a>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onClear}
                    disabled={cartItems.length === 0}
                    className="rounded-xl bg-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Clear Cart
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function CatalogueGroup({
  groupName,
  meta,
  products,
  openProductId,
  setOpenProductId,
  cartQuantities,
  recentlyAddedId,
  addToCart,
  requiresLogin,
  visibleProductIndexById,
}: {
  groupName: string;
  meta?: CatalogueCategory;
  products: Product[];
  openProductId: string | null;
  setOpenProductId: (id: string | null) => void;
  cartQuantities: Record<string, number>;
  recentlyAddedId: string | null;
  addToCart: (product: Product) => void;
  requiresLogin: boolean;
  visibleProductIndexById: Map<string, number>;
}) {
  const [open, setOpen] = useState(true);
  const subcategories = unique(products.map((product) => product.subcategory));
  const accent = "#202328";
  const previewImages = uniqueImages(
    products.map((product) => getCatalogueProductImage(product))
  ).slice(0, 3);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-none">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-gray-50"
      >
        <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accent }} />

        <div>
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>
            {products.length} products
          </div>

          <h2
            className="mt-1 text-3xl font-semibold leading-none text-gray-950"
            style={{ fontFamily: "var(--font-public-sans)", letterSpacing: "0" }}
          >
            {groupName}
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-gray-500">
            {meta?.description ??
              `${subcategories.slice(0, 4).join(", ")}${
                subcategories.length > 4 ? ` + ${subcategories.length - 4} more` : ""
              }`}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          <CatalogueGroupPreview
            images={previewImages}
            groupName={groupName}
            imageMode={groupName === "New Arrivals" ? "clean-product" : "normal"}
          />

          <span
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: accent }}
          >
            <ChevronDown size={22} className={`transition ${open ? "rotate-180" : ""}`} />
          </span>
        </div>
      </button>

      {open && (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              open={openProductId === product.id}
              onToggle={() =>
                setOpenProductId(openProductId === product.id ? null : product.id)
              }
              quantity={cartQuantities[product.id] ?? 0}
              recentlyAdded={recentlyAddedId === product.id}
              onAdd={() => addToCart(product)}
              requiresLogin={requiresLogin}
              accent={accent}
              priority={
                (visibleProductIndexById.get(product.id) ?? Infinity) <
                PRIORITY_IMAGE_COUNT
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CatalogueGroupPreview({
  images,
  groupName,
  imageMode,
}: {
  images: string[];
  groupName: string;
  imageMode: "normal" | "clean-product";
}) {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="hidden -space-x-2 sm:flex" aria-label={`${groupName} product images`}>
      {images.map((imageUrl, index) => (
        <span key={`${imageUrl}-${index}`} className="relative">
          <ProductImage
            src={imageUrl}
            alt=""
            className="h-12 w-12 rounded-xl border-2 border-white"
            sizes="48px"
            imageMode={imageMode}
          />
          <span className="sr-only">
            {groupName} product preview {index + 1}
          </span>
        </span>
      ))}
    </div>
  );
}

function ProductRow({
  product,
  open,
  onToggle,
  quantity,
  recentlyAdded,
  onAdd,
  requiresLogin,
  accent,
  priority,
}: {
  product: Product;
  open: boolean;
  onToggle: () => void;
  quantity: number;
  recentlyAdded: boolean;
  onAdd: () => void;
  requiresLogin: boolean;
  accent: string;
  priority: boolean;
}) {
  const imageUrl = getCatalogueProductImage(product);
  const productImages = open ? getCatalogueProductImages(product) : [];
  const isInCart = quantity > 0;
  const unavailable = product.stockStatus === "Out of Stock";
  const productMessage = `Hi TRUECOLOURS, I want to ask about ${productLabel(
    product
  )}. Please confirm current stock and pricing.`;

  return (
    <article id={`product-${product.id}`} className="scroll-mt-40 bg-white transition hover:bg-gray-50/70">
      <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 p-3 min-[400px]:grid-cols-[96px_minmax(0,1fr)] min-[400px]:gap-4 min-[400px]:p-4 md:grid-cols-[112px_minmax(0,1fr)_auto] md:items-center">
        <ProductImage
          src={imageUrl}
          alt={getCatalogueProductImageAlt(product)}
          className="h-[76px] w-[76px] shrink-0 min-[400px]:h-24 min-[400px]:w-24 md:h-28 md:w-28"
          priority={priority}
          sizes="(max-width: 768px) 96px, 112px"
          imageMode={product.isNewArrival ? "clean-product" : "normal"}
        />

        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={`details-${product.id}`} className="rounded-lg text-left">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {product.isNewArrival && (
              <span className="rounded-lg bg-neutral-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">
                New Arrival
              </span>
            )}

            <span className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              {product.subcategory}
            </span>

            {product.brand && (
              <span
                className="rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white"
                style={{ backgroundColor: accent }}
              >
                {product.brand}
              </span>
            )}

            {product.stockStatus && (
              <span className={`rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-widest ${unavailable ? "bg-neutral-100 text-neutral-700" : product.stockStatus === "Limited Stock" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                {product.stockStatus}{typeof product.stockQuantity === "number" && product.stockStatus !== "Confirm availability" ? ` · ${product.stockQuantity}` : ""}
              </span>
            )}
          </div>

          <h3
            className="break-words text-xl font-semibold leading-none text-gray-950 min-[400px]:text-2xl"
            style={{ fontFamily: "var(--font-public-sans)", letterSpacing: "0" }}
          >
            {product.name}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {product.supplier}
            {product.code ? ` - Code: ${product.code}` : ""}
            {product.size ? ` - Size: ${product.size}` : ""}
          </p>

          {product.marketResearch ? (
            <div className="mt-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-700">
                {product.marketResearch.priceStatus.startsWith("No verified")
                  ? "Comparable market price"
                  : "Market price"}
              </span>
              <p className="mt-0.5 max-w-3xl text-sm font-semibold leading-snug text-blue-950 sm:text-base">
                {product.marketResearch.priceRange}
              </p>
            </div>
          ) : product.price ? (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Current market price
              </p>
              <p className="mt-0.5 text-lg font-semibold leading-none text-gray-950">
                {product.price}
              </p>
              <p className="mt-1 text-xs font-medium text-gray-400">
                {product.size || product.subcategory}
              </p>
            </div>
          ) : null}
        </button>

        <div className="col-span-2 grid grid-cols-2 gap-2 min-[430px]:flex min-[430px]:flex-wrap md:col-span-1 md:justify-end">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 min-[400px]:px-4"
          >
            <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
            View Details
          </button>

          <button
            type="button"
            onClick={onAdd}
            disabled={unavailable}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition min-[400px]:px-4 ${
              unavailable
                ? "cursor-not-allowed bg-gray-200 text-gray-500"
                : recentlyAdded || isInCart
                ? "bg-green-50 text-green-700"
                : "bg-gray-950 text-white hover:bg-gray-800"
            }`}
          >
            {recentlyAdded ? <Check size={14} /> : <ShoppingBag size={14} />}
            {unavailable ? "Out of stock" : recentlyAdded ? "Added" : isInCart ? `Add (${quantity})` : requiresLogin ? "Login to add" : "Add"}
          </button>

          <a
            href={buildColourContactLink(productMessage)}
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-green-500 bg-green-50 px-4 py-2.5 text-xs font-semibold text-green-700 transition hover:bg-green-100 min-[430px]:col-auto"
          >
            <MessageCircle size={14} />
            WhatsApp
          </a>
        </div>
      </div>

      {open && (
        <div id={`details-${product.id}`} className="border-t border-gray-100 bg-gradient-to-br from-gray-50 to-white px-4 py-4">
          <div className={product.marketResearch ? "" : "grid gap-4 lg:grid-cols-[minmax(220px,300px)_1fr]"}>
            {!product.marketResearch && (
              <div>
              <ProductImage
                src={imageUrl}
                alt={getCatalogueProductImageAlt(product)}
                className="mx-auto h-52 w-full max-w-sm"
                sizes="(max-width: 1024px) 100vw, 300px"
                imageMode={product.isNewArrival ? "clean-product" : "normal"}
              />

              {productImages.length > 1 && (
                <div
                  className="mx-auto mt-3 flex max-w-md flex-wrap justify-center gap-2"
                  aria-label={`${product.name} image gallery`}
                >
                  {productImages.map((galleryImage, index) => (
                    <ProductImage
                      key={`${galleryImage}-${index}`}
                      src={galleryImage}
                      alt={`${product.name} product image ${index + 1}`}
                      className="h-16 w-16 rounded-xl"
                      sizes="64px"
                      imageMode={product.isNewArrival ? "clean-product" : "normal"}
                    />
                  ))}
                </div>
              )}
              </div>
            )}

            <div>
              {!product.marketResearch && (
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  {product.brand && <Info label="Brand" value={product.brand} />}
                  {product.code && <Info label="Code" value={product.code} />}
                  {product.size && <Info label="Size" value={product.size} />}
                  {product.colour && <Info label="Colour" value={product.colour} />}
                  {product.price && <Info label="Current market price" value={product.price} />}
                </div>
              )}

              {product.marketResearch && (
                <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="absolute inset-x-0 top-0 h-px bg-neutral-200" />

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <h4 className="inline-flex items-center gap-2 font-semibold text-gray-950">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-gray-950 text-white">
                        <PackageSearch size={16} />
                      </span>
                      Market price & specifications
                    </h4>
                    <span className="text-[11px] font-bold text-gray-500">
                      Checked {product.marketResearch.checkedOn}
                    </span>
                  </div>

                  <p
                    className={`mt-4 inline-flex max-w-full rounded-full px-3 py-1.5 text-xs font-semibold leading-snug ${
                      product.marketResearch.priceStatus.startsWith("No verified")
                        ? "bg-amber-100 text-amber-900"
                        : "bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    {product.marketResearch.priceStatus}
                  </p>
                  <p className="mt-2 text-xl font-semibold leading-tight text-blue-950 sm:text-2xl">
                    {product.marketResearch.priceRange}
                  </p>

                  <div className="mt-6 grid gap-6 md:grid-cols-[1.35fr_1fr]">
                    <div>
                      <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-800">
                        Specifications
                      </h5>
                      <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-gray-700">
                        {product.marketResearch.specifications.map((specification, index) => (
                          <li
                            key={specification}
                            className="flex min-w-0 items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3"
                          >
                            <span
                              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                                specificationAccents[index % specificationAccents.length]
                              }`}
                            >
                              <Check size={13} strokeWidth={3} />
                            </span>
                            <span className="min-w-0 break-words">{specification}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-800">
                        Applications
                      </h5>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {product.marketResearch.applications.map((application, index) => (
                          <span
                            key={application}
                            className={`max-w-full rounded-full px-3 py-2 text-xs font-bold leading-snug ring-1 ${
                              applicationBadgeStyles[index % applicationBadgeStyles.length]
                            }`}
                          >
                            {application}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="mt-5 border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-500">
                    {marketResearchDisclaimer}
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-gray-800">{value}</div>
    </div>
  );
}
