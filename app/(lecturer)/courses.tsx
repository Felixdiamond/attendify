/**
 * Lecturer Courses Screen - ENHANCED 2025
 * 
 * Complete overhaul following MIGRATION_SUMMARY.md
 * - Add new courses with CourseCodeInput
 * - Show co-lecturers (max 3)
 * - Display "Created by" info
 * - Cinema-grade UI design
 */

import { CourseCodeInput } from '@/components/ui';
import { addLecturerToCourse, createCourse, getCourseEnrollmentCount, getDepartmentFromCourseCode } from '@/lib/course';
import { supabase } from '@/lib/supabase';
import type { Course, User } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CourseWithInfo extends Course {
  enrolled_count?: number;
  co_lecturers?: User[];
  created_by_name?: string;
  department?: string; // Department code derived from course code prefix
}

export default function CoursesScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseWithInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { bottom, top: topInset } = useSafeAreaInsets();
  
  // Add Course Modal state
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDepartment, setNewCourseDepartment] = useState('');
  const [newCourseLevel, setNewCourseLevel] = useState('100');
  const [newCourseSemester, setNewCourseSemester] = useState<'first' | 'second'>('first');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Use RPC function to avoid RLS recursion
      const { data: coursesData, error } = await supabase.rpc('get_my_courses_lecturer');

      if (error) {
        console.error('Error fetching courses:', error);
        Alert.alert('Error', 'Failed to load courses');
        return;
      }

      // Fetch additional info for each course
      const coursesWithInfo = await Promise.all(
        (coursesData || []).map(async (course: Course) => {
          // Get enrollment count (use RPC helper to avoid RLS issues)
          const count = await getCourseEnrollmentCount(course.id);

          // Get co-lecturers
          const { data: coLecturersData } = await supabase
            .from('course_lecturers')
            .select('lecturer:users!course_lecturers_lecturer_id_fkey(id, first_name, last_name, email)')
            .eq('course_id', course.id);

          const coLecturers = coLecturersData?.map((item: any) => item.lecturer).filter(Boolean) || [];

          // Get creator info
          let createdByName = 'Unknown';
          if (course.created_by) {
            const { data: creatorData } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('id', course.created_by)
              .single();
            
            if (creatorData) {
              createdByName = `${creatorData.first_name} ${creatorData.last_name}`;
            }
          }

          // Extract department from course code (e.g., CSC301 -> CSC)
          const department = getDepartmentFromCourseCode(course.code);

          return {
            ...course,
            enrolled_count: count || 0,
            co_lecturers: coLecturers,
            created_by_name: createdByName,
            department,
          };
        })
      );

      setCourses(coursesWithInfo);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to load courses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle add new course
  const handleAddCourse = async () => {
    if (!newCourseCode.trim() || !newCourseTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter course code and title');
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get current academic year (simplified)
      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}/${currentYear + 1}`;

      // Create course
      const courseData = await createCourse({
        code: newCourseCode.toUpperCase(),
        title: newCourseTitle,
        level: parseInt(newCourseLevel),
        semester: newCourseSemester,
        academic_year: academicYear,
        created_by: user.id,
      });

      // Add current lecturer to the course
      await addLecturerToCourse(courseData.id, user.id);

      Alert.alert('Success', 'Course created successfully!');
      
      // Reset form and close modal
      setNewCourseCode('');
      setNewCourseTitle('');
      setNewCourseDepartment('');
      setNewCourseLevel('100');
      setNewCourseSemester('first');
      setShowAddCourseModal(false);

      // Refresh courses list
      fetchCourses(true);
    } catch (error) {
      console.error('Error creating course:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create course');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRefresh = () => {
    fetchCourses(true);
  };

  const handleStartSession = (courseId: string, isClosed: boolean) => {
    if (isClosed) {
      Alert.alert(
        'Course Closed',
        'This course has been closed for the semester. You cannot start new attendance sessions.'
      );
      return;
    }

    router.push({
      pathname: '/(lecturer)/start-session',
      params: { courseId },
    });
  };

  const getSemesterLabel = (semester: string) => {
    return semester === 'first' ? 'First Semester' : 'Second Semester';
  };

  if (loading) {
    return (
      <View style={{ flex: 1, paddingBottom: bottom + 16 }} className="items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-6">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="text-neutral-600 dark:text-neutral-400 mt-6 text-base tracking-tight">Loading courses...</Text>
      </View>
    );
  }

  if (courses.length === 0) {
    return (
      <View style={{ flex: 1, paddingBottom: bottom + 16 }} className="items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-6">
        <View className="bg-neutral-100 dark:bg-neutral-800 p-8 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 mb-6">
          <Ionicons name="book-outline" size={72} color="#A3A3A3" />
        </View>
        <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-0 mt-4 mb-3 tracking-tight">
          No Courses Assigned
        </Text>
        <Text className="text-neutral-600 dark:text-neutral-400 text-center mb-8 text-base tracking-tight">
          You don&apos;t have any courses assigned yet. Please contact your Head of Course (HOC) to get assigned to courses.
        </Text>
        <TouchableOpacity
          className="bg-[#4F46E5] px-8 py-4 rounded-xl border-2 border-[#4338CA] active:scale-95"
          onPress={handleRefresh}
        >
          <Text className="text-white font-bold tracking-tight text-base">Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
      contentContainerStyle={{ paddingBottom: bottom + 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4F46E5" />
      }
    >
      <View className="p-6">
        {/* Header with Add Button */}
        <View className="mb-6 flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-4xl font-bold text-neutral-900 dark:text-neutral-0 tracking-tighter">My Courses</Text>
            <Text className="text-neutral-600 dark:text-neutral-400 mt-2 text-base tracking-tight">
              {courses.length} {courses.length === 1 ? 'course' : 'courses'} assigned
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddCourseModal(true)}
            className="bg-[#4F46E5] px-4 py-3 rounded-xl border-2 border-[#4338CA] flex-row items-center active:scale-95"
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text className="text-white font-bold ml-2 tracking-tight">Add Course</Text>
          </TouchableOpacity>
        </View>

        {/* Courses List */}
        <View className="gap-5">
          {courses.map((course) => (
            <View
              key={course.id}
              className={`bg-white dark:bg-neutral-900 rounded-2xl border-2 ${
                course.is_closed ? 'border-neutral-300 dark:border-neutral-700' : 'border-neutral-200 dark:border-neutral-800'
              }`}
            >
              {/* Course Header */}
              <View className="p-5 border-b-2 border-neutral-100 dark:border-neutral-800">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-3">
                      <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-0 tracking-tight">
                        {course.code}
                      </Text>
                      {course.is_closed && (
                        <View className="bg-neutral-200 dark:bg-neutral-800 px-3 py-1.5 rounded-lg border-2 border-neutral-300 dark:border-neutral-700">
                          <Text className="text-xs font-bold text-neutral-700 dark:text-neutral-300 tracking-tight">
                            CLOSED
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-base text-neutral-700 dark:text-neutral-300 mt-2 tracking-tight">
                      {course.title}
                    </Text>
                  </View>
                </View>

                {/* Course Details */}
                <View className="flex-row flex-wrap gap-4 mt-4">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="business-outline" size={16} color="#A3A3A3" />
                    <Text className="text-sm text-neutral-600 dark:text-neutral-400 tracking-tight">
                      {course.department}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="school-outline" size={16} color="#A3A3A3" />
                    <Text className="text-sm text-neutral-600 dark:text-neutral-400 tracking-tight">
                      Level {course.level}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="calendar-outline" size={16} color="#A3A3A3" />
                    <Text className="text-sm text-neutral-600 dark:text-neutral-400 tracking-tight">
                      {getSemesterLabel(course.semester)}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="people-outline" size={16} color="#A3A3A3" />
                    <Text className="text-sm text-neutral-600 dark:text-neutral-400 tracking-tight">
                      {course.enrolled_count} students
                    </Text>
                  </View>
                </View>

                {/* Academic Year */}
                <Text className="text-sm text-neutral-500 dark:text-neutral-500 mt-3 tracking-tight">
                  {course.academic_year}
                </Text>

                {/* Co-Lecturers */}
                {course.co_lecturers && course.co_lecturers.length > 1 && (
                  <View className="mt-4 pt-4 border-t-2 border-neutral-100 dark:border-neutral-800">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="people" size={16} color="#4F46E5" />
                      <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 ml-2 tracking-tight">
                        Co-Lecturers ({course.co_lecturers.length - 1})
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      {course.co_lecturers.slice(0, 3).map((lecturer) => (
                        <View key={lecturer.id} className="bg-neutral-100 dark:bg-neutral-850 px-3 py-1.5 rounded-lg border-2 border-neutral-200 dark:border-neutral-800">
                          <Text className="text-xs font-medium text-neutral-700 dark:text-neutral-300 tracking-tight">
                            {lecturer.first_name} {lecturer.last_name}
                          </Text>
                        </View>
                      ))}
                      {course.co_lecturers.length > 3 && (
                        <View className="bg-[#EEF2FF] dark:bg-neutral-850 px-3 py-1.5 rounded-lg border-2 border-[#C7D2FE] dark:border-neutral-700">
                          <Text className="text-xs font-bold text-[#4F46E5] tracking-tight">
                            +{course.co_lecturers.length - 3} more
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Created By */}
                {course.created_by_name && (
                  <View className="mt-3 flex-row items-center">
                    <Ionicons name="person-circle-outline" size={14} color="#A3A3A3" />
                    <Text className="text-xs text-neutral-500 dark:text-neutral-500 ml-1.5 tracking-tight">
                      Created by {course.created_by_name}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View className="p-5 gap-3">
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className={`flex-1 py-4 rounded-xl border-2 active:scale-95 ${
                      course.is_closed 
                        ? 'bg-neutral-300 dark:bg-neutral-800 border-neutral-400 dark:border-neutral-700' 
                        : 'bg-[#4F46E5] border-[#4338CA]'
                    }`}
                    onPress={() => handleStartSession(course.id, course.is_closed)}
                    disabled={course.is_closed}
                  >
                    <View className="flex-row items-center justify-center gap-2">
                      <Ionicons
                        name="play-circle-outline"
                        size={20}
                        color="white"
                      />
                      <Text className="text-white font-bold tracking-tight">
                        Start Session
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 py-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 active:scale-95"
                    onPress={() => router.push({
                      pathname: '/(lecturer)/spreadsheet',
                      params: { courseId: course.id },
                    })}
                  >
                    <View className="flex-row items-center justify-center gap-2">
                      <Ionicons
                        name="grid-outline"
                        size={20}
                        color="#525252"
                      />
                      <Text className="text-neutral-700 dark:text-neutral-200 font-bold tracking-tight">
                        Spreadsheet
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  className="py-4 rounded-xl bg-[#7C3AED] border-2 border-[#6D28D9] active:scale-95"
                  onPress={() => router.push({
                    pathname: '/(lecturer)/insights',
                    params: { courseId: course.id },
                  })}
                >
                  <View className="flex-row items-center justify-center gap-2">
                    <Ionicons
                      name="analytics-outline"
                      size={20}
                      color="white"
                    />
                    <Text className="text-white font-bold tracking-tight">
                      View Insights
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Info Box */}
        <View className="bg-[#EEF2FF] dark:bg-[#312E81] p-6 rounded-2xl mt-6 mb-4 border-2 border-[#C7D2FE] dark:border-[#4F46E5]">
          <View className="flex-row items-start gap-4">
            <View className="bg-[#4F46E5] p-2 rounded-xl">
              <Ionicons name="information-circle" size={24} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-[#312E81] dark:text-[#C7D2FE] mb-2 tracking-tight">
                Quick Tip
              </Text>
              <Text className="text-sm text-[#4F46E5] dark:text-[#A5B4FC] tracking-tight">
                Tap &quot;Start Session&quot; to begin taking attendance for a course. Students will be able to mark their attendance via Bluetooth proximity.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Add Course Modal */}
      <Modal
        visible={showAddCourseModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddCourseModal(false)}
      >
        <View style={{ flex: 1, paddingTop: topInset }} className="bg-neutral-50 dark:bg-neutral-950">
          {/* Modal Header */}
          <View className="bg-white dark:bg-neutral-900 border-b-2 border-neutral-200 dark:border-neutral-800 px-6 py-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-0 tracking-tight">
                Add New Course
              </Text>
              <Pressable
                onPress={() => setShowAddCourseModal(false)}
                className="bg-neutral-200 dark:bg-neutral-800 rounded-full p-2"
              >
                <Ionicons name="close" size={24} color="#737373" />
              </Pressable>
            </View>
          </View>

          <ScrollView className="flex-1 p-6">
            {/* Course Code Input with Autocomplete */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 tracking-tight">
                Course Code
              </Text>
              <CourseCodeInput
                value={newCourseCode}
                onChange={(code: string, title?: string) => {
                  setNewCourseCode(code);
                  if (title) {
                    setNewCourseTitle(title);
                  }
                }}
              />
              <Text className="text-xs text-neutral-500 dark:text-neutral-500 mt-1.5 tracking-tight">
                e.g., CSC301 (department code + course number)
              </Text>
            </View>

            {/* Course Title */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 tracking-tight">
                Course Title
              </Text>
              <TextInput
                className="bg-white dark:bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3.5 text-base text-neutral-900 dark:text-neutral-0 font-medium tracking-tight"
                placeholder="Enter course title"
                placeholderTextColor="#A3A3A3"
                value={newCourseTitle}
                onChangeText={setNewCourseTitle}
                autoCapitalize="words"
              />
            </View>

            {/* Level Selector */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 tracking-tight">
                Level
              </Text>
              <View className="flex-row gap-3">
                {['100', '200', '300', '400'].map((level) => (
                  <Pressable
                    key={level}
                    onPress={() => setNewCourseLevel(level)}
                    className={`flex-1 py-3 rounded-xl border-2 ${
                      newCourseLevel === level
                        ? 'bg-[#4F46E5] border-[#4F46E5]'
                        : 'bg-neutral-100 dark:bg-neutral-850 border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    <Text
                      className={`text-center font-bold tracking-tight ${
                        newCourseLevel === level ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {level}L
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Semester Selector */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 tracking-tight">
                Semester
              </Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setNewCourseSemester('first')}
                  className={`flex-1 py-3 rounded-xl border-2 ${
                    newCourseSemester === 'first'
                      ? 'bg-[#4F46E5] border-[#4F46E5]'
                      : 'bg-neutral-100 dark:bg-neutral-850 border-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  <Text
                    className={`text-center font-bold tracking-tight ${
                      newCourseSemester === 'first' ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    First Semester
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setNewCourseSemester('second')}
                  className={`flex-1 py-3 rounded-xl border-2 ${
                    newCourseSemester === 'second'
                      ? 'bg-[#4F46E5] border-[#4F46E5]'
                      : 'bg-neutral-100 dark:bg-neutral-850 border-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  <Text
                    className={`text-center font-bold tracking-tight ${
                      newCourseSemester === 'second' ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    Second Semester
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Info Banner */}
            <View className="bg-[#EEF2FF] dark:bg-neutral-900 border-2 border-[#C7D2FE] dark:border-neutral-800 rounded-xl p-4">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#4F46E5" />
                <Text className="text-xs text-neutral-700 dark:text-neutral-400 ml-3 flex-1 tracking-tight">
                  The course will be created and you will be automatically added as a lecturer. 
                  You can add co-lecturers (max 3 total) later from the course settings.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View className="bg-white dark:bg-neutral-900 border-t-2 border-neutral-200 dark:border-neutral-800 p-4">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowAddCourseModal(false)}
                className="flex-1 py-4 rounded-xl bg-neutral-200 dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 active:scale-95"
                disabled={isCreating}
              >
                <Text className="text-neutral-700 dark:text-neutral-300 font-bold text-center tracking-tight">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddCourse}
                disabled={isCreating || !newCourseCode.trim() || !newCourseTitle.trim()}
                className={`flex-1 py-4 rounded-xl border-2 flex-row items-center justify-center ${
                  isCreating || !newCourseCode.trim() || !newCourseTitle.trim()
                    ? 'bg-neutral-300 dark:bg-neutral-800 border-neutral-400 dark:border-neutral-700'
                    : 'bg-[#4F46E5] border-[#4338CA] active:scale-95'
                }`}
                style={isCreating || !newCourseCode.trim() || !newCourseTitle.trim() ? { opacity: 0.5 } : undefined}
              >
                {isCreating ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-bold ml-2 tracking-tight">Creating...</Text>
                  </>
                ) : (
                  <Text className="text-white font-bold tracking-tight">Create Course</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
