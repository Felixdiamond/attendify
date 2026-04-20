/**
 * Cinema-Grade Theme System - 2025
 * Peak UI design inspired by Linear, Stripe, Vercel, and Mobbins
 * Features: Bold colors, refined spacing, perfect typography, zero gradients
 */

export const Theme = {
  // 2025 Cinema-Grade Color System
  colors: {
    // Primary: Deep Indigo - Bold, confident, tech-forward
    primary: {
      DEFAULT: '#4F46E5',
      light: '#6366F1',
      dark: '#4338CA',
      50: '#EEF2FF',
      100: '#E0E7FF',
      200: '#C7D2FE',
      300: '#A5B4FC',
      400: '#818CF8',
      500: '#6366F1',
      600: '#4F46E5',
      700: '#4338CA',
      800: '#3730A3',
      900: '#312E81',
    },
    // Accent: Electric Violet - Energetic, creative
    accent: {
      DEFAULT: '#7C3AED',
      light: '#8B5CF6',
      dark: '#6D28D9',
      50: '#FAF5FF',
      100: '#F3E8FF',
      200: '#E9D5FF',
      300: '#D8B4FE',
      400: '#C084FC',
      500: '#A855F7',
      600: '#9333EA',
      700: '#7E22CE',
      800: '#6B21A8',
      900: '#581C87',
    },
    // Success: Emerald Green
    success: {
      DEFAULT: '#10B981',
      light: '#34D399',
      dark: '#059669',
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      300: '#6EE7B7',
      400: '#34D399',
      500: '#10B981',
      600: '#059669',
      700: '#047857',
      800: '#065F46',
      900: '#064E3B',
    },
    // Error: Crimson Red
    error: {
      DEFAULT: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
    },
    // Warning: Amber
    warning: {
      DEFAULT: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
    // Info: Sky Blue
    info: {
      DEFAULT: '#0EA5E9',
      light: '#38BDF8',
      dark: '#0284C7',
      50: '#F0F9FF',
      100: '#E0F2FE',
      200: '#BAE6FD',
      300: '#7DD3FC',
      400: '#38BDF8',
      500: '#0EA5E9',
      600: '#0284C7',
      700: '#0369A1',
      800: '#075985',
      900: '#0C4A6E',
    },
    // Ultra-refined Neutrals
    neutral: {
      0: '#FFFFFF',
      50: '#FAFAFA',
      100: '#F5F5F5',
      150: '#EDEDED',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0A0A0A',
    },
  },

  // Cinema-Grade Typography (2025) - Tighter tracking, bold hierarchy
  typography: {
    fontSize: {
      xs: 11,
      sm: 13,
      base: 15,
      lg: 17,
      xl: 19,
      '2xl': 22,
      '3xl': 28,
      '4xl': 34,
      '5xl': 44,
      '6xl': 56,
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    lineHeight: {
      tighter: 1.15,
      tight: 1.25,
      snug: 1.35,
      normal: 1.5,
      relaxed: 1.625,
      loose: 1.75,
    },
    letterSpacing: {
      tighter: -0.04,
      tight: -0.02,
      normal: 0,
      wide: 0.01,
      wider: 0.02,
    },
  },

  // Perfect Spacing Scale (2025) - More granular control
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
    '6xl': 56,
    '7xl': 64,
    '8xl': 80,
    '9xl': 96,
    '10xl': 112,
  },

  // Modern Border Radius (2025) - Larger, more refined
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 10,
    xl: 12,
    '2xl': 16,
    '3xl': 20,
    '4xl': 24,
    '5xl': 28,
    '6xl': 32,
    full: 9999,
  },

  // Refined Shadows (2025) - Subtle depth without heaviness
  shadows: {
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0.5 },
      shadowOpacity: 0.03,
      shadowRadius: 1,
      elevation: 1,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4,
    },
    '2xl': {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 5,
    },
  },

  // Smooth Micro-interactions (2025)
  animation: {
    instant: 100,
    fast: 150,
    normal: 200,
    slow: 300,
    slower: 400,
  },
} as const;

// Utility function to get color with opacity
export const withOpacity = (color: string, opacity: number): string => {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

// Cinema-Grade Style Patterns (2025) - Peak UI Design
// Note: shadow-*, opacity-*, bg-color/opacity patterns removed to avoid NativeWind race conditions with Expo Router
export const commonStyles = {
  // Card variants - Bento grid ready (shadow- and opacity patterns removed)
  card: 'bg-white dark:bg-neutral-900 rounded-2xl p-6 border-2 border-neutral-200 dark:border-neutral-800',
  cardCompact: 'bg-white dark:bg-neutral-900 rounded-xl p-4 border-2 border-neutral-200 dark:border-neutral-800',
  cardElevated: 'bg-white dark:bg-neutral-900 rounded-2xl p-6',
  cardGlass: 'backdrop-blur-xl rounded-2xl p-6 border-2', // Use inline styles for bg/opacity patterns
  cardFlat: 'bg-neutral-50 dark:bg-neutral-850 rounded-2xl p-6',
  
  // Button variants - Bold & refined (active:opacity-* patterns removed)
  button: {
    primary: 'bg-[#4F46E5] border-2 border-[#4F46E5] py-4 px-6 rounded-xl active:scale-[0.98]',
    accent: 'bg-[#7C3AED] border-2 border-[#7C3AED] py-4 px-6 rounded-xl active:scale-[0.98]',
    secondary: 'bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 py-4 px-6 rounded-xl active:scale-[0.98]',
    ghost: 'bg-transparent border-2 border-transparent py-4 px-6 rounded-xl active:scale-[0.98]', // Use inline opacity for active state
    outline: 'bg-transparent border-2 border-neutral-300 dark:border-neutral-700 py-4 px-6 rounded-xl active:border-[#4F46E5]',
    success: 'bg-[#10B981] border-2 border-[#10B981] py-4 px-6 rounded-xl active:scale-[0.98]',
    error: 'bg-[#EF4444] border-2 border-[#EF4444] py-4 px-6 rounded-xl active:scale-[0.98]',
    disabled: 'bg-neutral-200 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-800 py-4 px-6 rounded-xl', // Use inline opacity for disabled
  },
  
  // Typography hierarchy - Peak 2025
  text: {
    hero: 'text-5xl font-bold text-neutral-900 dark:text-neutral-50 leading-tight tracking-tighter',
    display: 'text-4xl font-bold text-neutral-900 dark:text-neutral-50 leading-tight tracking-tighter',
    heading: 'text-3xl font-bold text-neutral-900 dark:text-neutral-50 leading-tight tracking-tight',
    subheading: 'text-2xl font-semibold text-neutral-900 dark:text-neutral-50 leading-snug tracking-tight',
    title: 'text-xl font-semibold text-neutral-900 dark:text-neutral-50 tracking-tight',
    body: 'text-base text-neutral-700 dark:text-neutral-300 leading-relaxed',
    bodyLarge: 'text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed',
    bodyMedium: 'text-base font-medium text-neutral-900 dark:text-neutral-50',
    caption: 'text-sm text-neutral-600 dark:text-neutral-400 tracking-tight',
    small: 'text-xs text-neutral-500 dark:text-neutral-500 tracking-tight',
    label: 'text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2.5 tracking-tight',
  },
  
  // Input styling - Bold borders, refined focus
  input: 'border-2 border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-4 text-base bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 font-medium placeholder:text-neutral-400',
  inputFocused: 'border-2 border-[#4F46E5] rounded-xl px-4 py-4 text-base bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 font-medium',
  
  // Layout containers - Clean backgrounds
  container: 'flex-1 bg-neutral-50 dark:bg-neutral-950',
  containerWhite: 'flex-1 bg-white dark:bg-neutral-950',
  containerGray: 'flex-1 bg-neutral-100 dark:bg-neutral-900',
  
  // Sections - Generous spacing
  section: 'mb-8',
  sectionLarge: 'mb-10',
  sectionCompact: 'mb-6',
  sectionTight: 'mb-4',
  
  // Dividers - Refined & subtle
  divider: 'h-[2px] bg-neutral-200 dark:bg-neutral-800 my-6',
  dividerCompact: 'h-[1px] bg-neutral-200 dark:bg-neutral-800 my-4',
  dividerBold: 'h-[2px] bg-neutral-300 dark:bg-neutral-700 my-6',
  
  // Lists & Groups
  listItem: 'py-4 px-5 border-b-2 border-neutral-200 dark:border-neutral-800 active:bg-neutral-50 dark:active:bg-neutral-850',
  group: 'bg-white dark:bg-neutral-900 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 overflow-hidden',
};
