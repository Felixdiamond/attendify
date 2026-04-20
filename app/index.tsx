/**
 * Landing Page
 *
 * Redirects to appropriate screen based on auth state.
 * Shows welcome screen for unauthenticated users.
 * Requirements: 1.5, 2.5
 */

import { Colors } from "@/constants/Colors";
import {
    useAuthInitialized,
    useAuthStore,
    useIsAuthenticated,
} from "@/stores/authStore";
import { Ionicons } from "@expo/vector-icons";
import { Link, Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Pressable,
    Text,
    View,
} from "react-native";

export default function Index() {
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const isAuthenticated = useIsAuthenticated();
  const initialized = useAuthInitialized();
  const user = useAuthStore((state) => state.user);
  const [showWelcome, setShowWelcome] = useState(false);

  // Refined animations
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (!initialized) return;

    if (isAuthenticated && user) {
      setShowWelcome(false);
    } else {
      setShowWelcome(true);

      // Smooth staggered entrance
      Animated.sequence([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(contentSlide, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      const timer = setTimeout(() => setShouldRedirect(true), 3500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, initialized, user]);

  // Loading state
  if (!initialized) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Colors.neutral[950],
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: Colors.neutral[900],
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Ionicons name="finger-print" size={28} color={Colors.primary[400]} />
        </View>
        <ActivityIndicator size="small" color={Colors.neutral[600]} />
      </View>
    );
  }

  // Welcome screen
  if (showWelcome && !isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.neutral[950] }}>
        {/* Subtle top glow */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: "25%",
            right: "25%",
            height: 300,
            backgroundColor: Colors.primary[600],
            opacity: 0.06,
            borderBottomLeftRadius: 200,
            borderBottomRightRadius: 200,
          }}
        />

        <View
          style={{
            flex: 1,
            paddingHorizontal: 28,
            paddingTop: 100,
            paddingBottom: 40,
          }}
        >
          {/* Logo */}
          <Animated.View
            style={{
              alignItems: "center",
              marginBottom: 56,
              transform: [{ scale: logoScale }],
            }}
          >
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 28,
                backgroundColor: Colors.neutral[900],
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: Colors.neutral[800],
              }}
            >
              <Ionicons
                name="finger-print"
                size={42}
                color={Colors.primary[400]}
              />
            </View>
          </Animated.View>

          {/* Content */}
          <Animated.View
            style={{
              opacity: contentOpacity,
              transform: [{ translateY: contentSlide }],
            }}
          >
            {/* Title */}
            <Text
              style={{
                fontSize: 36,
                fontWeight: "700",
                color: Colors.neutral[50],
                letterSpacing: -0.8,
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              Attendify
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: Colors.neutral[500],
                textAlign: "center",
                lineHeight: 24,
                paddingHorizontal: 20,
                marginBottom: 48,
              }}
            >
              Attendance verification powered by proximity detection
            </Text>

            {/* Features */}
            <View
              style={{
                backgroundColor: Colors.neutral[900],
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: Colors.neutral[850],
                marginBottom: 48,
              }}
            >
              {[
                {
                  icon: "radio",
                  label: "Bluetooth proximity",
                  desc: "Automatic detection",
                },
                {
                  icon: "location",
                  label: "Location verified",
                  desc: "GPS confirmation",
                },
                {
                  icon: "flash",
                  label: "Real-time sync",
                  desc: "Instant updates",
                },
              ].map((item, i) => (
                <View
                  key={item.label}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    borderBottomWidth: i < 2 ? 1 : 0,
                    borderBottomColor: Colors.neutral[850],
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: Colors.neutral[850],
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={Colors.primary[400]}
                    />
                  </View>
                  <View style={{ marginLeft: 14, flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: Colors.neutral[200],
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: Colors.neutral[500],
                        marginTop: 2,
                      }}
                    >
                      {item.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* CTA */}
          <Animated.View style={{ opacity: contentOpacity }}>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                {({ pressed }) => (
                  <View
                    style={{
                      backgroundColor: pressed
                        ? Colors.primary[700]
                        : Colors.primary.DEFAULT,
                      paddingVertical: 17,
                      borderRadius: 14,
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 16,
                        fontWeight: "600",
                        letterSpacing: 0.2,
                      }}
                    >
                      Get Started
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginLeft: 8 }}
                    />
                  </View>
                )}
              </Pressable>
            </Link>

            <Text
              style={{
                textAlign: "center",
                marginTop: 20,
                fontSize: 13,
                color: Colors.neutral[600],
              }}
            >
              Secure • Private • Reliable
            </Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  // Default loading state during redirect
  // Authenticated users: redirect to role home
  if (initialized && isAuthenticated && user) {
    const role = user.role;
    let href:
      | "/"
      | "/(student)/scan"
      | "/(lecturer)/courses"
      | "/(hoc)/students" = "/";
    switch (role) {
      case "student":
        href = "/(student)/scan";
        break;
      case "lecturer":
        href = "/(lecturer)/courses";
        break;
      case "hoc":
        href = "/(hoc)/students";
        break;
    }
    return <Redirect href={href} />;
  }

  // Show delayed redirect for unauthenticated users
  if (shouldRedirect && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: "#fff" }}
    >
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}
