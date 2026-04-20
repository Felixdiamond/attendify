/**
 * FloatingTabBar
 *
 * A fully custom floating tab bar with a genuine glassy pill design.
 * - Uses BlurView as the background with overflow:hidden for true border-radius clipping
 * - Icons + labels perfectly centered
 * - Active tab gets an indigo pill underlay
 * - Floats 20px above the home indicator with 20px side margin
 */

import { Colors } from '@/constants/Colors';
import { useResolvedTheme } from '@/hooks/useResolvedTheme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DOCK_HEIGHT = 64;
const DOCK_MARGIN_BOTTOM = 20;
const DOCK_MARGIN_SIDE = 20;

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { isDark } = useResolvedTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          bottom: DOCK_MARGIN_BOTTOM + insets.bottom,
          left: DOCK_MARGIN_SIDE,
          right: DOCK_MARGIN_SIDE,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Glass pill wrapper — overflow:hidden clips BlurView to the border radius */}
      <View style={styles.pillWrapper}>
        <BlurView
          intensity={85}
          tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
          style={StyleSheet.absoluteFill}
        />
        {/* Tinted overlay for color & border */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? 'rgba(12, 12, 18, 0.55)'
                : 'rgba(255, 255, 255, 0.65)',
              borderWidth: 1,
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.10)'
                : 'rgba(0, 0, 0, 0.07)',
              borderRadius: 999,
            },
          ]}
        />

        {/* Tab items */}
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title ?? route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const iconColor = isFocused
              ? Colors.primary.DEFAULT
              : isDark
              ? 'rgba(255,255,255,0.45)'
              : 'rgba(0,0,0,0.38)';

            const labelColor = isFocused
              ? Colors.primary.DEFAULT
              : isDark
              ? 'rgba(255,255,255,0.45)'
              : 'rgba(0,0,0,0.38)';

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
                android_ripple={{ color: 'transparent' }}
              >
                {/* Active pill background */}
                {isFocused && (
                  <View
                    style={[
                      styles.activePill,
                      {
                        backgroundColor: isDark
                          ? 'rgba(99, 102, 241, 0.18)'
                          : 'rgba(79, 70, 229, 0.10)',
                      },
                    ]}
                  />
                )}

                {/* Icon */}
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color: iconColor,
                  size: 22,
                })}

                {/* Label */}
                <Text
                  style={[
                    styles.label,
                    { color: labelColor, fontWeight: isFocused ? '700' : '500' },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // shadow for the whole dock
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 16,
  },
  pillWrapper: {
    height: DOCK_HEIGHT,
    borderRadius: 999,
    overflow: 'hidden', // ← crucial: clips BlurView to pill shape
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    left: 6,
    right: 6,
    borderRadius: 999,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});

/**
 * The total height a screen's content should be offset from the bottom
 * so it isn't hidden behind the floating dock.
 */
export const FLOATING_TAB_BAR_HEIGHT = DOCK_HEIGHT + DOCK_MARGIN_BOTTOM + 16;
