import type { AttendanceRecordWithStudent } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { Badge } from './ui/Badge';

interface AnimatedAttendanceItemProps {
  record: AttendanceRecordWithStudent;
  isNew?: boolean;
}

export function AnimatedAttendanceItem({
  record,
  isNew = false,
}: AnimatedAttendanceItemProps) {
  const opacity = useSharedValue(isNew ? 0 : 1);
  const translateY = useSharedValue(isNew ? -20 : 0);
  const scale = useSharedValue(isNew ? 0.9 : 1);

  useEffect(() => {
    if (isNew) {
      // Animate entry for new records with spring animation
      opacity.value = withTiming(1, { duration: 400 });
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
    }
  }, [isNew, opacity, translateY, scale]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className={`p-4 rounded-lg flex-row justify-between items-center mb-2 ${
        isNew 
          ? 'bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800' 
          : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
      }`}
    >
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900 dark:text-white">
          {record.student.first_name} {record.student.last_name}
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {record.student.matric_number}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          {formatTime(record.marked_at)}
        </Text>
        <Badge variant="success" size="sm">
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={12} color="#059669" />
            <Text className="ml-1 text-xs font-semibold text-success-700 dark:text-success-300">
              Present
            </Text>
          </View>
        </Badge>
      </View>
    </Animated.View>
  );
}
