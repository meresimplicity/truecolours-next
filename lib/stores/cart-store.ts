"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CustomerCartItem } from "@/lib/account-types";

type CartState = {
  items: CustomerCartItem[];
  isHydrated: boolean;
  guestMode: boolean;

  /* Actions */
  setItems: (items: CustomerCartItem[]) => void;
  addItem: (item: CustomerCartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setGuestMode: (guest: boolean) => void;
  setHydrated: () => void;

  /* Computed */
  totalItems: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isHydrated: false,
      guestMode: true,

      setItems: (items) => set({ items }),

      addItem: (item) => {
        const existing = get().items.find((i) => i.productId === item.productId);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          });
        } else {
          set({ items: [...get().items, { ...item, quantity: 1 }] });
        }
      },

      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.productId !== productId) });
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),
      setGuestMode: (guest) => set({ guestMode: guest }),
      setHydrated: () => set({ isHydrated: true }),

      totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: "truecolours-cart",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
