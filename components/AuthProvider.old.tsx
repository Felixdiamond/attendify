/**
 * Authentication Provider
 * 
 * Initializes auth state on app start and provides auth context.
 * Requirements: 1.5, 2.5
 */

import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';

interface AuthProviderProps {
  children?: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    // Initialize auth state from storage on mount
    initializeAuth();
  }, [initializeAuth]);

  return <>{children}</>;
}
