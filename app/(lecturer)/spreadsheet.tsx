import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { getCourseSessions } from "@/lib/attendance";
import { supabase } from "@/lib/supabase";
import type { AttendanceSession, Course, User } from "@/types/database.types";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface StudentWithAttendance extends User {
  attendance: { [sessionId: string]: boolean };
  attendancePercentage: number;
}

interface SessionWithDate extends AttendanceSession {
  dateLabel: string;
}

type DateRangeFilter = "all" | "week" | "month" | "custom";
type LevelFilter = "all" | 100 | 200 | 300 | 400 | 500;
type AttendanceRateFilter = "all" | "low" | "medium" | "high";
type SortBy = "name" | "matric" | "percentage";

export default function SpreadsheetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const courseId = params.courseId as string;
  const { isDark } = useResolvedTheme();

  const [course, setCourse] = useState<Course | null>(null);
  const [allStudents, setAllStudents] = useState<StudentWithAttendance[]>([]);
  const [allSessions, setAllSessions] = useState<SessionWithDate[]>([]);
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [sessions, setSessions] = useState<SessionWithDate[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [dateRangeFilter, setDateRangeFilter] =
    useState<DateRangeFilter>("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [attendanceRateFilter, setAttendanceRateFilter] =
    useState<AttendanceRateFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [showFilters, setShowFilters] = useState(false);

  // Custom date range
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    if (courseId) {
      fetchSpreadsheetData();
    }
  }, [courseId]);

  // Subscribe to realtime attendance inserts so marks appear instantly
  useEffect(() => {
    if (!courseId) return;

    const channel = supabase
      .channel(`spreadsheet-${courseId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance_records",
        },
        (payload) => {
          const newRecord = payload.new as any;
          if (!newRecord) return;

          // Check if this record belongs to one of our sessions
          setAllSessions((currentSessions) => {
            const sessionIds = currentSessions.map((s) => s.id);
            if (!sessionIds.includes(newRecord.session_id))
              return currentSessions;

            // Update the student's attendance in allStudents
            setAllStudents((prevStudents) =>
              prevStudents.map((student) => {
                if (student.id !== newRecord.student_id) return student;
                const updatedAttendance = {
                  ...student.attendance,
                  [newRecord.session_id]: true,
                };
                const totalSessions = sessionIds.length;
                const attendedSessions =
                  Object.values(updatedAttendance).filter(Boolean).length;
                const percentage =
                  totalSessions > 0
                    ? (attendedSessions / totalSessions) * 100
                    : 0;
                return {
                  ...student,
                  attendance: updatedAttendance,
                  attendancePercentage: percentage,
                };
              }),
            );

            return currentSessions;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [
    allStudents,
    allSessions,
    dateRangeFilter,
    levelFilter,
    attendanceRateFilter,
    sortBy,
    customStartDate,
    customEndDate,
  ]);

  const fetchSpreadsheetData = async () => {
    try {
      setLoading(true);

      // Fetch course details using RPC to avoid RLS recursion
      const { data: courseData, error: courseError } = await supabase.rpc(
        "get_course_by_id",
        { p_course_id: courseId },
      );

      if (courseError) {
        console.error("Error fetching course:", courseError);
        Alert.alert("Error", "Failed to load course details");
        return;
      }

      // RPC returns an array, get first item
      const course = courseData?.[0];
      if (!course) {
        Alert.alert("Error", "Course not found or you do not have access");
        return;
      }

      setCourse(course);

      // Fetch all sessions for this course via RPC
      const sessionsData = await getCourseSessions(courseId);
      // Format sessions with date labels
      const formattedSessions: SessionWithDate[] = (sessionsData || []).map(
        (session: any) => ({
          ...session,
          dateLabel: formatSessionDate(session.started_at),
        }),
      );

      setSessions(formattedSessions);

      // Fetch enrolled students using RPC to avoid RLS recursion
      const { data: studentsData, error: enrollmentsError } =
        await supabase.rpc("get_students_for_course", {
          p_course_id: courseId,
        });

      if (enrollmentsError) {
        console.error("Error fetching students:", enrollmentsError);
        Alert.alert("Error", "Failed to load students");
        return;
      }

      const typedStudentsData = (studentsData || []) as User[];

      // Fetch all attendance records for this course
      const sessionIds = sessionsData.map((s) => s.id);
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("session_id, student_id")
        .in("session_id", sessionIds);

      if (attendanceError) {
        console.error("Error fetching attendance:", attendanceError);
        Alert.alert("Error", "Failed to load attendance records");
        return;
      }

      // Build attendance map
      const attendanceMap: {
        [studentId: string]: { [sessionId: string]: boolean };
      } = {};

      typedStudentsData.forEach((student: User) => {
        attendanceMap[student.id] = {};
        sessionsData.forEach((session) => {
          attendanceMap[student.id][session.id] = false;
        });
      });

      attendanceData?.forEach((record) => {
        if (attendanceMap[record.student_id]) {
          attendanceMap[record.student_id][record.session_id] = true;
        }
      });

      // Calculate attendance percentages
      const studentsWithAttendance: StudentWithAttendance[] =
        typedStudentsData.map((student: User) => {
          const attendance = attendanceMap[student.id] || {};
          const totalSessions = sessionsData.length;
          const attendedSessions =
            Object.values(attendance).filter(Boolean).length;
          const percentage =
            totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

          return {
            ...student,
            attendance,
            attendancePercentage: percentage,
          };
        });

      // Store all data
      setAllStudents(studentsWithAttendance);
      setAllSessions(formattedSessions);
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "Failed to load spreadsheet data");
    } finally {
      setLoading(false);
    }
  };

  const formatSessionDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  const applyFiltersAndSort = () => {
    let filteredSessions = [...allSessions];
    let filteredStudents = [...allStudents];

    // Apply date range filter
    if (dateRangeFilter !== "all") {
      const now = new Date();
      let startDate: Date | null = null;

      if (dateRangeFilter === "week") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRangeFilter === "month") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (dateRangeFilter === "custom" && customStartDate) {
        startDate = new Date(customStartDate);
      }

      if (startDate) {
        filteredSessions = filteredSessions.filter((session) => {
          const sessionDate = new Date(session.started_at);
          const endDate = customEndDate ? new Date(customEndDate) : now;
          return sessionDate >= startDate! && sessionDate <= endDate;
        });
      }
    }

    // Apply level filter
    if (levelFilter !== "all") {
      filteredStudents = filteredStudents.filter(
        (student) => student.level === levelFilter,
      );
    }

    // Recalculate attendance percentages based on filtered sessions
    const filteredSessionIds = filteredSessions.map((s) => s.id);
    filteredStudents = filteredStudents.map((student) => {
      const filteredAttendance: { [sessionId: string]: boolean } = {};
      filteredSessionIds.forEach((sessionId) => {
        filteredAttendance[sessionId] = student.attendance[sessionId] || false;
      });

      const totalSessions = filteredSessionIds.length;
      const attendedSessions =
        Object.values(filteredAttendance).filter(Boolean).length;
      const percentage =
        totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

      return {
        ...student,
        attendance: filteredAttendance,
        attendancePercentage: percentage,
      };
    });

    // Apply attendance rate filter
    if (attendanceRateFilter !== "all") {
      if (attendanceRateFilter === "low") {
        filteredStudents = filteredStudents.filter(
          (s) => s.attendancePercentage < 50,
        );
      } else if (attendanceRateFilter === "medium") {
        filteredStudents = filteredStudents.filter(
          (s) => s.attendancePercentage >= 50 && s.attendancePercentage < 75,
        );
      } else if (attendanceRateFilter === "high") {
        filteredStudents = filteredStudents.filter(
          (s) => s.attendancePercentage >= 75,
        );
      }
    }

    // Apply sorting
    if (sortBy === "name") {
      filteredStudents.sort((a, b) =>
        `${a.first_name} ${a.last_name}`.localeCompare(
          `${b.first_name} ${b.last_name}`,
        ),
      );
    } else if (sortBy === "matric") {
      filteredStudents.sort((a, b) =>
        (a.matric_number || "").localeCompare(b.matric_number || ""),
      );
    } else if (sortBy === "percentage") {
      filteredStudents.sort(
        (a, b) => b.attendancePercentage - a.attendancePercentage,
      );
    }

    setSessions(filteredSessions);
    setStudents(filteredStudents);
  };

  const resetFilters = () => {
    setDateRangeFilter("all");
    setLevelFilter("all");
    setAttendanceRateFilter("all");
    setSortBy("name");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (dateRangeFilter !== "all") count++;
    if (levelFilter !== "all") count++;
    if (attendanceRateFilter !== "all") count++;
    return count;
  };

  const exportToCSV = async () => {
    try {
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Error", "Sharing is not available on this device");
        return;
      }

      // Generate CSV content
      let csvContent = "";

      // Header row
      const headers = ["Student Name", "Matric Number"];
      sessions.forEach((session) => {
        headers.push(session.dateLabel);
      });
      headers.push("Attendance %");
      csvContent += headers.join(",") + "\n";

      // Data rows
      students.forEach((student) => {
        const row = [
          `"${student.first_name} ${student.last_name}"`,
          student.matric_number || "N/A",
        ];

        sessions.forEach((session) => {
          row.push(student.attendance[session.id] ? "Present" : "Absent");
        });

        row.push(student.attendancePercentage.toFixed(1) + "%");
        csvContent += row.join(",") + "\n";
      });

      // Add summary section
      csvContent += "\n";
      csvContent += "Summary\n";
      csvContent += `Course,${course?.code}\n`;
      csvContent += `Title,"${course?.title}"\n`;
      csvContent += `Total Students,${students.length}\n`;
      csvContent += `Total Sessions,${sessions.length}\n`;
      csvContent += `Export Date,${new Date().toLocaleDateString()}\n`;

      // Create file
      const fileName = `${course?.code?.replace(/\s+/g, "_")}_attendance_${new Date().toISOString().split("T")[0]}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Export Attendance Report",
        UTI: "public.comma-separated-values-text",
      });

      Alert.alert("Success", "Attendance report exported successfully");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      Alert.alert("Error", "Failed to export attendance report");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-neutral-600 dark:text-neutral-400 mt-4">
          Loading spreadsheet...
        </Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-6">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mt-4">
          Course Not Found
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

  if (sessions.length === 0) {
    return (
      <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        {/* Header */}
        <View className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center gap-2 mb-3"
          >
            <Ionicons name="arrow-back" size={24} color="#3B82F6" />
            <Text className="text-blue-500 font-semibold">Back</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {course.code}
          </Text>
          <Text className="text-neutral-600 dark:text-neutral-400 mt-1">
            {course.title}
          </Text>
        </View>

        {/* Empty State */}
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mt-4 mb-2">
            No Sessions Yet
          </Text>
          <Text className="text-neutral-600 dark:text-neutral-400 text-center">
            Start an attendance session to see the spreadsheet view.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center gap-2"
          >
            <Ionicons name="arrow-back" size={24} color="#3B82F6" />
            <Text className="text-blue-500 font-semibold">Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={exportToCSV}
            className="bg-green-500 px-4 py-2 rounded-lg flex-row items-center gap-2"
          >
            <Ionicons name="download-outline" size={20} color="white" />
            <Text className="text-white font-semibold">Export CSV</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {course.code}
        </Text>
        <Text className="text-neutral-600 dark:text-neutral-400 mt-1">
          {course.title}
        </Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-500 mt-2">
          {students.length} students • {sessions.length} sessions
        </Text>
      </View>

      {/* Filters Bar */}
      <View className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Filters & Sort
          </Text>
          <View className="flex-row gap-2">
            {getActiveFilterCount() > 0 && (
              <TouchableOpacity
                onPress={resetFilters}
                className="px-3 py-1 bg-neutral-200 dark:bg-neutral-700 rounded"
              >
                <Text className="text-xs text-neutral-700 dark:text-neutral-300">
                  Reset
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              className="px-3 py-1 bg-blue-500 rounded flex-row items-center gap-1"
            >
              <Ionicons name="options-outline" size={14} color="white" />
              <Text className="text-xs text-white font-semibold">
                {showFilters ? "Hide" : "Show"}
              </Text>
              {getActiveFilterCount() > 0 && (
                <View className="bg-white rounded-full w-5 h-5 items-center justify-center ml-1">
                  <Text className="text-xs font-bold text-blue-500">
                    {getActiveFilterCount()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {showFilters && (
          <View className="gap-3">
            {/* Date Range Filter */}
            <View>
              <Text className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                Date Range
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {(["all", "week", "month", "custom"] as DateRangeFilter[]).map(
                  (range) => (
                    <TouchableOpacity
                      key={range}
                      onPress={() => setDateRangeFilter(range)}
                      className={`px-3 py-2 rounded ${
                        dateRangeFilter === range
                          ? "bg-blue-500"
                          : "bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          dateRangeFilter === range
                            ? "text-white"
                            : "text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {range === "all"
                          ? "All Time"
                          : range === "week"
                            ? "This Week"
                            : range === "month"
                              ? "This Month"
                              : "Custom"}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>

              {dateRangeFilter === "custom" && (
                <View className="flex-row gap-2 mt-2">
                  <View className="flex-1">
                    <Text className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                      Start Date
                    </Text>
                    <TextInput
                      className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100"
                      placeholder="YYYY-MM-DD"
                      value={customStartDate}
                      onChangeText={setCustomStartDate}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                      End Date
                    </Text>
                    <TextInput
                      className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100"
                      placeholder="YYYY-MM-DD"
                      value={customEndDate}
                      onChangeText={setCustomEndDate}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Level Filter */}
            <View>
              <Text className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                Level
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {(["all", 100, 200, 300, 400, 500] as LevelFilter[]).map(
                  (level) => (
                    <TouchableOpacity
                      key={level}
                      onPress={() => setLevelFilter(level)}
                      className={`px-3 py-2 rounded ${
                        levelFilter === level
                          ? "bg-blue-500"
                          : "bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          levelFilter === level
                            ? "text-white"
                            : "text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {level === "all" ? "All Levels" : `${level}L`}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </View>

            {/* Attendance Rate Filter */}
            <View>
              <Text className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                Attendance Rate
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setAttendanceRateFilter("all")}
                  className={`px-3 py-2 rounded ${
                    attendanceRateFilter === "all"
                      ? "bg-blue-500"
                      : "bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      attendanceRateFilter === "all"
                        ? "text-white"
                        : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAttendanceRateFilter("high")}
                  className={`px-3 py-2 rounded ${
                    attendanceRateFilter === "high"
                      ? "bg-green-500"
                      : "bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      attendanceRateFilter === "high"
                        ? "text-white"
                        : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    ≥75%
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAttendanceRateFilter("medium")}
                  className={`px-3 py-2 rounded ${
                    attendanceRateFilter === "medium"
                      ? "bg-yellow-500"
                      : "bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      attendanceRateFilter === "medium"
                        ? "text-white"
                        : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    50-75%
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAttendanceRateFilter("low")}
                  className={`px-3 py-2 rounded ${
                    attendanceRateFilter === "low"
                      ? "bg-red-500"
                      : "bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      attendanceRateFilter === "low"
                        ? "text-white"
                        : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    &lt;50%
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sort By */}
            <View>
              <Text className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                Sort By
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {(["name", "matric", "percentage"] as SortBy[]).map((sort) => (
                  <TouchableOpacity
                    key={sort}
                    onPress={() => setSortBy(sort)}
                    className={`px-3 py-2 rounded ${
                      sortBy === sort
                        ? "bg-blue-500"
                        : "bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        sortBy === sort
                          ? "text-white"
                          : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      {sort === "name"
                        ? "Name"
                        : sort === "matric"
                          ? "Matric No."
                          : "Attendance %"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Spreadsheet Grid */}
      <ScrollView className="flex-1">
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            {/* Header Row */}
            <View className="flex-row border-b border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900">
              {/* Student Name Column */}
              <View className="w-48 p-3 border-r border-neutral-300 dark:border-neutral-700">
                <Text className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                  Student
                </Text>
              </View>

              {/* Matric Number Column */}
              <View className="w-32 p-3 border-r border-neutral-300 dark:border-neutral-700">
                <Text className="font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                  Matric No.
                </Text>
              </View>

              {/* Session Date Columns */}
              {sessions.map((session) => (
                <View
                  key={session.id}
                  className="w-20 p-3 border-r border-neutral-300 dark:border-neutral-700 items-center"
                >
                  <Text className="font-bold text-neutral-900 dark:text-neutral-100 text-xs text-center">
                    {session.dateLabel}
                  </Text>
                </View>
              ))}

              {/* Percentage Column */}
              <View className="w-24 p-3">
                <Text className="font-bold text-neutral-900 dark:text-neutral-100 text-xs text-center">
                  %
                </Text>
              </View>
            </View>

            {/* Student Rows */}
            {students.map((student, index) => (
              <View
                key={student.id}
                className={`flex-row border-b border-neutral-200 dark:border-neutral-800 ${
                  index % 2 === 0
                    ? "bg-white dark:bg-neutral-950"
                    : "bg-neutral-50 dark:bg-neutral-900"
                }`}
              >
                {/* Student Name */}
                <View className="w-48 p-3 border-r border-neutral-200 dark:border-neutral-800 justify-center">
                  <Text className="text-neutral-900 dark:text-neutral-100 text-xs">
                    {student.first_name} {student.last_name}
                  </Text>
                </View>

                {/* Matric Number */}
                <View className="w-32 p-3 border-r border-neutral-200 dark:border-neutral-800 justify-center">
                  <Text className="text-neutral-600 dark:text-neutral-400 text-xs">
                    {student.matric_number || "N/A"}
                  </Text>
                </View>

                {/* Attendance Marks */}
                {sessions.map((session) => (
                  <View
                    key={session.id}
                    className="w-20 p-3 border-r border-neutral-200 dark:border-neutral-800 items-center justify-center"
                  >
                    {student.attendance[session.id] ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#10B981"
                      />
                    ) : (
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    )}
                  </View>
                ))}

                {/* Attendance Percentage */}
                <View className="w-24 p-3 items-center justify-center">
                  <Text
                    className={`text-xs font-semibold ${
                      student.attendancePercentage >= 75
                        ? "text-green-600"
                        : student.attendancePercentage >= 50
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                  >
                    {student.attendancePercentage.toFixed(0)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Legend */}
      <View className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
        <Text className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
          Legend:
        </Text>
        <View className="flex-row gap-4">
          <View className="flex-row items-center gap-1">
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text className="text-xs text-neutral-600 dark:text-neutral-400">
              Present
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="close-circle" size={16} color="#EF4444" />
            <Text className="text-xs text-neutral-600 dark:text-neutral-400">
              Absent
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
