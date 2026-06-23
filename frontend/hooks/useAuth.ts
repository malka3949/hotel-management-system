'use client';

import { useAuthStore } from '../lib/store/auth.store';
import type { UserRole } from '../lib/api/auth';

export function useAuth() {
  const { user, isAuthenticated, setUser, clearUser } = useAuthStore();

  function hasRole(...roles: UserRole[]): boolean {
    if (!user) return false;
    return roles.includes(user.role);
  }

  return { user, isAuthenticated, setUser, clearUser, hasRole };
}
