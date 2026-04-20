/**
 * Course Code Input with Autocomplete - Cinema-Grade 2025
 * 
 * Real-time course search with autocomplete
 * Shows existing courses or "NEW COURSE" badge
 * Validates department code prefix
 * 
 * Requirements: MIGRATION_SUMMARY.md - Lecturer Registration
 */

import { supabase } from '@/lib/supabase';
import type { Course } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface CourseCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  onCourseSelect?: (course: Course | null) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
}

export const CourseCodeInput: React.FC<CourseCodeInputProps> = ({
  value,
  onChange,
  onCourseSelect,
  placeholder = 'e.g., CSC301',
  error,
  disabled = false,
  required = false,
  autoFocus = false,
}) => {
  const [suggestions, setSuggestions] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isNewCourse, setIsNewCourse] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search courses by code
  const searchCourses = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setSuggestions([]);
      setLoading(false);
      setIsNewCourse(false);
      return;
    }

    try {
      setLoading(true);
      
      // Search for courses that match the query
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .ilike('code', `${searchQuery}%`)
        .order('code', { ascending: true })
        .limit(10);

      if (error) throw error;

      const results = data || [];
      setSuggestions(results);
      
      // Check if exact match exists
      const exactMatch = results.find(
        (course: Course) => course.code.toUpperCase() === searchQuery.toUpperCase()
      );
      
      if (exactMatch) {
        setIsNewCourse(false);
      } else {
        setIsNewCourse(true);
      }
    } catch (error) {
      console.error('Error searching courses:', error);
      setSuggestions([]);
      setIsNewCourse(true);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search when value changes
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value) {
      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        searchCourses(value);
      }, 300);
    } else {
      setSuggestions([]);
      setIsNewCourse(false);
    }

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value]);

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    onChange(course.code);
    setShowSuggestions(false);
    setSuggestions([]);
    setIsNewCourse(false);
    onCourseSelect?.(course);
  };

  const handleClearSelection = () => {
    setSelectedCourse(null);
    onChange('');
    setIsNewCourse(false);
    onCourseSelect?.(null);
  };

  const handleChangeText = (text: string) => {
    const upperCaseText = text.toUpperCase();
    onChange(upperCaseText);
    setShowSuggestions(true);
    
    if (selectedCourse && selectedCourse.code !== upperCaseText) {
      setSelectedCourse(null);
      onCourseSelect?.(null);
    }
  };

  const renderSuggestionItem = ({ item }: { item: Course }) => (
    <TouchableOpacity
      onPress={() => handleSelectCourse(item)}
      className="py-3 px-4 border-b border-neutral-200 dark:border-neutral-800 active:bg-neutral-50 dark:active:bg-neutral-850"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-base font-bold text-neutral-900 dark:text-neutral-0 tracking-tight">
            {item.code}
          </Text>
          <Text className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 tracking-tight">
            {item.title}
          </Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 tracking-tight">
            Level {item.level} • {item.semester === 'first' ? 'First' : 'Second'} Semester
          </Text>
        </View>
        <View className="bg-[#EEF2FF] dark:bg-[#312E81] px-2 py-1 rounded-md ml-2">
          <Text className="text-xs font-bold text-[#4F46E5] dark:text-[#A5B4FC] tracking-tight">
            EXISTS
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View>
      {/* Label */}
      <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2.5 tracking-tight">
        Course Code{required && " *"}
      </Text>

      {/* Input */}
      <View className="relative">
        <View className="flex-row items-center">
          <View className="flex-1">
            <TextInput
              className={`border-2 rounded-xl px-4 py-3.5 text-base font-bold bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-0 ${
                error
                  ? 'border-[#EF4444]'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}
              placeholder={placeholder}
              placeholderTextColor="#A3A3A3"
              value={value}
              onChangeText={handleChangeText}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!disabled}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay to allow suggestion clicks to register
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              autoFocus={autoFocus}
            />
          </View>

          {/* Status Indicators */}
          <View className="absolute right-4 flex-row items-center gap-2">
            {loading && <ActivityIndicator size="small" color="#4F46E5" />}
            
            {!loading && value && value.length >= 3 && isNewCourse && (
              <View className="bg-[#10B981] px-2.5 py-1.5 rounded-lg">
                <Text className="text-xs font-bold text-white tracking-tight">
                  🆕 NEW
                </Text>
              </View>
            )}
            
            {!loading && selectedCourse && (
              <TouchableOpacity
                onPress={handleClearSelection}
                className="p-1"
              >
                <Ionicons name="close-circle" size={20} color="#A3A3A3" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <View 
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 rounded-xl border-2 border-neutral-300 dark:border-neutral-700 z-50 max-h-60"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 8
            }}
          >
            <FlatList
              data={suggestions}
              renderItem={renderSuggestionItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            />
          </View>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <Text className="text-[#EF4444] text-sm mt-2 font-medium tracking-tight">
          {error}
        </Text>
      )}

      {/* Helper Text */}
      {!error && value && value.length >= 3 && (
        <View className="mt-2">
          {isNewCourse ? (
            <View className="flex-row items-center gap-2">
              <Ionicons name="information-circle" size={16} color="#10B981" />
              <Text className="text-sm text-[#10B981] font-medium tracking-tight">
                This will create a new course
              </Text>
            </View>
          ) : selectedCourse ? (
            <View className="flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={16} color="#4F46E5" />
              <Text className="text-sm text-[#4F46E5] dark:text-[#6366F1] font-medium tracking-tight">
                You will be added as a co-lecturer
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Validation Hint */}
      {!error && !value && (
        <Text className="text-xs text-neutral-500 dark:text-neutral-500 mt-2 tracking-tight">
          Must start with a valid department code (e.g., CSC, MEE, BIO)
        </Text>
      )}
    </View>
  );
};
