"use client";

import { create } from "zustand";
import type { AccountNotification } from "@/lib/account-types";

type NotificationState = {
  notifications: AccountNotification[];
  unreadCount: number;
  setNotifications: (notifications: AccountNotification[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (notification: AccountNotification) => void;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),

  markRead: (id) => {
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    set({
      notifications: updated,
      unreadCount: updated.filter((n) => !n.read).length,
    });
  },

  markAllRead: () => {
    const updated = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications: updated, unreadCount: 0 });
  },

  addNotification: (notification) => {
    const updated = [notification, ...get().notifications];
    set({
      notifications: updated,
      unreadCount: updated.filter((n) => !n.read).length,
    });
  },
}));
