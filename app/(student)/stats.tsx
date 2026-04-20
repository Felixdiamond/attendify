import { getCourseSessions } from '@/lib/attendance';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CourseStats {
  course_id: string;
  course_code: string;
  course_title: string;
  total_sessions: number;
  attended_sessions: number;
  attendance_percentage: number;
}

interface OverallStats {
  total_courses: number;
  total_sessions: number;
  attended_sessions: number;
  overall_percentage: number;
}

export default function StatsScreen() {
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // Fetch attendance statistics
  const fetchStatistics = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setIsLoading(true);
      }
      setError(null);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Fetch enrolled courses using RPC to avoid RLS recursion
      const { data: courses, error: coursesError } = await supabase
        .rpc('get_my_courses_student');

      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        throw new Error('Failed to load enrolled courses');
      }

      // Calculate stats for each course
      const statsPromises = (courses || []).map(async (course: any) => {
        const courseId = course.id;

        // Get total sessions for this course via RPC
        const sessions = await getCourseSessions(courseId);
        const totalSessions = sessions?.length || 0;

        // Get attended sessions for this student
        const { data: attendedRecords, error: attendedError } = await supabase
          .from('attendance_records')
          .select('session_id')
          .eq('student_id', user.id)
          .in('session_id', sessions?.map((s: any) => s.id) || []);

        if (attendedError) {
          console.error('Error fetching attended records:', attendedError);
          return null;
        }

        const attendedSessions = attendedRecords?.length || 0;
        const percentage = totalSessions > 0 
          ? Math.round((attendedSessions / totalSessions) * 100) 
          : 0;

        return {
          course_id: courseId,
          course_code: course.code,
          course_title: course.title,
          total_sessions: totalSessions,
          attended_sessions: attendedSessions,
          attendance_percentage: percentage,
        };
      });

      const stats = (await Promise.all(statsPromises)).filter(
        (stat): stat is CourseStats => stat !== null
      );

      // Calculate overall statistics
      const totalSessions = stats.reduce((sum, stat) => sum + stat.total_sessions, 0);
      const attendedSessions = stats.reduce((sum, stat) => sum + stat.attended_sessions, 0);
      const overallPercentage = totalSessions > 0 
        ? Math.round((attendedSessions / totalSessions) * 100) 
        : 0;

      setCourseStats(stats);
      setOverallStats({
        total_courses: stats.length,
        total_sessions: totalSessions,
        attended_sessions: attendedSessions,
        overall_percentage: overallPercentage,
      });
    } catch (err) {
      console.error('Error in fetchStatistics:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchStatistics(true);
  }, [fetchStatistics]);

  // Load data on mount
  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // Get color based on percentage
  const getPercentageColor = (percentage: number) => {
    if (percentage >= 75) return 'text-[#047857] dark:text-[#6EE7B7]';
    if (percentage >= 50) return 'text-[#D97706] dark:text-[#FCD34D]';
    return 'text-[#DC2626] dark:text-[#FCA5A5]';
  };

  const getPercentageBgColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-[#ECFDF5] dark:bg-[#064E3B]';
    if (percentage >= 50) return 'bg-[#FEF3C7] dark:bg-[#78350F]';
    return 'bg-[#FEE2E2] dark:bg-[#7F1D1D]';
  };

  const getPercentageBorderColor = (percentage: number) => {
    if (percentage >= 75) return 'border-[#A7F3D0] dark:border-[#047857]';
    if (percentage >= 50) return 'border-[#FDE68A] dark:border-[#D97706]';
    return 'border-[#FECACA] dark:border-[#DC2626]';
  };

  // Render progress bar
  const renderProgressBar = (percentage: number) => {
    const color = percentage >= 75 ? 'bg-[#10B981]' : percentage >= 50 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]';
    
    return (
      <View className="w-full h-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-xl overflow-hidden">
        <View 
          className={`h-full ${color} rounded-xl`}
          style={{ width: `${percentage}%` }}
        />
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, paddingBottom: insets.bottom }} className="bg-neutral-50 dark:bg-neutral-900">
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="text-neutral-600 dark:text-neutral-400 mt-6 text-base tracking-tight">
            Calculating statistics...
          </Text>
        </View>
      </View>
    );
  }

    // Error state
  if (error) {
    return (
      <View style={{ flex: 1, paddingBottom: insets.bottom }} className="bg-neutral-50 dark:bg-neutral-900">
        <View className="flex-1 items-center justify-center px-6">
          <View className="bg-[#FEE2E2] dark:bg-[#7F1D1D] p-6 rounded-2xl border-2 border-[#FECACA] dark:border-[#DC2626]">
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          </View>
          <Text className="text-neutral-900 dark:text-neutral-0 text-2xl font-bold mt-6 tracking-tight">
            Unable to Load Statistics
          </Text>
          <Text className="text-neutral-600 dark:text-neutral-400 text-center mt-3 text-base tracking-tight">
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => fetchStatistics()}
            className="mt-8 bg-[#4F46E5] px-8 py-4 rounded-xl border-2 border-[#4338CA] active:scale-95"
          >
            <Text className="text-white font-bold tracking-tight text-base">
              Try Again
            </Text>
          </TouchableOpacity>
          <Text className="text-neutral-500 dark:text-neutral-500 text-sm mt-6 text-center tracking-tight">
            Pull down to try again
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom }} className="bg-neutral-50 dark:bg-neutral-900">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#4F46E5"
          />
        }
      >
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-4xl font-bold text-neutral-900 dark:text-neutral-0 tracking-tighter mb-2">
            Attendance Statistics
          </Text>
          <Text className="text-base text-neutral-600 dark:text-neutral-400 tracking-tight">
            Track your attendance performance
          </Text>
        </View>

        {/* Overall Statistics Card */}
        {overallStats && (
          <View className="mx-6 mt-4 bg-white dark:bg-neutral-900 rounded-2xl p-8 border-2 border-neutral-200 dark:border-neutral-800">
            <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-0 tracking-tight mb-6">
              Overall Performance
            </Text>
            
            {/* Large Percentage Display */}
            <View className="items-center mb-8">
              <View className={`w-36 h-36 rounded-2xl ${getPercentageBgColor(overallStats.overall_percentage)} items-center justify-center border-2 ${getPercentageBorderColor(overallStats.overall_percentage)}`}>
                <Text className={`text-5xl font-bold ${getPercentageColor(overallStats.overall_percentage)} tracking-tight`}>
                  {overallStats.overall_percentage}%
                </Text>
              </View>
              <Text className="text-neutral-600 dark:text-neutral-400 mt-4 text-center tracking-tight">
                Overall Attendance Rate
              </Text>
            </View>

            {/* Stats Grid */}
            <View className="flex-row justify-between">
              <View className="flex-1 items-center">
                <Text className="text-3xl font-bold text-[#4F46E5] dark:text-[#818CF8] tracking-tight">
                  {overallStats.total_courses}
                </Text>
                <Text className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 tracking-tight">
                  Courses
                </Text>
              </View>
              <View className="flex-1 items-center border-l-2 border-r-2 border-neutral-200 dark:border-neutral-800">
                <Text className="text-3xl font-bold text-[#10B981] dark:text-[#6EE7B7] tracking-tight">
                  {overallStats.attended_sessions}
                </Text>
                <Text className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 tracking-tight">
                  Attended
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-3xl font-bold text-neutral-600 dark:text-neutral-400 tracking-tight">
                  {overallStats.total_sessions}
                </Text>
                <Text className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 tracking-tight">
                  Total Sessions
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Course Breakdown */}
        <View className="px-6 mt-8 mb-4">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-0 tracking-tight mb-4">
            By Course
          </Text>

          {courseStats.length === 0 ? (
            <View className="bg-white dark:bg-neutral-900 rounded-2xl p-10 items-center border-2 border-neutral-200 dark:border-neutral-800">
              <View className="bg-neutral-100 dark:bg-neutral-800 p-5 rounded-2xl">
                <Ionicons name="school-outline" size={56} color="#A3A3A3" />
              </View>
              <Text className="text-neutral-500 dark:text-neutral-500 text-center mt-5 text-base tracking-tight">
                No courses enrolled yet
              </Text>
            </View>
          ) : (
            courseStats.map((stat) => (
              <View
                key={stat.course_id}
                className="bg-white dark:bg-neutral-900 rounded-2xl p-5 mb-4 border-2 border-neutral-200 dark:border-neutral-800"
              >
                {/* Course Header */}
                <View className="flex-row justify-between items-start mb-4">
                  <View className="flex-1">
                    <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-0 tracking-tight">
                      {stat.course_code}
                    </Text>
                    <Text className="text-sm text-neutral-600 dark:text-neutral-400 mt-1.5 tracking-tight">
                      {stat.course_title}
                    </Text>
                  </View>
                  <View className={`px-3.5 py-2 rounded-xl border-2 ${getPercentageBgColor(stat.attendance_percentage)} ${getPercentageBorderColor(stat.attendance_percentage)}`}>
                    <Text className={`text-sm font-bold ${getPercentageColor(stat.attendance_percentage)} tracking-tight`}>
                      {stat.attendance_percentage}%
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                {renderProgressBar(stat.attendance_percentage)}

                {/* Session Count */}
                <View className="flex-row justify-between mt-4">
                  <Text className="text-sm text-neutral-600 dark:text-neutral-400 tracking-tight">
                    {stat.attended_sessions} of {stat.total_sessions} sessions attended
                  </Text>
                  {stat.attendance_percentage < 75 && (
                    <View className="flex-row items-center">
                      <Ionicons name="warning-outline" size={14} color="#EF4444" />
                      <Text className="text-sm text-[#EF4444] ml-1.5 font-semibold tracking-tight">
                        At Risk
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Legend */}
        <View className="mx-6 mb-8 bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-6 border-2 border-neutral-200 dark:border-neutral-800">
          <Text className="text-base font-bold text-neutral-900 dark:text-neutral-0 mb-4 tracking-tight">
            Performance Guide
          </Text>
          <View className="space-y-2">
            <View className="flex-row items-center">
              <View className="w-4 h-4 rounded-lg bg-[#10B981] mr-3 border-2 border-[#047857]" />
              <Text className="text-sm text-neutral-700 dark:text-neutral-300 tracking-tight">
                75% and above - Excellent
              </Text>
            </View>
            <View className="flex-row items-center mt-3">
              <View className="w-4 h-4 rounded-lg bg-[#F59E0B] mr-3 border-2 border-[#D97706]" />
              <Text className="text-sm text-neutral-700 dark:text-neutral-300 tracking-tight">
                50% - 74% - Needs Improvement
              </Text>
            </View>
            <View className="flex-row items-center mt-3">
              <View className="w-4 h-4 rounded-lg bg-[#EF4444] mr-3 border-2 border-[#DC2626]" />
              <Text className="text-sm text-neutral-700 dark:text-neutral-300 tracking-tight">
                Below 50% - At Risk
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
