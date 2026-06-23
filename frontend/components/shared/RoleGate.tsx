'use client';

import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/api/auth';

interface Props {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ roles, children, fallback = null }: Props) {
  const { hasRole } = useAuth();
  return hasRole(...roles) ? <>{children}</> : <>{fallback}</>;
}
