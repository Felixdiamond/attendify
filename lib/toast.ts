/**
 * Toast Notification Utility
 * Elegant toast notifications with consistent styling
 */

import Toast from 'react-native-toast-message';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  title: string;
  message?: string;
  duration?: number;
  position?: 'top' | 'bottom';
}

/**
 * Show a success toast notification
 */
export const showSuccess = (options: ToastOptions) => {
  Toast.show({
    type: 'success',
    text1: options.title,
    text2: options.message,
    position: options.position || 'top',
    visibilityTime: options.duration || 3000,
    topOffset: 60,
    bottomOffset: 40,
  });
};

/**
 * Show an error toast notification
 */
export const showError = (options: ToastOptions) => {
  Toast.show({
    type: 'error',
    text1: options.title,
    text2: options.message,
    position: options.position || 'top',
    visibilityTime: options.duration || 4000,
    topOffset: 60,
    bottomOffset: 40,
  });
};

/**
 * Show an info toast notification
 */
export const showInfo = (options: ToastOptions) => {
  Toast.show({
    type: 'info',
    text1: options.title,
    text2: options.message,
    position: options.position || 'top',
    visibilityTime: options.duration || 3000,
    topOffset: 60,
    bottomOffset: 40,
  });
};

/**
 * Show a warning toast notification
 */
export const showWarning = (options: ToastOptions) => {
  Toast.show({
    type: 'custom_warning',
    text1: options.title,
    text2: options.message,
    position: options.position || 'top',
    visibilityTime: options.duration || 3500,
    topOffset: 60,
    bottomOffset: 40,
  });
};

/**
 * Hide the current toast
 */
export const hideToast = () => {
  Toast.hide();
};

/**
 * Quick shorthand methods
 */
export const toast = {
  success: (title: string, message?: string) => showSuccess({ title, message }),
  error: (title: string, message?: string) => showError({ title, message }),
  info: (title: string, message?: string) => showInfo({ title, message }),
  warning: (title: string, message?: string) => showWarning({ title, message }),
};
