/**
 * Modern 2025 LoadingSpinner Component
 * Clean loading indicator with refined styling
 */

import React from 'react';
import { ActivityIndicator, Text, View, ViewProps } from 'react-native';

interface LoadingSpinnerProps extends ViewProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'large',
  color = '#059669',
  className = '',
  ...props
}) => {
  return (
    <View className={`flex-1 items-center justify-center ${className}`} {...props}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text className="text-neutral-600 dark:text-neutral-400 mt-4 text-center text-base">
          {message}
        </Text>
      )}
    </View>
  );
};
