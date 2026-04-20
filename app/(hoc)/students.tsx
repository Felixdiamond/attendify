/**
 * HOC Student Management Screen - ENHANCED 2025
 * 
 * Complete overhaul following MIGRATION_SUMMARY.md
 * - View students by department_id + level
 * - Show department courses with enrollment stats
 * - Bulk enrollment functionality
 * - Cinema-grade UI design
 * 
 * Requirements: MIGRATION_SUMMARY.md Section 2
 */

import { enrollStudents, getCoursesForDepartment, getDepartmentEnrollments } from '@/lib/course';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Course, User } from '@/types/database.types';
import { ACADEMIC_LEVELS } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// TYPES
// ============================================================================

interface StudentWithSelection extends User {
  selected: boolean;
  enrolledCourses: string[]; // Course IDs
}

interface CourseWithStats extends Course {
  enrollmentCount: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StudentsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();

  // State
  const [students, setStudents] = useState<StudentWithSelection[]>([]);
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentWithSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | null>(user?.level ?? null);
  const [departmentCode, setDepartmentCode] = useState('');

  // Fetch department code from department_id
  const fetchDepartmentCode = async () => {
    if (!user?.department_id) return;

    const { data, error } = await supabase
      .from('departments')
      .select('code')
      .eq('id', user.department_id)
      .single();

    if (error) {
      console.error('Error fetching department code:', error);
      return;
    }

    setDepartmentCode(data.code);
  };

  // Fetch students in HOC's department
  const fetchStudents = async () => {
    try {
      if (!user || user.role !== 'hoc' || !user.department_id) {
        Alert.alert('Error', 'You must be an HOC to access this screen');
        return;
      }

      // Use RPC function to avoid RLS recursion
      // Pass level filter to the RPC for server-side scoping
      const { data, error } = await supabase.rpc('get_my_department_users', {
        p_level: levelFilter,
      });

      if (error) throw error;

      // Filter to students (and HOCs who are also students) and sort by last name
      const sortedData = (data || [])
        .filter((u: User) => u.role === 'student' || u.role === 'hoc')
        .sort((a: User, b: User) => a.last_name.localeCompare(b.last_name));
      // Get all enrollments for this HOC's department using RPC
      const departmentEnrollments = await getDepartmentEnrollments();
      // Map of studentId -> course_ids
      const enrollmentsByStudent = new Map<string, string[]>();
      (departmentEnrollments || []).forEach((e: any) => {
        const list = enrollmentsByStudent.get(e.student_id) || [];
        list.push(e.course_id);
        enrollmentsByStudent.set(e.student_id, list);
      });

      const studentsWithEnrollments = sortedData.map((student: User) => ({
        ...student,
        selected: false,
        enrolledCourses: enrollmentsByStudent.get(student.id) || [],
      }));

      setStudents(studentsWithEnrollments);
      setFilteredStudents(studentsWithEnrollments);
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to load students. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch department courses with enrollment stats
  const fetchCourses = async () => {
    if (!departmentCode) return;

    try {
      const coursesData = await getCoursesForDepartment(departmentCode);

      // Get enrollments for department and compute counts by course
      const departmentEnrollments = await getDepartmentEnrollments();
      const enrollmentCountsByCourse = new Map<string, number>();
      (departmentEnrollments || []).forEach((e: any) => {
        enrollmentCountsByCourse.set(e.course_id, (enrollmentCountsByCourse.get(e.course_id) || 0) + 1);
      });

      const coursesWithStats = coursesData.map((course) => ({
        ...course,
        enrollmentCount: enrollmentCountsByCourse.get(course.id) || 0,
      }));

      setCourses(coursesWithStats);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDepartmentCode();
  }, []);

  useEffect(() => {
    if (departmentCode) {
      fetchStudents();
      fetchCourses();
    }
  }, [departmentCode, levelFilter]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...students];

    // Apply level filter
    if (levelFilter !== null) {
      filtered = filtered.filter((student) => student.level === levelFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (student) =>
          student.first_name.toLowerCase().includes(query) ||
          student.last_name.toLowerCase().includes(query) ||
          student.matric_number?.toLowerCase().includes(query) ||
          `${student.first_name} ${student.last_name}`.toLowerCase().includes(query)
      );
    }

    setFilteredStudents(filtered);
  }, [students, searchQuery, levelFilter]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchStudents();
    fetchCourses();
  };

  // Toggle student selection
  const toggleStudentSelection = (studentId: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, selected: !student.selected } : student
      )
    );
  };

  // Select all filtered students
  const selectAll = () => {
    const filteredIds = new Set(filteredStudents.map((s) => s.id));
    setStudents((prev) =>
      prev.map((student) =>
        filteredIds.has(student.id) ? { ...student, selected: true } : student
      )
    );
  };

  // Deselect all students
  const deselectAll = () => {
    setStudents((prev) => prev.map((student) => ({ ...student, selected: false })));
  };

  // Get selected students
  const selectedStudents = students.filter((s) => s.selected);
  const selectedCount = selectedStudents.length;

  // Handle bulk enrollment
  const handleBulkEnroll = () => {
    if (selectedCount === 0) {
      Alert.alert('No Students Selected', 'Please select at least one student to enroll.');
      return;
    }

    // Navigate to enrollment screen with selected student IDs
    const studentIds = selectedStudents.map((s) => s.id).join(',');
    router.push(`/(hoc)/enroll?students=${studentIds}`);
  };

  // Quick enroll in single course
  const handleQuickEnroll = async (courseId: string) => {
    if (selectedCount === 0) {
      Alert.alert('No Students Selected', 'Please select students first.');
      return;
    }

    Alert.alert(
      'Confirm Enrollment',
      `Enroll ${selectedCount} student${selectedCount !== 1 ? 's' : ''} in this course?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enroll',
          onPress: async () => {
            try {
              const studentIds = selectedStudents.map((s) => s.id);
              const result = await enrollStudents(studentIds, [courseId]);

              Alert.alert(
                'Success',
                `Enrolled ${result.details.newEnrollments} student${
                  result.details.newEnrollments !== 1 ? 's' : ''
                }.\n${result.details.skippedDuplicates} already enrolled.`
              );

              // Refresh data
              handleRefresh();
              deselectAll();
            } catch (error) {
              console.error('Enrollment error:', error);
              Alert.alert('Error', error instanceof Error ? error.message : 'Enrollment failed');
            }
          },
        },
      ]
    );
  };

  // Render student item
  const renderStudent = ({ item }: { item: StudentWithSelection }) => (
    <Pressable
      onPress={() => toggleStudentSelection(item.id)}
      className="bg-white dark:bg-neutral-900 border-b-2 border-neutral-200 dark:border-neutral-800 active:bg-neutral-50 dark:active:bg-neutral-850"
    >
      <View className="flex-row items-center p-5">
        {/* Checkbox */}
        <View
          className={`w-6 h-6 rounded-lg border-2 mr-4 items-center justify-center ${
            item.selected
              ? 'bg-[#4F46E5] border-[#4F46E5]'
              : 'border-neutral-400 dark:border-neutral-600'
          }`}
        >
          {item.selected && <Ionicons name="checkmark" size={16} color="white" />}
        </View>

        {/* Student Info */}
        <View className="flex-1">
          <Text className="text-base font-bold text-neutral-900 dark:text-neutral-0 tracking-tight">
            {item.first_name} {item.last_name}
            {item.id === user?.id && item.role === 'hoc' && (
              <Text className="text-xs text-blue-600 ml-2"> (You - HOC)</Text>
            )}
          </Text>
          <Text className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 tracking-tight">
            {item.matric_number}
          </Text>
          <View className="flex-row items-center gap-3 mt-2">
            <View className="flex-row items-center gap-1">
              <Ionicons name="school-outline" size={14} color="#A3A3A3" />
              <Text className="text-xs text-neutral-500 dark:text-neutral-500 tracking-tight">
                Level {item.level}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="book-outline" size={14} color="#A3A3A3" />
              <Text className="text-xs text-neutral-500 dark:text-neutral-500 tracking-tight">
                {item.enrolledCourses.length} course{item.enrolledCourses.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Selection indicator */}
        {item.selected && (
          <View className="ml-2">
            <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
          </View>
        )}
      </View>
    </Pressable>
  );

  // Render empty state
  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center p-8">
      <Ionicons name="people-outline" size={64} color="#A3A3A3" />
      <Text className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mt-4 tracking-tight">
        No Students Found
      </Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-500 text-center mt-2 tracking-tight">
        {searchQuery || levelFilter
          ? 'Try adjusting your filters or search query'
          : 'No students in your department yet'}
      </Text>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="text-neutral-600 dark:text-neutral-400 mt-4 tracking-tight">
          Loading students...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom }} className="bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View className="px-6 pt-6 pb-4 bg-white dark:bg-neutral-900 border-b-2 border-neutral-200 dark:border-neutral-800">
        <Text className="text-4xl font-bold text-neutral-900 dark:text-neutral-0 mb-2 tracking-tighter">
          Student Management
        </Text>
        <Text className="text-base text-neutral-600 dark:text-neutral-400 tracking-tight">
          {departmentCode} Department • {students.length} student{students.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search and Filter Bar */}
      <View className="bg-white dark:bg-neutral-900 border-b-2 border-neutral-200 dark:border-neutral-800 p-4">
        {/* Search Input */}
        <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-850 rounded-xl px-4 py-3 mb-3 border-2 border-neutral-200 dark:border-neutral-800">
          <Ionicons name="search" size={20} color="#A3A3A3" />
          <TextInput
            className="flex-1 ml-3 text-base text-neutral-900 dark:text-neutral-0 font-medium"
            placeholder="Search by name or matric number..."
            placeholderTextColor="#A3A3A3"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#A3A3A3" />
            </Pressable>
          )}
        </View>

        {/* Level Filter */}
        <View className="flex-row items-center mb-3">
          <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mr-3 tracking-tight">
            Level:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setLevelFilter(null)}
                className={`px-4 py-2 rounded-xl border-2 ${
                  levelFilter === null
                    ? 'bg-[#4F46E5] border-[#4F46E5]'
                    : 'bg-neutral-100 dark:bg-neutral-850 border-neutral-300 dark:border-neutral-700'
                }`}
              >
                <Text
                  className={`text-sm font-semibold tracking-tight ${
                    levelFilter === null ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  All
                </Text>
              </Pressable>
              {ACADEMIC_LEVELS.map((level) => (
                <Pressable
                  key={level}
                  onPress={() => setLevelFilter(level)}
                  className={`px-4 py-2 rounded-xl border-2 ${
                    levelFilter === level
                      ? 'bg-[#4F46E5] border-[#4F46E5]'
                      : 'bg-neutral-100 dark:bg-neutral-850 border-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold tracking-tight ${
                      levelFilter === level ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {level}L
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Selection Actions */}
        {filteredStudents.length > 0 && (
          <View className="flex-row items-center justify-between pt-3 border-t-2 border-neutral-200 dark:border-neutral-800">
            <Text className="text-sm text-neutral-600 dark:text-neutral-400 tracking-tight">
              {filteredStudents.length} result{filteredStudents.length !== 1 ? 's' : ''}
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={selectAll}
                className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg border-2 border-neutral-300 dark:border-neutral-700"
              >
                <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 tracking-tight">
                  Select All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={deselectAll}
                className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg border-2 border-neutral-300 dark:border-neutral-700"
              >
                <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 tracking-tight">
                  Clear
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Student List */}
      <FlatList
        data={filteredStudents}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F46E5" />
        }
        contentContainerStyle={filteredStudents.length === 0 ? { flex: 1 } : { paddingBottom: Math.max(insets.bottom, 16) }}
      />

      {/* Department Courses Panel - Shows when students selected */}
      {selectedCount > 0 && courses.length > 0 && (
        <View className="bg-white dark:bg-neutral-900 border-t-2 border-neutral-200 dark:border-neutral-800 p-4 max-h-64">
          <Text className="text-base font-bold text-neutral-900 dark:text-neutral-0 mb-3 tracking-tight">
            Quick Enroll in Course
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {courses.map((course) => (
              <TouchableOpacity
                key={course.id}
                onPress={() => handleQuickEnroll(course.id)}
                className="flex-row items-center justify-between p-3 mb-2 bg-neutral-50 dark:bg-neutral-850 rounded-xl border-2 border-neutral-200 dark:border-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-800"
              >
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-900 dark:text-neutral-0 tracking-tight">
                    {course.code}
                  </Text>
                  <Text className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 tracking-tight">
                    {course.enrollmentCount} enrolled
                  </Text>
                </View>
                <Ionicons name="add-circle" size={24} color="#4F46E5" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bulk Action Toolbar */}
      {selectedCount > 0 && (
        <View
          className="bg-[#4F46E5] p-4 flex-row items-center justify-between border-t-2 border-[#4338CA]"
          style={{ paddingBottom: 16 + Math.max(insets.bottom, 8) }}
        >
          <View>
            <Text className="text-white font-bold text-base tracking-tight">
              {selectedCount} student{selectedCount !== 1 ? 's' : ''} selected
            </Text>
            <Text className="text-[#C7D2FE] text-sm tracking-tight">Ready for enrollment</Text>
          </View>
          <TouchableOpacity
            onPress={handleBulkEnroll}
            className="bg-white px-5 py-3 rounded-xl flex-row items-center border-2 border-white active:scale-95"
          >
            <Ionicons name="school" size={20} color="#4F46E5" />
            <Text className="text-[#4F46E5] font-bold ml-2 tracking-tight">
              Manage Courses
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
