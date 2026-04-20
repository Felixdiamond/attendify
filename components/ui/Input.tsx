/**
 * Cinema-Grade Input Component - 2025
 * Inspired by Linear, Stripe, and Vercel forms
 * Features: Bold borders, refined focus states, smooth micro-interactions
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  size?: 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  size = 'md',
  icon,
  className = '',
  secureTextEntry,
  ...props
}) => {
  const sizeClasses = {
    md: 'px-4 py-3.5 text-base min-h-[48px]',
    lg: 'px-5 py-4 text-lg min-h-[56px]',
  };

  const [isFocused, setIsFocused] = useState(false);
  const isPasswordField = Boolean(secureTextEntry);
  const [isSecure, setIsSecure] = useState(isPasswordField);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const toggleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setIsSecure(isPasswordField);
  }, [isPasswordField]);

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      damping: 16,
      stiffness: 180,
      useNativeDriver: false,
    }).start();
  }, [isFocused, focusAnim]);

  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: isSecure ? 1 : 0,
      damping: 12,
      stiffness: 150,
      useNativeDriver: true,
    }).start();
  }, [isSecure, toggleAnim]);

  const iconName = useMemo(() => (isSecure ? 'eye-off' : 'eye'), [isSecure]);
  const hasRightElement = isPasswordField || icon;
  const paddingRight = hasRightElement ? 'pr-12' : '';

  const getBorderColor = () => {
    if (error) return '#EF4444';
    if (isFocused) return '#4F46E5';
    return '#E5E5E5';
  };

  const inputClass = [
    'border-2 rounded-xl',
    sizeClasses[size],
    paddingRight,
    icon && !isPasswordField && 'pl-12',
    error
      ? 'border-[#EF4444] bg-red-50/30 dark:bg-red-950/20'
      : 'bg-white dark:bg-neutral-900',
    'text-neutral-900 dark:text-neutral-50 font-medium',
    'transition-colors duration-150',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View className="mb-5">
      {label && (
        <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2.5 tracking-tight">
          {label}
        </Text>
      )}
      <Animated.View
        style={{
          borderColor: focusAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [getBorderColor(), '#4F46E5'],
          }),
        }}
        className="relative rounded-xl"
      >
        {icon && !isPasswordField && (
          <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            {icon}
          </View>
        )}
        <TextInput
          className={inputClass}
          placeholderTextColor="#A3A3A3"
          secureTextEntry={isPasswordField ? isSecure : secureTextEntry}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {isPasswordField && (
          <TouchableOpacity
            activeOpacity={0.7}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2"
            onPress={() => setIsSecure((prev) => !prev)}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    scale: toggleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.92, 1],
                    }),
                  },
                ],
              }}
            >
              <Ionicons 
                name={iconName as any} 
                size={22} 
                color={isSecure ? '#A3A3A3' : '#4F46E5'} 
              />
            </Animated.View>
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && (
        <View className="flex-row items-center mt-2 gap-1.5">
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text className="text-sm text-[#EF4444] font-medium tracking-tight">{error}</Text>
        </View>
      )}
      {helperText && !error && (
        <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 tracking-tight">
          {helperText}
        </Text>
      )}
    </View>
  );
};
