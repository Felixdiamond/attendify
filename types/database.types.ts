/**
 * SmartAttend Database Types
 * 
 * TypeScript type definitions matching the Supabase database schema.
 * These types provide type safety when working with database queries.
 */

// ============================================================================
// ENUM TYPES
// ============================================================================

export type UserRole = 'student' | 'lecturer' | 'hoc' | 'admin';
export type SemesterType = 'first' | 'second';

// ============================================================================
// TABLE TYPES
// ============================================================================

export interface Department {
  id: string; // UUID
  code: string; // e.g., "CSC", "MEE"
  name: string; // e.g., "Computer Science"
  created_at: string; // ISO timestamp
}

export interface User {
  id: string; // UUID
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  matric_number: string | null; // Only for students and HOCs
  department_id: string | null; // UUID - Required for students/HOCs, NULL for lecturers
  level: number | null; // 100-500 - Required for students/HOCs, NULL for lecturers
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface AuthCode {
  id: string; // UUID
  code: string; // e.g., "HOC-2025-A1B2"
  department_id: string; // UUID - Auth codes are department-specific for HOCs
  used: boolean;
  used_by: string | null; // UUID
  created_at: string; // ISO timestamp
}

export interface Course {
  id: string; // UUID
  code: string; // e.g., "CSC301", "MEE207" (no spaces, department prefix)
  title: string;
  level: number; // 100-500
  semester: SemesterType;
  academic_year: string; // e.g., "2024/2025"
  is_closed: boolean;
  created_by: string; // UUID - Lecturer who created the course
  created_at: string; // ISO timestamp
  department?: string; // Derived department code (e.g., 'CSC'), not stored in DB
}

export interface CourseLecturer {
  id: string; // UUID
  course_id: string; // UUID
  lecturer_id: string; // UUID
  added_at: string; // ISO timestamp
}

export interface CourseEnrollment {
  id: string; // UUID
  student_id: string; // UUID
  course_id: string; // UUID
  enrolled_by: string | null; // UUID (HOC who enrolled, NULL if auto-enrolled)
  enrolled_at: string; // ISO timestamp
}

export interface AttendanceSession {
  id: string; // UUID
  course_id: string; // UUID
  lecturer_id: string; // UUID
  session_code: string; // Unique code in BLE beacon
  beacon_uuid: string; // BLE service UUID
  latitude: number; // Decimal(10,8)
  longitude: number; // Decimal(11,8)
  radius_meters: number; // 10-200
  started_at: string; // ISO timestamp
  ends_at: string; // ISO timestamp
  is_active: boolean;
  created_at: string; // ISO timestamp
}

export interface AttendanceRecord {
  id: string; // UUID
  session_id: string; // UUID
  student_id: string; // UUID
  marked_at: string; // ISO timestamp
  latitude: number; // Decimal(10,8)
  longitude: number; // Decimal(11,8)
  device_info: DeviceInfo; // JSONB
}

export interface AutoEnrollmentRule {
  id: string; // UUID
  department_id: string; // UUID
  level: number; // 100-500
  course_id: string; // UUID
  created_by: string; // UUID (HOC who created the rule)
  is_active: boolean; // Whether the rule is currently active
  created_at: string; // ISO timestamp
}

// ============================================================================
// NESTED TYPES
// ============================================================================

export interface DeviceInfo {
  os: string; // 'ios' | 'android'
  model: string; // Device model
  deviceId: string; // Unique device identifier
}

// ============================================================================
// JOIN TYPES (for common queries)
// ============================================================================

export interface CourseWithLecturers extends Course {
  lecturers: User[];
}

export interface SessionWithCourse extends AttendanceSession {
  course: Course;
  lecturer: User;
}

export interface AttendanceRecordWithStudent extends AttendanceRecord {
  student: User;
}

export interface EnrollmentWithCourse extends CourseEnrollment {
  course: Course;
}

// ============================================================================
// FUNCTION RETURN TYPES
// ============================================================================

export interface StudentAttendanceStats {
  course_id: string;
  course_code: string;
  course_title: string;
  total_sessions: number;
  attended_sessions: number;
  attendance_percentage: number;
}

export interface CourseAttendanceInsights {
  total_students: number;
  total_sessions: number;
  avg_attendance_percentage: number;
  at_risk_students: number;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface StudentRegistrationData {
  email: string; // Must match LASU format
  password: string; // Min 8 characters
  first_name: string;
  last_name: string;
  department_id: string; // UUID of department
  level: number; // 100-500
}

export interface LecturerRegistrationData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  courses: LecturerCourseData[]; // Courses lecturer will teach
}

export interface LecturerCourseData {
  code: string; // e.g., "CSC301" - must start with valid department code
  title: string;
  level: number;
  semester: SemesterType;
  academic_year: string;
}

export interface HOCRegistrationData {
  email: string; // Must match LASU format
  password: string;
  first_name: string;
  last_name: string;
  department_id: string; // UUID of department
  level: number; // 100-500
  auth_code: string; // HOC-YYYY-XXXX
}

export interface StartSessionData {
  course_id: string;
  duration_minutes: number; // 5-60
  latitude: number;
  longitude: number;
  radius_meters?: number; // Optional, defaults to 50
}

export interface MarkAttendanceData {
  session_id: string;
  latitude: number;
  longitude: number;
}

export interface BulkEnrollmentData {
  student_ids: string[];
  course_ids: string[];
}

export interface AutoEnrollmentRuleData {
  department_id: string; // UUID
  level: number;
  course_ids: string[];
  apply_retroactively?: boolean; // Enroll existing students matching criteria
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type AttendanceErrorCode =
  | 'AlreadyMarked'
  | 'SessionNotFound'
  | 'SessionInactive'
  | 'OutsideTimeWindow'
  | 'NotEnrolled'
  | 'TooFarFromClass';

export interface AttendanceError {
  code: AttendanceErrorCode;
  message: string;
  distance?: number; // For TooFarFromClass errors
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DatabaseTable =
  | 'users'
  | 'auth_codes'
  | 'courses'
  | 'course_lecturers'
  | 'course_enrollments'
  | 'attendance_sessions'
  | 'attendance_records'
  | 'auto_enrollment_rules';

export type InsertUser = Omit<User, 'id' | 'created_at' | 'updated_at'>;
export type UpdateUser = Partial<Omit<User, 'id' | 'email' | 'role' | 'created_at' | 'updated_at'>>;

export type InsertCourse = Omit<Course, 'id' | 'created_at'>;
export type UpdateCourse = Partial<Omit<Course, 'id' | 'code' | 'created_by' | 'created_at'>>;

export type InsertAttendanceSession = Omit<AttendanceSession, 'id' | 'created_at'>;
export type UpdateAttendanceSession = Partial<Omit<AttendanceSession, 'id' | 'course_id' | 'lecturer_id' | 'created_at'>>;

export type InsertAttendanceRecord = Omit<AttendanceRecord, 'id' | 'marked_at'>;

// ============================================================================
// SUPABASE QUERY HELPERS
// ============================================================================

/**
 * Type-safe query builder helpers for common queries
 */
export interface QueryFilters {
  users?: {
    role?: UserRole;
    department_id?: string;
    level?: number;
  };
  courses?: {
    level?: number;
    is_closed?: boolean;
    created_by?: string;
  };
  attendance_sessions?: {
    is_active?: boolean;
    course_id?: string;
    lecturer_id?: string;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const USER_ROLES: UserRole[] = ['student', 'lecturer', 'hoc', 'admin'];
export const SEMESTER_TYPES: SemesterType[] = ['first', 'second'];
export const ACADEMIC_LEVELS = [100, 200, 300, 400, 500] as const;

export const LASU_EMAIL_REGEX = /^[a-z]+\.[a-z]+\d{9,11}@st\.lasu\.edu\.ng$/i;
export const MATRIC_NUMBER_REGEX = /(\d{9,11})@/;

export const MIN_SESSION_DURATION = 5; // minutes
export const MAX_SESSION_DURATION = 60; // minutes
export const DEFAULT_SESSION_DURATION = 15; // minutes

export const MIN_RADIUS = 10; // meters
export const MAX_RADIUS = 200; // meters
export const DEFAULT_RADIUS = 50; // meters

export const MAX_LECTURERS_PER_COURSE = 3;
export const AT_RISK_THRESHOLD = 75; // percentage
