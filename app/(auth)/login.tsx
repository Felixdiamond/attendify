/**
 * Login Screen
 *
 * Allows users to login with email and password.
 * Requirements: 1.5, 2.5
 */

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { login } from "@/lib/auth";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email || !password) {
      toast.warning(
        "Missing Information",
        "Please enter both email and password",
      );
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if ("error" in result) {
      toast.error("Login Failed", result.error.message);
      return;
    }

    // Success notification
    toast.success("Welcome Back!", `Logged in as ${result.user.role}`);

    // Store auth state (await to keep flow consistent; store updates immediately)
    await setAuth(result.user, result.session);

    // Navigate based on role
    switch (result.user.role) {
      case "student":
        router.replace("/(student)/scan");
        break;
      case "lecturer":
        router.replace("/(lecturer)/courses");
        break;
      case "hoc":
        router.replace("/(hoc)/students");
        break;
    }
  };

  return (
    <View
      style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
      className="bg-neutral-50 dark:bg-neutral-950"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center"
        keyboardShouldPersistTaps="handled"
      >
        <Container centered className="px-6 py-8">
          {/* Header Section - Cinema-grade typography */}
          <View className="mb-10">
            <Text className="text-5xl font-bold text-neutral-900 dark:text-neutral-0 mb-3 tracking-tighter leading-tight">
              Welcome Back
            </Text>
            <Text className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Sign in to continue to Attendify
            </Text>
          </View>

          {/* Form Section - Refined inputs with better spacing */}
          <View className="gap-y-1">
            <Input
              label="Email"
              placeholder="your.email@st.lasu.edu.ng"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* CTA Button - Bold and prominent */}
          <View className="mt-8">
            <Button
              variant="primary"
              size="lg"
              onPress={handleLogin}
              disabled={loading}
              loading={loading}
              fullWidth
            >
              Sign In
            </Button>
          </View>

          {/* Footer Link - Refined typography */}
          <View className="flex-row justify-center mt-8 items-center">
            <Text className="text-base text-neutral-600 dark:text-neutral-400">
              Don&apos;t have an account?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/register")}
              activeOpacity={0.7}
            >
              <Text className="text-[#4F46E5] dark:text-[#6366F1] font-semibold text-base">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </Container>
      </ScrollView>
    </View>
  );
}
