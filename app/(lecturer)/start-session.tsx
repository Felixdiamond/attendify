import { Button, Card, Container, FadeIn, ScaleIn, SkeletonCard } from '@/components/ui';
import {
    DEFAULT_SESSION_DURATION,
    MAX_SESSION_DURATION,
    MIN_SESSION_DURATION,
} from '@/constants/BLE';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { startSession } from '@/lib/attendance';
import { isBluetoothEnabled, requestPermissions } from '@/lib/ble';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import type { Course } from '@/types/database.types';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Animated Course Card Component
interface CourseCardProps {
  course: Course;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}

const AnimatedCourseCard: React.FC<CourseCardProps> = ({ course, isSelected, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const selectedShadowStyle = isSelected ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: 'rgba(239, 246, 255, 1)', // bg-primary-50 fallback
  } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  };

  return (
    <FadeIn delay={index * 50} duration={400}>
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Card
            variant={isSelected ? 'outlined' : 'default'}
            className={`mb-3 transition-all ${
              isSelected
                ? 'border-2 border-primary-500'
                : ''
            }`}
            style={selectedShadowStyle}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text
                  className={`text-lg font-bold mb-1 ${
                    isSelected 
                      ? 'text-primary-700 dark:text-primary-300' 
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {course.code}
                </Text>
                <Text
                  className={`text-sm font-medium ${
                    isSelected 
                      ? 'text-primary-600 dark:text-primary-400' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {course.title}
                </Text>
                <Text
                  className={`text-xs mt-1 ${
                    isSelected 
                      ? 'text-primary-500 dark:text-primary-500' 
                      : 'text-gray-500 dark:text-gray-500'
                  }`}
                >
                  Level {course.level}
                </Text>
              </View>
              {isSelected && (
                <ScaleIn duration={200}>
                  <View className="w-8 h-8 rounded-full bg-primary-500 items-center justify-center">
                    <Text className="text-white text-lg font-bold">✓</Text>
                  </View>
                </ScaleIn>
              )}
            </View>
          </Card>
        </Animated.View>
      </Pressable>
    </FadeIn>
  );
};

export default function StartSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isDark } = useResolvedTheme();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(
    params.courseId as string || null
  );
  const [duration, setDuration] = useState(DEFAULT_SESSION_DURATION);
  const [loading, setLoading] = useState(false);
  const [showBluetoothDialog, setShowBluetoothDialog] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(true);
  const insets = useSafeAreaInsets();
  
  // Animation refs
  const durationPulse = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  // Pulse animation for duration value
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(durationPulse, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(durationPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [durationPulse]);

  // Animate progress bar
  useEffect(() => {
    const targetWidth = ((duration - MIN_SESSION_DURATION) / (MAX_SESSION_DURATION - MIN_SESSION_DURATION)) * 100;
    Animated.spring(progressWidth, {
      toValue: targetWidth,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [duration, progressWidth]);

  // Fetch lecturer's courses
  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_my_courses_lecturer');

      if (error) {
        console.error('Error fetching courses:', error);
        toast.error('Failed to Load Courses', 'Please check your connection and try again');
        return;
      }

      // Filter out closed courses
      const activeCourses = (data || []).filter((course: Course) => !course.is_closed);
      setCourses(activeCourses);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to Load Courses', 'An unexpected error occurred');
    } finally {
      setFetchingCourses(false);
    }
  };

  const handleStartSession = async () => {
    if (!selectedCourse) {
      toast.warning('No Course Selected', 'Please select a course to start the session');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);

    try {
      // Check if Bluetooth enabled first
      const bleEnabled = await isBluetoothEnabled();
      if (!bleEnabled) {
        setShowBluetoothDialog(true);
        setLoading(false);
        return;
      }

      // Request BLE and location permissions
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        toast.error(
          'Permissions Required',
          'Bluetooth and Location permissions are needed to start an attendance session'
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false);
        return;
      }

      // Get current location with high accuracy
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Location Required', 'Location permission is required to verify classroom presence');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Start the session
      const session = await startSession({
        course_id: selectedCourse,
        duration_minutes: duration,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Success feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  console.log('🔔 [StartSessionScreen] Created session:', session);
  toast.success('Session Started!', 'Students can now mark their attendance');

      // Navigate to live attendance screen
      // Navigate to live attendance screen
      if (!session || !session.id) {
        console.warn('⚠️ [StartSessionScreen] Received no session or missing id:', session);
        toast.error('Session creation succeeded but remote session was not returned. Please retry or contact support.');
        return;
      }

      router.push({
        pathname: '/(lecturer)/live-attendance',
        params: { sessionId: session.id },
      });
    } catch (error: any) {
      console.error('Error starting session:', error);
      toast.error('Failed to Start Session', error.message || 'An unexpected error occurred');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleDurationChange = (change: number) => {
    const newDuration = duration + change;
    if (newDuration >= MIN_SESSION_DURATION && newDuration <= MAX_SESSION_DURATION) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setDuration(newDuration);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const handleCourseSelect = (courseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCourse(courseId);
  };

  if (fetchingCourses) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }} className="bg-gray-50 dark:bg-gray-900">
        <ScrollView>
          <Container centered className="p-6">
            <FadeIn duration={400}>
              <View className="mb-6">
                <View className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2" />
                <View className="h-4 w-64 bg-gray-100 dark:bg-gray-800 rounded-lg" />
              </View>
              
              <View className="mb-6">
                <View className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3" />
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i} className="mb-3 h-24" />
                ))}
              </View>
              
              <View>
                <View className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3" />
                <SkeletonCard className="h-40" />
              </View>
            </FadeIn>
          </Container>
        </ScrollView>
      </View>
    );
  }

  if (courses.length === 0) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }} className="bg-gray-50 dark:bg-gray-900">
        <Container centered className="flex-1 items-center justify-center p-6">
          <ScaleIn duration={500} delay={100}>
            <View className="items-center">
              <View className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-full items-center justify-center mb-6">
                <Text className="text-6xl">📚</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center">
                No Courses Available
              </Text>
              <Text className="text-base text-gray-600 dark:text-gray-400 text-center mb-8 max-w-sm leading-relaxed">
                You don&apos;t have any active courses assigned. Please contact your Head of Course.
              </Text>
              <Button variant="primary" size="lg" onPress={() => router.back()}>
                Go Back
              </Button>
            </View>
          </ScaleIn>
        </Container>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }} className="bg-gray-50 dark:bg-gray-900">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Container centered className="p-6">
          {/* Header */}
          <FadeIn duration={400}>
            <View className="mb-8">
              <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Start Attendance Session
              </Text>
              <Text className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                Select a course and set the duration for the attendance session
              </Text>
            </View>
          </FadeIn>
          {showBluetoothDialog && (
            <Modal visible={true} transparent animationType="fade" onRequestClose={() => setShowBluetoothDialog(false)}>
              <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
                <View 
                  className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-6 border-2 border-neutral-200 dark:border-neutral-800"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 20 },
                    shadowOpacity: 0.3,
                    shadowRadius: 30,
                    elevation: 20
                  }}
                >
                  <View className="items-center mb-4">
                    <Text className="text-lg font-bold text-red-700 mb-2">Bluetooth is Off</Text>
                    <Text className="text-center text-sm text-red-600">Bluetooth is required to broadcast attendance sessions. Please enable Bluetooth in your device settings.</Text>
                  </View>
                  <View className="flex-row gap-3 justify-end">
                    <Button variant="ghost" onPress={() => setShowBluetoothDialog(false)}>Cancel</Button>
                    <Button variant="primary" onPress={async () => {
                      setShowBluetoothDialog(false);
                      try {
                        await Linking.openSettings();
                      } catch (err) {
                        console.error('Failed to open settings:', err);
                      }
                    }}>Open Settings</Button>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* Course Selection */}
          <View className="mb-8">
            <FadeIn delay={100} duration={400}>
              <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Select Course
              </Text>
            </FadeIn>
            {courses.map((course, index) => (
              <AnimatedCourseCard
                key={course.id}
                course={course}
                isSelected={selectedCourse === course.id}
                onPress={() => handleCourseSelect(course.id)}
                index={index}
              />
            ))}
          </View>

          {/* Duration Selector */}
          <FadeIn delay={200} duration={400}>
            <View className="mb-8">
              <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Session Duration
              </Text>
              
              <Card 
                className="bg-white dark:bg-gray-800"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3
                }}
              >
                <Animated.View style={{ transform: [{ scale: durationPulse }] }}>
                  <Text className="text-5xl font-bold text-primary-600 dark:text-primary-400 text-center mb-2">
                    {duration}
                  </Text>
                  <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 text-center mb-6">
                    minutes
                  </Text>
                </Animated.View>
                
                <View className="flex-row items-center gap-4 mb-6">
                  <Pressable
                    onPress={() => handleDurationChange(-5)}
                    disabled={duration <= MIN_SESSION_DURATION}
                    className={`w-14 h-14 rounded-full items-center justify-center ${
                      duration <= MIN_SESSION_DURATION
                        ? 'bg-gray-200 dark:bg-gray-700'
                        : 'bg-primary-100 active:bg-primary-200'
                    }`}
                    style={duration <= MIN_SESSION_DURATION ? { opacity: 0.4 } : undefined}
                  >
                    <Text className={`text-3xl font-bold ${
                      duration <= MIN_SESSION_DURATION
                        ? 'text-gray-400 dark:text-gray-600'
                        : 'text-primary-600 dark:text-primary-400'
                    }`}>−</Text>
                  </Pressable>
                  
                  <View className="flex-1">
                    <View className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <Animated.View
                        className="h-full rounded-full"
                        style={{
                          width: progressWidth.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                          }),
                          backgroundColor: '#3B82F6',
                        }}
                      />
                    </View>
                    <View className="flex-row justify-between mt-2">
                      <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {MIN_SESSION_DURATION}m
                      </Text>
                      <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {MAX_SESSION_DURATION}m
                      </Text>
                    </View>
                  </View>
                  
                  <Pressable
                    onPress={() => handleDurationChange(5)}
                    disabled={duration >= MAX_SESSION_DURATION}
                    className={`w-14 h-14 rounded-full items-center justify-center ${
                      duration >= MAX_SESSION_DURATION
                        ? 'bg-gray-200 dark:bg-gray-700'
                        : 'bg-primary-100 active:bg-primary-200'
                    }`}
                    style={duration >= MAX_SESSION_DURATION ? { opacity: 0.4 } : undefined}
                  >
                    <Text className={`text-3xl font-bold ${
                      duration >= MAX_SESSION_DURATION
                        ? 'text-gray-400 dark:text-gray-600'
                        : 'text-primary-600 dark:text-primary-400'
                    }`}>+</Text>
                  </Pressable>
                </View>
                
                {/* Quick Duration Presets */}
                <View className="flex-row gap-2">
                  {[15, 30, 45, 60].map((preset) => (
                    <Pressable
                      key={preset}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setDuration(preset);
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg border ${
                        duration === preset
                          ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500'
                          : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold text-center ${
                          duration === preset
                            ? 'text-primary-700 dark:text-primary-300'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {preset}m
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Card>
            </View>
          </FadeIn>

          {/* Info Box */}
          <FadeIn delay={300} duration={400}>
            <Card 
              className="border-2 border-primary-200 dark:border-primary-800 mb-8"
              style={{ backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff' }}
            >
              <View className="flex-row items-start gap-3">
                <View className="w-10 h-10 rounded-full bg-primary-500 items-center justify-center">
                  <Text className="text-xl">📍</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base text-primary-900 dark:text-primary-100 font-bold mb-1">
                    Location & Bluetooth Required
                  </Text>
                  <Text className="text-sm text-primary-700 dark:text-primary-300 leading-relaxed">
                    Your location will be captured to verify student proximity. Bluetooth
                    will broadcast a beacon for students to detect.
                  </Text>
                </View>
              </View>
            </Card>
          </FadeIn>

          {/* Action Buttons */}
          <FadeIn delay={350} duration={400}>
            <View className="gap-3">
              <Button
                variant="primary"
                size="lg"
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  handleStartSession();
                }}
                disabled={!selectedCourse || loading}
                loading={loading}
                fullWidth
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 8
                }}
              >
                {loading ? 'Starting Session...' : 'Start Session'}
              </Button>

              {!loading && (
                <Button
                  variant="ghost"
                  size="lg"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.back();
                  }}
                  fullWidth
                >
                  Cancel
                </Button>
              )}
            </View>
          </FadeIn>
        </Container>
      </ScrollView>
    </View>
  );
}
