/**
 * Student Layout
 *
 * Tab navigation for student role screens.
 * Requirements: 1.5, 2.5
 */

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Colors } from '@/constants/Colors';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StudentLayout() {
  const { isDark } = useResolvedTheme();
  const { bottom } = useSafeAreaInsets();
  const surface = isDark ? Colors.background.dark : Colors.background.light;
  const barBackground = isDark ? Colors.neutral[900] : '#FFFFFF';
  const mutedForeground = isDark ? Colors.neutral[400] : Colors.neutral[500];

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: Colors.primary.DEFAULT,
          tabBarInactiveTintColor: mutedForeground,
          tabBarStyle: {
            backgroundColor: barBackground,
            borderTopWidth: 1,
            borderTopColor: isDark ? Colors.neutral[800] : Colors.neutral[200],
            paddingBottom: bottom + 8,
            paddingTop: 8,
            height: 56 + bottom,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          headerStyle: { backgroundColor: surface },
          headerShadowVisible: false,
          headerTintColor: isDark ? Colors.text.inverse : Colors.text.primary,
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        }}
      >
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan for Sessions',
            tabBarLabel: 'Scan',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="scan" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Attendance History',
            tabBarLabel: 'History',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'My Statistics',
            tabBarLabel: 'Stats',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}
