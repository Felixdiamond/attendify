/**
 * Root Layout
 *
 * Wraps the entire app with authentication and navigation.
 * Provides role-based route protection.
 * Requirements: 1.5, 2.5
 */

import { AuthProvider } from "@/components/AuthProvider";
import { toastConfig } from "@/components/ToastConfig";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useThemeStore } from "@/stores/themeStore";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colorScheme } from "nativewind";
import { useEffect } from "react";
import { LogBox } from "react-native";
import {
    configureReanimatedLogger,
    ReanimatedLogLevel,
} from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import "./globals.css";

// Ignore deprecated SafeAreaView warning caused by react-native-toast-message
LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
]);

export default function RootLayout() {
  const { resolvedTheme } = useResolvedTheme();
  const initializeTheme = useThemeStore((state) => state.initializeTheme);

  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false, // Reanimated runs in strict mode by default
  });

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  useEffect(() => {
    colorScheme.set(resolvedTheme);
  }, [resolvedTheme]);

  return (
      <SafeAreaProvider>
        <AuthProvider>
          {/* Render the matched route / nested layout. Using Slot ensures nested route components
            (including index and grouped routes like (auth), (student), etc.) are mounted inside
            the navigation context, so hooks like useRouter() are available. */}
          <Slot />
        </AuthProvider>
        <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
        <Toast config={toastConfig} />
      </SafeAreaProvider>
  );
}
