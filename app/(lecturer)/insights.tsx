import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { getCourseSessions } from "@/lib/attendance";
import {
    getCourseEnrollmentCount,
    getEnrollmentsForCourse,
} from "@/lib/course";
import { supabase } from "@/lib/supabase";
import type { Course } from "@/types/database.types";
import { Ionicons } from "@expo/vector-icons";
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
    useWindowDimensions,
} from "react-native";
import { BarChart, LineChart } from "react-native-gifted-charts";

interface CourseInsights {
  totalStudents: number;
  avgAttendance: number;
  atRiskCount: number;
}

interface TrendDataPoint {
  value: number;
  label: string;
  date: Date;
}

interface SessionComparisonData {
  value: number;
  label: string;
  frontColor: string;
}

interface StudentPerformance {
  id: string;
  first_name: string;
  last_name: string;
  matric_number: string | null;
  attendancePercentage: number;
}

export default function InsightsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const courseId = params.courseId as string;
  const { isDark } = useResolvedTheme();
  const axisColor = isDark ? "#374151" : "#E5E7EB";
  const axisTextColor = isDark ? "#9CA3AF" : "#6B7280";

  const [course, setCourse] = useState<Course | null>(null);
  const [insights, setInsights] = useState<CourseInsights | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [sessionComparisonData, setSessionComparisonData] = useState<
    SessionComparisonData[]
  >([]);
  const [topPerformers, setTopPerformers] = useState<StudentPerformance[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<StudentPerformance[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(width - 48, 260);
  const hasTrendData = trendData.length > 0;
  const trendSpacing = hasTrendData
    ? Math.min(40, Math.max(24, chartWidth / trendData.length - 8))
    : 30;
  const trendInitialSpacing = chartWidth < 320 ? 12 : 20;
  const baseBarSpacing = sessionComparisonData.length > 8 ? 8 : 12;
  const computedBarWidth =
    sessionComparisonData.length > 0
      ? Math.max(
          12,
          Math.min(
            28,
            (chartWidth - sessionComparisonData.length * baseBarSpacing) /
              sessionComparisonData.length,
          ),
        )
      : 20;

  const fetchInsights = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

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

        // Fetch total enrolled students using RPC count helper (ensures RLS checks)
        const totalStudents = await getCourseEnrollmentCount(courseId);

        // Fetch all sessions for this course via RPC
        const sessionsData = await getCourseSessions(courseId);
        const totalSessions = (sessionsData || []).length || 0;

        // Calculate average attendance
        let avgAttendance = 0;
        let atRiskCount = 0;

        if (totalSessions > 0 && totalStudents && totalStudents > 0) {
          // Fetch all attendance records for this course
          const sessionIds = sessionsData?.map((s) => s.id) || [];

          if (sessionIds.length > 0) {
            const { data: attendanceData, error: attendanceError } =
              await supabase
                .from("attendance_records")
                .select("student_id, session_id")
                .in("session_id", sessionIds);

            if (attendanceError) {
              console.error("Error fetching attendance:", attendanceError);
            }

            // Calculate per-student attendance
            const studentAttendance: { [studentId: string]: number } = {};

            attendanceData?.forEach((record) => {
              if (!studentAttendance[record.student_id]) {
                studentAttendance[record.student_id] = 0;
              }
              studentAttendance[record.student_id]++;
            });

            // Calculate average and at-risk count
            // Get list of enrolled students using RPC
            const enrolledStudents =
              (await getEnrollmentsForCourse(courseId)) || [];

            if (enrolledStudents) {
              let totalPercentage = 0;

              enrolledStudents.forEach((enrollment) => {
                const attended = studentAttendance[enrollment.student_id] || 0;
                const percentage = (attended / totalSessions) * 100;
                totalPercentage += percentage;

                if (percentage < 75) {
                  atRiskCount++;
                }
              });

              avgAttendance =
                enrolledStudents.length > 0
                  ? totalPercentage / enrolledStudents.length
                  : 0;
            }
          }
        }

        setInsights({
          totalStudents: totalStudents || 0,
          avgAttendance,
          atRiskCount,
        });

        // Fetch trend data
        if (sessionsData && sessionsData.length > 0) {
          const sessionIds = sessionsData.map((s) => s.id);

          // Use previous sessions data to get dates and IDs
          const sessionsWithDates = (sessionsData || []).map((s: any) => ({
            id: s.id,
            started_at: s.started_at,
          }));

          if (sessionsWithDates) {
            const { data: allAttendance } = await supabase
              .from("attendance_records")
              .select("session_id")
              .in("session_id", sessionIds);

            // Count attendance per session
            const attendanceBySession: { [sessionId: string]: number } = {};
            allAttendance?.forEach((record) => {
              if (!attendanceBySession[record.session_id]) {
                attendanceBySession[record.session_id] = 0;
              }
              attendanceBySession[record.session_id]++;
            });

            // Build trend data
            const trend: TrendDataPoint[] = sessionsWithDates.map((session) => {
              const attendanceCount = attendanceBySession[session.id] || 0;
              const percentage =
                totalStudents && totalStudents > 0
                  ? (attendanceCount / totalStudents) * 100
                  : 0;

              const date = new Date(session.started_at);
              const label = `${date.getMonth() + 1}/${date.getDate()}`;

              return {
                value: Math.round(percentage),
                label,
                date,
              };
            });

            setTrendData(trend);

            // Build session comparison data (bar chart)
            const comparison: SessionComparisonData[] = sessionsWithDates
              .slice(-10) // Show last 10 sessions
              .map((session, index) => {
                const attendanceCount = attendanceBySession[session.id] || 0;
                const date = new Date(session.started_at);
                const label = `${date.getMonth() + 1}/${date.getDate()}`;

                // Color based on attendance count
                let frontColor = "#10B981"; // Green for good attendance
                if (totalStudents) {
                  const percentage = (attendanceCount / totalStudents) * 100;
                  if (percentage < 50) {
                    frontColor = "#EF4444"; // Red for low attendance
                  } else if (percentage < 75) {
                    frontColor = "#F59E0B"; // Yellow for medium attendance
                  }
                }

                return {
                  value: attendanceCount,
                  label,
                  frontColor,
                };
              });

            setSessionComparisonData(comparison);
          }
        }

        // Fetch top performers and at-risk students
        if (totalSessions > 0 && totalStudents && totalStudents > 0) {
          const sessionIds = sessionsData?.map((s) => s.id) || [];

          if (sessionIds.length > 0) {
            // Fetch all attendance records
            const { data: attendanceData } = await supabase
              .from("attendance_records")
              .select("student_id, session_id")
              .in("session_id", sessionIds);

            // Calculate per-student attendance
            const studentAttendance: { [studentId: string]: number } = {};
            attendanceData?.forEach((record) => {
              if (!studentAttendance[record.student_id]) {
                studentAttendance[record.student_id] = 0;
              }
              studentAttendance[record.student_id]++;
            });

            // Fetch all enrolled students with details using RPC to avoid RLS recursion
            const { data: enrolledStudents } = await supabase.rpc(
              "get_students_for_course",
              { p_course_id: courseId },
            );

            if (enrolledStudents) {
              const studentPerformances: StudentPerformance[] = enrolledStudents
                .map((student: any) => {
                  if (!student) return null;

                  const attended = studentAttendance[student.id] || 0;
                  const percentage = (attended / totalSessions) * 100;

                  return {
                    id: student.id,
                    first_name: student.first_name,
                    last_name: student.last_name,
                    matric_number: student.matric_number,
                    attendancePercentage: percentage,
                  };
                })
                .filter(
                  (s: StudentPerformance | null): s is StudentPerformance =>
                    s !== null,
                );

              // Top performers (100% attendance)
              const topPerfs = studentPerformances
                .filter((s) => s.attendancePercentage === 100)
                .sort((a, b) =>
                  `${a.first_name} ${a.last_name}`.localeCompare(
                    `${b.first_name} ${b.last_name}`,
                  ),
                );

              setTopPerformers(topPerfs);

              // At-risk students (<75% attendance)
              const atRisk = studentPerformances
                .filter((s) => s.attendancePercentage < 75)
                .sort(
                  (a, b) => a.attendancePercentage - b.attendancePercentage,
                );

              setAtRiskStudents(atRisk);
            }
          }
        }
      } catch (error) {
        console.error("Error:", error);
        Alert.alert("Error", "Failed to load insights");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [courseId],
  );

  useEffect(() => {
    if (courseId) {
      fetchInsights();
    } else {
      setLoading(false);
    }
  }, [courseId, fetchInsights]);

  const handleRefresh = () => {
    fetchInsights(true);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-neutral-600 dark:text-neutral-400 mt-4">
          Loading insights...
        </Text>
      </View>
    );
  }

  if (!course || !insights) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-6">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mt-4">
          Failed to Load Insights
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

  return (
    <ScrollView
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View className="p-4">
        {/* Header */}
        <View className="mb-4">
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
          <Text className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
            Attendance Insights
          </Text>
        </View>

        {/* Summary Cards */}
        <View className="gap-4 mb-6">
          {/* Total Students Card */}
          <View
            className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Total Students
                </Text>
                <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  {insights.totalStudents}
                </Text>
              </View>
              <View className="bg-blue-100 p-3 rounded-full">
                <Ionicons name="people" size={32} color="#3B82F6" />
              </View>
            </View>
          </View>

          {/* Average Attendance Card */}
          <View
            className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Average Attendance
                </Text>
                <Text className="text-3xl font-bold text-green-600">
                  {insights.avgAttendance.toFixed(1)}%
                </Text>
              </View>
              <View className="bg-green-100 p-3 rounded-full">
                <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              </View>
            </View>
          </View>

          {/* At-Risk Students Card */}
          <View
            className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  At-Risk Students
                </Text>
                <Text className="text-sm text-neutral-500 dark:text-neutral-500 mb-2">
                  (&lt;75% attendance)
                </Text>
                <Text className="text-3xl font-bold text-red-600">
                  {insights.atRiskCount}
                </Text>
              </View>
              <View className="bg-red-100 p-3 rounded-full">
                <Ionicons name="warning" size={32} color="#EF4444" />
              </View>
            </View>
          </View>
        </View>

        {/* Attendance Trend Chart */}
        {trendData.length > 0 && (
          <View
            className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 mb-6"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Attendance Trend
              </Text>
              <Ionicons name="trending-up" size={20} color="#3B82F6" />
            </View>

            <View className="items-center">
              <LineChart
                data={trendData}
                width={chartWidth}
                height={200}
                color="#3B82F6"
                thickness={3}
                dataPointsColor="#3B82F6"
                dataPointsRadius={4}
                startFillColor="rgba(59, 130, 246, 0.3)"
                endFillColor="rgba(59, 130, 246, 0.05)"
                startOpacity={0.9}
                endOpacity={0.2}
                initialSpacing={trendInitialSpacing}
                spacing={trendSpacing}
                noOfSections={5}
                maxValue={100}
                yAxisColor={axisColor}
                xAxisColor={axisColor}
                yAxisTextStyle={{ color: axisTextColor, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: axisTextColor, fontSize: 10 }}
                curved
                areaChart
              />
            </View>

            <Text className="text-xs text-neutral-500 dark:text-neutral-500 text-center mt-3">
              Attendance percentage over time
            </Text>
          </View>
        )}

        {/* Session Comparison Chart */}
        {sessionComparisonData.length > 0 && (
          <View
            className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 mb-6"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Session Comparison
              </Text>
              <Ionicons name="bar-chart" size={20} color="#3B82F6" />
            </View>

            <View className="items-center">
              <BarChart
                data={sessionComparisonData}
                width={chartWidth}
                height={200}
                barWidth={computedBarWidth}
                spacing={baseBarSpacing}
                noOfSections={5}
                yAxisColor={axisColor}
                xAxisColor={axisColor}
                yAxisTextStyle={{ color: axisTextColor, fontSize: 10 }}
                xAxisLabelTextStyle={{
                  color: axisTextColor,
                  fontSize: 10,
                  width: 40,
                }}
                isAnimated
                animationDuration={800}
              />
            </View>

            <Text className="text-xs text-neutral-500 dark:text-neutral-500 text-center mt-3">
              Attendance count per session (last 10 sessions)
            </Text>

            {/* Legend */}
            <View className="flex-row justify-center gap-4 mt-3">
              <View className="flex-row items-center gap-1">
                <View className="w-3 h-3 rounded bg-green-500" />
                <Text className="text-xs text-neutral-600 dark:text-neutral-400">
                  ≥75%
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <View className="w-3 h-3 rounded bg-yellow-500" />
                <Text className="text-xs text-neutral-600 dark:text-neutral-400">
                  50-75%
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <View className="w-3 h-3 rounded bg-red-500" />
                <Text className="text-xs text-neutral-600 dark:text-neutral-400">
                  &lt;50%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Top Performers */}
        <View
          className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 mb-6"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Top Performers
            </Text>
            <View className="bg-green-100 px-3 py-1 rounded-full">
              <Text className="text-xs font-semibold text-green-700">
                100% Attendance
              </Text>
            </View>
          </View>

          {topPerformers.length === 0 ? (
            <View className="items-center py-6">
              <Ionicons name="trophy-outline" size={48} color="#9CA3AF" />
              <Text className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">
                No students with 100% attendance yet
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {topPerformers.map((student, index) => (
                <View
                  key={student.id}
                  className="flex-row items-center justify-between p-3 bg-green-50 rounded-lg"
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="bg-green-500 w-8 h-8 rounded-full items-center justify-center">
                      <Text className="text-white font-bold text-xs">
                        {index + 1}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        {student.first_name} {student.last_name}
                      </Text>
                      <Text className="text-xs text-neutral-600 dark:text-neutral-400">
                        {student.matric_number || "N/A"}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#10B981"
                    />
                    <Text className="text-sm font-bold text-green-600">
                      100%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* At-Risk Students */}
        <View
          className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 mb-6"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              At-Risk Students
            </Text>
            <View className="bg-red-100 px-3 py-1 rounded-full">
              <Text className="text-xs font-semibold text-red-700">
                &lt;75% Attendance
              </Text>
            </View>
          </View>

          {atRiskStudents.length === 0 ? (
            <View className="items-center py-6">
              <Ionicons
                name="checkmark-circle-outline"
                size={48}
                color="#10B981"
              />
              <Text className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">
                No at-risk students - great job!
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {atRiskStudents.map((student) => (
                <View
                  key={student.id}
                  className="flex-row items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {student.first_name} {student.last_name}
                    </Text>
                    <Text className="text-xs text-neutral-600 dark:text-neutral-400">
                      {student.matric_number || "N/A"}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="warning" size={16} color="#EF4444" />
                    <Text className="text-sm font-bold text-red-600">
                      {student.attendancePercentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Info Box */}
        <View className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-100 dark:border-blue-900">
          <View className="flex-row items-start gap-3">
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-blue-900 mb-1">
                About These Metrics
              </Text>
              <Text className="text-xs text-blue-700">
                These insights are calculated based on all attendance sessions
                for this course. Students with less than 75% attendance are
                considered at-risk.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
