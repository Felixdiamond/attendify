import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

export type ErrorType = 
  | 'already_marked'
  | 'too_far'
  | 'time_window'
  | 'not_enrolled'
  | 'permission'
  | 'network'
  | 'generic';

interface ErrorAlertProps {
  message: string;
  type?: ErrorType;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  type = 'generic',
  className = '',
}) => {
  const getErrorConfig = () => {
    switch (type) {
      case 'already_marked':
        return {
          icon: 'checkmark-done-circle' as const,
          iconColor: '#F59E0B',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          textColor: 'text-yellow-800 dark:text-yellow-200',
        };
      case 'too_far':
        return {
          icon: 'location' as const,
          iconColor: '#EF4444',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-800 dark:text-red-200',
        };
      case 'time_window':
        return {
          icon: 'time' as const,
          iconColor: '#F59E0B',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800',
          textColor: 'text-orange-800 dark:text-orange-200',
        };
      case 'not_enrolled':
        return {
          icon: 'school' as const,
          iconColor: '#EF4444',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-800 dark:text-red-200',
        };
      case 'permission':
        return {
          icon: 'lock-closed' as const,
          iconColor: '#F59E0B',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          textColor: 'text-yellow-800 dark:text-yellow-200',
        };
      case 'network':
        return {
          icon: 'cloud-offline' as const,
          iconColor: '#6B7280',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          textColor: 'text-gray-800 dark:text-gray-200',
        };
      default:
        return {
          icon: 'alert-circle' as const,
          iconColor: '#DC2626',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-800 dark:text-red-200',
        };
    }
  };

  const config = getErrorConfig();

  return (
    <View
      className={`${config.bgColor} p-3 rounded-lg border ${config.borderColor} ${className}`}
    >
      <View className="flex-row items-start">
        <Ionicons name={config.icon} size={18} color={config.iconColor} />
        <Text className={`ml-2 text-sm ${config.textColor} flex-1`}>
          {message}
        </Text>
      </View>
    </View>
  );
};

/**
 * Detect error type from error message
 */
export const detectErrorType = (message: string): ErrorType => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('already marked') || lowerMessage.includes('duplicate')) {
    return 'already_marked';
  } else if (lowerMessage.includes('too far') || lowerMessage.includes('distance')) {
    return 'too_far';
  } else if (lowerMessage.includes('window') || lowerMessage.includes('closed') || lowerMessage.includes('time')) {
    return 'time_window';
  } else if (lowerMessage.includes('not enrolled') || lowerMessage.includes('enrollment')) {
    return 'not_enrolled';
  } else if (lowerMessage.includes('permission') || lowerMessage.includes('denied')) {
    return 'permission';
  } else if (lowerMessage.includes('network') || lowerMessage.includes('connection') || lowerMessage.includes('offline')) {
    return 'network';
  }
  
  return 'generic';
};
