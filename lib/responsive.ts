/**
 * Responsive Design Utilities
 * Helpers for handling different screen sizes and orientations
 */

import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Breakpoints (similar to Tailwind)
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Device type detection
export const isSmallDevice = width < breakpoints.sm;
export const isMediumDevice = width >= breakpoints.sm && width < breakpoints.md;
export const isLargeDevice = width >= breakpoints.md && width < breakpoints.lg;
export const isTablet = width >= breakpoints.md;
export const isDesktop = width >= breakpoints.lg;

// Platform detection
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

// Screen dimensions
export const screenWidth = width;
export const screenHeight = height;

// Responsive value selector
export function responsive<T>(values: {
  default: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
}): T {
  if (width >= breakpoints.xl && values.xl !== undefined) return values.xl;
  if (width >= breakpoints.lg && values.lg !== undefined) return values.lg;
  if (width >= breakpoints.md && values.md !== undefined) return values.md;
  if (width >= breakpoints.sm && values.sm !== undefined) return values.sm;
  return values.default;
}

// Responsive spacing
export const spacing = {
  xs: responsive({ default: 4, md: 6 }),
  sm: responsive({ default: 8, md: 12 }),
  md: responsive({ default: 16, md: 20 }),
  lg: responsive({ default: 24, md: 32 }),
  xl: responsive({ default: 32, md: 48 }),
  '2xl': responsive({ default: 48, md: 64 }),
};

// Responsive font sizes
export const fontSize = {
  xs: responsive({ default: 12, md: 13 }),
  sm: responsive({ default: 14, md: 15 }),
  base: responsive({ default: 16, md: 17 }),
  lg: responsive({ default: 18, md: 20 }),
  xl: responsive({ default: 20, md: 22 }),
  '2xl': responsive({ default: 24, md: 28 }),
  '3xl': responsive({ default: 30, md: 36 }),
  '4xl': responsive({ default: 36, md: 44 }),
};

// Grid columns for different screen sizes
export const gridColumns = responsive({
  default: 1,
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4,
});

// Container max width
export const containerMaxWidth = responsive({
  default: '100%',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
});

// Safe area padding
export const safeAreaPadding = {
  top: isIOS ? 44 : 0,
  bottom: isIOS ? 34 : 0,
};

// Utility to get responsive class names
export function getResponsiveClass(baseClass: string, breakpoint?: keyof typeof breakpoints): string {
  if (!breakpoint) return baseClass;
  
  const currentWidth = Dimensions.get('window').width;
  const breakpointWidth = breakpoints[breakpoint];
  
  return currentWidth >= breakpointWidth ? baseClass : '';
}

// Hook to listen to dimension changes
export function useDimensions() {
  const [dimensions, setDimensions] = React.useState({
    window: Dimensions.get('window'),
    screen: Dimensions.get('screen'),
  });

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
      setDimensions({ window, screen });
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
}

// React import for hook
import React from 'react';
