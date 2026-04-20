/**
 * Authentication Service Layer
 *
 * Handles user registration, login, logout, and session management
 * for Students, Lecturers, and HOCs with role-specific validation.
 */

import type {
    HOCRegistrationData,
    LecturerRegistrationData,
    StudentRegistrationData,
    User,
    UserRole,
} from "@/types/database.types";
import { LASU_EMAIL_REGEX, MATRIC_NUMBER_REGEX } from "@/types/database.types";
import { supabase } from "./supabase";

// Deep link or URL to redirect the user to after email verification
const AUTH_REDIRECT_URL =
  process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL || "attendify://confirm-email";
const ALLOW_ANY_EMAIL_FOR_DEV =
  process.env.EXPO_PUBLIC_ALLOW_ANY_EMAIL === "true";
const GENERIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const isAllowedEmail = (email: string): boolean => {
  return ALLOW_ANY_EMAIL_FOR_DEV
    ? GENERIC_EMAIL_REGEX.test(email)
    : LASU_EMAIL_REGEX.test(email);
};

const resolveMatricNumber = (email: string): string | null => {
  const match = email.match(MATRIC_NUMBER_REGEX);
  if (match) return match[1];
  if (ALLOW_ANY_EMAIL_FOR_DEV) return null;
  return null;
};

// ============================================================================
// TYPES
// ============================================================================

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthSuccessResult {
  user: User;
  session: AuthSession;
  emailConfirmationRequired?: boolean;
}

// ============================================================================
// STUDENT REGISTRATION
// ============================================================================

/**
 * Register a new student with LASU email validation and matric extraction
 * Auto-enrollment happens via database trigger
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export async function registerStudent(
  data: StudentRegistrationData,
): Promise<AuthSuccessResult | { error: AuthError }> {
  try {
    // Validate email format (strict LASU in prod, any valid email in dev mode)
    if (!isAllowedEmail(data.email)) {
      return {
        error: {
          code: "InvalidEmailFormat",
          message: ALLOW_ANY_EMAIL_FOR_DEV
            ? "Please enter a valid email address"
            : "Email must be in LASU format: firstname.surnameMATRICNUMBER@st.lasu.edu.ng",
        },
      };
    }

    // Extract matric number when available; required only in strict mode
    const matricNumber = resolveMatricNumber(data.email);
    if (!matricNumber && !ALLOW_ANY_EMAIL_FOR_DEV) {
      return {
        error: {
          code: "InvalidEmailFormat",
          message: "Could not extract matric number from email",
        },
      };
    }

    // Validate password strength
    if (data.password.length < 8) {
      return {
        error: {
          code: "WeakPassword",
          message: "Password must be at least 8 characters long",
        },
      };
    }

    // Create auth user with metadata (profile will be created after email confirmation)
    console.log("📝 [registerStudent] Creating auth user...", {
      email: data.email,
    });
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          role: "student",
          first_name: data.first_name,
          last_name: data.last_name,
          matric_number: matricNumber,
          department_id: data.department_id,
          level: data.level,
        },
        emailRedirectTo: AUTH_REDIRECT_URL,
      },
    });

    if (authError) {
      console.error("❌ [registerStudent] Auth signup failed:", authError);
      return {
        error: {
          code: authError.code || "AuthError",
          message: authError.message,
        },
      };
    }

    if (!authData.user) {
      console.error("❌ [registerStudent] No user returned from signup");
      return {
        error: {
          code: "AuthError",
          message: "Failed to create user account",
        },
      };
    }

    console.log("✅ [registerStudent] Auth user created:", {
      id: authData.user.id,
      email: authData.user.email,
      confirmed_at: authData.user.confirmed_at,
    });

    // Profile will be created automatically by database trigger after email confirmation
    console.log("� [registerStudent] Waiting for email confirmation...");
    console.log("   Profile will be created when user confirms email");

    // Return success with email confirmation message
    return {
      user: {
        id: authData.user.id,
        email: data.email,
        role: "student" as UserRole,
        first_name: data.first_name,
        last_name: data.last_name,
        matric_number: matricNumber,
        department_id: data.department_id,
        level: data.level,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      session: {
        user: {
          id: authData.user.id,
          email: data.email,
          role: "student" as UserRole,
          first_name: data.first_name,
          last_name: data.last_name,
          matric_number: matricNumber,
          department_id: data.department_id,
          level: data.level,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        accessToken: "",
        refreshToken: "",
      },
      emailConfirmationRequired: true,
    };
  } catch (error) {
    return {
      error: {
        code: "UnknownError",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

// ============================================================================
// LECTURER REGISTRATION
// ============================================================================

/**
 * Register a new lecturer and create their courses
 * Requires email verification like student registration
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export async function registerLecturer(
  data: LecturerRegistrationData,
): Promise<
  | { user: User; session: AuthSession; emailConfirmationRequired?: boolean }
  | { error: AuthError }
> {
  try {
    console.log("📝 [registerLecturer] Starting lecturer registration...", {
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      courses: data.courses.length,
    });

    // Validate password strength
    if (data.password.length < 8) {
      console.error("❌ [registerLecturer] Weak password validation failed");
      return {
        error: {
          code: "WeakPassword",
          message: "Password must be at least 8 characters long",
        },
      };
    }

    // Validate at least one course
    if (!data.courses || data.courses.length === 0) {
      console.error("❌ [registerLecturer] No courses provided");
      return {
        error: {
          code: "ValidationError",
          message: "At least one course is required",
        },
      };
    }

    // Create auth user with metadata (profile created by trigger after email confirmation)
    console.log("📧 [registerLecturer] Creating auth user with metadata...");
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          role: "lecturer",
          first_name: data.first_name,
          last_name: data.last_name,
          courses: data.courses, // Store courses in metadata for later processing
        },
        emailRedirectTo: AUTH_REDIRECT_URL,
      },
    });

    if (authError) {
      console.error("❌ [registerLecturer] Auth signup failed:", authError);
      return {
        error: {
          code: authError.code || "AuthError",
          message: authError.message,
        },
      };
    }

    if (!authData.user) {
      console.error("❌ [registerLecturer] No user returned from signup");
      return {
        error: {
          code: "AuthError",
          message: "Failed to create user account",
        },
      };
    }

    console.log("✅ [registerLecturer] Auth user created:", {
      id: authData.user.id,
      email: authData.user.email,
      confirmed_at: authData.user.confirmed_at,
    });

    // Profile and courses will be created automatically by database trigger after email confirmation
    console.log("📧 [registerLecturer] Waiting for email confirmation...");
    console.log(
      "   Profile and courses will be created when user confirms email",
    );

    // Return success with email confirmation message
    return {
      user: {
        id: authData.user.id,
        email: data.email,
        role: "lecturer" as UserRole,
        first_name: data.first_name,
        last_name: data.last_name,
        matric_number: null,
        department_id: null,
        level: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      session: {
        user: {
          id: authData.user.id,
          email: data.email,
          role: "lecturer" as UserRole,
          first_name: data.first_name,
          last_name: data.last_name,
          matric_number: null,
          department_id: null,
          level: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        accessToken: "",
        refreshToken: "",
      },
      emailConfirmationRequired: true,
    };
  } catch (error) {
    console.error(
      "💥 [registerLecturer] Unexpected error during registration:",
      error,
    );
    return {
      error: {
        code: "UnknownError",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

// ============================================================================
// HOC REGISTRATION
// ============================================================================

/**
 * Register a new HOC with auth code validation
 * HOCs are students with additional privileges (max 2 per department)
 * Requires email verification like student registration
 *
 * Requirements: 2.2, 2.3, 2.5
 */
export async function registerHOC(
  data: HOCRegistrationData,
): Promise<
  | { user: User; session?: AuthSession; emailConfirmationRequired?: boolean }
  | { error: AuthError }
> {
  try {
    // Validate email format (strict LASU in prod, any valid email in dev mode)
    if (!isAllowedEmail(data.email)) {
      return {
        error: {
          code: "InvalidEmailFormat",
          message: ALLOW_ANY_EMAIL_FOR_DEV
            ? "Please enter a valid email address"
            : "HOC email must be in LASU format: firstname.surnameMATRICNUMBER@st.lasu.edu.ng",
        },
      };
    }

    // Extract matric number when available; required only in strict mode
    const matricNumber = resolveMatricNumber(data.email);
    if (!matricNumber && !ALLOW_ANY_EMAIL_FOR_DEV) {
      return {
        error: {
          code: "InvalidEmailFormat",
          message: "Could not extract matric number from email",
        },
      };
    }

    // Validate password strength
    if (data.password.length < 8) {
      return {
        error: {
          code: "WeakPassword",
          message: "Password must be at least 8 characters long",
        },
      };
    }

    // Validate auth code using RPC function (secure, bypasses RLS)
    // Normalize the auth code: trim whitespace and convert to uppercase
    const normalizedAuthCode = data.auth_code.trim().toUpperCase();

    console.log("🔍 [registerHOC] Validating auth code via RPC...", {
      original_code: data.auth_code,
      normalized_code: normalizedAuthCode,
      expected_department_id: data.department_id,
    });

    const { data: validationResult, error: rpcError } = await supabase.rpc(
      "validate_hoc_code",
      { p_code: normalizedAuthCode },
    );

    console.log("🔍 [registerHOC] RPC Response:", {
      validationResult,
      rpcError,
      rawData: JSON.stringify(validationResult),
    });

    if (rpcError) {
      console.error(
        "❌ [registerHOC] RPC error during auth code validation:",
        rpcError,
      );
      return {
        error: {
          code: "ValidationError",
          message: `Failed to validate auth code: ${rpcError.message}`,
        },
      };
    }

    // Parse the result if it's a string (JSON)
    let parsedResult = validationResult;
    if (typeof validationResult === "string") {
      try {
        parsedResult = JSON.parse(validationResult);
        console.log("🔍 [registerHOC] Parsed JSON result:", parsedResult);
      } catch (e) {
        console.error("❌ [registerHOC] Failed to parse RPC result:", e);
      }
    }

    // Check if code is valid
    if (!parsedResult || !parsedResult.valid) {
      console.error("❌ [registerHOC] Auth code validation failed:", {
        valid: parsedResult?.valid,
        message: parsedResult?.message,
        entered_code: normalizedAuthCode,
      });

      // Provide helpful error message based on the failure reason
      let errorMessage =
        parsedResult?.message || "Invalid HOC authentication code";

      if (parsedResult?.message?.includes("not found")) {
        errorMessage = `Auth code "${normalizedAuthCode}" not found. Please check the code and try again. Valid codes look like: HOC-2025-CSC01`;
      } else if (parsedResult?.message?.includes("already been used")) {
        errorMessage = "This auth code has already been used by another HOC.";
      }

      return {
        error: {
          code: "InvalidAuthCode",
          message: errorMessage,
        },
      };
    }

    // Verify the department_id matches
    if (parsedResult.department_id !== data.department_id) {
      console.error("❌ [registerHOC] Department mismatch:", {
        code_department: parsedResult.department_id,
        selected_department: data.department_id,
      });
      return {
        error: {
          code: "InvalidAuthCode",
          message: "Auth code does not belong to the selected department",
        },
      };
    }

    console.log("✅ [registerHOC] Auth code validated successfully");

    console.log("📝 [registerHOC] Starting HOC registration...", {
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      department_id: data.department_id,
      level: data.level,
    });

    // Create auth user with metadata (profile created by trigger after email confirmation)
    console.log("📧 [registerHOC] Creating auth user with metadata...");
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          role: "hoc",
          first_name: data.first_name,
          last_name: data.last_name,
          matric_number: matricNumber,
          department_id: data.department_id,
          level: data.level,
          auth_code: normalizedAuthCode, // Store normalized auth code for validation in trigger
        },
        emailRedirectTo: AUTH_REDIRECT_URL,
      },
    });

    if (authError) {
      console.error("❌ [registerHOC] Auth signup failed:", authError);
      return {
        error: {
          code: authError.code || "AuthError",
          message: authError.message,
        },
      };
    }

    if (!authData.user) {
      console.error("❌ [registerHOC] No user returned from signup");
      return {
        error: {
          code: "AuthError",
          message: "Failed to create user account",
        },
      };
    }

    console.log("✅ [registerHOC] Auth user created:", {
      id: authData.user.id,
      email: authData.user.email,
      confirmed_at: authData.user.confirmed_at,
    });

    // Profile will be created automatically by database trigger after email confirmation
    // Trigger will also mark the auth code as used and validate max HOCs
    console.log("📧 [registerHOC] Waiting for email confirmation...");
    console.log(
      "   Profile will be created and auth code will be marked as used when email is confirmed",
    );

    return {
      emailConfirmationRequired: true,
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        role: "hoc" as UserRole,
        first_name: data.first_name,
        last_name: data.last_name,
        matric_number: matricNumber,
        department_id: data.department_id,
        level: data.level,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("❌ [registerHOC] Unexpected error:", error);
    return {
      error: {
        code: "UnexpectedError",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
    };
  }
}

// ============================================================================
// LOGIN
// ============================================================================

/**
 * Login with email and password
 *
 * Requirements: 1.5, 2.5
 */
export async function login(
  email: string,
  password: string,
): Promise<{ user: User; session: AuthSession } | { error: AuthError }> {
  try {
    // Authenticate with Supabase
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      return {
        error: {
          code: authError.code || "AuthError",
          message: authError.message,
        },
      };
    }

    if (!authData.user || !authData.session) {
      return {
        error: {
          code: "AuthError",
          message: "Failed to authenticate",
        },
      };
    }

    // Fetch user profile
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (userError || !userData) {
      console.error("❌ [login] Profile not found for user:", authData.user.id);
      return {
        error: {
          code: "DatabaseError",
          message:
            "User profile not found. Please contact support if this persists.",
        },
      };
    }

    console.log("✅ [login] Login successful:", {
      id: userData.id,
      email: userData.email,
      role: userData.role,
    });

    return {
      user: userData,
      session: {
        user: userData,
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
      },
    };
  } catch (error) {
    return {
      error: {
        code: "UnknownError",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

// ============================================================================
// LOGOUT
// ============================================================================

/**
 * Logout current user
 *
 * Requirements: 1.5, 2.5
 */
export async function logout(): Promise<
  { success: boolean } | { error: AuthError }
> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        error: {
          code: error.code || "AuthError",
          message: error.message,
        },
      };
    }

    return { success: true };
  } catch (error) {
    return {
      error: {
        code: "UnknownError",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

// ============================================================================
// GET CURRENT USER
// ============================================================================

/**
 * Get currently authenticated user
 *
 * Requirements: 1.5, 2.5
 */
export async function getCurrentUser(): Promise<
  { user: User } | { error: AuthError } | null
> {
  try {
    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      return {
        error: {
          code: sessionError.code || "AuthError",
          message: sessionError.message,
        },
      };
    }

    if (!session) {
      return null;
    }

    // Fetch user profile
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (userError || !userData) {
      return {
        error: {
          code: "DatabaseError",
          message: "User profile not found",
        },
      };
    }

    return { user: userData };
  } catch (error) {
    return {
      error: {
        code: "UnknownError",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  }
}

// ============================================================================
// RESEND VERIFICATION EMAIL
// ============================================================================

/**
 * Resend verification email to user
 *
 * @param email - User's email address
 * @returns Promise that resolves when email is sent
 */
export async function resendVerificationEmail(email: string): Promise<void> {
  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error("Error resending verification email:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to resend verification email");
  }
}
