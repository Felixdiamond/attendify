/**
 * Authentication Layout
 * 
 * Stack navigation for authentication screens (login, register, validate-code).
 * Requirements: 1.5, 2.5
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="register" options={{ title: 'Register' }} />
      <Stack.Screen name="validate-code" options={{ title: 'Validate Code' }} />
    </Stack>
  );
}
