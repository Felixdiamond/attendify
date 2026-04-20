import { AnimatedAttendanceItem } from "@/components/AnimatedAttendanceItem";
import { BLEBeaconBroadcaster } from "@/components/BLEBeaconBroadcaster";
import {
    getSessionAttendance,
    getSessionDetails,
    stopSession,
    subscribeToSession,
} from "@/lib/attendance";
import { getCourseEnrollmentCount } from "@/lib/course";
import type {
    AttendanceRecordWithStudent,
    SessionWithCourse,
} from "@/types/database.types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function LiveAttendanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SessionWithCourse | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecordWithStudent[]
  >([]);
  const [newRecordIds, setNewRecordIds] = useState<Set<string>>(new Set());
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick every second so the countdown timer updates in real time
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Stable callback so BLEBeaconBroadcaster effect doesn't re-run on every render
  const handleBroadcastError = useCallback((error: Error) => {
    console.error("📡 [LiveAttendance] BLE broadcast error:", error);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      Alert.alert("Error", "Session ID not provided");
      router.back();
      return;
    }

    loadSessionData();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to real-time updates
    const unsubscribe = subscribeToSession(sessionId, (newRecord) => {
      // Add to records with animation
      setAttendanceRecords((prev) => [newRecord, ...prev]);

      // Mark as new for animation
      setNewRecordIds((prev) => new Set(prev).add(newRecord.id));

      // Remove "new" status after animation completes
      setTimeout(() => {
        setNewRecordIds((prev) => {
          const updated = new Set(prev);
          updated.delete(newRecord.id);
          return updated;
        });
      }, 2000);
    });

    return () => {
      unsubscribe();
    };
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      // Fetch session details
      const sessionData = await getSessionDetails(sessionId);
      console.log(
        "🔍 [LiveAttendance] getSessionDetails response for",
        sessionId,
        sessionData,
      );
      if (!sessionData) {
        Alert.alert("Error", "Session not found");
        router.back();
        return;
      }
      setSession(sessionData);

      // Fetch attendance records
      const records = await getSessionAttendance(sessionId);
      console.log(
        "🔍 [LiveAttendance] getSessionAttendance returned",
        records?.length,
        "records",
      );
      setAttendanceRecords(records);

      // Fetch total enrolled students using RPC count helper to avoid RLS recursion
      const count = await getCourseEnrollmentCount(sessionData.course.id);
      console.log(
        "🔍 [LiveAttendance] getCourseEnrollmentCount returned",
        count,
      );
      setTotalStudents(count || 0);
    } catch (error) {
      console.error("Error loading session data:", error);
      Alert.alert("Error", "Failed to load session data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSessionData();
  };

  const handleStopSession = () => {
    Alert.alert(
      "Stop Session",
      "Are you sure you want to stop this attendance session? Students will no longer be able to mark attendance.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop",
          onPress: async () => {
            setStopping(true);
            try {
              await stopSession(sessionId);
              Alert.alert("Success", "Attendance session stopped", [
                {
                  text: "OK",
                  onPress: () => router.back(),
                },
              ]);
            } catch (error: any) {
              console.error("Error stopping session:", error);
              Alert.alert("Error", error.message || "Failed to stop session");
              setStopping(false);
            }
          },
        },
      ],
    );
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = () => {
    if (!session) return "";
    const start = new Date(session.started_at);
    const end = new Date(session.ends_at);
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    return `${minutes} min`;
  };

  const calculateProgress = () => {
    if (totalStudents === 0) return 0;
    return (attendanceRecords.length / totalStudents) * 100;
  };

  const getTimeRemaining = () => {
    if (!session) return "";
    const end = new Date(session.ends_at);
    const remaining = Math.max(0, end.getTime() - now);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Loading session...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-xl font-semibold text-gray-900 mb-2">
          Session Not Found
        </Text>
        <TouchableOpacity
          className="bg-blue-500 px-6 py-3 rounded-lg mt-4"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const attendancePercentage = calculateProgress();

  return (
    <View className="flex-1 bg-white">
      {/* BLE Beacon Broadcaster - broadcasts while session is active */}
      {session.is_active && (
        <BLEBeaconBroadcaster
          sessionCode={session.session_code}
          sessionId={session.id}
          isActive={session.is_active}
          onError={handleBroadcastError}
        />
      )}

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Session Info Header */}
        <View className="bg-blue-500 p-6 pb-8">
          <Text className="text-white text-2xl font-bold mb-1">
            {session.course.code}
          </Text>
          <Text className="text-blue-100 text-base mb-4">
            {session.course.title}
          </Text>

          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-blue-100 text-xs">Started</Text>
              <Text className="text-white font-semibold">
                {formatTime(session.started_at)}
              </Text>
            </View>
            <View>
              <Text className="text-blue-100 text-xs">Duration</Text>
              <Text className="text-white font-semibold">
                {formatDuration()}
              </Text>
            </View>
            <View>
              <Text className="text-blue-100 text-xs">Time Left</Text>
              <Text className="text-white font-semibold">
                {session.is_active ? getTimeRemaining() : "Ended"}
              </Text>
            </View>
          </View>
        </View>

        {/* Attendance Stats */}
        <View className="px-6 -mt-4">
          <View
            className="bg-white rounded-lg p-6"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-3xl font-bold text-gray-900">
                  {attendanceRecords.length}
                </Text>
                <Text className="text-gray-600">
                  of {totalStudents} students
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-3xl font-bold text-blue-600">
                  {attendancePercentage.toFixed(0)}%
                </Text>
                <Text className="text-gray-600">Present</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <View
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${attendancePercentage}%` }}
              />
            </View>
          </View>
        </View>

        {/* Attendance List */}
        <View className="px-6 mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Recent Attendance ({attendanceRecords.length})
          </Text>

          {attendanceRecords.length === 0 ? (
            <View className="bg-gray-50 p-8 rounded-lg items-center">
              <Text className="text-gray-500 text-center">
                No students have marked attendance yet
              </Text>
              <Text className="text-gray-400 text-sm text-center mt-2">
                Students will appear here as they mark attendance
              </Text>
            </View>
          ) : (
            <View>
              {attendanceRecords.map((record) => (
                <AnimatedAttendanceItem
                  key={record.id}
                  record={record}
                  isNew={newRecordIds.has(record.id)}
                />
              ))}
            </View>
          )}
        </View>

        <View className="h-24" />
      </ScrollView>

      {/* Stop Session Button */}
      {session.is_active && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <TouchableOpacity
            className={`py-4 rounded-lg ${
              stopping ? "bg-gray-300" : "bg-red-500"
            }`}
            onPress={handleStopSession}
            disabled={stopping}
          >
            {stopping ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-bold text-lg">
                Stop Session
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
