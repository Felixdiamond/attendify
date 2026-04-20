/**
 * Department Autocomplete Component - Cinema-Grade 2025
 * 
 * Reusable autocomplete component for department selection
 * Fetches departments from database and displays code + name
 * Stores department_id (UUID) in state
 * 
 * Requirements: MIGRATION_SUMMARY.md - Department Selection
 */

import { supabase } from '@/lib/supabase';
import type { Department } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface DepartmentAutocompleteProps {
  value: string | null; // department_id (UUID)
  onChange: (departmentId: string, departmentCode: string, departmentName: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export const DepartmentAutocomplete: React.FC<DepartmentAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Select department',
  error,
  disabled = false,
  required = false,
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  // Fetch departments on mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Update selected department when value changes
  useEffect(() => {
    if (value && departments.length > 0) {
      const dept = departments.find((d) => d.id === value);
      setSelectedDepartment(dept || null);
    } else {
      setSelectedDepartment(null);
    }
  }, [value, departments]);

  // Filter departments based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDepartments(departments);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = departments.filter(
        (dept) =>
          dept.code.toLowerCase().includes(query) ||
          dept.name.toLowerCase().includes(query)
      );
      setFilteredDepartments(filtered);
    }
  }, [searchQuery, departments]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;

      setDepartments(data || []);
      setFilteredDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDepartment = (dept: Department) => {
    setSelectedDepartment(dept);
    onChange(dept.id, dept.code, dept.name);
    setModalVisible(false);
    setSearchQuery('');
  };

  const handleClearSelection = () => {
    setSelectedDepartment(null);
    onChange('', '', '');
  };

  const renderDepartmentItem = ({ item }: { item: Department }) => (
    <TouchableOpacity
      onPress={() => handleSelectDepartment(item)}
      className="py-4 px-5 border-b-2 border-neutral-200 dark:border-neutral-800 active:bg-neutral-50 dark:active:bg-neutral-850"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-0 tracking-tight">
            {item.code}
          </Text>
          <Text className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 tracking-tight">
            {item.name}
          </Text>
        </View>
        {selectedDepartment?.id === item.id && (
          <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View>
      {/* Label */}
      <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2.5 tracking-tight">
        Department{required && ' *'}
      </Text>

      {/* Input Trigger */}
      <Pressable
        onPress={() => !disabled && setModalVisible(true)}
        className={`border-2 rounded-xl px-4 py-3.5 bg-white dark:bg-neutral-900 ${
          error
            ? 'border-[#EF4444]'
            : 'border-neutral-300 dark:border-neutral-700'
        }`}
        style={disabled ? { opacity: 0.5 } : undefined}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            {selectedDepartment ? (
              <>
                <Text className="text-base font-bold text-neutral-900 dark:text-neutral-0 tracking-tight">
                  {selectedDepartment.code}
                </Text>
                <Text className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 tracking-tight">
                  {selectedDepartment.name}
                </Text>
              </>
            ) : (
              <Text className="text-base text-neutral-400 font-medium">
                {placeholder}
              </Text>
            )}
          </View>

          <View className="flex-row items-center gap-2">
            {selectedDepartment && !disabled && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleClearSelection();
                }}
                className="p-1"
              >
                <Ionicons name="close-circle" size={20} color="#A3A3A3" />
              </TouchableOpacity>
            )}
            <Ionicons
              name={modalVisible ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#A3A3A3"
            />
          </View>
        </View>
      </Pressable>

      {/* Error Message */}
      {error && (
        <Text className="text-[#EF4444] text-sm mt-2 font-medium tracking-tight">
          {error}
        </Text>
      )}

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <Pressable
            className="flex-1"
            onPress={() => setModalVisible(false)}
          />
          <View className="bg-white dark:bg-neutral-950 rounded-t-3xl max-h-[80%]">
            {/* Header */}
            <View className="px-6 py-5 border-b-2 border-neutral-200 dark:border-neutral-800">
              <View className="flex-row items-center justify-between">
                <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-0 tracking-tight">
                  Select Department
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={28} color="#A3A3A3" />
                </TouchableOpacity>
              </View>

              {/* Search Input */}
              <View className="mt-4 flex-row items-center bg-neutral-100 dark:bg-neutral-900 rounded-xl px-4 py-3 border-2 border-neutral-200 dark:border-neutral-800">
                <Ionicons name="search" size={20} color="#A3A3A3" />
                <TextInput
                  className="flex-1 ml-3 text-base text-neutral-900 dark:text-neutral-0 font-medium"
                  placeholder="Search departments..."
                  placeholderTextColor="#A3A3A3"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#A3A3A3" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Department List */}
            {loading ? (
              <View className="py-12 items-center">
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text className="text-neutral-600 dark:text-neutral-400 mt-4 tracking-tight">
                  Loading departments...
                </Text>
              </View>
            ) : filteredDepartments.length === 0 ? (
              <View className="py-12 items-center px-6">
                <Ionicons name="search-outline" size={64} color="#A3A3A3" />
                <Text className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mt-4 tracking-tight">
                  No Departments Found
                </Text>
                <Text className="text-sm text-neutral-500 dark:text-neutral-500 text-center mt-2 tracking-tight">
                  Try adjusting your search query
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredDepartments}
                renderItem={renderDepartmentItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};
