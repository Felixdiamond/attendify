/**
 * HOC (Head of Course) Layout
 *
 * Tab navigation for HOC role screens.
 * Requirements: 1.5, 2.5
 */

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Colors } from '@/constants/Colors';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HOCLayout() {
  const { isDark } = useResolvedTheme();
  const { bottom } = useSafeAreaInsets();
  const surface = isDark ? Colors.background.dark : Colors.background.light;
  const barBackground = isDark ? Colors.neutral[900] : '#FFFFFF';
  const mutedForeground = isDark ? Colors.neutral[400] : Colors.neutral[500];

  return (
    <ProtectedRoute allowedRoles={['hoc']}>
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
          name="students"
          options={{
            title: 'Manage Students',
            tabBarLabel: 'Students',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="semester"
          options={{
            title: 'Semester Management',
            tabBarLabel: 'Semester',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="auto-rules"
          options={{
            title: 'Auto-Enrollment Rules',
            tabBarLabel: 'Rules',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid" size={size} color={color} />
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
        <Tabs.Screen name="enroll" options={{ href: null, title: 'Enroll Students' }} />
      </Tabs>
    </ProtectedRoute>
  );
}
