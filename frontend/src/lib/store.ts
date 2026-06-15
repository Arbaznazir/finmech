"use client";

import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  company?: string;
  purchasedModels?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => {
    localStorage.setItem("finmech_token", token);
    localStorage.setItem("finmech_user", JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem("finmech_token");
    localStorage.removeItem("finmech_user");
    set({ user: null, token: null });
  },
  hydrate: () => {
    const token = localStorage.getItem("finmech_token");
    const userStr = localStorage.getItem("finmech_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token });

        // Refresh user data from backend to pick up plan changes
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "https://api.finmech.co/api"}/auth/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((data) => {
            const freshUser = data.user || data;
            localStorage.setItem("finmech_user", JSON.stringify(freshUser));
            set({ user: freshUser });
          })
          .catch(() => {});
      } catch {
        localStorage.removeItem("finmech_token");
        localStorage.removeItem("finmech_user");
      }
    }
  },
}));
