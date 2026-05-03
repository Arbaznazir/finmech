"use client";

import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  company?: string;
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
      } catch {
        localStorage.removeItem("finmech_token");
        localStorage.removeItem("finmech_user");
      }
    }
  },
}));
