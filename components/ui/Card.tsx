/**
 * Cinema-Grade Card Component - 2025
 * Inspired by Linear, Stripe, and Vercel design systems
 * Features: Refined borders, perfect spacing, subtle depth, bento-grid ready
 */

import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat' | 'bordered' | 'glass';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
}

const variantStyles: Record<string, string> = {
  // Default: Subtle border with ultra-light shadow
  default: 'bg-white dark:bg-neutral-900 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800',
  
  // Elevated: Premium card with refined shadow, no border
  elevated: 'bg-white dark:bg-neutral-900 rounded-2xl',
  
  // Outlined: Bold border, no background
  outlined: 'bg-transparent rounded-2xl border-2 border-neutral-300 dark:border-neutral-700',
  
  // Flat: Subtle background, no border or shadow
  flat: 'bg-neutral-50 dark:bg-neutral-850 rounded-2xl',
  
  // Bordered: Strong border emphasis
  bordered: 'bg-white dark:bg-neutral-900 rounded-2xl border-2 border-neutral-300 dark:border-neutral-700',
  
  // Glass: Modern translucent effect without gradients (bg/opacity removed to avoid NativeWind race conditions)
  glass: 'backdrop-blur-xl rounded-2xl border-2',
};

const paddingStyles: Record<string, string> = {
  none: '',
  xs: 'p-3',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
  xl: 'p-8',
};

const interactiveStyles = 'active:scale-[0.98] transition-transform duration-150';

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  interactive = false,
  className = '',
  ...props
}) => {
  const containerClass = [
    variantStyles[variant],
    paddingStyles[padding],
    interactive && interactiveStyles,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const elevatedShadowStyle = variant === 'elevated' ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  } : {};

  const glassStyle = variant === 'glass' ? {
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // bg-white/80
    borderColor: 'rgba(229, 229, 229, 0.5)', // border-neutral-200/50
  } : {};

  const combinedStyle = { ...elevatedShadowStyle, ...glassStyle };

  return (
    <View className={containerClass} style={combinedStyle} {...props}>
      {children}
    </View>
  );
};
