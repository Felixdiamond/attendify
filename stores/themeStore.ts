/**
 * Theme State Store
 * 
 * Zustand store for managing app theme (light/dark mode) with persistence.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  initialized: boolean;
}

interface ThemeActions {
  setTheme: (mode: ThemeMode) => Promise<void>;
  initializeTheme: () => Promise<void>;
}

type ThemeStore = ThemeState & ThemeActions;

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEY = '@smartattend:theme';

// ============================================================================
// STORE
// ============================================================================

export const useThemeStore = create<ThemeStore>((set) => ({
  // Initial state
  mode: 'system',
  initialized: false,

  // Set theme mode and persist to storage
  setTheme: async (mode: ThemeMode) => {
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, mode);

      // Update store
      set({ mode });
    } catch (error) {
      console.error('Failed to persist theme:', error);
      // Still update store even if persistence fails
      set({ mode });
    }
  },

  // Initialize theme from storage on app start
  initializeTheme: async () => {
    try {
      // Load from AsyncStorage
      const savedMode = await AsyncStorage.getItem(STORAGE_KEY);

      if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
        set({ mode: savedMode, initialized: true });
      } else {
        set({ mode: 'system', initialized: true });
      }
    } catch (error) {
      console.error('Failed to initialize theme:', error);
      set({ mode: 'system', initialized: true });
    }
  },
}));

// ============================================================================
// SELECTORS
// ============================================================================

/**
 * Get current theme mode
 */
export const useThemeMode = () => {
  return useThemeStore((state) => state.mode);
};

/**
 * Check if theme is initialized
 */
export const useThemeInitialized = () => {
  return useThemeStore((state) => state.initialized);
};
