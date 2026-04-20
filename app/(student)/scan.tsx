import { BLEScanner } from "@/components/BLEScanner";
import { SessionCard } from "@/components/SessionCard";
import { Button, FadeIn, LoadingSpinner, SkeletonCard } from "@/components/ui";
import { getSessionByCode, markAttendance } from "@/lib/attendance";
import { DetectedSession } from "@/lib/ble";
import { supabase } from "@/lib/supabase";
import { SessionWithCourse } from "@/types/database.types";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SessionWithDetails extends DetectedSession {
  details: SessionWithCourse | null;
  isLoading: boolean;
}

export default function ScanScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [detectedSessions, setDetectedSessions] = useState<
    Map<string, SessionWithDetails>
  >(new Map());
  // Track which session IDs have been marked so remounted cards preserve state
  const [markedSessionIds, setMarkedSessionIds] = useState<Set<string>>(
    new Set(),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  // Fetch session details when a new session is detected
  const fetchSessionDetails = useCallback(async (sessionCode: string) => {
    try {
      setDetectedSessions((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(sessionCode);
        if (existing) {
          updated.set(sessionCode, { ...existing, isLoading: true });
        }
        return updated;
      });

      // Fetch session details by session code
      const details = await getSessionByCode(sessionCode);

      setDetectedSessions((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(sessionCode);
        if (existing) {
          updated.set(sessionCode, {
            ...existing,
            details,
            isLoading: false,
          });
        }
        return updated;
      });
    } catch (error) {
      console.error("Error fetching session details:", error);
      setDetectedSessions((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(sessionCode);
        if (existing) {
          updated.set(sessionCode, { ...existing, isLoading: false });
        }
        return updated;
      });
    }
  }, []);

  // Handle detected sessions from BLE scanner
  const handleSessionsDetected = useCallback(
    (sessions: DetectedSession[]) => {
      setDetectedSessions((prev) => {
        const updated = new Map(prev);

        // Add or update detected sessions
        for (const session of sessions) {
          const existing = updated.get(session.sessionCode);
          if (existing) {
            // Update existing session
            updated.set(session.sessionCode, {
              ...existing,
              ...session,
            });
          } else {
            // New session detected
            updated.set(session.sessionCode, {
              ...session,
              details: null,
              isLoading: false,
            });
            // Fetch details for new session
            fetchSessionDetails(session.sessionCode);
          }
        }

        // Remove sessions that are no longer detected
        const currentCodes = new Set(sessions.map((s) => s.sessionCode));
        for (const code of updated.keys()) {
          if (!currentCodes.has(code)) {
            updated.delete(code);
          }
        }

        return updated;
      });
    },
    [fetchSessionDetails],
  );

  // Mark attendance for a session
  const handleMarkAttendance = useCallback(async (sessionId: string) => {
    // Optimistically mark as done so button stays marked even across re-renders
    setMarkedSessionIds((prev) => new Set(prev).add(sessionId));
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error(
          "Location permission is required to mark attendance. Please enable location access in your device settings.",
        );
      }

      // Get current location with timeout
      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Location request timed out. Please ensure GPS is enabled.",
                ),
              ),
            15000,
          ),
        ),
      ]);

      // Mark attendance
      await markAttendance({
        session_id: sessionId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      Alert.alert("Success", "Your attendance has been marked successfully!", [
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Error marking attendance:", error);

      // Revert optimistic mark on failure
      setMarkedSessionIds((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });

      // Handle specific error types
      if (error instanceof Error) {
        // Check for location-specific errors
        if (
          error.message.includes("Location") ||
          error.message.includes("GPS")
        ) {
          throw error; // Re-throw location errors as-is
        }
      }

      throw error; // Re-throw to let SessionCard handle the error display
    }
  }, []);

  // Toggle scanning
  const toggleScanning = useCallback(() => {
    setIsScanning((prev) => !prev);
  }, []);

  // Refresh sessions
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    // Clear current sessions
    setDetectedSessions(new Map());

    // Restart scanning
    if (isScanning) {
      setIsScanning(false);
      setTimeout(() => {
        setIsScanning(true);
        setIsRefreshing(false);
      }, 500);
    } else {
      setIsRefreshing(false);
    }
  }, [isScanning]);

  // Auto-start scanning on mount
  // Removed to prevent scanning immediately when the app opens
  useEffect(() => {
    return () => {
      setIsScanning(false);
    };
  }, []);

  // Subscribe to realtime session deactivation so we remove stopped sessions immediately
  const activeSessionIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    // Track active session IDs
    const ids = new Set<string>();
    for (const s of detectedSessions.values()) {
      if (s.details?.id) ids.add(s.details.id);
    }
    activeSessionIdsRef.current = ids;
  }, [detectedSessions]);

  useEffect(() => {
    const channel = supabase
      .channel("scan-session-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "attendance_sessions",
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated && updated.is_active === false) {
            // Session was stopped - remove it from detected sessions
            setDetectedSessions((prev) => {
              const next = new Map(prev);
              let changed = false;
              for (const [code, session] of next.entries()) {
                if (session.details?.id === updated.id) {
                  next.delete(code);
                  changed = true;
                }
              }
              return changed ? next : prev;
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sessionsArray = Array.from(detectedSessions.values());
  const hasActiveSessions = sessionsArray.length > 0;

  return (
    <View
      style={{ flex: 1, paddingBottom: insets.bottom }}
      className="bg-neutral-50 dark:bg-neutral-950"
    >
      <View className="flex-1">
        {/* Header - Cinema-grade */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-4xl font-bold text-neutral-900 dark:text-neutral-0 mb-3 tracking-tighter leading-tight">
            Scan for Sessions
          </Text>
          <Text className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Find nearby attendance sessions to mark your presence
          </Text>
        </View>

        {/* BLE Scanner Status */}
        <View className="px-6 py-3">
          <BLEScanner
            onSessionDetected={handleSessionsDetected}
            isScanning={isScanning}
            onScanningStateChange={setIsScanning}
          />
        </View>

        {/* Scan Toggle Button - Bold & refined */}
        <View className="px-6 pb-4">
          <Button
            variant={isScanning ? "error" : "primary"}
            size="lg"
            onPress={toggleScanning}
            fullWidth
          >
            {isScanning ? "Stop Scanning" : "Start Scanning"}
          </Button>
        </View>

        {/* Sessions List */}
        <View className="flex-1 px-6">
          {!isScanning && !hasActiveSessions ? (
            <View className="flex-1 items-center justify-center py-12">
              <Text className="text-base text-neutral-500 dark:text-neutral-400 text-center mb-4 tracking-tight">
                Start scanning to find nearby attendance sessions
              </Text>
            </View>
          ) : isScanning && !hasActiveSessions ? (
            <LoadingSpinner
              message="Searching for nearby sessions..."
              className="py-12"
            />
          ) : (
            <FlatList
              data={sessionsArray}
              keyExtractor={(item) => item.sessionCode}
              renderItem={({ item, index }) => {
                if (!item.details) {
                  // Loading state while fetching details
                  return <SkeletonCard className="mb-3" />;
                }

                return (
                  <FadeIn delay={index * 50}>
                    <SessionCard
                      session={item.details}
                      distance={item.distance}
                      rssi={item.rssi}
                      onMarkAttendance={handleMarkAttendance}
                      initiallyMarked={markedSessionIds.has(item.details.id)}
                    />
                  </FadeIn>
                );
              }}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor="#3B82F6"
                />
              }
              ListEmptyComponent={
                <View className="items-center justify-center py-12">
                  <Text className="text-base text-neutral-500 dark:text-neutral-400 text-center tracking-tight">
                    No sessions detected nearby
                  </Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          )}
        </View>
      </View>
    </View>
  );
}
