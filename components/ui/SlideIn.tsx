/**
 * SlideIn Animation Component
 * Smooth slide-in animation from different directions using Reanimated v4
 */

import React, { useEffect } from 'react';
import { ViewProps } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';

type Direction = 'left' | 'right' | 'top' | 'bottom';

interface SlideInProps extends ViewProps {
  children: React.ReactNode;
  direction?: Direction;
  duration?: number;
  delay?: number;
  distance?: number;
}

export const SlideIn: React.FC<SlideInProps> = ({
  children,
  direction = 'bottom',
  duration = 300,
  delay = 0,
  distance = 50,
  style,
  ...props
}) => {
  const translateX = useSharedValue(
    direction === 'left' ? -distance : direction === 'right' ? distance : 0
  );
  const translateY = useSharedValue(
    direction === 'top' ? -distance : direction === 'bottom' ? distance : 0
  );
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(delay, withTiming(0, { duration }));
    translateY.value = withDelay(delay, withTiming(0, { duration }));
    opacity.value = withDelay(delay, withTiming(1, { duration }));
  }, [translateX, translateY, opacity, duration, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
};
