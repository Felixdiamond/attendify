import { ProximityLevel } from '@/lib/ble';
import React from 'react';
import { Text, View } from 'react-native';

interface ProximityIndicatorProps {
  distance: ProximityLevel;
  rssi?: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showRSSI?: boolean;
}

export const ProximityIndicator: React.FC<ProximityIndicatorProps> = ({
  distance,
  rssi,
  size = 'medium',
  showLabel = true,
  showRSSI = false,
}) => {
  const getProximityConfig = () => {
    switch (distance) {
      case 'immediate':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-700 dark:text-green-300',
          borderColor: 'border-green-500',
          label: 'Very Close',
          description: 'Within 1 meter',
        };
      case 'near':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-700 dark:text-yellow-300',
          borderColor: 'border-yellow-500',
          label: 'Near',
          description: '1-5 meters',
        };
      case 'far':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700 dark:text-red-300',
          borderColor: 'border-red-500',
          label: 'Far',
          description: 'More than 5 meters',
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          dot: 'w-2 h-2',
          container: 'px-2 py-1',
          text: 'text-xs',
        };
      case 'medium':
        return {
          dot: 'w-3 h-3',
          container: 'px-3 py-1.5',
          text: 'text-sm',
        };
      case 'large':
        return {
          dot: 'w-4 h-4',
          container: 'px-4 py-2',
          text: 'text-base',
        };
    }
  };

  const config = getProximityConfig();
  const sizeClasses = getSizeClasses();

  if (!showLabel) {
    // Just show the colored dot
    return (
      <View className={`${config.color} ${sizeClasses.dot} rounded-full`} />
    );
  }

  return (
    <View
      className={`flex-row items-center ${sizeClasses.container} rounded-full border ${config.borderColor} bg-white dark:bg-gray-800`}
    >
      <View className={`${config.color} ${sizeClasses.dot} rounded-full mr-2`} />
      <View>
        <Text className={`${config.textColor} ${sizeClasses.text} font-semibold`}>
          {config.label}
        </Text>
        {showRSSI && rssi !== undefined && (
          <Text className={`${config.textColor} text-xs`} style={{ opacity: 0.75 }}>
            RSSI: {rssi} dBm
          </Text>
        )}
      </View>
    </View>
  );
};

interface ProximityBadgeProps {
  distance: ProximityLevel;
  className?: string;
}

export const ProximityBadge: React.FC<ProximityBadgeProps> = ({
  distance,
  className = '',
}) => {
  const getConfig = () => {
    switch (distance) {
      case 'immediate':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-800 dark:text-green-200',
          label: 'Very Close',
          icon: '●',
        };
      case 'near':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-800 dark:text-yellow-200',
          label: 'Near',
          icon: '●',
        };
      case 'far':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-800 dark:text-red-200',
          label: 'Far',
          icon: '●',
        };
    }
  };

  const config = getConfig();

  return (
    <View className={`${config.bg} px-2 py-1 rounded-md ${className}`}>
      <Text className={`${config.text} text-xs font-medium`}>
        {config.icon} {config.label}
      </Text>
    </View>
  );
};
