import { ProximityLevel } from "@/lib/ble";
import { SessionWithCourse } from "@/types/database.types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { ErrorAlert, detectErrorType } from "./ErrorAlert";
import { ProximityBadge } from "./ProximityIndicator";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { ScaleIn } from "./ui/ScaleIn";

interface SessionCardProps {
  session: SessionWithCourse;
  distance: ProximityLevel;
  rssi?: number;
  onMarkAttendance: (sessionId: string) => Promise<void>;
  /** If true on mount, the button renders already-marked (survives BLE re-detection) */
  initiallyMarked?: boolean;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  distance,
  rssi,
  onMarkAttendance,
  initiallyMarked = false,
}) => {
  const [isMarking, setIsMarking] = useState(false);
  const [isMarked, setIsMarked] = useState(initiallyMarked);
  const [error, setError] = useState<string | null>(null);

  const handleMarkAttendance = async () => {
    try {
      setIsMarking(true);
      setError(null);

      await onMarkAttendance(session.id);

      setIsMarked(true);
    } catch (err) {
      console.error("Error marking attendance:", err);

      // Extract user-friendly error message
      let errorMessage = "Failed to mark attendance";

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      setError(errorMessage);

      // Auto-clear error after 10 seconds
      setTimeout(() => {
        setError(null);
      }, 10000);
    } finally {
      setIsMarking(false);
    }
  };

  const canMarkAttendance = distance === "immediate" || distance === "near";

  return (
    <ScaleIn duration={400}>
      <Card variant="elevated" className="mb-4">
        {/* Course Info */}
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {session.course.code}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {session.course.title}
            </Text>
          </View>

          <ProximityBadge distance={distance} />
        </View>

        {/* Lecturer Info */}
        <View className="flex-row items-center mb-3">
          <Ionicons name="person" size={16} color="#6B7280" />
          <Text className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            {session.lecturer.first_name} {session.lecturer.last_name}
          </Text>
        </View>

        {/* Session Time */}
        <View className="flex-row items-center mb-3">
          <Ionicons name="time" size={16} color="#6B7280" />
          <Text className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Started{" "}
            {new Date(session.started_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        {/* RSSI Debug Info (optional) */}
        {rssi !== undefined && __DEV__ && (
          <View className="mb-3 bg-gray-100 dark:bg-gray-700 p-2 rounded">
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Signal: {rssi} dBm
            </Text>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <ErrorAlert
            message={error}
            type={detectErrorType(error)}
            className="mb-3"
          />
        )}

        {/* Success Message */}
        {isMarked && (
          <View
            className="mb-3 p-3 rounded-lg border border-success-200 dark:border-success-800"
            style={{ backgroundColor: "#f0fdf4" }}
          >
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text className="ml-2 text-sm text-success-700 dark:text-success-300 font-medium">
                Attendance marked successfully!
              </Text>
            </View>
          </View>
        )}

        {/* Mark Attendance Button */}
        <Button
          variant={
            isMarked ? "success" : canMarkAttendance ? "primary" : "secondary"
          }
          onPress={handleMarkAttendance}
          disabled={!canMarkAttendance || isMarked}
          loading={isMarking}
          fullWidth
        >
          <View className="flex-row items-center justify-center">
            {!isMarking && (
              <Ionicons
                name={
                  isMarked
                    ? "checkmark-circle"
                    : canMarkAttendance
                      ? "checkmark"
                      : "lock-closed"
                }
                size={20}
                color="#FFFFFF"
              />
            )}
            <Text className="ml-2 text-white font-semibold">
              {isMarked
                ? "Marked"
                : canMarkAttendance
                  ? "Mark Attendance"
                  : "Move Closer to Mark"}
            </Text>
          </View>
        </Button>

        {!canMarkAttendance && !isMarked && (
          <Text className="mt-2 text-xs text-center text-gray-600 dark:text-gray-400">
            You need to be closer to the lecturer to mark attendance
          </Text>
        )}
      </Card>
    </ScaleIn>
  );
};
