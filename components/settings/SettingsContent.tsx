import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { useAuthStore } from '@/stores/authStore';
import type { ThemeMode } from '@/stores/themeStore';
import { useThemeMode, useThemeStore } from '@/stores/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SectionCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View className="rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 mb-6">
    {children}
  </View>
);

interface SettingRowProps {
  icon: string;
  title: string;
  description?: string;
  value?: string;
  onPress?: () => void;
}

const SettingRowComponent = ({ icon, title, description, value, onPress }: SettingRowProps) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    disabled={!onPress}
    className="flex-row items-center py-4"
  >
    <View className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 items-center justify-center mr-4 border-2 border-neutral-200 dark:border-neutral-700">
      <Ionicons name={icon as any} size={22} color={Colors.primary.DEFAULT} />
    </View>
    <View className="flex-1">
      <Text className="text-base font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
        {title}
      </Text>
      {description && (
        <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 tracking-tight">
          {description}
        </Text>
      )}
    </View>
    {value && (
      <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mr-3 tracking-tight">
        {value}
      </Text>
    )}
    {onPress && <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />}
  </TouchableOpacity>
);

const SettingRow = memo(SettingRowComponent);
SettingRow.displayName = 'SettingRow';

const themeOptions: { label: string; value: ThemeMode; icon: string }[] = [
  { label: 'Light', value: 'light', icon: 'sunny-outline' },
  { label: 'Dark', value: 'dark', icon: 'moon-outline' },
  { label: 'System', value: 'system', icon: 'phone-portrait-outline' },
];

export function SettingsContent() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const themeMode = useThemeMode();
  const setTheme = useThemeStore((state) => state.setTheme);
  const { isDark } = useResolvedTheme();
  const insets = useSafeAreaInsets();

  const initials = useMemo(() => {
    if (!user?.first_name && !user?.last_name) return '?';
    const first = user?.first_name?.charAt(0) ?? '';
    const last = user?.last_name?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase();
  }, [user?.first_name, user?.last_name]);

  const handleThemeChange = async (mode: ThemeMode) => {
    await setTheme(mode);
  };

  const handleLogout = async () => {
    await clearAuth();
    router.replace('/(auth)/login');
  };

  const preferenceItems: SettingRowProps[] = [
    {
      icon: 'notifications-outline',
      title: 'Session Notifications',
      description: 'Reminders for upcoming attendance windows',
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Privacy',
      description: 'Control biometric unlock & data permissions',
    },
  ];

  const aboutItems: SettingRowProps[] = [
    {
      icon: 'information-circle-outline',
      title: 'Version',
      value: '1.0.0 (build 001)',
    },
    {
      icon: 'document-text-outline',
      title: 'Terms & Policies',
    },
  ];

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }} className={`flex-1 ${isDark ? 'bg-neutral-950' : 'bg-neutral-50'}`}>
      <ScrollView contentContainerClassName="px-5 pt-4 pb-10" showsVerticalScrollIndicator={false}>
        <SectionCard>
          <View className="flex-row items-center">
            <View className="w-20 h-20 rounded-2xl bg-[#EEF2FF] dark:bg-[#312E81] items-center justify-center border-2 border-[#C7D2FE] dark:border-[#4F46E5]">
              <Text className="text-3xl font-bold text-[#4F46E5] dark:text-[#818CF8] tracking-tight">{initials}</Text>
            </View>
            <View className="flex-1 ml-5">
              <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-0 tracking-tight">
                {user?.first_name} {user?.last_name}
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 tracking-tight">
                {user?.email}
              </Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard>
          <Text className="text-base font-bold text-neutral-600 dark:text-neutral-400 mb-4 tracking-tight">
            Appearance
          </Text>
          <View 
            className="flex-row rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 p-1.5"
            style={{ backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }}
          >
            {themeOptions.map((option) => {
              const isActive = option.value === themeMode;
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.85}
                  onPress={() => handleThemeChange(option.value)}
                  className={`flex-1 flex-row items-center justify-center rounded-xl py-3.5 ${
                    isActive
                      ? 'bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700'
                      : ''
                  }`}
                  style={!isActive ? { opacity: 0.7 } : undefined}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={isActive ? Colors.primary.DEFAULT : Colors.neutral[400]}
                  />
                  <Text
                    className={`ml-2 text-sm font-bold tracking-tight ${
                      isActive
                        ? 'text-neutral-900 dark:text-neutral-100'
                        : 'text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard>
          <Text className="text-base font-bold text-neutral-600 dark:text-neutral-400 mb-4 tracking-tight">
            Preferences
          </Text>
          {preferenceItems.map((item, index) => (
            <View key={item.title}>
              <SettingRow {...item} />
              {index !== preferenceItems.length - 1 && (
                <View className="h-0.5 bg-neutral-100 dark:bg-neutral-800" />
              )}
            </View>
          ))}
        </SectionCard>

        <SectionCard>
          <Text className="text-base font-bold text-neutral-600 dark:text-neutral-400 mb-4 tracking-tight">
            About
          </Text>
          {aboutItems.map((item, index) => (
            <View key={item.title}>
              <SettingRow {...item} />
              {index !== aboutItems.length - 1 && (
                <View className="h-0.5 bg-neutral-100 dark:bg-neutral-800" />
              )}
            </View>
          ))}
        </SectionCard>

        <Button variant="error" onPress={handleLogout} fullWidth>
          <View className="flex-row items-center justify-center">
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text className="ml-2 text-white font-semibold">Logout</Text>
          </View>
        </Button>
      </ScrollView>
    </View>
  );
}

export default SettingsContent;
