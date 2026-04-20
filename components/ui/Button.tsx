/**
 * Cinema-Grade Button Component - 2025
 * Peak UI design inspired by Linear, Stripe, and Mobbins
 * Features: Bold colors, perfect spacing, micro-interactions, zero gradients
 */

import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'success' | 'error' | 'outline' | 'ghost' | 'elevated';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[#4F46E5] active:bg-[#4338CA] border-2 border-[#4F46E5] active:border-[#4338CA]',
  accent: 'bg-[#7C3AED] active:bg-[#6D28D9] border-2 border-[#7C3AED] active:border-[#6D28D9]',
  secondary: 'bg-neutral-100 dark:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-750 border-2 border-neutral-200 dark:border-neutral-700',
  success: 'bg-[#10B981] active:bg-[#059669] border-2 border-[#10B981] active:border-[#059669]',
  error: 'bg-[#EF4444] active:bg-[#DC2626] border-2 border-[#EF4444] active:border-[#DC2626]',
  outline: 'bg-transparent border-2 border-neutral-300 dark:border-neutral-700 active:border-[#4F46E5] dark:active:border-[#6366F1]',
  ghost: 'bg-transparent active:bg-neutral-100 dark:active:bg-neutral-850 border-2 border-transparent',
  elevated: 'bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800',
};

const textStyles: Record<ButtonVariant, string> = {
  primary: 'text-white',
  accent: 'text-white',
  secondary: 'text-neutral-900 dark:text-neutral-50',
  success: 'text-white',
  error: 'text-white',
  outline: 'text-neutral-900 dark:text-neutral-50',
  ghost: 'text-[#4F46E5] dark:text-[#6366F1]',
  elevated: 'text-neutral-900 dark:text-neutral-50',
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: {
    container: 'py-2 px-4 rounded-lg min-h-[36px]',
    text: 'text-sm tracking-tight',
  },
  md: {
    container: 'py-3 px-5 rounded-xl min-h-[44px]',
    text: 'text-base tracking-tight',
  },
  lg: {
    container: 'py-4 px-6 rounded-xl min-h-[52px]',
    text: 'text-base tracking-tight',
  },
  xl: {
    container: 'py-5 px-8 rounded-2xl min-h-[60px]',
    text: 'text-lg tracking-tight',
  },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className = '',
  ...props
}) => {
  const isDisabled = disabled || loading;

  const containerClass = [
    variantStyles[variant],
    sizeStyles[size].container,
    'items-center justify-center flex-row',
    fullWidth && 'w-full',
    'transition-all duration-150',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const textClass = [
    textStyles[variant],
    sizeStyles[size].text,
    'font-semibold text-center',
  ]
    .filter(Boolean)
    .join(' ');

  const spinnerColor = 
    variant === 'primary' ? '#FFFFFF' :
    variant === 'accent' ? '#FFFFFF' :
    variant === 'success' ? '#FFFFFF' :
    variant === 'error' ? '#FFFFFF' :
    '#4F46E5';

  const elevatedShadowStyle = variant === 'elevated' ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  } : {};

  const disabledOpacityStyle = isDisabled ? { opacity: 0.4 } : {};

  const combinedStyle = { ...elevatedShadowStyle, ...disabledOpacityStyle };

  return (
    <TouchableOpacity
      className={containerClass}
      style={combinedStyle}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {icon && iconPosition === 'left' && <View>{icon}</View>}
          {typeof children === 'string' ? (
            <Text className={textClass}>{children}</Text>
          ) : (
            children
          )}
          {icon && iconPosition === 'right' && <View>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};
