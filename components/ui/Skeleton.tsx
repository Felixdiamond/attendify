/**
 * Cinema-Grade Skeleton Loader - 2025
 * Smooth animated placeholders inspired by Linear and Stripe
 * Features: Refined animations, modern styling, bento-grid ready
 */

import React, { useEffect } from 'react';
import { View, ViewProps } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

interface SkeletonProps extends ViewProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  variant = 'rectangular',
  className = '',
  style,
  ...props
}) => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1000 }),
        withTiming(0.4, { duration: 1000 })
      ),
      -1,
      false
    );
  }, [opacity]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return { height: 16, borderRadius: 6 };
      case 'circular':
        return { borderRadius: 9999 };
      case 'rounded':
        return { borderRadius: 16 };
      case 'rectangular':
      default:
        return { borderRadius };
    }
  };

  const variantStyles = getVariantStyles();

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className={`bg-neutral-200 dark:bg-neutral-800 ${className}`}
      style={[
        {
          width: width as any,
          height: height as any,
          ...variantStyles,
        },
        animatedStyle,
        style,
      ]}
      {...props}
    />
  );
};

// Cinema-grade preset skeletons
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 1,
  className = '',
}) => (
  <View className={className}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        variant="text"
        width={index === lines - 1 ? '75%' : '100%'}
        className="mb-3"
      />
    ))}
  </View>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <View className={`bg-white dark:bg-neutral-900 rounded-2xl p-6 border-2 border-neutral-200 dark:border-neutral-800 ${className}`}>
    <View className="flex-row items-start justify-between mb-4">
      <View className="flex-1">
        <Skeleton width="65%" height={22} borderRadius={8} className="mb-3" />
        <Skeleton width="90%" height={16} borderRadius={6} />
      </View>
      <Skeleton width={70} height={28} borderRadius={12} />
    </View>
    <Skeleton width="75%" height={16} borderRadius={6} className="mb-2.5" />
    <Skeleton width="55%" height={16} borderRadius={6} className="mb-5" />
    <Skeleton width="100%" height={48} borderRadius={12} />
  </View>
);
