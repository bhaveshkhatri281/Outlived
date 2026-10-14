"use client";

import { create } from "zustand";

type Toast = { id: number; title: string; detail?: string; href?: string; cta?: string };

type ToastState = {
  toast: Toast | null;
  show: (t: Omit<Toast, "id">) => void;
  dismiss: () => void;
};

let timer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>((set) => ({
  toast: null,
  show: (t) => {
    clearTimeout(timer);
    set({ toast: { ...t, id: Date.now() } });
    timer = setTimeout(() => set({ toast: null }), 3200);
  },
  dismiss: () => {
    clearTimeout(timer);
    set({ toast: null });
  },
}));
