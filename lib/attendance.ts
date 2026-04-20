import { DEFAULT_SESSION_RADIUS as DEFAULT_RADIUS } from "@/constants/BLE";
import type {
    AttendanceRecord,
    AttendanceRecordWithStudent,
    AttendanceSession,
    DeviceInfo,
    MarkAttendanceData,
    SessionWithCourse,
    StartSessionData,
} from "@/types/database.types";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { startBroadcasting, stopBroadcasting } from "./ble";
import { getDepartmentFromCourseCode } from "./course";
import { supabase } from "./supabase";

/**
 * Generate unique session code
 */
const generateSessionCode = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`.toUpperCase();
};

/**
 * Generate beacon UUID for session
 */
const generateBeaconUUID = (): string => {
  // Generate a UUID v4
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Get device information for fingerprinting
 */
const getDeviceInfo = async (): Promise<DeviceInfo> => {
  const deviceId = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${Platform.OS}-${Platform.Version}`,
  );

  return {
    os: Platform.OS,
    model: Platform.select({
      ios: "iOS Device",
      android: "Android Device",
      default: "Unknown",
    }),
    deviceId: deviceId.substring(0, 16),
  };
};

/**
 * Start an attendance session
 * Captures GPS, creates session record, and starts BLE broadcasting
 */
export const startSession = async (
  data: StartSessionData,
): Promise<AttendanceSession> => {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Validate duration
    if (data.duration_minutes < 5 || data.duration_minutes > 60) {
      throw new Error("Duration must be between 5 and 60 minutes");
    }

    // Validate that course exists and is not closed using RPC to avoid RLS recursion
    const { data: courseData, error: courseError } = await supabase.rpc(
      "get_course_by_id",
      { p_course_id: data.course_id },
    );

    if (courseError) {
      throw new Error("Failed to validate course");
    }

    const course = courseData?.[0];
    if (!course) {
      throw new Error("Course not found or you do not have access");
    }

    if (course.is_closed) {
      throw new Error(
        `Cannot start session: ${course.code} has been closed for the semester`,
      );
    }

    // Generate session identifiers
    const sessionCode = generateSessionCode();
    const beaconUUID = generateBeaconUUID();

    // Calculate end time
    const startedAt = new Date();
    const endsAt = new Date(
      startedAt.getTime() + data.duration_minutes * 60000,
    );

    // Create session record
    const { data: session, error: sessionError } = await supabase
      .from("attendance_sessions")
      .insert({
        course_id: data.course_id,
        lecturer_id: user.id,
        session_code: sessionCode,
        beacon_uuid: beaconUUID,
        latitude: data.latitude,
        longitude: data.longitude,
        radius_meters: data.radius_meters || DEFAULT_RADIUS,
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating session:", sessionError);
      throw new Error("Failed to create attendance session");
    }

    console.log("✅ [startSession] Attendance session created:", {
      id: session.id,
      session_code: session.session_code,
      course_id: session.course_id,
      lecturer_id: session.lecturer_id,
    });

    // Start BLE broadcasting
    try {
      await startBroadcasting({
        sessionCode,
        sessionId: session.id,
      });
    } catch (bleError) {
      console.error("Error starting BLE broadcast:", bleError);
      // Don't fail the session creation if BLE fails
      // The session can still work with manual attendance
    }

    return session;
  } catch (error) {
    console.error("Error starting session:", error);
    throw error;
  }
};

/**
 * Stop an attendance session
 * Deactivates session and stops BLE broadcasting
 */
export const stopSession = async (sessionId: string): Promise<void> => {
  try {
    // Update session to inactive
    const { error: updateError } = await supabase
      .from("attendance_sessions")
      .update({ is_active: false })
      .eq("id", sessionId);

    if (updateError) {
      console.error("Error stopping session:", updateError);
      throw new Error("Failed to stop attendance session");
    }

    // Stop BLE broadcasting
    try {
      await stopBroadcasting();
    } catch (bleError) {
      console.error("Error stopping BLE broadcast:", bleError);
      // Don't fail if BLE stop fails
    }
  } catch (error) {
    console.error("Error stopping session:", error);
    throw error;
  }
};

/**
 * Get all attendance records for a session
 * Includes student information
 */
export const getSessionAttendance = async (
  sessionId: string,
): Promise<AttendanceRecordWithStudent[]> => {
  try {
    // Use RPC to avoid RLS recursion
    const { data: records, error } = await supabase.rpc(
      "get_records_for_session_lecturer",
      { p_session_id: sessionId },
    );

    if (error) {
      console.error("Error fetching attendance:", error);
      throw new Error("Failed to fetch attendance records");
    }

    // Fetch student details separately for each record
    const recordsWithStudents = await Promise.all(
      (records || []).map(async (record: any) => {
        const { data: student } = await supabase
          .from("users")
          .select("id, first_name, last_name, matric_number, email")
          .eq("id", record.student_id)
          .single();

        return {
          ...record,
          student: student || {
            id: record.student_id,
            first_name: "Unknown",
            last_name: "Student",
            matric_number: "",
            email: "",
          },
        };
      }),
    );

    // Sort by marked_at descending
    return recordsWithStudents.sort(
      (a, b) =>
        new Date(b.marked_at).getTime() - new Date(a.marked_at).getTime(),
    );
  } catch (error) {
    console.error("Error getting session attendance:", error);
    throw error;
  }
};

/**
 * Subscribe to real-time attendance updates for a session
 * Returns unsubscribe function
 */
export const subscribeToSession = (
  sessionId: string,
  callback: (record: AttendanceRecordWithStudent) => void,
): (() => void) => {
  // Subscribe to attendance_records inserts for this session
  const channel = supabase
    .channel(`session-${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "attendance_records",
        filter: `session_id=eq.${sessionId}`,
      },
      async (payload) => {
        // Fetch full record with student info
        const { data, error } = await supabase
          .from("attendance_records")
          .select(
            `
            *,
            student:users!attendance_records_student_id_fkey (
              id,
              first_name,
              last_name,
              matric_number,
              email
            )
          `,
          )
          .eq("id", payload.new.id)
          .single();

        if (!error && data) {
          callback(data as AttendanceRecordWithStudent);
        }
      },
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Mark attendance for a student
 * Validates all requirements before inserting record
 */
export const markAttendance = async (
  data: MarkAttendanceData,
): Promise<AttendanceRecord> => {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Get device info
    const deviceInfo = await getDeviceInfo();

    // Insert attendance record
    // Backend validation function will check all requirements
    const { data: record, error: insertError } = await supabase
      .from("attendance_records")
      .insert({
        session_id: data.session_id,
        student_id: user.id,
        latitude: data.latitude,
        longitude: data.longitude,
        device_info: deviceInfo,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error marking attendance:", insertError);

      // Parse error message for specific validation failures
      const errorMessage = insertError.message.toLowerCase();

      if (
        errorMessage.includes("already marked") ||
        errorMessage.includes("duplicate")
      ) {
        throw new Error("You have already marked attendance for this session");
      } else if (
        errorMessage.includes("too far") ||
        errorMessage.includes("distance")
      ) {
        // Try to extract distance from error message if available
        const distanceMatch = errorMessage.match(/(\d+\.?\d*)\s*meters?/);
        const distance = distanceMatch ? parseFloat(distanceMatch[1]) : null;

        if (distance) {
          throw new Error(
            `You are too far from the class location (${distance.toFixed(0)} meters away). Please move closer.`,
          );
        } else {
          throw new Error(
            "You are too far from the class location. Please move closer.",
          );
        }
      } else if (
        errorMessage.includes("not active") ||
        errorMessage.includes("time window") ||
        errorMessage.includes("closed")
      ) {
        throw new Error("Attendance window has closed");
      } else if (
        errorMessage.includes("not enrolled") ||
        errorMessage.includes("enrollment")
      ) {
        throw new Error("You are not enrolled in this course");
      } else if (errorMessage.includes("permission")) {
        throw new Error("Location permission is required to mark attendance");
      } else {
        // Return the original error message if it's user-friendly, otherwise generic
        const isUserFriendly =
          !errorMessage.includes("null") &&
          !errorMessage.includes("undefined") &&
          !errorMessage.includes("violates");
        throw new Error(
          isUserFriendly
            ? insertError.message
            : "Failed to mark attendance. Please try again.",
        );
      }
    }

    return record;
  } catch (error) {
    console.error("Error marking attendance:", error);
    throw error;
  }
};

/**
 * Get session details with course information
 */
export const getSessionDetails = async (
  sessionId: string,
): Promise<SessionWithCourse | null> => {
  try {
    // Use RPC which is role-aware and avoids RLS recursion
    const { data, error } = await supabase.rpc("get_session_details", {
      p_session_id: sessionId,
    });

    if (error) {
      console.error("Error fetching session details:", error);
      return null;
    }

    if (!data || data.length === 0) return null;

    const session = data[0] as any;

    // The RPC returns jsonb course and lecturer fields; ensure types align and compute derived fields
    if (session.course && session.course.code) {
      // Derive department code from course code (e.g., CSC301 -> CSC)
      session.course.department = getDepartmentFromCourseCode(
        session.course.code,
      );
    }

    console.log(
      "🔍 [getSessionDetails] Fetched session for id",
      session?.id,
      "course:",
      session?.course?.code,
      "lecturer:",
      session?.lecturer?.id,
    );

    return session as SessionWithCourse;
  } catch (error) {
    console.error("Error getting session details:", error);
    return null;
  }
};

/**
 * Get session details by session code
 * Used by students to fetch session info from BLE beacon
 */
export const getSessionByCode = async (
  sessionCode: string,
): Promise<SessionWithCourse | null> => {
  try {
    // Use RPC for role-aware lookup by code
    const { data, error } = await supabase.rpc("get_session_by_code", {
      p_session_code: sessionCode,
    });

    if (error) {
      console.error("Error fetching session by code:", error);
      return null;
    }

    if (!data || data.length === 0) return null;

    const session = data[0] as any;

    if (session.course && session.course.code) {
      session.course.department = getDepartmentFromCourseCode(
        session.course.code,
      );
    }

    return session as SessionWithCourse;
  } catch (error) {
    console.error("Error getting session by code:", error);
    return null;
  }
};

/**
 * Get active sessions for a course
 */
export const getActiveSessions = async (
  courseId: string,
): Promise<AttendanceSession[]> => {
  try {
    const { data, error } = await supabase
      .from("attendance_sessions")
      .select("*")
      .eq("course_id", courseId)
      .eq("is_active", true)
      .order("started_at", { ascending: false });

    if (error) {
      console.error("Error fetching active sessions:", error);
      throw new Error("Failed to fetch active sessions");
    }

    return data;
  } catch (error) {
    console.error("Error getting active sessions:", error);
    throw error;
  }
};

/**
 * Get all sessions for a course (role-aware via RPC, avoids RLS restrictions)
 */
export const getCourseSessions = async (
  courseId: string,
): Promise<AttendanceSession[]> => {
  try {
    const { data, error } = await supabase.rpc("get_sessions_for_course", {
      p_course_id: courseId,
    });

    if (error) {
      console.error("Error fetching course sessions:", error);
      throw new Error("Failed to fetch course sessions");
    }

    return data || [];
  } catch (error) {
    console.error("Error getting course sessions:", error);
    throw error;
  }
};
