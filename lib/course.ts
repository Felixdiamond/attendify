/**
 * Course Service
 * 
 * Handles course-related operations including enrollment management,
 * course queries, and bulk operations for HOCs.
 */

import type {
    Course,
    CourseEnrollment,
    EnrollmentWithCourse,
    User,
} from '@/types/database.types';
import { supabase } from './supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface EnrollmentResult {
  success: number;
  failed: number;
  errors: Array<{
    studentId: string;
    courseId: string;
    error: string;
  }>;
  details: {
    totalAttempts: number;
    skippedDuplicates: number;
    newEnrollments: number;
  };
}

// ============================================================================
// COURSE QUERIES
// ============================================================================

/**
 * Get all departments
 */
export const getDepartments = async (): Promise<Array<{ id: string; code: string; name: string }>> => {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('id, code, name')
      .order('code', { ascending: true });

    if (error) {
      console.error('Error fetching departments:', error);
      throw new Error('Failed to fetch departments');
    }

    return data || [];
  } catch (error) {
    console.error('Error getting departments:', error);
    throw error;
  }
};

/**
 * Search courses by code prefix
 * This function is role-aware and will call the appropriate RPC
 */
export const searchCoursesByCode = async (codePrefix: string): Promise<Course[]> => {
  try {
    // Get current user to determine role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get user profile for role
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Could not fetch user profile');
    }

    let data: Course[] = [];
    let error = null;

    // Call appropriate RPC based on role
    if (profile.role === 'student') {
      ({ data, error } = await supabase.rpc('get_my_courses_student'));
    } else if (profile.role === 'lecturer') {
      ({ data, error } = await supabase.rpc('get_my_courses_lecturer'));
    } else if (profile.role === 'hoc') {
      ({ data, error } = await supabase.rpc('get_my_department_courses'));
    }

    if (error) {
      console.error('Error searching courses:', error);
      throw new Error('Failed to search courses');
    }

    // Filter by code prefix, sort, and limit
    return (data || [])
      .filter((course: Course) => 
        course.code.toUpperCase().startsWith(codePrefix.toUpperCase())
      )
      .sort((a: Course, b: Course) => a.code.localeCompare(b.code))
      .slice(0, 10);
  } catch (error) {
    console.error('Error searching courses:', error);
    throw error;
  }
};

/**
 * Derive department code from a course code string
 */
export const getDepartmentFromCourseCode = (courseCode: string): string => {
  return courseCode.replace(/\d+$/, '');
};

/**
 * Create a new course
 */
export const createCourse = async (courseData: {
  code: string;
  title: string;
  level: number;
  semester: 'first' | 'second';
  academic_year: string;
  created_by: string;
}): Promise<Course> => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .insert(courseData)
      .select()
      .single();

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        throw new Error(`Course ${courseData.code} already exists`);
      }
      throw new Error('Failed to create course');
    }

    return data;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

/**
 * Add lecturer to an existing course
 */
export const addLecturerToCourse = async (
  courseId: string,
  lecturerId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('course_lecturers')
      .insert({
        course_id: courseId,
        lecturer_id: lecturerId,
      });

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        throw new Error('Lecturer is already assigned to this course');
      }
      if (error.message.includes('Maximum 3 lecturers')) {
        throw new Error('Course already has maximum 3 lecturers');
      }
      throw new Error('Failed to add lecturer to course');
    }
  } catch (error) {
    console.error('Error adding lecturer to course:', error);
    throw error;
  }
};

/**
 * Get courses for a lecturer
 */
export const getLecturerCourses = async (lecturerId: string): Promise<Course[]> => {
  try {
    // Use RPC function to avoid RLS recursion
    const { data, error } = await supabase.rpc('get_my_courses_lecturer');

    if (error) {
      console.error('Error fetching lecturer courses:', error);
      throw new Error('Failed to fetch courses');
    }

    return data || [];
  } catch (error) {
    console.error('Error getting lecturer courses:', error);
    throw error;
  }
};

/**
 * Get courses by department and level
 */
export const getCoursesByDepartmentAndLevel = async (
  department: string,
  level?: number
): Promise<Course[]> => {
  try {
    // Use RPC function to avoid RLS recursion
    const { data, error } = await supabase.rpc('get_my_department_courses');

    if (error) {
      console.error('Error fetching courses:', error);
      throw new Error('Failed to fetch courses');
    }

    // Filter by department prefix, is_closed status, and optionally level
    let filteredData = (data || [])
      .filter((course: Course) => 
        course.code.toUpperCase().startsWith(department.toUpperCase()) && 
        !course.is_closed
      );

    if (level) {
      filteredData = filteredData.filter((course: Course) => course.level === level);
    }

    // Sort by course code
    return filteredData.sort((a: Course, b: Course) => a.code.localeCompare(b.code));
  } catch (error) {
    console.error('Error getting courses:', error);
    throw error;
  }
};

/**
 * Get all courses for a department (by department code prefix)
 * Used by HOCs to view department courses
 */
export const getCoursesForDepartment = async (deptCode: string): Promise<Course[]> => {
  try {
    // Use RPC function to avoid RLS recursion
    const { data, error } = await supabase.rpc('get_my_department_courses');

    if (error) {
      console.error('Error fetching department courses:', error);
      throw new Error('Failed to fetch department courses');
    }

    // Filter by department code prefix and sort
    const filteredData = (data || [])
      .filter((course: Course) => course.code.toUpperCase().startsWith(deptCode.toUpperCase()))
      .sort((a: Course, b: Course) => a.code.localeCompare(b.code));

    return filteredData;
  } catch (error) {
    console.error('Error getting department courses:', error);
    throw error;
  }
};

/**
 * Get all courses at a given level across all departments
 * Used by HOCs to browse and enroll students in cross-department courses
 */
export const getAllCoursesByLevel = async (level: number): Promise<Course[]> => {
  try {
    const { data, error } = await supabase.rpc('get_all_courses_by_level', {
      p_level: level,
    });

    if (error) {
      console.error('Error fetching courses by level:', error);
      throw new Error('Failed to fetch courses by level');
    }

    return (data || []).sort((a: Course, b: Course) => a.code.localeCompare(b.code));
  } catch (error) {
    console.error('Error getting courses by level:', error);
    throw error;
  }
};

/**
 * Get enrolled students for a course
 */
export const getEnrolledStudents = async (courseId: string): Promise<User[]> => {
  try {
    // Use RPC function to avoid RLS recursion
    const { data, error } = await supabase.rpc('get_students_for_course', {
      p_course_id: courseId,
    });

    if (error) {
      console.error('Error fetching enrolled students:', error);
      throw new Error('Failed to fetch enrolled students');
    }

    return data || [];
  } catch (error) {
    console.error('Error getting enrolled students:', error);
    throw error;
  }
};

/**
 * Get enrollment records for a specific course using RPC
 */
export const getEnrollmentsForCourse = async (courseId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase.rpc('get_enrollments_for_course', { p_course_id: courseId });

    if (error) {
      console.error('Error fetching enrollments for course:', error);
      throw new Error('Failed to fetch enrollments for course');
    }

    return data || [];
  } catch (error) {
    console.error('Error getting enrollments for course:', error);
    throw error;
  }
};

/**
 * Get department enrollments for the current HOC using RPC
 */
export const getDepartmentEnrollments = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase.rpc('get_department_enrollments');

    if (error) {
      console.error('Error fetching department enrollments:', error);
      throw new Error('Failed to fetch department enrollments');
    }

    return data || [];
  } catch (error) {
    console.error('Error getting department enrollments:', error);
    throw error;
  }
};

/**
 * Get student's enrolled courses
 */
export const getStudentCourses = async (studentId: string): Promise<EnrollmentWithCourse[]> => {
  try {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        course:courses!course_enrollments_course_id_fkey (
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
      .eq('student_id', studentId);

    if (error) {
      console.error('Error fetching student courses:', error);
      throw new Error('Failed to fetch enrolled courses');
    }

    return data as EnrollmentWithCourse[];
  } catch (error) {
    console.error('Error getting student courses:', error);
    throw error;
  }
};

// ============================================================================
// ENROLLMENT OPERATIONS
// ============================================================================

/**
 * Enroll multiple students in multiple courses (bulk enrollment)
 * 
 * Requirements: 12.2, 12.3, 12.4, 12.5
 * 
 * @param studentIds - Array of student UUIDs
 * @param courseIds - Array of course UUIDs
 * @returns EnrollmentResult with success/failure counts and details
 */
export const enrollStudents = async (
  studentIds: string[],
  courseIds: string[]
): Promise<EnrollmentResult> => {
  const result: EnrollmentResult = {
    success: 0,
    failed: 0,
    errors: [],
    details: {
      totalAttempts: studentIds.length * courseIds.length,
      skippedDuplicates: 0,
      newEnrollments: 0,
    },
  };

  try {
    // Get current user (HOC)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Validate that all courses exist and are not closed using RPC to avoid RLS recursion
    const { data: courses, error: coursesError } = await supabase
      .rpc('get_courses_by_ids', { p_course_ids: courseIds });

    if (coursesError) {
      throw new Error('Failed to validate courses');
    }

    // Check for closed courses
    const closedCourses = (courses || []).filter((c: Course) => c.is_closed);
    if (closedCourses.length > 0) {
      const closedCodes = closedCourses.map((c: Course) => c.code).join(', ');
      throw new Error(`Cannot enroll in closed courses: ${closedCodes}`);
    }

    // Check if all requested courses were found
    if (!courses || courses.length !== courseIds.length) {
      throw new Error('One or more courses not found or you do not have access');
    }

    // Call bulk enrollment RPC
    const { data: enrollCount, error: enrollError } = await supabase.rpc('bulk_enroll_students', {
      p_student_ids: studentIds,
      p_course_ids: courseIds,
    });

    if (enrollError) {
      throw new Error('Bulk enrollment failed: ' + enrollError.message);
    }

    result.details.newEnrollments = enrollCount || 0;
    result.success = enrollCount || 0;
    result.failed = result.details.totalAttempts - result.success;
    // Skipped duplicates are not tracked, but can be inferred
    result.details.skippedDuplicates = result.failed;

    return result;
  } catch (error) {
    console.error('Error enrolling students:', error);
    throw error;
  }
};

/**
 * Enroll a single student in a single course
 */
export const enrollStudent = async (
  studentId: string,
  courseId: string
): Promise<CourseEnrollment> => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Validate course exists and is not closed using RPC to avoid RLS recursion
    const { data: courseData, error: courseError } = await supabase
      .rpc('get_course_by_id', { p_course_id: courseId });

    if (courseError) {
      throw new Error('Failed to validate course');
    }

    const course = courseData?.[0];
    if (!course) {
      throw new Error('Course not found or you do not have access');
    }

    if (course.is_closed) {
      throw new Error(`Cannot enroll in closed course: ${course.code}`);
    }

    // Use bulk enroll helper RPC for insert (respects RLS through RPC)
    const result = await enrollStudents([studentId], [courseId]);
    if (result.details.newEnrollments === 0) {
      // No new enrollment - probably already enrolled
      throw new Error('Student is already enrolled in this course');
    }

    // Fetch the enrollment record via RPC/queries
    // Use getEnrollmentsForCourse RPC and find the student's record
    const enrollments = await getEnrollmentsForCourse(courseId);
    const enrollment = (enrollments || []).find((e: any) => e.student_id === studentId);
    if (!enrollment) {
      throw new Error('Failed to find newly created enrollment');
    }

    return enrollment as CourseEnrollment;
  } catch (error) {
    console.error('Error enrolling student:', error);
    throw error;
  }
};

/**
 * Unenroll a student from a course
 */
export const unenrollStudent = async (
  studentId: string,
  courseId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('course_enrollments')
      .delete()
      .eq('student_id', studentId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Error unenrolling student:', error);
      throw new Error('Failed to unenroll student');
    }
  } catch (error) {
    console.error('Error unenrolling student:', error);
    throw error;
  }
};

/**
 * Check if a student is enrolled in a course
 */
export const isStudentEnrolled = async (
  studentId: string,
  courseId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .single();

    if (error) {
      // Not found is not an error in this case
      if (error.code === 'PGRST116') {
        return false;
      }
      console.error('Error checking enrollment:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking enrollment:', error);
    return false;
  }
};

/**
 * Get enrollment count for a course
 */
export const getCourseEnrollmentCount = async (courseId: string): Promise<number> => {
  try {
    // Use RPC to get a role-aware count from the DB
    const { data, error } = await supabase.rpc('get_course_enrollment_count', { p_course_id: courseId });

    if (error) {
      console.error('Error fetching course enrollment count via RPC:', error);
      return 0;
    }

    // Supabase RPC scalar return might be number or [number]
    if (typeof data === 'number') return data;
    if (Array.isArray(data) && data.length) return Number(data[0]) || 0;
    return 0;
  } catch (error) {
    console.error('Error getting enrollment count:', error);
    return 0;
  }
};

// ============================================================================
// AUTO-ENROLLMENT RULES
// ============================================================================

/**
 * Create auto-enrollment rules for a department and level
 * 
 * Requirements: 13.2, 13.3, 13.6
 * 
 * @param department - Department name
 * @param level - Academic level (100-500)
 * @param courseIds - Array of course UUIDs
 * @param applyRetroactively - Whether to enroll existing students
 * @returns Number of rules created
 */
export const createAutoEnrollmentRules = async (
  departmentId: string,
  level: number,
  courseIds: string[],
  applyRetroactively: boolean = false
): Promise<number> => {
  try {
    // Get current user (HOC)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Validate courses exist and are not closed using RPC to avoid RLS recursion
    const { data: courses, error: coursesError } = await supabase
      .rpc('get_courses_by_ids', { p_course_ids: courseIds });

    if (coursesError) {
      throw new Error('Failed to validate courses');
    }

    // Check for closed courses
    const closedCourses = (courses || []).filter((c: Course) => c.is_closed);
    if (closedCourses.length > 0) {
      const closedCodes = closedCourses.map((c: Course) => c.code).join(', ');
      throw new Error(`Cannot create rules for closed courses: ${closedCodes}`);
    }

    // Check if all requested courses were found
    if (!courses || courses.length !== courseIds.length) {
      throw new Error('One or more courses not found or you do not have access');
    }

    // Prepare rule Records
    const ruleRecords = courseIds.map((courseId) => ({
      department_id: departmentId,
      level,
      course_id: courseId,
      created_by: user.id,
    }));

    // Insert rules (will fail if duplicates exist due to unique constraint)
    const { data: insertedRules, error: insertError } = await supabase
      .from('auto_enrollment_rules')
      .insert(ruleRecords)
      .select();

    if (insertError) {
      if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
        throw new Error('Auto-enrollment rule already exists for one or more courses');
      }
      throw insertError;
    }

    const rulesCreated = insertedRules?.length || 0;

    // Apply retroactively if requested
    if (applyRetroactively && rulesCreated > 0) {
  await applyAutoEnrollmentRulesRetroactively(departmentId, level, courseIds);
    }

    return rulesCreated;
  } catch (error) {
    console.error('Error creating auto-enrollment rules:', error);
    throw error;
  }
};

/**
 * Update auto-enrollment rules for a department and level
 * 
 * Requirements: 13.4
 * 
 * @param department - Department name
 * @param level - Academic level (100-500)
 * @param courseIds - New array of course UUIDs
 * @returns Number of rules affected
 */
export const updateAutoEnrollmentRules = async (
  departmentId: string,
  level: number,
  courseIds: string[]
): Promise<number> => {
  try {
    // Get current user (HOC)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Delete existing rules for this department and level
    const { error: deleteError } = await supabase
      .from('auto_enrollment_rules')
      .delete()
      .eq('department_id', departmentId)
      .eq('level', level);

    if (deleteError) {
      throw deleteError;
    }

    // Create new rules
    if (courseIds.length > 0) {
      return await createAutoEnrollmentRules(departmentId, level, courseIds, false);
    }

    return 0;
  } catch (error) {
    console.error('Error updating auto-enrollment rules:', error);
    throw error;
  }
};

/**
 * Delete auto-enrollment rules for a department and level
 * 
 * Requirements: 13.5
 * 
 * @param department - Department name
 * @param level - Academic level (100-500)
 * @returns Number of rules deleted
 */
export const deleteAutoEnrollmentRules = async (
  departmentId: string,
  level: number
): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('auto_enrollment_rules')
      .delete()
  .eq('department_id', departmentId)
      .eq('level', level)
      .select();

    if (error) {
      throw error;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error deleting auto-enrollment rules:', error);
    throw error;
  }
};

/**
 * Apply auto-enrollment rules retroactively to existing students
 * 
 * Requirements: 13.6
 * 
 * @param department - Department name
 * @param level - Academic level (100-500)
 * @param courseIds - Array of course UUIDs
 * @returns Number of enrollments created
 */
export const applyAutoEnrollmentRulesRetroactively = async (
  departmentId: string,
  level: number,
  courseIds: string[]
): Promise<number> => {
  try {
    // Get current user (HOC)
  const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get all students matching department and level
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'student')
      .eq('department_id', departmentId)
      .eq('level', level);

    if (studentsError) {
      throw studentsError;
    }

    if (!students || students.length === 0) {
      return 0;
    }

    const studentIds = students.map((s) => s.id);

    // Use existing bulk enrollment function
    const result = await enrollStudents(studentIds, courseIds);

    return result.details.newEnrollments;
  } catch (error) {
    console.error('Error applying auto-enrollment rules retroactively:', error);
    throw error;
  }
};

/**
 * Apply auto-enrollment rules for a new student
 * This should be called during student registration
 * 
 * Requirements: 13.3
 * 
 * @param studentId - Student UUID
 * @param department - Student's department
 * @param level - Student's level
 * @returns Number of enrollments created
 */
export const applyAutoEnrollmentRulesForStudent = async (
  studentId: string,
  departmentId: string,
  level: number
): Promise<number> => {
  try {
    // Get matching auto-enrollment rules
    const { data: rules, error: rulesError } = await supabase
      .from('auto_enrollment_rules')
      .select('course_id')
      .eq('department_id', departmentId)
      .eq('level', level);

    if (rulesError) {
      console.error('Error fetching auto-enrollment rules:', rulesError);
      return 0;
    }

    if (!rules || rules.length === 0) {
      return 0;
    }

    const courseIds = rules.map((r) => r.course_id);

    // Enroll student in courses
    const result = await enrollStudents([studentId], courseIds);

    return result.details.newEnrollments;
  } catch (error) {
    console.error('Error applying auto-enrollment rules for student:', error);
    // Don't throw - we don't want to block registration if auto-enrollment fails
    return 0;
  }
};

// ============================================================================
// SEMESTER MANAGEMENT
// ============================================================================

/**
 * Close courses for the semester
 * 
 * Requirements: 14.1, 14.2, 14.3
 * 
 * @param courseIds - Array of course UUIDs to close
 * @returns Number of courses closed
 */
export const closeCourses = async (courseIds: string[]): Promise<number> => {
  try {
    // Set is_closed = TRUE for selected courses
    const { data, error: closeError } = await supabase
      .from('courses')
      .update({ is_closed: true })
      .in('id', courseIds)
      .select();

    if (closeError) {
      console.error('Error closing courses:', closeError);
      throw new Error('Failed to close courses');
    }

    // Remove course_enrollments for closed courses
    // Note: Attendance data is kept in database (archived)
    const { error: enrollError } = await supabase
      .from('course_enrollments')
      .delete()
      .in('course_id', courseIds);

    if (enrollError) {
      console.error('Error removing enrollments:', enrollError);
      throw new Error('Failed to remove enrollments');
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error closing courses:', error);
    throw error;
  }
};

/**
 * Move students to next level
 * 
 * Requirements: 14.4, 14.5, 14.6
 * 
 * @param studentIds - Array of student UUIDs
 * @param targetLevel - New level (100-500)
 * @param applyAutoEnroll - Whether to apply auto-enrollment rules
 * @returns Object with students moved and enrollments created
 */
export const moveStudentsToNextLevel = async (
  studentIds: string[],
  targetLevel: number,
  applyAutoEnroll: boolean = false
): Promise<{ studentsMoved: number; enrollmentsCreated: number }> => {
  try {
    // Get current user (HOC)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Update level field for selected students
    const { data: updatedStudents, error: updateError } = await supabase
      .from('users')
      .update({ level: targetLevel })
      .in('id', studentIds)
      .select();

    if (updateError) {
      console.error('Error updating student levels:', updateError);
      throw new Error('Failed to update student levels');
    }

    const studentsMoved = updatedStudents?.length || 0;
    let enrollmentsCreated = 0;

    // Apply auto-enrollment rules if requested
    if (applyAutoEnroll && studentsMoved > 0) {
      // Get student's department_id from their profile
      const { data: firstStudent, error: studentError } = await supabase
        .from('users')
        .select('department_id')
        .eq('id', studentIds[0])
        .single();

      if (studentError || !firstStudent) {
        console.error('Error fetching student department:', studentError);
        return { studentsMoved, enrollmentsCreated: 0 };
      }

      // Get auto-enrollment rules for new level
      const { data: rules, error: rulesError } = await supabase
        .from('auto_enrollment_rules')
        .select('course_id')
        .eq('department_id', firstStudent.department_id)
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
          enrollmentsCreated = result.details.newEnrollments || 0;
        } catch (err) {
          console.error('Error applying auto-enrollment via RPC:', err);
        }
      }
    }

    return { studentsMoved, enrollmentsCreated };
  } catch (error) {
    console.error('Error moving students to next level:', error);
    throw error;
  }
};
