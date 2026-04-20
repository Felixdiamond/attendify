/**
 * ScaleIn Animation Component
 * Smooth scale-in effect with optional fade using Reanimated v4
 */

import React, { useEffect } from 'react';
import { ViewProps } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface ScaleInProps extends ViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  initialScale?: number;
  withFade?: boolean;
}

export const ScaleIn: React.FC<ScaleInProps> = ({
  children,
  duration = 300,
  delay = 0,
  initialScale = 0.8,
  withFade = true,
  style,
  ...props
}) => {
  const scale = useSharedValue(initialScale);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSpring(1, {
        damping: 15,
        stiffness: 150,
      })
    );
    if (withFade) {
      opacity.value = withDelay(delay, withTiming(1, { duration }));
    }
  }, [scale, opacity, duration, delay, withFade]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: withFade ? opacity.value : 1,
  }));

  return (
    <Animated.View style={[animatedStyle, style]} {...props}>
      {children}
    </Animated.View>
  );
};
