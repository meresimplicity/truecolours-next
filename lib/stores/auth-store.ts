"use client";

import { create } from "zustand";
import type { AccountUser } from "@/lib/supabase/auth";
import type { CustomerProfile } from "@/lib/account-types";

type AuthState = {
  user: AccountUser | null;
  profile: CustomerProfile | null;
  loading: boolean;
  error: string;
  setUser: (user: AccountUser | null) => void;
  setProfile: (profile: CustomerProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  error: "",
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearAuth: () => set({ user: null, profile: null, error: "" }),
}));
