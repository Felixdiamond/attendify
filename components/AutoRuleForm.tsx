/**
 * Auto-Enrollment Rule Form Component
 * 
 * Form for creating and editing auto-enrollment rules.
 * Allows HOCs to select department, level, courses, and apply retroactively.
 * 
 * Requirements: 13.1, 13.2, 13.6
 */

import { getCoursesByDepartmentAndLevel } from '@/lib/course';
import type { Course } from '@/types/database.types';
import { ACADEMIC_LEVELS } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Switch,
    Text,
    View,
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface AutoRuleFormProps {
  department: string;
  initialLevel?: number;
  initialCourseIds?: string[];
  onSubmit: (data: AutoRuleFormData) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

export interface AutoRuleFormData {
  department: string;
  level: number;
  courseIds: string[];
  applyRetroactively: boolean;
}

interface CourseWithSelection extends Course {
  selected: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AutoRuleForm({
  department,
  initialLevel,
  initialCourseIds = [],
  onSubmit,
  onCancel,
  isEditing = false,
}: AutoRuleFormProps) {
  // State
  const [selectedLevel, setSelectedLevel] = useState<number>(initialLevel || 100);
  const [courses, setCourses] = useState<CourseWithSelection[]>([]);
  const [applyRetroactively, setApplyRetroactively] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch courses for department
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const coursesData = await getCoursesByDepartmentAndLevel(department);

        // Add selection state
        const coursesWithSelection: CourseWithSelection[] = coursesData.map((course) => ({
          ...course,
          selected: initialCourseIds.includes(course.id),
        }));

        setCourses(coursesWithSelection);
      } catch (error) {
        console.error('Error fetching courses:', error);
        Alert.alert('Error', 'Failed to load courses. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [department]);

  // Toggle course selection
  const toggleCourseSelection = (courseId: string) => {
    setCourses((prev) =>
      prev.map((course) =>
        course.id === courseId ? { ...course, selected: !course.selected } : course
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

  // Get selected courses
  const selectedCourses = courses.filter((c) => c.selected);
  const selectedCourseCount = selectedCourses.length;

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (selectedCourseCount === 0) {
      Alert.alert('No Courses Selected', 'Please select at least one course.');
      return;
    }

    setSubmitting(true);

    try {
      const formData: AutoRuleFormData = {
        department,
        level: selectedLevel,
        courseIds: selectedCourses.map((c) => c.id),
        applyRetroactively,
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
      // Error handling is done in parent component
    } finally {
      setSubmitting(false);
    }
  };

  // Render course item
  const renderCourse = ({ item }: { item: CourseWithSelection }) => (
    <Pressable
      onPress={() => toggleCourseSelection(item.id)}
      className="flex-row items-center bg-white dark:bg-neutral-900 p-4 border-b border-neutral-200 dark:border-neutral-800"
      disabled={submitting}
    >
      {/* Checkbox */}
      <View
        className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${
          item.selected ? 'bg-blue-500 border-blue-500' : 'border-neutral-400 dark:border-neutral-500'
        }`}
      >
        {item.selected && <Ionicons name="checkmark" size={16} color="white" />}
      </View>

      {/* Course Info */}
      <View className="flex-1">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{item.code}</Text>
        <Text className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">{item.title}</Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {item.level}L • {item.semester === 'first' ? 'First' : 'Second'} Semester
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
    <View className="items-center justify-center p-8">
      <Ionicons name="book-outline" size={48} color="#9ca3af" />
      <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-2">
        No courses available in {department}
      </Text>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-neutral-600 dark:text-neutral-400 mt-4">Loading courses...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {isEditing ? 'Edit' : 'Create'} Auto-Enrollment Rule
            </Text>
            <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{department}</Text>
          </View>
          <Pressable onPress={onCancel} disabled={submitting}>
            <Ionicons name="close" size={28} color="#6b7280" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Level Selector */}
        <View className="bg-white dark:bg-neutral-900 p-4 mb-2">
          <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
            Select Level
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {ACADEMIC_LEVELS.map((level) => (
              <Pressable
                key={level}
                onPress={() => setSelectedLevel(level)}
                disabled={submitting}
                className={`px-4 py-2.5 rounded-lg ${
                  selectedLevel === level ? 'bg-blue-500' : 'bg-neutral-200 dark:bg-neutral-700'
                }`}
              >
                <Text
                  className={`text-base font-medium ${
                    selectedLevel === level ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {level}L
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Course Selection */}
        <View className="bg-white dark:bg-neutral-900 mb-2">
          <View className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Select Courses ({selectedCourseCount} selected)
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={selectAllCourses}
                  disabled={submitting}
                  className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 rounded"
                >
                  <Text className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Select All</Text>
                </Pressable>
                <Pressable
                  onPress={deselectAllCourses}
                  disabled={submitting}
                  className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 rounded"
                >
                  <Text className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Clear</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Course List */}
          <View style={{ height: 300 }}>
            {courses.length === 0 ? (
              renderEmpty()
            ) : (
              <ScrollView showsVerticalScrollIndicator>
                {courses.map((course) => (
                  <View key={course.id}>{renderCourse({ item: course })}</View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Apply Retroactively Option */}
        <View className="bg-white dark:bg-neutral-900 p-4 mb-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                Apply Retroactively
              </Text>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                Automatically enroll all existing {selectedLevel}L students in selected courses
              </Text>
            </View>
            <Switch
              value={applyRetroactively}
              onValueChange={setApplyRetroactively}
              disabled={submitting}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={applyRetroactively ? '#3b82f6' : '#f3f4f6'}
            />
          </View>
        </View>

        {/* Info Banner */}
        <View className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mx-4 mb-4">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text className="text-xs text-neutral-700 dark:text-neutral-300 ml-2 flex-1">
              New students registering at {selectedLevel}L in {department} will be
              automatically enrolled in the selected courses.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 p-4">
        <Pressable
          onPress={handleSubmit}
          disabled={submitting || selectedCourseCount === 0}
          className={`py-3.5 rounded-lg items-center mb-2 ${
            submitting || selectedCourseCount === 0 ? 'bg-gray-400' : 'bg-blue-500'
          }`}
        >
          {submitting ? (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="white" />
              <Text className="text-white font-semibold text-base ml-2">
                {isEditing ? 'Updating...' : 'Creating...'}
              </Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-base">
              {isEditing ? 'Update Rule' : 'Create Rule'}
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={onCancel}
          disabled={submitting}
          className="py-3.5 rounded-lg items-center bg-neutral-200 dark:bg-neutral-700"
        >
          <Text className="text-neutral-700 dark:text-neutral-300 font-semibold text-base">Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
