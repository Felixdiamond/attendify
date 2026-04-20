/**
 * Custom Toast Configuration
 * Beautiful, animated toast notifications
 */

import React from 'react';
import { Text, View } from 'react-native';
import type { ToastConfig } from 'react-native-toast-message';

export const toastConfig: ToastConfig = {
  success: ({ text1, text2 }) => (
    <View 
      className="w-[90%] bg-white dark:bg-gray-800 rounded-2xl p-4 border-l-4 border-success-500 flex-row items-start"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10
      }}
    >
      <View 
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: '#dcfce7' }}
      >
        <Text className="text-2xl">✓</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-gray-900 dark:text-white mb-1">
          {text1}
        </Text>
        {text2 && (
          <Text className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {text2}
          </Text>
        )}
      </View>
    </View>
  ),

  error: ({ text1, text2 }) => (
    <View 
      className="w-[90%] bg-white dark:bg-gray-800 rounded-2xl p-4 border-l-4 border-error-500 flex-row items-start"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10
      }}
    >
      <View 
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: '#fee2e2' }}
      >
        <Text className="text-2xl">✕</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-gray-900 dark:text-white mb-1">
          {text1}
        </Text>
        {text2 && (
          <Text className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {text2}
          </Text>
        )}
      </View>
    </View>
  ),

  info: ({ text1, text2 }) => (
    <View 
      className="w-[90%] bg-white dark:bg-gray-800 rounded-2xl p-4 border-l-4 border-primary-500 flex-row items-start"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10
      }}
    >
      <View 
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: '#dbeafe' }}
      >
        <Text className="text-2xl">ℹ</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-gray-900 dark:text-white mb-1">
          {text1}
        </Text>
        {text2 && (
          <Text className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {text2}
          </Text>
        )}
      </View>
    </View>
  ),

  custom_warning: ({ text1, text2 }) => (
    <View 
      className="w-[90%] bg-white dark:bg-gray-800 rounded-2xl p-4 border-l-4 border-warning-500 flex-row items-start"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10
      }}
    >
      <View 
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: '#fef3c7' }}
      >
        <Text className="text-2xl">⚠</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-gray-900 dark:text-white mb-1">
          {text1}
        </Text>
        {text2 && (
          <Text className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {text2}
          </Text>
        )}
      </View>
    </View>
  ),
};
