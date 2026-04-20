/**
 * Authentication State Store
 * 
 * Zustand store for managing authentication state with session persistence.
 * Requirements: 1.5, 2.5
 */

import type { AuthSession } from '@/lib/auth';
import type { User } from '@/types/database.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

interface AuthState {
  user: User | null;
  session: AuthSession | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthActions {
  setAuth: (user: User, session: AuthSession) => Promise<void>;
  clearAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  USER: '@smartattend:user',
  SESSION: '@smartattend:session',
};

// ============================================================================
// STORE
// ============================================================================

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  session: null,
  loading: false,
  initialized: false,

  // Set authentication state and persist to storage
  setAuth: async (user: User, session: AuthSession) => {
    // Update store immediately to avoid redirects before persistence completes
    set({ user, session, initialized: true });
    try {
      // Persist in background; navigation can proceed safely now
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.USER, JSON.stringify(user)],
        [STORAGE_KEYS.SESSION, JSON.stringify(session)],
      ]);
    } catch (error) {
      console.error('Failed to persist auth state:', error);
    }
  },

  // Clear authentication state and remove from storage
  clearAuth: async () => {
    // Clear store immediately, then cleanup storage
    set({ user: null, session: null, initialized: true });
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.SESSION]);
    } catch (error) {
      console.error('Failed to clear auth state:', error);
    }
  },

  // Set loading state
  setLoading: (loading: boolean) => {
    set({ loading });
  },

  // Initialize auth state from storage on app start
  initializeAuth: async () => {
    try {
      set({ loading: true });

      // Load from AsyncStorage
      const [[, userJson], [, sessionJson]] = await AsyncStorage.multiGet([
        STORAGE_KEYS.USER,
        STORAGE_KEYS.SESSION,
      ]);

      if (userJson && sessionJson) {
        const user = JSON.parse(userJson) as User;
        const session = JSON.parse(sessionJson) as AuthSession;

        set({ user, session, loading: false, initialized: true });
      } else {
        set({ user: null, session: null, loading: false, initialized: true });
      }
    } catch (error) {
      console.error('Failed to initialize auth state:', error);
      set({ user: null, session: null, loading: false, initialized: true });
    }
  },
}));

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Check if user is authenticated
 */
export const useIsAuthenticated = () => {
  return useAuthStore((state) => state.user !== null && state.session !== null);
};

/**
 * Get current user
 */
export const useCurrentUser = () => {
  return useAuthStore((state) => state.user);
};

/**
 * Get current user role
 */
export const useUserRole = () => {
  return useAuthStore((state) => state.user?.role);
};

/**
 * Check if auth is loading
 */
export const useAuthLoading = () => {
  return useAuthStore((state) => state.loading);
};

/**
 * Check if auth is initialized
 */
export const useAuthInitialized = () => {
  return useAuthStore((state) => state.initialized);
};
