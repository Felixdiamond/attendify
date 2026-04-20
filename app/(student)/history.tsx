import { supabase } from "@/lib/supabase";
import type { AttendanceRecord, Course } from "@/types/database.types";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AttendanceHistoryItem extends AttendanceRecord {
  session: {
    course: Course;
    course_id: string;
    started_at: string;
  };
}

export default function HistoryScreen() {
  const [attendanceHistory, setAttendanceHistory] = useState<
    AttendanceHistoryItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // Fetch attendance history
  const fetchAttendanceHistory = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setIsLoading(true);
      }
      setError(null);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // First, get enrolled course IDs
      const { data: enrollments, error: enrollError } = await supabase
        .from("course_enrollments")
        .select("course_id")
        .eq("student_id", user.id);

      if (enrollError) {
        console.error("Error fetching enrollments:", enrollError);
        throw new Error("Failed to load course enrollments");
      }

      // If no enrollments, return empty array
      if (!enrollments || enrollments.length === 0) {
        setAttendanceHistory([]);
        return;
      }

      const enrolledCourseIds = enrollments.map((e) => e.course_id);

      // Fetch attendance records with session and course info
      // Filter by enrolled courses
      const { data, error: fetchError } = await supabase
        .from("attendance_records")
        .select(
          `
          *,
          session:attendance_sessions!attendance_records_session_id_fkey (
            started_at,
            course_id,
            course:courses!attendance_sessions_course_id_fkey (
              id,
              code,
              title,
              level
            )
          )
        `,
        )
        .eq("student_id", user.id)
        .order("marked_at", { ascending: false });

      if (fetchError) {
        console.error("Error fetching attendance history:", fetchError);
        throw new Error("Failed to load attendance history");
      }

      // Filter records to only include enrolled courses
      // Also filter out records where session or course data is null (RLS may hide inactive sessions)
      const filteredData = (data as AttendanceHistoryItem[]).filter(
        (record) =>
          record.session != null &&
          record.session.course != null &&
          enrolledCourseIds.includes(record.session.course_id),
      );

      setAttendanceHistory(filteredData);
    } catch (err) {
      console.error("Error in fetchAttendanceHistory:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAttendanceHistory(true);
  }, [fetchAttendanceHistory]);

  // Load data on mount
  useEffect(() => {
    fetchAttendanceHistory();
  }, [fetchAttendanceHistory]);

  // Format date and time
  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { date: dateStr, time: timeStr };
  };

  // Render attendance item - Cinema-grade
  const renderAttendanceItem = ({ item }: { item: AttendanceHistoryItem }) => {
    const { date, time } = formatDateTime(item.marked_at);
    const course = item.session?.course;
    if (!course) return null;

    return (
      <View className="bg-white dark:bg-neutral-900 rounded-2xl p-5 mb-4 border-2 border-neutral-200 dark:border-neutral-800">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-0 tracking-tight">
              {course.code}
            </Text>
            <Text className="text-sm text-neutral-600 dark:text-neutral-400 mt-1.5 tracking-tight">
              {course.title}
            </Text>
          </View>
          <View className="bg-[#ECFDF5] dark:bg-[#064E3B] px-3 py-1.5 rounded-lg border-2 border-[#A7F3D0] dark:border-[#047857]">
            <Text className="text-xs font-semibold text-[#047857] dark:text-[#6EE7B7] tracking-tight">
              ✓ Present
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mt-2 pt-3 border-t-2 border-neutral-200 dark:border-neutral-800">
          <Ionicons name="calendar-outline" size={16} color="#A3A3A3" />
          <Text className="text-xs text-neutral-500 dark:text-neutral-400 ml-1.5 mr-4 tracking-tight">
            {date}
          </Text>
          <Ionicons name="time-outline" size={16} color="#A3A3A3" />
          <Text className="text-xs text-neutral-500 dark:text-neutral-400 ml-1.5 tracking-tight">
            {time}
          </Text>
        </View>
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View
        style={{ flex: 1, paddingBottom: insets.bottom }}
        className="bg-neutral-50 dark:bg-neutral-950"
      >
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="text-neutral-600 dark:text-neutral-400 mt-4 text-base tracking-tight">
            Loading attendance history...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View
        style={{ flex: 1, paddingBottom: insets.bottom }}
        className="bg-neutral-50 dark:bg-neutral-950"
      >
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="text-[#EF4444] text-center mt-4 text-xl font-bold tracking-tight">
            {error}
          </Text>
          <Text className="text-neutral-600 dark:text-neutral-400 text-center mt-2 text-base">
            Pull down to try again
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, paddingBottom: insets.bottom }}
      className="bg-neutral-50 dark:bg-neutral-950"
    >
      <View className="flex-1">
        {/* Header - Cinema-grade */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-4xl font-bold text-neutral-900 dark:text-neutral-0 mb-3 tracking-tighter leading-tight">
            Attendance History
          </Text>
          <Text className="text-base text-neutral-600 dark:text-neutral-400 tracking-tight">
            {attendanceHistory.length}{" "}
            {attendanceHistory.length === 1 ? "record" : "records"} found
          </Text>
        </View>

        {/* Attendance List */}
        <FlatList
          data={attendanceHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderAttendanceItem}
          contentContainerStyle={{
            padding: 24,
            paddingTop: 8,
            paddingBottom: insets.bottom,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#4F46E5"
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-12 px-6">
              <Ionicons
                name="document-text-outline"
                size={72}
                color="#A3A3A3"
              />
              <Text className="text-neutral-600 dark:text-neutral-400 text-center mt-6 text-lg font-semibold tracking-tight">
                No attendance records yet
              </Text>
              <Text className="text-neutral-500 dark:text-neutral-500 text-center mt-2 text-base tracking-tight">
                {attendanceHistory.length === 0 && !isLoading
                  ? "You may not be enrolled in any courses yet. Contact your HOC to enroll."
                  : "Mark attendance in class to see your history"}
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}
