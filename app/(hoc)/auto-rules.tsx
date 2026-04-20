import AutoRuleForm, { type AutoRuleFormData } from '@/components/AutoRuleForm';
import {
    createAutoEnrollmentRules,
    deleteAutoEnrollmentRules,
    updateAutoEnrollmentRules,
} from '@/lib/course';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { AutoEnrollmentRule, Course } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    Text,
    View,
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface AutoRuleWithCourse extends AutoEnrollmentRule {
  course: Course;
}

interface GroupedRules {
  department: string;
  level: number;
  rules: AutoRuleWithCourse[];
  courses: Course[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AutoRulesScreen() {
  const user = useAuthStore((state) => state.user);

  // State
  const [rules, setRules] = useState<AutoRuleWithCourse[]>([]);
  const [groupedRules, setGroupedRules] = useState<GroupedRules[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<GroupedRules | null>(null);
  const [departmentCode, setDepartmentCode] = useState('');

  // Fetch department code
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

  // Fetch auto-enrollment rules
  const fetchRules = async () => {
    try {
      if (!user || user.role !== 'hoc' || !departmentCode) {
        return;
      }

      const { data, error } = await supabase
        .from('auto_enrollment_rules')
        .select(`
          *,
          course:courses!auto_enrollment_rules_course_id_fkey (
            id,
            code,
            title,
            level,
            semester,
            academic_year,
            is_closed,
            created_at
          )
        `)
        .eq('department_id', user.department_id)
        .order('level', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rulesWithCourse = (data || []) as AutoRuleWithCourse[];
      setRules(rulesWithCourse);

      // Group rules by department and level
      const grouped = groupRulesByDepartmentAndLevel(rulesWithCourse);
      setGroupedRules(grouped);
    } catch (error) {
      console.error('Error fetching auto-enrollment rules:', error);
      Alert.alert('Error', 'Failed to load auto-enrollment rules. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Group rules by department and level
  const groupRulesByDepartmentAndLevel = (
    rules: AutoRuleWithCourse[]
  ): GroupedRules[] => {
    const groups = new Map<string, GroupedRules>();

    for (const rule of rules) {
      const key = `${departmentCode}-${rule.level}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          department: departmentCode,
          level: rule.level,
          rules: [],
          courses: [],
        });
      }

      const group = groups.get(key)!;
      group.rules.push(rule);
      // Guard: Supabase join can return null if the course is deleted or RLS blocks it
      if (rule.course) {
        group.courses.push(rule.course);
      }
    }

    return Array.from(groups.values()).sort((a, b) => a.level - b.level);
  };

  // Initial load
  useEffect(() => {
    fetchDepartmentCode();
  }, []);

  useEffect(() => {
    if (departmentCode) {
      fetchRules();
    }
  }, [departmentCode]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchRules();
  };

  // Handle create new rule
  const handleCreateRule = () => {
    setEditingRule(null);
    setShowForm(true);
  };

  // Handle edit rule group
  const handleEditRule = (group: GroupedRules) => {
    setEditingRule(group);
    setShowForm(true);
  };

  // Handle delete rule group
  const handleDeleteRule = (group: GroupedRules) => {
    Alert.alert(
      'Delete Auto-Enrollment Rule',
      `Are you sure you want to delete the auto-enrollment rule for ${group.level}L students?\n\nThis will not unenroll students already enrolled through this rule.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteRuleGroup(group),
        },
      ]
    );
  };

  // Delete rule group
  const deleteRuleGroup = async (group: GroupedRules) => {
    try {
      if (!user?.department_id) {
        throw new Error('Department not found');
      }

      const deletedCount = await deleteAutoEnrollmentRules(
        user.department_id,
        group.level
      );

      Alert.alert(
        'Success',
        `Deleted ${deletedCount} auto-enrollment rule${deletedCount !== 1 ? 's' : ''}.\n\nExisting enrollments remain unchanged.`
      );
      fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete auto-enrollment rule';
      Alert.alert('Error', errorMessage);
    }
  };

  // Handle form submission
  const handleFormSubmit = async (formData: AutoRuleFormData) => {
    try {
      if (!user?.department_id) {
        throw new Error('Department not found');
      }

      if (editingRule) {
        // Update existing rule
        await updateAutoEnrollmentRules(
          user.department_id,
          formData.level,
          formData.courseIds
        );
        Alert.alert('Success', 'Auto-enrollment rule updated successfully');
      } else {
        // Create new rule
        const rulesCreated = await createAutoEnrollmentRules(
          user.department_id,
          formData.level,
          formData.courseIds,
          formData.applyRetroactively
        );

        let message = `Created ${rulesCreated} auto-enrollment rule${rulesCreated !== 1 ? 's' : ''}`;
        
        if (formData.applyRetroactively) {
          message += '\n\nExisting students have been enrolled in the selected courses.';
        }

        Alert.alert('Success', message);
      }

      setShowForm(false);
      setEditingRule(null);
      fetchRules();
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save auto-enrollment rule';
      Alert.alert('Error', errorMessage);
      throw error; // Re-throw to keep form in submitting state
    }
  };

  // Render rule group item
  const renderRuleGroup = ({ item }: { item: GroupedRules }) => (
    <View className="bg-white dark:bg-neutral-900 rounded-lg p-4 mb-3 border border-neutral-200 dark:border-neutral-800">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="bg-blue-100 dark:bg-blue-900 rounded-full w-10 h-10 items-center justify-center">
            <Text className="text-blue-600 font-bold text-base">{item.level}L</Text>
          </View>
          <View className="ml-3">
            <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Level {item.level}
            </Text>
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">{item.department}</Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => handleEditRule(item)}
            className="bg-blue-50 dark:bg-blue-950 rounded-lg p-2"
          >
            <Ionicons name="pencil" size={18} color="#3b82f6" />
          </Pressable>
          <Pressable
            onPress={() => handleDeleteRule(item)}
            className="bg-red-50 dark:bg-red-950 rounded-lg p-2"
          >
            <Ionicons name="trash" size={18} color="#ef4444" />
          </Pressable>
        </View>
      </View>

      {/* Courses */}
      <View className="border-t border-neutral-100 dark:border-neutral-800 pt-3">
        <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
          AUTO-ENROLLED COURSES ({item.courses.length})
        </Text>
        {item.courses.filter(Boolean).map((course, index) => (
          <View
            key={course.id}
            className={`py-2 ${index !== item.courses.length - 1 ? 'border-b border-neutral-100 dark:border-neutral-800' : ''}`}
          >
            <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{course.code}</Text>
            <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{course.title}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center p-8">
      <Ionicons name="settings-outline" size={64} color="#9ca3af" />
      <Text className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mt-4">
        No Auto-Enrollment Rules
      </Text>
      <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-2">
        Create rules to automatically enroll students in courses based on their level
      </Text>
      <Pressable
        onPress={handleCreateRule}
        className="bg-blue-500 px-6 py-3 rounded-lg mt-6"
      >
        <Text className="text-white font-semibold">Create First Rule</Text>
      </Pressable>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-neutral-600 dark:text-neutral-400 mt-4">Loading auto-enrollment rules...</Text>
      </View>
    );
  }

  // Show form
  if (showForm) {
    return (
      <AutoRuleForm
        department={departmentCode}
        initialLevel={editingRule?.level}
        initialCourseIds={editingRule?.courses.map((c) => c.id)}
        onSubmit={handleFormSubmit}
        onCancel={() => {
          setShowForm(false);
          setEditingRule(null);
        }}
        isEditing={!!editingRule}
      />
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Auto-Enrollment Rules</Text>
            <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {departmentCode} Department • {groupedRules.length} rule{groupedRules.length !== 1 ? 's' : ''} active
            </Text>
          </View>
          <Pressable
            onPress={handleCreateRule}
            className="bg-blue-500 px-4 py-2.5 rounded-lg flex-row items-center"
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-semibold ml-1">New Rule</Text>
          </Pressable>
        </View>

        {/* Info Banner */}
        <View className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text className="text-xs text-neutral-700 dark:text-neutral-300 ml-2 flex-1">
              Auto-enrollment rules automatically register new students in specified courses
              based on their department and level.
            </Text>
          </View>
        </View>
      </View>

      {/* Rules List */}
      <FlatList
        data={groupedRules}
        renderItem={renderRuleGroup}
        keyExtractor={(item) => `${item.department}-${item.level}`}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={
          groupedRules.length === 0 ? { flex: 1 } : { padding: 16 }
        }
      />
    </View>
  );
}
