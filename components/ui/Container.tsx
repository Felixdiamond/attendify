/**
 * Modern 2025 Container Component
 * Responsive container with generous max-width for comfortable reading
 */

import { isTablet } from '@/lib/responsive';
import React from 'react';
import { View, ViewProps } from 'react-native';

interface ContainerProps extends ViewProps {
  children: React.ReactNode;
  centered?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Container: React.FC<ContainerProps> = ({
  children,
  centered = false,
  maxWidth = 'lg',
  className = '',
  style,
  ...props
}) => {
  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-3xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  const containerClass = [
    'w-full',
    isTablet && maxWidthClasses[maxWidth],
    centered && isTablet && 'mx-auto',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View className={containerClass} style={style} {...props}>
      {children}
    </View>
  );
};
