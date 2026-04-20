/**
 * HOC Semester Management Screen
 * 
 * Allows HOCs to:
 * 1. Close courses for the semester (archive attendance, remove enrollments)
 * 2. Move students to the next level (with optional auto-enrollment)
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import { enrollStudents, getCoursesByDepartmentAndLevel } from '@/lib/course';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Course, User } from '@/types/database.types';
import { ACADEMIC_LEVELS } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    Text,
    View
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface CourseWithSelection extends Course {
  selected: boolean;
}

interface StudentWithSelection extends User {
  selected: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SemesterManagementScreen() {
  const user = useAuthStore((state) => state.user);

  // State
  const [activeTab, setActiveTab] = useState<'close' | 'move'>('close');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Close Semester State
  const [courses, setCourses] = useState<CourseWithSelection[]>([]);

  // Move Students State
  const [currentLevel, setCurrentLevel] = useState<number>(100);
  const [targetLevel, setTargetLevel] = useState<number>(200);
  const [students, setStudents] = useState<StudentWithSelection[]>([]);
  const [applyAutoEnroll, setApplyAutoEnroll] = useState(true);

  // Fetch courses for closing
  const fetchCourses = async () => {
    try {
      if (!user || user.role !== 'hoc' || !user.department_id) {
        Alert.alert('Error', 'You must be an HOC to access this screen');
        return;
      }

      // First, get the department code from department_id
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('code')
        .eq('id', user.department_id)
        .single();

      if (deptError || !deptData) {
        throw new Error('Failed to fetch department info');
      }

      const coursesData = await getCoursesByDepartmentAndLevel(deptData.code);
      
      // Add selection state
      const coursesWithSelection: CourseWithSelection[] = coursesData.map((course) => ({
        ...course,
        selected: false,
      }));

      setCourses(coursesWithSelection);
    } catch (error) {
      console.error('Error fetching courses:', error);
      Alert.alert('Error', 'Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch students for level move
  const fetchStudents = async () => {
    try {
      if (!user || user.role !== 'hoc') {
        Alert.alert('Error', 'You must be an HOC to access this screen');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .eq('department_id', user.department_id)
        .eq('level', currentLevel)
        .order('last_name', { ascending: true });

      if (error) throw error;

      // Add selection state
      const studentsWithSelection: StudentWithSelection[] = (data || []).map((student) => ({
        ...student,
        selected: false,
      }));

      setStudents(studentsWithSelection);
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to load students. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (activeTab === 'close') {
      fetchCourses();
    } else {
      fetchStudents();
    }
  }, [activeTab, currentLevel]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'close') {
      fetchCourses();
    } else {
      fetchStudents();
    }
  };

  // Toggle course selection
  const toggleCourseSelection = (courseId: string) => {
    setCourses((prev) =>
      prev.map((course) =>
        course.id === courseId ? { ...course, selected: !course.selected } : course
      )
    );
  };

  // Toggle student selection
  const toggleStudentSelection = (studentId: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, selected: !student.selected } : student
      )
    );
  };

  // Select all courses
  const selectAllCourses = () => {
    setCourses((prev) => prev.map((course) => ({ ...course, selected: true })));
  };

  // Deselect all courses
  const deselectAllCourses = () => {
    setCourses((prev) => prev.map((course) => ({ ...course, selected: false })));
  };

  // Select all students
  const selectAllStudents = () => {
    setStudents((prev) => prev.map((student) => ({ ...student, selected: true })));
  };

  // Deselect all students
  const deselectAllStudents = () => {
    setStudents((prev) => prev.map((student) => ({ ...student, selected: false })));
  };

  // Get selected items
  const selectedCourses = courses.filter((c) => c.selected);
  const selectedStudents = students.filter((s) => s.selected);

  // Handle close semester
  const handleCloseSemester = () => {
    if (selectedCourses.length === 0) {
      Alert.alert('No Courses Selected', 'Please select at least one course to close.');
      return;
    }

    const courseList = selectedCourses.map((c) => c.code).join(', ');

    Alert.alert(
      'Close Semester',
      `Are you sure you want to close ${selectedCourses.length} course${selectedCourses.length !== 1 ? 's' : ''}?\n\n${courseList}\n\nThis will:\n• Mark courses as closed\n• Keep attendance data (archived)\n• Remove all student enrollments\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Courses',
          style: 'destructive',
          onPress: executeCloseSemester,
        },
      ]
    );
  };

  // Execute close semester
  const executeCloseSemester = async () => {
    setProcessing(true);

    try {
      const courseIds = selectedCourses.map((c) => c.id);

      // Set is_closed = TRUE for selected courses
      const { error: closeError } = await supabase
        .from('courses')
        .update({ is_closed: true })
        .in('id', courseIds);

      if (closeError) throw closeError;

      // Remove course_enrollments for closed courses
      const { error: enrollError } = await supabase
        .from('course_enrollments')
        .delete()
        .in('course_id', courseIds);

      if (enrollError) throw enrollError;

      // Note: Attendance data is kept in database (archived)

      Alert.alert(
        'Success',
        `Successfully closed ${selectedCourses.length} course${selectedCourses.length !== 1 ? 's' : ''} and removed enrollments.`,
        [{ text: 'OK', onPress: () => {
          deselectAllCourses();
          fetchCourses();
        }}]
      );
    } catch (error) {
      console.error('Error closing semester:', error);
      Alert.alert('Error', 'Failed to close courses. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Handle move students
  const handleMoveStudents = () => {
    if (selectedStudents.length === 0) {
      Alert.alert('No Students Selected', 'Please select at least one student to move.');
      return;
    }

    if (currentLevel === targetLevel) {
      Alert.alert('Invalid Level', 'Target level must be different from current level.');
      return;
    }

    Alert.alert(
      'Move Students to Next Level',
      `Move ${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''} from ${currentLevel}L to ${targetLevel}L?\n\n${applyAutoEnroll ? 'Auto-enrollment rules will be applied for the new level.' : 'No auto-enrollment will be applied.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move Students',
          onPress: executeMoveStudents,
        },
      ]
    );
  };

  // Execute move students
  const executeMoveStudents = async () => {
    setProcessing(true);

    try {
      const studentIds = selectedStudents.map((s) => s.id);

      // Update level field for selected students
      const { error: updateError } = await supabase
        .from('users')
        .update({ level: targetLevel })
        .in('id', studentIds);

      if (updateError) throw updateError;

      // Apply auto-enrollment rules if requested
      let enrollmentCount = 0;
      if (applyAutoEnroll && user && user.department_id) {
        // Get auto-enrollment rules for new level
        const { data: rules, error: rulesError } = await supabase
          .from('auto_enrollment_rules')
          .select('course_id')
          .eq('department_id', user.department_id)
          .eq('level', targetLevel);

        if (rulesError) {
          console.error('Error fetching auto-enrollment rules:', rulesError);
        } else if (rules && rules.length > 0) {
          const courseIds = rules.map((r) => r.course_id);

          // Prepare enrollment records
          const enrollmentRecords = [];
          for (const studentId of studentIds) {
            for (const courseId of courseIds) {
              enrollmentRecords.push({
                student_id: studentId,
                course_id: courseId,
                enrolled_by: user.id,
              });
            }
          }

          // Use enrollStudents helper which uses RPC for bulk enrollments
          try {
            const result = await enrollStudents(studentIds, courseIds);
            enrollmentCount = result.details.newEnrollments || 0;
          } catch (err) {
            console.error('Error applying auto-enrollment via RPC:', err);
          }
        }
      }

      const message = applyAutoEnroll && enrollmentCount > 0
        ? `Successfully moved ${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''} to ${targetLevel}L and enrolled them in ${enrollmentCount} course${enrollmentCount !== 1 ? 's' : ''}.`
        : `Successfully moved ${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''} to ${targetLevel}L.`;

      Alert.alert('Success', message, [
        {
          text: 'OK',
          onPress: () => {
            deselectAllStudents();
            fetchStudents();
          },
        },
      ]);
    } catch (error) {
      console.error('Error moving students:', error);
      Alert.alert('Error', 'Failed to move students. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Render course item
  const renderCourse = ({ item }: { item: CourseWithSelection }) => (
    <Pressable
      onPress={() => toggleCourseSelection(item.id)}
      className="flex-row items-center bg-white dark:bg-neutral-900 p-4 border-b border-neutral-200 dark:border-neutral-800"
      disabled={processing}
    >
      {/* Checkbox */}
      <View
        className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${
          item.selected ? 'bg-red-500 border-red-500' : 'border-neutral-400 dark:border-neutral-500'
        }`}
      >
        {item.selected && <Ionicons name="checkmark" size={16} color="white" />}
      </View>

      {/* Course Info */}
      <View className="flex-1">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{item.code}</Text>
        <Text className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">{item.title}</Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {item.level}L • {item.semester === 'first' ? 'First' : 'Second'} Semester • {item.academic_year}
        </Text>
      </View>

      {/* Selection indicator */}
      {item.selected && (
        <Ionicons name="checkmark-circle" size={24} color="#ef4444" />
      )}
    </Pressable>
  );

  // Render student item
  const renderStudent = ({ item }: { item: StudentWithSelection }) => (
    <Pressable
      onPress={() => toggleStudentSelection(item.id)}
      className="flex-row items-center bg-white dark:bg-neutral-900 p-4 border-b border-neutral-200 dark:border-neutral-800"
      disabled={processing}
    >
      {/* Checkbox */}
      <View
        className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${
          item.selected ? 'bg-blue-500 border-blue-500' : 'border-neutral-400 dark:border-neutral-500'
        }`}
      >
        {item.selected && <Ionicons name="checkmark" size={16} color="white" />}
      </View>

      {/* Student Info */}
      <View className="flex-1">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {item.first_name} {item.last_name}
        </Text>
        <Text className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">{item.matric_number}</Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {item.level}L
        </Text>
      </View>

      {/* Selection indicator */}
      {item.selected && (
        <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
      )}
    </Pressable>
  );

  // Render empty state
  const renderEmpty = (type: 'courses' | 'students') => (
    <View className="flex-1 items-center justify-center p-8">
      <Ionicons
        name={type === 'courses' ? 'book-outline' : 'people-outline'}
        size={64}
        color="#9ca3af"
      />
      <Text className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mt-4">
        {type === 'courses' ? 'No Courses Found' : 'No Students Found'}
      </Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-2">
        {type === 'courses'
          ? 'No active courses in your department'
          : `No students at ${currentLevel}L in your department`}
      </Text>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-neutral-600 dark:text-neutral-400 mt-4">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Tab Bar */}
      <View className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <View className="flex-row">
          <Pressable
            onPress={() => setActiveTab('close')}
            className={`flex-1 py-4 items-center border-b-2 ${
              activeTab === 'close' ? 'border-red-500' : 'border-transparent'
            }`}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="close-circle"
                size={20}
                color={activeTab === 'close' ? '#ef4444' : '#6b7280'}
              />
              <Text
                className={`ml-2 font-semibold ${
                  activeTab === 'close' ? 'text-red-500' : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                Close Semester
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('move')}
            className={`flex-1 py-4 items-center border-b-2 ${
              activeTab === 'move' ? 'border-blue-500' : 'border-transparent'
            }`}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="arrow-up-circle"
                size={20}
                color={activeTab === 'move' ? '#3b82f6' : '#6b7280'}
              />
              <Text
                className={`ml-2 font-semibold ${
                  activeTab === 'move' ? 'text-blue-500' : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                Move Students
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Close Semester Tab */}
      {activeTab === 'close' && (
        <>
          {/* Header */}
          <View className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-4">
            <View className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3">
              <View className="flex-row items-start">
                <Ionicons name="warning" size={20} color="#ef4444" />
                <Text className="text-xs text-neutral-700 dark:text-neutral-300 ml-2 flex-1">
                  Closing courses will mark them as closed, keep attendance data for records, and remove all student enrollments. This action cannot be undone.
                </Text>
              </View>
            </View>

            {/* Selection Actions */}
            {courses.length > 0 && (
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-neutral-600 dark:text-neutral-400">
                  {courses.length} course{courses.length !== 1 ? 's' : ''}
                </Text>
                <View className="flex-row gap-2">
                  <Pressable onPress={selectAllCourses} className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 rounded">
                    <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Select All</Text>
                  </Pressable>
                  <Pressable onPress={deselectAllCourses} className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 rounded">
                    <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Clear</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Course List */}
          <FlatList
            data={courses}
            renderItem={renderCourse}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={() => renderEmpty('courses')}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={courses.length === 0 ? { flex: 1 } : undefined}
          />

          {/* Action Button */}
          {selectedCourses.length > 0 && (
            <View className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 p-4">
              <Pressable
                onPress={handleCloseSemester}
                disabled={processing}
                className={`py-3.5 rounded-lg flex-row items-center justify-center ${
                  processing ? 'bg-gray-400' : 'bg-red-500'
                }`}
              >
                {processing ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-semibold text-base ml-2">
                      Processing...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="close-circle" size={24} color="white" />
                    <Text className="text-white font-semibold text-base ml-2">
                      Close {selectedCourses.length} Course{selectedCourses.length !== 1 ? 's' : ''}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </>
      )}

      {/* Move Students Tab */}
      {activeTab === 'move' && (
        <>
          {/* Header */}
          <View className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-4">
            {/* Level Selectors */}
            <View className="mb-3">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Current Level</Text>
              <View className="flex-row flex-wrap gap-2">
                {ACADEMIC_LEVELS.map((level) => (
                  <Pressable
                    key={level}
                    onPress={() => {
                      setCurrentLevel(level);
                      deselectAllStudents();
                    }}
                    className={`px-4 py-2 rounded-lg ${
                      currentLevel === level ? 'bg-blue-500' : 'bg-neutral-200 dark:bg-neutral-700'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        currentLevel === level ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {level}L
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="mb-3">
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Target Level</Text>
              <View className="flex-row flex-wrap gap-2">
                {ACADEMIC_LEVELS.map((level) => (
                  <Pressable
                    key={level}
                    onPress={() => setTargetLevel(level)}
                    className={`px-4 py-2 rounded-lg ${
                      targetLevel === level ? 'bg-green-500' : 'bg-neutral-200 dark:bg-neutral-700'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        targetLevel === level ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {level}L
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Auto-Enroll Toggle */}
            <Pressable
              onPress={() => setApplyAutoEnroll(!applyAutoEnroll)}
              className="flex-row items-center bg-blue-50 dark:bg-blue-950 rounded-lg p-3 mb-3"
            >
              <View
                className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${
                  applyAutoEnroll ? 'bg-blue-500 border-blue-500' : 'border-neutral-400 dark:border-neutral-500'
                }`}
              >
                {applyAutoEnroll && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Apply auto-enrollment rules
                </Text>
                <Text className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                  Automatically enroll students in courses for the new level
                </Text>
              </View>
            </Pressable>

            {/* Selection Actions */}
            {students.length > 0 && (
              <View className="flex-row items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <Text className="text-sm text-neutral-600 dark:text-neutral-400">
                  {students.length} student{students.length !== 1 ? 's' : ''} at {currentLevel}L
                </Text>
                <View className="flex-row gap-2">
                  <Pressable onPress={selectAllStudents} className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 rounded">
                    <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Select All</Text>
                  </Pressable>
                  <Pressable onPress={deselectAllStudents} className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 rounded">
                    <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Clear</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Student List */}
          <FlatList
            data={students}
            renderItem={renderStudent}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={() => renderEmpty('students')}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={students.length === 0 ? { flex: 1 } : undefined}
          />

          {/* Action Button */}
          {selectedStudents.length > 0 && (
            <View className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 p-4">
              <Pressable
                onPress={handleMoveStudents}
                disabled={processing || currentLevel === targetLevel}
                className={`py-3.5 rounded-lg flex-row items-center justify-center ${
                  processing || currentLevel === targetLevel ? 'bg-gray-400' : 'bg-blue-500'
                }`}
              >
                {processing ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-semibold text-base ml-2">
                      Processing...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="arrow-up-circle" size={24} color="white" />
                    <Text className="text-white font-semibold text-base ml-2">
                      Move {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''} to {targetLevel}L
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}
