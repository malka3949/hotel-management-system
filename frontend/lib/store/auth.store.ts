'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../api/auth';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      clearUser: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth',
      // Only persist minimal non-sensitive data; actual auth is via HttpOnly cookie
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
