/**
 * Protected Route Component
 * 
 * Redirects unauthenticated users to login and enforces role-based access.
 * Requirements: 1.5, 2.5
 */

import { useAuthInitialized, useAuthStore, useIsAuthenticated } from '@/stores/authStore';
import type { UserRole } from '@/types/database.types';
import { Redirect, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const getRoleHomeRoute = (role?: UserRole) => {
  switch (role) {
    case 'student':
      return '/(student)/scan';
    case 'lecturer':
      return '/(lecturer)/courses';
    case 'hoc':
      return '/(hoc)/students';
    default:
      return '/';
  }
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const segments = useSegments();
  const isAuthenticated = useIsAuthenticated();
  const initialized = useAuthInitialized();
  const user = useAuthStore((state) => state.user);

  // Show loading screen while initializing
  if (!initialized) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const inAuthGroup = segments[0] === '(auth)';

  if (!isAuthenticated && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  const homeRoute = getRoleHomeRoute(user?.role);

  if (isAuthenticated && inAuthGroup) {
    return <Redirect href={homeRoute} />;
  }

  if (isAuthenticated && allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Redirect href={homeRoute} />;
  }

  return <>{children}</>;
}
