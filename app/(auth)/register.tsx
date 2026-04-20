import { CourseCodeInput, DepartmentAutocomplete } from "@/components/ui";
import { registerHOC, registerLecturer, registerStudent } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";
import type { LecturerCourseData, UserRole } from "@/types/database.types";
import { ACADEMIC_LEVELS, LASU_EMAIL_REGEX } from "@/types/database.types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RegisterScreen() {
  const allowAnyEmailForDev =
    process.env.EXPO_PUBLIC_ALLOW_ANY_EMAIL === "true";
  const genericEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const insets = useSafeAreaInsets();

  // Common fields
  const [role, setRole] = useState<UserRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [strengthOpacity] = useState(new Animated.Value(0));

  // Student/HOC fields
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [departmentCode, setDepartmentCode] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [level, setLevel] = useState(100);

  // HOC only
  const [authCode, setAuthCode] = useState("");

  // Lecturer only - multiple courses
  const [courses, setCourses] = useState<LecturerCourseData[]>([
    {
      code: "",
      title: "",
      level: 100,
      semester: "first",
      academic_year: "2024/2025",
    },
  ]);

  useEffect(() => {
    if (password) {
      Animated.timing(strengthOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      strengthOpacity.setValue(0);
    }
  }, [password, strengthOpacity]);

  // Password strength indicator
  const getPasswordStrength = (
    pwd: string,
  ): { strength: string; color: string } => {
    if (pwd.length === 0) return { strength: "", color: "" };
    if (pwd.length < 8) return { strength: "Weak", color: "text-red-500" };
    if (pwd.length < 12)
      return { strength: "Medium", color: "text-yellow-500" };
    return { strength: "Strong", color: "text-green-500" };
  };

  const passwordStrength = getPasswordStrength(password);

  // Email validation based on role
  const isEmailValid =
    role === "student" || role === "hoc"
      ? allowAnyEmailForDev
        ? genericEmailRegex.test(email.trim())
        : LASU_EMAIL_REGEX.test(email.trim())
      : email.trim().includes("@");

  // Add a new course for lecturer
  const addCourse = () => {
    setCourses([
      ...courses,
      {
        code: "",
        title: "",
        level: 100,
        semester: "first",
        academic_year: "2024/2025",
      },
    ]);
  };

  // Remove a course
  const removeCourse = (index: number) => {
    if (courses.length === 1) {
      Alert.alert("Error", "At least one course is required");
      return;
    }
    setCourses(courses.filter((_, i) => i !== index));
  };

  // Update course field
  const updateCourse = (
    index: number,
    field: keyof LecturerCourseData,
    value: any,
  ) => {
    const updated = [...courses];
    updated[index] = { ...updated[index], [field]: value };
    setCourses(updated);
  };

  const handleRegister = async () => {
    const trimmedEmail = email.trim();

    // Common validation
    if (!trimmedEmail || !password || !firstName || !lastName) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long");
      return;
    }

    // Role-specific validation
    if (role === "student" || role === "hoc") {
      if (!departmentId) {
        Alert.alert("Error", "Please select a department");
        return;
      }
      const validRoleEmail = allowAnyEmailForDev
        ? genericEmailRegex.test(trimmedEmail)
        : LASU_EMAIL_REGEX.test(trimmedEmail);

      if (!validRoleEmail) {
        Alert.alert(
          "Error",
          allowAnyEmailForDev
            ? "Please use a valid email address"
            : "Please use a valid LASU email address",
        );
        return;
      }
    }

    if (role === "hoc" && !authCode) {
      Alert.alert("Error", "Authentication code is required for HOCs");
      return;
    }

    if (role === "lecturer") {
      // Validate courses
      const hasEmptyCourse = courses.some((c) => !c.code || !c.title);
      if (hasEmptyCourse) {
        Alert.alert("Error", "Please complete all course information");
        return;
      }
    }

    setLoading(true);

    try {
      let result;

      if (role === "student") {
        result = await registerStudent({
          email: trimmedEmail,
          password,
          first_name: firstName,
          last_name: lastName,
          department_id: departmentId!,
          level,
        });
      } else if (role === "lecturer") {
        result = await registerLecturer({
          email: trimmedEmail,
          password,
          first_name: firstName,
          last_name: lastName,
          courses,
        });
      } else {
        result = await registerHOC({
          email: trimmedEmail,
          password,
          first_name: firstName,
          last_name: lastName,
          department_id: departmentId!,
          level,
          auth_code: authCode,
        });
      }

      if ("error" in result) {
        Alert.alert("Registration Failed", result.error.message);
        return;
      }

      // Navigate to email confirmation page
      // User needs to verify email before they can login
      router.replace({
        pathname: "/(auth)/confirm-email",
        params: { email: trimmedEmail },
      });
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Registration failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
      }}
    >
      {/* Header - Cinema-grade */}
      <View className="mb-10">
        <Text className="text-5xl font-bold text-neutral-900 dark:text-neutral-0 mb-3 tracking-tighter leading-tight">
          Create Account
        </Text>
        <Text className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Join Attendify today
        </Text>
      </View>

      {/* Role Selection - Refined */}
      <View className="mb-8">
        <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 tracking-tight">
          I am a...
        </Text>
        <View className="flex-row gap-2">
          {(["student", "lecturer", "hoc"] as const).map((r) => (
            <TouchableOpacity
              key={r}
              className={`flex-1 py-3.5 rounded-xl border-2 transition-all ${
                role === r
                  ? "border-[#4F46E5] bg-[#EEF2FF] dark:bg-[#312E81]"
                  : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              }`}
              onPress={() => setRole(r)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text
                className={`text-center font-semibold tracking-tight capitalize ${
                  role === r
                    ? "text-[#4F46E5] dark:text-[#A5B4FC]"
                    : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                {r === "hoc" ? "HOC" : r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Email */}
      <View className="mb-5">
        <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2.5 tracking-tight">
          Email
        </Text>
        <TextInput
          className={`border-2 rounded-xl px-4 py-3.5 text-base font-medium bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-0 ${
            email && !isEmailValid
              ? "border-[#EF4444]"
              : "border-neutral-300 dark:border-neutral-700"
          }`}
          placeholder={
            role === "student" || role === "hoc"
              ? "firstname.surnameMATRIC@st.lasu.edu.ng"
              : "your.email@example.com"
          }
          placeholderTextColor="#A3A3A3"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        {email && !isEmailValid && (
          <Text className="text-[#EF4444] text-sm mt-2 font-medium tracking-tight">
            {role === "student" || role === "hoc"
              ? "Must be a valid LASU email"
              : "Invalid email format"}
          </Text>
        )}
      </View>

      {/* Password */}
      <View className="mb-5">
        <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2.5 tracking-tight">
          Password
        </Text>
        <TextInput
          className="border-2 border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3.5 text-base font-medium bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-0"
          placeholder="At least 8 characters"
          placeholderTextColor="#A3A3A3"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        {password && (
          <Animated.View style={{ opacity: strengthOpacity }}>
            <Text
              className={`text-sm mt-2 font-medium tracking-tight ${passwordStrength.color}`}
            >
              Password strength: {passwordStrength.strength}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* First Name */}
      <View className="mb-5">
        <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2.5 tracking-tight">
          First Name
        </Text>
        <TextInput
          className="border-2 border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3.5 text-base font-medium bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-0"
          placeholder="John"
          placeholderTextColor="#A3A3A3"
          value={firstName}
          onChangeText={setFirstName}
          editable={!loading}
        />
      </View>

      {/* Last Name */}
      <View className="mb-5">
        <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2.5 tracking-tight">
          Last Name
        </Text>
        <TextInput
          className="border-2 border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3.5 text-base font-medium bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-0"
          placeholder="Doe"
          placeholderTextColor="#A3A3A3"
          value={lastName}
          onChangeText={setLastName}
          editable={!loading}
        />
      </View>

      {/* STUDENT/HOC SPECIFIC FIELDS */}
      {(role === "student" || role === "hoc") && (
        <>
          {/* Department Autocomplete */}
          <View className="mb-5">
            <DepartmentAutocomplete
              value={departmentId}
              onChange={(id, code, name) => {
                setDepartmentId(id);
                setDepartmentCode(code);
                setDepartmentName(name);
              }}
              disabled={loading}
              required
            />
          </View>

          {/* Level Selection */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 tracking-tight">
              Level
            </Text>
            <View className="flex-row gap-2">
              {ACADEMIC_LEVELS.map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  className={`flex-1 py-3.5 rounded-xl border-2 ${
                    level === lvl
                      ? "border-[#4F46E5] bg-[#EEF2FF] dark:bg-[#312E81]"
                      : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  }`}
                  onPress={() => setLevel(lvl)}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-center font-semibold tracking-tight ${
                      level === lvl
                        ? "text-[#4F46E5] dark:text-[#A5B4FC]"
                        : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {lvl}L
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      {/* HOC ONLY: Auth Code */}
      {role === "hoc" && (
        <View className="mb-8">
          <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2.5 tracking-tight">
            Authentication Code *
          </Text>
          <TextInput
            className="border-2 border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3.5 text-base font-medium bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-0"
            placeholder="HOC-2025-XXXX"
            placeholderTextColor="#A3A3A3"
            value={authCode}
            onChangeText={setAuthCode}
            autoCapitalize="characters"
            editable={!loading}
          />
          <View className="mt-3 bg-[#FFF4ED] dark:bg-[#78350F] p-4 rounded-xl border-2 border-[#FDBA74] dark:border-[#F59E0B]">
            <View className="flex-row items-start gap-3">
              <Ionicons name="information-circle" size={20} color="#F59E0B" />
              <Text className="flex-1 text-sm text-[#92400E] dark:text-[#FED7AA] tracking-tight">
                HOC codes are department-specific. Ensure your code matches the
                selected department.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* LECTURER ONLY: Multiple Courses */}
      {role === "lecturer" && (
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-0 tracking-tight">
              Courses You will Teach
            </Text>
            <Text className="text-sm text-neutral-500 dark:text-neutral-500 tracking-tight">
              {courses.length} course{courses.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {courses.map((course, index) => (
            <View
              key={index}
              className="mb-5 bg-white dark:bg-neutral-900 rounded-2xl p-5 border-2 border-neutral-200 dark:border-neutral-800"
            >
              {/* Course Header */}
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-base font-bold text-neutral-900 dark:text-neutral-0 tracking-tight">
                  Course {index + 1}
                </Text>
                {courses.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeCourse(index)}
                    className="p-2 bg-[#FEE2E2] dark:bg-[#7F1D1D] rounded-lg"
                    disabled={loading}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Course Code with Autocomplete */}
              <View className="mb-4">
                <CourseCodeInput
                  value={course.code}
                  onChange={(code) => updateCourse(index, "code", code)}
                  disabled={loading}
                  required
                />
              </View>

              {/* Course Title */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2.5 tracking-tight">
                  Course Title *
                </Text>
                <TextInput
                  className="border-2 border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3.5 text-base font-medium bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-0"
                  placeholder="Introduction to Computing"
                  placeholderTextColor="#A3A3A3"
                  value={course.title}
                  onChangeText={(text) => updateCourse(index, "title", text)}
                  editable={!loading}
                />
              </View>

              {/* Level & Semester */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2.5 tracking-tight">
                    Level *
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {ACADEMIC_LEVELS.map((lvl) => (
                      <TouchableOpacity
                        key={lvl}
                        className={`px-4 py-2.5 rounded-lg border-2 ${
                          course.level === lvl
                            ? "border-[#4F46E5] bg-[#EEF2FF] dark:bg-[#312E81]"
                            : "border-neutral-300 dark:border-neutral-700"
                        }`}
                        onPress={() => updateCourse(index, "level", lvl)}
                        disabled={loading}
                      >
                        <Text
                          className={`text-sm font-semibold tracking-tight ${
                            course.level === lvl
                              ? "text-[#4F46E5] dark:text-[#A5B4FC]"
                              : "text-neutral-700 dark:text-neutral-300"
                          }`}
                        >
                          {lvl}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Semester */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2.5 tracking-tight">
                  Semester *
                </Text>
                <View className="flex-row gap-2">
                  {(["first", "second"] as const).map((sem) => (
                    <TouchableOpacity
                      key={sem}
                      className={`flex-1 py-3 rounded-xl border-2 ${
                        course.semester === sem
                          ? "border-[#4F46E5] bg-[#EEF2FF] dark:bg-[#312E81]"
                          : "border-neutral-300 dark:border-neutral-700"
                      }`}
                      onPress={() => updateCourse(index, "semester", sem)}
                      disabled={loading}
                    >
                      <Text
                        className={`text-center font-semibold tracking-tight capitalize ${
                          course.semester === sem
                            ? "text-[#4F46E5] dark:text-[#A5B4FC]"
                            : "text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {sem}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Academic Year */}
              <View>
                <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2.5 tracking-tight">
                  Academic Year *
                </Text>
                <TextInput
                  className="border-2 border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-3.5 text-base font-medium bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-0"
                  placeholder="2024/2025"
                  placeholderTextColor="#A3A3A3"
                  value={course.academic_year}
                  onChangeText={(text) =>
                    updateCourse(index, "academic_year", text)
                  }
                  editable={!loading}
                />
              </View>
            </View>
          ))}

          {/* Add Course Button */}
          <TouchableOpacity
            onPress={addCourse}
            className="py-4 rounded-xl border-2 border-dashed border-neutral-400 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-850 active:bg-neutral-200 dark:active:bg-neutral-800"
            disabled={loading}
          >
            <View className="flex-row items-center justify-center gap-2">
              <Ionicons name="add-circle-outline" size={24} color="#4F46E5" />
              <Text className="text-[#4F46E5] dark:text-[#6366F1] font-semibold tracking-tight">
                Add Another Course
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Register Button - Bold & prominent */}
      <TouchableOpacity
        className={`rounded-xl py-4 items-center border-2 ${
          loading
            ? "bg-neutral-200 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-800"
            : "bg-[#4F46E5] border-[#4F46E5] active:scale-[0.98]"
        }`}
        style={loading ? { opacity: 0.4 } : undefined}
        onPress={handleRegister}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-base font-semibold tracking-tight">
            Create Account
          </Text>
        )}
      </TouchableOpacity>

      {/* Login Link - Refined */}
      <View className="flex-row justify-center mt-8 mb-6 items-center">
        <Text className="text-base text-neutral-600 dark:text-neutral-400">
          Already have an account?{" "}
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          activeOpacity={0.7}
        >
          <Text className="text-[#4F46E5] dark:text-[#6366F1] font-semibold text-base">
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
