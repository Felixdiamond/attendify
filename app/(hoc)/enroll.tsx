/**
 * HOC Bulk Enrollment Screen
 * 
 * Allows HOCs to enroll selected students in multiple courses.
 * Displays enrollment summary before confirmation.
 * 
 * Requirements: 12.1, 12.2
 */

import { enrollStudents, getAllCoursesByLevel, getCoursesByDepartmentAndLevel } from '@/lib/course';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Course, User } from '@/types/database.types';
import { ACADEMIC_LEVELS } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// TYPES
// ============================================================================

interface CourseWithSelection extends Course {
  selected: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function EnrollScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();

  // Parse student IDs from URL params
  const studentIds = typeof params.students === 'string' 
    ? params.students.split(',') 
    : [];

  // State
  const [students, setStudents] = useState<User[]>([]);
  const [deptCourses, setDeptCourses] = useState<CourseWithSelection[]>([]);
  const [allLevelCourses, setAllLevelCourses] = useState<CourseWithSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAllCourses, setLoadingAllCourses] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [courseTab, setCourseTab] = useState<'department' | 'all'>('department');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number>(user?.level ?? 100);

  // Combined courses based on active tab
  const activeCourses = courseTab === 'department' ? deptCourses : allLevelCourses;
  const courses = searchQuery.trim()
    ? activeCourses.filter((c) =>
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeCourses;

  // Fetch selected students and department courses on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user || user.role !== 'hoc') {
          Alert.alert('Error', 'You must be an HOC to access this screen');
          router.back();
          return;
        }

        if (studentIds.length === 0) {
          Alert.alert('Error', 'No students selected');
          router.back();
          return;
        }

        // Fetch selected students via RPC
        const { data: rpcStudents, error: rpcError } = await supabase.rpc('get_my_department_users');
        if (rpcError) throw rpcError;
        const finalStudents = (rpcStudents || []).filter(
          (u: User) => studentIds.includes(u.id) && (u.role === 'student' || u.role === 'hoc')
        );

        if (!finalStudents || finalStudents.length === 0) {
          Alert.alert('Error', 'No valid students found');
          router.back();
          return;
        }

        setStudents(finalStudents);

        // Fetch department courses
        if (!user.department_id) {
          throw new Error('HOC user missing department_id');
        }

        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('code')
          .eq('id', user.department_id)
          .single();

        if (deptError || !deptData) {
          throw new Error('Failed to fetch department info');
        }

        const coursesData = await getCoursesByDepartmentAndLevel(deptData.code);
        setDeptCourses(coursesData.map((course) => ({ ...course, selected: false })));
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load enrollment data. Please try again.');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch all courses by level when tab switches to 'all' or level changes
  useEffect(() => {
    if (courseTab !== 'all') return;

    const fetchAllCourses = async () => {
      setLoadingAllCourses(true);
      try {
        const data = await getAllCoursesByLevel(selectedLevel);
        setAllLevelCourses(data.map((course) => ({ ...course, selected: false })));
      } catch (error) {
        console.error('Error fetching all courses:', error);
        Alert.alert('Error', 'Failed to load courses for this level.');
      } finally {
        setLoadingAllCourses(false);
      }
    };

    fetchAllCourses();
  }, [courseTab, selectedLevel]);

  // Toggle course selection — updates the correct source list
  const toggleCourseSelection = (courseId: string) => {
    const updater = (prev: CourseWithSelection[]) =>
      prev.map((course) =>
        course.id === courseId ? { ...course, selected: !course.selected } : course
      );
    if (courseTab === 'department') {
      setDeptCourses(updater);
    } else {
      setAllLevelCourses(updater);
    }
  };

  // Select all visible courses
  const selectAllCourses = () => {
    const visibleIds = new Set(courses.map((c) => c.id));
    const updater = (prev: CourseWithSelection[]) =>
      prev.map((course) => (visibleIds.has(course.id) ? { ...course, selected: true } : course));
    if (courseTab === 'department') {
      setDeptCourses(updater);
    } else {
      setAllLevelCourses(updater);
    }
  };

  // Deselect all courses across both tabs
  const deselectAllCourses = () => {
    setDeptCourses((prev) => prev.map((course) => ({ ...course, selected: false })));
    setAllLevelCourses((prev) => prev.map((course) => ({ ...course, selected: false })));
  };

  // Get selected courses from BOTH tabs
  const selectedCourses = [
    ...deptCourses.filter((c) => c.selected),
    ...allLevelCourses.filter((c) => c.selected && !deptCourses.some((d) => d.id === c.id && d.selected)),
  ];
  const selectedCourseCount = selectedCourses.length;

  // Handle enrollment
  const handleEnroll = async () => {
    if (selectedCourseCount === 0) {
      Alert.alert('No Courses Selected', 'Please select at least one course.');
      return;
    }

    setEnrolling(true);

    try {
      const courseIds = selectedCourses.map((c) => c.id);
      const result = await enrollStudents(studentIds, courseIds);

      // Show success message
      const message = `Successfully enrolled ${students.length} student${students.length !== 1 ? 's' : ''} in ${selectedCourseCount} course${selectedCourseCount !== 1 ? 's' : ''}.\n\n` +
        `New enrollments: ${result.details.newEnrollments}\n` +
        `Already enrolled: ${result.details.skippedDuplicates}`;

      Alert.alert('Enrollment Complete', message, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error enrolling students:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to enroll students';
      Alert.alert('Enrollment Failed', errorMessage);
    } finally {
      setEnrolling(false);
    }
  };

  // Show confirmation summary
  const handleShowSummary = () => {
    if (selectedCourseCount === 0) {
      Alert.alert('No Courses Selected', 'Please select at least one course.');
      return;
    }
    setShowSummary(true);
  };

  // Render course item
  const renderCourse = ({ item }: { item: CourseWithSelection }) => (
    <Pressable
      onPress={() => toggleCourseSelection(item.id)}
      className="flex-row items-center bg-white p-4 border-b border-gray-200"
      disabled={enrolling}
    >
      {/* Checkbox */}
      <View
        className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${
          item.selected ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
        }`}
      >
        {item.selected && <Ionicons name="checkmark" size={16} color="white" />}
      </View>

      {/* Course Info */}
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900">{item.code}</Text>
        <Text className="text-sm text-gray-600 mt-0.5">{item.title}</Text>
        <Text className="text-xs text-gray-500 mt-0.5">
          {item.level}L • {item.semester === 'first' ? 'First' : 'Second'} Semester • {item.academic_year}
        </Text>
      </View>

      {/* Selection indicator */}
      {item.selected && (
        <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
      )}
    </Pressable>
  );

  // Render empty state
  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center p-8">
      <Ionicons name="book-outline" size={64} color="#9ca3af" />
      <Text className="text-lg font-semibold text-gray-700 mt-4">No Courses Available</Text>
      <Text className="text-sm text-gray-500 text-center mt-2">
        No active courses found in your department
      </Text>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }} className="items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-600 mt-4">Loading enrollment data...</Text>
      </View>
    );
  }

  // Summary modal
  if (showSummary) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }} className="bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-200 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">Enrollment Summary</Text>
            <Pressable onPress={() => setShowSummary(false)} disabled={enrolling}>
              <Ionicons name="close" size={28} color="#6b7280" />
            </Pressable>
          </View>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Students Section */}
          <View className="bg-white rounded-lg p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="people" size={24} color="#3b82f6" />
              <Text className="text-lg font-semibold text-gray-900 ml-2">
                Students ({students.length})
              </Text>
            </View>
            {students.map((student, index) => {
              const isHocSelf = user && student.id === user.id;
              return (
                <View
                  key={student.id}
                  className={`py-2 ${index !== students.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <Text className="text-sm font-medium text-gray-900">
                    {student.first_name} {student.last_name}
                    {isHocSelf && (
                      <Text className="text-xs text-blue-600 ml-2">(You - HOC)</Text>
                    )}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {student.matric_number} • {student.level}L
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Courses Section */}
          <View className="bg-white rounded-lg p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="book" size={24} color="#3b82f6" />
              <Text className="text-lg font-semibold text-gray-900 ml-2">
                Courses ({selectedCourseCount})
              </Text>
            </View>
            {selectedCourses.map((course, index) => (
              <View
                key={course.id}
                className={`py-2 ${index !== selectedCourses.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <Text className="text-sm font-medium text-gray-900">{course.code}</Text>
                <Text className="text-xs text-gray-500 mt-0.5">{course.title}</Text>
              </View>
            ))}
          </View>

          {/* Total Enrollments */}
          <View className="bg-blue-50 rounded-lg p-4 mb-4">
            <Text className="text-sm text-gray-600 mb-1">Total Enrollments</Text>
            <Text className="text-3xl font-bold text-blue-600">
              {students.length * selectedCourseCount}
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              {students.length} student{students.length !== 1 ? 's' : ''} × {selectedCourseCount} course{selectedCourseCount !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Note */}
          <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#f59e0b" />
              <Text className="text-xs text-gray-700 ml-2 flex-1">
                Students already enrolled in selected courses will be skipped automatically.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View className="bg-white border-t border-gray-200 p-4" style={{ paddingBottom: 16 + Math.max(insets.bottom, 8) }}>
          <Pressable
            onPress={handleEnroll}
            disabled={enrolling}
            className={`py-3.5 rounded-lg items-center mb-2 ${
              enrolling ? 'bg-gray-400' : 'bg-blue-500'
            }`}
          >
            {enrolling ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="white" />
                <Text className="text-white font-semibold text-base ml-2">
                  Enrolling...
                </Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-base">
                Confirm Enrollment
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => setShowSummary(false)}
            disabled={enrolling}
            className="py-3.5 rounded-lg items-center bg-gray-200"
          >
            <Text className="text-gray-700 font-semibold text-base">Back to Selection</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Main enrollment screen
  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }} className="bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 p-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Pressable onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </Pressable>
            <Text className="text-xl font-bold text-gray-900">Enroll Students</Text>
          </View>
        </View>

        {/* Student Count */}
        <View className="bg-blue-50 rounded-lg p-3">
          <Text className="text-sm text-gray-600">
            Enrolling {students.length} student{students.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Tab Switcher: My Department vs All Courses */}
        <View className="flex-row mt-3 bg-gray-100 rounded-xl p-1">
          <Pressable
            onPress={() => setCourseTab('department')}
            className={`flex-1 py-2.5 rounded-lg items-center ${
              courseTab === 'department' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text className={`text-sm font-semibold ${
              courseTab === 'department' ? 'text-blue-600' : 'text-gray-500'
            }`}>
              My Department
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setCourseTab('all')}
            className={`flex-1 py-2.5 rounded-lg items-center ${
              courseTab === 'all' ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text className={`text-sm font-semibold ${
              courseTab === 'all' ? 'text-blue-600' : 'text-gray-500'
            }`}>
              All Courses
            </Text>
          </Pressable>
        </View>

        {/* Level selector (only for All Courses tab) */}
        {courseTab === 'all' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
            <View className="flex-row gap-2">
              {ACADEMIC_LEVELS.map((level) => (
                <Pressable
                  key={level}
                  onPress={() => setSelectedLevel(level)}
                  className={`px-4 py-2 rounded-xl border-2 ${
                    selectedLevel === level
                      ? 'bg-[#4F46E5] border-[#4F46E5]'
                      : 'bg-gray-100 border-gray-300'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${
                    selectedLevel === level ? 'text-white' : 'text-gray-700'
                  }`}>
                    {level}L
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mt-3 border border-gray-200">
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-sm text-gray-900"
            placeholder={courseTab === 'department' ? 'Search department courses...' : 'Search all courses (e.g. MAT, PHY)...'}
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </Pressable>
          )}
        </View>

        {/* Course Selection Actions */}
        {courses.length > 0 && (
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-200">
            <Text className="text-sm text-gray-600">
              {courses.length} course{courses.length !== 1 ? 's' : ''} available
              {selectedCourseCount > 0 && ` • ${selectedCourseCount} selected`}
            </Text>
            <View className="flex-row gap-2">
              <Pressable onPress={selectAllCourses} className="px-3 py-1.5 bg-gray-200 rounded">
                <Text className="text-sm font-medium text-gray-700">Select All</Text>
              </Pressable>
              <Pressable onPress={deselectAllCourses} className="px-3 py-1.5 bg-gray-200 rounded">
                <Text className="text-sm font-medium text-gray-700">Clear</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Loading state for all courses */}
      {courseTab === 'all' && loadingAllCourses ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="text-gray-500 mt-3 text-sm">Loading {selectedLevel}L courses...</Text>
        </View>
      ) : (
        /* Course List */
        <FlatList
          data={courses}
          renderItem={renderCourse}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={courses.length === 0 ? { flex: 1 } : { paddingBottom: selectedCourseCount > 0 ? 0 : Math.max(insets.bottom, 12) }}
        />
      )}

      {/* Action Button */}
      {selectedCourseCount > 0 && (
        <View className="bg-white border-t border-gray-200 p-4" style={{ paddingBottom: 16 + Math.max(insets.bottom, 8) }}>
          <Pressable
            onPress={handleShowSummary}
            className="bg-blue-500 py-3.5 rounded-lg flex-row items-center justify-center"
          >
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text className="text-white font-semibold text-base ml-2">
              Review Enrollment ({selectedCourseCount} course{selectedCourseCount !== 1 ? 's' : ''})
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
