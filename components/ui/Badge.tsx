/**
 * Cinema-Grade Badge Component - 2025
 * Clean status indicators inspired by Linear and Stripe
 * Features: Bold colors, perfect sizing, refined borders
 */

import React from 'react';
import { Text, View, ViewProps } from 'react-native';

export type BadgeVariant = 'primary' | 'accent' | 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'outline';

interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-[#EEF2FF] dark:bg-[#312E81] border-2 border-[#C7D2FE] dark:border-[#4338CA]',
  accent: 'bg-[#FAF5FF] dark:bg-[#581C87] border-2 border-[#E9D5FF] dark:border-[#7E22CE]',
  success: 'bg-[#ECFDF5] dark:bg-[#064E3B] border-2 border-[#A7F3D0] dark:border-[#047857]',
  error: 'bg-[#FEF2F2] dark:bg-[#7F1D1D] border-2 border-[#FECACA] dark:border-[#B91C1C]',
  warning: 'bg-[#FFFBEB] dark:bg-[#78350F] border-2 border-[#FDE68A] dark:border-[#B45309]',
  info: 'bg-[#F0F9FF] dark:bg-[#0C4A6E] border-2 border-[#BAE6FD] dark:border-[#0369A1]',
  neutral: 'bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700',
  outline: 'bg-transparent border-2 border-neutral-300 dark:border-neutral-700',
};

const textStyles: Record<BadgeVariant, string> = {
  primary: 'text-[#4338CA] dark:text-[#A5B4FC]',
  accent: 'text-[#7E22CE] dark:text-[#D8B4FE]',
  success: 'text-[#047857] dark:text-[#6EE7B7]',
  error: 'text-[#B91C1C] dark:text-[#FCA5A5]',
  warning: 'text-[#B45309] dark:text-[#FCD34D]',
  info: 'text-[#0369A1] dark:text-[#7DD3FC]',
  neutral: 'text-neutral-700 dark:text-neutral-300',
  outline: 'text-neutral-900 dark:text-neutral-50',
};

const dotStyles: Record<BadgeVariant, string> = {
  primary: 'bg-[#4F46E5]',
  accent: 'bg-[#7C3AED]',
  success: 'bg-[#10B981]',
  error: 'bg-[#EF4444]',
  warning: 'bg-[#F59E0B]',
  info: 'bg-[#0EA5E9]',
  neutral: 'bg-neutral-500',
  outline: 'bg-neutral-900 dark:bg-neutral-50',
};

const sizeStyles = {
  xs: {
    container: 'px-2 py-0.5 rounded-md',
    text: 'text-xs tracking-tight',
    dot: 'w-1.5 h-1.5',
  },
  sm: {
    container: 'px-2.5 py-1 rounded-lg',
    text: 'text-xs tracking-tight',
    dot: 'w-2 h-2',
  },
  md: {
    container: 'px-3 py-1.5 rounded-lg',
    text: 'text-sm tracking-tight',
    dot: 'w-2 h-2',
  },
  lg: {
    container: 'px-4 py-2 rounded-xl',
    text: 'text-base tracking-tight',
    dot: 'w-2.5 h-2.5',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  className = '',
  ...props
}) => {
  const containerClass = [
    variantStyles[variant],
    sizeStyles[size].container,
    'inline-flex flex-row items-center justify-center',
    dot && 'gap-1.5',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const textClass = [textStyles[variant], sizeStyles[size].text, 'font-semibold']
    .filter(Boolean)
    .join(' ');

  const dotClass = [dotStyles[variant], sizeStyles[size].dot, 'rounded-full']
    .filter(Boolean)
    .join(' ');

  return (
    <View className={containerClass} {...props}>
      {dot && <View className={dotClass} />}
      {typeof children === 'string' ? (
        <Text className={textClass}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
};
